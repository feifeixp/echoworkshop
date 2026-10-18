/* 批量模拟：一批 AI 玩家反复入局，直到打出真结局或用完局数 */
import { applyOpt, canTake } from './story.js';
import { makeRng } from './util.js';

/**
 * 玩家性格。
 * trust：遇到残响时相信的倾向；mem：记住害死自己的选择的程度；cur：偏好没试过的选项的程度。
 */
export const PERSONAS = {
  trust: { name: '轻信型', trust: 0.8, mem: 0.8, cur: 1.2 },
  doubt: { name: '多疑型', trust: 0.15, mem: 0.9, cur: 1 },
  explore: { name: '探索型', trust: 0.4, mem: 0.7, cur: 2.2 },
  forget: { name: '健忘型', trust: 0.5, mem: 0.3, cur: 1 },
};

/** 按权重从 Map(key → weight) 里随机挑一个 key。 */
export function wpick(w, rnd) {
  let total = 0;
  for (const v of w.values()) total += v;
  let r = rnd() * total;
  for (const [k, v] of w) { r -= v; if (r <= 0) return k; }
  return [...w.keys()].pop();
}

/** 按点赞数加权、不放回地挑 k 条残响：赞越多越容易被看到。 */
export function pickEchoes(arr, k, rnd) {
  const pool = arr.slice(), out = [];
  while (out.length < k && pool.length) {
    const total = pool.reduce((s, e) => s + 1 + (e.likes || 0), 0);
    let r = rnd() * total, j = 0;
    for (; j < pool.length - 1; j++) { r -= 1 + (pool[j].likes || 0); if (r <= 0) break; }
    out.push(pool.splice(j, 1)[0]);
  }
  return out;
}

/**
 * 运行一次批量模拟。不修改 G。
 * cfg: { players, maxRuns, liar(0–1), mode('all'|'preset'|'off'), mix('mix'|性格键), seed? }
 * 给了 seed 时结果完全可复现。
 */
export function runSim(G, cfg) {
  const rnd = cfg.seed != null && cfg.seed !== '' ? makeRng(cfg.seed) : Math.random;
  const keys = cfg.mix === 'mix' ? Object.keys(PERSONAS) : [cfg.mix];
  const agents = Array.from({ length: cfg.players }, (_, i) => {
    const k = keys[i % keys.length];
    return { k, p: PERSONAS[k], know: new Set(), mem: new Set(), seen: new Set(), done: false, runs: 0, time: 0 };
  });
  const pool = {};      // 模拟中玩家留下的残响，按节点分
  const visits = {};    // 每个节点被多少局到达过
  const deaths = {};    // 每个死亡 / 坏结局节点的次数
  const cum = new Array(cfg.maxRuns + 1).fill(0);
  let totalRuns = 0, bH = 0, bL = 0, lied = 0, deadRuns = 0, badEnds = 0, lost = 0;

  for (let r = 1; r <= cfg.maxRuns; r++) {
    for (const a of agents) {
      if (a.done) continue;
      a.runs++; totalRuns++;
      const run = playOneRun(G, cfg, a, pool, visits, rnd);
      bH += run.bH; bL += run.bL;
      a.time += run.t;

      if (run.out === 'true') {
        a.done = true; a.clearRun = a.runs; a.clearTime = a.time;
        if (cfg.mode === 'all' && run.last) addEcho(pool, run.last.id, { target: run.last.i, kind: 'go', honest: true });
        continue;
      }
      if (run.last) a.mem.add(run.last.id + ':' + run.last.i);
      if (run.out === 'death') {
        deadRuns++; deaths[run.id] = (deaths[run.id] || 0) + 1;
        if (run.lastBoost && run.lastBoost.includes(false)) lied++;
      } else if (run.out === 'bad') {
        badEnds++; deaths[run.id] = (deaths[run.id] || 0) + 1;
      } else lost++;
      // 失败的玩家有七成会留下一条残响，其中一部分说谎
      if (cfg.mode === 'all' && run.last && rnd() < 0.7) addEcho(pool, run.last.id, failEcho(G, run.last, cfg.liar, rnd));
    }
    cum[r] = agents.filter(a => a.done).length / agents.length * 100;
  }

  const cleared = agents.filter(a => a.done);
  const runsArr = cleared.map(a => a.clearRun).sort((x, y) => x - y);
  const avg = (arr, f) => arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : null;
  const per = {};
  for (const k of keys) {
    const g = agents.filter(a => a.k === k), c = g.filter(a => a.done);
    per[k] = { n: g.length, rate: c.length / g.length * 100, avg: avg(c, a => a.clearRun) };
  }
  const visitRate = {};
  for (const k in visits) visitRate[k] = visits[k] / totalRuns;
  return {
    cfg, cum, per, deaths, visitRate, totalRuns, bH, bL, lied, deadRuns, badEnds, lost,
    rate: cleared.length / agents.length * 100,
    avgRuns: avg(runsArr, x => x),
    median: runsArr.length ? runsArr[Math.floor(runsArr.length / 2)] : null,
    avgTime: avg(cleared, a => a.clearTime),
    pool: Object.values(pool).reduce((s, p) => s + p.length, 0),
  };
}

