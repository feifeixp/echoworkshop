/* 轮回存档：把当前轮回状态（含跨轮记忆）转成可存进 JSON 的数据，以及反向恢复 */

export const RUN_SAVE_VERSION = 1;

/**
 * 轮回状态 P 的字段：
 *   跨轮保留：know 已知线索、runs 第几轮、total 累计用时、history 轮回记录、startAt 起点
 *   本轮：node 所在节点、path 足迹、t 本轮用时、items 背包、money 货币、used 用过的一次性选项、
 *         runClues 本轮得知的线索、belief 剩余信念、believed 相信过的残响、blog 相信记录、
 *         end 结局（未结束为 null）、lastChoice 最后一次选择、newDeathClue 死前得知的新线索
 */
export function serializeRun(G, P) {
  return {
    v: RUN_SAVE_VERSION,
    storyId: G.id,
    revision: G.revision,
    savedAt: Date.now(),
    know: [...P.know],
    runs: P.runs,
    total: P.total,
    history: P.history,
    startAt: P.startAt,
    node: P.node,
    path: P.path,
    t: P.t,
    items: [...P.items],
    money: P.money,
    used: [...P.used],
    runClues: [...P.runClues],
    belief: P.belief,
    believed: Object.fromEntries(Object.entries(P.believed || {}).map(([k, s]) => [k, [...s]])),
    blog: P.blog || [],
    end: P.end || null,
    lastChoice: P.lastChoice || null,
    newDeathClue: P.newDeathClue || '',
  };
}

const arr = v => (Array.isArray(v) ? v : []);
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * 从存档恢复轮回状态。剧情可能已经改过，所以逐项检查：
 *   - 跨轮记忆只保留剧情里仍然存在的线索；
 *   - 存档所在的节点不存在、或剧情版本变了，就不能接着这一轮，resumable 为 false，
 *     调用方应该保留跨轮记忆、开始新的一轮。
 * 返回 { P, resumable }；存档无法识别时返回 null。
 */
export function restoreRun(G, data) {
  if (!data || typeof data !== 'object' || data.v !== RUN_SAVE_VERSION) return null;
  const clueOk = c => Object.prototype.hasOwnProperty.call(G.clues, c);
  const P = {
    know: new Set(arr(data.know).filter(clueOk)),
    runs: Math.max(0, Math.floor(num(data.runs))),
    total: num(data.total),
    history: arr(data.history).filter(h => h && typeof h === 'object'),
    startAt: G.nodes[data.startAt] ? data.startAt : G.start,
  };
  const sameStory = data.storyId === G.id && +data.revision === +G.revision;
  const resumable = sameStory && !!G.nodes[data.node] && arr(data.path).length > 0 && P.runs > 0;
  if (!resumable) return { P, resumable: false };

  const itemOk = k => Object.prototype.hasOwnProperty.call(G.items, k);
  Object.assign(P, {
    node: data.node,
    path: arr(data.path).filter(id => G.nodes[id]),
    t: num(data.t),
    items: new Map(arr(data.items).filter(e => Array.isArray(e) && itemOk(e[0]) && num(e[1]) > 0)),
    money: Math.max(0, num(data.money)),
    used: new Set(arr(data.used)),
    runClues: new Set(arr(data.runClues).filter(clueOk)),
    belief: Math.max(0, Math.min(2, num(data.belief, 2))),
    believed: Object.fromEntries(Object.entries(data.believed || {}).map(([k, v]) => [k, new Set(arr(v))])),
    blog: arr(data.blog),
    end: data.end || null,
    lastChoice: data.lastChoice && G.nodes[data.lastChoice.node] ? data.lastChoice : null,
    newDeathClue: clueOk(data.newDeathClue) ? data.newDeathClue : '',
  });
  return { P, resumable: true };
}

/** 给标题画面用的存档摘要。 */
export function describeRun(G, data) {
  if (!data || data.v !== RUN_SAVE_VERSION) return null;
  const node = G.nodes[data.node];
  return {
    runs: Math.max(1, num(data.runs, 1)),
    place: node ? node.title : '',
    clues: arr(data.know).filter(c => G.clues[c]).length,
    ended: !!data.end,
    savedAt: num(data.savedAt),
  };
}
