## 界面工具：调色板、字体、主题，以及创建常用控件的小函数。
## 颜色与网页版 src/styles/base.css 的设计变量一致。
extends RefCounted

const C := {
	"night": Color("0d1018"), "stone": Color("151a25"), "stone2": Color("1c2230"),
	"seam": Color("2b3345"), "seam2": Color("3a4459"),
	"parch": Color("e8e0cf"), "dim": Color("9298a6"), "mist": Color("8fa3b8"),
	"gold": Color("d9a653"), "gold2": Color("f0c77e"), "gold_deep": Color("6e5326"), "gold_wash": Color("2c2416"),
	"blood": Color("c9444f"), "blood_wash": Color("341318"),
	"jade": Color("63b79f"), "jade_wash": Color("122c27"),
	"rune": Color("8eaeea"), "rune_wash": Color("1a2340"),
}

## 系统里可能有的中文字体，作为打包字体缺字时的后备（只在电脑上有效）
const CJK_FALLBACK := ["Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei"]

static var _body: Font
static var _display: Font
static var _glow: Texture2D
static var _vignette: Texture2D


static func _system_cjk() -> SystemFont:
	var s := SystemFont.new()
	s.font_names = PackedStringArray(CJK_FALLBACK)
	return s


static func _load_font(path: String) -> Font:
	var f: Font = load(path) if ResourceLoader.exists(path) else null
	if f == null:
		return _system_cjk()
	f.fallbacks = [_system_cjk()]
	return f


## 正文字体：思源宋体子集（scripts/../assets/fonts/body.otf，由 npm run fonts 生成）
static func body_font() -> Font:
	if _body == null:
		_body = _load_font("res://assets/fonts/body.otf")
	return _body


## 标题字体：霞鹜文楷子集
static func display_font() -> Font:
	if _display == null:
		_display = _load_font("res://assets/fonts/display.ttf")
		_display.fallbacks = [body_font()]
	return _display


## 中心亮、四周透明的圆形光晕贴图，用来画灯光、月晕、雾。
static func glow() -> Texture2D:
	if _glow == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		var t := GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(1.0, 0.5)
		t.width = 128
		t.height = 128
		_glow = t
	return _glow


## 中心透明、四周暗的暗角贴图。
static func vignette() -> Texture2D:
	if _vignette == null:
		var g := Gradient.new()
		g.offsets = PackedFloat32Array([0.0, 0.55, 1.0])
		g.colors = PackedColorArray([Color(0, 0, 0, 0), Color(0, 0, 0, 0.05), Color(0, 0, 0, 0.72)])
		var t := GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.45)
		t.fill_to = Vector2(1.1, 0.45)
		t.width = 256
		t.height = 256
		_vignette = t
	return _vignette


static func box(bg: Color, border: Color = Color(0, 0, 0, 0), radius := 3, pad := 16.0, border_w := 1) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w if border.a > 0 else 0)
	s.set_corner_radius_all(radius)
	s.set_content_margin_all(pad)
	return s


