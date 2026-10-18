## 程序化绘制：场景背景、物件、角色。与网页版 src/play/art.js、scene.js 的画法一致。
## 都是静态函数，传入要画在哪个 CanvasItem 上。
extends RefCounted

const UI := preload("res://scripts/ui/ui_kit.gd")


static func is_inside(n: Dictionary) -> bool:
	return RegEx.create_from_string("窖|墙|楼梯|告解|钟房|井|石门").search(str(n.title) + str(n.text)) != null


static func _vgrad(ci: CanvasItem, rect: Rect2, top: Color, bottom: Color) -> void:
	var p := PackedVector2Array([rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y)])
	ci.draw_polygon(p, PackedColorArray([top, top, bottom, bottom]))


static func _glow(ci: CanvasItem, center: Vector2, radius: float, color: Color) -> void:
	ci.draw_texture_rect(UI.glow(), Rect2(center - Vector2(radius, radius), Vector2(radius, radius) * 2.0), false, color)


## 场景背景。ground 是地面的 y 坐标（与网页版的 H*0.84 对应）。
static func paint_backdrop(ci: CanvasItem, n: Dictionary, id: String, W: float, H: float, ground: float) -> void:
	var R := RandomNumberGenerator.new()
	R.seed = hash(id + str(n.get("title", "")))
	var txt := str(n.get("title", "")) + str(n.get("text", ""))
	var dead: bool = n.get("type") == "death"
	var won: bool = n.get("type") == "ending" and n.get("ending") == "true"
	var inside := is_inside(n)
	var SH := ground / 0.84  # 网页版画布高度

	if dead:
		_vgrad(ci, Rect2(0, 0, W, H), Color("2a0a10"), Color("0a0709"))
	elif won:
		_vgrad(ci, Rect2(0, 0, W, H * 0.55), Color("4a3520"), Color("2a2a3a"))
		_vgrad(ci, Rect2(0, H * 0.55, W, H * 0.45), Color("2a2a3a"), Color("141a26"))
	elif inside:
		_vgrad(ci, Rect2(0, 0, W, H), Color("0c0f16"), Color("16141a"))
	else:
		_vgrad(ci, Rect2(0, 0, W, SH * 0.7), Color("0b1220"), Color("1a2436"))
		_vgrad(ci, Rect2(0, SH * 0.7, W, H - SH * 0.7), Color("1a2436"), Color("232c3d"))

	if not inside:
		for i in 110:
			ci.draw_rect(Rect2(R.randf() * W, R.randf() * SH * 0.5, 1, 1), Color(0.9, 0.88, 0.82, R.randf() * 0.5))
		var mx := W * (0.6 + R.randf() * 0.28)
		var my := SH * 0.18
		var mr := 26.0 if dead else 22.0
		_glow(ci, Vector2(mx, my), mr * 5, Color(0.79, 0.27, 0.31, 0.35) if dead else (Color(0.94, 0.78, 0.49, 0.5) if won else Color(0.86, 0.89, 0.94, 0.25)))
		ci.draw_circle(Vector2(mx, my), mr, Color("d75a64") if dead else (Color("f6d494") if won else Color("e7e4da")))
		var far := Color("121928")
		var near := Color("0b070c") if dead else Color("0a0d14")
		_skyline(ci, R, W, H, SH * 0.7, far, 30, 90, false, won)
		if RegEx.create_from_string("钟|楼|塔").search(txt):
			var tx := W * (0.15 + R.randf() * 0.3)
			var tw := 46.0
			var th := SH * 0.6
			ci.draw_rect(Rect2(tx, ground - th, tw, H), near)
			ci.draw_colored_polygon(PackedVector2Array([Vector2(tx - 6, ground - th), Vector2(tx + tw / 2, ground - th - 52), Vector2(tx + tw + 6, ground - th)]), near)
			ci.draw_circle(Vector2(tx + tw / 2, ground - th + 26), 11, Color(0.79, 0.27, 0.31, 0.8) if dead else Color(0.85, 0.65, 0.33, 0.75))
		if RegEx.create_from_string("教堂|神父|祷告").search(txt):
			var cx := W * (0.62 + R.randf() * 0.15)
			var cw := 96.0
			var ch := SH * 0.42
			ci.draw_rect(Rect2(cx, ground - ch, cw, H), near)
			ci.draw_colored_polygon(PackedVector2Array([Vector2(cx - 8, ground - ch), Vector2(cx + cw / 2, ground - ch - 40), Vector2(cx + cw + 8, ground - ch)]), near)
			ci.draw_rect(Rect2(cx + cw / 2 - 2, ground - ch - 70, 4, 32), near)
			ci.draw_rect(Rect2(cx + cw / 2 - 11, ground - ch - 60, 22, 4), near)
			ci.draw_circle(Vector2(cx + cw / 2, ground - ch + 30), 12, Color(0.85, 0.65, 0.33, 0.6))
			ci.draw_rect(Rect2(cx + cw / 2 - 12, ground - ch + 30, 24, 20), Color(0.85, 0.65, 0.33, 0.6))
		_skyline(ci, R, W, H, ground, near, 30, 90, true, won)
	else:
		var row := 0
		while row * 22 < H:
			var col := -1
			while col * 46 < W:
				var off := 23 if row % 2 == 1 else 0
				ci.draw_rect(Rect2(col * 46 + off + 1, row * 22 + 1, 44, 20), Color((38 + R.randf() * 14) / 255.0, (34 + R.randf() * 12) / 255.0, (42 + R.randf() * 12) / 255.0, 0.95))
				col += 1
			row += 1
		var arches := maxi(3, roundi(W / 260.0))
		for i in arches:
			var ax := W * (i + 0.5) / arches
			var aw := minf(120.0, W / 5.0)
			var top := ground - SH * 0.6 + aw / 2
			ci.draw_rect(Rect2(ax - aw / 2, top, aw, H - top), Color("07080c"))
			ci.draw_circle(Vector2(ax, top), aw / 2, Color("07080c"))
		if RegEx.create_from_string("名字|墙").search(txt):
			for i in 90:
				var px := R.randf() * W
				var py := R.randf() * SH * 0.7
				ci.draw_line(Vector2(px, py), Vector2(px + 6 + R.randf() * 18, py), Color(0.91, 0.88, 0.81, 0.2), 1.0)
		_glow(ci, Vector2(W * 0.5, ground), SH * 0.9, Color(0.79, 0.27, 0.31, 0.3) if dead else Color(0.85, 0.65, 0.33, 0.18))
	_vgrad(ci, Rect2(0, SH * 0.55, W, H - SH * 0.55), Color(0.56, 0.64, 0.72, 0), Color(0.31, 0.08, 0.11, 0.5) if dead else Color(0.56, 0.64, 0.72, 0.22))


