/* 游戏入口：标题画面 → 入局。没有任何编辑功能。 */
import {$} from './app/dom.js';
import {RUNSAVE,S,SAVE,loadSaved} from './app/store.js';
import {DEFAULT_STORY,loadStoryFile,showFatal} from './app/storyfile.js';
import {normalize} from './core/story.js';
import {initMenus,showTitle} from './game/menus.js';

S.mode='game';
SAVE.key='echo-game-v1';     // 剧情副本（含玩家留下的残响和点赞）
RUNSAVE.key='echo-run-v1';   // 轮回进度

try{
  const published=await loadStoryFile(DEFAULT_STORY);
  // 本机存档里有玩家留下的残响和点赞；剧情文件更新了版本时，以新版本为准
  const local=loadSaved();
  S.G=local&&local.id===published.id&&+local.revision===+published.revision?normalize(local):published;
  document.title=S.G.name+' · 残响工坊';
  $('#projName').textContent=S.G.name||'';
  initMenus();
  showTitle();
}catch(e){
  $('#v-play').hidden=true;
  $('#title').hidden=true;
  showFatal('游戏无法开始',e);
}
