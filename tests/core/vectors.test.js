// 一致性用例：tests/vectors/*.json。Godot 版跑的是同一批文件（godot/tests/run_tests.gd）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseStory, dialogueLines } from '../../src/core/story.js';
import { newProgress, startRun, chooseOption, believeEcho, carveEcho, optionStates } from '../../src/core/run.js';
import { serializeRun, restoreRun } from '../../src/core/save.js';

const dir = new URL('../vectors/', import.meta.url);
const root = new URL('../../', import.meta.url);

function check(G, P, exp, where) {
  const sorted = s => [...s].sort();
  const states = optionStates(G, P);
  const actual = {
    node: P.node,
    end: P.end ? (P.end.true ? 'true' : P.end.type === 'ending' ? 'bad' : P.end.type) : null,
    runs: P.runs, money: P.money, belief: P.belief, t: P.t, total: P.total,
    items: Object.fromEntries(P.items),
    know: sorted(P.know), runClues: sorted(P.runClues),
    visible: states.filter(s => !s.hidden && !s.used).map(s => s.o.text),
    locked: states.filter(s => !s.hidden && !s.used && s.locked).map(s => s.o.text),
    newDeathClue: P.newDeathClue || '',
    history: P.history.map(h => h.kind),
  };
  for (const [k, v] of Object.entries(exp)) {
    assert.ok(k in actual, `${where}：未知的字段 ${k}`);
    assert.deepEqual(actual[k], v, `${where}：${k}`);
  }
}

for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const vec = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  test(`一致性用例 ${file}：${vec.name}`, () => {
    const G = parseStory(JSON.parse(readFileSync(new URL(vec.story, root), 'utf8')));
    let P = null;
    vec.steps.forEach((st, n) => {
      const where = `${file} 第 ${n + 1} 步`;
      if (st.start) { P = newProgress(G, G.start); startRun(G, P); }
      else if (st.next) startRun(G, P);
      else if (st.choose !== undefined) {
        const i = G.nodes[P.node].options.findIndex(o => o.text === st.choose);
        const r = chooseOption(G, P, i);
        if (st.fail) assert.equal(r.reason, st.fail, where);
        else assert.ok(r.ok, `${where}：选择「${st.choose}」失败（${r.reason}）`);
      } else if (st.believe !== undefined) {
        const r = believeEcho(G, P, st.believe);
        if (st.fail) assert.equal(r.reason, st.fail, where);
        else assert.ok(r.ok, `${where}：相信残响失败（${r.reason}）`);
      } else if (st.carve !== undefined) {
        const node = G.nodes[P.lastChoice.node];
        const target = node.options.findIndex(o => o.text === st.carve);
        const e = carveEcho(G, P, { target, kind: st.kind, text: '' });
        assert.ok(e, `${where}：刻残响失败`);
        assert.equal(e.honest, st.honest, `${where}：真假判定`);
      } else if (st.saveload) {
        const r = restoreRun(G, JSON.parse(JSON.stringify(serializeRun(G, P))));
        assert.ok(r && r.resumable, `${where}：存档无法继续`);
        P = r.P;
      } else if (st.expect) check(G, P, st.expect, where);
      else assert.fail(`${where}：无法识别的步骤 ${JSON.stringify(st)}`);
    });
  });
}

const dialogue = JSON.parse(readFileSync(new URL('dialogue/lines.json', dir), 'utf8'));
test(`一致性用例 dialogue/lines.json：${dialogue.name}`, () => {
  dialogue.cases.forEach((c, i) => {
    assert.deepEqual(dialogueLines(c.text), c.lines, `第 ${i + 1} 条：${JSON.stringify(c.text)}`);
  });
});
