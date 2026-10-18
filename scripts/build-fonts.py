"""生成 Godot 版用的中文字体子集（godot/assets/fonts/）。

正文：思源宋体 / Noto Serif CJK SC（SIL OFL 1.1），保留 GB2312 全部汉字 + 游戏里用到的所有字，
      玩家刻残响时打的字基本都能显示。
标题：霞鹜文楷 LXGW WenKai（SIL OFL 1.1），只保留标题、场景名等展示用的字。

用法：python3 scripts/build-fonts.py <NotoSerifCJK-Regular.ttc> <LXGWWenKai-Regular.ttf>
需要 fontTools（pip install fonttools）。剧情或界面文字改了以后重新运行一次。
"""
import glob, json, os, re, sys
from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'godot/assets/fonts')
EXTRA = '♥♡◆◇●○◀▶←→↑↓›‹·…—–“”‘’「」『』（）【】《》、。，；：？！%×＋－'


def used_chars():
    text = ''
    for p in glob.glob(os.path.join(ROOT, 'stories/*.json')):
        text += open(p, encoding='utf-8').read()
    for p in glob.glob(os.path.join(ROOT, 'godot/scripts/**/*.gd'), recursive=True):
        text += open(p, encoding='utf-8').read()
    return set(text)


def display_chars():
    """标题字体只用于：标题、场景名、说话人名字、结局大字。"""
    s = set('残响通关死轮回迷失0123456789·')
    for p in glob.glob(os.path.join(ROOT, 'stories/*.json')):
        g = json.load(open(p, encoding='utf-8'))
        s |= set(g.get('name', ''))
        for n in g.get('nodes', {}).values():
            s |= set(n.get('title', ''))
            for m in re.finditer(r'^\s*【([^】]{1,12})】', n.get('text', ''), re.M):
                s |= set(m.group(1))
    return s


def gb2312():
    out = set()
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(bytes([hi, lo]).decode('gb2312'))
            except UnicodeDecodeError:
                pass
    return out


def pick_sc(ttc_path):
    coll = TTCollection(ttc_path)
    for f in coll.fonts:
        fam = f['name'].getDebugName(1) or ''
        if fam.endswith(' SC'):
            return f
    raise SystemExit('在 %s 里找不到简体中文（SC）字体' % ttc_path)


def write_subset(font, chars, path):
    ascii_ = {chr(c) for c in range(0x20, 0x7F)}
    chars = (set(chars) | ascii_ | set(EXTRA)) - {'\n', '\r', '\t'}
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[ord(c) for c in chars])
    sub.subset(font)
    font.save(path)
    print('%s：%d 个字，%.1f MB' % (os.path.relpath(path, ROOT), len(chars), os.path.getsize(path) / 1e6))


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    os.makedirs(OUT, exist_ok=True)
    write_subset(pick_sc(sys.argv[1]), gb2312() | used_chars(), os.path.join(OUT, 'body.otf'))
    write_subset(TTFont(sys.argv[2]), display_chars(), os.path.join(OUT, 'display.ttf'))


main()
