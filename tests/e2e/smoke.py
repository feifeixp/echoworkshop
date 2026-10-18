"""浏览器冒烟测试：启动开发服务器（或打包产物），分别走一遍游戏页和编辑器页的核心操作。
用法：python3 tests/e2e/smoke.py              # 测源码（ES 模块）
      python3 tests/e2e/smoke.py --dist       # 测 dist/ 下的打包文件
      python3 tests/e2e/smoke.py --shots DIR  # 另外保存截图"""
import os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DIST = '--dist' in sys.argv
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
fails, errors = [], []


def check(ok, msg):
    print(('  ✓ ' if ok else '  ✗ ') + msg)
    if not ok: fails.append(msg)


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def new_page(browser, url):
    pg = browser.new_page(viewport={'width': 1400, 'height': 900})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    if DIST:  # 打包版不能请求剧情文件，必须用内嵌的
        pg.route('**/stories/**', lambda r: r.abort())
    pg.goto(url)
    pg.wait_for_timeout(700)
    return pg


def walk_until_scene_changes(pg, start):
    for _ in range(30):  # 一小步一小步往右走，每步都试着互动
        pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(120); pg.keyboard.up('ArrowRight')
        pg.keyboard.press('Space'); pg.wait_for_timeout(450)
        if start not in pg.inner_text('#hud'): return True
    return False


def shot(pg, name, **kw):
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, name), **kw)


def main():
    port = free_port()
    env = dict(os.environ, SERVE_DIR='dist' if DIST else '.')
    srv = subprocess.Popen(['node', 'scripts/serve.mjs', str(port)], cwd=ROOT, env=env, stdout=subprocess.PIPE)
    time.sleep(0.6)
    base = f'http://127.0.0.1:{port}/'
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()

            print('游戏页')
            pg = new_page(b, base + 'index.html')
            check(pg.locator('.tabs').count() == 0 and pg.locator('#gsvg').count() == 0, '没有任何编辑功能')
            check(pg.is_visible('#art'), '场景画布可见')
            check('镇口' in pg.inner_text('#hud'), '从起点「镇口」开始')
            check(walk_until_scene_changes(pg, '镇口'), '走到物件旁按空格进入了新场景')
            shot(pg, 'game.png')
            pg.close()

            print('编辑器页')
            pg = new_page(b, base + 'editor.html')
            check(pg.locator('#gsvg .node').count() >= 20, '剧情地图画出了全部节点')
            pg.locator('#gsvg .node[data-id=gate]').click(); pg.wait_for_timeout(200)
            check(pg.is_visible('#insp') and pg.input_value('#insp .ititle') == '钟楼门前', '点击节点打开编辑栏')
            pg.click('#chkBtn'); pg.wait_for_timeout(200)
            check('剧情检查' in pg.inner_text('#pop'), '剧情检查面板可以打开')
            shot(pg, 'editor.png')
            pg.click('#btnIO'); pg.wait_for_timeout(200)
            pg.fill('#ioText', '{"nodes":{}}'); pg.click('#ioLoad'); pg.wait_for_timeout(200)
            check('起点' in pg.inner_text('#ioMsg'), '导入有问题的剧情时给出具体原因')
            pg.click('#ioClose')

            pg.click('[data-tab=play]'); pg.wait_for_timeout(400)
            check(walk_until_scene_changes(pg, '镇口'), '编辑器里也能试玩')

            pg.click('[data-tab=sim]'); pg.fill('#sSeed', '42'); pg.click('#runSim'); pg.wait_for_timeout(2500)
            first = pg.inner_text('.kpis')
            pg.click('#runSim'); pg.wait_for_timeout(2500)
            check(pg.locator('.kpi').count() == 4, '模拟结果出现 4 个指标')
            check(pg.inner_text('.kpis') == first, '同一个随机种子，两次模拟结果一致')
            shot(pg, 'sim.png', full_page=True)
            b.close()
    finally:
        srv.terminate()
    for e in errors: print('  页面错误：', e)
    ok = not fails and not errors
    print(('打包版' if DIST else '源码版') + '冒烟测试' + ('通过' if ok else '失败'))
    sys.exit(0 if ok else 1)


main()
