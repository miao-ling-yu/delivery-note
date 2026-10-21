# -*- coding: utf-8 -*-
"""生成送货单统计应用图标（琥珀底 + 白色单据图形）"""
from PIL import Image, ImageDraw

sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
base = r"C:\Users\miaoj\Desktop\送货单统计\android\app\src\main\res"

for name, px in sizes.items():
    img = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 圆角方形琥珀底（带轻微渐变）
    r = int(px * 0.22)
    top = (217, 154, 43, 255)
    bottom = (169, 110, 22, 255)
    # 逐行画渐变
    for y in range(px):
        t = y / px
        col = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
        d.rounded_rectangle([0, y, px, y + 1], radius=0, fill=col)
    # 再套圆角遮罩
    mask = Image.new('L', (px, px), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, px - 1, px - 1], radius=r, fill=255)
    img.putalpha(mask)

    # 白色单据：圆角矩形 + 折角 + 三行文字线 + 对勾
    u = px / 48.0  # 以48为基准
    doc_x0, doc_y0, doc_x1, doc_y1 = 12 * u, 10 * u, 36 * u, 38 * u
    doc = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    dd = ImageDraw.Draw(doc)
    dd.rounded_rectangle([doc_x0, doc_y0, doc_x1, doc_y1], radius=4 * u, fill=(255, 255, 255, 255))
    # 三行文字线
    for i in range(3):
        ly = (15 + i * 5.5) * u
        dd.rounded_rectangle([doc_x0 + 4 * u, ly, doc_x1 - 7 * u, ly + 2.2 * u], radius=1.1 * u, fill=(217, 154, 43, 255))
    # 对勾（蓝色）
    ck = 3.2 * u
    dd.line([(doc_x0 + 5 * u, 27 * u), (doc_x0 + 8.5 * u, 30 * u), (doc_x1 - 6 * u, 22.5 * u)], fill=(62, 111, 168, 255), width=int(ck), joint='curve')
    img = Image.alpha_composite(img, doc)

    out = rf"{base}\mipmap-{name}\ic_launcher.png"
    import os
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out, 'PNG')
    print(name, px, '->', out)
