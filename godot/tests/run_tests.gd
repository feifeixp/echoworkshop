## 无界面测试：godot --headless --path godot --script res://tests/run_tests.gd
## 1) 核心规则的单元测试  2) 与网页版共用的一致性用例 ../tests/vectors/*.json
extends SceneTree

const StoryLib := preload("res://scripts/core/story.gd")
const Run := preload("res://scripts/core/run_engine.gd")
const SaveCodec := preload("res://scripts/core/save_codec.gd")

var passed := 0
var failed := 0
var current := ""


func _init() -> void:
	var repo := ProjectSettings.globalize_path("res://").path_join("..").simplify_path()
	test_story_sync(repo)
	test_validate()
	test_economy()
	test_save_roundtrip()
	test_vectors(repo)
	test_dialogue(repo)
	print("\n通过 %d，失败 %d" % [passed, failed])
	quit(1 if failed > 0 else 0)


func ok(cond: bool, msg: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		printerr("  ✗ %s：%s" % [current, msg])


func begin(name: String) -> void:
	current = name
	print("· " + name)


## 宽松的深比较：JSON 里的数字都是浮点数，与整数按数值比较。
func deq(a, b) -> bool:
	if (a is int or a is float) and (b is int or b is float):
		return is_equal_approx(float(a), float(b))
	if a is Array and b is Array:
		if a.size() != b.size(): return false
		for i in a.size():
			if not deq(a[i], b[i]): return false
		return true
	if a is Dictionary and b is Dictionary:
		if a.size() != b.size(): return false
		for k in a:
			if not b.has(k) or not deq(a[k], b[k]): return false
		return true
	return typeof(a) == typeof(b) and a == b


func sample() -> Dictionary:
	return StoryLib.load_file("res://data/stories/fog-town.json").story


# ---------- 单元测试 ----------

func test_story_sync(repo: String) -> void:
	begin("游戏内的剧情文件与 stories/ 下的一致")
	var a := FileAccess.get_file_as_string(repo.path_join("stories/fog-town.json"))
	var b := FileAccess.get_file_as_string("res://data/stories/fog-town.json")
	ok(a != "" and a == b, "godot/data/stories/fog-town.json 过期了，运行 npm run sync:godot")


func test_validate() -> void:
	begin("结构校验")
	ok(StoryLib.validate(null) == ["剧情数据必须是一个 JSON 对象"], "非对象")
	var raw = JSON.parse_string(FileAccess.get_file_as_string("res://data/stories/fog-town.json"))
	ok(StoryLib.validate(raw).is_empty(), "示例剧情应能读取")
	raw.start = "nowhere"
	raw.nodes.bell.type = "boss"
	var errs := StoryLib.validate(raw)
	ok(errs.any(func(e): return "起点「nowhere」" in e), "起点错误")
	ok(errs.any(func(e): return "boss" in e), "类型错误")
	raw.formatVersion = StoryLib.FORMAT_VERSION + 1
	ok("更新游戏" in StoryLib.validate(raw)[0], "拒绝更新的格式")


func test_economy() -> void:
	begin("道具数量与货币")
	var o := StoryLib.option_defaults()
	o.merge({"needItem": "candle", "needQty": 2, "useItem": true, "costMoney": 3, "gainItem": "key", "gainQty": 2, "gainMoney": 1}, true)
	var inv := {"candle": 1}
	ok(not StoryLib.can_take(o, inv, 5), "蜡烛不够")
	inv.candle = 3
	ok(not StoryLib.can_take(o, inv, 2), "钱不够")
	ok(StoryLib.can_take(o, inv, 3), "刚好够")
	var money := StoryLib.apply_opt(o, inv, 5)
	ok(money == 3 and inv.candle == 1 and inv.key == 2, "结算 %s %s" % [money, inv])


func test_save_roundtrip() -> void:
	begin("存档往返")
	var G := sample()
	var P := Run.new_progress(G, G.start)
	Run.start_run(G, P)
	Run.choose_option(G, P, 0)  # 去酒馆
	Run.choose_option(G, P, 1)  # 打工
	var data = JSON.parse_string(JSON.stringify(SaveCodec.serialize_run(G, P)))
	var r := SaveCodec.restore_run(G, data)
	ok(r.resumable, "应能继续")
	ok(r.P.node == "tavern" and int(r.P.money) == 5 and int(r.P.t) == int(P.t), "状态一致")
	G.revision += 1
	ok(not SaveCodec.restore_run(G, data).resumable, "剧情版本变了不能接着这一轮")
	ok(SaveCodec.restore_run(G, {"v": 99}).is_empty(), "无法识别的存档")


# ---------- 一致性用例 ----------

func test_vectors(repo: String) -> void:
	var dir := DirAccess.open(repo.path_join("tests/vectors"))
	if dir == null:
		begin("一致性用例")
		ok(false, "找不到 tests/vectors")
		return
	for file in dir.get_files():
		if file.ends_with(".json"):
			run_vector(repo, file)


func run_vector(repo: String, file: String) -> void:
	var vec = JSON.parse_string(FileAccess.get_file_as_string(repo.path_join("tests/vectors").path_join(file)))
	begin("一致性用例 %s" % file)
	var G: Dictionary = StoryLib.load_file(repo.path_join(vec.story)).story
	var P := {}
	var n := 0
	for st in vec.steps:
		n += 1
		var where := "第 %d 步" % n
		if st.has("start"):
			P = Run.new_progress(G, G.start)
			Run.start_run(G, P)
		elif st.has("next"):
			Run.start_run(G, P)
		elif st.has("choose"):
			var idx := -1
			var ops: Array = G.nodes[P.node].options
			for i in ops.size():
				if ops[i].text == st.choose: idx = i
			var r := Run.choose_option(G, P, idx)
			if st.has("fail"):
				ok(r.get("reason") == st.fail, "%s：应失败（%s），实际 %s" % [where, st.fail, r])
			else:
				ok(r.ok, "%s：选择「%s」失败（%s）" % [where, st.choose, r.get("reason")])
		elif st.has("believe"):
			var r := Run.believe_echo(G, P, int(st.believe))
			if st.has("fail"):
				ok(r.get("reason") == st.fail, "%s：应失败（%s），实际 %s" % [where, st.fail, r])
			else:
				ok(r.ok, "%s：相信残响失败（%s）" % [where, r.get("reason")])
		elif st.has("carve"):
			var ops: Array = G.nodes[P.lastChoice.node].options
			var target := -1
			for i in ops.size():
				if ops[i].text == st.carve: target = i
			var e := Run.carve_echo(G, P, target, st.kind, "")
			ok(not e.is_empty() and e.honest == st.honest, "%s：刻残响「%s」真假应为 %s" % [where, st.carve, st.honest])
		elif st.has("saveload"):
			var data = JSON.parse_string(JSON.stringify(SaveCodec.serialize_run(G, P)))
			var r := SaveCodec.restore_run(G, data)
			ok(r.get("resumable", false), "%s：存档无法继续" % where)
			P = r.P
		elif st.has("expect"):
			check(G, P, st.expect, where)
		else:
			ok(false, "%s：无法识别的步骤 %s" % [where, st])


func check(G: Dictionary, P: Dictionary, exp: Dictionary, where: String) -> void:
	var states := Run.option_states(G, P)
	var visible := []
	var locked := []
	for s in states:
		if not s.hidden and not s.used:
			visible.append(s.o.text)
			if s.locked: locked.append(s.o.text)
	var know: Array = P.know.keys(); know.sort()
	var run_clues: Array = P.runClues.keys(); run_clues.sort()
	var end_s = null
	if P.end != null:
		end_s = "true" if P.end.get("true", false) else ("bad" if P.end.type == "ending" else P.end.type)
	var actual := {
		"node": P.node, "end": end_s, "runs": P.runs, "money": P.money, "belief": P.belief, "t": P.t, "total": P.total,
		"items": P.items, "know": know, "runClues": run_clues, "visible": visible, "locked": locked,
		"newDeathClue": P.get("newDeathClue", ""), "history": P.history.map(func(h): return h.kind),
	}
	for k in exp:
		if not actual.has(k):
			ok(false, "%s：未知的字段 %s" % [where, k])
		else:
			ok(deq(actual[k], exp[k]), "%s：%s 应为 %s，实际 %s" % [where, k, exp[k], actual[k]])


func test_dialogue(repo: String) -> void:
	var vec = JSON.parse_string(FileAccess.get_file_as_string(repo.path_join("tests/vectors/dialogue/lines.json")))
	begin("一致性用例 dialogue/lines.json")
	ok(vec != null, "找不到 tests/vectors/dialogue/lines.json")
	if vec == null:
		return
	for i in vec.cases.size():
		var c: Dictionary = vec.cases[i]
		var got := StoryLib.dialogue_lines(c.text)
		ok(deq(got, c.lines), "第 %d 条 %s：得到 %s" % [i + 1, JSON.stringify(c.text), JSON.stringify(got)])
