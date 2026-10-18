/* 剧情数据模型：节点 / 选项 / 残响的结构、归一化，以及货币与道具规则 */

export const TYPES={story:'剧情',choice:'抉择',check:'检定',rest:'休憩',death:'死亡',ending:'结局'};
export function O(text,goto,x={}){return Object.assign({text,goto,needItem:'',needClue:'',hintClue:'',gainItem:'',gainClue:'',look:'',pos:'',obj:'',once:false,needQty:1,useItem:false,costMoney:0,gainQty:1,gainMoney:0},x)}
export function E(text,target,honest,kind='go',teach=''){return {text,target,honest,kind,teach,by:'preset'}}
export function N(title,type,time,text,options=[],echoes=[],extra={}){return Object.assign({title,type,time,text,options,echoes,deathClue:'',ending:''},extra)}
export const SEED_LIKES={'神父就是凶手，当面揭穿他':23,'钟楼里的人不是神父':8,'守夜人收钱就放行':5,'从后面走，多带几支蜡烛':14,'门是朽木做的，撞开它':31,'别浪费蜡烛，摸黑也能走':19,'钟一响就冲，别犹豫':12,'第一声是骗人的':6,'抢过钟绳就结束了':27};
export function newEchoId(){return 'e'+Math.random().toString(36).slice(2,9)}
export function isHonest(G,o,kind){const t=G.nodes[o.goto];const bad=!t||t.type==='death'||(t.type==='ending'&&t.ending!=='true');return kind==='avoid'?bad:!bad}
export function normalize(g){
  g.items=g.items||{};g.clues=g.clues||{};g.nodes=g.nodes||{};g.currency=g.currency||'铜币';g.startMoney=Math.max(0,+g.startMoney||0);
  for(const n of Object.values(g.nodes)){n.options=(n.options||[]).map(o=>{if(o.once===undefined&&o.text==='在喷泉底摸硬币'){o.once=true;o.obj=o.obj||'喷泉'}const q=Object.assign(O('',''),o);q.needQty=Math.max(1,+q.needQty||1);q.gainQty=Math.max(1,+q.gainQty||1);q.costMoney=Math.max(0,+q.costMoney||0);q.gainMoney=Math.max(0,+q.gainMoney||0);q.useItem=!!q.useItem;q.once=!!q.once;return q});n.echoes=(n.echoes||[]).map(e=>{const q=Object.assign({text:'',target:-1,honest:true,kind:'go',teach:'',by:'preset'},e);q.likes=e.likes==null?(SEED_LIKES[q.text]||0):Math.max(0,+e.likes||0);if(!q.id)q.id=newEchoId();return q});n.time=+n.time||30;n.deathClue=n.deathClue||'';n.ending=n.ending||''}
  return g;
}

export const MONEY_CAP=30,QTY_CAP=6;
export const qtyOf=(inv,k)=>inv.get(k)||0;
export function canTake(o,inv,money){if(o.needItem&&qtyOf(inv,o.needItem)<(+o.needQty||1))return false;if((+o.costMoney||0)>money)return false;return true}
export function applyOpt(o,inv,money){
  if(o.needItem&&o.useItem){const left=qtyOf(inv,o.needItem)-(+o.needQty||1);left>0?inv.set(o.needItem,left):inv.delete(o.needItem)}
  money-=(+o.costMoney||0);
  if(o.gainItem)inv.set(o.gainItem,qtyOf(inv,o.gainItem)+(+o.gainQty||1));
  return money+(+o.gainMoney||0);
}
