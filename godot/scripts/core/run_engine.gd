## 轮回引擎：一局游戏的全部规则，与界面无关。
## 对应网页版 src/core/run.js，规则见 docs/MECHANICS.md，两边都要通过 tests/vectors/ 的一致性用例。
##
## 轮回状态 P 是一个字典（字段名与网页版相同）：
##   跨轮：know {线索:true}、runs、total、history [..]、startAt
##   本轮：node、path [..]、t、items {道具:数量}、money、used {"节点:序号":true}、runClues {线索:true}、
##         belief、believed {节点: {残响序号:true}}、blog [..]、end（null 或 {type, true}）、lastChoice、newDeathClue
extends RefCounted

const StoryLib := preload("res://scripts/core/story.gd")

const BELIEF_PER_RUN := 2
const ACTION_TIME := 6
const LOOKS := {"door": "门", "person": "人物", "item": "物品", "sign": "路标 / 去往别处", "orb": "光点"}


static func new_progress(G: Dictionary, start_at: String) -> Dictionary:
	return {"know": {}, "runs": 0, "total": 0, "history": [], "startAt": start_at if G.nodes.has(start_at) else G.start}


## 开始新的一轮：本轮状态全部重置，跨轮记忆保留，然后进入起点。
static func start_run(G: Dictionary, P: Dictionary) -> void:
	P.runs = int(P.runs) + 1
	P.used = {}
	P.items = {}
	P.money = int(G.startMoney)
	P.runClues = {}
	P.belief = BELIEF_PER_RUN
	P.believed = {}
	P.blog = []
	P.t = 0
	P.path = []
	P.end = null
	P.lastChoice = null
	P.newDeathClue = ""
	enter_node(G, P, P.startAt if G.nodes.has(P.startAt) else G.start)


static func knows(P: Dictionary, c: String) -> bool:
	return P.know.has(c) or P.runClues.has(c)


## 进入一个节点。死亡和结局会结束这一轮：本轮学到的线索变成跨轮记忆。
static func enter_node(G: Dictionary, P: Dictionary, id: String) -> void:
	P.node = id
	var n = G.nodes.get(id)
	if n == null:
		P.end = {"type": "lost", "true": false}
		return
	P.t = int(P.t) + int(n.time)
	P.path.append(id)
	if n.type != "death" and n.type != "ending":
		return
	P.newDeathClue = ""
	if n.type == "death" and n.deathClue != "":
		if not knows(P, n.deathClue):
			P.newDeathClue = n.deathClue
		P.runClues[n.deathClue] = true
	for c in P.runClues:
		P.know[c] = true
	P.total = int(P.total) + int(P.t)
	var win: bool = n.type == "ending" and n.ending == "true"
	P.end = {"type": n.type, "true": win}
	P.history.append({"run": P.runs, "title": n.title, "kind": "死亡" if n.type == "death" else ("真结局" if win else "坏结局"), "t": P.t})


## 当前场景每个选项的状态：hidden 看不到 / used 本轮已用 / locked 条件不够。
static func option_states(G: Dictionary, P: Dictionary) -> Array:
	var n = G.nodes.get(P.node)
	if n == null or P.end != null:
		return []
	var out := []
	for i in n.options.size():
		var o: Dictionary = n.options[i]
		out.append({
			"i": i, "o": o,
			"hidden": o.needClue != "" and not knows(P, o.needClue),
			"used": o.once and P.used.has("%s:%d" % [P.node, i]),
			"locked": not StoryLib.can_take(o, P.items, int(P.money)),
		})
	return out


## 执行当前场景的第 i 个选项。失败返回 {ok:false, reason}；成功返回 {ok:true, stay, gained, spent}。
static func choose_option(G: Dictionary, P: Dictionary, i: int) -> Dictionary:
	if P.end != null:
		return {"ok": false, "reason": "ended"}
	var n = G.nodes.get(P.node)
	if n == null or i < 0 or i >= n.options.size():
		return {"ok": false, "reason": "missing"}
	var o: Dictionary = n.options[i]
	var key := "%s:%d" % [P.node, i]
	if o.needClue != "" and not knows(P, o.needClue):
		return {"ok": false, "reason": "hidden"}
	if o.once and P.used.has(key):
		return {"ok": false, "reason": "used"}
	if not StoryLib.can_take(o, P.items, int(P.money)):
		return {"ok": false, "reason": "locked"}

	if o.once:
		P.used[key] = true
	P.money = StoryLib.apply_opt(o, P.items, int(P.money))
	if o.gainClue != "":
		P.runClues[o.gainClue] = true
	P.lastChoice = {"node": P.node, "idx": i}
	var result := {
		"ok": true,
		"stay": o.goto == P.node,
		"gained": {"money": int(o.gainMoney), "item": o.gainItem, "qty": int(o.gainQty) if o.gainItem != "" else 0, "clue": o.gainClue},
		"spent": {"money": int(o.costMoney), "item": o.needItem if o.useItem else "", "qty": int(o.needQty) if (o.needItem != "" and o.useItem) else 0},
	}
	if result.stay:
		P.t = int(P.t) + ACTION_TIME + int(n.time)
	else:
		P.t = int(P.t) + ACTION_TIME
		enter_node(G, P, o.goto)
	return result


