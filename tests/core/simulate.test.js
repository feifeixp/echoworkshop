import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSim } from '../../src/core/simulate.js';
import { normalize } from '../../src/core/story.js';
import { SAMPLE } from '../../src/data/fog-town.js';
import { clone } from '../../src/core/util.js';

const cfg = { players: 300, maxRuns: 15, liar: 0.25, mode: 'all', mix: 'mix' };

test('模拟结果结构合理', () => {
  const g = normalize(clone(SAMPLE));
  const r = runSim(g, cfg);
  assert.ok(r.rate > 0 && r.rate <= 100);
  for (let k = 2; k <= cfg.maxRuns; k++) assert.ok(r.cum[k] >= r.cum[k - 1], '累计达成率不下降');
  for (const id of Object.keys(r.deaths)) assert.ok(['death', 'ending'].includes(g.nodes[id].type));
  assert.equal(r.lost, 0, '示例剧情里没有玩家卡住');
});

test('模拟不会修改剧情数据', () => {
  const g = normalize(clone(SAMPLE));
  const before = JSON.stringify(g);
  runSim(g, cfg);
  assert.equal(JSON.stringify(g), before);
});

test('真结局不可达时达成率为 0', () => {
  const g = normalize(clone(SAMPLE));
  g.nodes.bell.options = g.nodes.bell.options.filter(o => o.goto !== 'e_true');
  assert.equal(runSim(g, { ...cfg, players: 100 }).rate, 0);
});
