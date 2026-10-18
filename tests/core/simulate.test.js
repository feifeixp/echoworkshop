import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSim } from '../../src/core/simulate.js';
import { normalize } from '../../src/core/story.js';
import { sample } from './fixtures.js';

const cfg = { players: 300, maxRuns: 15, liar: 0.25, mode: 'all', mix: 'mix' };

test('模拟结果结构合理', () => {
  const g = sample();
  const r = runSim(g, cfg);
  assert.ok(r.rate > 0 && r.rate <= 100);
  for (let k = 2; k <= cfg.maxRuns; k++) assert.ok(r.cum[k] >= r.cum[k - 1], '累计达成率不下降');
  for (const id of Object.keys(r.deaths)) assert.ok(['death', 'ending'].includes(g.nodes[id].type));
  assert.equal(r.lost, 0, '示例剧情里没有玩家卡住');
});

test('模拟不会修改剧情数据', () => {
  const g = sample();
  const before = JSON.stringify(g);
  runSim(g, cfg);
  assert.equal(JSON.stringify(g), before);
});

test('真结局不可达时达成率为 0', () => {
  const g = sample();
  g.nodes.bell.options = g.nodes.bell.options.filter(o => o.goto !== 'e_true');
  assert.equal(runSim(g, { ...cfg, players: 100 }).rate, 0);
});

test('同一个随机种子，模拟结果完全一致', () => {
  const a = runSim(sample(), { ...cfg, seed: 42 });
  const b = runSim(sample(), { ...cfg, seed: 42 });
  const c = runSim(sample(), { ...cfg, seed: 43 });
  assert.deepEqual(a.cum, b.cum);
  assert.deepEqual(a.deaths, b.deaths);
  assert.notDeepEqual(a.deaths, c.deaths);
});
