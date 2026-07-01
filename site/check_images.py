import os
import re
import json

with open('data.js', encoding='utf-8') as f:
    text = f.read()

m = re.search(r"window\.GALLERY_DATA\s*=\s*\{.*?paintings:\s*(\[.*\])\s*\}\s*;", text, re.S)
if not m:
    raise SystemExit('PARSE_FAIL')
arr_text = m.group(1)
arr_text = re.sub(r'([a-zA-Z0-9_]+)\s*:', r'"\1":', arr_text)
arr_text = arr_text.replace("'", '"')
arr_text = re.sub(r',\s*([\}\]])', r'\1', arr_text)
paintings = json.loads(arr_text)
imgs = set(os.listdir('images'))
missing = [os.path.basename(p['image']) for p in paintings if p.get('image') and os.path.basename(p['image']) not in imgs]
print('Missing count', len(missing))
print('Missing images:', missing)
print('Image count folder', len(imgs))
# duplicate file name case-insensitive
lower = {}
for f in imgs:
    lower.setdefault(f.lower(), []).append(f)
for k, v in lower.items():
    if len(v) > 1:
        print('DUPLICATE CASE:', k, v)
