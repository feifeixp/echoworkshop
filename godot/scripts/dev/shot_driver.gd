## 开发用：自动走一遍游戏并截图。只在命令行带 --shots=<目录> 时启用（见 Game._ready）。
##   xvfb-run godot --path godot --rendering-driver opengl3 -- --shots=/tmp/shots
## 也是一个界面层面的冒烟测试：任何一步不符合预期就打印"✗"并以非零退出。
extends Node

var out_dir := ""
var fails := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_run.call_deferred()


func _wait(sec: float) -> void:
	await get_tree().create_timer(sec).timeout


func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(name + ".png"))
	print("  截图 ", name)


func _check(ok: bool, msg: String) -> void:
	print(("  ✓ " if ok else "  ✗ ") + msg)
	if not ok: fails += 1


func _key(action: String) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = true
	Input.parse_input_event(ev)
	await get_tree().process_frame
	ev = ev.duplicate()
	ev.pressed = false
	Input.parse_input_event(ev)


func _main() -> Control:
	return get_tree().current_scene


## 一句句点完当前场景的台词。
func _skip_dialogue() -> void:
	var play = _main().play
	for i in 20:
		if not play._advance():
			return
		await _wait(0.05)


## 把角色移到某个物件跟前（物件名或第一个选项的文字）并互动。
func _use(match_text: String) -> bool:
	var play = _main().play
	await _skip_dialogue()
	for gi in play.groups.size():
		var g: Dictionary = play.groups[gi]
		var first_text: String = Game.G.nodes[Game.P.node].options[g.idx[0]].text
		if g.name == match_text or first_text == match_text:
			play.stage.px = play.stage.objs[gi].position.x
			await _wait(0.25)
			play.interact()
			await _wait(0.2)
			return true
	_check(false, "场景「%s」里找不到「%s」" % [Game.P.node, match_text])
	return false


func _choose_in_menu(text: String) -> void:
	var play = _main().play
	for b in play.objmenu_box.get_children():
		if b is Button and b.text.ends_with(text):
			b.emit_signal("pressed")
			await _wait(0.9)
			return
	_check(false, "菜单里找不到「%s」" % text)


func _run() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	Game.clear_run()
	print("自动试玩：")
	await _wait(3.6)
	var main := _main()
	_check(main.title.visible, "先显示标题画面")
	await _shot("01-title")
	_key("ui_accept")
	await _wait(1.6)
	_check(main.play.visible and Game.P.node == "arrive", "回车开始，从镇口出发")
	await _shot("02-arrive")

	# 走路：按住右键一会儿
	Input.action_press("move_right")
	await _wait(0.8)
	Input.action_release("move_right")
	_check(main.play.stage.px > 100, "按方向键角色会移动")

	await _use("去酒馆打听消息")
	await _wait(1.6)
	_check(Game.P.node == "tavern", "走到路标前互动，进入酒馆")
	var play = main.play
	_check(play.in_dialogue() and not play.stage.can_move, "酒馆有多句台词，播完前不能走动")
	_key("interact")
	await _wait(0.1)
	_key("interact")
	await _wait(1.2)
	_check(play.line_i == 1 and play.speaker.text == "老板", "按空格推进到老板的台词，显示说话人")
	await _shot("03-tavern-dialogue")
	await _skip_dialogue()
	_check(not play.in_dialogue() and play.stage.can_move, "台词播完后可以走动")
	await _use("老板")
	_check(main.play.objmenu.visible, "和老板互动弹出菜单")
	await _shot("04-tavern-menu")
	await _choose_in_menu("帮忙擦杯子，赚点钱")
	_check(int(Game.P.money) == 5 and Game.P.node == "tavern", "打工赚钱，留在酒馆（钱 %d）" % int(Game.P.money))
	await _shot("05-tavern-work")
	await _use("老板")
	await _choose_in_menu("讨一支蜡烛，然后离开")
	await _wait(1.0)
	_check(Game.P.node == "square", "带着蜡烛来到广场")
	await _use("去钟楼")
	await _wait(1.6)
	_check(Game.P.node == "gate", "来到钟楼门前")
	await _wait(1.5)
	await _shot("06-gate-echoes")
	main.play._believe(0)
	await _wait(0.4)
	_check(int(Game.P.belief) == 1, "相信一条残响，花掉一点信念")
	await _shot("07-gate-believed")
	_key("journal")
	await _wait(0.5)
	_check(main.play.journal_layer.visible, "Tab 打开记忆笔记")
	await _shot("08-journal")
	_key("journal")
	await _wait(0.3)
	await _use("钟楼大门")
	await _choose_in_menu("用力撞门")
	await _wait(1.6)
	_check(Game.P.end != null and Game.P.node == "d_door", "撞门而死")
	await _shot("09-death")
	_key("pause")
	await _wait(0.4)
	_check(main.menus.pause_layer.visible, "Esc 打开暂停菜单")
	await _shot("10-pause")
	main.menus.open_settings(func(): main.menus.open_pause())
	main.menus.pause_layer.hide()
	await _wait(0.8)
	await _shot("11-settings")
	main.menus.back()
	main.menus.back()
	await _wait(0.3)
	main._to_title()
	await _wait(3.6)
	_check(main.title.menu.get_child(0).text == "继续", "回到标题后出现「继续」")
	await _shot("12-title-continue")
	print("自动试玩%s" % ("通过" if fails == 0 else "失败：%d 项" % fails))
	get_tree().quit(1 if fails > 0 else 0)