static func _skyline(ci: CanvasItem, R: RandomNumberGenerator, W: float, H: float, base: float, col: Color, hmin: float, hmax: float, lit: bool, won: bool) -> void:
	var px := -10.0
	while px < W + 10:
		var w := 26 + R.randf() * 48
		var h := hmin + R.randf() * (hmax - hmin)
		ci.draw_rect(Rect2(px, base - h, w, H), col)
		ci.draw_colored_polygon(PackedVector2Array([Vector2(px - 3, base - h), Vector2(px + w / 2, base - h - 10 - R.randf() * 18), Vector2(px + w + 3, base - h)]), col)
		if lit:
			for k in 2:
				if R.randf() < 0.45:
					ci.draw_rect(Rect2(px + 5 + R.randf() * (w - 12), base - h + 8 + R.randf() * (h - 16), 4, 6), Color(0.94, 0.78, 0.49, 0.9) if won else Color(0.85, 0.65, 0.33, 0.8))
		px += w + R.randf() * 6


## 地面：铺在 [0, width] 范围。
static func paint_ground(ci: CanvasItem, width: float, H: float, ground: float, inside: bool) -> void:
	_vgrad(ci, Rect2(0, ground, width, H - ground), Color("1a1719") if inside else Color("10131b"), Color("050608"))
	ci.draw_line(Vector2(0, ground + 0.5), Vector2(width, ground + 0.5), Color(0.56, 0.64, 0.72, 0.22), 1.0)
	for row in 4:
		var y := ground + 8 + row * row * 5 + row * 6
		var step := 30 + row * 10
		ci.draw_line(Vector2(0, y), Vector2(width, y), Color(1, 1, 1, 0.035), 1.0)
		var k := 0
		while k * step < width + step:
			var xx := k * step + (step / 2 if row % 2 == 1 else 0)
			ci.draw_line(Vector2(xx, y), Vector2(xx - 3, y + 6 + row * 3), Color(1, 1, 1, 0.035), 1.0)
			k += 1


