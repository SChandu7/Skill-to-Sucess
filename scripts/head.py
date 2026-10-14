"""Writes the shared <head> + script tags into every page. Run after editing HEAD/SCRIPTS:  python3 scripts/head.py"""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
HEAD = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A7BC2">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/lexend-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/figtree-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/app.css?v=1">'''
CORE = ['assets/js/core/icons.js', 'assets/js/core/config.js', 'assets/js/core/api.js', 'assets/js/core/app.js']
for f in sorted(ROOT.glob('*.html')):
    s = f.read_text()
    s = re.sub(r'<!--HEAD-->.*?<!--/HEAD-->', '<!--HEAD-->\n' + HEAD + '\n<!--/HEAD-->', s, flags=re.S)
    s = re.sub(r'<!--CORE-->.*?<!--/CORE-->', '<!--CORE-->\n' + '\n'.join(f'<script src="{c}?v=1"></script>' for c in CORE) + '\n<!--/CORE-->', s, flags=re.S)
    f.write_text(s)
    print('updated', f.name)
