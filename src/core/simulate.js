/* 批量模拟：AI 玩家反复入局 */
import {applyOpt,canTake} from './story.js';

export const PERSONAS={trust:{name:'轻信型',trust:.8,mem:.8,cur:1.2},doubt:{name:'多疑型',trust:.15,mem:.9,cur:1},explore:{name:'探索型',trust:.4,mem:.7,cur:2.2},forget:{name:'健忘型',trust:.5,mem:.3,cur:1}};
export function wpick(w){let s=0;for(const v of w.values())s+=v;let r=Math.random()*s;for(const [k,v] of w){r-=v;if(r<=0)return k}return [...w.keys()].pop()}
export function sample(arr,k){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,k)}
export function pickEchoes(arr,k){const pool=arr.slice(),out=[];while(out.length<k&&pool.length){let s=0;pool.forEach(e=>s+=1+(e.likes||0));let r=Math.random()*s,j=0;for(;j<pool.length-1;j++){r-=1+(pool[j].likes||0);if(r<=0)break}out.push(pool.splice(j,1)[0])}return out}
export function runSim(G,cfg){
  const keys=cfg.mix==='mix'?Object.keys(PERSONAS):[cfg.mix];
  const agents=Array.from({length:cfg.players},(_,i)=>{const k=keys[i%keys.length];return{k,p:PERSONAS[k],know:new Set(),mem:new Set(),seen:new Set(),done:false,runs:0,time:0}});
  const pool={},visits={},deaths={},cum=new Array(cfg.maxRuns+1).fill(0);
  let totalRuns=0,bH=0,bL=0,lied=0,deadRuns=0,badEnds=0,lost=0;
  for(let r=1;r<=cfg.maxRuns;r++){
    for(const a of agents){
      if(a.done)continue;a.runs++;totalRuns++;
      let id=G.start,used=new Set(),items=new Map(),money=G.startMoney,clues=new Set(a.know),belief=2,t=0,steps=0,last=null,lastBoost=null,out='lost';const vis=new Set();
      while(true){
        const n=G.nodes[id];if(!n){out='lost';break}
        t+=n.time;if(!vis.has(id)){vis.add(id);visits[id]=(visits[id]||0)+1}
        if(n.type==='death'){out='death';break}
        if(n.type==='ending'){out=n.ending==='true'?'true':'bad';break}
        const w=new Map();
        n.options.forEach((o,i)=>{if(!G.nodes[o.goto])return;if(o.once&&used.has(id+':'+i))return;if(!canTake(o,items,money))return;if(o.needClue&&!clues.has(o.needClue))return;
          let v=1;if(o.needClue)v*=8;if(o.hintClue&&clues.has(o.hintClue))v*=6;const key=id+':'+i;if(a.mem.has(key))v*=1-.92*a.p.mem;if(!a.seen.has(key))v*=a.p.cur;w.set(i,v)});
        if(!w.size){out='lost';break}
        const boost=new Map();
        if(cfg.mode!=='off'){let ech=n.echoes||[];if(cfg.mode==='all')ech=ech.concat(pool[id]||[]);
          for(const e of pickEchoes(ech,3)){if(belief<=0)break;if(Math.random()>=Math.min(.95,a.p.trust*(.7+.6*Math.min(1,(e.likes||0)/25))))continue;belief--;e.honest?bH++:bL++;if(e.teach)clues.add(e.teach);
            if(e.target>=0&&w.has(e.target)){if(e.kind==='avoid')w.set(e.target,w.get(e.target)*.12);else{w.set(e.target,w.get(e.target)*5);boost.set(e.target,(boost.get(e.target)||[]).concat(e.honest))}}}}
        const i=wpick(w),o=n.options[i];a.seen.add(id+':'+i);last={id,i};lastBoost=boost.get(i)||null;
        if(o.once)used.add(id+':'+i);money=applyOpt(o,items,money);if(o.gainClue)clues.add(o.gainClue);
        t+=6;id=o.goto;if(++steps>80){out='lost';break}
      }
      const n=G.nodes[id];if(out==='death'&&n.deathClue)clues.add(n.deathClue);
      clues.forEach(c=>a.know.add(c));t+=15;a.time+=t;
      if(out==='true'){a.done=true;a.clearRun=a.runs;a.clearTime=a.time;
        if(cfg.mode==='all'&&last){(pool[last.id]=pool[last.id]||[]).push({target:last.i,kind:'go',honest:true,teach:''})}}
      else{
        if(last)a.mem.add(last.id+':'+last.i);
        if(out==='death'){deadRuns++;deaths[id]=(deaths[id]||0)+1;if(lastBoost&&lastBoost.includes(false))lied++}
        else if(out==='bad'){badEnds++;deaths[id]=(deaths[id]||0)+1}else{lost++}
        if(cfg.mode==='all'&&last&&Math.random()<.7){const ln=G.nodes[last.id];const honest=Math.random()>=cfg.liar;let e;
          if(honest)e={target:last.i,kind:'avoid',honest:true};
          else if(Math.random()<.6||ln.options.length<2)e={target:last.i,kind:'go',honest:false};
          else{const others=ln.options.map((_,j)=>j).filter(j=>j!==last.i);e={target:others[Math.floor(Math.random()*others.length)],kind:'avoid',honest:false}}
          e.teach='';const p=pool[last.id]=pool[last.id]||[];p.push(e);if(p.length>40)p.shift()}
      }
    }
    cum[r]=agents.filter(a=>a.done).length/agents.length*100;
  }
  const cl=agents.filter(a=>a.done),runsArr=cl.map(a=>a.clearRun).sort((x,y)=>x-y);
  const per={};keys.forEach(k=>{const g=agents.filter(a=>a.k===k),c=g.filter(a=>a.done);per[k]={n:g.length,rate:c.length/g.length*100,avg:c.length?c.reduce((s,a)=>s+a.clearRun,0)/c.length:null}});
  const visitRate={};for(const k in visits)visitRate[k]=visits[k]/totalRuns;
  return {cfg,rate:cl.length/agents.length*100,avgRuns:cl.length?runsArr.reduce((s,x)=>s+x,0)/cl.length:null,median:cl.length?runsArr[Math.floor(runsArr.length/2)]:null,
    avgTime:cl.length?cl.reduce((s,a)=>s+a.clearTime,0)/cl.length:null,cum,per,deaths,visitRate,totalRuns,bH,bL,lied,deadRuns,badEnds,lost,pool:Object.values(pool).reduce((s,p)=>s+p.length,0)};
}
