"""Dev helper: screenshot pages served by the local Django dev server and print console errors.
Usage: python3 scripts/shot.py index.html "course.html?c=seo" [--w 1280] [--full] [--login email:password] [--out DIR]
"""
import argparse
import os

from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('pages', nargs='+')
ap.add_argument('--w', type=int, default=1280)
ap.add_argument('--h', type=int, default=860)
ap.add_argument('--full', action='store_true')
ap.add_argument('--out', default=os.environ.get('SHOT_OUT', '/tmp'))
ap.add_argument('--base', default='http://127.0.0.1:8000/')
ap.add_argument('--login', default='')
ap.add_argument('--wait', type=int, default=1500)
ap.add_argument('--js', default='')
a = ap.parse_args()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': a.w, 'height': a.h})
    pg = ctx.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error',) else None)
    pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
    if a.login:
        email, pw = a.login.split(':', 1)
        pg.goto(a.base + 'login.html')
        pg.wait_for_function('window.STS && STS.api')
        pg.evaluate('([e,p]) => STS.api.login(e,p)', [email, pw])
    for name in a.pages:
        pg.goto(a.base + name)
        pg.wait_for_timeout(a.wait)
        if a.js:
            pg.evaluate(a.js)
            pg.wait_for_timeout(500)
        out = os.path.join(a.out, name.replace('/', '_').replace('?', '_').replace('#', '_').replace('=', '-') + f'-{a.w}.png')
        pg.screenshot(path=out, full_page=a.full)
        print('shot', out)
    for e in errs:
        print(e)
    b.close()
