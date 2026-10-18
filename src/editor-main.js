/* 编辑器入口：剧情编织、入局试玩、命运推演 */
import {$} from './app/dom.js';
import {KEY,S,SAVE,loadSaved,on,save} from './app/store.js';
import {DEFAULT_STORY,loadStoryFile,showFatal} from './app/storyfile.js';
import {switchTab} from './app/tabs.js';
import {normalize,parseStory} from './core/story.js';
import {drawDesign,fitZoom} from './editor/graph.js';
import {renderInspector,renderInspectorSoft} from './editor/inspector.js';
import {renderChecks,renderLib} from './editor/panels.js';
import {adoptRoutes,autoLayout} from './editor/routes.js';
import {playReset} from './play/run.js';

SAVE.key=KEY;

/* 游戏部分改动了剧情（例如玩家刻下残响、点赞）时，刷新编辑器 */
on('story-changed',id=>{renderChecks();drawDesign();if(S.sel===id)renderInspector()});
on('echo-liked',id=>{if(S.sel===id&&!$('#insp').hidden)renderInspectorSoft()});

/** 换上一份新剧情并刷新所有界面。 */
function useStory(g){
  S.G=g;
  if(Object.values(S.G.nodes).some(n=>n.x==null)||S.G.layoutV!==2)autoLayout();else adoptRoutes();
  S.sel=S.G.nodes[S.G.start]?S.G.start:Object.keys(S.G.nodes)[0];S.hl=null;
  save();renderLib();renderInspector();renderChecks();fitZoom();playReset(true);
  $('#projName').textContent=S.G.name||'';
}

document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$('#btnReset').onclick=async()=>{try{useStory(await loadStoryFile(DEFAULT_STORY))}catch(e){showFatal('示例剧情读取失败',e)}};

/* 导入 / 导出 */
const ioMsg=t=>$('#ioMsg').textContent=t;
$('#btnIO').onclick=()=>{$('#ioText').value=JSON.stringify(S.G,null,2);ioMsg('');$('#modal').hidden=false};
$('#ioClose').onclick=()=>$('#modal').hidden=true;
$('#ioCopy').onclick=()=>{const t=$('#ioText');navigator.clipboard.writeText(t.value).then(()=>ioMsg('已复制')).catch(()=>{t.select();ioMsg('已选中，按 Ctrl+C 复制')})};
function importText(text){
  let raw;
  try{raw=JSON.parse(text)}catch(e){ioMsg('无法读取：这不是有效的 JSON');return}
  try{useStory(parseStory(raw));$('#modal').hidden=true}catch(e){ioMsg('无法读取：'+(e.list?e.list.slice(0,3).join('；'):e.message))}
}
$('#ioLoad').onclick=()=>importText($('#ioText').value);
$('#ioDownload').onclick=()=>{
  S.G.revision=(+S.G.revision||1)+1;save();
  const text=JSON.stringify(S.G,null,2)+'\n';$('#ioText').value=text;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  a.download=(S.G.id||'story')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  ioMsg(`已下载 ${a.download}（第 ${S.G.revision} 版）。用它替换项目里 stories/ 下的同名文件，游戏就会用上这一版。`);
};
$('#ioFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const text=await f.text();$('#ioText').value=text;importText(text);e.target.value=''};

/* 启动：优先用浏览器里保存的编辑进度，没有就读示例剧情文件 */
try{
  const saved=loadSaved();
  useStory(saved?normalize(saved):await loadStoryFile(DEFAULT_STORY));
}catch(e){showFatal('剧情读取失败',e)}
if(S.G){
  requestAnimationFrame(fitZoom);
  let startTab='design';try{startTab=localStorage.getItem(KEY+'-tab')||'design'}catch(e){}
  switchTab(startTab);
}
