/* 读取剧情文件。打包后的单文件版本会把剧情内嵌在 globalThis.__STORIES__ 里，不需要网络请求。 */
import {parseStory} from '../core/story.js';

export const DEFAULT_STORY='stories/fog-town.json';

export async function loadStoryFile(url){
  let raw=globalThis.__STORIES__?.[url];
  if(raw===undefined){
    let res;
    try{res=await fetch(url,{cache:'no-store'})}catch(e){throw new Error(`无法读取剧情文件 ${url}：网络错误`)}
    if(!res.ok)throw new Error(`无法读取剧情文件 ${url}（${res.status}）`);
    try{raw=await res.json()}catch(e){throw new Error(`剧情文件 ${url} 不是有效的 JSON`)}
  }
  return parseStory(raw);
}

/** 在页面上显示无法继续时的错误。 */
export function showFatal(title,err){
  const box=document.createElement('div');
  box.className='slab fatal';
  box.innerHTML=`<h3></h3><pre></pre><p class="hint">请检查剧情文件，或在编辑器里重新导出。</p>`;
  box.querySelector('h3').textContent=title;
  box.querySelector('pre').textContent=err.list?err.list.join('\n'):String(err.message||err);
  document.body.appendChild(box);
}
