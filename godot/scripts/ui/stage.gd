## 横版舞台：背景、地面、场景物件、玩家角色；处理移动、镜头和"离哪个物件最近"。
## 不处理规则：物件的状态由 play.gd 根据规则引擎算好后传进来。
extends Node2D

const Art := preload("res://scripts/ui/art.gd")
const UI := preload("res://scripts/ui/ui_kit.gd")

const SPEED := 240.0
const NEAR_DIST := 64.0

signal near_changed(index: int)

var W := 1280.0
var H := 720.0
var ground := 480.0
var world_w := 1920.0
var px := 60.0
var face := 1.0
var walk := 0.0
var cam := 0.0
var near := -1
var can_move := true
var t := 0.0
## 由触屏按钮设置的移动方向（-1 / 0 / 1）
var touch_dir := 0.0

var backdrop: Backdrop
var world: Node2D
var ground_node: Ground
var player: PlayerNode
var objs: Array = []   # ObjNode
var floats: Array = []  # 飘字


class Backdrop extends Node2D:
	var node: Dictionary = {}
	var id := ""
	var size := Vector2(1280, 720)
	var ground := 480.0
	func _draw() -> void:
		Art.paint_backdrop(self, node, id, size.x, size.y, ground)


class Ground extends Node2D:
	var width := 1920.0
	var H := 720.0
	var ground := 480.0
	var inside := false
	func _draw() -> void:
		Art.paint_ground(self, width, H, ground, inside)


class ObjNode extends Node2D:
	var kind := "orb"
	var hidden_obj := false
	var locked := false
	var gone := false
	var is_near := false
	var phase := 0.0
	var mark := ""  # 相信过的残响："go" / "avoid" / ""
	var tm := 0.0
	func _process(dt: float) -> void:
		tm += dt
		queue_redraw()
	func _draw() -> void:
		if gone:
			return
		Art.paint_object(self, "ghost" if hidden_obj else kind, is_near and not hidden_obj, locked, tm, phase)
		if mark != "" and not hidden_obj:
			var y: float = -Art.OBJ_H.get(kind, 60) - 22 + sin(tm * 3) * 2
			var txt := "残响：在这里" if mark == "go" else "残响：危险"
			var f := UI.body_font()
			var w := f.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x + 18
			var col: Color = UI.C.jade if mark == "go" else UI.C.blood
			draw_style_box(UI.box(UI.C.jade_wash if mark == "go" else UI.C.blood_wash, col, 10, 0), Rect2(-w / 2, y - 14, w, 22))
			draw_string(f, Vector2(-w / 2 + 9, y + 2), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, col)


class PlayerNode extends Node2D:
	var face := 1.0
	var walk := 0.0
	var tm := 0.0
	func _draw() -> void:
		Art.paint_player(self, face, walk, tm)


func _ready() -> void:
	backdrop = Backdrop.new()
	add_child(backdrop)
	world = Node2D.new()
	add_child(world)
	ground_node = Ground.new()
	world.add_child(ground_node)
	player = PlayerNode.new()
	world.add_child(player)


## 重建场景。groups: [{kind, slot(0–1), ...}]，顺序与 play.gd 的物件顺序一致。
func build(G: Dictionary, node_id: String, groups: Array, view: Vector2, ground_y: float, reset_pos: bool) -> void:
	var n: Dictionary = G.nodes.get(node_id, {"title": "", "text": "", "type": "story"})
	W = view.x
	H = view.y
	ground = ground_y
	world_w = maxf(W * 1.5, 250.0 * groups.size() + 360.0)
	backdrop.node = n
	backdrop.id = node_id
	backdrop.size = Vector2(W * 1.35, H)
	backdrop.ground = ground
	backdrop.queue_redraw()
	ground_node.width = world_w
	ground_node.H = H
	ground_node.ground = ground
	ground_node.inside = Art.is_inside(n)
	ground_node.queue_redraw()
	for o in objs:
		o.queue_free()
	objs.clear()
	for i in groups.size():
		var ob := ObjNode.new()
		ob.kind = groups[i].kind
		ob.phase = float(i)
		ob.position = Vector2(groups[i].slot * world_w, ground)
		world.add_child(ob)
		world.move_child(ob, 1)  # 在角色后面
		objs.append(ob)
	for f in floats:
		f.queue_free()
	floats.clear()
	if reset_pos:
		px = maxf(46.0, world_w * 0.06)
		face = 1.0
	near = -1
	_update_view()


## 物件状态：states[i] = {hidden, locked, gone, mark}
func set_states(states: Array) -> void:
	for i in mini(states.size(), objs.size()):
		var s: Dictionary = states[i]
		objs[i].hidden_obj = s.hidden
		objs[i].locked = s.locked
		objs[i].gone = s.gone
		objs[i].mark = s.mark
	_find_near(true)


## 屏幕坐标（用于把提示气泡放在物件上方）
func object_screen_pos(i: int) -> Vector2:
	if i < 0 or i >= objs.size():
		return Vector2.ZERO
	return objs[i].position + world.position + position


func float_text(i: int, text: String, color: Color, dy := 0.0) -> void:
	if i < 0 or i >= objs.size() or text == "":
		return
	var l := UI.label(text, 18, color)
	l.add_theme_constant_override("outline_size", 6)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	l.position = objs[i].position + Vector2(-60, -Art.OBJ_H.get(objs[i].kind, 60) - 30 + dy)
	world.add_child(l)
	floats.append(l)
	var tw := l.create_tween()
	tw.tween_property(l, "position:y", l.position.y - 40, 1.4)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 1.4).set_delay(0.5)
	tw.tween_callback(func():
		floats.erase(l)
		l.queue_free())


func _process(dt: float) -> void:
	t += dt
	var dir := 0.0
	if can_move:
		dir = Input.get_axis("move_left", "move_right") + touch_dir
		dir = clampf(dir, -1, 1)
	if absf(dir) > 0.1:
		face = signf(dir)
		px = clampf(px + dir * SPEED * dt, 26, world_w - 26)
		walk += dt * 10
	else:
		walk = 0.0
	_update_view()
	_find_near(false)


func _update_view() -> void:
	cam = clampf(px - W / 2, 0, maxf(0, world_w - W))
	world.position.x = -cam
	var ratio := cam / (world_w - W) if world_w > W else 0.0
	backdrop.position.x = -ratio * (backdrop.size.x - W)
	player.position = Vector2(px, ground)
	player.face = face
	player.walk = walk
	player.tm = t
	player.queue_redraw()


func _find_near(force: bool) -> void:
	var best := -1
	var bd := NEAR_DIST
	for i in objs.size():
		if objs[i].gone:
			continue
		var d := absf(objs[i].position.x - px)
		if d < bd:
			bd = d
			best = i
	for i in objs.size():
		objs[i].is_near = i == best
	if best != near or force:
		near = best
		near_changed.emit(near)
