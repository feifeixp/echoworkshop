## 入局画面：舞台 + 顶部信息 + 飞过的残响 + 互动提示与菜单 + 对话框 + 结局面板 + 记忆笔记 + 触屏按钮。
## 规则全部通过 Run（scripts/core/run_engine.gd）执行；这里只负责呈现和输入。
extends Control

const Run := preload("res://scripts/core/run_engine.gd")
const UI := preload("res://scripts/ui/ui_kit.gd")
const Art := preload("res://scripts/ui/art.gd")
const Texts := preload("res://scripts/ui/texts.gd")
const StageScript := preload("res://scripts/ui/stage.gd")
const StoryLib := preload("res://scripts/core/story.gd")

var C := UI.C
var stage: Node2D
var fog: Array = []
var hud_place: Label
var hud_sub: Label
var hud_money: Label
var candles: Candles
var echo_layer: Control
var echo_cards: Array = []   # [{card, k, x, y, speed, hover}]
var prompt: PanelContainer
var prompt_main: Label
var prompt_sub: Label
var prompt_key: Label
var objmenu: PanelContainer
var objmenu_box: VBoxContainer
var dialog: PanelContainer
var story_text: RichTextLabel
var speaker_tag: Label
var more_mark: Label
## 当前场景的对白：[{speaker, text}]，line_i 是正在显示的一句
var lines: Array = []
var line_i := 0
var trusted_box: HFlowContainer
var nudge: Label
var hint: Label
var fader: ColorRect
var end_layer: Control
var journal_layer: Control
var touch_layer: Control

var groups: Array = []       # [{key, name, idx, kind, slot}]
var gstates: Array = []      # 每个物件：{states, live, hidden, locked, gone, multi}
var menu_group := -1
var busy := false
var typing := 0.0
var shake := 0.0
var dialog_h := 190.0
var ground := 480.0


## 两支蜡烛 = 信念点
class Candles extends Control:
	var lit := 2
	func _init() -> void:
		custom_minimum_size = Vector2(40, 34)
	func _draw() -> void:
		for i in 2:
			var x := 6.0 + i * 18
			var on := i < lit
			if on:
				draw_texture_rect(UI.glow(), Rect2(x - 6, -4, 20, 20), false, Color(0.94, 0.63, 0.25, 0.6))
				draw_colored_polygon(PackedVector2Array([Vector2(x + 4, 1), Vector2(x + 7, 7), Vector2(x + 4, 11), Vector2(x + 1, 7)]), UI.C.gold2)
			draw_rect(Rect2(x + 1, 12, 6, 16), UI.C.parch if on else Color("4a5160"))
			draw_rect(Rect2(x - 1, 27, 10, 3), UI.C.gold_deep)


func _ready() -> void:
	UI.full_rect(self)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	stage = StageScript.new()
	add_child(stage)
	stage.near_changed.connect(func(_i): _update_prompt())
	_build_fog()
	var vig := TextureRect.new()
	vig.texture = UI.vignette()
	vig.stretch_mode = TextureRect.STRETCH_SCALE
	vig.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(UI.full_rect(vig))
	_build_hud()
	echo_layer = Control.new()
	echo_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(UI.full_rect(echo_layer))
	_build_prompt()
	_build_menu()
	_build_dialog()
	_build_touch()
	fader = ColorRect.new()
	fader.color = Color.BLACK
	fader.modulate.a = 0.0
	fader.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(UI.full_rect(fader))
	end_layer = Control.new()
	add_child(UI.full_rect(end_layer))
	end_layer.hide()
	journal_layer = Control.new()
	add_child(UI.full_rect(journal_layer))
	journal_layer.hide()
	resized.connect(func(): if visible and not Game.P.is_empty(): enter_scene(false))
	Game.settings_changed.connect(func(): if visible: _build_echoes())


# ---------- 搭建界面 ----------

func _build_fog() -> void:
	for i in 2:
		var f := TextureRect.new()
		f.texture = UI.glow()
		f.stretch_mode = TextureRect.STRETCH_SCALE
		f.modulate = Color(0.62, 0.7, 0.78, 0.16 if i == 0 else 0.11)
		f.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(f)
		fog.append(f)


