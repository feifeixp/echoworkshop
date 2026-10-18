## 面向玩家的文案：锁定原因、花费、收获。与网页版 src/app/text.js 一致。
extends RefCounted

const StoryLib := preload("res://scripts/core/story.gd")


static func item_name(G: Dictionary, k: String) -> String:
	return str(G.items.get(k, "?"))


static func lock_msg(G: Dictionary, o: Dictionary, inv: Dictionary, money: int) -> String:
	var r := []
	if o.needItem != "" and StoryLib.qty_of(inv, o.needItem) < int(o.needQty):
		r.append("%s「%s」（你有 %d）" % [("%d 个" % int(o.needQty)) if int(o.needQty) > 1 else "", item_name(G, o.needItem), StoryLib.qty_of(inv, o.needItem)])
	if int(o.costMoney) > money:
		r.append("%d %s（你有 %d）" % [int(o.costMoney), G.currency, money])
	return "需要" + "和".join(r)


static func cost_line(G: Dictionary, o: Dictionary) -> String:
	var r := []
	if int(o.costMoney) > 0:
		r.append("花费 %d %s" % [int(o.costMoney), G.currency])
	if o.needItem != "" and o.useItem:
		r.append("用掉 %d 个%s" % [int(o.needQty), item_name(G, o.needItem)])
	elif o.needItem != "":
		r.append("使用" + item_name(G, o.needItem))
	return "，".join(r)


static func gain_text(G: Dictionary, o: Dictionary) -> String:
	var r := []
	if int(o.gainMoney) > 0:
		r.append("+%d %s" % [int(o.gainMoney), G.currency])
	if o.gainItem != "":
		r.append("获得%s「%s」" % [("%d 个" % int(o.gainQty)) if int(o.gainQty) > 1 else "", item_name(G, o.gainItem)])
	if o.gainClue != "":
		r.append("得知：" + str(G.clues.get(o.gainClue, "")))
	return "，".join(r)


static func minutes(seconds) -> String:
	return "%.1f 分钟" % (float(seconds) / 60.0)
