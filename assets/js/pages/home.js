/* Home page */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;

  U.boot().then(function (st) {
    var site = st.site, s = site.settings, me = st.me;
    var CR = s.course_reward || { amount: 0, enabled: false }, UPD = s.upgrade_discount || 0;

    /* Hero */
    U.$('#hero-faces').innerHTML = ['Priya L', 'Mohammed I', 'Keerthana S', 'Ravi T'].map(function (n) { return '<span class="rounded-full ring-2 ring-white">' + U.avatar(n, 26) + '</span>'; }).join('');
    if (site.stats.rating > 0 && site.stats.learners >= 50) U.$('#hero-proof').innerHTML = '<b class="text-ink-900">' + site.stats.rating + '</b> from ' + U.num(site.stats.learners) + '+ learners';
    else { U.$('#hero-faces').hidden = true; U.$('#hero-proof').innerHTML = '<b class="text-ink-900">' + site.stats.free_lessons + ' free lessons</b> to try before you pay'; }
    if (st.courseMap.instagram) U.$('#hw-crumb').textContent = st.courseMap.instagram.title;
    var win = U.$('#hero-window');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      win.classList.add('play-anim');
      setTimeout(function () { U.$('#hw-meter').style.width = '27%'; }, 300);
    }

    /* Stats */
    var stats = U.proof(site.stats, 4);
    U.$('#stats').innerHTML = stats.map(function (x) { return '<div class="bg-white px-5 py-5 sm:px-7"><dt class="sr-only">' + x[1] + '</dt><dd class="font-display text-2xl font-semibold tabular sm:text-3xl">' + x[0] + '</dd><p class="text-sm text-ink-500">' + x[1] + '</p></div>'; }).join('');

    /* Goal picker */
    var GOALS = [
      ['rocket', 'Grow on Instagram or YouTube', ['instagram', 'capcut', 'youtube']],
      ['briefcase', 'Get freelance work', ['canva', 'capcut', 'freelancing']],
      ['trending-up', 'Get a marketing job', ['digital-marketing', 'seo', 'meta-ads', 'personal-branding']],
      ['shopping-bag', 'Grow my business', ['digital-marketing', 'meta-ads', 'canva']],
      ['sparkles', 'Use AI at work', ['ai-tools', 'personal-branding']]
    ].map(function (g) { return [g[0], g[1], g[2].filter(function (x) { return st.courseMap[x]; })]; }).filter(function (g) { return g[2].length; });
    if (!GOALS.length) GOALS = [['book-open', 'Learn a new skill', site.courses.slice(0, 3).map(function (c) { return c.slug; })]];
    var gl = U.$('#goals');
    gl.innerHTML = GOALS.map(function (g, i) { return '<button class="chip flex-none !px-4 !py-2.5 !text-[15px]" role="tab" aria-pressed="' + (i === 0) + '" data-g="' + i + '">' + U.icon(g[0], 'i-sm') + g[1] + '</button>'; }).join('');
    function showGoal(i) {
      var want = GOALS[i][2];
      var pk = site.packages.slice().sort(function (a, b) { return a.price - b.price; }).filter(function (p) {
        return p.includes_future_courses || (p.course_slots ? p.course_slots >= want.length : want.every(function (x) { return p.courses.indexOf(x) >= 0; }));
      })[0] || site.packages[site.packages.length - 1];
      U.$('#goal-panel').innerHTML = '<div class="grid gap-6 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7 lg:grid-cols-[1.6fr_1fr]">' +
        '<div class="grid gap-4 ' + ['', 'sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3'][Math.min(3, want.length)] + '">' + want.slice(0, 3).map(function (x) {
          var c = st.courseMap[x];
          return '<a href="course.html?c=' + c.slug + '" class="group flex flex-col overflow-hidden rounded-2xl border border-line transition hover:border-sky-300"><div class="aspect-[16/9] overflow-hidden" style="background:' + c.color + '">' + U.cover(c, 'h-full w-full object-cover transition duration-500 group-hover:scale-105') + '</div><div class="p-4"><p class="font-semibold leading-snug">' + U.esc(c.title) + '</p><p class="mt-1 text-sm text-ink-500">' + c.lesson_count + ' lessons, ' + c.hours + ' h</p></div></a>';
        }).join('') + '</div>' +
        '<div class="flex flex-col rounded-2xl bg-sky-50 p-6"><p class="text-sm font-semibold text-sky-700">Recommended</p><p class="mt-1 font-display text-2xl font-semibold">' + U.esc(pk.name) + ' package</p>' +
        '<p class="mt-1 text-ink-600">' + U.packageCourseLine(pk) + ' — ' + (want.length > 1 ? 'the ' + want.length + ' above fit inside' : 'the one above fits inside') + '.</p>' +
        '<p class="mt-4 flex items-baseline gap-2"><span class="font-display text-4xl font-semibold tabular">' + U.inr(pk.price) + '</span>' + (pk.mrp > pk.price ? '<s class="text-ink-400 tabular">' + U.inr(pk.mrp) + '</s>' : '') + '</p>' +
        '<div class="mt-auto flex flex-wrap gap-2 pt-6"><a class="btn btn-buy" href="checkout.html?plan=' + pk.slug + '">Enroll in ' + U.esc(pk.name) + '</a><a class="btn btn-ghost" href="course.html?c=' + want[0] + '">Try free lessons</a></div></div></div>';
    }
    gl.addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (!b) return; U.$$('[data-g]', gl).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); showGoal(Number(b.dataset.g)); });
    showGoal(0);

    /* Courses */
    U.$('#home-courses').innerHTML = site.courses.slice().sort(function (a, b) { return b.learners_count - a.learners_count; }).slice(0, 6)
      .map(function (c) { return U.courseCard(c, { owned: U.owned(c.slug) }); }).join('');

    /* Rail: fills when it comes into view */
    var q = s.quiz;
    U.$('#rail-quiz').textContent = q.questions + ' quick questions after each lesson. ' + q.pass + ' right to move on.';
    var rail = U.$('#rail'), stops = U.$$('.stop', rail);
    function lightRail() { rail.querySelector('.fill').style.width = 'calc(100% - 100% / 4)'; stops.forEach(function (st2, i) { setTimeout(function () { st2.classList.add('on'); }, 250 + i * 420); }); }
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); lightRail(); } }, { threshold: 0.5 });
      io.observe(rail);
    } else lightRail();

    /* Pricing */
    var cur = me && me.package ? st.packageMap[me.package.slug] : null;
    U.$('#home-packages').innerHTML = site.packages.map(function (p) {
      var own = cur && cur.slug === p.slug, below = cur && cur.price > p.price, pop = p.is_popular;
      var cta = own ? '<span class="btn btn-soft btn-block">' + U.icon('check', 'i-sm') + 'Your package</span>' : below ? '<span class="btn btn-block border border-line text-ink-400">Included in yours</span>' :
        '<a class="btn btn-block ' + (pop ? 'btn-buy' : 'btn-primary') + '" href="checkout.html?plan=' + p.slug + '">' + (cur ? 'Upgrade for ' + U.inr(Math.max(1, (p.price - cur.price) - Math.round((p.price - cur.price) * UPD / 100))) : 'Enroll now') + '</a>';
      return '<article class="relative flex flex-col rounded-3xl border ' + (pop ? 'border-sky-600 bg-gradient-to-b from-sky-50 to-white shadow-lift ring-1 ring-sky-600' : 'border-line bg-white') + ' p-6">' +
        (pop ? '<span class="absolute -top-3 left-6 tag bg-orange-400 !px-2.5 !py-1 text-ink-900">' + U.esc(p.tagline || 'Most chosen') + '</span>' : '<p class="text-sm font-semibold text-sky-700">' + U.esc(p.tagline) + '</p>') +
        '<h3 class="' + (pop ? 'mt-1' : 'mt-1') + ' text-2xl">' + U.esc(p.name) + '</h3>' +
        '<p class="mt-3 flex items-baseline gap-2"><span class="font-display text-[34px] font-semibold leading-none tabular">' + U.inr(p.price) + '</span>' + (p.mrp ? '<s class="text-sm text-ink-400 tabular">' + U.inr(p.mrp) + '</s>' : '') + '</p>' +
        '<ul class="mt-5 space-y-2.5 text-[15px] text-ink-700">' +
        '<li class="flex gap-2">' + U.icon('book-open', 'i-sm mt-1 text-sky-600') + U.packageCourseLine(p) + '</li>' +
        (p.max_course_cashback ? '<li class="flex gap-2">' + U.icon('wallet', 'i-sm mt-1 text-good-600') + U.inr(U.courseReward(p)) + ' back per course, up to ' + U.inr(p.max_course_cashback) + '</li>' : '') +
        '<li class="flex gap-2">' + U.icon('gift', 'i-sm mt-1 text-orange-500') + p.cashback_percent + '% referral cashback</li>' +
        (p.support_text ? '<li class="flex gap-2">' + U.icon('headphones', 'i-sm mt-1 text-sky-600') + U.esc(p.support_text) + '</li>' : '') + '</ul>' +
        '<div class="mt-auto pt-6">' + cta + '</div></article>';
    }).join('');

    /* Refer */
    var R = s.referral, rates = site.packages.map(function (p) { return p.cashback_percent; });
    U.$('#refer-range').textContent = Math.min.apply(null, rates) + '–' + Math.max.apply(null, rates) + '% cashback';
    U.$('#refer-lead').textContent = 'After your first purchase you get a personal code. Friends who use it save ' + U.inr(R.friend_discount) + ' on their first package, and you get cashback on what they pay. That is the whole programme.';
    U.$('#refer-rules').innerHTML = [
      ['clock', 'Cashback is held ' + R.hold_days + ' days while the refund window is open.'],
      R.learn_first ? ['graduation-cap', 'It unlocks after you complete your first course. Learn first, then earn.'] : null,
      ['indian-rupee', 'Withdraw to any UPI ID from ' + U.inr(R.min_withdraw) + ', paid in ' + R.payout_days + ' working days.'],
      ['shield-check', 'No purchase is ever needed to keep your account or access.']
    ].filter(Boolean).map(function (x) { return '<li class="flex gap-3">' + U.icon(x[0], 'mt-0.5 flex-none text-orange-300') + x[1] + '</li>'; }).join('');
    var calc = { mine: (site.packages[1] || site.packages[0]).slug, friend: (site.packages[1] || site.packages[0]).slug };
    ['mine', 'friend'].forEach(function (k) {
      var box = U.$('[data-calc="' + k + '"]');
      box.innerHTML = site.packages.map(function (p) { return '<button type="button" class="chip" data-v="' + p.slug + '" aria-pressed="' + (calc[k] === p.slug) + '">' + U.esc(p.name) + '</button>'; }).join('');
      box.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; calc[k] = b.dataset.v; U.$$('[data-v]', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); runCalc(); });
    });
    var range = U.$('#calc-n'); range.addEventListener('input', runCalc);
    function runCalc() {
      var mine = st.packageMap[calc.mine], fr = st.packageMap[calc.friend], n = Number(range.value);
      var pay = Math.max(1, fr.price - R.friend_discount), cb = Math.round(pay * mine.cashback_percent / 100) * n;
      U.$('#calc-nv').textContent = n; U.$('#calc-pay').textContent = U.inr(pay); U.$('#calc-off').textContent = 'after ' + U.inr(R.friend_discount) + ' off';
      U.$('#calc-cb').textContent = U.inr(cb); U.$('#calc-rate').textContent = mine.cashback_percent + '% of ' + U.inr(pay) + (n > 1 ? ' × ' + n + ' friends' : '');
    }
    runCalc();

    /* Play + verify */
    var P = s.play;
    U.$('#play-lead').textContent = 'Free quizzes and quick games built from our courses. ' + U.inr(P.per_correct) + ' for each correct answer, up to ' + U.inr(P.total_cap) + ' per account. Take it off your package price at checkout.';
    U.$('#home-verify').addEventListener('submit', function (e) { e.preventDefault(); var id = U.$('#hv-id').value.trim().toUpperCase(); try { sessionStorage.setItem('sts:nav', JSON.stringify({ page: 'verify', q: 'id=' + encodeURIComponent(id) })); } catch (er) { /* */ } location.href = 'verify.html?id=' + encodeURIComponent(id); });

    /* Testimonials */
    A.testimonials().then(function (list) {
      var host = U.$('#testimonials');
      if (!list.length) { host.closest('section').hidden = true; return; }
      host.innerHTML = list.map(function (t) {
        return '<figure class="flex w-[88%] flex-none snap-start flex-col rounded-3xl border border-line bg-white p-6 sm:w-[380px]">' +
          '<div class="flex gap-0.5 text-orange-400" aria-label="' + t.rating + ' out of 5">' + U.stars(t.rating) + '</div>' +
          '<blockquote class="mt-4 flex-1 text-[16px] leading-relaxed text-ink-800">' + U.esc(t.text) + '</blockquote>' +
          (t.result ? '<p class="mt-5 inline-flex w-fit items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-semibold text-sky-800">' + U.icon('trending-up', 'i-sm') + U.esc(t.result) + '</p>' : '') +
          '<figcaption class="mt-5 flex items-center gap-3 border-t border-line pt-4">' + U.avatar(t.name, 40) + '<div><p class="font-semibold">' + U.esc(t.name) + (t.verified ? ' ' + U.icon('badge-check', 'i-sm text-sky-600') : '') + '</p><p class="text-sm text-ink-500">' + U.esc(t.city) + (t.course_title ? ', ' + U.esc(t.course_title) : '') + '</p></div></figcaption></figure>';
      }).join('');
    });
    U.$$('[data-tscroll]').forEach(function (b) { b.addEventListener('click', function () { var r = U.$('#testimonials'); if (r.firstElementChild) r.scrollBy({ left: Number(b.dataset.tscroll) * (r.firstElementChild.offsetWidth + 20), behavior: 'smooth' }); }); });

    /* FAQ */
    U.$('#faq-phone').textContent = s.phone; U.$('#faq-hours').textContent = s.hours; U.$('#faq-wa').href = 'https://wa.me/' + s.whatsapp;
    A.get('/faqs/?home=1').then(function (list) {
      U.$('#faq').innerHTML = list.slice(0, 7).map(function (f, i) {
        return '<div><button class="acc-btn" data-acc aria-expanded="false" aria-controls="faq-' + i + '">' + U.esc(f.question) + U.icon('chevron-down', 'text-ink-400') + '</button><div id="faq-' + i + '" class="pb-5 pr-8 text-ink-600" hidden>' + U.esc(f.answer) + '</div></div>';
      }).join('');
      U.accordions(U.$('#faq'));
    });

    /* ---------- top earners and learners (real buyers only, worked out on the server) ---------- */
    (function () {
      var host = U.$('#top-list'), tabs = U.$('#top-tabs'), data = null, cur = 'earners';
      var MEDAL = ['bg-orange-400 text-ink-900', 'bg-ink-200 text-ink-800', 'bg-orange-200 text-orange-800'];
      function draw() {
        var rows = data[cur] || [];
        if (!rows.length) {
          host.innerHTML = '<li class="rounded-3xl border border-dashed border-line p-8 text-center text-ink-600 sm:col-span-2">' + U.icon('trophy', 'i-lg text-orange-400') +
            '<p class="mt-3 font-semibold text-ink-900">' + (cur === 'earners' ? 'No earners on the board yet' : 'No learners on the board yet') + '</p>' +
            '<p class="mt-1 text-[15px]">The board fills up as our first learners finish courses and refer friends. Your name could be first.</p></li>';
          return;
        }
        host.innerHTML = rows.map(function (r) {
          var right = cur === 'earners'
            ? '<p class="font-display text-xl font-semibold tabular text-good-600">' + U.inr(r.earned) + '</p><p class="text-xs text-ink-500">' + (r.friends ? r.friends + ' friend' + (r.friends === 1 ? '' : 's') + ' referred' : 'from courses') + '</p>'
            : '<p class="font-display text-xl font-semibold tabular">' + r.courses + ' <span class="text-sm font-medium text-ink-500">course' + (r.courses === 1 ? '' : 's') + '</span></p><p class="text-xs text-ink-500">' + U.num(r.lessons) + ' lessons done</p>';
          return '<li class="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">' +
            '<span class="grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-bold ' + (MEDAL[r.rank - 1] || 'bg-cloud text-ink-600') + '">' + r.rank + '</span>' + U.avatar(r.name, 40) +
            '<div class="min-w-0 flex-1"><p class="truncate font-semibold">' + U.esc(r.name) + '</p>' + (r.city ? '<p class="truncate text-sm text-ink-500">' + U.esc(r.city) + '</p>' : '') + '</div>' +
            '<div class="text-right">' + right + '</div></li>';
        }).join('');
      }
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('[data-top]');
        if (!b || !data) return;
        cur = b.dataset.top;
        U.$$('[data-top]', tabs).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        draw();
      });
      A.get('/top/').then(function (d) { data = d; draw(); }, function () { U.$('#top').hidden = true; });
    })();

    /* ---------- founder ---------- */
    (function () {
      var f = s.founder || {};
      if (!f.name) return;
      U.$('#founder').hidden = false;
      U.$('#h-founder-name').textContent = f.name;
      U.$('#h-founder-title').textContent = f.title || '';
      U.$('#h-founder-bio').textContent = f.bio || '';
      // Use the photo uploaded in the admin panel; otherwise the founder.jpeg next to index.html.
      var box = U.$('#h-founder-photo'), img = new Image();
      img.className = 'h-full w-full object-cover';
      img.alt = f.name;
      img.onerror = function () { box.innerHTML = '<div class="grid h-full w-full place-items-center">' + U.avatar(f.name, 104) + '</div>'; };
      img.src = f.photo || 'founder.jpeg';
      box.appendChild(img);
    })();
  });
})();