func _build_hud() -> void:
	var bar := HBoxContainer.new()
	bar.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	bar.offset_left = 24; bar.offset_right = -24; bar.offset_top = 16
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bar)
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_theme_constant_override("separation", 0)
	bar.add_child(left)
	hud_place = UI.label("", 38, C.parch, true)
	hud_place.add_theme_constant_override("outline_size", 8)
	hud_place.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
	left.add_child(hud_place)
	hud_sub = UI.label("", 15, C.mist)
	left.add_child(hud_sub)
	var right := HBoxContainer.new()
	right.add_theme_constant_override("separation", 14)
	right.alignment = BoxContainer.ALIGNMENT_END
	bar.add_child(right)
	right.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	hud_money = UI.label("", 18, C.gold2)
	hud_money.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	right.add_child(hud_money)
	candles = Candles.new()
	candles.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	right.add_child(candles)
	for spec in [["记忆", "journal"], ["菜单", "pause"]]:
		var b := Button.new()
		b.text = spec[0]
		b.focus_mode = Control.FOCUS_NONE
		b.add_theme_font_size_override("font_size", 15)
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var action: String = spec[1]
		b.pressed.connect(func(): _press_action(action))
		right.add_child(b)


func _press_action(action: String) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = true
	Input.parse_input_event(ev)


func _build_prompt() -> void:
	prompt = PanelContainer.new()
	prompt.add_theme_stylebox_override("panel", UI.box(Color(0.04, 0.05, 0.08, 0.92), C.gold_deep, 6, 10))
	prompt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 10)
	prompt.add_child(hb)
	prompt_key = UI.label("空格", 13, C.gold2)
	var kp := PanelContainer.new()
	kp.add_theme_stylebox_override("panel", UI.box(C.seam, C.gold, 4, 3))
	kp.add_child(prompt_key)
	kp.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hb.add_child(kp)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 2)
	hb.add_child(vb)
	prompt_main = UI.label("", 18)
	prompt_sub = UI.label("", 13, C.gold)
	vb.add_child(prompt_main)
	vb.add_child(prompt_sub)
	add_child(prompt)
	prompt.hide()


func _build_menu() -> void:
	objmenu = PanelContainer.new()
	objmenu.add_theme_stylebox_override("panel", UI.box(Color(0.04, 0.05, 0.08, 0.96), C.gold_deep, 6, 12))
	objmenu_box = VBoxContainer.new()
	objmenu_box.add_theme_constant_override("separation", 4)
	objmenu.add_child(objmenu_box)
	add_child(objmenu)
	objmenu.hide()


func _build_dialog() -> void:
	dialog = PanelContainer.new()
	var st := UI.box(Color(0.06, 0.07, 0.11, 0.94), C.seam, 0, 0)
	st.border_width_left = 0; st.border_width_right = 0; st.border_width_bottom = 0
	st.content_margin_left = 48; st.content_margin_right = 48; st.content_margin_top = 18; st.content_margin_bottom = 16
	dialog.add_theme_stylebox_override("panel", st)
	dialog.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	add_child(dialog)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	dialog.add_child(vb)
	var head := HBoxContainer.new()
	vb.add_child(head)
	speaker_tag = UI.label("", 19, C.gold2, true)
	speaker_tag.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(speaker_tag)
	more_mark = UI.label("", 13, C.dim)
	head.add_child(more_mark)
	story_text = RichTextLabel.new()
	story_text.bbcode_enabled = true
	story_text.fit_content = true
	story_text.scroll_active = false
	story_text.add_theme_font_size_override("normal_font_size", 21)
	story_text.add_theme_constant_override("line_separation", 8)
	story_text.custom_minimum_size = Vector2(0, 64)
	story_text.mouse_filter = Control.MOUSE_FILTER_STOP
	story_text.gui_input.connect(func(e): if e is InputEventMouseButton and e.pressed: advance_dialog())
	vb.add_child(story_text)
	trusted_box = HFlowContainer.new()
	vb.add_child(trusted_box)
	nudge = UI.label("", 16, C.gold2)
	vb.add_child(nudge)
	hint = UI.label("", 13, C.dim)
	vb.add_child(hint)


