// 测试用：读取示例剧情文件，每次返回一份新的、归一化后的副本
import { readFileSync } from 'node:fs';
import { parseStory } from '../../src/core/story.js';

const RAW = JSON.parse(readFileSync(new URL('../../stories/fog-town.json', import.meta.url), 'utf8'));
export const rawSample = () => JSON.parse(JSON.stringify(RAW));
export const sample = () => parseStory(rawSample());
