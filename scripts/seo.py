"""SEO for skilltosuccess.org. Run from the website folder after adding pages or courses:

    python scripts/seo.py

It writes, in every page, a <!--SEO--> block (title, description, canonical, robots, Open Graph, Twitter, JSON-LD),
and creates robots.txt and sitemap.xml (course pages come from the live API). Safe to run again and again.
"""
import json
import pathlib
import re
import urllib.request
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://skilltosuccess.org'
API = 'https://api.chandus7.in/api/skilltosuccess'
BRAND = 'Skill To Success'
IMAGE = SITE + '/assets/img/og-image.jpg'
# Google Search Console → Settings → Ownership verification → HTML tag: paste only the content="..." value here.
GOOGLE_VERIFICATION = ''
BING_VERIFICATION = ''

# page: (title, description, priority, change frequency). None = private page, kept out of Google.
PAGES = {
    'index.html': ('Skill To Success | Online courses in digital skills with certificates',
                   'Skill To Success (SkillToSuccess) is an Indian online learning platform for practical digital skills: Instagram, '
                   'YouTube, Canva, video editing, AI tools, digital marketing, Excel, coding and more. Free preview lessons, a quiz '
                   'after every lesson and certificates anyone can verify.', '1.0', 'daily'),
    'courses.html': ('All courses | Skill To Success',
                     'Browse every Skill To Success course: social media, design, video editing, AI tools, digital marketing, MS Office, '
                     'Python, Java, web development and more. Every course has free preview lessons and a verifiable certificate.', '0.9', 'daily'),
    'packages.html': ('Course packages and pricing | Skill To Success',
                      'Skill To Success course packages from Rs 399, GST included. Pick your courses, learn at your own pace, earn a '
                      'verifiable certificate and cashback for every course you finish.', '0.9', 'weekly'),
    'about.html': ('About Skill To Success | Founder Kotti Sriramulu',
                   'Skill To Success is an Indian online learning company from Guntur, Andhra Pradesh, founded by Kotti Sriramulu. '
                   'Short lessons, a quiz after every lesson and certificates anyone can check.', '0.7', 'monthly'),
    'earners.html': ('Top earners and learners | Skill To Success',
                     'See the top learners and earners on Skill To Success: cashback for finished courses and referrals, from real buyers only.', '0.6', 'daily'),
    'play.html': ('Play and earn: free skill quizzes and games | Skill To Success',
                  'Free quizzes and quick games built from Skill To Success courses. Learn while you play and earn a small reward.', '0.6', 'weekly'),
    'verify.html': ('Verify a certificate | Skill To Success',
                    'Check any Skill To Success certificate by its ID. Employers and colleges can confirm the name, course and score in seconds.', '0.6', 'monthly'),
    'help.html': ('Help and FAQ | Skill To Success',
                  'Answers about Skill To Success courses, packages, payments, certificates, refer and earn, withdrawals and support.', '0.5', 'monthly'),
    'contact.html': ('Contact us | Skill To Success',
                     'Contact Skill To Success by phone, WhatsApp or email. We help with courses, payments, certificates and your account.', '0.5', 'monthly'),
    'jobs.html': ('Job connect | Skill To Success',
                  'Finish a Skill To Success course, build real work you can show, and get connected to people who are hiring.', '0.4', 'monthly'),
    'legal.html': ('Terms, refund and privacy policy | Skill To Success',
                   'Terms of use, refund policy, referral terms and privacy policy of Skill To Success.', '0.3', 'yearly'),
    'course.html': ('Course | Skill To Success', 'An online course on Skill To Success with free preview lessons, quizzes and a verifiable certificate.', None, None),
    'login.html': None, 'checkout.html': None, 'dashboard.html': None, 'lesson.html': None, 'certificate.html': None, '404.html': None,
}


def fetch_site():
    try:
        with urllib.request.urlopen(API + '/site/', timeout=20) as r:
            return json.load(r)
    except Exception as e:                       # the page tags still work without the API
        print('could not read the live API:', e)
        return {'settings': {}, 'courses': []}


def organisation(settings):
    s = settings or {}
    founder = (s.get('founder') or {}).get('name') or 'Kotti Sriramulu'
    org = {
        '@type': 'EducationalOrganization', '@id': SITE + '/#organization',
        'name': BRAND, 'alternateName': ['SkillToSuccess', 'Skill to Success', 'skilltosuccess'],
        'url': SITE + '/', 'logo': SITE + '/logo.jpeg', 'image': IMAGE,
        'description': PAGES['index.html'][1],
        'founder': {'@type': 'Person', 'name': founder.title()},
        'address': {'@type': 'PostalAddress', 'addressLocality': 'Guntur', 'addressRegion': 'Andhra Pradesh', 'addressCountry': 'IN'},
        'areaServed': 'IN',
        'sameAs': [v for v in (s.get('social') or {}).values() if v],
    }
    if s.get('phone') or s.get('email'):
        org['contactPoint'] = [{'@type': 'ContactPoint', 'contactType': 'customer support', 'areaServed': 'IN',
                                'availableLanguage': ['English'], **({'telephone': s['phone']} if s.get('phone') else {}),
                                **({'email': s['email']} if s.get('email') else {})}]
    msme = s.get('msme') or {}
    if msme.get('number'):
        org['identifier'] = {'@type': 'PropertyValue', 'propertyID': 'Udyam Registration Number', 'value': msme['number']}
    return org