func _build_touch() -> void:
	touch_layer = Control.new()
	touch_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(UI.full_rect(touch_layer))
	if not DisplayServer.is_touchscreen_available():
		touch_layer.hide()
		return
	for spec in [["◀", -1.0, 24.0], ["▶", 1.0, 112.0]]:
		var b := Button.new()
		b.text = spec[0]
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(76, 76)
		b.add_theme_stylebox_override("normal", UI.box(Color(0.04, 0.05, 0.08, 0.55), Color(0.56, 0.64, 0.72, 0.35), 38, 8))
		b.set_meta("x", spec[2])
		var d: float = spec[1]
		b.button_down.connect(func(): stage.touch_dir = d)
		b.button_up.connect(func(): stage.touch_dir = 0.0)
		touch_layer.add_child(b)
	var act := Button.new()
	act.text = "互动"
	act.focus_mode = Control.FOCUS_NONE
	act.custom_minimum_size = Vector2(120, 76)
	act.add_theme_font_size_override("font_size", 22)
	act.add_theme_stylebox_override("normal", UI.box(Color(0.04, 0.05, 0.08, 0.6), C.gold_deep, 38, 8))
	act.set_meta("x", -1.0)
	act.pressed.connect(on_interact_pressed)
	touch_layer.add_child(act)


func _layout() -> void:
	var W := size.x
	var H := size.y
	dialog_h = clampf(H * 0.27, 160, 240)
	ground = H - dialog_h - 36
	dialog.offset_top = -dialog_h
	for b in touch_layer.get_children():
		var x: float = b.get_meta("x")
		b.position = Vector2(W - b.custom_minimum_size.x - 24 if x < 0 else x, ground - b.custom_minimum_size.y - 16)


# ---------- 进入场景 ----------

## 根据当前轮回状态重画整个场景。reset_pos 为 true 时角色回到场景左侧。
func enter_scene(reset_pos: bool) -> void:
	_layout()
	var G := Game.G
	var P := Game.P
	groups = Run.group_options(G, P.node) if G.nodes.has(P.node) else []
	for gi in groups.size():
		groups[gi].kind = Run.object_kind(G, P.node, groups[gi])
		groups[gi].slot = Run.object_slot(G, P.node, groups[gi], gi, groups.size())
	stage.build(G, P.node, groups, size, ground, reset_pos)
	_close_menu()
	refresh()
	var n = G.nodes.get(P.node)
	lines = StoryLib.split_lines(n.text if n != null else "这条路通向一个不存在的地方，你迷失在雾里。")
	line_i = 0
	if P.end != null:
		_show_all_lines()   # 一轮结束时操作都在结局面板上，对白一次显示完
	else:
		_show_line()
	_build_echoes()
	if P.end != null:
		_show_end()
	else:
		end_layer.hide()
	_set_input_enabled()


## 规则状态变化后刷新：物件、提示、菜单、顶部信息、相信过的残响。
func refresh() -> void:
	var G := Game.G
	var P := Game.P
	var states := Run.option_states(G, P)
	gstates.clear()
	var stage_states := []
	for g in groups:
		var ss := []
		for i in g.idx:
			if i < states.size():
				ss.append(states[i])
		var live := ss.filter(func(s): return not s.used)
		var vis := live.filter(func(s): return not s.hidden)
		var mark := ""
		for s in vis:
			var m := Run.echo_stance(G, P, s.i)
			if m == "go" or (m == "avoid" and mark == ""): mark = m
		var gs := {"states": ss, "live": live, "vis": vis, "gone": live.is_empty(), "hidden": vis.is_empty(),
			"locked": not vis.is_empty() and vis.all(func(s): return s.locked), "multi": live.size() > 1}
		gstates.append(gs)
		stage_states.append({"hidden": gs.hidden, "locked": gs.locked, "gone": gs.gone, "mark": mark})
	stage.set_states(stage_states)
	_update_hud()
	_update_prompt()
	_update_trusted()
	var hidden_n := states.filter(func(s): return s.hidden).size()
	var keys := "◀ ▶ 移动，点「互动」" if DisplayServer.is_touchscreen_available() else "← → 或 A D 移动，空格互动，Tab 查看记忆，Esc 菜单"
	hint.text = keys + ("。雾里还有 %d 处你暂时看不懂的东西。" % hidden_n if hidden_n > 0 else "。")
	if menu_group >= 0:
		_open_menu(menu_group)


func _update_hud() -> void:
	var G := Game.G
	var P := Game.P
	var n = G.nodes.get(P.node)
	hud_place.text = n.title if n != null else "迷失"
	hud_sub.text = "第 %d 次轮回，本轮已过 %s" % [int(P.runs), Texts.minutes(P.t)]
	hud_money.text = "● %d %s" % [int(P.money), G.currency]
	candles.lit = int(P.belief)
	candles.queue_redraw()


