/* 与界面无关的通用函数 */

export const clone = o => JSON.parse(JSON.stringify(o));

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** 由字符串得到一个可复现的随机数函数（返回 0–1）。同样的字符串总是得到同样的序列。 */
export function rng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** 由种子（数字或字符串）得到随机数函数，用于可复现的模拟和测试。 */
export const makeRng = seed => rng('seed:' + String(seed));
