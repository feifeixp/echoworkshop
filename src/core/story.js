/* 剧情数据模型：节点 / 选项 / 残响的结构、校验、归一化，以及货币与道具规则 */

/** 剧情 JSON 的格式版本。格式不兼容地改变时加一，并在 normalize() 里做迁移。 */
export const FORMAT_VERSION = 1;

export const TYPES = { story: '剧情', choice: '抉择', check: '检定', rest: '休憩', death: '死亡', ending: '结局' };

/** 新建一个选项，未给出的字段取默认值。 */
export function O(text, goto, extra = {}) {
  return Object.assign({
    text, goto,
    obj: '', look: '', pos: '', once: false,
    needItem: '', needQty: 1, useItem: false, costMoney: 0,
    needClue: '', hintClue: '',
    gainItem: '', gainQty: 1, gainMoney: 0, gainClue: '',
  }, extra);
}

/** 新建一条设计者预设的残响。 */
export function E(text, target, honest, kind = 'go', teach = '') {
  return { text, target, honest, kind, teach, by: 'preset' };
}

/** 新建一个节点。 */
export function N(title, type, time, text, options = [], echoes = [], extra = {}) {
  return Object.assign({ title, type, time, text, options, echoes, deathClue: '', ending: '' }, extra);
}

/** 旧存档里没有点赞数的预设残响，用这里的初始值。 */
export const SEED_LIKES = {
  '神父就是凶手，当面揭穿他': 23, '钟楼里的人不是神父': 8, '守夜人收钱就放行': 5,
  '从后面走，多带几支蜡烛': 14, '门是朽木做的，撞开它': 31, '别浪费蜡烛，摸黑也能走': 19,
  '钟一响就冲，别犹豫': 12, '第一声是骗人的': 6, '抢过钟绳就结束了': 27,
};

export function newEchoId() {
  return 'e' + Math.random().toString(36).slice(2, 9);
}

/** 玩家留下的残响是真是假：由它说的话和那个选项的实际后果决定。 */
export function isHonest(G, o, kind) {
  const t = G.nodes[o.goto];
  const bad = !t || t.type === 'death' || (t.type === 'ending' && t.ending !== 'true');
  return kind === 'avoid' ? bad : !bad;
}

const nonNeg = v => Math.max(0, +v || 0);
const atLeast1 = v => Math.max(1, +v || 1);

/** 补全缺失字段、修正类型、迁移旧数据。会直接修改并返回传入的对象。 */
export function normalize(g) {
  g.formatVersion = g.formatVersion || FORMAT_VERSION;
  g.id = g.id || 'story';
  g.revision = +g.revision || 1;
  g.items = g.items || {};
  g.clues = g.clues || {};
  g.nodes = g.nodes || {};
  g.currency = g.currency || '铜币';
  g.startMoney = nonNeg(g.startMoney);

  for (const n of Object.values(g.nodes)) {
    n.options = (n.options || []).map(o => {
      // 迁移：早期示例里喷泉不是一次性的
      if (o.once === undefined && o.text === '在喷泉底摸硬币') { o.once = true; o.obj = o.obj || '喷泉'; }
      const q = Object.assign(O('', ''), o);
      q.needQty = atLeast1(q.needQty);
      q.gainQty = atLeast1(q.gainQty);
      q.costMoney = nonNeg(q.costMoney);
      q.gainMoney = nonNeg(q.gainMoney);
      q.useItem = !!q.useItem;
      q.once = !!q.once;
      return q;
    });
    n.echoes = (n.echoes || []).map(e => {
      const q = Object.assign({ text: '', target: -1, honest: true, kind: 'go', teach: '', by: 'preset' }, e);
      q.likes = e.likes == null ? (SEED_LIKES[q.text] || 0) : nonNeg(e.likes);
      if (!q.id) q.id = newEchoId();
      return q;
    });
    n.time = +n.time || 30;
    n.deathClue = n.deathClue || '';
    n.ending = n.ending || '';
  }
  return g;
}

/**
 * 检查一份剧情数据的结构是否能被游戏读取。返回中文错误列表，空数组表示可以读取。
 * 只检查结构；剧情逻辑上的问题（死局、拿不到的道具）由 analysis.js 负责。
 */
export function validateStory(raw) {
  const errs = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['剧情数据必须是一个 JSON 对象'];
  if (raw.formatVersion > FORMAT_VERSION) errs.push(`剧情格式版本 ${raw.formatVersion} 比游戏支持的 ${FORMAT_VERSION} 更新，请更新游戏`);
  if (!raw.nodes || typeof raw.nodes !== 'object' || Array.isArray(raw.nodes)) return [...errs, '缺少 nodes（节点表）'];
  const ids = Object.keys(raw.nodes);
  if (!ids.length) errs.push('节点表是空的');
  if (!raw.nodes[raw.start]) errs.push(`起点「${raw.start ?? '未设置'}」不在节点表里`);
  for (const [id, n] of Object.entries(raw.nodes)) {
    if (!n || typeof n !== 'object') { errs.push(`节点 ${id} 不是对象`); continue; }
    if (n.type && !TYPES[n.type]) errs.push(`节点 ${id} 的类型「${n.type}」无法识别`);
    if (n.options != null && !Array.isArray(n.options)) errs.push(`节点 ${id} 的 options 必须是数组`);
    if (n.echoes != null && !Array.isArray(n.echoes)) errs.push(`节点 ${id} 的 echoes 必须是数组`);
    (Array.isArray(n.options) ? n.options : []).forEach((o, i) => {
      if (!o || typeof o.goto !== 'string') errs.push(`节点 ${id} 的第 ${i + 1} 个选项缺少 goto`);
    });
  }
  return errs;
}

/** 校验并归一化一份原始剧情数据（例如刚解析的 JSON）。结构有问题时抛出带中文说明的错误。 */
export function parseStory(raw) {
  const errs = validateStory(raw);
  if (errs.length) {
    const e = new Error(errs.join('\n'));
    e.list = errs;
    throw e;
  }
  return normalize(JSON.parse(JSON.stringify(raw)));
}

/* ---------- 货币与可叠加道具 ---------- */

/** 搜索和模拟里的上限，防止反复赚钱的循环让状态无限增长。 */
export const MONEY_CAP = 30, QTY_CAP = 6;

export const qtyOf = (inv, k) => inv.get(k) || 0;

/** 背包和钱够不够执行这个选项（不含知识锁和一次性判断）。 */
export function canTake(o, inv, money) {
  if (o.needItem && qtyOf(inv, o.needItem) < (+o.needQty || 1)) return false;
  if ((+o.costMoney || 0) > money) return false;
  return true;
}

/** 执行选项对背包的影响。会修改 inv，返回新的货币数量。 */
export function applyOpt(o, inv, money) {
  if (o.needItem && o.useItem) {
    const left = qtyOf(inv, o.needItem) - (+o.needQty || 1);
    left > 0 ? inv.set(o.needItem, left) : inv.delete(o.needItem);
  }
  money -= +o.costMoney || 0;
  if (o.gainItem) inv.set(o.gainItem, qtyOf(inv, o.gainItem) + (+o.gainQty || 1));
  return money + (+o.gainMoney || 0);
}