func _update_trusted() -> void:
	for c in trusted_box.get_children():
		c.queue_free()
	var n = Game.G.nodes.get(Game.P.node)
	if n == null or not Game.P.believed.has(Game.P.node):
		return
	for k in Game.P.believed[Game.P.node]:
		var chip := PanelContainer.new()
		chip.add_theme_stylebox_override("panel", UI.box(C.rune_wash, Color("33467a"), 99, 4))
		var l := UI.label("你相信了：" + n.echoes[int(k)].text, 14, C.rune)
		chip.add_child(l)
		trusted_box.add_child(chip)


# ---------- 对白：一句一句显示 ----------

func _esc(t: String) -> String:
	return t.replace("[", "[lb]")


func _show_line() -> void:
	if lines.is_empty():
		speaker_tag.text = ""
		story_text.text = ""
		more_mark.text = ""
		typing = -1.0
		return
	var ln: Dictionary = lines[line_i]
	speaker_tag.text = ln.speaker  # 旁白时为空，但保留位置，让右边的"继续"提示不跳动
	speaker_tag.visible = true
	story_text.text = _esc(ln.text)
	_update_more()
	_start_typing()


func _show_all_lines() -> void:
	speaker_tag.visible = false
	more_mark.text = ""
	var parts := []
	for ln in lines:
		parts.append(("[color=#f0c77e]%s[/color]　" % _esc(ln.speaker) if ln.speaker != "" else "") + _esc(ln.text))
	story_text.text = "\n".join(parts)
	_finish_typing()


func _update_more() -> void:
	var left := lines.size() - 1 - line_i
	if left > 0:
		var key := "点击" if DisplayServer.is_touchscreen_available() else "空格"
		more_mark.text = "▼ %s继续（%d / %d）" % [key, line_i + 1, lines.size()]
	else:
		more_mark.text = ("%d / %d" % [lines.size(), lines.size()]) if lines.size() > 1 else ""


## 还有没读完的对白（正在逐字显示，或后面还有句子）
func dialog_pending() -> bool:
	return typing >= 0.0 or line_i < lines.size() - 1


## 翻到下一句：正在逐字显示时先显示完整这一句。返回是否翻页了。
func advance_dialog() -> bool:
	if Game.P.get("end") != null:
		return false
	if typing >= 0.0:
		_finish_typing()
		return true
	if line_i < lines.size() - 1:
		line_i += 1
		_show_line()
		return true
	return false


## "互动"键：对白没读完先翻页，读完了才和物件互动。
func on_interact_pressed() -> void:
	if not advance_dialog():
		interact()


# ---------- 逐字显示 ----------

func _start_typing() -> void:
	var cps := Game.chars_per_second()
	if cps <= 0.0 or Game.reduce_motion():
		story_text.visible_characters = -1
		typing = -1.0
	else:
		typing = 0.0
		story_text.visible_characters = 0


func _finish_typing() -> void:
	typing = -1.0
	story_text.visible_characters = -1


# ---------- 互动 ----------

func _update_prompt() -> void:
	var gi: int = stage.near
	if gi < 0 or gi >= gstates.size() or menu_group >= 0 or Game.P.end != null:
		prompt.hide()
		return
	var gs: Dictionary = gstates[gi]
	var G := Game.G
	var P := Game.P
	var main := ""
	var sub := []
	var can := true
	var main_col: Color = C.parch
	if gs.hidden:
		main = "雾里有什么，但你还不知道该做什么"
		main_col = C.dim
		can = false
	elif gs.multi:
		main = groups[gi].name if groups[gi].name != "" else gs.vis[0].o.text
		var hid: int = gs.live.size() - gs.vis.size()
		sub.append("%d 件可以做的事%s" % [gs.vis.size(), ("，还有 %d 件你暂时想不到" % hid) if hid > 0 else ""])
	else:
		var s: Dictionary = gs.vis[0]
		if s.locked:
			main = Texts.lock_msg(G, s.o, P.items, int(P.money))
			main_col = Color("e2686f")
			sub.append(s.o.text)
			can = false
		else:
			main = s.o.text
			var cl := Texts.cost_line(G, s.o)
			if cl != "": sub.append(cl)
		if s.o.needClue != "": sub.append("因为你知道：" + str(G.clues.get(s.o.needClue, "")))
		if s.o.hintClue != "" and Run.knows(P, s.o.hintClue): sub.append("你想起：" + str(G.clues.get(s.o.hintClue, "")))
	prompt_main.text = main
	prompt_main.add_theme_color_override("font_color", main_col)
	prompt_sub.text = "\n".join(sub)
	prompt_sub.visible = not sub.is_empty()
	prompt_key.get_parent().visible = can
	prompt_key.text = "互动" if DisplayServer.is_touchscreen_available() else "空格"
	prompt.reset_size()
	prompt.show()
	_place_above(prompt, gi)


