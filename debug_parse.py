import re
from pathlib import Path
text = Path('site/data.js').read_text(encoding='utf-8')

pattern = re.compile(r'window\.GALLERY_DATA\s*=\s*\{(.*?)\}\s*;', re.S)
match = pattern.search(text)
print('matched', bool(match))
if not match:
    raise SystemExit('no match')
body = match.group(1)
print('body head:', repr(body[:200]))
print('body tail:', repr(body[-200:]))

body2 = re.sub(r'([\w$]+)\s*:', r'"\1":', body)
body2 = body2.replace("'", '"')
body2 = re.sub(r',\s*([\}\]])', r'\1', body2)
print('cleaned head:', repr(body2[:200]))
print('cleaned tail:', repr(body2[-200:]))
print('attempt parse...')
import json
json.loads('{' + body2 + '}')
print('parsed okay')
