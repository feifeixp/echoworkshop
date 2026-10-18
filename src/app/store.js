/* 全局可变状态与本地存储 */

export const S={G:null,sel:null,zoom:1,hl:null,P:null};
export const KEY='echo-workshop-v3';
export let LIKED=new Set();try{LIKED=new Set(JSON.parse(localStorage.getItem('echo-liked-v1')||'[]'))}catch(e){}
export function saveLiked(){try{localStorage.setItem('echo-liked-v1',JSON.stringify([...LIKED]))}catch(e){}}
export function save(){try{localStorage.setItem(KEY,JSON.stringify(S.G))}catch(e){}}
export function loadSaved(){try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):null}catch(e){return null}}