def jsonld(page, site):
    org = organisation(site.get('settings'))
    graph = []
    if page == 'index.html':
        graph = [org, {'@type': 'WebSite', '@id': SITE + '/#website', 'url': SITE + '/', 'name': BRAND,
                       'alternateName': ['SkillToSuccess', 'Skill to Success'], 'inLanguage': 'en-IN',
                       'publisher': {'@id': SITE + '/#organization'}}]
        courses = site.get('courses') or []
        if courses:
            graph.append({'@type': 'ItemList', 'name': BRAND + ' courses', 'itemListElement': [
                {'@type': 'ListItem', 'position': i + 1, 'url': f"{SITE}/course.html?c={c['slug']}", 'name': c['title']}
                for i, c in enumerate(courses)]})
    elif page == 'about.html':
        graph = [org, {'@type': 'AboutPage', 'url': SITE + '/about.html', 'name': PAGES[page][0], 'about': {'@id': SITE + '/#organization'}}]
    elif PAGES.get(page):
        graph = [{'@type': 'WebPage', 'url': f'{SITE}/{page}', 'name': PAGES[page][0], 'isPartOf': {'@id': SITE + '/#website'},
                  'breadcrumb': {'@type': 'BreadcrumbList', 'itemListElement': [
                      {'@type': 'ListItem', 'position': 1, 'name': BRAND, 'item': SITE + '/'},
                      {'@type': 'ListItem', 'position': 2, 'name': PAGES[page][0].split(' | ')[0], 'item': f'{SITE}/{page}'}]}}]
    if not graph:
        return ''
    data = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=1)
    return '<script type="application/ld+json">\n' + data + '\n</script>\n'


def esc(v):
    return v.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')


def block(page, site):
    cfg = PAGES.get(page)
    if cfg is None:
        return '<meta name="robots" content="noindex, follow">\n'
    title, desc = cfg[0], cfg[1]
    url = SITE + '/' if page == 'index.html' else f'{SITE}/{page}'
    out = [
        f'<meta name="robots" content="index, follow, max-image-preview:large">',
        f'<link rel="canonical" href="{url}">' if page != 'course.html' else '',
        f'<meta property="og:site_name" content="{BRAND}">',
        '<meta property="og:locale" content="en_IN">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(desc)}">',
        f'<meta property="og:url" content="{url}">' if page != 'course.html' else '',
        f'<meta property="og:image" content="{IMAGE}">',
        '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{esc(title)}">',
        f'<meta name="twitter:description" content="{esc(desc)}">',
        f'<meta name="twitter:image" content="{IMAGE}">',
    ]
    if page == 'index.html':
        out += [f'<meta name="google-site-verification" content="{GOOGLE_VERIFICATION}">' if GOOGLE_VERIFICATION else '',
                f'<meta name="msvalidate.01" content="{BING_VERIFICATION}">' if BING_VERIFICATION else '']
    return '\n'.join(x for x in out if x) + '\n' + jsonld(page, site)


def write_pages(site):
    for f in sorted(ROOT.glob('*.html')):
        page = f.name
        if page not in PAGES:
            print('skip (not in PAGES):', page)
            continue
        s = f.read_text(encoding='utf-8')
        cfg = PAGES[page]
        if cfg:
            s = re.sub(r'<title>.*?</title>', f'<title>{cfg[0]}</title>', s, count=1, flags=re.S)
            if re.search(r'<meta name="description"[^>]*>', s):
                s = re.sub(r'<meta name="description"[^>]*>', f'<meta name="description" content="{esc(cfg[1])}">', s, count=1)
            else:
                s = s.replace('</title>', f'</title>\n<meta name="description" content="{esc(cfg[1])}">', 1)
        # old hand-written tags are replaced by the block
        s = re.sub(r'<meta (property="og:[^"]+"|name="twitter:[^"]+"|name="robots") content="[^"]*">\n?', '', s)
        s = re.sub(r'\n?<!--SEO-->.*?<!--/SEO-->', '', s, flags=re.S)
        s = s.replace('<!--HEAD-->', '<!--SEO-->\n' + block(page, site) + '<!--/SEO-->\n<!--HEAD-->', 1)
        f.write_text(s, encoding='utf-8', newline='')
        print('seo:', page)


def write_robots_and_sitemap(site):
    (ROOT / 'robots.txt').write_text(
        'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /dashboard.html\nDisallow: /checkout.html\n'
        f'\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8', newline='')
    today = date.today().isoformat()
    urls = [(SITE + '/' if p == 'index.html' else f'{SITE}/{p}', c[2], c[3]) for p, c in PAGES.items() if c and c[2]]
    urls += [(f"{SITE}/course.html?c={c['slug']}", '0.8', 'weekly') for c in site.get('courses') or []]
    body = ''.join(f'  <url><loc>{u.replace("&", "&amp;")}</loc><lastmod>{today}</lastmod><changefreq>{f}</changefreq><priority>{p}</priority></url>\n'
                   for u, p, f in urls)
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      + body + '</urlset>\n', encoding='utf-8', newline='')
    print(f'robots.txt + sitemap.xml ({len(urls)} URLs)')


if __name__ == '__main__':
    data = fetch_site()
    write_pages(data)
    write_robots_and_sitemap(data)
