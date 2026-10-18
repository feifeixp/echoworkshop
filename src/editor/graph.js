/* 剧情地图 SVG 绘制、缩放、拖动 */
import {$,esc} from '../app/dom.js';
import {S,save} from '../app/store.js';
import {NH,NW,smooth} from '../core/layout.js';
import {TYPES} from '../core/story.js';
import {renderInspector} from './inspector.js';
import {routeFor} from './routes.js';

export const ICON={
  story:'<path class="ic" d="M-6,-7 h12 v14 h-12 z"/><path class="ic-cut" d="M-3.5,-3.5 h7 v1.3 h-7 z M-3.5,0 h7 v1.3 h-7 z M-3.5,3.5 h4.5 v1.3 h-4.5 z"/>',
  choice:'<path class="ic" d="M0,-8 L8,0 L0,8 L-8,0 Z"/><path class="ic-cut" d="M0,-3.5 L3.5,0 L0,3.5 L-3.5,0 Z"/>',
  check:'<path class="ic" d="M-8,0 Q0,-9 8,0 Q0,9 -8,0 Z"/><circle class="ic-cut" r="3"/>',
  rest:'<path class="ic" d="M0,-8 C5,-2 5,4 0,8 C-5,4 -5,-2 0,-8 Z"/><path class="ic-cut" d="M0,0 C2,2 2,5 0,6 C-2,5 -2,2 0,0 Z"/>',
  death:'<circle class="ic" cy="-1.5" r="7"/><rect class="ic" x="-4" y="3" width="8" height="5" rx="1"/><circle class="ic-cut" cx="-2.6" cy="-1.5" r="2"/><circle class="ic-cut" cx="2.6" cy="-1.5" r="2"/>',
  ending:'<path class="ic" d="M0,-8 L2.3,-2.4 L8,-2.4 L3.4,1.2 L5.2,7.2 L0,3.6 L-5.2,7.2 L-3.4,1.2 L-8,-2.4 L-2.3,-2.4 Z"/>'
};
export function graphSVG({heat=null,selId=null,hlSet=null}){
  const Nn=S.G.nodes;let W=400,H=200;
  for(const n of Object.values(Nn)){W=Math.max(W,n.x+NW+40);H=Math.max(H,n.y+NH+90)}
  const pairs={};const edges=[];
  for(const [id,n] of Object.entries(Nn))(n.options||[]).forEach((o,i)=>{if(!Nn[o.goto])return;const k=id+'>'+o.goto;(pairs[k]=pairs[k]||[]).push({id,i,o})});
  for(const list of Object.values(pairs))list.forEach((e,j)=>{
    const a=Nn[e.id],b=Nn[e.o.goto];const off=(j-(list.length-1)/2)*9;let d;
    if(e.id===e.o.goto){const x0=a.x+NW-58+j*14,y0=a.y+NH;d=`M${x0},${y0} C${x0},${y0+34} ${x0+30},${y0+34} ${x0+30},${y0+8}`}
    else if(b.x>a.x+20){const r=routeFor(e.id,e.o.goto);
      const p0={x:a.x+NW,y:a.y+NH/2+off},pN={x:b.x-7,y:b.y+NH/2+off*.5};
      if(r&&r.length){const pts=[p0];r.forEach(q=>{pts.push({x:q.x-8,y:q.y+off},{x:q.x+NW+8,y:q.y+off})});pts.push(pN);d=smooth(pts)}
      else d=smooth([p0,pN])}
    else{const x1=a.x+NW/2+off,y1=a.y+NH,x2=b.x+NW/2+off,y2=b.y+NH+7,dy=Math.max(y1,y2)+46;d=`M${x1},${y1} C${x1},${dy} ${x2},${dy} ${x2},${y2}`}
    let cls='edge',mk='mN';
    if(e.o.needClue){cls+=' e-clue';mk='mC'}else if(e.o.needItem||+e.o.costMoney>0){cls+=' e-item';mk='mI'}else if(b.type==='death'){cls+=' e-death';mk='mD'}
    if(hlSet&&hlSet.edges.has(e.id+'>'+e.o.goto)){cls+=' hl';mk='mI'}
    edges.push(`<path class="${cls}" d="${d}" marker-end="url(#${mk})"><title>${esc(e.o.text)}</title></path>`);
  });
  const nodes=Object.entries(Nn).map(([id,n])=>{
    const t=n.title.length>9?n.title.slice(0,9)+'…':n.title;
    let sub=`${TYPES[n.type]}，约 ${n.time} 秒`;
    if(n.type==='ending')sub=n.ending==='true'?'真结局':'坏结局';
    if(n.type==='death')sub=n.deathClue?'死亡，揭示线索':'死亡';
    let extra='';
    if(heat){const v=heat.visit[id]||0;extra=`<rect class="heat" width="${NW}" height="${NH}" rx="3" opacity="${(0.05+0.6*v).toFixed(2)}"/>`;
      sub=n.type==='death'?`死亡 ${heat.deaths[id]||0} 次`:`${(v*100).toFixed(0)}% 的局到过这里`}
    const ec=(n.echoes||[]).length;
    const badge=ec&&!heat?`<g class="badge" transform="translate(${NW-44},-9)"><rect width="40" height="18" rx="9"/><text x="20" y="13" text-anchor="middle">残响 ${ec}</text></g>`:'';
    const start=id===S.G.start?`<text class="start" x="2" y="-9">起点</text>`:'';
    const cls=`node t-${n.type}${id===selId?' sel':''}${hlSet&&hlSet.nodes.has(id)?' hl':''}`;
    return `<g class="${cls}" data-id="${esc(id)}" transform="translate(${n.x},${n.y})">${start}<rect class="nb" width="${NW}" height="${NH}" rx="3"/>${extra}<g transform="translate(20,${NH/2})">${ICON[n.type]||ICON.story}</g><text class="nt" x="38" y="25">${esc(t)}</text><text class="${heat?'hv':'ns'}" x="38" y="44">${esc(sub)}</text>${badge}</g>`;
  }).join('');
  const mk=(id,c)=>`<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" style="fill:${c}"/></marker>`;
  return {W,H,inner:`<defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>${mk('mN','#5d667a')}${mk('mI','var(--gold)')}${mk('mC','var(--rune)')}${mk('mD','var(--blood)')}</defs><g>${edges.join('')}</g><g>${nodes}</g>`};
}
export function drawDesign(){
  const svg=$('#gsvg');const g=graphSVG({selId:S.sel,hlSet:S.hl});
  svg.setAttribute('viewBox',`0 0 ${g.W} ${g.H}`);svg.setAttribute('width',g.W*S.zoom);svg.setAttribute('height',g.H*S.zoom);
  svg.innerHTML=g.inner;$('#zVal').textContent=Math.round(S.zoom*100)+'%';
}
export function fitZoom(){
  const w=$('#gWrap').clientWidth||800;let W=400;for(const n of Object.values(S.G.nodes))W=Math.max(W,n.x+NW+40);
  S.zoom=Math.max(.4,Math.min(1,(w-8)/W));drawDesign();
}
(function dragSetup(){
  const svg=$('#gsvg');let drag=null;
  svg.addEventListener('pointerdown',e=>{const nd=e.target.closest('.node');if(!nd)return;const id=nd.dataset.id;const n=S.G.nodes[id];
    drag={id,sx:e.clientX,sy:e.clientY,ox:n.x,oy:n.y,moved:false};svg.setPointerCapture(e.pointerId)});
  svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=(e.clientX-drag.sx)/S.zoom,dy=(e.clientY-drag.sy)/S.zoom;
    if(!drag.moved&&Math.hypot(dx,dy)<4)return;drag.moved=true;const n=S.G.nodes[drag.id];n.x=Math.max(0,Math.round(drag.ox+dx));n.y=Math.max(18,Math.round(drag.oy+dy));drawDesign()});
  const up=()=>{if(!drag)return;if(!drag.moved){S.sel=drag.id;renderInspector();drawDesign()}else save();drag=null};
  svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
})();
