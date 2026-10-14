/* Lesson player: video / text / image / PDF lessons, notes and the quiz that completes the lesson */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;
  var TYPE = { video: ['play-circle', 'Video'], text: ['file-text', 'Reading'], image: ['image', 'Image lesson'], pdf: ['file-down', 'PDF guide'] };
  var id = U.param('l');
  var toc = U.$('#toc'), shade = U.$('#toc-shade');
  function openToc(on) { toc.style.transform = on ? 'translateX(0)' : ''; shade.hidden = !on; document.body.style.overflow = on ? 'hidden' : ''; }
  U.$('#toc-btn').addEventListener('click', function () { openToc(true); });
  shade.addEventListener('click', function () { openToc(false); });

  U.boot({ noShell: true }).then(function (st) {
    var me = st.me;
    U.$('#top-right').innerHTML = me ? '<a href="dashboard.html" class="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-semibold hover:border-sky-300">' + U.avatar(me.name, 30) + '<span class="hidden sm:inline">Dashboard</span></a>' : '<a href="login.html?next=' + encodeURIComponent('lesson.html?l=' + id) + '" class="btn btn-ghost btn-sm">Log in</a>';
    if (!id) { location.replace('courses.html'); return; }
    A.lesson(id).then(function (l) { return A.course(l.course.slug).then(function (c) { render(st, l, c); }); }, function (e) { if (e.status === 404) location.replace('404.html'); else U.failure(e); });
  });

  function embed(url) {
    var m;
    if ((m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/))) return '<iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1" title="Lesson video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return '<iframe src="https://player.vimeo.com/video/' + m[1] + '" title="Lesson video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    if (/\.(mp4|webm|m3u8)(\?|$)/i.test(url)) return '<video src="' + U.esc(url) + '" controls playsinline preload="metadata"></video>';
    return '<iframe src="' + U.esc(url) + '" title="Lesson video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
  }

  function render(st, l, c) {
    var owned = l.owned, done = (c.me && c.me.done) || {};
    var all = c.modules.reduce(function (a, m) { return a.concat(m.lessons); }, []);
    document.title = l.title + ' | ' + c.title;
    U.$('#crumb').textContent = c.title; U.$('#crumb').href = 'course.html?c=' + c.slug;
    function meter() { var d = all.filter(function (x) { return done[x.id]; }).length, p = all.length ? Math.round(d * 100 / all.length) : 0; U.$('#top-meter').style.width = (owned ? p : 0) + '%'; U.$('#top-pct').textContent = owned ? p + '% complete' : 'Free preview'; }
    meter();

    function drawToc() {
      var d = all.filter(function (x) { return done[x.id]; }).length;
      var pkg = U.cheapestPackageFor(c.slug);
      toc.innerHTML = '<div class="border-b border-line p-5"><div class="flex items-start justify-between gap-2"><div><p class="text-xs font-semibold text-ink-500">' + (owned ? 'Your course' : 'Free preview') + '</p><p class="font-display text-lg font-semibold leading-snug">' + U.esc(c.title) + '</p></div><button class="grid h-9 w-9 flex-none place-items-center rounded-lg hover:bg-cloud lg:hidden" data-close aria-label="Close">' + U.icon('x') + '</button></div>' +
        (owned ? '<div class="mt-3 flex items-center gap-3"><div class="meter flex-1"><span style="width:' + Math.round(d * 100 / all.length) + '%"></span></div><span class="text-sm font-semibold tabular">' + d + '/' + all.length + '</span></div>' : (pkg ? '<a href="checkout.html?plan=' + pkg.slug + '" class="btn btn-buy btn-sm btn-block mt-3">Unlock all ' + all.length + ' lessons</a>' : '')) + '</div>' +
        c.modules.map(function (m, mi) {
          return '<div class="border-b border-line"><p class="px-5 pb-2 pt-4 text-xs font-semibold text-ink-500">Module ' + (mi + 1) + ': ' + U.esc(m.title) + '</p><ul class="pb-2">' + m.lessons.map(function (x) {
            var open = x.is_free || owned, cur = x.id === l.id, dn = done[x.id];
            return '<li><a href="lesson.html?l=' + x.id + '" class="mx-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ' + (cur ? 'bg-sky-50 font-semibold text-sky-900' : 'hover:bg-cloud') + '"' + (cur ? ' aria-current="page"' : '') + (open ? '' : ' data-lock="' + x.id + '"') + '>' +
              '<span class="grid h-6 w-6 flex-none place-items-center rounded-full ' + (dn ? 'bg-good-500 text-white' : open ? 'border border-line text-ink-500' : 'bg-cloud text-ink-400') + '">' + U.icon(dn ? 'check' : open ? TYPE[x.type][0] : 'lock', 'i-sm !h-3.5 !w-3.5') + '</span>' +
              '<span class="min-w-0 flex-1 ' + (open ? '' : 'text-ink-500') + '"><span class="line-clamp-2">' + x.n + '. ' + U.esc(x.title) + '</span></span>' + (x.is_free && !owned ? '<span class="tag tag-sky">Free</span>' : '<span class="text-xs text-ink-400 tabular">' + x.minutes + 'm</span>') + '</a></li>';
          }).join('') + '</ul></div>';
        }).join('');
      var cl = toc.querySelector('[data-close]'); if (cl) cl.addEventListener('click', function () { openToc(false); });
      U.$$('[data-lock]', toc).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var x = all.filter(function (y) { return String(y.id) === a.dataset.lock; })[0]; U.unlock(c.slug, x.title); }); });
      var curEl = toc.querySelector('[aria-current]'); if (curEl && window.innerWidth >= 1024) curEl.scrollIntoView({ block: 'center' });
    }
    drawToc();

    var root = U.$('#lesson-root'), m = l.module;
    var head = '<p class="flex flex-wrap items-center gap-2 text-sm text-ink-500"><span class="tag tag-mute">' + U.icon(TYPE[l.type][0], 'i-sm') + TYPE[l.type][1] + '</span><span>Lesson ' + l.n + ' of ' + l.course.lesson_count + '</span><span aria-hidden="true">/</span><span>' + l.minutes + ' min</span>' + (l.is_free && !owned ? '<span class="tag tag-sky">Free preview</span>' : '') + '</p>' +
      '<h1 class="mt-3 text-display-md">' + U.esc(l.title) + '</h1><p class="mt-1 text-ink-500">Module ' + m.index + ': ' + U.esc(m.title) + '</p>';

    if (l.locked) {
      var pkg = U.cheapestPackageFor(c.slug);
      root.innerHTML = head + '<div class="relative mt-8 overflow-hidden rounded-3xl border border-line">' +
        '<div class="aspect-video w-full blur-md" style="background:' + c.color + '">' + U.cover(c, 'h-full w-full object-cover opacity-70') + '</div>' +
        '<div class="absolute inset-0 grid place-items-center bg-white/75 p-6 text-center backdrop-blur-sm"><div class="max-w-md"><span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-700">' + U.icon('lock', 'i-lg') + '</span>' +
        '<h2 class="mt-4 text-2xl">This lesson is in the full course</h2><p class="mt-2 text-ink-600">The free lessons are open. Unlock all ' + all.length + ' lessons, quizzes and the certificate.</p>' +
        '<div class="mt-6 flex flex-col justify-center gap-2 sm:flex-row">' + (pkg ? '<a class="btn btn-buy" href="checkout.html?plan=' + pkg.slug + '">Get ' + U.esc(pkg.name) + ' for ' + U.inr(pkg.price) + '</a>' : '') + '<a class="btn btn-ghost" href="checkout.html?course=' + c.slug + '">This course only, ' + U.inr(c.price) + '</a></div></div></div></div>' +
        (m.key_points.length ? '<div class="mt-8 rounded-3xl bg-cloud p-6"><h3 class="text-lg">What this lesson covers</h3><ul class="mt-3 space-y-2">' + m.key_points.map(function (p) { return '<li class="flex gap-2 text-ink-700">' + U.icon('check', 'i-sm mt-1 text-sky-600') + U.esc(p) + '</li>'; }).join('') + '</ul></div>' : '');
      return;
    }

    var ct = l.content, media = '';
    if (l.type === 'video') {
      if (ct.video_url) media = '<div class="player mt-8">' + embed(ct.video_url) + '</div>';
      else if (ct.video) media = '<div class="player mt-8"><video src="' + U.esc(ct.video) + '"' + (ct.poster ? ' poster="' + U.esc(ct.poster) + '"' : '') + ' controls playsinline preload="metadata" controlslist="nodownload"></video></div>';
    } else if (l.type === 'image' && ct.image) {
      media = '<button class="group mt-8 block w-full overflow-hidden rounded-3xl border border-line" data-zoom aria-label="Open image full size"><img src="' + U.esc(ct.image) + '" alt="' + U.esc(l.title) + '" class="w-full transition duration-300 group-hover:scale-[1.01]"></button><p class="mt-2 flex items-center gap-1.5 text-xs text-ink-500">' + U.icon('maximize-2', 'i-sm') + 'Tap the image to view full size</p>';
    } else if (l.type === 'pdf' && ct.pdf) {
      media = '<div class="mt-8 overflow-hidden rounded-3xl border border-line"><iframe src="' + U.esc(ct.pdf) + '" title="' + U.esc(l.title) + '" class="h-[70vh] w-full bg-cloud"></iframe></div><a class="btn btn-ghost btn-sm mt-3" href="' + U.esc(ct.pdf) + '" target="_blank" rel="noopener">' + U.icon('external-link', 'i-sm') + 'Open PDF in a new tab</a>';
    }
    var body = ct.body.map(function (b) {
      if (b.type === 'heading') return '<h3>' + U.esc(b.text) + '</h3>';
      if (b.type === 'list') return '<ul>' + b.items.map(function (i) { return '<li>' + U.esc(i) + '</li>'; }).join('') + '</ul>';
      return '<p>' + U.esc(b.text) + '</p>';
    }).join('');

    var noteKey = 'sts:note:' + l.id, note = ''; try { note = localStorage.getItem(noteKey) || ''; } catch (e) { /* */ }
    var isDone = l.done, next = l.next, prev = l.prev;
    root.innerHTML = head + media + (body ? '<article class="prose-lesson mt-8">' + body + '</article>' : '') +
      '<section class="mt-12 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-8" id="quiz-box" aria-labelledby="quiz-h"><div class="flex flex-wrap items-center justify-between gap-3"><h2 id="quiz-h" class="text-xl">' + (l.quiz_count ? 'Lesson quiz' : 'Finish this lesson') + '</h2><span id="quiz-tag">' + (isDone ? '<span class="tag tag-good">' + U.icon('check', 'i-sm') + 'Completed' + (isDone.total ? ' with ' + isDone.score + '/' + isDone.total : '') + '</span>' : (l.quiz_count ? '<span class="text-sm text-ink-500">' + l.quiz_count + ' questions, ' + st.site.settings.quiz.pass + ' right to complete</span>' : '')) + '</span></div>' +
      '<div id="quiz" class="mt-5"><p class="text-ink-600">' + (isDone ? 'You have completed this lesson. ' + (l.quiz_count ? 'Retake the quiz any time to practise.' : '') : l.quiz_count ? 'Check what you learned. Passing marks the lesson complete and adds XP.' : 'Mark the lesson as done when you have finished it.') + '</p>' +
      (l.quiz_count ? '<button class="btn btn-dark mt-4" data-start>' + U.icon('list-checks', 'i-sm') + (isDone ? 'Retake quiz' : 'Start quiz') + '</button>' : (!isDone && owned ? '<button class="btn btn-dark mt-4" data-done>' + U.icon('check', 'i-sm') + 'Mark as done</button>' : '')) + '</div></section>' +
      '<section class="mt-8"><label for="notes" class="label flex items-center gap-2">' + U.icon('pen-line', 'i-sm text-ink-400') + 'My notes for this lesson</label><textarea id="notes" rows="3" class="input" placeholder="Write anything you want to remember. Saved on this device.">' + U.esc(note) + '</textarea></section>' +
      '<nav class="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6" aria-label="Lesson navigation">' +
      (prev ? '<a href="lesson.html?l=' + prev.id + '" class="btn btn-ghost">' + U.icon('arrow-left', 'i-sm') + '<span class="hidden sm:inline">Previous</span></a>' : '<span></span>') +
      (next ? (!next.locked ? '<a href="lesson.html?l=' + next.id + '" class="btn btn-primary"><span class="sm:hidden">Next lesson</span><span class="hidden sm:inline">Next: ' + U.esc(next.title.length > 30 ? next.title.slice(0, 28) + '…' : next.title) + '</span>' + U.icon('arrow-right', 'i-sm') + '</a>' : '<button class="btn btn-buy" data-next-lock>' + U.icon('lock', 'i-sm') + 'Unlock lesson ' + next.n + '</button>') : '<a href="course.html?c=' + c.slug + '" class="btn btn-primary">Back to course</a>') + '</nav>';

    var nt; U.$('#notes').addEventListener('input', function (e) { clearTimeout(nt); nt = setTimeout(function () { try { localStorage.setItem(noteKey, e.target.value); } catch (er) { /* */ } }, 300); });
    var z = root.querySelector('[data-zoom]'); if (z) z.addEventListener('click', function () { U.modal({ title: l.title, wide: true, body: '<img src="' + U.esc(ct.image) + '" alt="" class="w-full rounded-2xl">' }); });
    var nl = root.querySelector('[data-next-lock]'); if (nl) nl.addEventListener('click', function () { U.unlock(c.slug, next.title); });
    var sb = root.querySelector('[data-start]'); if (sb) sb.addEventListener('click', startQuiz);
    var db = root.querySelector('[data-done]'); if (db) db.addEventListener('click', function () { U.busy(db, true, 'Saving'); A.completeLesson(l.id).then(saved, function (e) { U.busy(db, false); U.failure(e); }); });

    function startQuiz() {
      var box = U.$('#quiz'); box.innerHTML = '<div class="skel h-40"></div>';
      A.quiz(l.id).then(function (qz) {
        STS.quiz.run(box, qz.questions, {
          check: function (q, k) { return A.quizCheck(l.id, q.id, k); },
          onDone: function (answers) { box.innerHTML = '<div class="skel h-24"></div>'; A.quizSubmit(l.id, answers).then(finish, function (e) { U.failure(e); }); }
        });
      }, function (e) { U.failure(e); });
    }
    function finish(r) {
      var box = U.$('#quiz');
      if (!r.passed) {
        box.innerHTML = '<div class="rounded-2xl bg-bad-50 p-5"><p class="font-display text-xl font-semibold">' + r.score + ' of ' + r.total + ' correct</p><p class="mt-1 text-ink-700">You need ' + r.pass + ' to complete the lesson. Read the key ideas again, then retry.</p><button class="btn btn-dark mt-4" data-retry>' + U.icon('rotate-ccw', 'i-sm') + 'Try again</button></div>';
        box.querySelector('[data-retry]').addEventListener('click', startQuiz); return;
      }
      if (!r.saved) {
        var pkg = U.cheapestPackageFor(c.slug);
        box.innerHTML = '<div class="rounded-2xl bg-sky-50 p-5"><p class="font-display text-xl font-semibold text-sky-900">' + r.score + ' of ' + r.total + '. You passed.</p><p class="mt-1 text-ink-700">' + U.esc(r.message || 'Buy the course to save progress and earn the certificate.') + '</p>' +
          '<div class="mt-4 flex flex-wrap gap-2">' + (pkg ? '<a class="btn btn-buy" href="checkout.html?plan=' + pkg.slug + '">Get ' + U.esc(pkg.name) + ' for ' + U.inr(pkg.price) + '</a>' : '') + (next && !next.locked ? '<a class="btn btn-ghost" href="lesson.html?l=' + next.id + '">Next free lesson</a>' : '') + '</div></div>';
        return;
      }
      saved(r);
    }
    function saved(r) {
      done[l.id] = { score: r.score || 0, total: r.total || 0 };
      if (r.xp) U.toast('+' + r.xp + ' XP. Lesson complete.', 'zap'); else U.toast('Lesson complete');
      U.$('#quiz').innerHTML = '<div class="rounded-2xl bg-good-50 p-5"><p class="font-display text-xl font-semibold text-good-700">' + (r.total ? r.score + ' of ' + r.total + '. ' : '') + 'Lesson complete.</p><p class="mt-1 text-ink-700">' + r.progress.done + ' of ' + r.progress.total + ' lessons done in this course.</p>' +
        (next ? '<a class="btn btn-primary mt-4" href="lesson.html?l=' + next.id + '">Next lesson' + U.icon('arrow-right', 'i-sm') + '</a>' : '') + '</div>';
      U.$('#quiz-tag').innerHTML = '<span class="tag tag-good">' + U.icon('check', 'i-sm') + 'Completed</span>';
      meter(); drawToc();
      if (r.certificate) {
        U.confetti();
        U.modal({ title: 'Certificate issued', icon: 'award', tone: 'bg-orange-100 text-orange-700', sub: 'You completed every lesson of ' + U.esc(c.title) + '.',
          body: '<p class="text-ink-700">Your certificate ID is <b class="tabular">' + U.esc(r.certificate.code) + '</b>. Anyone can verify it on our site.</p>',
          actions: [{ label: 'Later', cls: 'btn-ghost', close: true }, { label: 'View certificate', href: 'certificate.html?id=' + r.certificate.code }] });
      }
    }
  }
})();
