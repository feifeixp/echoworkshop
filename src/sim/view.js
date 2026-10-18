/* 批量模拟的参数面板与结果展示 */
import {$,esc} from '../app/dom.js';
import {S} from '../app/store.js';
import {PERSONAS,runSim} from '../core/simulate.js';
import {graphSVG} from '../editor/graph.js';

export function lineChart(series,maxX){
  const W=620,H=270,L=42,R=58,T=14,B=36,pw=W-L-R,ph=H-T-B;
  const x=k=>L+(maxX<=1?0:(k-1)/(maxX-1)*pw),y=v=>T+ph-v/100*ph;
  let g='<g class="grid">';[0,25,50,75,100].forEach(v=>{g+=`<line x1="${L}" x2="${L+pw}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${v}%</text>`});
  const step=Math.max(1,Math.ceil(maxX/8));for(let k=1;k<=maxX;k+=step)g+=`<text x="${x(k)}" y="${H-16}" text-anchor="middle">${k}</text>`;g+='</g>';
  const ends=[];const paths=series.map(s=>{const pts=[];for(let k=1;k<=maxX;k++)pts.push(`${x(k).toFixed(1)},${y(s.data[k]).toFixed(1)}`);
    const area=s.main?`<path d="M${x(1)},${y(0)} L${pts.join(' L')} L${x(maxX)},${y(0)} Z" fill="url(#ga)"/>`:'';
    ends.push({y:y(s.data[maxX]),v:s.data[maxX]});
    return `${area}<polyline points="${pts.join(' ')}" style="fill:none;stroke:${s.color};stroke-width:2.4;${s.dash?'stroke-dasharray:6 5;':''}stroke-linejoin:round"/><circle cx="${x(maxX)}" cy="${y(s.data[maxX])}" r="4" style="fill:${s.color}"/>`});
  ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<14)ends[i].y=ends[i-1].y+14;
  const labels=ends.map(e=>`<text class="lbl" x="${x(maxX)+9}" y="${e.y+4}">${e.v.toFixed(0)}%</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="累计真结局达成率"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a653" stop-opacity=".28"/><stop offset="1" stop-color="#d9a653" stop-opacity="0"/></linearGradient></defs>${g}${paths.join('')}${labels}<text x="${L+pw/2}" y="${H-1}" text-anchor="middle">尝试局数</text></svg>`;
}
export function renderSim(res,ctl){
  const Nn=S.G.nodes;const f=v=>v==null?'—':v.toFixed(1);
  const cmp=(b,unit)=>ctl&&b!=null?`<div class="c">无残响对照：<b class="num">${typeof b==='number'?b.toFixed(1):b}${unit}</b></div>`:'';
  const dEntries=Object.entries(res.deaths).sort((a,b)=>b[1]-a[1]);if(res.lost)dEntries.push(['__lost',res.lost]);
  const dMax=Math.max(1,...dEntries.map(d=>d[1]));const failTotal=res.deadRuns+res.badEnds+res.lost;
  const bars=dEntries.map(([id,c])=>{const n=Nn[id];const cls=id==='__lost'?'l':(n&&n.type==='ending'?'b':'');
    return `<div class="bar"><span class="nm" title="${esc(n?n.title:'迷失')}">${esc(id==='__lost'?'迷失或卡住':n.title)}</span><span class="tr"><span class="fl ${cls}" style="width:${(c/dMax*100).toFixed(1)}%"></span></span><span class="vl num">${(c/Math.max(1,failTotal)*100).toFixed(0)}%</span></div>`}).join('');
  const bel=res.bH+res.bL;
  const series=[{data:res.cum,color:'#d9a653',main:true}];if(ctl)series.push({data:ctl.cum,color:'#8fa3b8',dash:true});
  let verdict='';
  if(ctl&&res.cfg.mode!=='off'){const dr=res.rate-ctl.rate;const dRun=(ctl.avgRuns!=null&&res.avgRuns!=null)?ctl.avgRuns-res.avgRuns:null;
    verdict=`开启残响后，真结局达成率${dr>=0?'提高':'降低'}了 <b class="num">${Math.abs(dr).toFixed(1)}</b> 个百分点${dRun!=null?`，通关者平均${dRun>=0?'少':'多'}用 <b class="num">${Math.abs(dRun).toFixed(1)}</b> 局`:''}。`}
  const hard=dEntries.filter(d=>d[0]!=='__lost')[0];
  $('#simres').innerHTML=`
  <div class="kpis">
    <div class="slab kpi"><div class="k">${res.cfg.maxRuns} 局内打出真结局</div><div class="v num">${res.rate.toFixed(1)}<small>%</small></div>${cmp(ctl&&ctl.rate,'%')}</div>
    <div class="slab kpi"><div class="k">通关平均局数</div><div class="v num">${f(res.avgRuns)}</div>${cmp(ctl&&ctl.avgRuns,' 局')}</div>
    <div class="slab kpi"><div class="k">通关中位局数</div><div class="v num">${res.median??'—'}</div>${cmp(ctl&&ctl.median,' 局')}</div>
    <div class="slab kpi"><div class="k">通关平均总用时</div><div class="v num">${res.avgTime==null?'—':(res.avgTime/60).toFixed(1)}<small> 分钟</small></div>${cmp(ctl&&ctl.avgTime!=null?ctl.avgTime/60:null,' 分钟')}</div>
  </div>
  <div class="two">
    <div class="slab chart"><h3>累计真结局达成率</h3><div class="leg2"><span><i></i>当前设置</span>${ctl?'<span><i class="c"></i>无残响对照</span>':''}</div>${lineChart(series,res.cfg.maxRuns)}</div>
    <div class="slab"><h3>玩家都倒在了哪里</h3><p class="hint" style="margin-bottom:12px">占全部失败局的比例，共 <span class="num">${failTotal}</span> 局。</p><div class="bars">${bars||'<p class="empty">没有失败。</p>'}</div></div>
  </div>
  <div class="two">
    <div class="slab"><h3>推演结论</h3><p class="note">${verdict}
      ${hard?`最大的劝退点是「${esc(Nn[hard[0]]?.title)}」，占失败的 <b class="num">${(hard[1]/Math.max(1,failTotal)*100).toFixed(0)}%</b>。`:''}
      ${bel?`玩家一共相信了 <b class="num">${bel}</b> 次残响，其中 <b class="num">${(res.bH/bel*100).toFixed(0)}%</b> 是真心提示。`:'这一轮没有玩家相信残响。'}
      ${res.deadRuns?`有 <b class="num">${(res.lied/res.deadRuns*100).toFixed(0)}%</b> 的死亡，是因为照着一条假残响去做。`:''}
      ${res.cfg.mode==='all'?`推演结束时，玩家留下的残响共有 <b class="num">${res.pool}</b> 条。`:''}</p></div>
    <div class="slab tbl"><h3>不同性格的玩家</h3><table><thead><tr><th>性格</th><th class="n">人数</th><th class="n">达成率</th><th class="n">平均局数</th></tr></thead><tbody>
      ${Object.entries(res.per).map(([k,v])=>`<tr><td>${PERSONAS[k].name}</td><td class="n num">${v.n}</td><td class="n num">${v.rate.toFixed(1)}%</td><td class="n num">${v.avg==null?'—':v.avg.toFixed(1)}</td></tr>`).join('')}</tbody></table>
      <p class="hint" style="margin-top:10px">轻信型最常相信残响；多疑型几乎不信；探索型爱选没试过的选项；健忘型记不住害死自己的选择。</p></div>
  </div>
  <div class="map"><div class="toolbar"><h3 style="margin:0;font-family:var(--f-serif);color:var(--gold-2);font-size:15px">足迹热力图</h3><span class="hint">越亮，越多局走到这里。死亡节点显示死亡次数。</span></div><div class="scroller" id="hWrap"><svg id="hsvg" class="g" xmlns="http://www.w3.org/2000/svg"></svg></div></div>`;
  const g=graphSVG({heat:{visit:res.visitRate,deaths:res.deaths}});const svg=$('#hsvg');const wz=Math.max(.4,Math.min(1,(($('#hWrap').clientWidth||800)-8)/g.W));
  svg.setAttribute('viewBox',`0 0 ${g.W} ${g.H}`);svg.setAttribute('width',g.W*wz);svg.setAttribute('height',g.H*wz);svg.innerHTML=g.inner;
}
export function doSim(){
  const cfg={players:+$('#sPl').value,maxRuns:+$('#sRn').value,liar:+$('#sLi').value/100,mode:$('#sMode').value,mix:$('#sMix').value};
  const btn=$('#runSim');btn.disabled=true;btn.textContent='推演中…';
  setTimeout(()=>{try{if(!S.G.nodes[S.G.start]){$('#simres').innerHTML='<p class="hint">起点不存在，无法推演。</p>';return}
    const res=runSim(S.G,cfg);const ctl=$('#sCmp').checked&&cfg.mode!=='off'?runSim(S.G,Object.assign({},cfg,{mode:'off'})):null;renderSim(res,ctl)}
    finally{btn.disabled=false;btn.textContent='开始推演'}},30);
}
[['sPl','oPl',v=>v],['sRn','oRn',v=>v],['sLi','oLi',v=>v+'%']].forEach(([s,o,fm])=>$('#'+s).addEventListener('input',e=>$('#'+o).textContent=fm(e.target.value)));
$('#runSim').onclick=doSim;
