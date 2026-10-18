## 标题画面："残响"两个字在夜里留下两道越来越淡的回声。
extends Control

const UI := preload("res://scripts/ui/ui_kit.gd")
const Art := preload("res://scripts/ui/art.gd")
const SaveCodec := preload("res://scripts/core/save_codec.gd")

signal start_game          # 开始新游戏
signal continue_game       # 继续
signal open_settings

var C := UI.C
var bg: Backdrop
var menu: VBoxContainer
var save_line: Label
var title_box: Control
var ghosts: Array = []
var t := 0.0


class Backdrop extends Node2D:
	var size := Vector2(1280, 720)
	var drift := 0.0
	func _draw() -> void:
		var G: Dictionary = Game.G
		Art.paint_backdrop(self, G.nodes.get(G.start, {}), G.start, size.x * 1.1, size.y, size.y * 0.86)
		Art.paint_ground(self, size.x * 1.1, size.y, size.y * 0.86, false)
		# 左侧压暗，让文字清楚
		var p := PackedVector2Array([Vector2(0, 0), Vector2(size.x * 0.7, 0), Vector2(size.x * 0.7, size.y), Vector2(0, size.y)])
		draw_polygon(p, PackedColorArray([Color(0.03, 0.04, 0.06, 0.9), Color(0.03, 0.04, 0.06, 0), Color(0.03, 0.04, 0.06, 0), Color(0.03, 0.04, 0.06, 0.9)]))


func _ready() -> void:
	UI.full_rect(self)
	bg = Backdrop.new()
	add_child(bg)
	var vig := TextureRect.new()
	vig.texture = UI.vignette()
	vig.stretch_mode = TextureRect.STRETCH_SCALE
	vig.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(UI.full_rect(vig))

	var col := VBoxContainer.new()
	col.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	col.grow_vertical = Control.GROW_DIRECTION_BEGIN  # 贴着屏幕下方，内容多了往上长
	col.add_theme_constant_override("separation", 8)
	add_child(col)
	col.set_meta("is_column", true)

	# 标题和它的两道回声
	title_box = Control.new()
	title_box.custom_minimum_size = Vector2(520, 200)
	col.add_child(title_box)
	for i in [2, 1, 0]:
		var l := UI.label("残响", 190, C.mist if i > 0 else C.parch, true)
		if i == 0:
			l.add_theme_constant_override("outline_size", 0)
			l.add_theme_color_override("font_shadow_color", Color(0.94, 0.78, 0.49, 0.3))
			l.add_theme_constant_override("shadow_outline_size", 18)
		l.modulate.a = [1.0, 0.3, 0.13][i]
		title_box.add_child(l)
		l.set_meta("ghost", i)
		ghosts.append(l)

	var sub := UI.label(Game.G.get("name", ""), 22, C.gold2)
	sub.add_theme_constant_override("outline_size", 0)
	col.add_child(sub)
	col.add_child(UI.label("被困在午夜的雾镇里。每一次死去，都会留下一句话。", 17, C.mist))
	var gap := Control.new(); gap.custom_minimum_size = Vector2(0, 14)
	col.add_child(gap)
	menu = VBoxContainer.new()
	menu.add_theme_constant_override("separation", 2)
	col.add_child(menu)
	save_line = UI.label("", 15, C.dim)
	col.add_child(save_line)

	var keys := UI.label("↑ ↓ 选择　回车 确认", 13, C.dim)
	keys.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	keys.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	keys.grow_vertical = Control.GROW_DIRECTION_BEGIN
	keys.offset_right = -24; keys.offset_bottom = -20
	if DisplayServer.is_touchscreen_available(): keys.hide()
	add_child(keys)
	resized.connect(_layout)


func show_title() -> void:
	show()
	_layout()
	_intro()
	_main_menu()


func _layout() -> void:
	bg.size = size
	bg.queue_redraw()
	var fs := clampi(int(size.y * 0.24), 96, 200)
	for l in ghosts:
		l.add_theme_font_size_override("font_size", fs)
	title_box.custom_minimum_size = Vector2(fs * 2.6, fs * 1.2)
	for c in get_children():
		if c.has_meta("is_column"):
			c.offset_left = maxf(28, size.x * 0.08)
			c.offset_bottom = -maxf(48, size.y * 0.08)
			c.offset_top = c.offset_bottom
			c.reset_size()


## 开场：主标题从模糊中浮现，两道回声向右散开。
func _intro() -> void:
	var fs: float = ghosts[0].get_theme_font_size("font_size")
	for l in ghosts:
		var i: int = l.get_meta("ghost")
		var target: float = [0.0, 0.09, 0.2][i] * fs
		if Game.reduce_motion():
			l.position.x = target
			continue
		l.position.x = 0
		var a: float = l.modulate.a
		l.modulate.a = 0
		var tw := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.tween_interval([0.0, 0.6, 0.9][i])
		tw.tween_property(l, "modulate:a", a, [1.6, 2.4, 2.8][i])
		tw.parallel().tween_property(l, "position:x", target, [0.1, 2.8, 3.4][i])


func _clear_menu() -> void:
	for c in menu.get_children():
		c.queue_free()


func _add(text: String, cb: Callable, danger := false) -> Button:
	var b := UI.menu_item(text)
	if danger:
		b.add_theme_color_override("font_focus_color", Color("ff9aa2"))
		b.add_theme_color_override("font_hover_color", Color("ff9aa2"))
	b.pressed.connect(cb)
	menu.add_child(b)
	return b


func _main_menu() -> void:
	_clear_menu()
	var info := SaveCodec.describe_run(Game.G, Game.run_save_data())
	if info.is_empty():
		save_line.text = ""
	else:
		var where := ""
		if info.place != "":
			where = "，%s「%s」" % ["倒在" if info.ended else "在", info.place]
		save_line.text = "上次停在第 %d 次轮回%s。你记得 %d 件事。" % [info.runs, where, info.clues]
	var first: Button
	if not info.is_empty():
		first = _add("继续", func(): continue_game.emit())
		_add("重新开始", _confirm_new)
	else:
		first = _add("开始", func(): start_game.emit())
	_add("设置", func(): open_settings.emit())
	if OS.has_feature("pc") and not OS.has_feature("web"):
		_add("退出", func(): get_tree().quit())
	first.call_deferred("grab_focus")


func _confirm_new() -> void:
	_clear_menu()
	save_line.text = "重新开始会忘掉这座小镇里的一切：所有记忆和轮回记录都会清除。"
	_add("忘掉一切，重新开始", func(): start_game.emit(), true)
	var keep := _add("算了", _main_menu)
	keep.call_deferred("grab_focus")


## Esc：在确认重新开始时返回主菜单。
func back() -> bool:
	if save_line.text.begins_with("重新开始会"):
		_main_menu()
		return true
	return false


func _process(dt: float) -> void:
	if not visible or Game.reduce_motion():
		return
	t += dt
	bg.position.x = -size.x * 0.05 * (0.5 + 0.5 * sin(t / 20.0))
