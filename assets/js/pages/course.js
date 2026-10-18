/* Course detail: overview, curriculum with free / locked lessons, free resources, instructor, reviews */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;
  var TYPE = { video: ['play-circle', 'Video'], text: ['file-text', 'Reading'], image: ['image', 'Image lesson'], pdf: ['file-down', 'PDF guide'] };
  var slug = U.param('c');

  U.boot().then(function (st) {
    if (!slug) { location.replace('courses.html'); return; }
    A.course(slug).then(function (c) { render(st, c); }, function (e) { if (e.status === 404) location.replace('404.html'); else U.failure(e); });
  });

  function render(st, c) {
    document.title = c.title + ' | SkillToSuccess';
    var meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', c.short_description + ' ' + c.lesson_count + ' lessons, free previews and a verified certificate.');
    var me = st.me, owned = !!(c.me && c.me.owned), done = (c.me && c.me.done) || {};
    var lessons = c.modules.reduce(function (a, m) { return a.concat(m.lessons); }, []);
    var doneCount = lessons.filter(function (l) { return done[l.id]; }).length, pct = lessons.length ? Math.round(doneCount * 100 / lessons.length) : 0;
    var next = lessons.filter(function (l) { return !done[l.id]; })[0] || lessons[0];
    var firstFree = lessons.filter(function (l) { return l.is_free; })[0];
    var pkgs = st.site.packages.filter(function (p) { return U.packageCovers(p, c.slug); }).sort(function (a, b) { return a.price - b.price; });
    var UPD = st.site.settings.upgrade_discount || 0, CRW = st.site.settings.course_reward || { amount: 0, enabled: false };
    var pkg = pkgs[0], cur = me && me.package ? st.packageMap[me.package.slug] : null, upg = pkg && cur && cur.price < pkg.price;
    var ins = c.instructor;
    var R = st.site.settings.referral, ref = U.savedRef();
    var freeN = lessons.filter(function (l) { return l.is_free; }).length;

    var tag = function (l) {
      if (owned && done[l.id]) return '<span class="tag tag-good">' + U.icon('check', 'i-sm') + 'Done</span>';
      if (l.is_free && !owned) return '<span class="tag tag-sky">Free</span>';
      if (!owned) return U.icon('lock', 'i-sm text-ink-400');
      return '';
    };

    var buyBody = owned ?
      '<div class="p-6"><p class="flex items-center gap-2 text-sm font-semibold text-good-700">' + U.icon('check-circle-2', 'i-sm') + 'In your library</p>' +
      '<div class="mt-4"><div class="mb-1.5 flex justify-between text-sm"><span>' + doneCount + ' of ' + lessons.length + ' lessons</span><b class="tabular">' + pct + '%</b></div><div class="meter"><span style="width:' + pct + '%"></span></div></div>' +
      (next ? '<a class="btn btn-primary btn-lg btn-block mt-5" href="lesson.html?l=' + next.id + '">' + U.icon('play') + (doneCount ? 'Continue: lesson ' + next.n : 'Start lesson 1') + '</a>' : '') +
      (c.me.certificate ? '<a class="btn btn-ghost btn-block mt-2" href="certificate.html?id=' + c.me.certificate + '">' + U.icon('award') + 'View certificate</a>' : '') + '</div>' :
      '<div class="p-6">' + (pkg ? '<p class="text-sm text-ink-500">' + (pkg.course_slots ? 'Pick it with the ' + U.esc(pkg.name) + ' package' : 'Included in ' + U.esc(pkg.name)) + (pkgs.length > 1 ? ' or any higher package' : '') + '</p>' +
        '<p class="mt-1 flex items-baseline gap-2"><span class="font-display text-4xl font-semibold tabular">' + U.inr(upg ? Math.max(1, (pkg.price - cur.price) - Math.round((pkg.price - cur.price) * UPD / 100)) : pkg.price) + '</span>' + (upg ? '<span class="text-sm text-ink-500">to upgrade from ' + U.esc(cur.name) + '</span>' : (pkg.mrp ? '<s class="text-ink-400 tabular">' + U.inr(pkg.mrp) + '</s>' : '')) + '</p>' +
        '<p class="mt-1 text-sm text-ink-600">' + U.packageCourseLine(pkg) + ' — this one included</p>' +
        (U.courseReward(pkg) ? '<p class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-good-700">' + U.icon('wallet', 'i-sm') + U.inr(U.courseReward(pkg)) + ' back when you finish this course</p>' : '') +
        '<a class="btn btn-buy btn-lg btn-block mt-5" href="checkout.html?plan=' + pkg.slug + '">' + (upg ? 'Upgrade to ' : 'Enroll with ') + U.esc(pkg.name) + '</a>' : '') +
      '<a class="btn btn-ghost btn-block mt-2" href="checkout.html?course=' + c.slug + '">Buy only this course for ' + U.inr(c.price) + '</a>' +
      (ref && !(me && me.has_purchased) ? '<p class="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800">' + U.icon('gift', 'i-sm') + U.inr(R.friend_discount) + ' referral discount is applied at checkout</p>' : '') +
      (firstFree ? '<a class="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-sky-700 hover:underline" href="lesson.html?l=' + firstFree.id + '">' + U.icon('play-circle', 'i-sm') + 'Start the ' + freeN + ' free lessons</a>' : '') + '</div>';

    var card = '<div class="overflow-hidden rounded-3xl border border-line bg-white shadow-lift">' +
      '<button class="group relative block aspect-video w-full overflow-hidden" style="background:' + c.color + '" ' + (c.intro_video ? 'data-intro' : 'disabled') + ' aria-label="Play course intro video">' + U.cover(c, 'h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]') +
      (c.intro_video ? '<span class="absolute inset-0 grid place-items-center bg-ink-900/10"><span class="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-sky-700 shadow-pop transition group-hover:scale-105">' + U.icon('play', 'i-lg translate-x-0.5') + '</span></span><span class="absolute bottom-3 left-3 tag bg-ink-900/80 text-white">Watch the course intro</span>' : '') + '</button>' + buyBody +
      '<ul class="space-y-2.5 border-t border-line p-6 text-[15px] text-ink-700">' +
      [['book-open', c.lesson_count + ' lessons in ' + c.modules.length + ' modules'], ['list-checks', 'A quiz after every lesson'], ['award', 'Certificate with a verify ID'], ['clock', 'Lifetime access and updates'], ['smartphone', 'Works on phone and laptop']]
        .map(function (r) { return '<li class="flex items-center gap-3">' + U.icon(r[0], 'text-sky-600') + r[1] + '</li>'; }).join('') + '</ul></div>';

    var catLabel = (st.categoryMap[c.category] || {}).label || '';
    var root = U.$('#course-root');
    root.innerHTML =
      '<div class="container grid gap-x-10 lg:grid-cols-[1fr_380px]"><div class="min-w-0">' +
      '<section class="bleed-cloud py-10 lg:py-14"><nav class="mb-5 text-sm text-ink-500" aria-label="Breadcrumb"><a href="index.html" class="hover:text-sky-700">Home</a><span class="mx-2">/</span><a href="courses.html" class="hover:text-sky-700">Courses</a><span class="mx-2">/</span><span class="text-ink-800">' + U.esc(c.title) + '</span></nav>' +
      '<div class="flex flex-wrap gap-2"><span class="tag tag-ink">' + U.esc(c.level) + '</span><span class="tag bg-white text-ink-600">' + U.esc(catLabel) + '</span><span class="tag bg-white text-ink-600">Updated ' + U.esc(c.updated) + '</span></div>' +
      '<h1 class="text-display-lg mt-4">' + U.esc(c.title) + '</h1><p class="lead mt-4">' + U.esc(c.short_description) + '</p>' +
      '<div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-ink-600">' +
      (c.rating_count ? '<span class="flex items-center gap-1.5 text-orange-500">' + U.icon('star') + '<b class="text-ink-900">' + c.rating + '</b><span class="text-ink-600">from ' + U.num(c.rating_count) + ' ratings</span></span>' : '<span class="tag tag-orange">New course</span>') +
      (c.learners_count ? '<span class="flex items-center gap-1.5">' + U.icon('users') + U.num(c.learners_count) + ' learners</span>' : '') +
      '<span class="flex items-center gap-1.5">' + U.icon('book-open') + c.lesson_count + ' lessons, ' + c.hours + ' hours</span>' +
      '<span class="flex items-center gap-1.5">' + U.icon('message-circle') + U.esc(c.language) + '</span></div>' +
      (ins ? '<a href="#instructor" class="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-4 hover:border-sky-300">' + U.avatar(ins.name, 34) + '<span class="text-sm"><b>' + U.esc(ins.name) + '</b><span class="text-ink-500">, ' + U.esc(ins.role) + '</span></span></a>' : '') +
      '<div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">' + ['video', 'text', 'image', 'pdf'].map(function (t) {
        var n = c.lesson_types[t] || 0;
        return '<div class="rounded-2xl border border-line bg-white px-4 py-3"><p class="flex items-center gap-2 text-sm text-ink-500">' + U.icon(TYPE[t][0], 'i-sm text-sky-600') + TYPE[t][1] + '</p><p class="font-display text-xl font-semibold tabular">' + n + ' <span class="text-sm font-medium text-ink-500">' + (n === 1 ? 'lesson' : 'lessons') + '</span></p></div>';
      }).join('') + '</div></section>' +
      '<div class="mt-8 lg:hidden">' + card + '</div>' +

      '<nav class="sticky z-30 border-b border-line bg-white/95 backdrop-blur" style="top:calc(72px + env(safe-area-inset-top,0px))" aria-label="Course sections"><div class="tabs !border-0">' +
      [['overview', 'Overview'], ['curriculum', 'Curriculum'], ['resources', 'Free resources'], ['instructor', 'Instructor'], ['reviews', 'Reviews']].map(function (t, i) { return '<a class="tab" href="#' + t[0] + '" aria-selected="' + (i === 0) + '" data-sec="' + t[0] + '">' + t[1] + '</a>'; }).join('') +
      '</div></nav><div class="space-y-16 py-12">' +

      '<section id="overview"><h2 class="text-display-md">What you will learn</h2><ul class="mt-6 grid gap-4 sm:grid-cols-2">' + (c.outcomes || []).map(function (o) { return '<li class="flex gap-3 text-[16px]">' + U.icon('check-circle-2', 'mt-0.5 text-sky-600') + '<span>' + U.esc(o) + '</span></li>'; }).join('') + '</ul>' +
      (c.description && c.description !== c.short_description ? '<div class="prose-lesson mt-8">' + c.description.split(/\n\s*\n/).map(function (p) { return '<p>' + U.esc(p) + '</p>'; }).join('') + '</div>' : '') +
      '<div class="mt-10 grid gap-6 sm:grid-cols-2">' +
      (c.for_who && c.for_who.length ? '<div class="card-cloud p-6"><h3 class="text-lg">Who this course is for</h3><ul class="mt-3 space-y-2 text-ink-700">' + c.for_who.map(function (w) { return '<li class="flex gap-2">' + U.icon('user', 'i-sm mt-1 text-sky-500') + U.esc(w) + '</li>'; }).join('') + '</ul></div>' : '') +
      (c.requirements && c.requirements.length ? '<div class="card-cloud p-6"><h3 class="text-lg">What you need</h3><ul class="mt-3 space-y-2 text-ink-700">' + c.requirements.map(function (w) { return '<li class="flex gap-2">' + U.icon('check', 'i-sm mt-1 text-sky-500') + U.esc(w) + '</li>'; }).join('') + '</ul></div>' : '') + '</div>' +
      '<h3 class="mt-10 text-xl">What you will make along the way</h3><ol class="mt-4 space-y-3">' + c.modules.filter(function (m) { return m.task; }).map(function (m, i) { return '<li class="flex gap-4 rounded-2xl border border-line p-4"><span class="grid h-8 w-8 flex-none place-items-center rounded-xl font-display text-sm font-semibold text-white" style="background:' + c.color + '">' + (i + 1) + '</span><div><p class="font-semibold">' + U.esc(m.title) + '</p><p class="text-[15px] text-ink-600">' + U.esc(m.task) + '</p></div></li>'; }).join('') + '</ol></section>' +

      '<section id="curriculum"><div class="flex flex-wrap items-end justify-between gap-3"><h2 class="text-display-md">Curriculum</h2><p class="text-sm text-ink-500">' + c.modules.length + ' modules, ' + c.lesson_count + ' lessons, ' + c.hours + ' hours</p></div>' +
      '<div class="mt-6 divide-y divide-line overflow-hidden rounded-3xl border border-line">' + c.modules.map(function (m, mi) {
        var mins = m.lessons.reduce(function (s, l) { return s + l.minutes; }, 0), dn = m.lessons.filter(function (l) { return done[l.id]; }).length;
        return '<div><button class="flex w-full items-center gap-4 bg-cloud/70 px-5 py-4 text-left hover:bg-cloud" data-acc aria-expanded="' + (mi === 0) + '" aria-controls="mod-' + mi + '">' +
          '<span class="grid h-8 w-8 flex-none place-items-center rounded-lg bg-white font-display text-sm font-semibold text-sky-700 tabular">' + (mi + 1) + '</span><span class="min-w-0 flex-1"><span class="block font-semibold">' + U.esc(m.title) + '</span><span class="text-sm text-ink-500">' + m.lessons.length + ' lessons, ' + mins + ' min' + (owned ? ', ' + dn + ' done' : '') + '</span></span>' + U.icon('chevron-down', 'text-ink-400') + '</button>' +
          '<ul id="mod-' + mi + '" class="divide-y divide-line"' + (mi === 0 ? '' : ' hidden') + '>' + m.lessons.map(function (l) {
            var open = l.is_free || owned;
            return '<li><' + (open ? 'a href="lesson.html?l=' + l.id + '"' : 'button data-lock="' + l.id + '"') + ' class="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-sky-50/50">' +
              '<span class="grid h-9 w-9 flex-none place-items-center rounded-xl ' + (open ? 'bg-sky-50 text-sky-700' : 'bg-cloud text-ink-400') + '">' + U.icon(TYPE[l.type][0], 'i-sm') + '</span>' +
              '<span class="min-w-0 flex-1"><span class="block truncate text-[15px] font-medium ' + (open ? '' : 'text-ink-600') + '">' + l.n + '. ' + U.esc(l.title) + '</span><span class="text-xs text-ink-500">' + TYPE[l.type][1] + ', ' + l.minutes + ' min</span></span>' + tag(l) +
              '</' + (open ? 'a' : 'button') + '></li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div></section>' +

      '<section id="resources"><h2 class="text-display-md">Free resources</h2><p class="mt-2 text-ink-600">Open these now. No account needed.</p><div class="mt-6 grid gap-4 sm:grid-cols-2">' +
      (c.intro_video ? res('play-circle', 'Course intro video', 'A short overview of the course path.', 'data-intro') : '') +
      (c.cheat_sheet ? res('file-down', 'Cheat sheet (PDF)', 'Every module\'s key ideas on two pages.', 'data-pdf') : '') +
      lessons.filter(function (l) { return l.is_free; }).slice(0, 2).map(function (l) { return '<a href="lesson.html?l=' + l.id + '" class="flex gap-4 rounded-2xl border border-line p-5 transition hover:border-sky-300">' + U.icon(TYPE[l.type][0], 'i-lg mt-0.5 text-sky-600') + '<span><span class="block font-semibold">Free lesson ' + l.n + '</span><span class="text-[15px] text-ink-600">' + U.esc(l.title) + '</span></span></a>'; }).join('') +
      '</div></section>' +

      (ins ? '<section id="instructor"><h2 class="text-display-md">Your instructor</h2><div class="mt-6 flex flex-col gap-5 rounded-3xl border border-line p-6 sm:flex-row">' + (ins.photo ? '<img src="' + U.esc(ins.photo) + '" alt="" class="h-20 w-20 rounded-full object-cover">' : U.avatar(ins.name, 80)) +
        '<div><h3 class="text-xl">' + U.esc(ins.name) + '</h3><p class="font-semibold text-sky-700">' + U.esc(ins.role) + ', ' + ins.years + ' years</p><p class="mt-3 text-ink-700">' + U.esc(ins.bio) + '</p>' +
        '<p class="mt-4 flex flex-wrap gap-2">' + st.site.courses.filter(function (x) { return x.instructor && x.instructor.id === ins.id; }).map(function (x) { return '<a class="tag tag-mute hover:bg-sky-50 hover:text-sky-700" href="course.html?c=' + x.slug + '">' + U.esc(x.title) + '</a>'; }).join('') + '</p></div></div></section>' : '<section id="instructor" hidden></section>') +

      '<section id="reviews"><h2 class="text-display-md">Reviews</h2><div class="mt-6 grid gap-8 md:grid-cols-[200px_1fr]">' +
      (c.rating_count ? '<div><p class="font-display text-6xl font-semibold tabular">' + c.rating + '</p><p class="mt-1 flex gap-0.5 text-orange-400">' + U.stars(c.rating, '') + '</p><p class="mt-1 text-sm text-ink-500">' + U.num(c.rating_count) + ' ratings</p></div>' : '<div><p class="font-display text-2xl font-semibold">No ratings yet</p><p class="mt-1 text-sm text-ink-500">Learners can rate the course after finishing it.</p></div>') +
      (c.testimonials.length ? '<ul class="divide-y divide-line">' + c.testimonials.map(function (r) {
        return '<li class="py-5 first:pt-0"><div class="flex items-center gap-3">' + U.avatar(r.name, 36) + '<div><p class="font-semibold">' + U.esc(r.name) + (r.verified ? ' ' + U.icon('badge-check', 'i-sm text-sky-600') : '') + '</p><p class="text-xs text-ink-500">' + U.esc(r.city) + '</p></div><span class="ml-auto flex gap-0.5 text-orange-400">' + U.stars(r.rating) + '</span></div><p class="mt-3 text-ink-700">' + U.esc(r.text) + '</p>' + (r.result ? '<p class="mt-2 text-sm font-semibold text-sky-700">' + U.esc(r.result) + '</p>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="text-ink-500">Written reviews for this course will appear here.</p>') + '</div></section>' +
      '</div></div>' +
      '<aside class="relative z-[35] hidden lg:block"><div class="sticky top-[88px] pt-10">' + card + '</div></aside></div>' +

      '<section class="border-t border-line bg-cloud py-14"><div class="container"><h2 class="text-display-md">Often taken together</h2><div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">' +
      (pkg ? pkg.courses : []).concat(st.site.courses.map(function (x) { return x.slug; })).filter(function (s, i, a) { return s !== c.slug && a.indexOf(s) === i && st.courseMap[s]; }).slice(0, 3)
        .map(function (s) { return U.courseCard(st.courseMap[s], { owned: U.owned(s) }); }).join('') + '</div></div></section>' +

      (owned ? '' : '<div class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden" style="padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))"><div class="flex items-center gap-3"><div class="min-w-0 flex-1"><p class="text-xs text-ink-500">From</p><p class="font-display text-xl font-semibold tabular">' + U.inr(c.price) + '</p></div><button class="btn btn-ghost btn-sm" data-unlock>Options</button>' + (pkg ? '<a class="btn btn-buy btn-sm" href="checkout.html?plan=' + pkg.slug + '">Enroll</a>' : '') + '</div></div>');

    function res(ic, t, d, attr) { return '<button ' + attr + ' class="flex gap-4 rounded-2xl border border-line p-5 text-left transition hover:border-sky-300">' + U.icon(ic, 'i-lg mt-0.5 text-sky-600') + '<span><span class="block font-semibold">' + t + '</span><span class="text-[15px] text-ink-600">' + d + '</span></span></button>'; }

    if (!owned) document.body.classList.add('has-buybar');
    U.accordions(root);
    U.$$('[data-lock]', root).forEach(function (b) { b.addEventListener('click', function () { var l = lessons.filter(function (x) { return String(x.id) === b.dataset.lock; })[0]; U.unlock(c.slug, l && l.title); }); });
    U.$$('[data-unlock]', root).forEach(function (b) { b.addEventListener('click', function () { U.unlock(c.slug); }); });
    U.$$('[data-intro]', root).forEach(function (b) { b.addEventListener('click', function () { U.modal({ title: c.title + ': course intro', wide: true, body: '<div class="player"><video src="' + U.esc(c.intro_video) + '"' + (c.intro_poster ? ' poster="' + U.esc(c.intro_poster) + '"' : '') + ' controls autoplay playsinline></video></div>' }); }); });
    U.$$('[data-pdf]', root).forEach(function (b) { b.addEventListener('click', function () { U.modal({ title: 'Cheat sheet: ' + c.title, wide: true, icon: 'file-down', body: '<div class="overflow-hidden rounded-2xl border border-line"><iframe src="' + U.esc(c.cheat_sheet) + '" title="Cheat sheet PDF" class="h-[60vh] w-full"></iframe></div><a class="btn btn-ghost btn-sm mt-3" href="' + U.esc(c.cheat_sheet) + '" target="_blank" rel="noopener">' + U.icon('external-link', 'i-sm') + 'Open the PDF in a new tab</a>' }); }); });
    var links = U.$$('[data-sec]');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (l) { l.setAttribute('aria-selected', String(l.dataset.sec === e.target.id)); }); }); }, { rootMargin: '-30% 0px -60% 0px' });
      links.forEach(function (l) { var t = document.getElementById(l.dataset.sec); if (t && !t.hidden) io.observe(t); });
    }
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 50); }
  }
})();
