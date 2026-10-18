# 残响工坊：开发约定

给在这个仓库里工作的 Claude 和开发者看的。

## 运行与验证

- `npm test`：核心逻辑单元测试，任何改动后都要跑。
- `npm run check`：单元测试 + 构建 + 浏览器冒烟测试。提交前跑这个。
- 冒烟测试用 Python Playwright（`python3 tests/e2e/smoke.py`），会自己启动开发服务器。
- 改了界面，用 `python3 tests/e2e/smoke.py --shots <目录>` 生成截图，亲眼看一下。

## 架构规则

0. **两个入口**：`index.html` + `src/game-main.js` 是游戏，`editor.html` + `src/editor-main.js` 是编辑器。游戏的依赖树里不能出现 `src/editor/`、`src/sim/`（打包后用 `grep '// ---- src/editor' dist/index.html` 检查）。游戏部分需要通知编辑器时，用 `store.js` 的 `emit()` / `on()`，不要直接 import 编辑器模块。

1. **`src/core/` 不碰 DOM。** 不能 import `src/app/`、`src/editor/`、`src/play/`、`src/sim/` 里的任何东西。核心函数把剧情数据作为第一个参数 `G` 显式传入，不读全局状态。新的游戏规则先写进 core，并配单元测试。
2. **界面模块共享的可变状态放在 `src/app/store.js` 的 `S` 对象里**（`S.G` 当前剧情、`S.P` 当前轮回、`S.sel` 选中节点等）。只在一个模块里赋值的状态，可以用该模块导出的 `let`。
3. **所有模块的顶层名字全局唯一，import 不用 `as` 改名。** 打包脚本是把模块直接拼接起来的，重名会让构建失败（脚本会检查并报出重名）。
4. **零 npm 依赖。** 浏览器原生 ES 模块 + Node 内置工具。确实需要第三方库时，先在路线图里讨论。
5. 剧情数据存在 `stories/*.json`，读取一律走 `parseStory()`（先 `validateStory()` 结构校验，再 `normalize()`）。新增字段时在 `O()` / `N()` 里给默认值，并在 `normalize()` 里兼容旧数据。格式不兼容地改变时把 `FORMAT_VERSION` 加一。改了数据格式，同步更新 `docs/STORY_FORMAT.md`。
6. 需要随机数的核心逻辑接受可选的种子（见 `makeRng()`），测试里用固定种子。
7. 新写或大改的代码用正常的多行格式（参考 `src/core/`）。界面模块里还有不少压缩风格的旧代码，改到哪里顺手展开到哪里。

## 文案

- 界面文字一律中文，用玩家能懂的说法（"残响""轮回""记忆碎片"），不用内部字段名。
- 按钮写清楚会发生什么（"刻下残响，进入第 3 次轮回"）。
- 错误提示说清楚缺什么、怎么补（"需要 5 铜币（你有 2）"）。

## 本地存储键

- `echo-workshop-v3`：编辑器里正在编辑的剧情；`echo-workshop-v3-tab`：编辑器上次打开的标签页
- `echo-game-v1`：游戏里的剧情副本（含玩家留下的残响和点赞）。剧情文件的 `id` 或 `revision` 变了就会被新版本替换
- `echo-liked-v1`：本机点过赞的残响 id

改存储结构时优先在 `normalize()` 里做迁移，避免换键导致用户编辑丢失。
