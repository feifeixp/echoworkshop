/* 节点编辑抽屉与地图工具栏 */
import {$,CN,esc} from '../app/dom.js';
import {S,save} from '../app/store.js';
import {switchTab} from '../app/tabs.js';
import {NH} from '../core/layout.js';
import {N,O,TYPES} from '../core/story.js';
import {ICON,drawDesign,fitZoom} from './graph.js';
import {lastA,openX,renderChecks} from './panels.js';
import {autoLayout} from './routes.js';
import {playReset} from '../play/run.js';
import {LOOKS,looksOfText} from '../core/run.js';

/* ================= 节点编辑抽屉 ================= */
export const selOf=(map,val,empty='无')=>`<option value="">${empty}</option>`+Object.entries(map).map(([k,v])=>`<option value="${esc(k)}"${k===val?' selected':''}>${esc(v)}</option>`).join('');
export const nodeSel=val=>`<option value="">（未连接）</option>`+Object.entries(S.G.nodes).map(([k,n])=>`<option value="${esc(k)}"${k===val?' selected':''}>${esc(n.title)}${n.type==='death'||n.type==='ending'?`（${TYPES[n.type]}）`:''}</option>`).join('');
export const tIcon=k=>`<svg class="g" width="18" height="18" viewBox="-10 -10 20 20" aria-hidden="true"><g class="t-${k}">${ICON[k]}</g></svg>`;
export function optSum(o){const t=[],cur=esc(S.G.currency),it=k=>esc(S.G.items[k]||'?');
  if((o.obj||'').trim())t.push(`<span class="m">物件：${esc(o.obj.trim())}</span>`);
  if(o.once)t.push('<span class="m">一次性</span>');
  if(o.needItem)t.push(`<span class="i">需要${+o.needQty>1?o.needQty+' 个':''}${it(o.needItem)}${o.useItem?'（用掉）':''}</span>`);
  if(+o.costMoney>0)t.push(`<span class="i">花费 ${o.costMoney} ${cur}</span>`);
  if(o.needClue)t.push(`<span class="c">知道「${esc(S.G.clues[o.needClue]||'?')}」才出现</span>`);
  if(o.gainItem)t.push(`<span class="i">获得${+o.gainQty>1?o.gainQty+' 个':''}${it(o.gainItem)}</span>`);
  if(+o.gainMoney>0)t.push(`<span class="i">获得 ${o.gainMoney} ${cur}</span>`);
  if(o.gainClue)t.push(`<span class="c">得知「${esc(S.G.clues[o.gainClue]||'?')}」</span>`);
  if(o.hintClue)t.push(`<span class="c">知道「${esc(S.G.clues[o.hintClue]||'?')}」的人更会选</span>`);
  return t.join('')}
export function echoSum(e,n){const t=[`<span class="m">赞 ${e.likes||0}</span>`];
  if(e.target>=0&&n.options[e.target])t.push(`<span class="m">${e.kind==='avoid'?'警告':'推荐'}：${esc(n.options[e.target].text)}</span>`);
  if(e.teach)t.push(`<span class="c">相信后得知「${esc(S.G.clues[e.teach]||'?')}」</span>`);
  if(e.by==='play')t.push('<span class="m">入局时由玩家留下</span>');
  return t.join('')}
