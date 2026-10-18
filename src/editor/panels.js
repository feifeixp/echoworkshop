/* 剧情检查面板、道具与线索面板 */
import {$,esc} from '../app/dom.js';
import {S} from '../app/store.js';
import {analyze} from '../core/analysis.js';
import {NW} from '../core/layout.js';
import {drawDesign} from './graph.js';
import {changed,renderInspector,renderInspectorSoft} from './inspector.js';

export let lastA=null,pop=null;
export const openX=new Set();
export function renderChecks(){
  const a=lastA=analyze(S.G);
  const errs=a.issues.filter(i=>i.lv==='err').length,warns=a.issues.filter(i=>i.lv==='warn').length;
  const b=$('#chkBtn');b.className='status'+(errs?' err':warns?' warn':'');
  b.innerHTML=`<i></i>${errs?`${errs} 个错误`:warns?`${warns} 个提醒`:'剧情没有问题'}<small>最少 ${a.minRuns??'—'} 局可通关</small>`;
  if(pop==='chk')renderPop();
}
export function checksHTML(){
  const a=lastA;const errs=a.issues.filter(i=>i.lv==='err').length,warns=a.issues.filter(i=>i.lv==='warn').length;
  return `<div class="ph"><h3>剧情检查</h3><button class="iconbtn" data-act="closePop" aria-label="关闭">×</button></div>
  <div class="metrics">
    <div class="metric"><div class="v num">${a.counts.nodes}</div><div class="k">节点</div></div>
    <div class="metric"><div class="v num">${a.counts.ends}/${a.counts.deaths}</div><div class="k">结局 / 死亡</div></div>
    <div class="metric"><div class="v num">${a.counts.echoes}</div><div class="k">残响</div></div>
    <div class="metric"><div class="v num">${a.minRuns??'—'}</div><div class="k">理论最少局数</div></div>
    <div class="metric"><div class="v num">${a.fast?(a.fast.time/60).toFixed(1):'—'}</div><div class="k">最快通关（分钟）</div></div>
  </div>
  <ul class="chk">${!errs&&!warns?'<li><span class="pill ok">通过</span>没有发现死局、断链或拿不到的道具与线索。</li>':''}
  ${a.issues.map(i=>`<li><span class="pill ${i.lv}">${i.lv==='err'?'错误':'提醒'}</span><span>${i.id?`<a data-goto="${esc(i.id)}">${esc(i.msg)}</a>`:esc(i.msg)}</span></li>`).join('')}
  ${a.minRuns?`<li><span class="pill ok">可解</span><span>真结局理论上第 ${a.minRuns} 局就能达成（需要每一步都选对）。实际要几局，去“命运推演”看。</span></li>`:''}</ul>`;
}
export function libHTML(){
  const block=(kind,label,note,ph)=>`<div><h4>${label}<small>${note}</small></h4>${Object.entries(S.G[kind]).map(([k,v])=>`<div class="row"><input data-lib="${kind}" data-k="${esc(k)}" value="${esc(v)}" aria-label="${label}"><button class="iconbtn" data-act="delLib" data-kind="${kind}" data-k="${esc(k)}" aria-label="删除">×</button></div>`).join('')||'<p class="empty">还没有</p>'}
  <div class="row"><input id="new-${kind}" placeholder="${ph}"><button class="btn small" data-act="addLib" data-kind="${kind}">添加</button></div></div>`;
  return `<div class="ph"><h3>道具与线索</h3><button class="iconbtn" data-act="closePop" aria-label="关闭">×</button></div>
  <div class="libgrid"><div><h4>货币<small>死后清零，每局从开局数量开始</small></h4><div class="row"><input data-cur="currency" value="${esc(S.G.currency)}" aria-label="货币名称"><input data-cur="startMoney" type="number" min="0" value="${S.G.startMoney}" aria-label="开局数量" style="max-width:96px" title="开局数量"></div><p class="hint">左边是名称，右边是每局开局时身上有多少。</p></div>${block('items','道具','可叠加，死后丢失','新道具名称')}${block('clues','线索','跨局保留的记忆','新线索内容')}</div>`;
}
export function renderPop(){const p=$('#pop');if(!pop){p.hidden=true;p.innerHTML='';return}p.hidden=false;p.innerHTML=pop==='chk'?checksHTML():libHTML()}
export function renderLib(){renderPop()}
$('#chkBtn').onclick=()=>{pop=pop==='chk'?null:'chk';renderPop()};
$('#libBtn').onclick=()=>{pop=pop==='lib'?null:'lib';renderPop()};
$('#pop').addEventListener('input',e=>{const t=e.target;if(t.dataset.cur){S.G[t.dataset.cur]=t.dataset.cur==='startMoney'?Math.max(0,+t.value||0):t.value;renderInspectorSoft();changed(true);return}if(t.dataset.lib){S.G[t.dataset.lib][t.dataset.k]=t.value;renderInspectorSoft();changed(true)}});
$('#pop').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id&&e.target.id.startsWith('new-')){e.preventDefault();e.target.nextElementSibling.click()}});
$('#pop').addEventListener('click',e=>{
  const g=e.target.closest('[data-goto]');
  if(g){S.sel=g.dataset.goto;pop=null;renderPop();renderInspector();drawDesign();
    const n=S.G.nodes[S.sel];const w=$('#gWrap');w.scrollTo({left:n.x*S.zoom-w.clientWidth/2+NW*S.zoom/2,top:n.y*S.zoom-w.clientHeight/2,behavior:'smooth'});return}
  const b=e.target.closest('[data-act]');if(!b)return;const kind=b.dataset.kind;
  if(b.dataset.act==='closePop'){pop=null;renderPop();return}
  if(b.dataset.act==='addLib'){const v=$('#new-'+kind).value.trim();if(!v)return;let i=1,p=kind==='items'?'i':'c';while(S.G[kind][p+i])i++;S.G[kind][p+i]=v}
  if(b.dataset.act==='delLib'){const k=b.dataset.k;delete S.G[kind][k];
    for(const n of Object.values(S.G.nodes)){n.options.forEach(o=>{if(kind==='items'){if(o.needItem===k)o.needItem='';if(o.gainItem===k)o.gainItem=''}else{['needClue','hintClue','gainClue'].forEach(f=>{if(o[f]===k)o[f]=''})}});
      if(kind==='clues'){if(n.deathClue===k)n.deathClue='';n.echoes.forEach(e=>{if(e.teach===k)e.teach=''})}}}
  renderPop();renderInspector();changed();
  if(b.dataset.act==='addLib')$('#new-'+kind)?.focus();
});