func _place_above(c: Control, gi: int) -> void:
	var p: Vector2 = stage.object_screen_pos(gi)
	var h: float = Art.OBJ_H.get(groups[gi].kind, 60)
	var x := clampf(p.x - c.size.x / 2 + (sin(shake * 60) * 5 if shake > 0 else 0.0), 12, size.x - c.size.x - 12)
	c.position = Vector2(x, maxf(80, p.y - h - c.size.y - 34))


func interact() -> void:
	if busy or Game.P.end != null or not visible:
		return
	if menu_group >= 0:
		return
	var gi: int = stage.near
	if gi < 0:
		nudge.text = "附近没有可以互动的东西，走近一点。"
		return
	var gs: Dictionary = gstates[gi]
	if gs.hidden:
		nudge.text = "那里有什么，但你还不知道该做什么。"
		shake = 0.3
		return
	if gs.multi:
		_open_menu(gi)
		return
	var s: Dictionary = gs.vis[0]
	if s.locked:
		nudge.text = Texts.lock_msg(Game.G, s.o, Game.P.items, int(Game.P.money)) + "。"
		shake = 0.3
		return
	_do_option(gi, s.i)


func _open_menu(gi: int) -> void:
	menu_group = gi
	prompt.hide()
	for c in objmenu_box.get_children():
		c.queue_free()
	var gs: Dictionary = gstates[gi]
	var G := Game.G
	var P := Game.P
	objmenu_box.add_child(UI.label(groups[gi].name if groups[gi].name != "" else "互动", 17, C.gold2))
	var first: Button = null
	var n := 0
	for s in gs.vis:
		n += 1
		var b := UI.menu_item("%d  %s" % [n, s.o.text])
		b.add_theme_font_size_override("font_size", 19)
		var tags := []
		if s.locked:
			tags.append(Texts.lock_msg(G, s.o, P.items, int(P.money)))
			b.add_theme_color_override("font_color", C.dim)
		else:
			var cl := Texts.cost_line(G, s.o)
			if cl != "": tags.append(cl)
		if s.o.needClue != "": tags.append("因为你知道：" + str(G.clues.get(s.o.needClue, "")))
		var st := Run.echo_stance(G, P, s.i)
		if st != "": tags.append("残响指向这里" if st == "go" else "残响警告：别这么做")
		var i: int = s.i
		var locked: bool = s.locked
		var o: Dictionary = s.o
		b.pressed.connect(func():
			if locked:
				nudge.text = Texts.lock_msg(Game.G, o, Game.P.items, int(Game.P.money)) + "。"
				shake = 0.3
			else:
				_close_menu()
				_do_option(gi, i))
		objmenu_box.add_child(b)
		if not tags.is_empty():
			var tl := UI.label("      " + "　".join(tags), 13, C.gold if not locked else Color("e2686f"))
			objmenu_box.add_child(tl)
		if first == null and not locked:
			first = b
	var hid: int = gs.live.size() - gs.vis.size()
	if hid > 0:
		objmenu_box.add_child(UI.label("还有 %d 件事，你现在还想不到。" % hid, 14, C.dim))
	objmenu_box.add_child(UI.label("↑↓ 选择　回车确认　Esc 离开", 12, C.dim))
	objmenu.reset_size()
	objmenu.show()
	await get_tree().process_frame
	objmenu.reset_size()
	_place_above(objmenu, gi)
	var target: Button = first if first != null else objmenu_box.get_children().filter(func(c): return c is Button).front()
	if target: target.grab_focus()
	_set_input_enabled()


func _close_menu() -> void:
	menu_group = -1
	objmenu.hide()
	_set_input_enabled()
	_update_prompt()


