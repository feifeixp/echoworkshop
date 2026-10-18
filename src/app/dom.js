/* 小工具：DOM 查询、转义、格式化 */

export const $=s=>document.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const fmtMin=s=>(s/60).toFixed(1)+' 分钟';
export const CN=['一','二','三','四','五','六','七','八','九','十'];
export const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
