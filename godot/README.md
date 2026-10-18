# 残响 · Godot 版

正式的游戏。用 Godot 4.5 和 GDScript 开发，目标平台是电脑（Windows / macOS / Linux）、手机和网页。

剧情由网页编辑器（仓库根目录的 `editor.html`）编写，导出为 `stories/*.json`，再同步到这里的 `data/stories/`。游戏规则见 [`docs/MECHANICS.md`](../docs/MECHANICS.md)。

## 运行

1. 安装 [Godot 4.5](https://godotengine.org/download)（标准版，不需要 .NET 版）。
2. 用 Godot 打开这个 `godot/` 文件夹，按 F5 运行。

操作：方向键或 A / D 移动，空格或 E 互动（有多句台词时用来推进，按住快速跳过），Tab 查看记忆，Esc 菜单。手柄：十字键或左摇杆移动，A 互动，Y 记忆，Start 菜单。有触屏时画面上会出现方向键和互动按钮。

## 剧情更新后

```bash
npm run sync:godot     # 把 stories/*.json 复制到 godot/data/stories/
```

剧情里出现了新的字（场景名、对白），重新生成字体子集：

```bash
python3 scripts/build-fonts.py <NotoSerifCJK-Regular.ttc> <LXGWWenKai-Regular.ttf>
```

字体来源和许可见 [`assets/fonts/README.md`](assets/fonts/README.md)。

## 测试

```bash
npm run test:godot     # 无界面：单元测试 + 与网页版共用的一致性用例
npm run shots:godot    # 自动试玩一遍并截图到 build/shots/（Linux，需要 xvfb）
```

在 macOS 上没有 xvfb，直接开窗口跑（窗口要保持在最前面：被挡住时 macOS 不再渲染，截图会一直等下去）：

```bash
/Applications/Godot.app/Contents/MacOS/Godot --path godot --always-on-top --resolution 1280x720 -- --shots=build/shots
```

`test:godot` 会检查 `data/stories/` 里的剧情是否和 `stories/` 一致，忘了同步会报错。

## 导出

`export_presets.cfg` 里预设了 Windows、macOS、Linux、Web、iOS、Android 六个平台。导出前需要在 Godot 里下载导出模板（编辑器 → 管理导出模板）。包名都是 `com.neowow.echo`；图标是 `assets/icon.png`，由 `python3 scripts/build-icon.py` 生成。

### iOS 真机

签名用个人团队 `4445MCDJ66`（装到手机上 7 天后失效，重新装一次即可）。预设只导出 Xcode 工程，编译和安装用 Xcode 的命令行：

```bash
cd godot && /Applications/Godot.app/Contents/MacOS/Godot --headless --path . --export-debug iOS ../build/ios/残响.ipa
cd ../build/ios && xcodebuild -project 残响.xcodeproj -scheme 残响 -configuration Debug -destination generic/platform=iOS -derivedDataPath dd -allowProvisioningUpdates DEVELOPMENT_TEAM=4445MCDJ66 CODE_SIGN_STYLE=Automatic build
xcrun devicectl list devices                                   # 找到手机的 UDID
xcrun devicectl device install app --device <UDID> dd/Build/Products/Debug-iphoneos/残响.app
```

手机要解锁、亮屏，否则安装和启动都会失败。第一次打开前在手机上：设置 → 通用 → VPN 与设备管理 → 信任开发者。

### Android

预设已经配好（只打 arm64，横屏全屏），还没在真机上导出过。需要 JDK 17（本机只有 11）、Android SDK 的 build-tools，以及一台打开 USB 调试的手机。

### 手机界面

- 手机上界面基准是 960×540（电脑 1280×720），等于整体放大 1.33 倍：`Game.PHONE_BASE`。
- 走动没有方向键图标：按住屏幕，角色朝手指那边走，松开就停。「互动」按钮在对话框右下角，不挡场景。
- 顶栏、对话框、按钮避开刘海和主屏指示条：`Game.safe_insets()`。
- 在电脑上模拟手机：`-- --phone`（强制手机模式，并模拟 iPhone 横屏的安全区），例如自动试玩：

```bash
/Applications/Godot.app/Contents/MacOS/Godot --path godot --always-on-top --resolution 1266x585 -- --phone --shots=build/shots-phone
```

## 目录

```
project.godot
scenes/main.tscn            唯一的场景；界面全部在代码里搭建
scripts/
  core/                     游戏规则，与界面无关（对应网页版 src/core/）
    story.gd                剧情数据：校验、归一化、货币与道具
    run_engine.gd           一局游戏的规则：开始一轮、执行选项、相信残响、刻残响、物件分组
    save_codec.gd           轮回存档（与网页版格式相同）
  autoload/game.gd          全局状态（自动加载为 Game）：剧情、进度、设置、存档、按键
  ui/
    main.gd                 标题 ⇄ 入局，Esc 逐层关闭
    title.gd                标题画面
    play.gd                 入局画面：顶部信息、残响、互动提示与菜单、对话框、结局、记忆笔记、触屏
    stage.gd                横版舞台：背景、地面、物件、角色、移动和镜头
    art.gd                  程序化绘制（背景、物件、角色）
    menus.gd                暂停菜单、设置
    texts.gd                面向玩家的文案
    ui_kit.gd               调色板、字体、主题
  dev/shot_driver.gd        自动试玩截图（只在带 --shots= 参数时启用）
tests/run_tests.gd          无界面测试
data/stories/               剧情副本（npm run sync:godot 生成）
assets/fonts/               中文字体子集
```

## 写代码时注意

- **规则改动先改 `docs/MECHANICS.md` 和 `tests/vectors/`**，再同时改 `scripts/core/` 和网页版 `src/core/`，两边测试都要通过。
- 脚本之间用 `preload` 引用，不用 `class_name`，这样无界面测试不依赖编辑器生成的类缓存。
- 在代码里创建控件时，用 `set_anchors_and_offsets_preset()`，不要用 `set_anchors_preset()`：后者会保持控件当前的大小（刚创建时是 0），控件就看不见了。
- 改了界面，跑一遍 `npm run shots:godot` 看截图。
