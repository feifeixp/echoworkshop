/* 轮回引擎：一局游戏的全部规则，与界面无关。
   网页版和 Godot 版（godot/scripts/core/run_engine.gd）实现同一套规则，
   两边都要通过 tests/vectors/ 下的一致性用例。规则说明见 docs/MECHANICS.md。 */
import { applyOpt, canTake, isHonest, newEchoId, qtyOf } from './story.js';

/** 每一局开始时的信念点数。 */
export const BELIEF_PER_RUN = 2;
/** 做一个选择本身花费的秒数（不含目标场景的停留时间）。 */
export const ACTION_TIME = 6;

/** 新的存档：没有任何记忆，还没开始第一轮。 */
export function newProgress(G, startAt) {
  return { know: new Set(), runs: 0, total: 0, history: [], startAt: G.nodes[startAt] ? startAt : G.start };
}

/** 开始新的一轮：本轮状态全部重置，跨轮记忆保留，然后进入起点。 */
export function startRun(G, P) {
  P.runs++;
  Object.assign(P, {
    used: new Set(), items: new Map(), money: G.startMoney, runClues: new Set(),
    belief: BELIEF_PER_RUN, believed: {}, blog: [], t: 0, path: [], end: null, lastChoice: null, newDeathClue: '',
  });
  enterNode(G, P, G.nodes[P.startAt] ? P.startAt : G.start);
  return P;
}

export const knows = (P, c) => P.know.has(c) || P.runClues.has(c);

/** 进入一个节点。死亡和结局会结束这一轮：本轮学到的线索变成跨轮记忆。 */
export function enterNode(G, P, id) {
  const n = G.nodes[id];
  P.node = id;
  if (!n) { P.end = { type: 'lost', true: false }; return; }
  P.t += n.time;
  P.path.push(id);
  if (n.type !== 'death' && n.type !== 'ending') return;

  P.newDeathClue = '';
  if (n.type === 'death' && n.deathClue) {
    if (!knows(P, n.deathClue)) P.newDeathClue = n.deathClue;
    P.runClues.add(n.deathClue);
  }
  P.runClues.forEach(c => P.know.add(c));
  P.total += P.t;
  const win = n.type === 'ending' && n.ending === 'true';
  P.end = { type: n.type, true: win };
  P.history.push({ run: P.runs, title: n.title, kind: n.type === 'death' ? '死亡' : (win ? '真结局' : '坏结局'), t: P.t });
}

/**
 * 当前场景每个选项的状态：
 *   hidden  有知识锁且还不知道 —— 玩家看不到这件事
 *   used    一次性选项本轮已经做过 —— 从场景里消失
 *   locked  道具或货币不够 —— 看得到但做不了
 */
export function optionStates(G, P) {
  const n = G.nodes[P.node];
  if (!n || P.end) return [];
  return n.options.map((o, i) => ({
    i, o,
    hidden: !!(o.needClue && !knows(P, o.needClue)),
    used: !!(o.once && P.used.has(P.node + ':' + i)),
    locked: !canTake(o, P.items, P.money),
  }));
}

/**
 * 执行当前场景的第 i 个选项。
 * 返回 { ok:false, reason:'ended'|'missing'|'hidden'|'used'|'locked' }，
 * 或 { ok:true, stay, gained:{money,item,qty,clue}, spent:{money,item,qty} }。
 * stay 为 true 表示留在同一个场景（目标就是当前节点）。
 */
export function chooseOption(G, P, i) {
  if (P.end) return { ok: false, reason: 'ended' };
  const n = G.nodes[P.node], o = n && n.options[i];
  if (!o) return { ok: false, reason: 'missing' };
  if (o.needClue && !knows(P, o.needClue)) return { ok: false, reason: 'hidden' };
  if (o.once && P.used.has(P.node + ':' + i)) return { ok: false, reason: 'used' };
  if (!canTake(o, P.items, P.money)) return { ok: false, reason: 'locked' };

  if (o.once) P.used.add(P.node + ':' + i);
  P.money = applyOpt(o, P.items, P.money);
  if (o.gainClue) P.runClues.add(o.gainClue);
  P.lastChoice = { node: P.node, idx: i };
  const result = {
    ok: true,
    stay: o.goto === P.node,
    gained: { money: +o.gainMoney || 0, item: o.gainItem || '', qty: o.gainItem ? (+o.gainQty || 1) : 0, clue: o.gainClue || '' },
    spent: { money: +o.costMoney || 0, item: o.needItem && o.useItem ? o.needItem : '', qty: o.needItem && o.useItem ? (+o.needQty || 1) : 0 },
  };
  if (result.stay) P.t += ACTION_TIME + n.time;
  else { P.t += ACTION_TIME; enterNode(G, P, o.goto); }
  return result;
}

