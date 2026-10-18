// 零依赖构建：把每个入口页面连同样式、全部 ES 模块和剧情文件合并成一个独立的 HTML 文件。
//   index.html  → dist/index.html   游戏
//   editor.html → dist/editor.html  编辑器
// 打包后的文件可以直接双击打开，也可以上传到任何静态托管。
// 约定：各模块的顶层名字全局唯一，import 不使用 as 改名（构建时会检查）。
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)';\s*$/gm;
const ENTRIES = ['index.html', 'editor.html'];

/** 从入口模块出发，按依赖顺序（依赖在前）收集全部模块。 */
async function collect(entry) {
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
  await visit(entry);
  return order;
}

/** 把模块拼接成一段脚本，并检查顶层名字是否重复。 */
function bundle(order) {
  const declared = new Map();
  return order.map(({ file, src }) => {
    const rel = relative(root, file);
    for (const m of src.matchAll(/^(?:export )?(?:function|const|let) ([A-Za-z_$][\w$]*)/gm)) {
      if (declared.has(m[1])) throw new Error(`顶层名字重复：${m[1]}（${declared.get(m[1])} 与 ${rel}）`);
      declared.set(m[1], rel);
    }
    return `// ---- ${rel} ----\n` + src.replace(IMPORT_RE, '').replace(/^export /gm, '');
  }).join('\n');
}

/** 把 stories/ 下的全部剧情文件内嵌进页面，打包版本不需要网络请求。 */
async function storiesScript() {
  const files = (await readdir(join(root, 'stories'))).filter(f => f.endsWith('.json'));
  const map = {};
  for (const f of files) map['stories/' + f] = JSON.parse(await readFile(join(root, 'stories', f), 'utf8'));
  // 避免剧情文字里出现 </script> 提前结束标签
  return `<script>globalThis.__STORIES__=${JSON.stringify(map).replace(/</g, '\\u003c')};</script>\n`;
}

async function replaceAsync(str, re, fn) {
  const parts = [];
  let last = 0;
  for (const m of str.matchAll(re)) { parts.push(str.slice(last, m.index), await fn(...m)); last = m.index + m[0].length; }
  return parts.join('') + str.slice(last);
}

await mkdir(join(root, 'dist'), { recursive: true });
const stories = await storiesScript();
for (const page of ENTRIES) {
  let html = await readFile(join(root, page), 'utf8');
  const entry = html.match(/<script type="module" src="(src\/[^"]+)"><\/script>/)[1];
  const order = await collect(join(root, entry));
  const js = bundle(order);
  html = await replaceAsync(html, /<link rel="stylesheet" href="(src\/[^"]+)">\n?/g, async (_, href) =>
    `<style>\n${await readFile(join(root, href), 'utf8')}</style>\n`);
  html = html.replace(/<script type="module" src="src\/[^"]+"><\/script>/, () => `${stories}<script type="module">\n${js}\n</script>`);
  await writeFile(join(root, 'dist', page), html);
  console.log(`dist/${page}：${order.length} 个模块，${(html.length / 1024).toFixed(0)} KB`);
}
