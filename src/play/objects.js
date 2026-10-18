/* 场景物件分组、互动菜单、执行选项 */
import {$,esc} from '../app/dom.js';
import {isReduced} from '../app/settings.js';
import {S} from '../app/store.js';
import {costLine,gainText,lockMsg} from '../app/text.js';
import {N,applyOpt,canTake} from '../core/story.js';
import {clamp} from '../core/util.js';
import {enterNode,known,persistRun,renderHud,sideHTML} from './run.js';
import {GM,LOOKS,OBJ_H,looksOf,rr} from './scene.js';

/* ================= 物件分组：同一物件下的多个选项合并，互动时弹出菜单 ================= */
export function looksOfName(name,os){
  if(/门/.test(name))return 'door';
  if(/人|老板|醉汉|神父|修女|守夜|她|他|婆|翁|商|孩|夫/.test(name))return 'person';
  if(/路|口|楼梯|小径|巷|阶/.test(name))return 'sign';
  if(/书|桌|柜|箱|墙|井|蜡烛|钥匙|台|名字/.test(name))return 'item';
  return looksOf(os[0]);
}
export function buildObjs(){
  const n=S.G.nodes[S.P.node];const ops=n?n.options:[];const groups=new Map();
  ops.forEach((o,i)=>{const name=(o.obj||'').trim();const k=name||('#'+i);if(!groups.has(k))groups.set(k,{key:k,name,idx:[]});groups.get(k).idx.push(i)});
  const arr=[...groups.values()],N=arr.length;
  return arr.map((g,gi)=>{const os=g.idx.map(i=>ops[i]);
    const posO=os.find(o=>o.pos!==''&&o.pos!=null&&!isNaN(+o.pos)),lookO=os.find(o=>o.look&&LOOKS[o.look]);
    const kind=lookO?lookO.look:(g.name?looksOfName(g.name,os):looksOf(os[0]));
    return {key:g.key,name:g.name,idx:g.idx,i:g.idx[0],o:os[0],kind,
      x:posO?clamp(+posO.pos,3,97)/100*GM.WW:GM.WW*(.24+.68*(N<2?.5:gi/(N-1)))}});
}
export function refreshObjs(){const n=S.G.nodes[S.P.node];if(!n)return;
  GM.objs.forEach(ob=>{ob.states=ob.idx.map(i=>{const o=n.options[i];return {i,o,hidden:!!(o.needClue&&!known(o.needClue)),locked:!canTake(o,S.P.items,S.P.money)}});
    ob.states.forEach(s=>s.used=!!(s.o.once&&S.P.used&&S.P.used.has(S.P.node+':'+s.i)));
    ob.live=ob.states.filter(s=>!s.used);ob.gone=!ob.live.length;
    const vis=ob.live.filter(s=>!s.hidden);ob.hidden=!vis.length;ob.locked=vis.length>0&&vis.every(s=>s.locked);ob.multi=ob.live.length>1});
  if(GM.near>=0&&GM.objs[GM.near]&&GM.objs[GM.near].gone)GM.near=-1;
  if(GM.menu)renderMenu();
}
export function echoOn(i){const n=S.G.nodes[S.P.node];const bel=S.P.believed[S.P.node];if(!bel||!n)return null;let m=null;
  bel.forEach(j=>{const e=n.echoes[j];if(e&&e.target===i)m=m==='go'?'go':(e.kind==='avoid'?'avoid':'go')});return m}