/** 一个玩家的一局。返回结局类型、停下的节点、用时和最后一次选择。 */
function playOneRun(G, cfg, a, pool, visits, rnd) {
  let id = G.start, money = G.startMoney, belief = 2, t = 0, steps = 0, last = null, lastBoost = null, out = 'lost';
  let bH = 0, bL = 0;
  const used = new Set(), items = new Map(), clues = new Set(a.know), vis = new Set();

  while (true) {
    const n = G.nodes[id];
    if (!n) { out = 'lost'; break; }
    t += n.time;
    if (!vis.has(id)) { vis.add(id); visits[id] = (visits[id] || 0) + 1; }
    if (n.type === 'death') { out = 'death'; break; }
    if (n.type === 'ending') { out = n.ending === 'true' ? 'true' : 'bad'; break; }

    // 每个可选选项的权重
    const w = new Map();
    n.options.forEach((o, i) => {
      const key = id + ':' + i;
      if (!G.nodes[o.goto] || (o.once && used.has(key)) || !canTake(o, items, money)) return;
      if (o.needClue && !clues.has(o.needClue)) return;
      let v = 1;
      if (o.needClue) v *= 8;                              // 因为知道才出现的选项，很可能是对的
      if (o.hintClue && clues.has(o.hintClue)) v *= 6;
      if (a.mem.has(key)) v *= 1 - 0.92 * a.p.mem;          // 记得这里害死过自己
      if (!a.seen.has(key)) v *= a.p.cur;                  // 好奇没试过的
      w.set(i, v);
    });
    if (!w.size) { out = 'lost'; break; }

    // 看到的残响：按性格和点赞数决定是否相信
    const boost = new Map();
    if (cfg.mode !== 'off') {
      const echoes = cfg.mode === 'all' ? (n.echoes || []).concat(pool[id] || []) : (n.echoes || []);
      for (const e of pickEchoes(echoes, 3, rnd)) {
        if (belief <= 0) break;
        const p = Math.min(0.95, a.p.trust * (0.7 + 0.6 * Math.min(1, (e.likes || 0) / 25)));
        if (rnd() >= p) continue;
        belief--;
        e.honest ? bH++ : bL++;
        if (e.teach) clues.add(e.teach);
        if (e.target >= 0 && w.has(e.target)) {
          if (e.kind === 'avoid') w.set(e.target, w.get(e.target) * 0.12);
          else {
            w.set(e.target, w.get(e.target) * 5);
            boost.set(e.target, (boost.get(e.target) || []).concat(e.honest));
          }
        }
      }
    }

    const i = wpick(w, rnd), o = n.options[i];
    a.seen.add(id + ':' + i);
    last = { id, i };
    lastBoost = boost.get(i) || null;
    if (o.once) used.add(id + ':' + i);
    money = applyOpt(o, items, money);
    if (o.gainClue) clues.add(o.gainClue);
    t += 6;
    id = o.goto;
    if (++steps > 80) { out = 'lost'; break; }
  }

  const end = G.nodes[id];
  if (out === 'death' && end.deathClue) clues.add(end.deathClue);
  clues.forEach(c => a.know.add(c));
  return { out, id, t: t + 15, last, lastBoost, bH, bL };
}

function addEcho(pool, nodeId, e) {
  const p = (pool[nodeId] = pool[nodeId] || []);
  p.push(Object.assign({ teach: '' }, e));
  if (p.length > 40) p.shift();
}

/** 失败的玩家留下的残响：真心警告，或者撒谎（推荐害死自己的选项 / 警告别的选项）。 */
function failEcho(G, last, liar, rnd) {
  if (rnd() >= liar) return { target: last.i, kind: 'avoid', honest: true };
  const n = G.nodes[last.id];
  if (rnd() < 0.6 || n.options.length < 2) return { target: last.i, kind: 'go', honest: false };
  const others = n.options.map((_, j) => j).filter(j => j !== last.i);
  return { target: others[Math.floor(rnd() * others.length)], kind: 'avoid', honest: false };
}
