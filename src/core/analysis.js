/* 剧情检查：可达性、可解性、最快通关路径 */
import {MONEY_CAP,QTY_CAP,applyOpt,canTake} from './story.js';

export function search(G,K){
  const Nn=G.nodes;const res={ends:new Set(),clues:new Set(K),best:null,reached:new Set()};if(!Nn[G.start])return res;
  const enc=(id,it,m,cl,u)=>id+'|'+[...it].filter(e=>e[1]>0).sort().map(e=>e[0]+':'+e[1]).join(',')+'|'+m+'|'+[...cl].sort().join(',')+'|'+[...u].sort().join(',');
  const dist=new Map(),prev=new Map(),pq=[];
  const s0={id:G.start,it:new Map(),m:Math.min(MONEY_CAP,G.startMoney),cl:new Set(K),u:new Set()},k0=enc(s0.id,s0.it,s0.m,s0.cl,s0.u);dist.set(k0,Nn[G.start].time);pq.push([Nn[G.start].time,k0,s0]);
  let count=0;
  while(pq.length&&count<40000){
    pq.sort((a,b)=>a[0]-b[0]);const [d,k,st]=pq.shift();if(d>dist.get(k))continue;count++;
    const n=Nn[st.id];res.reached.add(st.id);st.cl.forEach(c=>res.clues.add(c));
    if(n.type==='death'){if(n.deathClue)res.clues.add(n.deathClue);continue}
    if(n.type==='ending'){res.ends.add(st.id);if(n.ending==='true'&&!res.best)res.best={time:d,key:k};continue}
    (n.options||[]).forEach((o,oi)=>{const t=Nn[o.goto];if(!t)return;const uk=st.id+':'+oi;if(o.once&&st.u.has(uk))return;if(!canTake(o,st.it,st.m))return;if(o.needClue&&!st.cl.has(o.needClue))return;
      const it=new Map(st.it);let m=applyOpt(o,it,st.m);m=Math.min(MONEY_CAP,m);it.forEach((q,key)=>it.set(key,Math.min(QTY_CAP,q)));
      const cl=new Set(st.cl);if(o.gainClue)cl.add(o.gainClue);
      const u=o.once?new Set([...st.u,uk]):st.u;const nk=enc(o.goto,it,m,cl,u),nd=d+6+t.time;if(!dist.has(nk)||nd<dist.get(nk)){dist.set(nk,nd);prev.set(nk,k);pq.push([nd,nk,{id:o.goto,it,m,cl,u}])}});
  }
  if(res.best){const path=[];let k=res.best.key;while(k){path.unshift(k.split('|')[0]);k=prev.get(k)}res.best.path=path}
  return res;
}
export function analyze(G){
  const Nn=G.nodes,out=[];const add=(lv,msg,id)=>out.push({lv,msg,id});
  if(!Nn[G.start])add('err','起点节点不存在，请在某个节点上点“设为起点”');
  const itemSrc=new Set(),clueSrc=new Set();
  for(const n of Object.values(Nn)){(n.options||[]).forEach(o=>{if(o.gainItem)itemSrc.add(o.gainItem);if(o.gainClue)clueSrc.add(o.gainClue)});
    if(n.type==='death'&&n.deathClue)clueSrc.add(n.deathClue);(n.echoes||[]).forEach(e=>{if(e.teach)clueSrc.add(e.teach)})}
  let silentDeaths=0;const hasMoneySrc=Object.values(Nn).some(n=>(n.options||[]).some(o=>+o.gainMoney>0));
  for(const [id,n] of Object.entries(Nn)){
    const term=n.type==='death'||n.type==='ending';const ops=n.options||[];
    if(!term&&!ops.length)add('err',`「${n.title}」没有任何选项，玩家会卡在这里`,id);
    ops.forEach(o=>{
      if(!Nn[o.goto])add('err',`「${n.title}」的选项「${o.text||'未命名'}」没有指向任何节点`,id);
      if(o.needItem&&!itemSrc.has(o.needItem))add('err',`「${o.text}」需要「${G.items[o.needItem]||'?'}」，但剧情里没有地方能拿到`,id);
      if(+o.costMoney>G.startMoney&&!hasMoneySrc)add('err',`「${o.text}」要花 ${o.costMoney} ${G.currency}，但开局只有 ${G.startMoney}，剧情里也没有赚钱的地方`,id);
      if(o.needClue&&!clueSrc.has(o.needClue))add('err',`「${o.text}」需要知道「${G.clues[o.needClue]||'?'}」，但没有任何来源`,id);
    });
    if(!term&&ops.length&&ops.every(o=>o.needItem||o.needClue))add('warn',`「${n.title}」的所有选项都上了锁，条件不够的玩家会卡住`,id);
    (n.echoes||[]).forEach(e=>{if(e.target>=ops.length)add('warn',`「${n.title}」有一条残响指向了不存在的选项`,id)});
    if(n.type==='death'&&!n.deathClue)silentDeaths++;
  }
  const hasTrue=Object.values(Nn).some(n=>n.type==='ending'&&n.ending==='true');
  if(!hasTrue)add('err','还没有设置真结局（结局节点的类型选“真结局”）');
  let K=new Set(),minRuns=null,r=null;
  for(let it=1;it<=10&&Nn[G.start];it++){r=search(G,K);if([...r.ends].some(e=>Nn[e].ending==='true')){minRuns=it;break}
    const nk=new Set([...K,...r.clues]);if(nk.size===K.size)break;K=nk}
  const full=Nn[G.start]?search(G,new Set([...K,...(r?r.clues:[])])):null;
  if(hasTrue&&minRuns===null&&Nn[G.start])add('err','真结局在任何知识条件下都无法到达');
  if(full){Object.keys(Nn).filter(id=>!full.reached.has(id)).forEach(id=>add('warn',`「${Nn[id].title}」在任何情况下都走不到`,id))}
  if(silentDeaths)add('warn',`${silentDeaths} 个死亡节点不揭示任何线索，玩家死在那里学不到东西`);
  return {issues:out,minRuns,fast:full&&full.best,
    counts:{nodes:Object.keys(Nn).length,ends:Object.values(Nn).filter(n=>n.type==='ending').length,deaths:Object.values(Nn).filter(n=>n.type==='death').length,echoes:Object.values(Nn).reduce((s,n)=>s+(n.echoes||[]).length,0)}};
}
