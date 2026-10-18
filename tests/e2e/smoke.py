"""浏览器冒烟测试：启动开发服务器（或打开构建产物），走一遍三个页面的核心操作。
用法：python3 tests/e2e/smoke.py            # 测源码（ES 模块）
      python3 tests/e2e/smoke.py --dist     # 测 dist/index.html
      python3 tests/e2e/smoke.py --shots DIR  # 另外保存截图"""
import os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DIST = '--dist' in sys.argv
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def main():
    port = free_port()
    env = dict(os.environ, SERVE_DIR='dist' if DIST else '.')
    srv = subprocess.Popen(['node', 'scripts/serve.mjs', str(port)], cwd=ROOT, env=env, stdout=subprocess.PIPE)
    time.sleep(0.6)
    errors, fails = [], []
    check = lambda ok, msg: (print(('  ✓ ' if ok else '  ✗ ') + msg), ok or fails.append(msg))
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={'width': 1400, 'height': 900})
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('console', lambda m: m.type == 'error' and 'fonts.g' not in m.text and errors.append(m.text))
            pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
            pg.goto(f'http://127.0.0.1:{port}/')
            pg.wait_for_timeout(600)

            print('入局')
            pg.click('[data-tab=play]'); pg.wait_for_timeout(400)
            check(pg.is_visible('#art'), '场景画布可见')
            check('镇口' in pg.inner_text('#hud'), 'HUD 显示起点「镇口」')
            for _ in range(30):  # 一小步一小步往右走，每步都试着互动
                pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(120); pg.keyboard.up('ArrowRight')
                pg.keyboard.press('Space'); pg.wait_for_timeout(450)
                if '镇口' not in pg.inner_text('#hud'): break
            check('镇口' not in pg.inner_text('#hud'), '走到物件旁按空格后进入了新场景')
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'play.png'))

            print('剧情编织')
            pg.click('[data-tab=design]'); pg.wait_for_timeout(400)
            check(pg.locator('#gsvg .node').count() >= 20, '地图画出了全部节点')
            pg.locator('#gsvg .node[data-id=gate]').click(); pg.wait_for_timeout(200)
            check(pg.is_visible('#insp') and pg.input_value('#insp .ititle') == '钟楼门前', '点击节点打开编辑栏')
            pg.click('#chkBtn'); pg.wait_for_timeout(200)
            check('剧情检查' in pg.inner_text('#pop'), '剧情检查面板可以打开')
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'design.png'))

            print('命运推演')
            pg.click('[data-tab=sim]'); pg.wait_for_timeout(2500)
            check(pg.locator('.kpi').count() == 4, '模拟结果出现 4 个指标')
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'sim.png'), full_page=True)
            b.close()
    finally:
        srv.terminate()
    for e in errors: print('  页面错误：', e)
    ok = not fails and not errors
    print('冒烟测试' + ('通过' if ok else '失败'))
    sys.exit(0 if ok else 1)


main()
