/* 面向玩家的文案：锁定原因、花费、收获 */
import {S} from './store.js';
import {qtyOf} from '../core/story.js';

export function lockMsg(o,inv,money){
  const r=[];if(o.needItem&&qtyOf(inv,o.needItem)<(+o.needQty||1))r.push(`${+o.needQty>1?o.needQty+' 个':''}「${S.G.items[o.needItem]||'?'}」（你有 ${qtyOf(inv,o.needItem)}）`);
  if((+o.costMoney||0)>money)r.push(`${o.costMoney} ${S.G.currency}（你有 ${money}）`);
  return '需要'+r.join('和');
}
export function costLine(o){const r=[];if(+o.costMoney>0)r.push(`花费 ${o.costMoney} ${S.G.currency}`);if(o.needItem&&o.useItem)r.push(`用掉 ${o.needQty||1} 个${S.G.items[o.needItem]||'?'}`);else if(o.needItem)r.push(`使用${S.G.items[o.needItem]||'?'}`);return r.join('，')}

export function gainText(o){return [+o.gainMoney>0?`+${o.gainMoney} ${S.G.currency}`:'',o.gainItem?`获得${+o.gainQty>1?o.gainQty+' 个':''}「${S.G.items[o.gainItem]||'?'}」`:'',o.gainClue?`得知：${S.G.clues[o.gainClue]||''}`:''].filter(Boolean).join('，')}