func _do_option(gi: int, i: int) -> void:
	var G := Game.G
	var P := Game.P
	var o: Dictionary = G.nodes[P.node].options[i]
	if o.goto == P.node:
		# 留在原地的行动：不换场景、不黑屏、角色不动
		var r := Run.choose_option(G, P, i)
		if not r.ok: return
		Game.save_run()
		var cost := Texts.cost_line(G, o)
		var gain := Texts.gain_text(G, o)
		nudge.text = "，".join([cost, gain].filter(func(s): return s != "")) if (cost != "" or gain != "") else "你%s，但什么也没发生。" % o.text
		stage.float_text(gi, gain.split("，")[0] if gain != "" else "", C.gold2)
		stage.float_text(gi, cost.split("，")[0].replace("花费 ", "-").replace("用掉 ", "-") if cost != "" else "", Color("e2686f"), 26)
		refresh()
		return
	busy = true
	_set_input_enabled()
	var fade := 0.0 if Game.reduce_motion() else 0.32
	var tw := create_tween()
	tw.tween_property(fader, "modulate:a", 1.0, fade)
	await tw.finished
	var gain := Texts.gain_text(G, o)
	Run.choose_option(G, P, i)
	Game.save_run()
	enter_scene(true)
	nudge.text = gain
	var tw2 := create_tween()
	tw2.tween_property(fader, "modulate:a", 0.0, fade)
	busy = false
	_set_input_enabled()


# ---------- 残响 ----------

func _build_echoes() -> void:
	for e in echo_cards:
		e.card.queue_free()
	echo_cards.clear()
	var P := Game.P
	var n = Game.G.nodes.get(P.node)
	if n == null or P.end != null:
		return
	var believed: Dictionary = P.believed.get(P.node, {})
	var row := 0
	for k in n.echoes.size():
		if believed.has(k):
			continue
		var e: Dictionary = n.echoes[k]
		var card := PanelContainer.new()
		card.add_theme_stylebox_override("panel", UI.box(Color(0.04, 0.05, 0.08, 0.6), Color(0.56, 0.64, 0.72, 0.3), 99, 5))
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 8)
		card.add_child(hb)
		var tl := UI.label("  " + e.text, 18, Color("eef0f4"))
		hb.add_child(tl)
		var like := Button.new()
		like.theme_type_variation = "ChipGhost"
		like.focus_mode = Control.FOCUS_NONE
		_like_text(like, e)
		like.pressed.connect(func():
			Game.toggle_like(e)
			_like_text(like, e))
		hb.add_child(like)
		var bel := Button.new()
		bel.theme_type_variation = "Chip"
		bel.focus_mode = Control.FOCUS_NONE
		bel.text = "相信" if int(P.belief) > 0 else "信念耗尽"
		bel.disabled = int(P.belief) <= 0
		var kk: int = k
		bel.pressed.connect(func(): _believe(kk))
		hb.add_child(bel)
		echo_layer.add_child(card)
		# 三条车道；同一车道里的残响速度相同，前后隔开，不会互相重叠
		var lane := row % 3
		var item := {"card": card, "k": k, "lane": lane, "order": row / 3, "x": 0.0, "y": 116.0 + lane * 46.0, "speed": 58.0 + lane * 13.0, "hover": false}
		card.mouse_entered.connect(func(): item.hover = true)
		card.mouse_exited.connect(func(): item.hover = false)
		echo_cards.append(item)
		row += 1
	await get_tree().process_frame
	var W := size.x
	for j in echo_cards.size():
		var it: Dictionary = echo_cards[j]
		if Game.reduce_motion():
			it.x = 24.0
			it.y = 116.0 + j * 46.0
		else:
			it.x = W * (0.22 + it.lane * 0.17) + it.order * maxf(W * 0.62, 560.0)
		it.card.position = Vector2(it.x, it.y)


func _like_text(b: Button, e: Dictionary) -> void:
	b.text = ("♥ %d" if Game.liked.has(e.id) else "♡ %d") % int(e.likes)
	var col := Color("ff8a93") if Game.liked.has(e.id) else Color("d6dae3")
	for s in ["font_color", "font_hover_color", "font_pressed_color"]:
		b.add_theme_color_override(s, col)


func _believe(k: int) -> void:
	var r := Run.believe_echo(Game.G, Game.P, k)
	if not r.ok:
		return
	Game.save_run()
	if r.clue != "":
		nudge.text = "你相信了它。你得知：" + str(Game.G.clues.get(r.clue, ""))
	_build_echoes()
	refresh()


# ---------- 一轮结束 ----------

