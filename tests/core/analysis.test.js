import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/core/analysis.js';
import { normalize } from '../../src/core/story.js';
import { SAMPLE } from '../../src/data/fog-town.js';
import { clone } from '../../src/core/util.js';

const story = () => normalize(clone(SAMPLE));

test('示例剧情没有错误，第一局理论上就能通关', () => {
  const a = analyze(story());
  assert.deepEqual(a.issues.filter(i => i.lv === 'err'), []);
  assert.equal(a.minRuns, 1);
  assert.equal(a.fast.path[0], 'arrive');
  assert.equal(a.fast.path.at(-1), 'e_true');
});

test('拿不到的道具会被报告为错误', () => {
  const g = story();
  for (const n of Object.values(g.nodes)) for (const o of n.options) if (o.gainItem === 'key') o.gainItem = '';
  const a = analyze(g);
  assert.ok(a.issues.some(i => i.lv === 'err' && i.msg.includes('铜钥匙')));
});

test('真结局只能靠死亡得到的线索解锁时，最少局数大于 1', () => {
  const g = story();
  // 去掉墙上的名字，让「艾格尼丝」只能从死亡中得知
  for (const n of Object.values(g.nodes)) for (const o of n.options) if (o.gainClue === 'name') o.gainClue = '';
  const a = analyze(g);
  assert.equal(a.minRuns, 2);
});

test('一次性选项不能反复刷', () => {
  const g = story();
  // 让喷泉成为唯一的赚钱途径，并抬高守夜人的价格
  for (const n of Object.values(g.nodes)) for (const o of n.options) if (o.text !== '在喷泉底摸硬币') o.gainMoney = 0;
  const bribe = g.nodes.gate.options.find(o => o.costMoney === 5);
  bribe.costMoney = 4;
  // 去掉其他进门方式
  g.nodes.gate.options = g.nodes.gate.options.filter(o => o === bribe);
  g.nodes.church.options.forEach(o => (o.gainItem = ''));
  const a = analyze(g);
  assert.equal(a.minRuns, null, '开局 2 + 喷泉 1 = 3，不够 4，真结局不可达');
});

test('起点丢失会报错', () => {
  const g = story();
  g.start = 'nope';
  assert.ok(analyze(g).issues.some(i => i.lv === 'err'));
});