export function renderInspector(){
  const n=S.G.nodes[S.sel];const box=$('#insp'),wrap=$('#design');
  if(!n){box.hidden=true;wrap.classList.remove('open');return}
  box.hidden=false;wrap.classList.add('open');
  const term=n.type==='death'||n.type==='ending';
  const opts=term?'':`<div class="divider"></div>
  <div class="sect"><div class="sh"><h3>选项</h3><small>点 ⋯ 设置物件、锁和奖励</small></div>
  <datalist id="objs-dl">${[...new Set(n.options.map(o=>(o.obj||'').trim()).filter(Boolean))].map(v=>`<option value="${esc(v)}"></option>`).join('')}</datalist>
  ${n.options.map((o,i)=>{const key=S.sel+':o'+i,open=openX.has(key),s=optSum(o);
    return `<div class="row-o"><span class="n">${CN[i]||i+1}</span><input data-o="${i}" data-of="text" value="${esc(o.text)}" aria-label="选项${i+1}"><select data-o="${i}" data-of="goto" aria-label="通向">${nodeSel(o.goto)}</select><button class="iconbtn more" data-tog="${key}" aria-expanded="${open}" aria-label="更多设置">⋯</button></div>
    ${open?`<div class="adv">
      <label class="f">需要道具<select data-o="${i}" data-of="needItem">${selOf(S.G.items,o.needItem,'不需要')}</select></label>
      <div class="f">数量<span class="qty"><input type="number" min="1" max="99" data-o="${i}" data-of="needQty" value="${o.needQty}" aria-label="需要数量"${o.needItem?'':' disabled'}><label class="chkl"><input type="checkbox" data-o="${i}" data-of="useItem"${o.useItem?' checked':''}${o.needItem?'':' disabled'}>用掉</label></span></div>
      <label class="f">花费${esc(S.G.currency)}<input type="number" min="0" max="999" data-o="${i}" data-of="costMoney" value="${o.costMoney}"></label>
      <label class="f">知识锁<select data-o="${i}" data-of="needClue">${selOf(S.G.clues,o.needClue,'不需要')}</select></label>
      <label class="f">获得道具<select data-o="${i}" data-of="gainItem">${selOf(S.G.items,o.gainItem)}</select></label>
      <label class="f">获得数量<input type="number" min="1" max="99" data-o="${i}" data-of="gainQty" value="${o.gainQty}"${o.gainItem?'':' disabled'}></label>
      <label class="f">获得${esc(S.G.currency)}<input type="number" min="0" max="999" data-o="${i}" data-of="gainMoney" value="${o.gainMoney}"></label>
      <label class="f">获得线索<select data-o="${i}" data-of="gainClue">${selOf(S.G.clues,o.gainClue)}</select></label>
      <label class="f full">所属物件（同名的选项会合并成一个物件，玩家互动时弹出菜单）<input data-o="${i}" data-of="obj" list="objs-dl" value="${esc(o.obj||'')}" placeholder="留空则单独成为一个物件"></label>
      <label class="chkl full"><input type="checkbox" data-o="${i}" data-of="once"${o.once?' checked':''}>只能触发一次（每轮），用过后这件事会从场景里消失</label>
      <label class="f">在场景中显示为<select data-o="${i}" data-of="look"><option value="">自动判断（${LOOKS[looksOfText(o.text)]}）</option>${Object.entries(LOOKS).map(([k,v])=>`<option value="${k}"${o.look===k?' selected':''}>${v}</option>`).join('')}</select></label>
      <label class="f">场景位置 ${o.pos===''||o.pos==null?'（自动）':o.pos+'%'}<input type="range" min="3" max="97" data-o="${i}" data-of="pos" value="${o.pos===''||o.pos==null?50:o.pos}"></label>
      <label class="f full">软提示：知道这条线索的玩家更会选它<select data-o="${i}" data-of="hintClue">${selOf(S.G.clues,o.hintClue)}</select></label>
      <button class="linkbtn" data-act="delOpt" data-i="${i}">删除这个选项</button></div>`:s?`<div class="sum">${s}</div>`:''}`}).join('')}
  <div class="addrow"><button class="btn small" data-act="addOpt">加选项</button><button class="btn small" data-act="addOptNew">加选项并新建节点</button></div></div>
  <div class="divider"></div>
  <div class="sect"><div class="sh"><h3>残响</h3><small>点“真 / 假”切换</small></div>
  ${n.echoes.length?'':'<p class="hint">在容易死的地方放 2～3 条真假混杂的残响。</p>'}
  ${n.echoes.map((e,i)=>{const key=S.sel+':e'+i,open=openX.has(key),s=echoSum(e,n);
    return `<div class="row-e"><input data-e="${i}" data-ef="text" value="${esc(e.text)}" aria-label="残响${i+1}"><button class="truthbtn ${e.honest?'t':'f'}" data-act="truth" data-i="${i}" aria-label="切换真假">${e.honest?'真':'假'}</button><button class="iconbtn more" data-tog="${key}" aria-expanded="${open}" aria-label="更多设置">⋯</button></div>
    ${open?`<div class="adv e">
      <label class="f">作用<select data-e="${i}" data-ef="kind"><option value="go"${e.kind!=='avoid'?' selected':''}>推荐</option><option value="avoid"${e.kind==='avoid'?' selected':''}>警告</option></select></label>
      <label class="f">针对哪个选项<select data-e="${i}" data-ef="target"><option value="-1">不针对</option>${n.options.map((o,j)=>`<option value="${j}"${j===e.target?' selected':''}>${CN[j]||j+1}、${esc(o.text)}</option>`).join('')}</select></label>
      <label class="f">相信后获得线索<select data-e="${i}" data-ef="teach">${selOf(S.G.clues,e.teach,'不给线索')}</select></label>
      <label class="f">点赞数<input type="number" min="0" data-e="${i}" data-ef="likes" value="${e.likes||0}"></label>
      <p class="hint full">玩家只能看到点赞数，看不到真假。</p>
      <button class="linkbtn" data-act="delEcho" data-i="${i}">删除这条残响</button></div>`:s?`<div class="sum e">${s}</div>`:''}`}).join('')}
  <div class="addrow"><button class="btn small" data-act="addEcho">加残响</button></div></div>`;
  box.innerHTML=`<div class="ihead"><input class="ititle" data-f="title" value="${esc(n.title)}" aria-label="节点标题"><button class="iconbtn" data-act="close" aria-label="关闭编辑">×</button></div>
  <div class="types">${Object.entries(TYPES).map(([k,v])=>`<button class="tchip${k===n.type?' on':''}" data-type="${k}" aria-pressed="${k===n.type}">${tIcon(k)}${v}</button>`).join('')}</div>
  <textarea data-f="text" placeholder="这里发生了什么？每一行是一句，依次显示。&#10;以【名字】开头的是台词，例如：&#10;【老板】要点什么？" aria-label="正文">${esc(n.text)}</textarea>
  <p class="hint">每一行是一句，游戏里依次显示；以【名字】开头的是这个角色的台词，例如「【老板】要点什么？」。</p>
  <div class="irow"><label>停留约<input class="mini num" type="number" min="5" step="5" data-f="time" value="${n.time}">秒</label>
    ${n.type==='death'?`<label>死前揭示<select data-f="deathClue">${selOf(S.G.clues,n.deathClue,'不揭示线索')}</select></label>`:''}
    ${n.type==='ending'?`<label><select data-f="ending"><option value="true"${n.ending==='true'?' selected':''}>真结局（通关）</option><option value="bad"${n.ending!=='true'?' selected':''}>坏结局（继续轮回）</option></select></label>`:''}</div>
  ${term?`<p class="hint">${n.type==='death'?'死前揭示的线索会带进下一局，失败才有意义。':'真结局算通关；坏结局会让玩家进入下一次轮回。'}</p>`:opts}
  <div class="ifoot">${S.sel===S.G.start?'<span class="src">这是起点</span>':'<button class="btn small" data-act="setStart">设为起点</button>'}<button class="btn small" data-act="play">从这里入局</button>${S.sel!==S.G.start?'<button class="btn small danger" data-act="delNode">删除节点</button>':''}</div>`;
}
/* 改名字时只更新摘要文字，不打断正在输入的框 */
export function renderInspectorSoft(){const a=document.activeElement;if(!a||!$('#insp').contains(a))renderInspector()}
$('#insp').addEventListener('input',e=>{
  const t=e.target,n=S.G.nodes[S.sel];if(!n)return;
  if(t.dataset.f){const f=t.dataset.f;n[f]=f==='time'?(+t.value||0):t.value}
  else if(t.dataset.o!=null){n.options[+t.dataset.o][t.dataset.of]=t.type==='checkbox'?t.checked:t.type==='number'?Math.max(+t.min||0,+t.value||0):t.value}
  else if(t.dataset.e!=null){const ec=n.echoes[+t.dataset.e],f=t.dataset.ef;ec[f]=f==='target'?+t.value:f==='likes'?Math.max(0,+t.value||0):t.value}
  changed(true);
});
$('#insp').addEventListener('click',e=>{
  const n=S.G.nodes[S.sel];if(!n)return;
  const tg=e.target.closest('[data-tog]');if(tg){const k=tg.dataset.tog;openX.has(k)?openX.delete(k):openX.add(k);renderInspector();return}
  const ty=e.target.closest('[data-type]');
  if(ty){n.type=ty.dataset.type;if(n.type==='ending'&&!n.ending)n.ending='bad';if(n.type==='death'||n.type==='ending'){n.options=[];n.echoes=[]}renderInspector();changed();return}
  const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;
  const clearOpen=()=>[...openX].forEach(k=>{if(k.startsWith(S.sel+':'))openX.delete(k)});
  if(act==='close'){S.sel=null;renderInspector();drawDesign();return}
  if(act==='truth'){const ec=n.echoes[+b.dataset.i];ec.honest=!ec.honest}
  if(act==='addOpt'){n.options.push(O('新选项',''));openX.add(S.sel+':o'+(n.options.length-1))}
  if(act==='addOptNew'){const id=newId();S.G.nodes[id]=N('新节点','story',30,'',[]);S.G.nodes[id].x=n.x+222;S.G.nodes[id].y=n.y+n.options.length*88;n.options.push(O('新选项',id))}
  if(act==='delOpt'){const i=+b.dataset.i;n.options.splice(i,1);n.echoes.forEach(ec=>{if(ec.target===i)ec.target=-1;else if(ec.target>i)ec.target--});clearOpen()}
  if(act==='addEcho'){n.echoes.push({text:'新的残响',target:-1,honest:true,kind:'go',teach:'',by:'preset'});openX.add(S.sel+':e'+(n.echoes.length-1))}
  if(act==='delEcho'){n.echoes.splice(+b.dataset.i,1);clearOpen()}
  if(act==='setStart')S.G.start=S.sel;
  if(act==='delNode'){delete S.G.nodes[S.sel];for(const m of Object.values(S.G.nodes))m.options.forEach(o=>{if(o.goto===S.sel)o.goto=''});clearOpen();S.sel=null}
  if(act==='play'){playReset(true,S.sel);switchTab('play');return}
  renderInspector();changed();
});
/* 下拉框改动后刷新摘要标签 */
$('#insp').addEventListener('change',e=>{const t=e.target;if(t.tagName==='SELECT'||t.type==='range'||t.type==='checkbox'||(t.type==='number'&&t.dataset.o!=null)||t.dataset.of==='obj')renderInspector()});
export function newId(){let i=1;while(S.G.nodes['n'+i])i++;return 'n'+i}