## 物件。kind：door / person / item / sign / orb / ghost（看不懂的雾）。坐标以物件脚下为原点。
static func paint_object(ci: CanvasItem, kind: String, near: bool, locked: bool, t: float, phase: float) -> void:
	var edge := Color("f0c77e") if near else Color("5b4a30")
	if near and kind != "ghost":
		_glow(ci, Vector2(0, -10), 80, Color(0.94, 0.78, 0.49, 0.35))
	match kind:
		"door":
			var w := 54.0
			var h := 96.0
			_arch(ci, w + 12, h + 6, Color("1c1a1c"))
			_arch(ci, w, h, Color("24180f"))
			_arch_outline(ci, w, h, edge, 2.5)
			for p in [-1, 0, 1]:
				ci.draw_line(Vector2(p * 13, 0), Vector2(p * 13, -h + 20), Color(0, 0, 0, 0.45), 1.5)
			ci.draw_rect(Rect2(-w / 2 + 3, -3, w - 6, 3), Color(0.94, 0.7, 0.35, 0.55))
			ci.draw_circle(Vector2(16, -h * 0.45), 3, Color("d9a653"))
			if locked:
				ci.draw_rect(Rect2(-8, -h * 0.42, 16, 13), Color("8a6b35"))
				ci.draw_arc(Vector2(0, -h * 0.42), 6, PI, TAU, 12, Color("8a6b35"), 2.5)
		"person":
			var b := sin(t * 1.6 + phase) * 1.2
			var body := PackedVector2Array([Vector2(-18, 0), Vector2(-13, -50 + b), Vector2(0, -55 + b), Vector2(13, -50 + b), Vector2(18, 0)])
			ci.draw_colored_polygon(body, Color("06080d"))
			ci.draw_circle(Vector2(0, -62 + b), 10, Color("06080d"))
			var rim := Color("f0c77e") if near else Color(0.56, 0.64, 0.72, 0.45)
			ci.draw_arc(Vector2(0, -62 + b), 10, PI * 1.1, PI * 1.9, 10, rim, 1.4)
			ci.draw_line(Vector2(13, -50 + b), Vector2(18, 0), rim, 1.4)
		"item":
			ci.draw_rect(Rect2(-24, -26, 48, 5), Color("20180f"))
			ci.draw_rect(Rect2(-20, -21, 4, 21), Color("20180f"))
			ci.draw_rect(Rect2(16, -21, 4, 21), Color("20180f"))
			var pulse := 0.75 + sin(t * 3 + phase) * 0.25
			_glow(ci, Vector2(0, -36), 28, Color(0.94, 0.78, 0.49, 0.55 * pulse))
			ci.draw_circle(Vector2(0, -34), 5, Color("f0c77e"))
			if locked:
				ci.draw_rect(Rect2(-26, -60, 52, 60), Color(0.05, 0.06, 0.09, 0.6))
		"sign":
			ci.draw_rect(Rect2(-3, -76, 6, 76), Color("2a2118"))
			var board := PackedVector2Array([Vector2(-30, -70), Vector2(22, -70), Vector2(34, -61), Vector2(22, -52), Vector2(-30, -52)])
			ci.draw_colored_polygon(board, Color("3a2c1c"))
			var outline := board.duplicate(); outline.append(board[0])
			ci.draw_polyline(outline, edge, 2.0)
			ci.draw_line(Vector2(-24, -61), Vector2(18, -61), Color(0, 0, 0, 0.35), 1.0)
		"orb":
			var y := -56 + sin(t * 2 + phase) * 6
			_glow(ci, Vector2(0, y), 32, Color(0.56, 0.68, 0.92, 0.7))
			ci.draw_circle(Vector2(0, y), 5, Color("dfe9ff"))
		_:
			for q in 5:
				var a := t * 0.6 + q * 1.3
				ci.draw_circle(Vector2(cos(a) * 14, -40 + sin(a * 1.3) * 10), 16 + q * 2, Color(0.62, 0.7, 0.78, 0.07))
			ci.draw_string(UI.body_font(), Vector2(-10, -32), "？", HORIZONTAL_ALIGNMENT_CENTER, 20, 22, Color(0.62, 0.7, 0.78, 0.4))


