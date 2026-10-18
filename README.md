# 残响工坊

一个 Roguelike + AVG 游戏的原型和它的剧情设计工具。

玩家被困在午夜循环的雾镇里，一次次死去，又一次次醒来。每次死亡都会留下记忆碎片，也可以给后来的人留一句"残响"。残响可能是真心的提示，也可能是谎言。玩家看得到别人点了多少赞，却看不到它是真是假。

这个仓库目前包含三部分：

| 页面 | 作用 |
|---|---|
| 剧情编织 | 用节点地图编辑剧情：选项、道具锁、知识锁、货币、一次性互动、残响。实时检查死局和可解性。 |
| 入局 | 以玩家身份游玩：横版场景里左右移动，空格与物件互动，相信或点赞飞过的残响。 |
| 命运推演 | 让几百个 AI 玩家反复入局，统计通关率、平均局数、劝退点和残响的影响。 |

## 快速开始

需要 Node.js 20 或更高版本。项目没有任何 npm 依赖，不需要 `npm install`。

```bash
npm run dev        # 开发服务器 http://localhost:5173/
npm test           # 核心逻辑单元测试
npm run build      # 打包成单个文件 dist/index.html
npm run preview    # 预览打包结果
npm run test:e2e   # 浏览器冒烟测试（需要 Python 3 和 Playwright）
npm run check      # 以上全部
```

`dist/index.html` 是一个独立的单文件网页，可以直接双击打开，也可以上传到任何静态托管。

## 目录结构

```
index.html              页面骨架（开发时直接加载 src/ 下的模块）
src/
  core/                 与界面无关的纯逻辑，可以在 Node 里测试
    story.js            剧情数据模型、归一化、货币与道具规则
    analysis.js         剧情检查：可达性、可解性、最快通关路径
    simulate.js         AI 玩家批量模拟
    layout.js           剧情地图自动布局
    util.js             通用小函数
  data/fog-town.js      示例剧情「雾镇 · 第一夜」
  app/                  全局状态、存储、文案、标签切换
  editor/               剧情编织页：地图、检查面板、节点编辑栏
  play/                 入局页：场景绘制、角色与物件、互动菜单、轮回状态
  sim/                  命运推演页
  styles/               样式，按页面拆分
  main.js               入口
scripts/                零依赖的开发服务器和打包脚本
tests/core/             单元测试（node:test）
tests/e2e/              浏览器冒烟测试（Playwright）
docs/                   设计文档、数据格式、开发路线
```

## 文档

- [开发路线](docs/ROADMAP.md)：从原型到可以发布的游戏，分阶段的计划和验收标准
- [游戏设计](docs/DESIGN.md)：设计支柱、核心循环、残响规则
- [剧情数据格式](docs/STORY_FORMAT.md)：节点、选项、残响的字段说明
