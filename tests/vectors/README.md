# 一致性用例

网页版（`src/core/run.js`）和 Godot 版（`godot/scripts/core/run_engine.gd`）各自实现了同一套游戏规则。这里的每个 JSON 文件是一段"这样玩，结果应该是这样"的记录，两边的测试都会逐步执行并核对。

- 网页版：`npm test`（`tests/core/vectors.test.js`）
- Godot 版：`npm run test:godot`（`godot/tests/run_tests.gd`）

改了游戏规则，先在这里加或改用例，再让两边都通过。

`dialogue/` 下是另一种用例：正文拆成台词的规则（`{"text": 正文, "lines": [{"who", "text"}]}`），格式见 `docs/STORY_FORMAT.md`「台词」。

## 格式

```json
{
  "name": "说明这个用例在验证什么",
  "story": "stories/fog-town.json",
  "steps": [ { 一个操作或一组期望 }, ... ]
}
```

| 步骤 | 含义 |
|---|---|
| `{"start": true}` | 新存档，开始第一轮 |
| `{"next": true}` | 一轮结束后开始下一轮 |
| `{"choose": "选项文字"}` | 执行当前场景里文字完全相同的选项，应该成功 |
| `{"choose": "选项文字", "fail": "locked"}` | 应该失败，原因是 `hidden` / `used` / `locked` / `ended` |
| `{"believe": 0}` | 相信当前场景的第 0 条残响；可加 `"fail": "no-belief"` / `"already"` |
| `{"carve": "选项文字", "kind": "avoid", "honest": true}` | 在最后做选择的场景刻残响，并核对自动判定的真假 |
| `{"saveload": true}` | 存档成 JSON 再读回来，之后继续玩 |
| `{"expect": {...}}` | 核对当前状态，只核对写出来的字段 |

`expect` 可用的字段：

| 字段 | 说明 |
|---|---|
| `node` | 所在节点 id |
| `end` | `null` 未结束；`"death"` 死亡；`"bad"` 坏结局；`"true"` 真结局 |
| `runs` `money` `belief` `t` `total` | 数字 |
| `items` | 背包，`{"道具id": 数量}`，必须完全一致 |
| `know` | 跨轮记忆的线索 id，排序后完全一致 |
| `runClues` | 本轮得知的线索 id，排序后完全一致 |
| `visible` | 当前场景玩家看得到的选项文字（不含隐藏和已用过的），按顺序 |
| `locked` | 看得到但条件不够的选项文字，按顺序 |
| `newDeathClue` | 死前得知的新线索 id，没有为 `""` |
| `history` | 轮回记录的 `kind` 列表，例如 `["死亡", "真结局"]` |