export function believedMarks(idx){let m=null;(Array.isArray(idx)?idx:[idx]).forEach(i=>{const v=echoOn(i);if(v)m=m==='go'?'go':v});return m}
export function drawPrompt(x,ob,cam){
  const lines=[];let main,col='#e8e0cf',showKey=true,red=false;
  if(ob.multi){
    const vis=ob.live.filter(s=>!s.hidden),hid=ob.live.length-vis.length;
    if(!vis.length){main='雾里有什么，但你还不知道该做什么';col='#9298a6';showKey=false}
    else{main=ob.name||vis[0].o.text;lines.push([`${vis.length} 件可以做的事${hid?`，还有 ${hid} 件你暂时想不到`:''}`,'#9298a6'])}
  }else{
    const s=ob.live[0],o=s.o;
    if(s.hidden){main='雾里有什么，但你还不知道该做什么';col='#9298a6';showKey=false}
    else if(s.locked){main=lockMsg(o,S.P.items,S.P.money);col='#e2686f';showKey=false;red=true;lines.push([o.text,'#9298a6'])}
    else{main=o.text;const cl=costLine(o);if(cl)lines.push([cl,'#d9a653'])}
    if(!s.hidden){if(o.needClue)lines.push(['因为你知道：'+(S.G.clues[o.needClue]||''),'#8eaeea']);if(o.hintClue&&known(o.hintClue))lines.push(['你想起：'+S.G.clues[o.hintClue],'#8eaeea'])}
  }
  x.font='600 15px "Noto Serif SC",serif';let w=x.measureText(main).width;const keyW=showKey?46:0;
  x.font='12px "Noto Sans SC",sans-serif';lines.forEach(l=>w=Math.max(w,x.measureText(l[0]).width-keyW));
  const bw=w+keyW+28,bh=34+lines.length*18;const k=ob.hidden?'ghost':ob.kind;const mark=believedMarks(ob.idx)?24:0;
  let sx=clamp(ob.x-cam-bw/2,10,GM.W-bw-10);sx+=GM.shake>0?Math.sin(GM.shake*60)*4:0;
  const sy=Math.max(70,GM.ground-OBJ_H[k]-mark-bh-22);
  rr(x,sx,sy,bw,bh,6);x.fillStyle='rgba(10,13,20,.92)';x.fill();x.strokeStyle=red?'#7a2a33':'#6e5326';x.lineWidth=1;x.stroke();
  const tx=clamp(ob.x-cam,sx+12,sx+bw-12);x.beginPath();x.moveTo(tx-6,sy+bh);x.lineTo(tx,sy+bh+7);x.lineTo(tx+6,sy+bh);x.fillStyle='rgba(10,13,20,.92)';x.fill();
  let cx=sx+14;
  if(keyW){rr(x,cx,sy+9,38,18,4);x.fillStyle='#2b3345';x.fill();x.strokeStyle='#d9a653';x.stroke();x.font='700 11px "Noto Sans SC",sans-serif';x.fillStyle='#f0c77e';x.textAlign='center';x.fillText('空格',cx+19,sy+22);cx+=keyW}
  x.textAlign='left';x.font='600 15px "Noto Serif SC",serif';x.fillStyle=col;x.fillText(main,cx,sy+23);
  x.font='12px "Noto Sans SC",sans-serif';lines.forEach((l,j)=>{x.fillStyle=l[1];x.fillText(l[0],sx+14,sy+44+j*18)});
}
/* 互动菜单 */
export const visStates=ob=>ob.live.filter(s=>!s.hidden);
export function openMenu(ob){const v=visStates(ob);let k=v.findIndex(s=>!s.locked);GM.menu={ob,sel:k<0?0:k};GM.walk=0;renderMenu()}
export function closeMenu(){if(!GM.menu)return;GM.menu=null;renderMenu()}
export function renderMenu(){
  const el=$('#menu'),m=GM.menu;if(!m){el.hidden=true;el.innerHTML='';return}
  const ob=m.ob,v=visStates(ob),hid=ob.live.length-v.length;m.sel=clamp(m.sel,0,Math.max(0,v.length-1));
  el.innerHTML=`<div class="mh">${esc(ob.name||'互动')}</div>
  ${v.map((s,k)=>{const o=s.o,tags=[];
    if(s.locked)tags.push(`<em class="r">${esc(lockMsg(o,S.P.items,S.P.money))}</em>`);else{const cl=costLine(o);if(cl)tags.push(`<em class="g">${esc(cl)}</em>`)}
    if(o.needClue)tags.push(`<em class="b">因为你知道：${esc(S.G.clues[o.needClue]||'')}</em>`);
    if(o.hintClue&&known(o.hintClue))tags.push(`<em class="b">你想起：${esc(S.G.clues[o.hintClue])}</em>`);
    const ec=echoOn(s.i);if(ec)tags.push(`<em class="${ec==='go'?'j':'r'}">${ec==='go'?'残响指向这里':'残响警告：别这么做'}</em>`);
    return `<button class="mi${k===m.sel?' on':''}" data-mi="${k}"${s.locked?' aria-disabled="true"':''}><span class="k">${k+1}</span><span class="tx">${esc(o.text)}${tags.length?`<span class="mt">${tags.join('')}</span>`:''}</span></button>`}).join('')}
  ${hid?`<div class="mx">还有 ${hid} 件事，你现在还想不到。</div>`:''}
  <div class="mf"><kbd>↑</kbd><kbd>↓</kbd>选择　<kbd>空格</kbd>确认　<kbd>Esc</kbd>离开</div>`;
  const cam=clamp(GM.px-GM.W/2,0,Math.max(0,GM.WW-GM.W));
  el.style.left=clamp(ob.x-cam-150,10,Math.max(10,GM.W-310))+'px';
  el.style.bottom=clamp(GM.H-GM.ground+(OBJ_H[ob.kind]||60)+14,12,GM.H*.3)+'px';
  el.hidden=false;
}
export function menuMove(d){const m=GM.menu;if(!m)return;const n=visStates(m.ob).length;if(!n)return;m.sel=(m.sel+d+n)%n;renderMenu()}
export function menuChoose(k){
  const m=GM.menu;if(!m)return;if(k!=null)m.sel=k;const s=visStates(m.ob)[m.sel];if(!s)return;
  if(s.locked){setNudge(lockMsg(s.o,S.P.items,S.P.money)+'。');GM.shake=.3;return}
  const ob=m.ob;closeMenu();doOpt(ob,s.i);
}
export function interact(){
  if(!S.P||S.P.end||GM.busy)return;if(GM.menu){menuChoose();return}
  const ob=GM.objs[GM.near];
  if(!ob){setNudge('附近没有可以互动的东西，走近一点。');return}
  if(ob.hidden){setNudge('那里有什么，但你还不知道该做什么。');GM.shake=.3;return}
  if(ob.multi){openMenu(ob);return}
  const s=ob.live[0];
  if(s.locked){setNudge(lockMsg(s.o,S.P.items,S.P.money)+'。');GM.shake=.3;return}
  doOpt(ob,s.i);
}
export function doOpt(ob,i){
  const o=S.G.nodes[S.P.node].options[i];
  if(o.goto===S.P.node){actInPlace(ob,o,i);return}
  GM.busy=true;$('#fader').classList.add('on');
  setTimeout(()=>{chooseOpt(i);requestAnimationFrame(()=>{$('#fader').classList.remove('on');GM.busy=false})},isReduced()?0:340);
}
export function setNudge(s){GM.nudge=s;const el=$('#nudge');if(el)el.textContent=s}
/* 留在同一个场景的行动：不换背景、不黑屏、角色不动 */
export function actInPlace(ob,o,i){
  const n=S.G.nodes[S.P.node];S.P.money=applyOpt(o,S.P.items,S.P.money);if(o.gainClue)S.P.runClues.add(o.gainClue);if(o.once)S.P.used.add(S.P.node+':'+i);
  S.P.lastChoice={node:S.P.node,idx:i};S.P.t+=6+n.time;
  const cost=costLine(o),gain=gainText(o);
  refreshObjs();renderHud(n);$('#pside').innerHTML=sideHTML();persistRun();
  setNudge([cost,gain].filter(Boolean).join('，')||`你${o.text}，但什么也没发生。`);
  if(gain)GM.floats.push({x:ob.x,y:GM.ground-(OBJ_H[ob.kind]||60)-10,text:gain.split('，')[0],life:1.4,col:'#f0c77e'});
  if(cost)GM.floats.push({x:ob.x,y:GM.ground-(OBJ_H[ob.kind]||60)+12,text:cost.split('，')[0].replace('花费 ','-').replace('用掉 ','-'),life:1.4,col:'#e2686f'});
}
export function chooseOpt(i){const n=S.G.nodes[S.P.node],o=n.options[i];if(o.once)S.P.used.add(S.P.node+':'+i);const before=S.P.money;S.P.money=applyOpt(o,S.P.items,S.P.money);if(o.gainClue)S.P.runClues.add(o.gainClue);S.P.gainNote=gainText(o);
  S.P.lastChoice={node:S.P.node,idx:i};S.P.t+=6;enterNode(o.goto)}
