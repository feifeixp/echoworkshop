/* 游戏专用的菜单：标题画面、暂停菜单、设置面板。编辑器不加载这个模块。 */
import { $, esc } from '../app/dom.js';
import { MOTION_MODES, SETTINGS, TEXT_SPEEDS, isReduced, setSetting } from '../app/settings.js';
import { RUNSAVE, S, on } from '../app/store.js';
import { describeRun, restoreRun } from '../core/save.js';
import { paintScene } from '../play/art.js';
import { clearRunSave, newRun, playReset, renderPlay } from '../play/run.js';
import { GM, stopGame } from '../play/scene.js';

/** 当前打开的菜单：{ el, items, sel, onBack }。标题、暂停、设置共用同一套键盘操作。 */
let activeMenu = null;
/** 设置面板关闭后回到哪个菜单。 */
let settingsReturn = null;

function readRunSave() {
  try { return JSON.parse(localStorage.getItem(RUNSAVE.key) || 'null'); } catch (e) { return null; }
}

/* ---------- 通用的竖排菜单 ---------- */

/**
 * items: [{ label, sub?, act, tone? }]，act 是选中时执行的函数。
 * onBack: 按 Esc 时执行（可选）。
 */
function mountMenu(el, items, onBack) {
  const first = items.findIndex(it => !it.disabled);
  activeMenu = { el, items, sel: first < 0 ? 0 : first, onBack };
  el.innerHTML = items.map((it, i) => `
    <button class="mitem${it.tone ? ' ' + it.tone : ''}" data-i="${i}" role="menuitem"${it.disabled ? ' disabled' : ''}>
      <span class="ml">${esc(it.label)}</span>${it.sub ? `<span class="ms">${esc(it.sub)}</span>` : ''}
    </button>`).join('');
  el.onclick = e => {
    const b = e.target.closest('[data-i]');
    if (b && !b.disabled) choose(+b.dataset.i);
  };
  el.onpointermove = e => {
    const b = e.target.closest('[data-i]');
    if (b && !b.disabled && +b.dataset.i !== activeMenu.sel) highlight(+b.dataset.i);
  };
  highlight(activeMenu.sel);
}

function highlight(i) {
  if (!activeMenu) return;
  activeMenu.sel = i;
  activeMenu.el.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
}

function move(d) {
  const { items, sel } = activeMenu;
  let i = sel;
  for (let k = 0; k < items.length; k++) {
    i = (i + d + items.length) % items.length;
    if (!items[i].disabled) break;
  }
  highlight(i);
}

function choose(i) {
  const it = activeMenu && activeMenu.items[i];
  if (it && !it.disabled) it.act();
}

/* ---------- 标题画面 ---------- */

export function showTitle() {
  stopGame();
  S.paused = true;
  $('#v-play').hidden = true;
  $('#pause').hidden = true;
  $('#title').hidden = false;
  $('#titleSub').textContent = S.G.name || '';
  paintTitle();
  titleMain();
}

function titleMain() {
  const data = readRunSave();
  const info = data && describeRun(S.G, data);
  $('#titleSave').textContent = info
    ? `上次停在第 ${info.runs} 次轮回${info.place ? `，${info.ended ? '倒在' : '在'}「${info.place}」` : ''}。你记得 ${info.clues} 件事。`
    : '';
  const items = [];
  if (info) items.push({ label: '继续', act: continueGame });
  items.push({ label: info ? '重新开始' : '开始', act: info ? confirmNew : startNew });
  items.push({ label: '设置', act: () => openSettings(titleMain) });
  mountMenu($('#titleMenu'), items);
}

function confirmNew() {
  $('#titleSave').textContent = '重新开始会忘掉这座小镇里的一切：所有记忆和轮回记录都会清除。';
  mountMenu($('#titleMenu'), [
    { label: '忘掉一切，重新开始', tone: 'danger', act: startNew },
    { label: '算了', act: titleMain },
  ], titleMain);
}

function enterGame() {
  $('#title').hidden = true;
  $('#v-play').hidden = false;
  S.paused = false;
  activeMenu = null;
  document.activeElement?.blur?.();
}

