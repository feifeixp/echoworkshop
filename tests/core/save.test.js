import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeRun, restoreRun, describeRun, RUN_SAVE_VERSION } from '../../src/core/save.js';
import { sample } from './fixtures.js';

function midRun(G) {
  return {
    know: new Set(['bell']), runs: 3, total: 900, history: [{ run: 1, title: '门后', kind: '死亡', t: 300 }], startAt: G.start,
    node: 'tavern', path: ['arrive', 'tavern'], t: 120, items: new Map([['candle', 2]]), money: 5,
    used: new Set(['square:0']), runClues: new Set(['notpriest']), belief: 1, believed: { gate: new Set([1]) },
    blog: [{ text: 'x', honest: true }], end: null, lastChoice: { node: 'arrive', idx: 0 }, newDeathClue: '',
  };
}

test('存档往返：恢复后与原状态一致', () => {
  const G = sample(), P = midRun(G);
  const data = JSON.parse(JSON.stringify(serializeRun(G, P)));
  const r = restoreRun(G, data);
  assert.equal(r.resumable, true);
  for (const k of ['runs', 'total', 'node', 'money', 'belief', 't']) assert.equal(r.P[k], P[k], k);
  assert.deepEqual([...r.P.items], [...P.items]);
  assert.deepEqual([...r.P.know], [...P.know]);
  assert.deepEqual([...r.P.used], [...P.used]);
  assert.deepEqual([...r.P.believed.gate], [1]);
});

test('剧情版本变了：保留跨轮记忆，但不能接着这一轮', () => {
  const G = sample(), data = serializeRun(G, midRun(G));
  G.revision += 1;
  const r = restoreRun(G, data);
  assert.equal(r.resumable, false);
  assert.deepEqual([...r.P.know], ['bell']);
  assert.equal(r.P.runs, 3);
});

test('存档里的节点、线索、道具已被删掉时安全处理', () => {
  const G = sample(), data = serializeRun(G, midRun(G));
  delete G.nodes.tavern;
  delete G.clues.bell;
  const r = restoreRun(G, data);
  assert.equal(r.resumable, false);
  assert.equal(r.P.know.size, 0);
});

test('无法识别的存档返回 null', () => {
  const G = sample();
  assert.equal(restoreRun(G, null), null);
  assert.equal(restoreRun(G, { v: RUN_SAVE_VERSION + 1 }), null);
  assert.equal(restoreRun(G, '坏数据'), null);
});

test('标题画面的存档摘要', () => {
  const G = sample();
  const d = describeRun(G, serializeRun(G, midRun(G)));
  assert.equal(d.runs, 3);
  assert.equal(d.place, '酒馆');
  assert.equal(d.clues, 1);
});
