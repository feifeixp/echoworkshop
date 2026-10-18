/* 全局可变状态与本地存储 */

export const S={G:null,sel:null,zoom:1,hl:null,P:null};
export const KEY='echo-workshop-v3';
export let LIKED=new Set();try{LIKED=new Set(JSON.parse(localStorage.getItem('echo-liked-v1')||'[]'))}catch(e){}
export function saveLiked(){try{localStorage.setItem('echo-liked-v1',JSON.stringify([...LIKED]))}catch(e){}}
/** 当前入口用来保存剧情的存储键：编辑器和游戏各用各的，互不覆盖。 */
export const SAVE={key:KEY};
export function save(){try{localStorage.setItem(SAVE.key,JSON.stringify(S.G))}catch(e){}}
export function loadSaved(){try{const s=localStorage.getItem(SAVE.key);return s?JSON.parse(s):null}catch(e){return null}}

/* 简单的事件通知：游戏部分通过它告诉编辑器"剧情变了"，而不直接调用编辑器代码 */
const LISTENERS={};
export function on(ev,fn){(LISTENERS[ev]=LISTENERS[ev]||[]).push(fn)}
export function emit(ev,...args){(LISTENERS[ev]||[]).forEach(fn=>fn(...args))}
