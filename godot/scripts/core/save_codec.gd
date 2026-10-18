## 轮回存档：轮回状态 ⇄ 可存成 JSON 的字典。格式与网页版 src/core/save.js 相同。
extends RefCounted

const RUN_SAVE_VERSION := 1


static func _keys(d: Dictionary) -> Array:
	return d.keys()


static func _set_of(arr, ok: Callable = Callable()) -> Dictionary:
	var out := {}
	if arr is Array:
		for v in arr:
			if not ok.is_valid() or ok.call(v):
				out[v] = true
	return out


static func serialize_run(G: Dictionary, P: Dictionary) -> Dictionary:
	var believed := {}
	for node in P.get("believed", {}):
		believed[node] = P.believed[node].keys()
	var items := []
	for k in P.get("items", {}):
		items.append([k, P.items[k]])
	return {
		"v": RUN_SAVE_VERSION, "storyId": G.id, "revision": G.revision,
		"savedAt": int(Time.get_unix_time_from_system() * 1000),
		"know": _keys(P.know), "runs": P.runs, "total": P.total, "history": P.history, "startAt": P.startAt,
		"node": P.node, "path": P.path, "t": P.t, "items": items, "money": P.money,
		"used": _keys(P.used), "runClues": _keys(P.runClues), "belief": P.belief, "believed": believed,
		"blog": P.get("blog", []), "end": P.get("end"), "lastChoice": P.get("lastChoice"),
		"newDeathClue": P.get("newDeathClue", ""),
	}


static func _num(v, d := 0.0) -> float:
	return float(v) if (v is int or v is float) else d


## 从存档恢复。返回 {P, resumable}；无法识别的存档返回 {}。
## 剧情版本变了或所在节点不存在时 resumable 为 false：保留跨轮记忆，调用方开始新的一轮。
static func restore_run(G: Dictionary, data) -> Dictionary:
	if not (data is Dictionary) or int(_num(data.get("v"))) != RUN_SAVE_VERSION:
		return {}
	var clue_ok := func(c): return G.clues.has(c)
	var P := {
		"know": _set_of(data.get("know"), clue_ok),
		"runs": maxi(0, int(_num(data.get("runs")))),
		"total": int(_num(data.get("total"))),
		"history": (data.get("history") if data.get("history") is Array else []).filter(func(h): return h is Dictionary),
		"startAt": data.startAt if G.nodes.has(str(data.get("startAt", ""))) else G.start,
	}
	var path = data.get("path")
	var same: bool = str(data.get("storyId", "")) == G.id and int(_num(data.get("revision"))) == int(G.revision)
	var resumable: bool = same and G.nodes.has(str(data.get("node", ""))) and path is Array and path.size() > 0 and P.runs > 0
	if not resumable:
		return {"P": P, "resumable": false}

	var items := {}
	if data.get("items") is Array:
		for e in data.items:
			if e is Array and e.size() == 2 and G.items.has(e[0]) and _num(e[1]) > 0:
				items[e[0]] = int(e[1])
	var believed := {}
	if data.get("believed") is Dictionary:
		for node in data.believed:
			var s := {}
			for k in data.believed[node]:
				s[int(k)] = true
			believed[node] = s
	var lc = data.get("lastChoice")
	if lc is Dictionary and G.nodes.has(str(lc.get("node", ""))):
		lc = {"node": lc.node, "idx": int(lc.idx)}
	else:
		lc = null
	P.merge({
		"node": data.node,
		"path": path.filter(func(id): return G.nodes.has(id)),
		"t": int(_num(data.get("t"))),
		"items": items,
		"money": maxi(0, int(_num(data.get("money")))),
		"used": _set_of(data.get("used")),
		"runClues": _set_of(data.get("runClues"), clue_ok),
		"belief": clampi(int(_num(data.get("belief"), 2)), 0, 2),
		"believed": believed,
		"blog": data.get("blog") if data.get("blog") is Array else [],
		"end": data.get("end") if data.get("end") is Dictionary else null,
		"lastChoice": lc,
		"newDeathClue": data.get("newDeathClue", "") if G.clues.has(data.get("newDeathClue", "")) else "",
	})
	return {"P": P, "resumable": true}


## 给标题画面用的存档摘要。
static func describe_run(G: Dictionary, data) -> Dictionary:
	if not (data is Dictionary) or int(_num(data.get("v"))) != RUN_SAVE_VERSION:
		return {}
	var node = G.nodes.get(str(data.get("node", "")))
	var clues := 0
	if data.get("know") is Array:
		for c in data.know:
			if G.clues.has(c): clues += 1
	return {
		"runs": maxi(1, int(_num(data.get("runs"), 1))),
		"place": node.title if node != null else "",
		"clues": clues,
		"ended": data.get("end") != null,
	}
