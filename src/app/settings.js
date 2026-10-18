/* 玩家设置：文字速度、动态效果。保存在本机。 */
import {reduced} from './dom.js';

const SETTINGS_KEY = 'echo-settings-v1';

export const TEXT_SPEEDS = {
  slow: { label: '慢', step: 1, ms: 45 },
  normal: { label: '中', step: 2, ms: 28 },
  fast: { label: '快', step: 4, ms: 18 },
  instant: { label: '立即显示', step: Infinity, ms: 0 },
};
export const MOTION_MODES = { auto: '跟随系统', full: '完整', reduce: '减少' };

export const SETTINGS = { textSpeed: 'normal', motion: 'auto' };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) {}
if (!TEXT_SPEEDS[SETTINGS.textSpeed]) SETTINGS.textSpeed = 'normal';
if (!MOTION_MODES[SETTINGS.motion]) SETTINGS.motion = 'auto';

/** 当前是否应该减少动态效果（玩家设置优先，其次跟随系统）。 */
export function isReduced() {
  return SETTINGS.motion === 'reduce' || (SETTINGS.motion === 'auto' && reduced);
}

export function applySettings() {
  document.documentElement.classList.toggle('reduce-motion', isReduced());
}

export function setSetting(key, value) {
  SETTINGS[key] = value;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) {}
  applySettings();
}

applySettings();
