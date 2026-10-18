/* 一次轮回的状态、HUD、对话、键盘输入 */
import {$,esc,fmtMin} from '../app/dom.js';
import {SETTINGS,TEXT_SPEEDS,isReduced} from '../app/settings.js';
import {LIKED,RUNSAVE,S,emit,save,saveLiked} from '../app/store.js';
import {serializeRun} from '../core/save.js';
import {isHonest,newEchoId} from '../core/story.js';
import {closeMenu,interact,menuChoose,menuMove,refreshObjs} from './objects.js';
import {GM,buildScene,startGame} from './scene.js';

export let twT=null;

/** 自动存档：每次状态变化后调用。编辑器里的试玩不存档。 */
export function persistRun(){
  if(!RUNSAVE.key||!S.P||!S.G)return;
  try{localStorage.setItem(RUNSAVE.key,JSON.stringify(serializeRun(S.G,S.P)))}catch(e){}
}
export function clearRunSave(){if(RUNSAVE.key)try{localStorage.removeItem(RUNSAVE.key)}catch(e){}}
export function playReset(full,startAt){
  if(full||!S.P)S.P={know:new Set(),runs:0,total:0,history:[],startAt:startAt||S.G.start};
  if(startAt)S.P.startAt=startAt;newRun();
}
export function newRun(){
  S.P.runs++;Object.assign(S.P,{used:new Set(),items:new Map(),money:S.G.startMoney,runClues:new Set(),belief:2,believed:{},blog:[],t:0,path:[],end:null,lastChoice:null});
  enterNode(S.G.nodes[S.P.startAt]?S.P.startAt:S.G.start);
}
export const known=c=>S.P.know.has(c)||S.P.runClues.has(c);
export function enterNode(id){
  const n=S.G.nodes[id];S.P.node=id;if(!n){S.P.end={lost:true};renderPlay(true);return}
  S.P.t+=n.time;S.P.path.push(id);
  if(n.type==='death'||n.type==='ending'){
    if(n.type==='death'&&n.deathClue){S.P.newDeathClue=!known(n.deathClue)?n.deathClue:'';S.P.runClues.add(n.deathClue)}else S.P.newDeathClue='';
    S.P.runClues.forEach(c=>S.P.know.add(c));S.P.total+=S.P.t;S.P.end={type:n.type,true:n.type==='ending'&&n.ending==='true'};
    S.P.history.push({run:S.P.runs,title:n.title,kind:n.type==='death'?'死亡':(n.ending==='true'?'真结局':'坏结局'),t:S.P.t});
  }
  persistRun();
  renderPlay(true);
}
export const coinSvg='<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#b8863a" stroke="#f0c77e" stroke-width="1.4"/><rect x="7.5" y="7.5" width="5" height="5" fill="#3a2c1c"/></svg>';
export const candle=on=>`<svg class="${on?'on':'off'}" width="16" height="30" viewBox="0 0 16 30" aria-hidden="true"><path class="flame" d="M8,1 C11,6 11,9 8,11 C5,9 5,6 8,1 Z" fill="#f0c77e" style="filter:drop-shadow(0 0 4px #f0a040)"/><rect x="5" y="12" width="6" height="16" rx="1" fill="${on?'#e8e0cf':'#4a5160'}"/><rect x="3" y="27" width="10" height="2.5" rx="1" fill="#6e5326"/></svg>`;
export function renderHud(n){
  $('#hud').innerHTML=`<div class="loc"><h2>${esc(n?n.title:'迷失')}</h2><span>第<b class="num">${S.P.runs}</b>次轮回，本轮已过 ${fmtMin(S.P.t)}</span></div>
    <div class="hudr"><div class="purse" title="${esc(S.G.currency)}" aria-label="${esc(S.G.currency)} ${S.P.money}">${coinSvg}<b class="num">${S.P.money}</b></div><div class="candles" title="信念：每局 2 次相信残响的机会" aria-label="剩余信念 ${S.P.belief}">${[0,1].map(i=>candle(i<S.P.belief)).join('')}</div>${S.mode==='game'?'<button class="hud-menu" data-act="pause" aria-label="打开菜单" title="菜单（Esc）"><svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true"><path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>':''}</div>`;
}
export function renderStage(n){
  const st=$('#stage');st.classList.toggle('dead',!!S.P.end&&n&&n.type==='death');st.classList.toggle('won',!!S.P.end&&!!S.P.end.true);
  renderHud(n);
  const sky=$('#sky'),v=$('#verdict');
  $('#pad').hidden=!!S.P.end;document.querySelector('.pad-act').hidden=!!S.P.end;
  if(S.P.end){sky.innerHTML='';const k=S.P.end.true?['w','通关']:n&&n.type==='death'?['d','死']:['b','轮回'];v.innerHTML=`<div class="${k[0]}">${k[1]}</div>`;v.hidden=false}
  else{v.hidden=true;
    const bel=S.P.believed[S.P.node]||new Set();const ech=(n.echoes||[]).map((e,i)=>({e,i})).filter(o=>!bel.has(o.i));
    sky.innerHTML=ech.map(({e,i},k)=>{const dur=17+(k%3)*4+(e.text.length%5);return `<div class="fly" style="top:${(k%3)*36}px;--dur:${dur}s;--del:${-((k*dur*.37)+dur*.15).toFixed(1)}s"><span>${esc(e.text)}</span><button class="like${LIKED.has(e.id)?' on':''}" data-like="${i}" aria-pressed="${LIKED.has(e.id)}" aria-label="点赞"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg><b class="num">${e.likes||0}</b></button><button data-believe="${i}"${S.P.belief<=0?' disabled':''}>${S.P.belief>0?'相信':'信念耗尽'}</button></div>`}).join('')}
}
/** 逐字显示正文，速度取决于玩家设置；点击文字可以立即显示全部。 */
export function typewrite(el,text){
  clearInterval(twT);
  const speed=TEXT_SPEEDS[SETTINGS.textSpeed]||TEXT_SPEEDS.normal;
  if(isReduced()||!Number.isFinite(speed.step)){el.textContent=text;return}
  let i=0;
  el.textContent='';
  const caret=document.createElement('span');
  caret.className='caret';caret.textContent='▍';
  const done=()=>{clearInterval(twT);el.textContent=text};
  el.onclick=done;
  twT=setInterval(()=>{
    i+=speed.step;
    if(i>=text.length){done();return}
    el.textContent=text.slice(0,i);el.appendChild(caret);
  },speed.ms);
}
export function dialogScene(n){
  const bel=S.P.believed[S.P.node]||new Set();const trusted=[...bel].map(i=>n.echoes[i]).filter(Boolean);
  const hidden=n.options.filter(o=>o.needClue&&!known(o.needClue)).length;
  return `<p class="stext" id="stext"></p>
  ${trusted.length?`<div class="trusted">${trusted.map(e=>`<span>你相信了：${esc(e.text)}</span>`).join('')}</div>`:''}
  ${!n.options.length?'<div class="ghost">这个场景里没有任何可以互动的东西，剧情在这里断了。去“剧情编织”补上。</div>':''}
  <p class="nudge" id="nudge" aria-live="polite">${esc(GM.nudge)}</p>
  <div class="ctl"><kbd>←</kbd><kbd>→</kbd>或<kbd>A</kbd><kbd>D</kbd>移动，<kbd>空格</kbd>与附近的东西互动${S.mode==='game'?'，<kbd>Esc</kbd>打开菜单':''}。悬停飞过的残响可以让它停下。${hidden?`雾里还有 ${hidden} 处你暂时看不懂的东西。`:''}</div>`;
}
export const shardIcon='<svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true"><path d="M13,1 L24,13 L13,33 L2,13 Z" fill="#1a2340" stroke="#8eaeea" stroke-width="1.6"/><path d="M13,1 L13,33 M2,13 L24,13" stroke="#8eaeea" stroke-width=".8" opacity=".6"/></svg>';
export function dialogEnd(){
  const n=S.G.nodes[S.P.node];
  if(!n)return `<p class="stext">这条路通向一个不存在的地方，你迷失在雾里。</p><div class="endbtns"><button class="btn gold" data-act="next">开始下一轮</button></div>`;
  const truth='';
  let tail='';
  if(S.P.end.true){tail=`<p class="note">你一共经历了 <b class="num">${S.P.runs}</b> 次轮回，累计约 <b class="num">${fmtMin(S.P.total)}</b>。</p><div class="endbtns"><button class="btn gold" data-act="restart">清空记忆，从头再来</button><button class="btn" data-act="next">带着记忆再走一次</button></div>`}
  else{
    const lc=S.P.lastChoice&&S.G.nodes[S.P.lastChoice.node];
    tail=lc?`<div class="carve"><h4>在「${esc(lc.title)}」刻下一句残响</h4>
      <p class="hint">后来的人会看见它飘过。你可以说真话，也可以骗人。</p>
      <div class="row"><label class="f">关于哪件事<select id="wOpt">${lc.options.map((o,j)=>`<option value="${j}"${j===S.P.lastChoice.idx?' selected':''}>${esc(o.text)}</option>`).join('')}</select></label>
      <label class="f">你要说<select id="wKind"><option value="avoid">别这么做</option><option value="go">就这么做</option></select></label></div>
      <label class="f">残响内容（留空则自动生成）<input id="wText" maxlength="40" placeholder="比如：门后有人在等你"></label>
      <div class="endbtns"><button class="btn gold" data-act="write">刻下残响，进入第 ${S.P.runs+1} 次轮回</button><button class="btn" data-act="next">什么也不留</button></div></div>`
      :`<div class="endbtns"><button class="btn gold" data-act="next">进入第 ${S.P.runs+1} 次轮回</button></div>`;
  }
  return `<p class="stext" id="stext"></p>
  ${S.P.newDeathClue?`<div class="shard">${shardIcon}<div>记忆碎片：<b>${esc(S.G.clues[S.P.newDeathClue])}</b><br><span class="hint">下一轮你会记得。</span></div></div>`:''}${truth}${tail}`;
}
export function sideHTML(){
  const allC=[...new Set([...S.P.know,...S.P.runClues])];const items=[...S.P.items.entries()].filter(e=>e[1]>0);
  return `<div class="slab"><h3>行囊</h3><div class="slots">${Array.from({length:Math.max(4,items.length)},(_,i)=>items[i]?`<div class="slot">${esc(S.G.items[items[i][0]]||items[i][0])}${items[i][1]>1?`<em class="num">×${items[i][1]}</em>`:''}</div>`:'<div class="slot e">空</div>').join('')}</div>
  <div class="money">${coinSvg}<span>${esc(S.G.currency)}</span><b class="num">${S.P.money}</b></div><p class="hint" style="margin-top:8px">道具和${esc(S.G.currency)}在轮回中都会丢失。</p></div>
  <div class="slab"><h3>记忆</h3>${allC.length?`<ul class="journal">${allC.map(c=>{const isNew=!S.P.know.has(c)||(S.P.end&&S.P.newDeathClue===c);return `<li class="${isNew?'new':''}">${esc(S.G.clues[c]||c)}<small>${isNew?'这一轮得知':'来自前世的记忆'}</small></li>`}).join('')}</ul>`:'<p class="empty">你什么都不记得。</p>'}</div>
  <div class="slab"><h3>足迹</h3><ol class="steps">${S.P.path.map(id=>`<li>${esc(S.G.nodes[id]?.title||id)}</li>`).join('')}</ol></div>
  <div class="slab"><h3>轮回记录</h3>${S.P.history.length?`<ul class="loops">${S.P.history.map(h=>`<li><span class="${h.kind==='死亡'?'d':h.kind==='真结局'?'w':'b'}">第 ${h.run} 次，${h.kind}于${esc(h.title)}</span><small class="num">${(h.t/60).toFixed(1)} 分</small></li>`).join('')}</ul>`:'<p class="empty">这是你的第一次。</p>'}
  ${S.mode==='game'?'':'<button class="btn small" data-act="restart" style="margin-top:12px">清空记忆重来</button>'}</div>`;
}
export function renderPlay(newScene){
  if($('#v-play').hidden)return;
  const n=S.G.nodes[S.P.node];if(newScene){GM.nudge=S.P.gainNote||'';S.P.gainNote=''}
  renderStage(n);buildScene(newScene||!GM.bg);
  $('#dialog').innerHTML=S.P.end?dialogEnd():dialogScene(n);
  $('#pside').innerHTML=sideHTML();
  const el=$('#stext');if(el)typewrite(el,n?n.text:'');
  startGame();
}
$('#v-play').addEventListener('click',e=>{
  const lk=e.target.closest('[data-like]');
  if(lk){const ec=S.G.nodes[S.P.node].echoes[+lk.dataset.like];if(!ec)return;if(!ec.id)ec.id=newEchoId();
    if(LIKED.has(ec.id)){LIKED.delete(ec.id);ec.likes=Math.max(0,(ec.likes||0)-1)}else{LIKED.add(ec.id);ec.likes=(ec.likes||0)+1}
    saveLiked();save();lk.classList.toggle('on',LIKED.has(ec.id));lk.setAttribute('aria-pressed',LIKED.has(ec.id));lk.querySelector('b').textContent=ec.likes;
    emit('echo-liked',S.P.node);return}
  const bl=e.target.closest('[data-believe]'),a=e.target.closest('[data-act]');
  if(bl&&S.P.belief>0){const i=+bl.dataset.believe;const n=S.G.nodes[S.P.node];const ec=n.echoes[i];const s=S.P.believed[S.P.node]=S.P.believed[S.P.node]||new Set();if(s.has(i))return;
    s.add(i);S.P.belief--;S.P.blog.push({text:ec.text,honest:ec.honest});if(ec.teach)S.P.runClues.add(ec.teach);persistRun();
    renderStage(n);refreshObjs();$('#dialog').innerHTML=dialogScene(n);$('#stext').textContent=n.text;$('#pside').innerHTML=sideHTML();return}
  const mi=e.target.closest('[data-mi]');if(mi){menuChoose(+mi.dataset.mi);return}
  if(e.target.closest('[data-pad="act"]')){interact();return}
  if(!a)return;
  if(a.dataset.act==='pause'){emit('pause-request');return}
  if(a.dataset.act==='next')newRun();
  if(a.dataset.act==='restart')playReset(true);
  if(a.dataset.act==='write'){const lc=S.G.nodes[S.P.lastChoice.node];const j=+$('#wOpt').value,kind=$('#wKind').value,hon=isHonest(S.G,lc.options[j],kind);
    const txt=$('#wText').value.trim()||(kind==='avoid'?`别「${lc.options[j].text}」`:`「${lc.options[j].text}」就对了`);
    lc.echoes.push({text:txt,target:j,honest:hon,kind,teach:'',by:'play',likes:0,id:newEchoId()});save();emit('story-changed',S.P.lastChoice.node);newRun()}
});
(function padSetup(){
  const pad=$('#pad');const set=(e,v)=>{const b=e.target.closest('[data-pad]');if(!b)return;e.preventDefault();if(v)closeMenu();GM.keys[b.dataset.pad]=v};
  pad.addEventListener('pointerdown',e=>{set(e,true);e.target.closest('[data-pad]')?.setPointerCapture?.(e.pointerId)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>pad.addEventListener(ev,e=>set(e,false)));
})();
export const typing=()=>/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
document.addEventListener('keydown',e=>{
  if($('#v-play').hidden||!S.P||S.paused||typing())return;const k=e.key;
  if(GM.menu){
    if(k==='ArrowUp'||k==='w'||k==='W'){menuMove(-1);e.preventDefault()}
    else if(k==='ArrowDown'||k==='s'||k==='S'){menuMove(1);e.preventDefault()}
    else if(k===' '||k==='Enter'||k==='e'||k==='E'){e.preventDefault();if(!e.repeat)menuChoose()}
    else if(k==='Escape'){closeMenu();e.preventDefault()}
    else if(k==='ArrowLeft'||k==='ArrowRight'||k==='a'||k==='A'||k==='d'||k==='D'){closeMenu();e.preventDefault()}
    else if(/^[1-9]$/.test(k)){menuChoose(+k-1);e.preventDefault()}
    return}
  if(k==='Escape'){emit('pause-request');e.preventDefault();return}
  if(k==='ArrowLeft'||k==='a'||k==='A'){GM.keys.l=true;e.preventDefault()}
  else if(k==='ArrowRight'||k==='d'||k==='D'){GM.keys.r=true;e.preventDefault()}
  else if((k===' '||k==='Spacebar'||k==='e'||k==='E')&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat)interact()}
});
document.addEventListener('keyup',e=>{const k=e.key;if(k==='ArrowLeft'||k==='a'||k==='A')GM.keys.l=false;if(k==='ArrowRight'||k==='d'||k==='D')GM.keys.r=false});
addEventListener('blur',()=>{GM.keys.l=GM.keys.r=false});
addEventListener('resize',()=>{if(!$('#v-play').hidden&&S.P){const ratio=GM.WW?GM.px/GM.WW:0;buildScene(false);GM.px=ratio*GM.WW||GM.px}});
$('#stage').addEventListener('pointerdown',e=>{if(!e.target.closest('button'))document.activeElement?.blur?.()});
