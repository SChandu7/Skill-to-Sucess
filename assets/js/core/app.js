/* SkillToSuccess — app shell: boot (site data + session), header, footer, modals, toasts and shared helpers. */
window.STS = window.STS || {};

STS.ui = (function () {
  'use strict';
  var A = STS.api;
  var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';

  /* ------------------------------------------------------------------ helpers */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(name, cls) { return '<svg class="i ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
  function inr(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
  function num(n) { return Math.round(Number(n) || 0).toLocaleString('en-IN'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function date(v, o) { return new Date(v).toLocaleDateString('en-IN', o || { day: 'numeric', month: 'short', year: 'numeric' }); }
  function ago(v) {
    var ts = new Date(v).getTime(), s = Math.round((Date.now() - ts) / 1000);
    if (s < 0) { var d = Math.ceil(-s / 86400); return 'in ' + d + (d === 1 ? ' day' : ' days'); }
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    var dd = Math.floor(s / 86400); return dd === 1 ? 'yesterday' : dd < 30 ? dd + ' days ago' : date(v);
  }
  var TONES = ['#0A7BC2', '#F27F1B', '#6C5CE7', '#0E8F7E', '#D9466F', '#2F6FED', '#5E8A1E', '#A0522D'];
  function avatar(name, size) {
    var n = String(name || '?'), t = TONES[n.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) % TONES.length];
    var ini = n.split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
    size = size || 40;
    return '<span class="inline-grid flex-none place-items-center rounded-full font-display font-semibold text-white" style="width:' + size + 'px;height:' + size + 'px;background:' + t + ';font-size:' + Math.round(size * 0.38) + 'px">' + esc(ini) + '</span>';
  }
  // The drawn mark we fall back to if the logo file is missing, so a page never shows a broken image.
  var LOGO_FALLBACK = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#0A7BC2"/><path d="M8 22.5 13.5 17l4 3 6.5-8.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="11.5" r="3.3" fill="#FF9A3D"/></svg>';

  // Where the site lives, worked out from this script's own URL, so /admin/ finds the
  // logo too. Change LOGO_FILE if you name your picture something else.
  var LOGO_FILE = 'logo.jpeg';
  var SITE_ROOT = (function () {
    var el = document.querySelector('script[src*="core/app.js"]');
    return el ? el.src.replace(/assets\/js\/core\/app\.js.*$/, '') : '';
  })();
  STS.logoFail = function (img) { img.outerHTML = LOGO_FALLBACK; };
  var LOGO_SVG = '<img src="' + SITE_ROOT + LOGO_FILE + '" alt="" class="sts-logo" onerror="STS.logoFail(this)">';
  function logo(light) {
    return '<a href="index.html" class="flex items-center gap-2.5 rounded-lg" aria-label="SkillToSuccess home"><span class="h-9 w-9 flex-none">' + LOGO_SVG + '</span>' +
      '<span class="font-display text-[19px] font-semibold tracking-tight ' + (light ? 'text-white' : 'text-ink-900') + '">Skill<span class="text-orange-500">To</span>Success</span></a>';
  }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* URL params that survive hosts that strip query strings */
  var NAV_KEY = 'sts:nav';
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var href = a.getAttribute('href'); if (!href || /^(https?:|mailto:|tel:|#)/.test(href) || href.indexOf('?') < 0) return;
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify({ page: href.split('?')[0].replace(/\.html$/, ''), q: href.split('?')[1].split('#')[0] })); } catch (err) { /* */ }
  }, true);
  function param(name) {
    var v = new URLSearchParams(location.search).get(name); if (v) return v;
    try { var n = JSON.parse(sessionStorage.getItem(NAV_KEY) || 'null'); if (n && n.page === page) return new URLSearchParams(n.q).get(name); } catch (err) { /* */ }
    return null;
  }

  /* ------------------------------------------------------------------ state */
  var state = { site: null, me: null, courseMap: {}, packageMap: {}, categoryMap: {} };

  function loadSite() {
    var KEY = 'sts:site';
    try {
      var c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (c && Date.now() - c.t < STS.config.SITE_CACHE_SECONDS * 1000) return Promise.resolve(c.d);
    } catch (e) { /* */ }
    return A.site().then(function (d) { try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* */ } return d; });
  }
  function setSite(d) {
    state.site = d;
    state.courseMap = {}; state.packageMap = {}; state.categoryMap = {};
    d.courses.forEach(function (c) { state.courseMap[c.slug] = c; });
    d.packages.forEach(function (p) { state.packageMap[p.slug] = p; });
    d.categories.forEach(function (c) { state.categoryMap[c.slug] = c; });
  }
  function loadMe() {
    if (!A.maybeLoggedIn()) return Promise.resolve(null);
    return A.me().then(function (m) { return m; }, function () { return null; });
  }
  function refreshMe() { return A.me().then(function (m) { state.me = m; return m; }, function () { state.me = null; return null; }); }
  function setMe(m) { state.me = m; }

  function owned(slug) { return !!(state.me && state.me.owned_courses.indexOf(slug) >= 0); }
  function progress(slug) { return state.me && state.me.progress[slug] || null; }
  // A package covers a course when the buyer picks their own courses (course_slots), when it
  // includes every course, or when the course is in its fixed list.
  function packageCovers(p, slug) { return p.course_slots > 0 || p.includes_future_courses || p.courses.indexOf(slug) >= 0; }
  function cheapestPackageFor(slug) { return state.site.packages.filter(function (p) { return packageCovers(p, slug); }).sort(function (a, b) { return a.price - b.price; })[0]; }
  // What one finished course pays in this package.
  function courseReward(p) { return (p && p.course_cashback) || (state.site.settings.course_reward || {}).amount || 0; }
  // The tax already inside a price. We never add it on top.
  function gstLine(amount) {
    var g = state.site.settings.gst || {};
    if (!g.percent) return '';
    var base = Math.round(amount / (1 + g.percent / 100));
    return 'Includes ' + inr(amount - base) + ' GST (' + g.percent + '%) · course value ' + inr(base);
  }
  function packageCourseCount(p) { return p.course_count || (p.includes_future_courses ? state.site.courses.length : p.course_slots || p.courses.length); }
  function packageCourseLine(p) {
    if (p.includes_future_courses) return 'Every course (' + state.site.courses.length + '), plus new ones';
    if (p.course_slots) return 'Pick any ' + p.course_slots + ' course' + (p.course_slots === 1 ? '' : 's');
    return p.courses.length + ' courses';
  }

  /* ------------------------------------------------------------------ referral links */
  function captureRef() {
    var code = new URLSearchParams(location.search).get('ref'); if (!code) return;
    code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    A.checkRef(code).then(function (r) {
      if (!r.valid) return;
      try { localStorage.setItem('sts:ref', code); } catch (e) { /* */ }
      toast(r.name + ' invited you. ' + inr(state.site.settings.referral.friend_discount) + ' off your first package is applied at checkout.', 'gift');
    }, function () { /* ignore */ });
  }
  function savedRef() { try { return localStorage.getItem('sts:ref') || ''; } catch (e) { return ''; } }

  /* ------------------------------------------------------------------ header */
  var NAV = [['courses', 'Courses'], ['packages', 'Pricing'], ['play', 'Play & earn'], ['earners', 'Top earners'],
             ['refer', 'Refer & earn', 'index.html#refer'], ['jobs', 'Job connect'], ['verify', 'Verify']];
  function header(opts) {
    opts = opts || {};
    var u = state.me, host = $('#site-header'); if (!host) return;
    var s = state.site.settings;
    var links = NAV.map(function (n) { return '<a class="nav-link" href="' + (n[2] || n[0] + '.html') + '"' + (page === n[0] ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('');
    var right = u ?
      '<button class="relative grid h-10 w-10 place-items-center rounded-full text-ink-600 hover:bg-sky-50" id="bell" aria-label="Notifications">' + icon('bell') + (u.unread_notifications ? '<span class="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-orange-400 ring-2 ring-white"></span>' : '') + '</button>' +
      '<div class="relative"><button id="acct" class="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 hover:border-sky-300" aria-haspopup="menu" aria-expanded="false">' + avatar(u.name, 32) + '<span class="hidden text-sm font-semibold sm:inline">' + esc(u.first_name) + '</span>' + icon('chevron-down', 'i-sm text-ink-400') + '</button>' +
      '<div id="acct-menu" class="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-line bg-white p-2 shadow-pop" role="menu" hidden>' +
      '<div class="px-3 py-2"><p class="font-semibold">' + esc(u.name) + '</p><p class="text-xs text-ink-500">' + (u.package ? u.package.name + ' package' : 'Free account') + '</p></div><div class="divider my-1"></div>' +
      (u.is_staff ? '<a role="menuitem" class="side-link !py-2 !text-sky-700" href="admin/">' + icon('sliders-horizontal', 'text-sky-600') + 'Admin panel</a>' : '') +
      [['dashboard.html#overview', 'layout-dashboard', 'Dashboard'], ['dashboard.html#courses', 'book-open', 'My courses'], ['dashboard.html#wallet', 'wallet', 'Wallet'], ['dashboard.html#refer', 'gift', 'Refer & earn'], ['dashboard.html#profile', 'settings', 'Profile']]
        .map(function (m) { return '<a role="menuitem" class="side-link !py-2" href="' + m[0] + '">' + icon(m[1], 'text-ink-400') + m[2] + '</a>'; }).join('') +
      '<div class="divider my-1"></div><button role="menuitem" class="side-link !py-2 w-full" data-logout>' + icon('log-out', 'text-ink-400') + 'Log out</button></div></div>'
      : '<a class="nav-link hidden sm:inline-flex" href="login.html">Log in</a><a class="btn btn-primary btn-sm" href="login.html#register">Start free</a>';

    host.outerHTML =
      (s.announcement && !opts.minimal ? '<div class="topbar"><div class="container flex items-center justify-center gap-2 py-2 text-center">' + icon('megaphone', 'i-sm text-orange-300') + '<span>' + esc(s.announcement) + '</span></div></div>' : '') +
      '<header class="site-header" id="site-header-el"><div class="container flex h-[72px] items-center gap-4">' + logo() +
      (opts.minimal ? '<div class="ml-auto flex items-center gap-2">' + right + '</div>' :
        '<nav class="ml-8 hidden items-center gap-1 lg:flex" aria-label="Main">' + links + '</nav>' +
        '<div class="ml-auto flex items-center gap-2">' + right + '<button class="grid h-10 w-10 place-items-center rounded-lg hover:bg-sky-50 lg:hidden" id="menu-btn" aria-label="Open menu">' + icon('menu') + '</button></div>') +
      '</div></header>';

    var el = $('#site-header-el');
    var onScroll = function () { el.classList.toggle('scrolled', window.scrollY > 6); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    var mb = $('#menu-btn'); if (mb) mb.addEventListener('click', openDrawer);
    var ab = $('#acct'), am = $('#acct-menu');
    if (ab) {
      ab.addEventListener('click', function (e) { e.stopPropagation(); am.hidden = !am.hidden; ab.setAttribute('aria-expanded', String(!am.hidden)); });
      document.addEventListener('click', function (e) { if (!am.hidden && !am.contains(e.target)) { am.hidden = true; ab.setAttribute('aria-expanded', 'false'); } });
    }
    var bell = $('#bell'); if (bell) bell.addEventListener('click', showNotifications);
    $$('[data-logout]').forEach(function (b) { b.addEventListener('click', logout); });
  }
  function openDrawer() {
    var u = state.me;
    var ov = h('<div class="fixed inset-0 z-[59] bg-ink-900/40" style="animation:fadeIn .15s both"></div>');
    var items = [['index.html', 'home', 'Home'], ['courses.html', 'book-open', 'Courses'], ['packages.html', 'layers', 'Pricing'], ['play.html', 'gamepad-2', 'Play & earn'], ['index.html#refer', 'gift', 'Refer & earn'], ['jobs.html', 'briefcase', 'Job connect'], ['verify.html', 'badge-check', 'Verify a certificate'], ['about.html', 'users', 'About us'], ['help.html', 'help-circle', 'Help & FAQ'], ['contact.html', 'message-circle', 'Contact']];
    var dr = h('<aside class="drawer" role="dialog" aria-label="Menu"><div class="flex h-[72px] items-center justify-between border-b border-line px-5">' + logo() + '<button class="grid h-10 w-10 place-items-center rounded-lg hover:bg-sky-50" data-close aria-label="Close menu">' + icon('x') + '</button></div>' +
      '<nav class="flex flex-col gap-1 overflow-y-auto p-4">' + items.map(function (m) { return '<a class="side-link" href="' + m[0] + '">' + icon(m[1], 'text-ink-400') + m[2] + '</a>'; }).join('') + '</nav>' +
      '<div class="mt-auto border-t border-line p-4">' + (u ? '<a class="btn btn-primary btn-block" href="dashboard.html">' + icon('layout-dashboard') + 'Go to dashboard</a>' : '<div class="grid grid-cols-2 gap-2"><a class="btn btn-ghost" href="login.html">Log in</a><a class="btn btn-primary" href="login.html#register">Start free</a></div>') + '</div></aside>');
    function close() { ov.remove(); dr.remove(); document.body.style.overflow = ''; }
    ov.addEventListener('click', close); dr.querySelector('[data-close]').addEventListener('click', close);
    $$('a', dr).forEach(function (a) { a.addEventListener('click', close); });
    document.body.append(ov, dr); document.body.style.overflow = 'hidden'; dr.querySelector('[data-close]').focus();
  }
  function showNotifications() {
    var m = modal({ title: 'Notifications', icon: 'bell', body: '<div class="skel h-32"></div>', onClose: function () { A.readNotifications().then(function () { var d = $('#bell span'); if (d) d.remove(); if (state.me) state.me.unread_notifications = 0; }); } });
    A.notifications().then(function (r) {
      var list = r.results || r;
      m.body.innerHTML = list.length ? '<ul class="divide-y divide-line">' + list.map(function (n) {
        return '<li class="flex gap-3 py-3">' + (n.is_read ? '<span class="mt-2 h-2 w-2 flex-none"></span>' : '<span class="mt-2 h-2 w-2 flex-none rounded-full bg-orange-400"></span>') +
          '<div class="min-w-0 flex-1"><p class="text-[15px]">' + esc(n.text) + '</p><p class="text-xs text-ink-500">' + ago(n.created_at) + (n.link ? ' · <a class="link" href="' + esc(n.link) + '">Open</a>' : '') + '</p></div></li>';
      }).join('') + '</ul>' : '<p class="text-ink-500">No notifications yet.</p>';
    });
  }
  function logout() { A.logout().then(function () { location.href = 'index.html'; }, function () { location.href = 'index.html'; }); }

  /* ------------------------------------------------------------------ footer */
  function footer() {
    var host = $('#site-footer'); if (!host) return;
    var s = state.site.settings;
    var col = function (title, items) { return '<div><h3 class="mb-4 font-sans text-sm font-bold text-ink-900">' + title + '</h3><ul class="space-y-2.5 text-[15px] text-ink-600">' + items.map(function (i) { return '<li><a class="hover:text-sky-700" href="' + i[1] + '">' + i[0] + '</a></li>'; }).join('') + '</ul></div>'; };
    var social = [['instagram', 'Instagram'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']].filter(function (x) { return s.social[x[0]]; })
      .map(function (x) { return '<a class="chip !py-1 text-xs" target="_blank" rel="noopener" href="' + esc(s.social[x[0]]) + '">' + x[1] + '</a>'; }).join('');
    host.outerHTML = '<footer class="mt-auto border-t border-line bg-cloud"><div class="container py-14">' +
      '<div class="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]"><div class="max-w-sm">' + logo() + '<p class="mt-4 text-[15px] text-ink-600">' + esc(s.tagline) + ' Learn with short video, image and text lessons, prove it with quizzes, and get a certificate anyone can verify.</p>' +
      '<div class="mt-5 space-y-2 text-[15px] text-ink-700"><p class="flex items-center gap-2">' + icon('phone', 'text-sky-600') + '<span class="select-all">' + esc(s.phone) + '</span></p><p class="flex items-center gap-2">' + icon('mail', 'text-sky-600') + '<span class="select-all">' + esc(s.email) + '</span></p><p class="flex items-center gap-2">' + icon('clock', 'text-sky-600') + esc(s.hours) + '</p></div>' +
      (social ? '<div class="mt-5 flex flex-wrap gap-2">' + social + '</div>' : '') + '</div>' +
      col('Learn', [['All courses', 'courses.html'], ['Pricing', 'packages.html'], ['Play & earn', 'play.html'], ['Job connect', 'jobs.html'], ['Verify a certificate', 'verify.html']]) +
      col('Company', [['About us', 'about.html'], ['Refer & earn', 'index.html#refer'], ['Help & FAQ', 'help.html'], ['Contact', 'contact.html']]) +
      col('Policies', [['Terms of use', 'legal.html#terms'], ['Refund policy', 'legal.html#refund'], ['Referral terms', 'legal.html#referral'], ['Privacy policy', 'legal.html#privacy']]) +
      '</div><div class="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">' +
      '<p>© ' + new Date().getFullYear() + ' ' + esc(s.brand) + '. Payments secured by Razorpay. Prices include GST.</p>' +
      '<p class="flex items-center gap-2">' + icon('shield-check', 'text-sky-600') + 'Referral cashback is one level only. No chains, no targets.</p></div></div></footer>';
  }

  /* ------------------------------------------------------------------ toast, modal */
  function toast(msg, ic, bad) {
    var wrap = $('.toast-wrap') || document.body.appendChild(h('<div class="toast-wrap" role="status" aria-live="polite"></div>'));
    var t = h('<div class="toast' + (bad ? ' bad' : '') + '">' + icon(ic || (bad ? 'alert-triangle' : 'check-circle-2'), bad ? '' : 'text-sky-300') + '<span>' + esc(msg) + '</span></div>');
    wrap.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(function () { t.remove(); }, 300); }, bad ? 5000 : 3600);
  }
  function modal(o) {
    var last = document.activeElement;
    var ov = h('<div class="overlay" role="presentation"><div class="modal ' + (o.wide ? 'sm:max-w-2xl' : '') + '" role="dialog" aria-modal="true" aria-labelledby="mdl-t">' +
      '<div class="flex items-start gap-3 p-6 pb-0">' + (o.icon ? '<span class="grid h-11 w-11 flex-none place-items-center rounded-2xl ' + (o.tone || 'bg-sky-50 text-sky-700') + '">' + icon(o.icon) + '</span>' : '') +
      '<div class="min-w-0 flex-1 pt-1"><h2 id="mdl-t" class="text-xl">' + esc(o.title || '') + '</h2>' + (o.sub ? '<p class="mt-1 text-sm text-ink-500">' + o.sub + '</p>' : '') + '</div>' +
      '<button class="-mr-2 -mt-1 grid h-10 w-10 flex-none place-items-center rounded-lg text-ink-500 hover:bg-cloud" data-x aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="p-6" data-body></div>' + (o.actions ? '<div class="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end" data-actions></div>' : '') + '</div></div>');
    var body = ov.querySelector('[data-body]');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    var closed = false;
    function close() { if (closed) return; closed = true; document.removeEventListener('keydown', onKey); ov.remove(); document.body.style.overflow = ''; if (o.onClose) o.onClose(); if (last && last.focus) last.focus(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    (o.actions || []).forEach(function (a) {
      var b = h(a.href ? '<a class="btn ' + (a.cls || 'btn-primary') + '" href="' + a.href + '">' + (a.icon ? icon(a.icon) : '') + a.label + '</a>' : '<button class="btn ' + (a.cls || 'btn-primary') + '">' + (a.icon ? icon(a.icon) : '') + a.label + '</button>');
      b.addEventListener('click', function () { if (a.onClick) a.onClick(close, b); if (a.close) close(); });
      ov.querySelector('[data-actions]').appendChild(b);
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('[data-x]').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    var f = ov.querySelector('input,select,textarea') || ov.querySelector('[data-x]'); if (f) f.focus({ preventScroll: true });
    return { close: close, el: ov, body: body };
  }

  /* ---------- 6-digit code from the email: finishes sign-up ---------- */
  var CODE_FIELD = '<div><label class="label" for="ec-code">6-digit code</label><input class="input code-input" id="ec-code" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></div>';
  function resendTimer(btn, seconds) {
    var left = seconds || 60, t;
    function tick() { btn.disabled = left > 0; btn.textContent = left > 0 ? 'Resend code in ' + left + 's' : 'Resend code'; if (left-- <= 0) clearInterval(t); }
    tick(); t = setInterval(tick, 1000);
    return function () { clearInterval(t); };
  }
  function onlyDigits(input) { input.addEventListener('input', function () { input.value = input.value.replace(/\D/g, '').slice(0, 6); }); }
  // Resolves with the login reply ({access, user, ...}) once the code is right. Rejects with .cancelled if closed.
  function signupCode(sent) {
    return new Promise(function (resolve, reject) {
      var done = false, stop = null, email = sent.email;
      var form = h('<form class="grid gap-4" novalidate><p class="text-[15px] text-ink-600">' + esc(sent.detail) + ' It can take a minute. Check the spam folder too.</p>' + CODE_FIELD +
        '<button class="btn btn-buy btn-lg btn-block">Verify and create account</button>' +
        '<div class="flex items-center justify-between text-sm"><button type="button" class="font-semibold text-sky-700 hover:underline disabled:text-ink-400 disabled:no-underline" data-resend></button><button type="button" class="font-semibold text-ink-500 hover:underline" data-change>Change email</button></div></form>');
      var m = modal({ title: 'Check your email', icon: 'mail', sub: 'Enter the code we sent to <b>' + esc(email) + '</b>', body: form,
        onClose: function () { if (stop) stop(); if (!done) { var e = new Error('Your account is created only after you enter the code from the email.'); e.cancelled = true; reject(e); } } });
      var code = form.querySelector('#ec-code'), rb = form.querySelector('[data-resend]');
      onlyDigits(code);
      stop = resendTimer(rb, sent.resend_in);
      rb.addEventListener('click', function () {
        fieldError(form, null); busy(rb, true, 'Sending');
        A.registerResend(email).then(function (r) { busy(rb, false); toast('New code sent to ' + email, 'mail'); stop = resendTimer(rb, r.resend_in); }, function (err) { busy(rb, false); stop = resendTimer(rb, 0); failure(err, form); });
      });
      form.querySelector('[data-change]').addEventListener('click', function () { m.close(); });
      form.addEventListener('submit', function (e) {
        e.preventDefault(); fieldError(form, null);
        if (!/^\d{6}$/.test(code.value)) return fieldError(form, 'code', 'Enter the 6-digit code from the email.');
        var b = form.querySelector('.btn-buy'); busy(b, true, 'Checking');
        A.registerVerify(email, code.value).then(function (r) { done = true; m.close(); resolve(r); }, function (err) { busy(b, false); failure(err, form); });
      });
    });
  }

  function unlock(slug, lessonTitle) {
    var c = state.courseMap[slug], p = cheapestPackageFor(slug), u = state.me, cur = u && u.package ? state.packageMap[u.package.slug] : null;
    if (!p) { location.href = 'packages.html'; return; }
    var upg = cur && cur.price < p.price;
    modal({
      title: 'Unlock ' + c.title, icon: 'lock', tone: 'bg-orange-50 text-orange-700',
      sub: (lessonTitle ? '"' + esc(lessonTitle) + '" is part of the full course. ' : '') + 'Courses come inside packages: pick a package, then choose this course.',
      body: '<div class="grid gap-3">' +
        '<a href="checkout.html?plan=' + p.slug + '" class="flex items-center gap-4 rounded-2xl border-2 border-sky-600 bg-sky-50/60 p-4 hover:bg-sky-50"><div class="min-w-0 flex-1"><p class="flex flex-wrap items-center gap-2 font-semibold">' + (upg ? 'Upgrade to ' : '') + esc(p.name) + ' package <span class="tag tag-orange">' + (upg ? 'Upgrade' : 'Lowest price') + '</span></p><p class="mt-0.5 text-sm text-ink-600">' + packageCourseLine(p) + ', this one included</p></div><p class="text-right"><span class="block font-display text-xl font-semibold tabular">' + inr(upg ? p.price - cur.price : p.price) + '</span>' + (upg ? '<span class="text-xs text-ink-500">difference only</span>' : '') + '</p></a>' +
        '<a href="packages.html" class="mt-1 text-center text-sm font-semibold text-sky-700 hover:underline">Compare all packages</a></div>'
    });
  }

  function cover(c, cls) {
    return c.cover ? '<img src="' + esc(c.cover) + '" alt="" loading="lazy" class="' + (cls || 'h-full w-full object-cover') + '">' :
      '<div class="grid h-full w-full place-items-center font-display text-4xl font-semibold text-white/90" style="background:linear-gradient(135deg,' + c.color + ',' + c.color + 'cc)">' + esc(c.code) + '</div>';
  }
  /* Social-proof numbers, skipping any that are still zero (a new site has no ratings yet). */
  function proof(st, n) {
    var out = [];
    if (st.learners >= 50) out.push([num(st.learners) + '+', 'learners']);
    out.push([st.lessons, 'lessons']); out.push([st.courses, 'practical courses']);
    if (st.rating > 0) out.push([st.rating + ' / 5', 'average rating']);
    if (st.free_lessons) out.push([st.free_lessons, 'free preview lessons']);
    if (st.certificates >= 20) out.push([num(st.certificates), 'certificates issued']);
    out.push(['Lifetime', 'access after you buy']);
    return out.slice(0, n || 4);
  }
  function stars(r, cls) { return Array(5).fill(0).map(function (_, i) { return '<svg class="i ' + (cls || 'i-sm') + '" style="' + (i < Math.round(r) ? 'fill:currentColor' : 'opacity:.3') + '" aria-hidden="true"><use href="#i-star"></use></svg>'; }).join(''); }

  function courseCard(c, o) {
    o = o || {};
    var pr = o.progress;
    return '<a href="course.html?c=' + c.slug + '" class="course-card">' +
      '<div class="cover" style="background:' + c.color + '">' + cover(c) +
      '<span class="absolute left-3 top-3 tag bg-white/95 text-ink-800">' + esc(c.level) + '</span>' +
      (o.owned ? '<span class="absolute right-3 top-3 tag bg-sky-600 text-white">' + icon('check', 'i-sm') + 'Yours</span>' : '') + '</div>' +
      '<div class="flex flex-1 flex-col p-5 pt-4">' +
      '<p class="mb-1 text-xs font-semibold text-sky-700">' + esc((state.categoryMap[c.category] || {}).label || '') + '</p>' +
      '<h3 class="text-lg leading-snug">' + esc(c.title) + '</h3><p class="mt-1.5 text-[15px] text-ink-600">' + esc(c.short_description) + '</p>' +
      (pr ? '<div class="mt-auto pt-4"><div class="mb-1.5 flex justify-between text-sm"><span class="text-ink-600">' + pr.done + ' of ' + pr.total + ' lessons</span><span class="font-semibold tabular">' + pr.pct + '%</span></div><div class="meter"><span style="width:' + pr.pct + '%"></span></div></div>' :
        '<div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-sm text-ink-500">' + (c.rating_count ? '<span class="flex items-center gap-1 text-orange-500">' + icon('star', 'i-sm') + '<b class="text-ink-800">' + c.rating + '</b><span class="text-ink-500">(' + num(c.rating_count) + ')</span></span>' : '<span class="tag tag-orange">New</span>') + '<span class="flex items-center gap-1.5">' + icon('book-open', 'i-sm') + c.lesson_count + ' lessons</span><span class="flex items-center gap-1.5">' + icon('clock', 'i-sm') + c.hours + ' h</span></div>') +
      (o.hideFoot ? '' : '<div class="mt-4 flex items-center gap-2.5 border-t border-line pt-4 text-sm">' + avatar(c.instructor ? c.instructor.name : c.title, 28) + '<span class="truncate text-ink-600">' + esc(c.instructor ? c.instructor.name : '') + '</span>' + (o.price === false ? '' : '<span class="ml-auto whitespace-nowrap text-xs font-semibold text-sky-700">In packages</span>') + '</div>') +
      '</div></a>';
  }

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = h('<div class="confetti" aria-hidden="true"></div>'), cols = ['#0A7BC2', '#FF9A3D', '#45A8E8', '#FFD0A3', '#0C2238'];
    for (var i = 0; i < 70; i++) { var p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDelay = Math.random() * 0.4 + 's'; p.style.animationDuration = 1.2 + Math.random() + 's'; box.appendChild(p); }
    document.body.appendChild(box); setTimeout(function () { box.remove(); }, 2800);
  }
  function accordions(root) {
    $$('[data-acc]', root).forEach(function (btn) {
      if (btn._acc) return; btn._acc = true;
      btn.addEventListener('click', function () { var open = btn.getAttribute('aria-expanded') === 'true', panel = document.getElementById(btn.getAttribute('aria-controls')); btn.setAttribute('aria-expanded', String(!open)); panel.hidden = open; });
    });
  }
  function copy(text, label) {
    var done = function () { toast((label || 'Copied') + ' to clipboard', 'copy'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var ta = h('<textarea style="position:fixed;opacity:0"></textarea>'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Select the text and copy it manually', 'info'); } ta.remove(); }
  }
  function busy(btn, on, text) {
    if (on) { if (!btn.dataset.label) btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<svg class="i animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".25" stroke-width="3" fill="none"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>' + (text || 'Please wait'); }
    else { btn.disabled = false; if (btn.dataset.label) { btn.innerHTML = btn.dataset.label; delete btn.dataset.label; } }
  }
  function fieldError(form, field, msg) {
    $$('[aria-invalid]', form).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    $$('.error[data-for]', form).forEach(function (e) { e.remove(); });
    if (!field) return false;
    var input = form.querySelector('[name="' + field + '"]'); if (!input) return false;
    input.setAttribute('aria-invalid', 'true');
    (input.closest('[data-field]') || input).insertAdjacentHTML('afterend', '<p class="error" data-for="' + field + '">' + esc(msg) + '</p>');
    input.focus(); return true;
  }
  function failure(err, form) { if (form && err.field && fieldError(form, err.field, err.message)) return; toast(err.message, null, true); }

  function requireAuth() {
    if (state.me) return state.me;
    var next = location.pathname.split('/').pop() + location.search + location.hash;
    location.replace('login.html?next=' + encodeURIComponent(next));
    return null;
  }

  /* ------------------------------------------------------------------ boot */
  var booted = null;
  /* ---------- welcome poster: the referral offer, once per visit ---------- */
  function poster() {
    var p = state.site.settings.poster;
    if (!p || sessionStorage.getItem('sts:poster')) return;
    try { sessionStorage.setItem('sts:poster', '1'); } catch (e) { /* private window */ }

    var box = document.createElement('div');
    box.className = 'poster-wrap';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', p.title);
    box.innerHTML =
      '<div class="poster-card">' +
        '<button class="poster-x" type="button" aria-label="Close">' + icon('x') + '</button>' +
        (p.image ? '<img class="poster-img" src="' + esc(p.image) + '" alt="">' : '') +
        '<div class="poster-body">' +
          '<span class="tag tag-orange">Offer</span>' +
          '<h2 class="mt-3 font-display text-2xl font-bold leading-tight">' + esc(p.title) + '</h2>' +
          '<p class="mt-2 text-[15px] text-ink-600">' + esc(p.text) + '</p>' +
          '<a class="btn btn-buy mt-5 w-full" href="' + esc(p.link) + '">' + esc(p.button) + '</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('is-on'); });

    var timer = null;
    function close() {
      clearTimeout(timer);
      box.classList.remove('is-on');
      setTimeout(function () { box.remove(); }, 220);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    box.querySelector('.poster-x').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    box.querySelector('a').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    // Closes by itself, but stays open if the visitor moves onto the card to read it.
    if (p.auto_close > 0) {
      timer = setTimeout(close, p.auto_close * 1000);
      box.querySelector('.poster-card').addEventListener('mouseenter', function () { clearTimeout(timer); });
    }
  }

  function boot(opts) {
    opts = opts || {};
    if (booted) return booted;
    booted = Promise.all([loadSite(), loadMe()]).then(function (r) {
      setSite(r[0]); state.me = r[1];
      if (state.site.settings.maintenance && !(state.me && state.me.is_staff) && !opts.allowMaintenance) {
        document.body.innerHTML = '<main class="grid min-h-screen place-items-center p-6 text-center"><div>' + logo() + '<h1 class="mt-8 text-display-md">We are improving the site.</h1><p class="mt-2 text-ink-600">Please check back in a little while. For help, write to ' + esc(state.site.settings.email) + '.</p></div></main>';
        throw new Error('maintenance');
      }
      if (!opts.noShell) { header(opts); footer(); poster(); }
      captureRef();
      if (STS.chat && !opts.noChat) STS.chat.mount();
      return state;
    }, function (err) {
      var host = document.getElementById('main') || document.body;
      host.innerHTML = '<div class="container grid min-h-[60vh] place-items-center py-20 text-center"><div><span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bad-50 text-bad-600">' + icon('wifi') + '</span><h1 class="mt-5 text-2xl">We could not load the page</h1><p class="mt-2 text-ink-600">' + esc(err.message) + '</p><button class="btn btn-primary mt-6" onclick="location.reload()">Try again</button></div></div>';
      throw err;
    });
    return booted;
  }

  return {
    page: page, state: state, esc: esc, icon: icon, inr: inr, num: num, $: $, $$: $$, h: h, date: date, ago: ago, avatar: avatar, logo: logo, LOGO_SVG: LOGO_SVG, LOGO_FALLBACK: LOGO_FALLBACK,
    shuffle: shuffle, param: param, savedRef: savedRef, owned: owned, progress: progress, cheapestPackageFor: cheapestPackageFor,
    packageCovers: packageCovers, packageCourseCount: packageCourseCount, packageCourseLine: packageCourseLine,
    courseReward: courseReward, gstLine: gstLine, setMe: setMe, refreshMe: refreshMe,
    header: header, toast: toast, modal: modal, signupCode: signupCode, CODE_FIELD: CODE_FIELD, resendTimer: resendTimer, onlyDigits: onlyDigits, unlock: unlock, cover: cover, stars: stars, proof: proof, courseCard: courseCard, confetti: confetti,
    accordions: accordions, copy: copy, busy: busy, fieldError: fieldError, failure: failure, requireAuth: requireAuth, boot: boot
  };
})();
