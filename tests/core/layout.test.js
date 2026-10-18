import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, NH } from '../../src/core/layout.js';
import { normalize } from '../../src/core/story.js';
import { sample } from './fixtures.js';

test('每个节点都有位置，同一列的节点不重叠', () => {
  const g = sample();
  const { pos } = computeLayout(g);
  assert.equal(Object.keys(pos).length, Object.keys(g.nodes).length);
  const cols = {};
  for (const p of Object.values(pos)) (cols[p.x] ||= []).push(p.y);
  for (const ys of Object.values(cols)) {
    ys.sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= NH, '同列节点间距不小于节点高度');
  }
});

test('前向连线总是从左往右', () => {
  const g = sample();
  const { pos } = computeLayout(g);
  for (const [id, n] of Object.entries(g.nodes))
    for (const o of n.options)
      if (o.goto !== id && ['arrive', 'gate', 'bell'].includes(id)) assert.ok(pos[o.goto].x > pos[id].x);
});

test('分支会错开，不会全部排在同一行', () => {
  const g = sample();
  const { pos } = computeLayout(g);
  assert.ok(new Set(Object.values(pos).map(p => p.y)).size >= 5);
});