## 相信当前场景的第 k 条残响：花一点信念；残响带线索时本轮得知。
static func believe_echo(G: Dictionary, P: Dictionary, k: int) -> Dictionary:
	var n = G.nodes.get(P.node)
	if P.end != null or n == null or k < 0 or k >= n.echoes.size():
		return {"ok": false, "reason": "missing"}
	if not P.believed.has(P.node):
		P.believed[P.node] = {}
	var bset: Dictionary = P.believed[P.node]
	if bset.has(k):
		return {"ok": false, "reason": "already"}
	if int(P.belief) <= 0:
		return {"ok": false, "reason": "no-belief"}
	var e: Dictionary = n.echoes[k]
	bset[k] = true
	P.belief = int(P.belief) - 1
	P.blog.append({"text": e.text, "honest": e.honest})
	if e.teach != "":
		P.runClues[e.teach] = true
	return {"ok": true, "clue": e.teach}


## 相信过的残响对选项 i 的态度："go" 推荐、"avoid" 警告、"" 没有。推荐优先。
static func echo_stance(G: Dictionary, P: Dictionary, i: int) -> String:
	var n = G.nodes.get(P.node)
	if n == null or not P.believed.has(P.node):
		return ""
	var m := ""
	for k in P.believed[P.node]:
		var e: Dictionary = n.echoes[int(k)]
		if int(e.target) == i:
			m = "go" if (m == "go" or e.kind != "avoid") else "avoid"
	return m


## 一轮失败后，在最后做选择的场景刻下一句残响。返回新残响；不能刻时返回 {}。
static func carve_echo(G: Dictionary, P: Dictionary, target: int, kind: String, text: String) -> Dictionary:
	var lc = P.lastChoice
	if lc == null or P.end == null or P.end.get("true", false):
		return {}
	var n = G.nodes.get(lc.node)
	if n == null or target < 0 or target >= n.options.size():
		return {}
	var o: Dictionary = n.options[target]
	var t := text.strip_edges()
	if t == "":
		t = ("别「%s」" % o.text) if kind == "avoid" else ("「%s」就对了" % o.text)
	var e := {"id": StoryLib.new_echo_id(), "text": t, "target": target, "kind": kind,
		"honest": StoryLib.is_honest(G, o, kind), "teach": "", "by": "play", "likes": 0}
	n.echoes.append(e)
	return e


# ---------- 场景物件 ----------

## 按"所属物件"分组。返回 [{key, name, idx:[选项序号...]}]。
static func group_options(G: Dictionary, node_id: String) -> Array:
	var n = G.nodes.get(node_id)
	var order := []
	var groups := {}
	if n == null:
		return order
	for i in n.options.size():
		var name: String = str(n.options[i].obj).strip_edges()
		var key := name if name != "" else "#%d" % i
		if not groups.has(key):
			groups[key] = {"key": key, "name": name, "idx": []}
			order.append(groups[key])
		groups[key].idx.append(i)
	return order


static func _has(pattern: String, text: String) -> bool:
	return RegEx.create_from_string(pattern).search(text) != null


## 由选项文字推测物件外观。
static func looks_of_text(text: String) -> String:
	if _has("门|开锁|撞", text): return "door"
	if _has("蜡烛|钥匙|书|点燃|拿|要一|钟绳|喝一杯", text): return "item"
	if _has("神父|醉汉|老板|修女|她|叫出|求", text): return "person"
	if _has("去|前往|绕|离开|走|上去|冲|等|前进|深处|奔", text): return "sign"
	if _has("说|听|“|”|问", text): return "person"
	return "orb"


## 物件外观：选项里写了就用，否则由物件名、再由第一个选项的文字推测。
static func object_kind(G: Dictionary, node_id: String, group: Dictionary) -> String:
	var ops: Array = G.nodes[node_id].options
	for i in group.idx:
		if LOOKS.has(str(ops[i].look)):
			return ops[i].look
	var name: String = group.name
	if name != "":
		if _has("门", name): return "door"
		if _has("人|老板|醉汉|神父|修女|守夜|她|他|婆|翁|商|孩|夫", name): return "person"
		if _has("路|口|楼梯|小径|巷|阶", name): return "sign"
		if _has("书|桌|柜|箱|墙|井|蜡烛|钥匙|台|名字", name): return "item"
	return looks_of_text(ops[group.idx[0]].text)


## 物件在场景中的横向位置（0–1）。
static func object_slot(G: Dictionary, node_id: String, group: Dictionary, gi: int, count: int) -> float:
	var ops: Array = G.nodes[node_id].options
	for i in group.idx:
		var p = ops[i].pos
		if p is float or p is int:
			return clampf(float(p), 3.0, 97.0) / 100.0
	return 0.24 + 0.68 * (0.5 if count < 2 else float(gi) / float(count - 1))
