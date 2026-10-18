"""生成游戏图标 godot/assets/icon.png（1024×1024，不透明，iOS 要求无透明通道）。
用法：python3 scripts/build-icon.py
需要 Pillow。字用的是标题字体子集 godot/assets/fonts/display.ttf。"""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
S = 1024
img = Image.new('RGB', (S, S))
px = img.load()
top, bottom = (0x0d, 0x10, 0x18), (0x1c, 0x22, 0x30)
for y in range(S):  # 夜空：上深下浅
    t = y / (S - 1)
    c = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    for x in range(S):
        px[x, y] = c

# 月光
glow = Image.new('L', (S, S), 0)
ImageDraw.Draw(glow).ellipse((60, 40, 360, 340), fill=150)
glow = glow.filter(ImageFilter.GaussianBlur(90))
img.paste((0xf0, 0xc7, 0x7e), (0, 0), glow.point(lambda v: int(v * 0.55)))
ImageDraw.Draw(img).ellipse((150, 130, 250, 230), fill=(0xe8, 0xe0, 0xcf))

# 镇子的剪影
d = ImageDraw.Draw(img)
rnd = [0.62, 0.48, 0.7, 0.55, 0.8, 0.5, 0.66, 0.58, 0.74, 0.52]
w = S / len(rnd)
for i, h in enumerate(rnd):
    x0, y0 = i * w, S * h + 120
    d.rectangle((x0, y0, x0 + w + 1, S), fill=(0x11, 0x15, 0x1f))
    d.polygon([(x0, y0), (x0 + w / 2, y0 - w * 0.45), (x0 + w + 1, y0)], fill=(0x11, 0x15, 0x1f))
d.rectangle((0, S - 150, S, S), fill=(0x0b, 0x0d, 0x14))

# 字：残响的「响」，带一层金色的余晖
font = ImageFont.truetype(os.path.join(ROOT, 'godot/assets/fonts/display.ttf'), 600)
halo = Image.new('L', (S, S), 0)
ImageDraw.Draw(halo).text((S / 2, S / 2 + 20), '响', font=font, anchor='mm', fill=255)
img.paste((0xd9, 0xa6, 0x53), (0, 0), halo.filter(ImageFilter.GaussianBlur(28)).point(lambda v: int(v * 0.6)))
d = ImageDraw.Draw(img)
d.text((S / 2, S / 2 + 20), '响', font=font, anchor='mm', fill=(0xe8, 0xe0, 0xcf))

out = os.path.join(ROOT, 'godot/assets/icon.png')
img.save(out)
print(out)
