/* 剧情检查：可达性、可解性、最快通关路径 */
import { MONEY_CAP, QTY_CAP, applyOpt, canTake } from './story.js';

/**
 * 在已知线索集合 K 下，搜索一局之内能走到哪里。
 * 状态 = 所在节点 + 背包 + 货币 + 已知线索 + 已用过的一次性选项；按累计用时做最短路搜索（Dijkstra）。
 * 返回：能到达的结局、这一局里能学到的全部线索、到过的节点，以及最快打出真结局的路线。
 */
export function search(G, K) {
  const Nn = G.nodes;
  const res = { ends: new Set(), clues: new Set(K), best: null, reached: new Set() };
  if (!Nn[G.start]) return res;

  const keyOf = st => [
    st.id,
    [...st.it].filter(e => e[1] > 0).sort().map(e => e[0] + ':' + e[1]).join(','),
    st.m,
    [...st.cl].sort().join(','),
    [...st.u].sort().join(','),
  ].join('|');

  const dist = new Map(), prev = new Map(), queue = [];
  const s0 = { id: G.start, it: new Map(), m: Math.min(MONEY_CAP, G.startMoney), cl: new Set(K), u: new Set() };
  const k0 = keyOf(s0);
  dist.set(k0, Nn[G.start].time);
  queue.push([Nn[G.start].time, k0, s0]);

  let expanded = 0;
  while (queue.length && expanded < 40000) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, k, st] = queue.shift();
    if (d > dist.get(k)) continue;
    expanded++;

    const n = Nn[st.id];
    res.reached.add(st.id);
    st.cl.forEach(c => res.clues.add(c));
    if (n.type === 'death') { if (n.deathClue) res.clues.add(n.deathClue); continue; }
    if (n.type === 'ending') {
      res.ends.add(st.id);
      if (n.ending === 'true' && !res.best) res.best = { time: d, key: k };
      continue;
    }

    (n.options || []).forEach((o, oi) => {
      const target = Nn[o.goto];
      if (!target) return;
      const onceKey = st.id + ':' + oi;
      if (o.once && st.u.has(onceKey)) return;
      if (!canTake(o, st.it, st.m)) return;
      if (o.needClue && !st.cl.has(o.needClue)) return;

      const it = new Map(st.it);
      const m = Math.min(MONEY_CAP, applyOpt(o, it, st.m));
      it.forEach((q, key) => it.set(key, Math.min(QTY_CAP, q)));
      const cl = new Set(st.cl);
      if (o.gainClue) cl.add(o.gainClue);
      const u = o.once ? new Set([...st.u, onceKey]) : st.u;

      const next = { id: o.goto, it, m, cl, u };
      const nk = keyOf(next), nd = d + 6 + target.time;
      if (!dist.has(nk) || nd < dist.get(nk)) {
        dist.set(nk, nd);
        prev.set(nk, k);
        queue.push([nd, nk, next]);
      }
    });
  }

  if (res.best) {
    const path = [];
    for (let k = res.best.key; k; k = prev.get(k)) path.unshift(k.split('|')[0]);
    res.best.path = path;
  }
  return res;
}

/**
 * 检查整份剧情。返回：
 *   issues   问题列表 {lv:'err'|'warn', msg, id?}
 *   minRuns  理论上最少第几局能打出真结局（每局都学到能学的全部线索）；不可达为 null
 *   fast     知道全部线索时最快的通关路线 {time, path}
 *   counts   节点 / 结局 / 死亡 / 残响数量
 */
export function analyze(G) {
  const Nn = G.nodes, nodes = Object.values(Nn), out = [];
  const add = (lv, msg, id) => out.push({ lv, msg, id });
  if (!Nn[G.start]) add('err', '起点节点不存在，请在某个节点上点“设为起点”');

  // 道具、线索、货币各自有没有来源
  const itemSrc = new Set(), clueSrc = new Set();
  for (const n of nodes) {
    (n.options || []).forEach(o => {
      if (o.gainItem) itemSrc.add(o.gainItem);
      if (o.gainClue) clueSrc.add(o.gainClue);
    });
    if (n.type === 'death' && n.deathClue) clueSrc.add(n.deathClue);
    (n.echoes || []).forEach(e => { if (e.teach) clueSrc.add(e.teach); });
  }
  const hasMoneySrc = nodes.some(n => (n.options || []).some(o => +o.gainMoney > 0));

  // 逐个节点的结构问题
  let silentDeaths = 0;
  for (const [id, n] of Object.entries(Nn)) {
    const terminal = n.type === 'death' || n.type === 'ending';
    const ops = n.options || [];
    if (!terminal && !ops.length) add('err', `「${n.title}」没有任何选项，玩家会卡在这里`, id);
    for (const o of ops) {
      if (!Nn[o.goto]) add('err', `「${n.title}」的选项「${o.text || '未命名'}」没有指向任何节点`, id);
      if (o.needItem && !itemSrc.has(o.needItem))
        add('err', `「${o.text}」需要「${G.items[o.needItem] || '?'}」，但剧情里没有地方能拿到`, id);
      if (+o.costMoney > G.startMoney && !hasMoneySrc)
        add('err', `「${o.text}」要花 ${o.costMoney} ${G.currency}，但开局只有 ${G.startMoney}，剧情里也没有赚钱的地方`, id);
      if (o.needClue && !clueSrc.has(o.needClue))
        add('err', `「${o.text}」需要知道「${G.clues[o.needClue] || '?'}」，但没有任何来源`, id);
    }
    if (!terminal && ops.length && ops.every(o => o.needItem || o.needClue))
      add('warn', `「${n.title}」的所有选项都上了锁，条件不够的玩家会卡住`, id);
    (n.echoes || []).forEach(e => { if (e.target >= ops.length) add('warn', `「${n.title}」有一条残响指向了不存在的选项`, id); });
    if (n.type === 'death' && !n.deathClue) silentDeaths++;
  }

  const hasTrue = nodes.some(n => n.type === 'ending' && n.ending === 'true');
  if (!hasTrue) add('err', '还没有设置真结局（结局节点的类型选“真结局”）');

  // 一局一局地模拟"最聪明的玩家"：每局学到所有能学的线索，看第几局能通关
  let known = new Set(), minRuns = null, r = null;
  for (let run = 1; run <= 10 && Nn[G.start]; run++) {
    r = search(G, known);
    if ([...r.ends].some(e => Nn[e].ending === 'true')) { minRuns = run; break; }
    const next = new Set([...known, ...r.clues]);
    if (next.size === known.size) break;   // 学不到新东西了
    known = next;
  }
  const full = Nn[G.start] ? search(G, new Set([...known, ...(r ? r.clues : [])])) : null;
  if (hasTrue && minRuns === null && Nn[G.start]) add('err', '真结局在任何知识条件下都无法到达');
  if (full) {
    Object.keys(Nn).filter(id => !full.reached.has(id))
      .forEach(id => add('warn', `「${Nn[id].title}」在任何情况下都走不到`, id));
  }
  if (silentDeaths) add('warn', `${silentDeaths} 个死亡节点不揭示任何线索，玩家死在那里学不到东西`);

  return {
    issues: out,
    minRuns,
    fast: full && full.best,
    counts: {
      nodes: nodes.length,
      ends: nodes.filter(n => n.type === 'ending').length,
      deaths: nodes.filter(n => n.type === 'death').length,
      echoes: nodes.reduce((s, n) => s + (n.echoes || []).length, 0),
    },
  };
}
