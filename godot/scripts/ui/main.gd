## 主场景：标题画面 ⇄ 入局，以及暂停和设置。Esc 总是先关掉最上面的一层。
extends Control

const UI := preload("res://scripts/ui/ui_kit.gd")
const TitleScript := preload("res://scripts/ui/title.gd")
const PlayScript := preload("res://scripts/ui/play.gd")
const MenusScript := preload("res://scripts/ui/menus.gd")

var title: Control
var play: Control
var menus: Control


func _ready() -> void:
	UI.full_rect(self)
	theme = UI.build_theme()
	var bg := ColorRect.new()
	bg.color = UI.C.night
	add_child(UI.full_rect(bg))
	if Game.G.is_empty():
		var err := UI.label("游戏无法开始：\n" + "\n".join(Game.load_errors), 20, UI.C.blood)
		err.position = Vector2(40, 40)
		add_child(err)
		return
	play = PlayScript.new()
	add_child(play)
	play.hide()
	title = TitleScript.new()
	add_child(title)
	menus = MenusScript.new()
	add_child(menus)
	title.start_game.connect(func():
		Game.new_game()
		_enter_play())
	title.continue_game.connect(func():
		Game.continue_game()
		_enter_play())
	title.open_settings.connect(func(): menus.open_settings(func(): title.show_title()))
	menus.resume.connect(func(): _set_paused(false))
	menus.to_title.connect(_to_title)
	_to_title()


func _enter_play() -> void:
	title.hide()
	play.show()
	_set_paused(false)
	play.enter_scene(true)


func _to_title() -> void:
	play.hide()
	_set_paused(true)
	title.show_title()


func _set_paused(on: bool) -> void:
	play.process_mode = Node.PROCESS_MODE_DISABLED if on else Node.PROCESS_MODE_INHERIT
	if not on:
		play.call_deferred("_set_input_enabled")


func _unhandled_input(event: InputEvent) -> void:
	if not event.is_action_pressed("pause") and not event.is_action_pressed("ui_cancel"):
		return
	get_viewport().set_input_as_handled()
	if menus.back():
		return
	if title.visible:
		title.back()
		return
	if play.visible and not play.close_popup():
		_set_paused(true)
		menus.open_pause()
