// 零依赖构建：把 index.html、样式和全部 ES 模块合并成一个可以直接打开或上传的 dist/index.html
// 约定：各模块的顶层名字全局唯一，导入不使用 as 重命名（构建时会检查）。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)';\s*$/gm;
const order = [], seen = new Set();

async function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = await readFile(file, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) {
    if (/\bas\b/.test(m[1])) throw new Error(`${relative(root, file)}：构建不支持 import ... as`);
    await visit(resolve(dirname(file), m[2]));
  }
  order.push({ file, src });
}

await visit(join(root, 'src/main.js'));
const declared = new Map();
const js = order.map(({ file, src }) => {
  const rel = relative(root, file);
  for (const m of src.matchAll(/^export (?:function|const|let) ([A-Za-z_$][\w$]*)/gm)) {
    if (declared.has(m[1])) throw new Error(`顶层名字重复：${m[1]}（${declared.get(m[1])} 与 ${rel}）`);
    declared.set(m[1], rel);
  }
  return `// ---- ${rel} ----\n` + src.replace(IMPORT_RE, '').replace(/^export /gm, '');
}).join('\n');

let html = await readFile(join(root, 'index.html'), 'utf8');
html = await replaceAsync(html, /<link rel="stylesheet" href="(src\/[^"]+)">\n?/g, async (_, href) =>
  `<style>\n${await readFile(join(root, href), 'utf8')}</style>\n`);
html = html.replace(/<script type="module" src="src\/main\.js"><\/script>/, () => `<script type="module">\n${js}\n</script>`);
await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist/index.html'), html);
console.log(`dist/index.html：${order.length} 个模块，${(html.length / 1024).toFixed(0)} KB`);

async function replaceAsync(str, re, fn) {
  const parts = [];
  let last = 0;
  for (const m of str.matchAll(re)) { parts.push(str.slice(last, m.index), await fn(...m)); last = m.index + m[0].length; }
  return parts.join('') + str.slice(last);
}