func _show_end() -> void:
	for c in end_layer.get_children():
		c.queue_free()
	end_layer.show()
	prompt.hide()
	var G := Game.G
	var P := Game.P
	var n = G.nodes.get(P.node)
	var won: bool = P.end.get("true", false)
	var dead: bool = n != null and n.type == "death"
	var dim := ColorRect.new()
	dim.color = Color(0.16, 0.0, 0.03, 0.55) if dead else Color(0, 0, 0, 0.45)
	end_layer.add_child(UI.full_rect(dim))
	var verdict := UI.label("通关" if won else ("死" if dead else "轮回"), 150, C.gold2 if won else (C.blood if dead else Color("d58a4a")), true)
	verdict.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	verdict.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	verdict.offset_top = size.y * 0.08
	end_layer.add_child(verdict)
	if not Game.reduce_motion():
		verdict.modulate.a = 0
		verdict.pivot_offset = Vector2(size.x / 2, 90)
		verdict.scale = Vector2(1.3, 1.3)
		var tw := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.tween_property(verdict, "modulate:a", 1.0, 0.8)
		tw.parallel().tween_property(verdict, "scale", Vector2.ONE, 0.8)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.offset_top = size.y * 0.3
	end_layer.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(minf(640, size.x - 32), 0)
	center.add_child(panel)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 12)
	panel.add_child(vb)
	var title := UI.label(n.title if n != null else "迷失", 26, C.parch, true)
	vb.add_child(title)
	if P.get("newDeathClue", "") != "":
		var shard := PanelContainer.new()
		shard.add_theme_stylebox_override("panel", UI.box(C.rune_wash, Color("33467a"), 3, 12))
		shard.add_child(UI.label("记忆碎片：%s\n下一轮你会记得。" % G.clues.get(P.newDeathClue, ""), 17, C.rune))
		vb.add_child(shard)
	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", 10)
	var focus_first: Control = null
	if won:
		vb.add_child(UI.label("你一共经历了 %d 次轮回，累计约 %s。" % [int(P.runs), Texts.minutes(P.total)], 17))
		var again := Button.new(); again.text = "带着记忆再走一次"
		again.pressed.connect(_next_run)
		var fresh := Button.new(); fresh.text = "忘掉一切，从头再来"
		fresh.pressed.connect(func():
			Game.new_game()
			enter_scene(true))
		buttons.add_child(again); buttons.add_child(fresh)
		focus_first = again
	elif P.lastChoice != null and G.nodes.has(P.lastChoice.node):
		var lc_node: Dictionary = G.nodes[P.lastChoice.node]
		vb.add_child(UI.label("在「%s」刻下一句残响。后来的人会看见它飘过，你可以说真话，也可以骗人。" % lc_node.title, 16, C.dim))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)
		var opt := OptionButton.new()
		for o in lc_node.options:
			opt.add_item(o.text)
		opt.select(int(P.lastChoice.idx))
		opt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var kind := OptionButton.new()
		kind.add_item("别这么做")
		kind.add_item("就这么做")
		row.add_child(opt); row.add_child(kind)
		vb.add_child(row)
		var text := LineEdit.new()
		text.placeholder_text = "残响内容（留空则自动生成），比如：门后有人在等你"
		text.max_length = 40
		vb.add_child(text)
		var carve := Button.new(); carve.text = "刻下残响，进入第 %d 次轮回" % (int(P.runs) + 1)
		carve.pressed.connect(func():
			Run.carve_echo(Game.G, Game.P, opt.selected, "avoid" if kind.selected == 0 else "go", text.text)
			Game.save_story()
			_next_run())
		var skip := Button.new(); skip.text = "什么也不留"
		skip.pressed.connect(_next_run)
		buttons.add_child(carve); buttons.add_child(skip)
		focus_first = carve
	else:
		var nxt := Button.new(); nxt.text = "进入第 %d 次轮回" % (int(P.runs) + 1)
		nxt.pressed.connect(_next_run)
		buttons.add_child(nxt)
		focus_first = nxt
	vb.add_child(buttons)
	if focus_first:
		focus_first.call_deferred("grab_focus")


func _next_run() -> void:
	Run.start_run(Game.G, Game.P)
	Game.save_run()
	end_layer.hide()
	enter_scene(true)


# ---------- 记忆笔记 ----------