static func _arch_points(w: float, h: float) -> PackedVector2Array:
	var pts := PackedVector2Array([Vector2(-w / 2, 0), Vector2(-w / 2, -h + w / 2)])
	for i in range(1, 16):
		var a := PI + PI * i / 16.0
		pts.append(Vector2(cos(a) * w / 2, -h + w / 2 + sin(a) * w / 2))
	pts.append(Vector2(w / 2, -h + w / 2))
	pts.append(Vector2(w / 2, 0))
	return pts


static func _arch(ci: CanvasItem, w: float, h: float, col: Color) -> void:
	ci.draw_colored_polygon(_arch_points(w, h), col)


static func _arch_outline(ci: CanvasItem, w: float, h: float, col: Color, width: float) -> void:
	ci.draw_polyline(_arch_points(w, h), col, width)


## 物件的大致高度，用来把提示气泡放在物件上方。
const OBJ_H := {"door": 96, "person": 74, "item": 44, "sign": 76, "orb": 80, "ghost": 64}


## 玩家角色：提灯的旅人。face 为 1 朝右、-1 朝左；walk 为走路的相位（0 表示站着）。
static func paint_player(ci: CanvasItem, face: float, walk: float, t: float) -> void:
	_glow(ci, Vector2(face * 20, -38), 170, Color(0.94, 0.7, 0.35, 0.22))
	ci.draw_set_transform(Vector2.ZERO, 0, Vector2(face, 1))
	var sw := sin(walk) * 7
	var bob := absf(cos(walk)) * 1.5 if walk != 0.0 else sin(t * 2) * 0.6
	ci.draw_set_transform(Vector2.ZERO, 0, Vector2(face, 0.22))
	ci.draw_circle(Vector2.ZERO, 18, Color(0, 0, 0, 0.5))
	ci.draw_set_transform(Vector2.ZERO, 0, Vector2(face, 1))
	ci.draw_line(Vector2(-3, -26), Vector2(-3 + sw, -2), Color("0a0c12"), 6)
	ci.draw_line(Vector2(4, -26), Vector2(4 - sw, -2), Color("0a0c12"), 6)
	ci.draw_set_transform(Vector2(0, -bob), 0, Vector2(face, 1))
	ci.draw_colored_polygon(PackedVector2Array([Vector2(-14, -20), Vector2(-10, -56), Vector2(10, -56), Vector2(15, -20)]), Color("1d2433"))
	ci.draw_line(Vector2(10, -56), Vector2(15, -20), Color(0.94, 0.78, 0.49, 0.45), 1.3)
	ci.draw_rect(Rect2(-9, -59, 18, 4), Color("8a2f36"))
	ci.draw_circle(Vector2(0, -67), 9, Color("161b26"))
	ci.draw_set_transform(Vector2(0, -73 - bob), 0, Vector2(face, 0.22))
	ci.draw_circle(Vector2.ZERO, 14, Color("0d1018"))
	ci.draw_set_transform(Vector2(0, -bob), 0, Vector2(face, 1))
	ci.draw_rect(Rect2(-8, -86, 16, 13), Color("0d1018"))
	ci.draw_arc(Vector2(0, -67), 9, -0.9, 0.6, 8, Color(0.94, 0.78, 0.49, 0.5), 1.3)
	ci.draw_line(Vector2(6, -50), Vector2(18, -40), Color("1d2433"), 5)
	var fl := 0.85 + sin(t * 9) * 0.1
	ci.draw_rect(Rect2(15, -44, 10, 3), Color("3a2c1c"))
	ci.draw_rect(Rect2(16, -41, 8, 11), Color(0.94, 0.78, 0.49, fl))
	ci.draw_rect(Rect2(15, -30, 10, 2), Color("3a2c1c"))
	ci.draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