/** 相信当前场景的第 k 条残响：花一点信念；残响带线索时本轮得知。 */
export function believeEcho(G, P, k) {
  const n = G.nodes[P.node], e = n && n.echoes[k];
  if (P.end || !e) return { ok: false, reason: 'missing' };
  const set = (P.believed[P.node] = P.believed[P.node] || new Set());
  if (set.has(k)) return { ok: false, reason: 'already' };
  if (P.belief <= 0) return { ok: false, reason: 'no-belief' };
  set.add(k);
  P.belief--;
  P.blog.push({ text: e.text, honest: e.honest });
  if (e.teach) P.runClues.add(e.teach);
  return { ok: true, clue: e.teach || '' };
}

/** 相信过的残响对选项 i 的态度：'go' 推荐、'avoid' 警告、null 没有。推荐优先。 */
export function echoStance(G, P, i) {
  const n = G.nodes[P.node], bel = P.believed[P.node];
  if (!n || !bel) return null;
  let m = null;
  bel.forEach(k => {
    const e = n.echoes[k];
    if (e && e.target === i) m = m === 'go' ? 'go' : (e.kind === 'avoid' ? 'avoid' : 'go');
  });
  return m;
}

/**
 * 一轮失败后，在最后做选择的场景刻下一句残响。真假由那个选项的实际后果决定。
 * text 留空时自动生成。返回新残响；没有可刻的地方时返回 null。
 */
export function carveEcho(G, P, { target, kind, text }) {
  const lc = P.lastChoice, n = lc && G.nodes[lc.node], o = n && n.options[target];
  if (!o || !P.end || P.end.true) return null;
  const e = {
    id: newEchoId(), text: (text || '').trim() || (kind === 'avoid' ? `别「${o.text}」` : `「${o.text}」就对了`),
    target, kind, honest: isHonest(G, o, kind), teach: '', by: 'play', likes: 0,
  };
  n.echoes.push(e);
  return e;
}

/* ---------- 场景物件（选项在场景里的呈现） ---------- */

/**
 * 把当前场景的选项按"所属物件"分组：同名的选项合并成一个物件，没写物件名的各自独立。
 * 返回 [{ key, name, idx:[选项序号...] }]，顺序与选项首次出现的顺序一致。
 */
export function groupOptions(G, nodeId) {
  const n = G.nodes[nodeId], groups = new Map();
  (n ? n.options : []).forEach((o, i) => {
    const name = (o.obj || '').trim(), key = name || '#' + i;
    if (!groups.has(key)) groups.set(key, { key, name, idx: [] });
    groups.get(key).idx.push(i);
  });
  return [...groups.values()];
}

export const LOOKS = { door: '门', person: '人物', item: '物品', sign: '路标 / 去往别处', orb: '光点' };

/** 由选项文字推测物件外观。 */
export function looksOfText(text) {
  const t = text || '';
  if (/门|开锁|撞/.test(t)) return 'door';
  if (/蜡烛|钥匙|书|点燃|拿|要一|钟绳|喝一杯/.test(t)) return 'item';
  if (/神父|醉汉|老板|修女|她|叫出|求/.test(t)) return 'person';
  if (/去|前往|绕|离开|走|上去|冲|等|前进|深处|奔/.test(t)) return 'sign';
  if (/说|听|“|”|问/.test(t)) return 'person';
  return 'orb';
}

/** 物件外观：选项里明确写了就用，否则由物件名、再由第一个选项的文字推测。 */
export function objectKind(G, nodeId, group) {
  const os = group.idx.map(i => G.nodes[nodeId].options[i]);
  const set = os.find(o => o.look && LOOKS[o.look]);
  if (set) return set.look;
  const name = group.name;
  if (name) {
    if (/门/.test(name)) return 'door';
    if (/人|老板|醉汉|神父|修女|守夜|她|他|婆|翁|商|孩|夫/.test(name)) return 'person';
    if (/路|口|楼梯|小径|巷|阶/.test(name)) return 'sign';
    if (/书|桌|柜|箱|墙|井|蜡烛|钥匙|台|名字/.test(name)) return 'item';
  }
  return looksOfText(os[0].text);
}

/** 物件在场景中的横向位置（0–1）：选项里写了 pos 就用，否则在场景里均匀排开。 */
export function objectSlot(G, nodeId, group, gi, count) {
  const os = group.idx.map(i => G.nodes[nodeId].options[i]);
  const p = os.find(o => o.pos !== '' && o.pos != null && !isNaN(+o.pos));
  if (p) return Math.max(3, Math.min(97, +p.pos)) / 100;
  return 0.24 + 0.68 * (count < 2 ? 0.5 : gi / (count - 1));
}

/** 背包里某个道具的数量（给界面用）。 */
export const itemCount = (P, k) => qtyOf(P.items, k);
