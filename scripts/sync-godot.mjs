// 把网页编辑器导出的剧情（stories/*.json）同步到 Godot 项目（godot/data/stories/）。
// Godot 只能读取项目目录里的文件，所以需要一份副本；godot/tests/run_tests.gd 会检查副本是否过期。
import { readdir, copyFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dst = join(root, 'godot/data/stories');
await mkdir(dst, { recursive: true });
for (const f of (await readdir(join(root, 'stories'))).filter(f => f.endsWith('.json'))) {
  await copyFile(join(root, 'stories', f), join(dst, f));
  console.log(`stories/${f} → godot/data/stories/${f}`);
}
