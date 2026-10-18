## 剧情数据模型：结构校验、归一化，以及货币与道具规则。
## 对应网页版 src/core/story.js，规则见 docs/MECHANICS.md。
## 只有静态函数，用 preload 引用：const StoryLib = preload("res://scripts/core/story.gd")
extends RefCounted

const FORMAT_VERSION := 1
const TYPES := {"story": "剧情", "choice": "抉择", "check": "检定", "rest": "休憩", "death": "死亡", "ending": "结局"}
## 搜索和模拟里的上限（与网页版一致）
const MONEY_CAP := 30
const QTY_CAP := 6

## 旧数据里没有点赞数的预设残响，用这里的初始值
const SEED_LIKES := {
	"神父就是凶手，当面揭穿他": 23, "钟楼里的人不是神父": 8, "守夜人收钱就放行": 5,
	"从后面走，多带几支蜡烛": 14, "门是朽木做的，撞开它": 31, "别浪费蜡烛，摸黑也能走": 19,
	"钟一响就冲，别犹豫": 12, "第一声是骗人的": 6, "抢过钟绳就结束了": 27,
}


static func option_defaults() -> Dictionary:
	return {
		"text": "", "goto": "",
		"obj": "", "look": "", "pos": "", "once": false,
		"needItem": "", "needQty": 1, "useItem": false, "costMoney": 0,
		"needClue": "", "hintClue": "",
		"gainItem": "", "gainQty": 1, "gainMoney": 0, "gainClue": "",
	}


static func new_echo_id() -> String:
	const CHARS := "abcdefghijklmnopqrstuvwxyz0123456789"
	var s := "e"
	for i in 7:
		s += CHARS[randi() % CHARS.length()]
	return s


static func _num(v, d := 0) -> float:
	if v is int or v is float:
		return float(v)
	if v is String and v.is_valid_float():
		return v.to_float()
	return float(d)


static func _non_neg(v) -> int:
	return maxi(0, int(_num(v)))


static func _at_least_1(v) -> int:
	var n := int(_num(v, 1))
	return n if n >= 1 else 1


## 检查一份原始剧情数据能否被游戏读取。返回中文错误列表，空数组表示可以读取。
static func validate(raw) -> Array:
	var errs := []
	if not (raw is Dictionary):
		return ["剧情数据必须是一个 JSON 对象"]
	if _num(raw.get("formatVersion", 0)) > FORMAT_VERSION:
		errs.append("剧情格式版本 %d 比游戏支持的 %d 更新，请更新游戏" % [int(raw.formatVersion), FORMAT_VERSION])
	var nodes = raw.get("nodes")
	if not (nodes is Dictionary):
		errs.append("缺少 nodes（节点表）")
		return errs
	if nodes.is_empty():
		errs.append("节点表是空的")
	var start = raw.get("start")
	if not (start is String) or not nodes.has(start):
		errs.append("起点「%s」不在节点表里" % (str(start) if start != null else "未设置"))
	for id in nodes:
		var n = nodes[id]
		if not (n is Dictionary):
			errs.append("节点 %s 不是对象" % id)
			continue
		var t = n.get("type", "")
		if t != "" and not TYPES.has(t):
			errs.append("节点 %s 的类型「%s」无法识别" % [id, t])
		var ops = n.get("options")
		if ops != null and not (ops is Array):
			errs.append("节点 %s 的 options 必须是数组" % id)
			ops = []
		if n.get("echoes") != null and not (n.echoes is Array):
			errs.append("节点 %s 的 echoes 必须是数组" % id)
		if ops is Array:
			for i in ops.size():
				var o = ops[i]
				if not (o is Dictionary) or not (o.get("goto") is String):
					errs.append("节点 %s 的第 %d 个选项缺少 goto" % [id, i + 1])
	return errs


