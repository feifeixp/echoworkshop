## 全局游戏状态（自动加载为 Game）：剧情、轮回进度、设置、存档、按键映射。
## 规则本身在 scripts/core/，这里只负责"保存在哪、什么时候存"。
extends Node

const StoryLib := preload("res://scripts/core/story.gd")
const Run := preload("res://scripts/core/run_engine.gd")
const SaveCodec := preload("res://scripts/core/save_codec.gd")

const STORY_FILE := "res://data/stories/fog-town.json"
## 玩家本机的剧情副本：含玩家刻下的残响和点赞。剧情 id 或版本号变了会被新版本替换。
const LOCAL_STORY := "user://story.json"
const RUN_SAVE := "user://run.json"
const SETTINGS_FILE := "user://settings.json"
const LIKED_FILE := "user://liked.json"

const TEXT_SPEEDS := {"slow": ["慢", 22.0], "normal": ["中", 45.0], "fast": ["快", 90.0], "instant": ["立即显示", 0.0]}
const MOTION_MODES := {"full": "完整", "reduce": "减少"}

signal settings_changed

var G: Dictionary = {}
var P: Dictionary = {}
var load_errors: Array = []
var liked: Dictionary = {}
var settings := {"textSpeed": "normal", "motion": "full", "fullscreen": false}


func _ready() -> void:
	_setup_input()
	_load_settings()
	liked = _read_json(LIKED_FILE, {})
	if not (liked is Dictionary): liked = {}
	load_story()
	# 开发用：godot ... -- --shots=<目录> 时自动试玩并截图
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--shots="):
			var d: Node = load("res://scripts/dev/shot_driver.gd").new()
			d.out_dir = arg.substr(8)
			add_child(d)


# ---------- 剧情 ----------

func load_story() -> bool:
	var r := StoryLib.load_file(STORY_FILE)
	if not r.ok:
		load_errors = r.errors
		return false
	var published: Dictionary = r.story
	var local = _read_json(LOCAL_STORY, null)
	if local is Dictionary and str(local.get("id")) == published.id and int(local.get("revision", 0)) == int(published.revision):
		var lr := StoryLib.parse(local)
		G = lr.story if lr.ok else published
	else:
		G = published
	return true


func save_story() -> void:
	_write_json(LOCAL_STORY, G)


# ---------- 轮回进度 ----------

func run_save_data():
	return _read_json(RUN_SAVE, null)


func has_run_save() -> bool:
	return not SaveCodec.describe_run(G, run_save_data()).is_empty()


func save_run() -> void:
	if not P.is_empty():
		_write_json(RUN_SAVE, SaveCodec.serialize_run(G, P))


func clear_run() -> void:
	if FileAccess.file_exists(RUN_SAVE):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(RUN_SAVE))
	P = {}


## 新的开始：清空进度，开始第一轮。
func new_game() -> void:
	clear_run()
	P = Run.new_progress(G, G.start)
	Run.start_run(G, P)
	save_run()


## 继续：读档。剧情更新过时保留记忆、开始新的一轮。
func continue_game() -> void:
	var r := SaveCodec.restore_run(G, run_save_data())
	if r.is_empty():
		new_game()
		return
	P = r.P
	if not r.resumable:
		Run.start_run(G, P)
	save_run()


# ---------- 点赞 ----------

func toggle_like(echo: Dictionary) -> void:
	if liked.has(echo.id):
		liked.erase(echo.id)
		echo.likes = maxi(0, int(echo.likes) - 1)
	else:
		liked[echo.id] = true
		echo.likes = int(echo.likes) + 1
	_write_json(LIKED_FILE, liked)
	save_story()


# ---------- 设置 ----------

func set_setting(key: String, value) -> void:
	settings[key] = value
	_write_json(SETTINGS_FILE, settings)
	_apply_settings()
	settings_changed.emit()


func reduce_motion() -> bool:
	return settings.motion == "reduce"


func chars_per_second() -> float:
	return TEXT_SPEEDS.get(settings.textSpeed, TEXT_SPEEDS.normal)[1]


func _load_settings() -> void:
	var s = _read_json(SETTINGS_FILE, {})
	if s is Dictionary:
		for k in settings:
			if s.has(k): settings[k] = s[k]
	if not TEXT_SPEEDS.has(settings.textSpeed): settings.textSpeed = "normal"
	if not MOTION_MODES.has(settings.motion): settings.motion = "full"
	_apply_settings()


func _apply_settings() -> void:
	if OS.has_feature("pc") and not OS.has_feature("web") and DisplayServer.get_name() != "headless":
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if settings.fullscreen else DisplayServer.WINDOW_MODE_WINDOWED)


# ---------- 按键 ----------

## 在代码里定义动作，键盘、手柄都能用。触屏按钮直接发同名动作。
func _setup_input() -> void:
	var keys := {
		"move_left": [KEY_LEFT, KEY_A],
		"move_right": [KEY_RIGHT, KEY_D],
		"interact": [KEY_SPACE, KEY_E],
		"pause": [KEY_ESCAPE],
		"journal": [KEY_TAB, KEY_J],
	}
	var pads := {
		"move_left": [JOY_BUTTON_DPAD_LEFT],
		"move_right": [JOY_BUTTON_DPAD_RIGHT],
		"interact": [JOY_BUTTON_A],
		"pause": [JOY_BUTTON_START],
		"journal": [JOY_BUTTON_Y],
	}
	for action in keys:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.3)
		for code in keys[action]:
			var k := InputEventKey.new()
			k.physical_keycode = code
			InputMap.action_add_event(action, k)
		for btn in pads[action]:
			var j := InputEventJoypadButton.new()
			j.button_index = btn
			InputMap.action_add_event(action, j)
	# 左摇杆
	for pair in [["move_left", -1.0], ["move_right", 1.0]]:
		var m := InputEventJoypadMotion.new()
		m.axis = JOY_AXIS_LEFT_X
		m.axis_value = pair[1]
		InputMap.action_add_event(pair[0], m)


# ---------- 文件 ----------

func _read_json(path: String, fallback):
	if not FileAccess.file_exists(path):
		return fallback
	var v = JSON.parse_string(FileAccess.get_file_as_string(path))
	return fallback if v == null else v


func _write_json(path: String, data) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data))