function startNew() {
  clearRunSave();
  enterGame();
  playReset(true);
}

function continueGame() {
  const r = restoreRun(S.G, readRunSave());
  enterGame();
  if (!r) { playReset(true); return; }
  S.P = r.P;
  if (r.resumable) renderPlay(true);
  else newRun();   // 剧情更新过：保留记忆，从新的一轮开始
}

/** 标题背景：用起点场景的画面，铺满整个屏幕。 */
function paintTitle() {
  const c = $('#titleArt');
  const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  c.width = W * dpr; c.height = H * dpr;
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintScene(x, W, H, S.G.start);
}
addEventListener('resize', () => { if (!$('#title').hidden) paintTitle(); });

/* ---------- 暂停菜单 ---------- */

function openPause() {
  if (S.paused || $('#v-play').hidden || !S.P) return;
  S.paused = true;
  GM.keys.l = GM.keys.r = false;
  $('#pause').hidden = false;
  pauseMain();
}

function pauseMain() {
  mountMenu($('#pauseMenu'), [
    { label: '继续游戏', act: closePause },
    { label: '设置', act: () => { $('#pause').hidden = true; openSettings(() => { $('#pause').hidden = false; pauseMain(); }); } },
    { label: '回到标题画面', sub: '进度已自动保存', act: showTitle },
  ], closePause);
}

function closePause() {
  $('#pause').hidden = true;
  S.paused = false;
  activeMenu = null;
}

on('pause-request', openPause);

/* ---------- 设置 ---------- */

const PREVIEW = '镇口的钟敲了一下，又一下。你不记得自己是怎么来的。';
let previewT = null;

function openSettings(back) {
  settingsReturn = back;
  $('#settingsPanel').hidden = false;
  renderSettings();
  mountMenu($('#settingsDone'), [{ label: '完成', act: closeSettings }], closeSettings);
}

function renderSettings() {
  const group = (key, label, opts) => `
    <fieldset class="seg"><legend>${label}</legend>
      ${Object.entries(opts).map(([k, v]) => `<label><input type="radio" name="${key}" value="${k}"${SETTINGS[key] === k ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('')}
    </fieldset>`;
  $('#settingsBody').innerHTML =
    group('textSpeed', '文字速度', Object.fromEntries(Object.entries(TEXT_SPEEDS).map(([k, v]) => [k, v.label]))) +
    `<p class="preview" id="speedPreview" aria-hidden="true"></p>` +
    group('motion', '动态效果', MOTION_MODES) +
    `<p class="hint">"减少"会停下飘动的雾和飞过的残响，残响改为静止排列。</p>`;
  playPreview();
}

function playPreview() {
  const el = $('#speedPreview');
  clearInterval(previewT);
  const sp = TEXT_SPEEDS[SETTINGS.textSpeed];
  if (!Number.isFinite(sp.step) || isReduced()) { el.textContent = PREVIEW; return; }
  let i = 0;
  previewT = setInterval(() => {
    i += sp.step;
    el.textContent = PREVIEW.slice(0, i);
    if (i >= PREVIEW.length) clearInterval(previewT);
  }, sp.ms);
}

function closeSettings() {
  clearInterval(previewT);
  $('#settingsPanel').hidden = true;
  const back = settingsReturn;
  settingsReturn = null;
  if (back) back();
}

/* ---------- 输入 ---------- */

export function initMenus() {
  $('#settingsBody').addEventListener('change', e => {
    const t = e.target;
    if (t.name) { setSetting(t.name, t.value); playPreview(); }
  });
  // 捕获阶段处理：菜单打开时，键盘只给菜单用，不会传到游戏里
  document.addEventListener('keydown', e => {
    if (!activeMenu || !S.paused) return;
    if (e.target.matches?.('input') && e.key !== 'Escape') return;   // 单选框用浏览器自带的键盘操作
    const k = e.key;
    let handled = true;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') move(-1);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') move(1);
    else if (k === 'Enter' || k === ' ') { if (!e.repeat) choose(activeMenu.sel); }
    else if (k === 'Escape') { if (activeMenu.onBack) activeMenu.onBack(); }
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}