export let chT=null;
export function changed(soft){save();clearTimeout(chT);chT=setTimeout(()=>{S.hl=null;const hb=$('#hlBtn');hb.setAttribute('aria-pressed','false');drawDesign();renderChecks();$('#projName').textContent=S.G.name||''},soft?160:0)}
$('#gsvg').addEventListener('click',e=>{if(!e.target.closest('.node')&&S.sel){S.sel=null;renderInspector();drawDesign()}});
$('#addNode').onclick=()=>{const id=newId();const base=S.G.nodes[S.sel]||S.G.nodes[S.G.start]||{x:30,y:44};S.G.nodes[id]=N('新节点','story',30,'',[]);S.G.nodes[id].x=base.x+40;S.G.nodes[id].y=base.y+NH+40;S.sel=id;renderInspector();changed();setTimeout(()=>$('#insp .ititle')?.select(),0)};
$('#layout').onclick=()=>{autoLayout();save();fitZoom()};
$('#zIn').onclick=()=>{S.zoom=Math.min(1.6,S.zoom+.1);drawDesign()};
$('#zOut').onclick=()=>{S.zoom=Math.max(.3,S.zoom-.1);drawDesign()};
$('#zFit').onclick=fitZoom;
$('#hlBtn').onclick=()=>{const hb=$('#hlBtn');
  if(S.hl){S.hl=null;drawDesign();hb.setAttribute('aria-pressed','false');return}
  const f=lastA&&lastA.fast;if(!f)return;const nodes=new Set(f.path),edges=new Set();for(let i=0;i<f.path.length-1;i++)edges.add(f.path[i]+'>'+f.path[i+1]);
  S.hl={nodes,edges};drawDesign();hb.setAttribute('aria-pressed','true');
};
