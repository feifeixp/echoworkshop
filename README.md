# 残响工坊

一个 Roguelike + AVG 游戏，和它的剧情设计工具。

- **游戏**用 Godot 4.5 开发，在 [`godot/`](godot/README.md)，面向电脑、手机和网页。
- **剧情编辑器**是网页（`editor.html`），用来写剧情、检查死局、批量推演；导出的剧情 JSON 给游戏用。
- 两边实现同一套[游戏规则](docs/MECHANICS.md)，并且都要通过 `tests/vectors/` 里的一致性用例。

玩家被困在午夜循环的雾镇里，一次次死去，又一次次醒来。每次死亡都会留下记忆碎片，也可以给后来的人留一句"残响"。残响可能是真心的提示，也可能是谎言。玩家看得到别人点了多少赞，却看不到它是真是假。

仓库根目录是网页部分，有两个页面：

**网页试玩版**（`index.html`）：玩家打开就玩。从标题画面开始，横版场景里左右移动，空格与物件互动，相信或点赞飞过的残响，Esc 打开菜单。进度自动保存。没有任何编辑功能。

**编辑器**（`editor.html`）：开发团队用。

| 标签 | 作用 |
|---|---|
| 剧情编织 | 用节点地图编辑剧情：选项、道具锁、知识锁、货币、一次性互动、残响。实时检查死局和可解性。 |
| 入局 | 在编辑器里直接试玩当前剧情。 |
| 命运推演 | 让几百个 AI 玩家反复入局，统计通关率、平均局数、劝退点和残响的影响。可填随机种子让结果可复现。 |

剧情存放在 `stories/` 下的 JSON 文件里。编辑器改完后，用"导入 / 导出 → 下载 JSON 文件"导出，替换 `stories/` 里的同名文件，游戏就会用上新版本。

## 快速开始

需要 Node.js 20 或更高版本。项目没有任何 npm 依赖，不需要 `npm install`。

```bash
npm run dev        # 开发服务器：游戏 http://localhost:5173/ ，编辑器 http://localhost:5173/editor.html
npm test           # 网页版核心逻辑单元测试 + 一致性用例
npm run test:godot # Godot 版测试 + 同一批一致性用例（需要安装 Godot 4.5）
npm run sync:godot # 把 stories/ 下的剧情同步到 Godot 项目
npm run build      # 打包成 dist/index.html（游戏）和 dist/editor.html（编辑器）
npm run preview    # 预览打包结果
npm run test:e2e   # 浏览器冒烟测试（需要 Python 3 和 Playwright）
npm run check      # 以上全部
```

打包出的两个文件都是独立的单文件网页，剧情也内嵌在里面，可以直接双击打开，也可以上传到任何静态托管。

## 目录结构

```
index.html              游戏页面
editor.html             编辑器页面
stories/                剧情 JSON 文件（游戏和编辑器的数据来源）
src/
  game-main.js          游戏入口
  game/                 游戏专用界面：标题画面、暂停菜单、设置
  editor-main.js        编辑器入口
  core/                 与界面无关的纯逻辑，可以在 Node 里测试
    story.js            剧情数据模型、归一化、货币与道具规则
    analysis.js         剧情检查：可达性、可解性、最快通关路径
    simulate.js         AI 玩家批量模拟
    save.js             轮回存档的保存与恢复
    run.js              一局游戏的全部规则（Godot 版对应 godot/scripts/core/run_engine.gd）
    layout.js           剧情地图自动布局
    util.js             通用小函数
  app/                  全局状态、存储、剧情文件读取、文案、标签切换
  editor/               剧情编织页：地图、检查面板、节点编辑栏
  play/                 入局页：场景绘制、角色与物件、互动菜单、轮回状态
  sim/                  命运推演页
  styles/               样式，按页面拆分
scripts/                零依赖的开发服务器和打包脚本
tests/core/             单元测试（node:test）
tests/vectors/          一致性用例：网页版和 Godot 版共用
godot/                  Godot 游戏项目
tests/e2e/              浏览器冒烟测试（Playwright）
docs/                   设计文档、数据格式、开发路线
```

## 文档

- [开发路线](docs/ROADMAP.md)：从原型到可以发布的游戏，分阶段的计划和验收标准
- [游戏机制](docs/MECHANICS.md)：与实现语言无关的规则说明，网页版和 Godot 版都按它实现
- [Godot 版说明](godot/README.md)：运行、测试、导出
- [游戏设计](docs/DESIGN.md)：设计支柱、核心循环、残响规则
- [剧情数据格式](docs/STORY_FORMAT.md)：节点、选项、残响的字段说明
