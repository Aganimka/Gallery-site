#!/usr/bin/env python3
"""Компактные QR (base64 data-URI) для встраивания в сайт — работают в офлайн-превью."""
import qrcode
from qrcode.constants import ERROR_CORRECT_M
import io, base64

BASE = "https://primgallery.com"
parts = ["window.QR_DATA = {"]
for pid in range(1, 30):
    url = f"{BASE}/#p={pid}"
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=8, border=2)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(fill_color="#1a1821", back_color="white").convert("RGB")
    buf = io.BytesIO(); img.save(buf, "PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    parts.append(f'  {pid}: "data:image/png;base64,{b64}",')
parts.append("};")
with open("site/qr_data.js", "w") as f:
    f.write("\n".join(parts))
print("site/qr_data.js written")
