#!/usr/bin/env python3
"""Генерация QR-кодов для 29 картин Приморской картинной галереи."""
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image, ImageDraw, ImageFont
import os

BASE = "https://aganimka.github.io/Gallery-site"
OUT = "site/qrcodes"
os.makedirs(OUT, exist_ok=True)

# Названия картин для подписи под QR
titles = {
    1: "Рокотов — Портрет кн. Голицына",
    2: "Левицкий — Екатерина II",
    3: "Боровиковский — Митрополит Десницкий",
    4: "Щедрин — Вид Сорренто",
    5: "Басин — Вакханалия",
    6: "Кипренский — Неизвестный в шубе",
    7: "Тропинин — Портрет Заикина",
    8: "Легашов — Китаец и китаянка",
    9: "Попов — Клеопатра",
    10: "Худяков/Харламовы — Салон",
    11: "Верещагин — Туркестанская серия",
    12: "Кившенко — Окрестности Мюнхена",
    13: "Репин — Галкин-Враской",
    14: "Серов — Княгиня Ливен",
    15: "Фешин — Золотые волосы",
    16: "Нестеров — Христова невеста",
    17: "Кончаловский — Портрет Генц",
    18: "Айвазовский — Восход на Чёрном море",
    19: "Шагал — Брат Давид с мандолиной",
    20: "Поленов — Генисаретское озеро",
    21: "Сомов — Портрет Гиршман",
    22: "Кузнецов — Киргизка с барашком",
    23: "Лентулов — Портрет Лентуловой",
    24: "Италия XIV в. — Богоматерь",
    25: "Бассано — Благовестие пастухам",
    26: "Паннини — Пейзаж с руинами",
    27: "Моннуайе — Цветы",
    28: "Анри Зо — Перед боем быков",
    29: "Голландия XVII в. — Натюрморт",
}

def find_font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

DARK = (26, 24, 33)      # тёмно-синий/баклажан
GOLD = (140, 110, 60)
ACCENT = (201, 168, 110)

for pid in range(1, 30):
    url = f"{BASE}/#p={pid}"
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_H,
                       box_size=18, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=SolidFillColorMask(front_color=DARK, back_color=(255, 255, 255)),
    ).convert("RGB")

    qw, qh = img.size
    # Финальная карточка с рамкой и подписью
    pad = 90
    cap_h = 200
    W = qw + pad * 2
    H = qh + pad + cap_h
    card = Image.new("RGB", (W, H), (250, 248, 244))
    draw = ImageDraw.Draw(card)
    # двойная декоративная рамка
    draw.rectangle([18, 18, W - 18, H - 18], outline=ACCENT, width=4)
    draw.rectangle([30, 30, W - 30, H - 30], outline=DARK, width=2)
    # QR
    card.paste(img, (pad, pad))

    # Заголовок над QR (номер)
    f_num = find_font(46)
    num_txt = f"№ {pid}"
    bbox = draw.textbbox((0, 0), num_txt, font=f_num)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, 44), num_txt, fill=DARK, font=f_num)

    # Подпись (название) с переносом
    f_cap = find_font(34)
    f_sub = find_font(26)
    title = titles[pid]
    # перенос по словам
    words = title.split()
    lines, cur = [], ""
    maxw = W - 80
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textbbox((0, 0), test, font=f_cap)[2] <= maxw:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)

    y = qh + pad + 24
    for line in lines:
        bb = draw.textbbox((0, 0), line, font=f_cap)
        lw = bb[2] - bb[0]
        draw.text(((W - lw) / 2, y), line, fill=DARK, font=f_cap)
        y += 44

    sub = "Приморская картинная галерея"
    bb = draw.textbbox((0, 0), sub, font=f_sub)
    sw = bb[2] - bb[0]
    draw.text(((W - sw) / 2, H - 70), sub, fill=GOLD, font=f_sub)

    out_path = os.path.join(OUT, f"qr_{pid:02d}.png")
    card.save(out_path, "PNG")
    print(f"saved {out_path}  ->  {url}")

print("Готово: 29 QR-кодов")