func toggle_journal() -> void:
	if journal_layer.visible:
		journal_layer.hide()
		_set_input_enabled()
		return
	for c in journal_layer.get_children():
		c.queue_free()
	var G := Game.G
	var P := Game.P
	var ov := UI.overlay("记忆", 560)
	journal_layer.add_child(ov[0])
	var vb: VBoxContainer = ov[1]
	var items := []
	for k in P.items:
		items.append("%s ×%d" % [Texts.item_name(G, k), int(P.items[k])])
	vb.add_child(UI.label("行囊", 15, C.dim))
	vb.add_child(UI.label(("、".join(items) if not items.is_empty() else "空的") + "　　%s %d" % [G.currency, int(P.money)], 18))
	vb.add_child(UI.label("道具和%s在轮回中都会丢失。" % G.currency, 13, C.dim))
	vb.add_child(UI.label("记得的事", 15, C.dim))
	var clues := {}
	clues.merge(P.know); clues.merge(P.runClues)
	if clues.is_empty():
		vb.add_child(UI.label("你什么都不记得。", 17, C.dim))
	for c in clues:
		vb.add_child(UI.label("◆ %s%s" % [G.clues.get(c, c), "" if P.know.has(c) else "（这一轮得知）"], 17, C.rune if P.know.has(c) else C.gold2))
	vb.add_child(UI.label("足迹", 15, C.dim))
	var path := []
	for id in P.path:
		path.append(G.nodes[id].title if G.nodes.has(id) else id)
	var pl := UI.label(" › ".join(path), 16)
	pl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vb.add_child(pl)
	vb.add_child(UI.label("轮回记录", 15, C.dim))
	if P.history.is_empty():
		vb.add_child(UI.label("这是你的第一次。", 16, C.dim))
	for h in P.history:
		vb.add_child(UI.label("第 %d 次，%s于%s　%s" % [int(h.run), h.kind, h.title, Texts.minutes(h.t)], 16, C.blood if h.kind == "死亡" else (C.jade if h.kind == "真结局" else Color("d58a4a"))))
	var close := Button.new()
	close.text = "合上（Tab）"
	close.pressed.connect(toggle_journal)
	vb.add_child(close)
	close.call_deferred("grab_focus")
	journal_layer.show()
	_set_input_enabled()


# ---------- 输入 ----------

## 有弹出层（物件菜单、记忆笔记）时先关掉它，返回 true；没有返回 false。给 Esc 用。
func close_popup() -> bool:
	if menu_group >= 0:
		_close_menu()
		return true
	if journal_layer.visible:
		toggle_journal()
		return true
	return false


func _set_input_enabled() -> void:
	stage.can_move = visible and not busy and menu_group < 0 and not journal_layer.visible and Game.P.get("end") == null


func _unhandled_input(event: InputEvent) -> void:
	if not visible or Game.P.is_empty():
		return
	if event.is_action_pressed("journal"):
		toggle_journal()
		accept_event()
	elif event.is_action_pressed("interact") and menu_group < 0 and not journal_layer.visible:
		on_interact_pressed()
		accept_event()
	elif menu_group >= 0 and event is InputEventKey and event.pressed and event.keycode >= KEY_1 and event.keycode <= KEY_9:
		var buttons := objmenu_box.get_children().filter(func(c): return c is Button)
		var idx: int = event.keycode - KEY_1
		if idx < buttons.size():
			buttons[idx].emit_signal("pressed")
		accept_event()


func _process(dt: float) -> void:
	if not visible:
		return
	if typing >= 0.0:
		typing += Game.chars_per_second() * dt
		story_text.visible_characters = int(typing)
		if story_text.visible_characters >= story_text.get_total_character_count():
			_finish_typing()
	if shake > 0:
		shake = maxf(0, shake - dt)
		_update_prompt()
	elif prompt.visible and stage.near >= 0:
		_place_above(prompt, stage.near)
	var W := size.x
	var tt: float = stage.t
	for i in fog.size():
		var f: TextureRect = fog[i]
		f.size = Vector2(W * 0.9, size.y * 0.6)
		var drift := 0.0 if Game.reduce_motion() else sin(tt / (19.0 + i * 8)) * W * 0.08
		f.position = Vector2(W * (0.05 + i * 0.4) + drift, ground - size.y * 0.42 + i * 30)
	if Game.reduce_motion():
		return
	for it in echo_cards:
		if it.hover:
			continue
		it.x -= it.speed * dt
		if it.x < -it.card.size.x - 20:
			# 排到同车道最后一条的后面
			var tail := W + 40.0
			for other in echo_cards:
				if other != it and other.lane == it.lane:
					tail = maxf(tail, other.x + other.card.size.x + 80.0)
			it.x = tail
		it.card.position = Vector2(it.x, it.y)
