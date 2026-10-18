/* 游戏入口：只有入局，没有任何编辑功能 */
import {$} from './app/dom.js';
import {S,SAVE,loadSaved} from './app/store.js';
import {DEFAULT_STORY,loadStoryFile,showFatal} from './app/storyfile.js';
import {normalize} from './core/story.js';
import {playReset} from './play/run.js';

SAVE.key='echo-game-v1';

try{
  const published=await loadStoryFile(DEFAULT_STORY);
  // 本机存档里有玩家留下的残响和点赞；剧情文件更新了版本时，以新版本为准
  const local=loadSaved();
  S.G=local&&local.id===published.id&&+local.revision===+published.revision?normalize(local):published;
  document.title=S.G.name+' · 残响工坊';
  $('#projName').textContent=S.G.name||'';
  playReset(true);
}catch(e){
  $('#v-play').hidden=true;
  showFatal('游戏无法开始',e);
}
