/* 顶部标签切换 */
import {$} from './dom.js';
import {KEY,S} from './store.js';
import {drawDesign} from '../editor/graph.js';
import {playReset,renderPlay} from '../play/run.js';
import {stopGame} from '../play/scene.js';
import {doSim} from '../sim/view.js';

export function switchTab(t){
  if(t!=='play')stopGame();
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  ['design','play','sim'].forEach(v=>$('#v-'+v).hidden=v!==t);
  if(t==='design')drawDesign();
  if(t==='play'){document.activeElement?.blur?.();if(!S.P||!S.G.nodes[S.P.node])playReset(true);else renderPlay(true)}
  if(t==='sim')doSim();
  try{localStorage.setItem(KEY+'-tab',t)}catch(e){}
}