## 补全缺失字段、修正类型、迁移旧数据。会修改并返回传入的字典。
static func normalize(g: Dictionary) -> Dictionary:
	g.formatVersion = int(_num(g.get("formatVersion", 0))) if _num(g.get("formatVersion", 0)) > 0 else FORMAT_VERSION
	g.id = str(g.get("id", "")) if str(g.get("id", "")) != "" else "story"
	g.revision = int(_num(g.get("revision", 1), 1)) if _num(g.get("revision", 1), 1) > 0 else 1
	if not (g.get("items") is Dictionary): g.items = {}
	if not (g.get("clues") is Dictionary): g.clues = {}
	if not (g.get("nodes") is Dictionary): g.nodes = {}
	g.currency = str(g.get("currency", "")) if str(g.get("currency", "")) != "" else "铜币"
	g.startMoney = _non_neg(g.get("startMoney", 0))
	for id in g.nodes:
		var n: Dictionary = g.nodes[id]
		var ops := []
		for o in n.get("options", []):
			# 迁移：早期示例里喷泉不是一次性的
			if not o.has("once") and o.get("text") == "在喷泉底摸硬币":
				o.once = true
				if str(o.get("obj", "")) == "": o.obj = "喷泉"
			var q := option_defaults()
			q.merge(o, true)
			q.needQty = _at_least_1(q.needQty)
			q.gainQty = _at_least_1(q.gainQty)
			q.costMoney = _non_neg(q.costMoney)
			q.gainMoney = _non_neg(q.gainMoney)
			q.useItem = bool(q.useItem)
			q.once = bool(q.once)
			if q.pos is float or q.pos is int: q.pos = _num(q.pos)
			ops.append(q)
		n.options = ops
		var echoes := []
		for e in n.get("echoes", []):
			var q := {"text": "", "target": -1, "honest": true, "kind": "go", "teach": "", "by": "preset"}
			q.merge(e, true)
			q.target = int(_num(q.target, -1))
			q.likes = SEED_LIKES.get(q.text, 0) if e.get("likes") == null else _non_neg(e.likes)
			if str(q.get("id", "")) == "": q.id = new_echo_id()
			echoes.append(q)
		n.echoes = echoes
		n.time = int(_num(n.get("time", 0))) if _num(n.get("time", 0)) != 0 else 30
		if n.get("deathClue") == null: n.deathClue = ""
		if n.get("ending") == null: n.ending = ""
		if n.get("title") == null: n.title = ""
		if n.get("text") == null: n.text = ""
		if n.get("type") == null: n.type = "story"
	return g


## 校验并归一化。返回 {ok, story, errors}。
static func parse(raw) -> Dictionary:
	var errs := validate(raw)
	if not errs.is_empty():
		return {"ok": false, "story": null, "errors": errs}
	return {"ok": true, "story": normalize(raw.duplicate(true)), "errors": []}


## 读取剧情 JSON 文件（res:// 或绝对路径）。
static func load_file(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {"ok": false, "story": null, "errors": ["无法读取剧情文件 %s" % path]}
	var raw = JSON.parse_string(f.get_as_text())
	if raw == null:
		return {"ok": false, "story": null, "errors": ["剧情文件 %s 不是有效的 JSON" % path]}
	return parse(raw)


# ---------- 货币与可叠加道具 ----------

static func qty_of(inv: Dictionary, k: String) -> int:
	return int(inv.get(k, 0))


## 背包和钱够不够执行这个选项（不含知识锁和一次性判断）
static func can_take(o: Dictionary, inv: Dictionary, money: int) -> bool:
	if o.needItem != "" and qty_of(inv, o.needItem) < int(o.needQty):
		return false
	if int(o.costMoney) > money:
		return false
	return true


## 执行选项对背包的影响。会修改 inv，返回新的货币数量。
static func apply_opt(o: Dictionary, inv: Dictionary, money: int) -> int:
	if o.needItem != "" and o.useItem:
		var left := qty_of(inv, o.needItem) - int(o.needQty)
		if left > 0:
			inv[o.needItem] = left
		else:
			inv.erase(o.needItem)
	money -= int(o.costMoney)
	if o.gainItem != "":
		inv[o.gainItem] = qty_of(inv, o.gainItem) + int(o.gainQty)
	return money + int(o.gainMoney)


## 玩家留下的残响是真是假：由它说的话和那个选项的实际后果决定。
static func is_honest(G: Dictionary, o: Dictionary, kind: String) -> bool:
	var t = G.nodes.get(o.goto)
	var bad: bool = t == null or t.type == "death" or (t.type == "ending" and t.ending != "true")
	return bad if kind == "avoid" else not bad


# ---------- 台词 ----------

## 说话人名字里不能出现的字符：空白、标点、引号和括号（问号可以，用来写「？？？」）
const NOT_IN_NAME := " \t　，。、；！…—·“”‘’「」『』（）()《》<>,.;!\"'：:"
## 冒号前以这些字结尾的是旁白（「他低声说：」），不是说话人
const NARRATION_END := "说道问答喊叫写着"
const NAME_MAX := 8


## 把场景正文拆成一句句台词：每个非空行一句，「名字：台词」的行带说话人。
## 规则见 docs/STORY_FORMAT.md「台词」，与网页版共用 tests/vectors/dialogue/ 的用例。
## 返回 [{who, text}]。
static func dialogue_lines(text) -> Array:
	var lines := []
	for raw in str(text if text != null else "").split("\n"):
		var line: String = raw.strip_edges()
		if line != "":
			lines.append(_split_speaker(line))
	return lines


static func _split_speaker(line: String) -> Dictionary:
	var a := line.find("：")
	var b := line.find(":")
	var at := a if b < 0 or (a >= 0 and a < b) else b
	if at < 1:
		return {"who": "", "text": line}
	var who := line.substr(0, at)
	var rest := line.substr(at + 1).strip_edges()
	var ok := rest != "" and who.length() <= NAME_MAX and not NARRATION_END.contains(who.right(1))
	for ch in who:
		if NOT_IN_NAME.contains(ch):
			ok = false
	return {"who": who, "text": rest} if ok else {"who": "", "text": line}
