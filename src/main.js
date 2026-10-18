/* 入口：全局按钮、导入导出、启动 */
import {$} from './app/dom.js';
import {KEY,S,loadSaved,save} from './app/store.js';
import {switchTab} from './app/tabs.js';
import {normalize} from './core/story.js';
import {clone} from './core/util.js';
import {SAMPLE} from './data/fog-town.js';
import {fitZoom} from './editor/graph.js';
import {renderInspector} from './editor/inspector.js';
import {renderChecks,renderLib} from './editor/panels.js';
import {adoptRoutes,autoLayout} from './editor/routes.js';
import {playReset} from './play/run.js';

document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$('#btnReset').onclick=()=>{S.G=normalize(clone(SAMPLE));autoLayout();S.sel=S.G.start;S.hl=null;save();renderLib();renderInspector();renderChecks();fitZoom();playReset(true);$('#projName').textContent=S.G.name};
$('#btnIO').onclick=()=>{$('#ioText').value=JSON.stringify(S.G,null,2);$('#ioMsg').textContent='';$('#modal').hidden=false};
$('#ioClose').onclick=()=>$('#modal').hidden=true;
$('#ioCopy').onclick=()=>{const t=$('#ioText');navigator.clipboard.writeText(t.value).then(()=>$('#ioMsg').textContent='已复制').catch(()=>{t.select();$('#ioMsg').textContent='已选中，按 Ctrl+C 复制'})};
$('#ioLoad').onclick=()=>{try{const g=normalize(JSON.parse($('#ioText').value));if(!g.nodes||!Object.keys(g.nodes).length)throw 0;S.G=g;
  if(Object.values(S.G.nodes).some(n=>n.x==null))autoLayout();else adoptRoutes();S.sel=S.G.nodes[S.G.start]?S.G.start:Object.keys(S.G.nodes)[0];save();renderLib();renderInspector();renderChecks();fitZoom();playReset(true);$('#projName').textContent=S.G.name||'';$('#modal').hidden=true}
  catch(e){$('#ioMsg').textContent='无法读取：请粘贴完整的导出 JSON'}};

S.G=normalize(loadSaved()||clone(SAMPLE));
if(Object.values(S.G.nodes).some(n=>n.x==null)||S.G.layoutV!==2){autoLayout();save()}else adoptRoutes();
S.sel=S.G.nodes[S.G.start]?S.G.start:Object.keys(S.G.nodes)[0];
$('#projName').textContent=S.G.name||'';
renderLib();renderInspector();renderChecks();
S.P={know:new Set(),runs:0,total:0,history:[],startAt:S.G.start};S.P.runs=0;
(function initPlay(){S.P.runs++;Object.assign(S.P,{used:new Set(),items:new Map(),money:S.G.startMoney,runClues:new Set(),belief:2,believed:{},blog:[],t:S.G.nodes[S.G.start]?S.G.nodes[S.G.start].time:0,path:[S.G.start],end:null,lastChoice:null,node:S.G.start})})();
requestAnimationFrame(fitZoom);
let startTab='play';try{startTab=localStorage.getItem(KEY+'-tab')||'play'}catch(e){}
switchTab(startTab);
