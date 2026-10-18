# SkillToSuccess website + admin panel

Plain HTML, Tailwind CSS and JavaScript. No build step is needed to run it: `assets/css/app.css` is already built.

| Folder / file | What it is |
|---|---|
| `*.html` | Website pages (home, courses, course, lesson, pricing, checkout, login, dashboard, play, **jobs**, verify, certificate, about, contact, help, legal, 404) |
| `admin/` | Admin panel, opens at **/admin** |
| `assets/js/core/config.js` | The only setting you may change: `API_BASE` |
| `assets/js/pages/` | One script per page |
| `assets/css/app.css` | Built CSS (do not edit by hand) |
| `src/input.css`, `tailwind.config.js` | CSS source and colours |
| `assets/fonts`, `assets/img`, `assets/vendor` | Self-hosted fonts, logo, QR library |
| `scripts/` | Small helpers for developers (icons, shared head, screenshots) |

## How it talks to the backend

`config.js` has `API_BASE: '/api/skilltosuccess'`. This means the website and the API are on the **same domain**, and Nginx sends `/api/` to Django. This is the setup in the backend zip (`deploy/nginx-skilltosuccess.conf`). Nothing to change.

If you ever host the API on a different domain:

| Where | Change |
|---|---|
| `assets/js/core/config.js` | `API_BASE: 'https://api.your-domain.com/api/skilltosuccess'` |
| backend `.env` | `CORS_ALLOWED_ORIGINS=https://your-domain.com` |

## Run on your laptop

Unzip the website zip and the backend zip in the **same folder**, so you have `skilltosuccess/frontend` and `skilltosuccess/backend` side by side. Then run Django with `DEBUG=True`:

```bash
cd skilltosuccess/backend
python manage.py runserver
```

Open http://127.0.0.1:8000/ for the website and http://127.0.0.1:8000/admin/ for the admin panel. Django serves this folder automatically in debug mode.

## Put it live

1. Copy this folder to the server as `/srv/skilltosuccess/app/frontend`.
2. Use the Nginx file from the backend zip (`deploy/nginx-skilltosuccess.conf`). It serves this folder at `/`, the admin panel at `/admin/`, and sends `/api/` to Django.
3. Run `sudo nginx -t && sudo systemctl reload nginx`.

Full step-by-step server guide: `README.md` in the backend zip.

## Change the design

```bash
npm install
npm run watch:css      # rebuilds assets/css/app.css while you edit
npm run build:css      # one final minified build
python3 scripts/head.py   # only if you edit the shared <head> or script list
```

After changing CSS or JS on the live site, raise `?v=1` to `?v=2` in the HTML files so browsers load the new files.


## Version 1.2

| Added | Where |
|---|---|
| Cashback calculator | `packages.html` |
| Job connect page | `jobs.html` |
| Welcome poster | `assets/js/core/app.js` (`poster()`), styles in `src/input.css` |
| Founder block | `about.html` |
| Per-package cashback and the GST line | `assets/js/core/app.js` (`courseReward()`, `gstLine()`) |

Everything above reads its numbers from the server, so changing a setting in the admin panel
is enough — no code change and no rebuild.

After editing CSS or JS, raise `?v=6` to `?v=7` in the HTML files so browsers load the new files.