## 全局主题：字体、按钮、面板、输入框。
static func build_theme() -> Theme:
	var th := Theme.new()
	th.default_font = body_font()
	th.default_font_size = 18
	th.set_color("font_color", "Label", C.parch)

	# 普通按钮：深色底，金色描边表示选中
	var normal := box(C.stone2, C.seam2, 4, 10)
	normal.content_margin_left = 18; normal.content_margin_right = 18
	var hover := normal.duplicate(); hover.border_color = C.gold_deep; hover.bg_color = Color("232a3a")
	var focus := normal.duplicate(); focus.border_color = C.gold; focus.draw_center = false; focus.set_border_width_all(2)
	var pressed := normal.duplicate(); pressed.bg_color = C.gold_wash; pressed.border_color = C.gold
	var disabled := normal.duplicate(); disabled.bg_color = Color(C.stone2, 0.5); disabled.border_color = C.seam
	for t in ["Button", "OptionButton"]:
		th.set_stylebox("normal", t, normal)
		th.set_stylebox("hover", t, hover)
		th.set_stylebox("focus", t, focus)
		th.set_stylebox("pressed", t, pressed)
		th.set_stylebox("disabled", t, disabled)
		th.set_color("font_color", t, C.parch)
		th.set_color("font_hover_color", t, C.parch)
		th.set_color("font_focus_color", t, C.parch)
		th.set_color("font_pressed_color", t, C.gold2)
		th.set_color("font_disabled_color", t, C.dim)

	# 菜单项：没有边框，选中时左边一道金线、文字变亮
	th.set_type_variation("MenuItem", "Button")
	var mi := box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 8)
	mi.content_margin_left = 26
	var mi_on := mi.duplicate()
	mi_on.bg_color = Color(C.gold, 0.12)
	mi_on.border_color = C.gold2
	mi_on.border_width_left = 3
	for s in ["normal", "disabled"]: th.set_stylebox(s, "MenuItem", mi)
	for s in ["hover", "focus", "pressed"]: th.set_stylebox(s, "MenuItem", mi_on)
	th.set_color("font_color", "MenuItem", C.dim)
	th.set_color("font_hover_color", "MenuItem", C.parch)
	th.set_color("font_focus_color", "MenuItem", C.parch)
	th.set_color("font_pressed_color", "MenuItem", C.gold2)
	th.set_font_size("font_size", "MenuItem", 24)

	# 小按钮（残响上的点赞、相信）
	th.set_type_variation("Chip", "Button")
	var chip := box(Color(C.gold, 1), Color(0, 0, 0, 0), 99, 4)
	chip.content_margin_left = 10; chip.content_margin_right = 10
	var chip_h := chip.duplicate(); chip_h.bg_color = C.gold2
	var chip_off := box(Color(0, 0, 0, 0), Color(1, 1, 1, 0.25), 99, 4); chip_off.content_margin_left = 9; chip_off.content_margin_right = 9
	th.set_stylebox("normal", "Chip", chip); th.set_stylebox("hover", "Chip", chip_h); th.set_stylebox("pressed", "Chip", chip_h)
	th.set_stylebox("focus", "Chip", chip_h); th.set_stylebox("disabled", "Chip", chip_off)
	th.set_color("font_color", "Chip", Color("1b1408")); th.set_color("font_hover_color", "Chip", Color("1b1408"))
	th.set_color("font_focus_color", "Chip", Color("1b1408")); th.set_color("font_pressed_color", "Chip", Color("1b1408"))
	th.set_color("font_disabled_color", "Chip", C.dim)
	th.set_font_size("font_size", "Chip", 13)
	# 描边小按钮（点赞）
	th.set_type_variation("ChipGhost", "Button")
	var ghost_h := chip_off.duplicate(); ghost_h.border_color = Color(1, 1, 1, 0.5)
	for s in ["normal", "disabled"]: th.set_stylebox(s, "ChipGhost", chip_off)
	for s in ["hover", "pressed", "focus"]: th.set_stylebox(s, "ChipGhost", ghost_h)
	for s in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: th.set_color(s, "ChipGhost", Color("d6dae3"))
	th.set_font_size("font_size", "ChipGhost", 13)

	th.set_stylebox("panel", "PanelContainer", box(Color(C.stone, 0.96), C.seam, 3, 20))
	var le := box(C.night, C.seam, 3, 8)
	th.set_stylebox("normal", "LineEdit", le)
	var le_f := le.duplicate(); le_f.border_color = C.gold_deep
	th.set_stylebox("focus", "LineEdit", le_f)
	th.set_color("font_color", "LineEdit", C.parch)
	th.set_color("font_placeholder_color", "LineEdit", C.dim)
	th.set_stylebox("panel", "PopupMenu", box(C.stone2, C.seam2, 3, 6))
	th.set_color("default_color", "RichTextLabel", C.parch)
	return th


static func label(text: String, size := 18, color: Color = C.parch, display := false) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if display:
		l.add_theme_font_override("font", display_font())
	return l


static func menu_item(text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.theme_type_variation = "MenuItem"
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	return b


static func full_rect(c: Control) -> Control:
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return c


## 一个铺满屏幕的半透明遮罩，中间放一块面板。返回 [遮罩, 面板里的竖排容器]。
static func overlay(title: String, width := 460.0) -> Array:
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.03, 0.05, 0.75)
	full_rect(dim)
	var center := CenterContainer.new()
	full_rect(center)
	dim.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(width, 0)
	center.add_child(panel)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 14)
	panel.add_child(vb)
	if title != "":
		vb.add_child(label(title, 24, C.gold2))
	return [dim, vb]
