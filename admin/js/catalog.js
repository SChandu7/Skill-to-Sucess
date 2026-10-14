/* Catalog: courses (details, curriculum, question bank, stats), packages, categories and instructors */
(function () {
  'use strict';
  var AD = STS.admin, U = STS.ui, esc = U.esc, icon = U.icon;
  var TYPE_ICON = { video: 'circle-play', text: 'file-text', image: 'image', pdf: 'file-down' };
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 40); }
  function thumb(c, size) { size = size || 48; return '<span class="grid flex-none place-items-center overflow-hidden rounded-xl font-display text-sm font-semibold text-white" style="width:' + size + 'px;height:' + Math.round(size * 0.66) + 'px;background:' + esc(c.color || '#0A7BC2') + '">' + (c.cover ? '<img src="' + esc(c.cover) + '" alt="" class="h-full w-full object-cover">' : esc(c.code || '')) + '</span>'; }

  /* ================================================================== courses list */
  AD.page('courses', {
    section: 'catalog',
    render: function (view, r) {
      if (r.id) return course(view, r.id, r.sub || 'details');
      var write = AD.can('catalog', 'write');
      view.innerHTML = AD.header('Courses', 'Add courses, build their lessons and quizzes, and publish when ready.', write ? '<a class="btn btn-primary" href="#/courses/new">' + icon('plus', 'i-sm') + 'New course</a>' : '') + '<div id="lst"></div>';
      return AD.options().then(function (o) {
        AD.list(U.$('#lst'), {
          endpoint: '/courses/',
          filters: [{ type: 'search', name: 'search', label: 'Search title, slug or code' },
            { name: 'category', label: 'All categories', options: o.categories.map(function (c) { return { value: c.id, label: c.label }; }) },
            { name: 'is_published', label: 'Published and drafts', options: [{ value: 'true', label: 'Published' }, { value: 'false', label: 'Drafts' }] }],
          columns: [
            { label: 'Course', render: function (c) { return '<div class="flex items-center gap-3">' + thumb(c, 56) + '<div class="min-w-0"><p class="font-semibold text-ink-900">' + esc(c.title) + '</p><p class="text-xs text-ink-500">' + esc(c.code) + ' · ' + esc(c.category_label) + ' · ' + esc(c.level) + '</p></div></div>'; } },
            { label: 'Price', right: true, render: function (c) { return '<b>' + U.inr(c.price) + '</b>' + (c.mrp ? '<br><s class="text-xs text-ink-400">' + U.inr(c.mrp) + '</s>' : ''); } },
            { label: 'Content', render: function (c) { return c.module_total + ' modules · ' + c.lesson_total + ' lessons<br><span class="text-xs text-ink-500">' + c.question_total + ' quiz questions</span>'; } },
            { label: 'Learners', right: true, render: function (c) { return U.num(c.enrolled) + ' single<br><span class="text-xs text-ink-500">' + U.num(c.completions) + ' completed</span>'; } },
            { label: 'Status', render: function (c) { return c.is_published ? AD.tag('published') : AD.tag('draft'); } }
          ],
          href: function (c) { return '#/courses/' + c.id; }, empty: 'No courses yet', emptyIcon: 'book-open', emptyHint: write ? 'Click "New course" to add the first one.' : ''
        });
      });
    }
  });

  /* ================================================================== course editor */
  function courseFields(o) {
    return [
      { section: 'Basics' },
      { name: 'title', label: 'Course title', required: true, span: 2, maxlength: 120 },
      { name: 'short_description', label: 'One-line summary', span: 2, maxlength: 200, help: 'Shown on course cards. Keep it under 20 words.' },
      { name: 'description', label: 'Full description', type: 'textarea', span: 2, rows: 6 },
      { name: 'category', label: 'Category', type: 'select', numeric: true, options: o.categories.map(function (c) { return { value: c.id, label: c.label }; }) },
      { name: 'instructor', label: 'Instructor', type: 'select', numeric: true, blank: 'No instructor', options: o.instructors.map(function (i) { return { value: i.id, label: i.name }; }) },
      { name: 'level', label: 'Level', type: 'select', options: o.levels },
      { name: 'language', label: 'Language', default: 'English' },
      { name: 'code', label: 'Two-letter code', maxlength: 2, required: true, help: 'Used in certificate IDs, e.g. IG. Cannot match another course.' },
      { name: 'slug', label: 'Web address', optional: true, omitEmpty: true, help: 'Leave empty to create it from the title. Changing it breaks old links.' },
      { section: 'Price' },
      { name: 'price', label: 'Single-course price', type: 'number', prefix: '₹', min: 0, required: true },
      { name: 'mrp', label: 'Crossed-out price', type: 'number', prefix: '₹', min: 0, nullable: true, optional: true },
      { section: 'Look and media' },
      { name: 'color', label: 'Brand colour', type: 'color', help: 'Used when there is no cover image.' },
      { name: 'cover', label: 'Cover image', type: 'file', accept: 'image/*', image: true, help: 'JPG, PNG or WebP, 16:10, at least 960×600.' },
      { name: 'intro_video', label: 'Intro video', type: 'file', accept: 'video/mp4,video/webm', help: 'Free trailer shown on the course page. MP4, short.' },
      { name: 'intro_poster', label: 'Video poster', type: 'file', accept: 'image/*', image: true },
      { name: 'cheat_sheet', label: 'Free cheat sheet (PDF)', type: 'file', accept: 'application/pdf', help: 'Free download for everyone.' },
      { section: 'Selling points' },
      { name: 'outcomes', label: 'What learners will be able to do', type: 'lines', span: 2, rows: 5 },
      { name: 'for_who', label: 'Who it is for', type: 'lines', rows: 4 },
      { name: 'requirements', label: 'What they need', type: 'lines', rows: 4 },
      { section: 'Ratings shown on the site' },
      { name: 'rating', label: 'Rating (out of 5)', type: 'number', step: '0.1', min: 0, max: 5 },
      { name: 'rating_count', label: 'Number of ratings', type: 'number', min: 0 },
      { name: 'learners_count', label: 'Learners count shown', type: 'number', min: 0 },
      { name: 'sort_order', label: 'Position in lists', type: 'number', min: 0, help: 'Lower numbers show first.' },
      { section: 'Publishing' },
      { name: 'is_published', label: 'Published', type: 'checkbox', span: 2, help: 'Drafts are hidden from the website. Learners who own the course still keep access.' }
    ];
  }
  function fileVals(c) {
    var v = Object.assign({}, c);
    ['cover', 'intro_video', 'intro_poster', 'cheat_sheet'].forEach(function (k) { v[k] = c[k] ? { url: c[k], name: decodeURIComponent(c[k].split('/').pop().split('?')[0]) } : null; });
    return v;
  }

  function course(view, id, tab) {
    var isNew = id === 'new';
    return Promise.all([isNew ? Promise.resolve({ is_published: false, level: 'Beginner', language: 'English', color: '#0A7BC2', rating: 4.6, outcomes: [], for_who: [], requirements: [] }) : AD.api.get('/courses/' + id + '/'), AD.options()]).then(function (res) {
      var c = res[0], o = res[1], write = AD.can('catalog', 'write');
      var tabsHtml = isNew ? '' : AD.tabs([['#/courses/' + id + '/details', 'Details'], ['#/courses/' + id + '/curriculum', 'Lessons & quizzes'], ['#/courses/' + id + '/bank', 'Question bank'], ['#/courses/' + id + '/stats', 'Performance']], '#/courses/' + id + '/' + tab);
      view.innerHTML = AD.header(isNew ? 'New course' : '<span class="flex items-center gap-3">' + thumb(c, 52) + '<span class="min-w-0 truncate">' + esc(c.title) + '</span></span>',
        isNew ? 'Fill in the basics. You can add lessons after saving.' : (c.is_published ? AD.tag('published') : AD.tag('draft')) + ' ' + c.module_total + ' modules · ' + c.lesson_total + ' lessons · ' + c.question_total + ' questions',
        isNew ? '' : '<a class="btn btn-ghost" target="_blank" rel="noopener" href="../course.html?c=' + esc(c.slug) + '">' + icon('external-link', 'i-sm') + 'View on site</a>', ['#/courses', 'All courses']) + tabsHtml + '<div id="ctab"></div>';
      var host = U.$('#ctab');
      if (isNew || tab === 'details') return details(host, c, o, isNew, write);
      if (tab === 'curriculum') return curriculum(host, c, o, write);
      if (tab === 'bank') return bank(host, c, write);
      if (tab === 'stats') return stats(host, c);
    });
  }

  function details(host, c, o, isNew, write) {
    var fields = courseFields(o);
    host.innerHTML = '<form novalidate id="cf" class="card p-5 sm:p-8">' + AD.formHTML(fields, fileVals(c)) +
      (write ? '<div class="sticky bottom-0 -mx-5 -mb-5 mt-8 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">' +
        (isNew ? '' : '<button type="button" class="btn btn-ghost !text-bad-600" id="del">' + icon('trash-2', 'i-sm') + 'Delete course</button>') +
        '<span class="ml-auto text-sm text-ink-500" id="dirty"></span><button class="btn btn-primary">' + icon('save', 'i-sm') + (isNew ? 'Create course' : 'Save changes') + '</button></div>' : '') + '</form>';
    var f = U.$('#cf');
    AD.wireForm(f);
    if (!write) U.$$('input,select,textarea', f).forEach(function (i) { i.disabled = true; });
    f.addEventListener('input', function () { var d = U.$('#dirty'); if (d) d.textContent = 'Unsaved changes'; });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = AD.readForm(f, fields), b = f.querySelector('button.btn-primary');
      U.busy(b, true, 'Saving');
      (isNew ? AD.api.send('POST', '/courses/', data) : AD.api.send('PATCH', '/courses/' + c.id + '/', data)).then(function (saved) {
        U.toast(isNew ? 'Course created. Now add modules and lessons.' : 'Course saved');
        AD.options(true);
        if (isNew) location.hash = '#/courses/' + saved.id + '/curriculum'; else AD.refresh();
      }, function (err) { U.busy(b, false); AD.showErrors(f, err); });
    });
    var del = U.$('#del');
    if (del) del.addEventListener('click', function () {
      AD.confirm({ title: 'Delete ' + c.title + '?', text: 'This deletes all its modules, lessons and questions. Courses that were sold cannot be deleted. Unpublish them instead.', danger: true, ok: 'Delete course', input: { label: 'Type the course code (' + c.code + ') to confirm', required: true } }).then(function (v) {
        if (!v) return;
        if (v.toUpperCase() !== c.code) return U.toast('The code did not match. Nothing was deleted.', null, true);
        AD.run(AD.api.del('/courses/' + c.id + '/'), 'Course deleted', function () { AD.options(true); location.hash = '#/courses'; });
      });
    });
  }

  /* ------------------------------------------------------------------ curriculum */
  function moduleFields() {
    return [{ name: 'title', label: 'Module title', required: true, span: 2 }, { name: 'key_points', label: 'Key points', type: 'lines', span: 2, rows: 4, help: 'Shown as a summary on the course page. One per line.' },
      { name: 'task', label: 'Practice task', type: 'textarea', span: 2, rows: 3, help: 'A small real-world task learners do after this module.' }, { name: 'is_published', label: 'Published', type: 'checkbox', default: true, span: 2 }];
  }
  function lessonFields(modules) {
    return [{ name: 'title', label: 'Lesson title', required: true, span: 2 },
      { name: 'module', label: 'Module', type: 'select', numeric: true, options: modules.map(function (m, i) { return { value: m.id, label: (i + 1) + '. ' + m.title }; }) },
      { name: 'type', label: 'Lesson type', type: 'select', options: [{ value: 'video', label: 'Video' }, { value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }, { value: 'pdf', label: 'PDF' }] },
      { name: 'duration_minutes', label: 'Length in minutes', type: 'number', min: 1, default: 5 },
      { name: 'is_free_preview', label: 'Free preview', type: 'checkbox', help: 'Anyone can open it without buying.' },
      { name: 'is_published', label: 'Published', type: 'checkbox', default: true },
      { section: 'Content' },
      { name: 'body', label: 'Lesson text', type: 'textarea', span: 2, rows: 8, help: 'Blank line = new paragraph. Start a line with "## " for a heading or "- " for a bullet. Shown under the video or image.' },
      { name: 'video_url', label: 'Video link', type: 'url', span: 2, optional: true, placeholder: 'https://… (YouTube unlisted, Vimeo, Bunny Stream)', help: 'Use a link OR upload a file below. Uploaded files are protected and only paid learners can play them.' },
      { name: 'video_file', label: 'Upload video', type: 'file', accept: 'video/mp4,video/webm' },
      { name: 'image_file', label: 'Upload image', type: 'file', accept: 'image/*', image: true },
      { name: 'pdf_file', label: 'Upload PDF', type: 'file', accept: 'application/pdf', span: 2 }];
  }
  function questionFields() {
    return [{ name: 'text', label: 'Question', type: 'textarea', rows: 2, required: true, span: 2, maxlength: 300 },
      { name: 'options', label: 'Answer options', type: 'lines', rows: 4, span: 2, help: 'Two to six options, one per line.' },
      { name: 'correct_index', label: 'Correct answer', type: 'select', numeric: true, options: [0, 1, 2, 3, 4, 5].map(function (i) { return { value: i, label: 'Option ' + (i + 1) + (i === 0 ? ' (first line)' : '') }; }) },
      { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
      { name: 'explanation', label: 'Why it is correct', type: 'textarea', rows: 2, span: 2, maxlength: 300, help: 'Shown after the learner answers.' }];
  }
  function validQ(d) {
    if (!d.text) return ['text', 'Write the question.'];
    if (!d.options || d.options.length < 2) return ['options', 'Add at least two options.'];
    if (d.options.length > 6) return ['options', 'Use six options or fewer.'];
    if (d.correct_index >= d.options.length) return ['correct_index', 'Pick one of the options you wrote.'];
  }

  function curriculum(host, c, o, write) {
    return AD.api.get('/courses/' + c.id + '/curriculum/').then(function (cur) {
      var mods = cur.modules;
      var total = mods.reduce(function (a, m) { return a + m.lessons.length; }, 0), free = mods.reduce(function (a, m) { return a + m.lessons.filter(function (l) { return l.is_free_preview; }).length; }, 0);
      var noQ = mods.reduce(function (a, m) { return a + m.lessons.filter(function (l) { return !l.questions; }).length; }, 0);
      host.innerHTML = '<div class="mb-5 flex flex-wrap items-center gap-3"><p class="text-sm text-ink-600">' + mods.length + ' modules · ' + total + ' lessons · ' + free + ' free previews · ' + cur.bank_questions + ' bank questions' +
        (noQ ? ' · <span class="text-orange-700">' + noQ + ' lessons use only bank questions</span>' : '') + '</p>' +
        (write ? '<button class="btn btn-primary btn-sm ml-auto" data-x="add-module">' + icon('plus', 'i-sm') + 'Add module</button>' : '') + '</div>' +
        (mods.length ? '<div class="space-y-4">' + mods.map(function (m, mi) {
          return '<section class="card overflow-hidden" data-m="' + m.id + '"><header class="flex flex-wrap items-center gap-3 border-b border-line bg-cloud/60 px-4 py-3">' +
            '<span class="grid h-8 w-8 place-items-center rounded-lg bg-sky-600 font-display text-sm font-semibold text-white">' + (mi + 1) + '</span>' +
            '<div class="min-w-0 flex-1 basis-[60%]"><p class="font-semibold text-ink-900">' + esc(m.title) + ' ' + (m.is_published ? '' : AD.tag('draft')) + '</p><p class="text-xs text-ink-500">' + m.lessons.length + ' lessons' + (m.task ? ' · has practice task' : '') + '</p></div>' +
            (write ? '<div class="flex w-full items-center justify-end gap-1 sm:w-auto">' + AD.iconBtn('m-up', 'arrow-up', 'Move module up') + AD.iconBtn('m-down', 'arrow-down', 'Move module down') + AD.iconBtn('m-edit', 'pencil', 'Edit module') + AD.iconBtn('m-del', 'trash-2', 'Delete module', 'hover:!text-bad-600') +
              '<button class="btn btn-soft btn-sm ml-1" data-x="add-lesson">' + icon('plus', 'i-sm') + 'Lesson</button></div>' : '') + '</header>' +
            (m.lessons.length ? '<ol class="divide-y divide-line">' + m.lessons.map(function (l, li) {
              return '<li class="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-sky-50/40" data-l="' + l.id + '"><span class="w-6 text-center text-xs tabular text-ink-400">' + (li + 1) + '</span>' +
                '<span class="grid h-8 w-8 flex-none place-items-center rounded-lg bg-sky-50 text-sky-700" title="' + l.type + '">' + icon(TYPE_ICON[l.type] || 'file-text', 'i-sm') + '</span>' +
                '<div class="min-w-0 flex-1 basis-[60%]"><p class="truncate text-[15px] font-medium text-ink-900">' + esc(l.title) + '</p><p class="flex flex-wrap items-center gap-x-2 text-xs text-ink-500"><span>' + l.duration_minutes + ' min</span>' +
                (l.is_free_preview ? '<span class="font-semibold text-orange-600">Free preview</span>' : '') + (l.is_published ? '' : '<span class="text-bad-600">Draft</span>') +
                (l.has_media || l.type === 'text' ? '' : '<span class="text-bad-600">No media yet</span>') + '<span>' + (l.questions ? l.questions + ' quiz questions' : 'Bank questions') + '</span></p></div>' +
                (write ? '<div class="flex w-full items-center justify-end gap-1 sm:w-auto">' + AD.iconBtn('l-up', 'arrow-up', 'Move up') + AD.iconBtn('l-down', 'arrow-down', 'Move down') + AD.iconBtn('l-quiz', 'list-checks', 'Quiz questions') + AD.iconBtn('l-edit', 'pencil', 'Edit lesson') + AD.iconBtn('l-del', 'trash-2', 'Delete lesson', 'hover:!text-bad-600') + '</div>'
                  : AD.iconBtn('l-quiz', 'list-checks', 'Quiz questions')) + '</li>';
            }).join('') + '</ol>' : '<p class="px-4 py-6 text-center text-sm text-ink-500">No lessons in this module yet.</p>') + '</section>';
        }).join('') + '</div>' : '<div class="card px-6 py-14 text-center"><span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">' + icon('layers') + '</span><p class="mt-3 font-semibold">No modules yet</p><p class="mt-1 text-sm text-ink-500">A module is a group of lessons, like a chapter.</p></div>');

      var reload = function () { curriculum(host, c, o, write); };
      host.onclick = function (e) {
        var b = e.target.closest('[data-x],[data-act]'); if (!b) return;
        var act = b.dataset.x || b.dataset.act, ms = b.closest('[data-m]'), ls = b.closest('[data-l]');
        var mod = ms ? mods.filter(function (m) { return m.id === Number(ms.dataset.m); })[0] : null;
        var les = ls && mod ? mod.lessons.filter(function (l) { return l.id === Number(ls.dataset.l); })[0] : null;
        if (act === 'add-module') AD.editor({ title: 'Add module', icon: 'layers', fields: moduleFields(), values: { is_published: true }, ok: 'Add module', saved: 'Module added', save: function (d) { d.course = c.id; return AD.api.post('/modules/', d); }, done: reload });
        if (act === 'm-edit') AD.editor({ title: 'Edit module', icon: 'layers', fields: moduleFields(), values: mod, save: function (d) { return AD.api.patch('/modules/' + mod.id + '/', d); }, done: reload });
        if (act === 'm-del') AD.confirm({ title: 'Delete "' + mod.title + '"?', text: 'All ' + mod.lessons.length + ' lessons inside it, their files, questions and learner progress will be deleted.', danger: true, ok: 'Delete module' }).then(function (ok) { if (ok) AD.run(AD.api.del('/modules/' + mod.id + '/'), 'Module deleted', reload); });
        if (act === 'm-up' || act === 'm-down') {
          var ids = mods.map(function (m) { return m.id; }), i = ids.indexOf(mod.id), j = act === 'm-up' ? i - 1 : i + 1;
          if (j < 0 || j >= ids.length) return; ids.splice(j, 0, ids.splice(i, 1)[0]);
          AD.run(AD.api.post('/modules/reorder/', { ids: ids }), null, reload);
        }
        if (act === 'add-lesson') lessonEditor(c, mods, { module: mod.id, type: 'video', duration_minutes: 5, is_published: true }, reload);
        if (act === 'l-edit') AD.api.get('/lessons/' + les.id + '/').then(function (full) { lessonEditor(c, mods, full, reload); });
        if (act === 'l-del') AD.confirm({ title: 'Delete "' + les.title + '"?', text: 'Its files, quiz questions and learner progress will be deleted.', danger: true, ok: 'Delete lesson' }).then(function (ok) { if (ok) AD.run(AD.api.del('/lessons/' + les.id + '/'), 'Lesson deleted', reload); });
        if (act === 'l-up' || act === 'l-down') {
          var lids = mod.lessons.map(function (l) { return l.id; }), a = lids.indexOf(les.id), z = act === 'l-up' ? a - 1 : a + 1;
          if (z < 0 || z >= lids.length) return; lids.splice(z, 0, lids.splice(a, 1)[0]);
          AD.run(AD.api.post('/lessons/reorder/', { ids: lids, module: mod.id }), null, reload);
        }
        if (act === 'l-quiz') questions(c, les, write, reload);
      };
    });
  }
  function lessonEditor(c, mods, l, reload) {
    var vals = Object.assign({}, l);
    if (l.files) { vals.video_file = l.files.video; vals.image_file = l.files.image; vals.pdf_file = l.files.pdf; }
    AD.editor({
      title: l.id ? 'Edit lesson' : 'Add lesson', icon: TYPE_ICON[l.type] || 'file-text', fields: lessonFields(mods), values: vals, ok: l.id ? 'Save lesson' : 'Add lesson',
      validate: function (d) { if (!d.title) return ['title', 'Add a title.']; },
      save: function (d) { return l.id ? AD.api.send('PATCH', '/lessons/' + l.id + '/', d) : AD.api.send('POST', '/lessons/', d); },
      done: reload, saved: l.id ? 'Lesson saved' : 'Lesson added'
    });
  }
  function questions(c, les, write, reloadCurriculum) {
    var m = U.modal({ title: 'Quiz: ' + les.title, icon: 'list-checks', wide: true, sub: 'Learners answer these after the lesson. If there are fewer than needed, questions from the course bank are added.', body: '<div class="skel h-40"></div>', onClose: reloadCurriculum });
    function load() {
      AD.api.get('/questions/', { lesson: les.id }).then(function (qs) {
        m.body.innerHTML = (qs.length ? '<ol class="space-y-3">' + qs.map(function (q, i) {
          return '<li class="rounded-2xl border border-line p-4' + (q.is_active ? '' : ' opacity-60') + '" data-q="' + q.id + '"><div class="flex items-start gap-3"><span class="mt-0.5 text-sm font-semibold text-ink-400">' + (i + 1) + '.</span><div class="min-w-0 flex-1"><p class="font-semibold">' + esc(q.text) + (q.is_active ? '' : ' ' + AD.tag('draft', 'Inactive')) + '</p>' +
            '<ul class="mt-2 grid gap-1 text-sm">' + q.options.map(function (op, k) { return '<li class="flex items-center gap-2 ' + (k === q.correct_index ? 'font-semibold text-good-700' : 'text-ink-600') + '">' + icon(k === q.correct_index ? 'check-circle-2' : 'circle', 'i-sm') + esc(op) + '</li>'; }).join('') + '</ul>' +
            (q.explanation ? '<p class="mt-2 text-xs text-ink-500">' + esc(q.explanation) + '</p>' : '') + '</div>' +
            (write ? '<div class="flex gap-1">' + AD.iconBtn('q-edit', 'pencil', 'Edit question') + AD.iconBtn('q-del', 'trash-2', 'Delete question', 'hover:!text-bad-600') + '</div>' : '') + '</div></li>';
        }).join('') + '</ol>' : '<p class="rounded-2xl bg-cloud p-5 text-center text-sm text-ink-500">No questions for this lesson. The quiz uses questions from the course bank.</p>') +
          (write ? '<button class="btn btn-soft mt-4" data-q-add>' + icon('plus', 'i-sm') + 'Add question</button>' : '');
        m.body.onclick = function (e) {
          var b = e.target.closest('[data-act],[data-q-add]'); if (!b) return;
          var row = b.closest('[data-q]'), q = row ? qs.filter(function (x) { return x.id === Number(row.dataset.q); })[0] : null;
          if (b.hasAttribute('data-q-add')) AD.editor({ title: 'Add question', icon: 'help-circle', fields: questionFields(), values: { is_active: true, correct_index: 0 }, validate: validQ, ok: 'Add question', saved: 'Question added', save: function (d) { d.course = c.id; d.lesson = les.id; return AD.api.post('/questions/', d); }, done: load });
          else if (b.dataset.act === 'q-edit') AD.editor({ title: 'Edit question', icon: 'help-circle', fields: questionFields(), values: q, validate: validQ, save: function (d) { return AD.api.patch('/questions/' + q.id + '/', d); }, done: load });
          else if (b.dataset.act === 'q-del') AD.confirm({ title: 'Delete this question?', danger: true, ok: 'Delete' }).then(function (ok) { if (ok) AD.run(AD.api.del('/questions/' + q.id + '/'), 'Question deleted', load); });
        };
      });
    }
    load();
  }

  /* ------------------------------------------------------------------ question bank */
  function bank(host, c, write) {
    host.innerHTML = '<p class="mb-4 max-w-3xl text-[15px] text-ink-600">Bank questions belong to the whole course. They top up lesson quizzes that have too few questions, and power the free Play &amp; earn quiz for this course.</p><div id="blst"></div>';
    var lst = AD.list(U.$('#blst'), {
      endpoint: '/questions/', params: { course: c.id, bank: 1 },
      filters: [{ type: 'search', name: 'search', label: 'Search questions' }],
      toolbar: write ? '<button class="btn btn-primary btn-sm" data-act="add">' + icon('plus', 'i-sm') + 'Add question</button>' : '',
      columns: [
        { label: 'Question', render: function (q) { return '<p class="font-medium text-ink-900">' + esc(q.text) + '</p><p class="mt-1 text-xs text-good-700">' + icon('check', 'i-sm') + ' ' + esc(q.options[q.correct_index] || '') + '</p>'; } },
        { label: 'Options', right: true, render: function (q) { return q.options.length; } },
        { label: 'Status', render: function (q) { return q.is_active ? AD.tag('active') : AD.tag('draft', 'Inactive'); } }
      ],
      actions: write ? function () { return AD.iconBtn('edit', 'pencil', 'Edit') + AD.iconBtn('del', 'trash-2', 'Delete', 'hover:!text-bad-600'); } : null,
      empty: 'No bank questions yet', emptyIcon: 'help-circle',
      onAction: function (act, q, b, reload) {
        if (act === 'add') AD.editor({ title: 'Add bank question', icon: 'help-circle', fields: questionFields(), values: { is_active: true, correct_index: 0 }, validate: validQ, ok: 'Add question', saved: 'Question added', save: function (d) { d.course = c.id; d.lesson = null; return AD.api.post('/questions/', d); }, done: reload });
        if (act === 'edit') AD.editor({ title: 'Edit question', icon: 'help-circle', fields: questionFields(), values: q, validate: validQ, save: function (d) { return AD.api.patch('/questions/' + q.id + '/', d); }, done: reload });
        if (act === 'del') AD.confirm({ title: 'Delete this question?', danger: true, ok: 'Delete' }).then(function (ok) { if (ok) AD.run(AD.api.del('/questions/' + q.id + '/'), 'Question deleted', reload); });
      }
    });
    return lst;
  }

  /* ------------------------------------------------------------------ stats */
  function stats(host, c) {
    return AD.api.get('/courses/' + c.id + '/stats/').then(function (s) {
      var max = Math.max.apply(null, s.lessons.map(function (l) { return l.done; }).concat([1]));
      var first = s.lessons.length ? s.lessons[0].done : 0, last = s.lessons.length ? s.lessons[s.lessons.length - 1].done : 0;
      host.innerHTML = '<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">' +
        [['Single-course sales', U.num(s.single_sales.n || 0)], ['Single-course revenue', U.inr(s.single_sales.revenue || 0)], ['Certificates issued', U.num(c.completions)], ['Finish rate', first ? Math.round(last / first * 100) + '%' : '—']]
          .map(function (x) { return '<div class="stat"><p class="k">' + x[0] + '</p><p class="v mt-1">' + x[1] + '</p></div>'; }).join('') + '</div>' +
        '<p class="mb-6 text-sm text-ink-600">Included in: ' + (s.in_packages.length ? s.in_packages.map(function (p) { return '<span class="tag tag-sky">' + esc(p) + '</span>'; }).join(' ') : 'no packages') + '</p>' +
        '<section class="card p-5 sm:p-6"><h2 class="text-lg">Learners who completed each lesson</h2><p class="mb-4 text-sm text-ink-500">A big drop between two lessons shows where learners give up.</p><ol class="space-y-2">' +
        s.lessons.map(function (l, i) { return '<li class="grid grid-cols-[28px_1fr_60px] items-center gap-3 text-sm"><span class="text-right text-xs tabular text-ink-400">' + (i + 1) + '</span><div><p class="truncate text-ink-800">' + esc(l.title) + '</p><div class="mt-1 h-2 rounded-full bg-cloud"><div class="h-full rounded-full bg-sky-500" style="width:' + Math.max(1, l.done / max * 100) + '%"></div></div></div><span class="text-right font-semibold tabular">' + U.num(l.done) + '</span></li>'; }).join('') + '</ol></section>';
    });
  }

  /* ================================================================== packages */
  AD.page('packages', {
    section: 'catalog',
    render: function (view) {
      var write = AD.can('catalog', 'write');
      return Promise.all([AD.api.get('/packages/'), AD.options()]).then(function (res) {
        var list = res[0], o = res[1];
        view.innerHTML = AD.header('Packages', 'Bundles of courses. Each package also sets the referral cashback its owners earn.', write ? '<button class="btn btn-primary" data-new>' + icon('plus', 'i-sm') + 'New package</button>' : '') +
          '<div class="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">' + list.map(function (p) {
            return '<article class="card flex flex-col p-6' + (p.is_popular ? ' ring-2 ring-orange-300' : '') + '"><div class="flex items-start justify-between gap-3"><div><h2 class="text-xl">' + esc(p.name) + '</h2><p class="text-sm text-ink-500">' + esc(p.tagline || p.slug) + '</p></div><div class="flex flex-wrap justify-end gap-1">' + (p.is_popular ? '<span class="tag tag-orange">Popular</span>' : '') + (p.is_active ? AD.tag('active') : AD.tag('draft', 'Hidden')) + '</div></div>' +
              '<p class="mt-4 font-display text-3xl font-semibold tabular">' + U.inr(p.price) + (p.mrp ? ' <s class="text-base font-normal text-ink-400">' + U.inr(p.mrp) + '</s>' : '') + '</p>' +
              '<div class="mt-4 grid grid-cols-3 gap-2 text-center text-sm"><div class="rounded-xl bg-cloud py-2"><p class="font-semibold tabular">' + p.courses.length + '</p><p class="text-xs text-ink-500">courses</p></div><div class="rounded-xl bg-cloud py-2"><p class="font-semibold tabular">' + U.num(p.members) + '</p><p class="text-xs text-ink-500">members</p></div><div class="rounded-xl bg-orange-50 py-2"><p class="font-semibold tabular text-orange-700">' + p.cashback_percent + '%</p><p class="text-xs text-ink-500">cashback</p></div></div>' +
              '<p class="mt-4 text-sm text-ink-600">' + o.courses.filter(function (c) { return p.courses.indexOf(c.id) >= 0; }).map(function (c) { return esc(c.title); }).join(', ') + (p.includes_future_courses ? ' <b>+ all future courses</b>' : '') + '</p>' +
              '<div class="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-sm"><span class="text-ink-500">Revenue <b class="text-ink-900">' + U.inr(p.revenue) + '</b></span>' + (write ? '<button class="btn btn-ghost btn-sm" data-edit="' + p.id + '">' + icon('pencil', 'i-sm') + 'Edit</button>' : '') + '</div></article>';
          }).join('') + '</div>';
        var fields = [{ name: 'name', label: 'Package name', required: true }, { name: 'slug', label: 'Web address', optional: true, help: 'Leave empty to create from the name.' },
          { name: 'tagline', label: 'Short label', optional: true, placeholder: 'e.g. Most chosen' }, { name: 'support_text', label: 'Support line', optional: true, placeholder: 'e.g. WhatsApp support in 24 hours' },
          { name: 'price', label: 'Price', type: 'number', prefix: '₹', min: 0, required: true }, { name: 'mrp', label: 'Crossed-out price', type: 'number', prefix: '₹', nullable: true, optional: true },
          { name: 'cashback_percent', label: 'Referral cashback for owners', type: 'number', min: 0, max: 60, help: '% of what a referred friend pays. One level only. Max 60%.' },
          { name: 'sort_order', label: 'Position', type: 'number', min: 0 },
          { name: 'courses', label: 'Courses included', type: 'multi', span: 2, options: o.courses.map(function (c) { return { value: c.id, label: c.title }; }) },
          { name: 'perks', label: 'Perks shown on the pricing card', type: 'lines', span: 2, rows: 4 },
          { name: 'includes_future_courses', label: 'Includes future courses', type: 'checkbox' }, { name: 'is_popular', label: 'Highlight as popular', type: 'checkbox' },
          { name: 'is_active', label: 'Show on the website', type: 'checkbox', default: true, span: 2, help: 'Hidden packages cannot be bought. Current owners keep access.' }];
        function save(p) {
          return function (d) { if (!d.slug) d.slug = slugify(d.name); return p ? AD.api.patch('/packages/' + p.id + '/', d) : AD.api.post('/packages/', d); };
        }
        view.addEventListener('click', function (e) {
          var ed = e.target.closest('[data-edit]'), nw = e.target.closest('[data-new]');
          if (nw) AD.editor({ title: 'New package', icon: 'package', fields: fields, values: { is_active: true, cashback_percent: 10, courses: [] }, ok: 'Create package', saved: 'Package created', save: save(null), done: function () { AD.options(true); AD.refresh(); } });
          if (ed) {
            var p = list.filter(function (x) { return x.id === Number(ed.dataset.edit); })[0];
            AD.editor({ title: 'Edit ' + p.name, icon: 'package', fields: fields, values: p, save: save(p), done: function () { AD.options(true); AD.refresh(); },
              remove: function () { return AD.confirm({ title: 'Delete ' + p.name + '?', text: 'Packages that were sold cannot be deleted. Hide them instead.', danger: true, ok: 'Delete' }).then(function (ok) { if (!ok) return false; return AD.run(AD.api.del('/packages/' + p.id + '/'), 'Package deleted', function () { AD.options(true); AD.refresh(); }).then(function () { return true; }, function () { return false; }); }); } });
          }
        });
      });
    }
  });

  /* ================================================================== categories & instructors */
  AD.page('setup', {
    section: 'catalog',
    render: function (view) {
      var write = AD.can('catalog', 'write');
      view.innerHTML = AD.header('Categories & instructors', 'Course categories appear as filters on the website. Instructors appear on course pages.') +
        '<div class="grid gap-8 xl:grid-cols-[1fr_1.4fr]"><section><div class="mb-3 flex items-center justify-between"><h2 class="text-lg">Categories</h2></div><div id="cats"></div></section><section><div class="mb-3 flex items-center justify-between"><h2 class="text-lg">Instructors</h2></div><div id="ins"></div></section></div>';
      var catFields = [{ name: 'label', label: 'Name', required: true }, { name: 'slug', label: 'Web address', optional: true, help: 'Leave empty to create from the name.' }, { name: 'sort_order', label: 'Position', type: 'number', min: 0 }];
      AD.list(U.$('#cats'), {
        endpoint: '/categories/', toolbar: write ? AD.btn('add', 'Add category', 'plus', 'btn-primary') : '',
        columns: [{ label: 'Category', render: function (c) { return '<b>' + esc(c.label) + '</b><br><span class="text-xs text-ink-500">' + esc(c.slug) + '</span>'; } }, { label: 'Courses', right: true, k: 'course_count' }, { label: 'Position', right: true, k: 'sort_order' }],
        actions: write ? function () { return AD.iconBtn('edit', 'pencil', 'Edit') + AD.iconBtn('del', 'trash-2', 'Delete', 'hover:!text-bad-600'); } : null,
        onAction: function (act, c, b, reload) {
          var done = function () { AD.options(true); reload(); };
          if (act === 'add') AD.editor({ title: 'Add category', icon: 'folder', fields: catFields, cols: 1, wide: false, ok: 'Add', saved: 'Category added', save: function (d) { if (!d.slug) d.slug = slugify(d.label); return AD.api.post('/categories/', d); }, done: done });
          if (act === 'edit') AD.editor({ title: 'Edit category', icon: 'folder', fields: catFields, values: c, cols: 1, wide: false, save: function (d) { if (!d.slug) d.slug = slugify(d.label); return AD.api.patch('/categories/' + c.id + '/', d); }, done: done });
          if (act === 'del') AD.confirm({ title: 'Delete ' + c.label + '?', text: c.course_count ? 'Move its ' + c.course_count + ' courses to another category first.' : 'This cannot be undone.', danger: true, ok: 'Delete' }).then(function (ok) { if (ok) AD.run(AD.api.del('/categories/' + c.id + '/'), 'Category deleted', done); });
        }
      });
      var insFields = [{ name: 'name', label: 'Full name', required: true }, { name: 'role', label: 'Job title', required: true, placeholder: 'e.g. Graphic designer' }, { name: 'years', label: 'Years of experience', type: 'number', min: 0 },
        { name: 'color', label: 'Colour', type: 'color' }, { name: 'bio', label: 'Short bio', type: 'textarea', span: 2, rows: 3 }, { name: 'photo', label: 'Photo', type: 'file', accept: 'image/*', image: true, span: 2 }, { name: 'is_active', label: 'Active', type: 'checkbox', default: true, span: 2 }];
      AD.list(U.$('#ins'), {
        endpoint: '/instructors/', toolbar: write ? AD.btn('add', 'Add instructor', 'plus', 'btn-primary') : '',
        columns: [{ label: 'Instructor', render: function (i) { return '<div class="flex items-center gap-3">' + (i.photo ? '<img src="' + esc(i.photo) + '" alt="" class="h-9 w-9 rounded-full object-cover">' : U.avatar(i.name, 36)) + '<div><b>' + esc(i.name) + '</b>' + (i.is_active ? '' : ' ' + AD.tag('draft', 'Inactive')) + '<br><span class="text-xs text-ink-500">' + esc(i.role) + ' · ' + i.years + ' yrs</span></div></div>'; } }, { label: 'Courses', right: true, k: 'course_count' }],
        actions: write ? function () { return AD.iconBtn('edit', 'pencil', 'Edit') + AD.iconBtn('del', 'trash-2', 'Delete', 'hover:!text-bad-600'); } : null,
        onAction: function (act, i, b, reload) {
          var done = function () { AD.options(true); reload(); };
          var vals = i ? Object.assign({}, i, { photo: i.photo ? { url: i.photo, name: 'Current photo' } : null }) : {};
          if (act === 'add') AD.editor({ title: 'Add instructor', icon: 'user', fields: insFields, values: { is_active: true, years: 3, color: '#0A7BC2' }, ok: 'Add', saved: 'Instructor added', save: function (d) { return AD.api.send('POST', '/instructors/', d); }, done: done });
          if (act === 'edit') AD.editor({ title: 'Edit ' + i.name, icon: 'user', fields: insFields, values: vals, save: function (d) { return AD.api.send('PATCH', '/instructors/' + i.id + '/', d); }, done: done });
          if (act === 'del') AD.confirm({ title: 'Delete ' + i.name + '?', text: 'Their courses will show no instructor.', danger: true, ok: 'Delete' }).then(function (ok) { if (ok) AD.run(AD.api.del('/instructors/' + i.id + '/'), 'Instructor deleted', done); });
        }
      });
    }
  });
})();
