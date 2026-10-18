import { test } from 'node:test';
import assert from 'node:assert/strict';
import { O, normalize, canTake, applyOpt, isHonest } from '../../src/core/story.js';
import { SAMPLE } from '../../src/data/fog-town.js';
import { clone } from '../../src/core/util.js';

test('选项默认值完整', () => {
  const o = O('看看', 'x');
  assert.equal(o.needQty, 1);
  assert.equal(o.gainQty, 1);
  assert.equal(o.once, false);
  assert.equal(o.costMoney, 0);
});

test('道具数量与货币：判断能否执行', () => {
  const inv = new Map([['candle', 1]]);
  assert.equal(canTake(O('', '', { needItem: 'candle', needQty: 2 }), inv, 0), false);
  assert.equal(canTake(O('', '', { needItem: 'candle', needQty: 1 }), inv, 0), true);
  assert.equal(canTake(O('', '', { costMoney: 5 }), inv, 4), false);
  assert.equal(canTake(O('', '', { costMoney: 5 }), inv, 5), true);
});

test('执行选项：扣钱、用掉道具、获得道具和钱', () => {
  const inv = new Map([['candle', 2]]);
  const money = applyOpt(O('', '', { needItem: 'candle', useItem: true, costMoney: 3, gainItem: 'key', gainQty: 2, gainMoney: 1 }), inv, 5);
  assert.equal(money, 3);
  assert.equal(inv.get('candle'), 1);
  assert.equal(inv.get('key'), 2);
  applyOpt(O('', '', { needItem: 'candle', useItem: true }), inv, 0);
  assert.equal(inv.has('candle'), false, '用完的道具从背包里移除');
});

test('归一化：补全字段、残响点赞与 id', () => {
  const g = normalize(clone(SAMPLE));
  for (const n of Object.values(g.nodes)) {
    for (const e of n.echoes) { assert.ok(e.id); assert.ok(e.likes >= 0); }
    for (const o of n.options) assert.equal(typeof o.once, 'boolean');
  }
  assert.equal(g.currency, '铜币');
});

test('玩家残响的真假由实际后果决定', () => {
  const g = normalize(clone(SAMPLE));
  const ram = g.nodes.gate.options.find(o => o.text === '用力撞门');
  assert.equal(isHonest(g, ram, 'avoid'), true);
  assert.equal(isHonest(g, ram, 'go'), false);
});
