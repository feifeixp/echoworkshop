/* 剧情地图自动布局：分层 + 重心排序 + 保序回归错开分支 */

export const NW=184,NH=58;
export const COLW=222,ROWN=92,ROWD=30;
export function computeLayout(G){
  const Nn=G.nodes,ids=Object.keys(Nn);
  /* 1. 深度优先得到顺序，并区分前向边和回边 */
  const st={},order=[],pre=[];
  const dfs=id=>{st[id]=1;pre.push(id);for(const o of Nn[id].options||[]){if(Nn[o.goto]&&!st[o.goto])dfs(o.goto)}order.push(id)};
  if(Nn[G.start])dfs(G.start);ids.forEach(id=>{if(!st[id])dfs(id)});
  order.reverse();const pos={};order.forEach((id,i)=>pos[id]=i);
  const L={};ids.forEach(id=>L[id]=0);
  order.forEach(u=>{for(const o of Nn[u].options||[]){const t=o.goto;if(Nn[t]&&t!==u&&pos[t]>pos[u])L[t]=Math.max(L[t],L[u]+1)}});
  /* 2. 跨层的边插入占位点，让长连线也有自己的“车道” */
  const preds=new Map(),succs=new Map(),layerOf=new Map(),real=new Set(ids);const link=(a,b)=>{preds.get(b).push(a);succs.get(a).push(b)};
  const add=(e,l)=>{layerOf.set(e,l);preds.set(e,[]);succs.set(e,[])};
  pre.forEach(id=>add(id,L[id]));
  const seen=new Set(),chains={};
  pre.forEach(u=>(Nn[u].options||[]).forEach(o=>{const t=o.goto;if(!Nn[t]||L[t]<=L[u])return;const k=u+'>'+t;if(seen.has(k))return;seen.add(k);
    let prev=u;const ch=[];for(let l=L[u]+1;l<L[t];l++){const d='~'+k+'#'+l;add(d,l);link(prev,d);ch.push(d);prev=d}link(prev,t);chains[k]=ch}));
  const maxL=Math.max(0,...layerOf.values());const layer=Array.from({length:maxL+1},()=>[]);
  for(const [e,l] of layerOf)layer[l].push(e);
  /* 3. 重心法排序，减少连线交叉 */
  const idx=new Map();const reidx=()=>layer.forEach(a=>a.forEach((e,i)=>idx.set(e,i)));reidx();
  const bary=(e,nb)=>{const ns=nb.get(e);return ns.length?ns.reduce((s,x)=>s+idx.get(x),0)/ns.length:idx.get(e)};
  for(let it=0;it<10;it++){
    for(let l=1;l<=maxL;l++){layer[l]=layer[l].map(e=>[e,bary(e,preds)]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);layer[l].forEach((e,i)=>idx.set(e,i))}
    for(let l=maxL-1;l>=0;l--){layer[l]=layer[l].map(e=>[e,bary(e,succs)]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);layer[l].forEach((e,i)=>idx.set(e,i))}
  }
  /* 4. 纵向坐标：每个点尽量对齐它的上下游，同层之间保持间距（保序回归） */
  const size=e=>real.has(e)?ROWN:ROWD,y=new Map();
  layer.forEach(a=>{let c=0;a.forEach((e,i)=>{if(i)c+=(size(a[i-1])+size(e))/2;y.set(e,c)})});
  const place=(a,want)=>{if(!a.length)return;const off=[0];for(let i=1;i<a.length;i++)off.push(off[i-1]+(size(a[i-1])+size(a[i]))/2);
    const bl=[];a.forEach((e,i)=>{bl.push({v:want(e)-off[i],w:real.has(e)?1:.6,n:1});while(bl.length>1&&bl[bl.length-2].v>bl[bl.length-1].v){const q=bl.pop(),p=bl.pop();bl.push({v:(p.v*p.w+q.v*q.w)/(p.w+q.w),w:p.w+q.w,n:p.n+q.n})}});
    let i=0;bl.forEach(b=>{for(let k=0;k<b.n;k++,i++)y.set(a[i],b.v+off[i])})};
  const avg=(e,nb)=>{const ns=nb.get(e);return ns.length?ns.reduce((s,x)=>s+y.get(x),0)/ns.length:y.get(e)};
  for(let it=0;it<8;it++){
    for(let l=1;l<=maxL;l++)place(layer[l],e=>avg(e,preds));
    for(let l=maxL-1;l>=0;l--)place(layer[l],e=>avg(e,succs));
  }
  const top=Math.min(...y.values());const Y=e=>Math.round(y.get(e)-top+44+NH/2);
  const out={pos:{},routes:{}};
  ids.forEach(id=>out.pos[id]={x:30+L[id]*COLW,y:Y(id)-NH/2});
  for(const [k,ch] of Object.entries(chains))out.routes[k]=ch.map(d=>({x:30+layerOf.get(d)*COLW,y:Y(d)}));
  return out;
}
export const smooth=pts=>{let d=`M${pts[0].x},${pts[0].y}`;for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i],mx=(p.x+q.x)/2;d+=p.y===q.y?` L${q.x},${q.y}`:` C${mx},${p.y} ${mx},${q.y} ${q.x},${q.y}`}return d};
