## 暂停菜单与设置面板。两者都是铺满屏幕的遮罩。
extends Control

const UI := preload("res://scripts/ui/ui_kit.gd")

signal resume
signal to_title

var C := UI.C
var pause_layer: Control
var settings_layer: Control
var settings_back: Callable
var preview: Label
var preview_t := -1.0
const PREVIEW := "镇口的钟敲了一下，又一下。你不记得自己是怎么来的。"


func _ready() -> void:
	UI.full_rect(self)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	pause_layer = Control.new()
	add_child(UI.full_rect(pause_layer))
	pause_layer.hide()
	settings_layer = Control.new()
	add_child(UI.full_rect(settings_layer))
	settings_layer.hide()


func is_open() -> bool:
	return pause_layer.visible or settings_layer.visible


# ---------- 暂停 ----------

func open_pause() -> void:
	for c in pause_layer.get_children():
		c.queue_free()
	var ov := UI.overlay("暂停", 380)
	pause_layer.add_child(ov[0])
	var vb: VBoxContainer = ov[1]
	var first := UI.menu_item("继续游戏")
	first.pressed.connect(close_pause)
	vb.add_child(first)
	var s := UI.menu_item("设置")
	s.pressed.connect(func():
		pause_layer.hide()
		open_settings(func(): open_pause()))
	vb.add_child(s)
	var t := UI.menu_item("回到标题画面")
	t.pressed.connect(func():
		pause_layer.hide()
		to_title.emit())
	vb.add_child(t)
	vb.add_child(UI.label("进度已自动保存", 13, C.dim))
	pause_layer.show()
	first.call_deferred("grab_focus")


func close_pause() -> void:
	pause_layer.hide()
	resume.emit()


# ---------- 设置 ----------

func open_settings(back: Callable) -> void:
	settings_back = back
	for c in settings_layer.get_children():
		c.queue_free()
	var ov := UI.overlay("设置", 520)
	settings_layer.add_child(ov[0])
	var vb: VBoxContainer = ov[1]
	var first := _group(vb, "文字速度", Game.TEXT_SPEEDS.keys(), func(k): return Game.TEXT_SPEEDS[k][0], "textSpeed")
	preview = UI.label("", 17)
	preview.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	preview.custom_minimum_size = Vector2(0, 54)
	var pv := PanelContainer.new()
	pv.add_theme_stylebox_override("panel", UI.box(Color(0.05, 0.06, 0.09, 0.6), Color(0, 0, 0, 0), 0, 10))
	pv.add_child(preview)
	vb.add_child(pv)
	_group(vb, "动态效果", Game.MOTION_MODES.keys(), func(k): return Game.MOTION_MODES[k], "motion")
	vb.add_child(UI.label("\"减少\"会停下飘动的雾和飞过的残响，残响改为静止排列。", 13, C.dim))
	if OS.has_feature("pc") and not OS.has_feature("web"):
		var fs := CheckButton.new()
		fs.text = "全屏"
		fs.button_pressed = bool(Game.settings.fullscreen)
		fs.toggled.connect(func(on): Game.set_setting("fullscreen", on))
		vb.add_child(fs)
	var done := UI.menu_item("完成")
	done.pressed.connect(close_settings)
	vb.add_child(done)
	settings_layer.show()
	_play_preview()
	first.call_deferred("grab_focus")


func _group(vb: VBoxContainer, title: String, keys: Array, name_of: Callable, setting: String) -> Button:
	vb.add_child(UI.label(title, 15, C.dim))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	vb.add_child(row)
	var group := ButtonGroup.new()
	var current: Button
	for k in keys:
		var b := Button.new()
		b.text = name_of.call(k)
		b.toggle_mode = true
		b.button_group = group
		b.button_pressed = Game.settings[setting] == k
		b.add_theme_font_size_override("font_size", 16)
		var key: String = k
		b.pressed.connect(func():
			Game.set_setting(setting, key)
			if setting == "textSpeed": _play_preview())
		row.add_child(b)
		if b.button_pressed: current = b
	return current if current else row.get_child(0)


func _play_preview() -> void:
	preview.text = PREVIEW
	if Game.chars_per_second() <= 0 or Game.reduce_motion():
		preview.visible_characters = -1
		preview_t = -1
	else:
		preview_t = 0.0
		preview.visible_characters = 0


func close_settings() -> void:
	settings_layer.hide()
	preview_t = -1
	if settings_back.is_valid():
		settings_back.call()


## Esc：关掉最上面的一层。返回是否处理了。
func back() -> bool:
	if settings_layer.visible:
		close_settings()
		return true
	if pause_layer.visible:
		close_pause()
		return true
	return false


func _process(dt: float) -> void:
	if preview_t >= 0 and settings_layer.visible:
		preview_t += Game.chars_per_second() * dt
		preview.visible_characters = int(preview_t)
		if preview_t >= PREVIEW.length():
			preview_t = -1
