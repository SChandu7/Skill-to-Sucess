/* Engagement content: Play & earn (quizzes, game items, rounds), certificates, reviews, FAQs */
(function () {
  'use strict';
  var AD = STS.admin, U = STS.ui, esc = U.esc, icon = U.icon;
  var GAME = { memory: 'Memory match', scramble: 'Word scramble', rapid: 'Rapid fire' };
  function rowActions(write) { return write ? function () { return AD.iconBtn('edit', 'pencil', 'Edit') + AD.iconBtn('del', 'trash-2', 'Delete', 'hover:!text-bad-600'); } : null; }
  function crud(endpoint, title, fields, o) {
    o = o || {};
    return function (act, row, b, reload) {
      var done = function () { reload(); if (o.after) o.after(); };
      if (act === 'add') AD.editor({ title: 'Add ' + title, icon: o.icon, fields: fields, values: o.defaults || {}, ok: 'Add', saved: 'Added', validate: o.validate, save: function (d) { return AD.api.send('POST', endpoint, d); }, done: done });
      if (act === 'edit') AD.editor({ title: 'Edit ' + title, icon: o.icon, fields: fields, values: o.values ? o.values(row) : row, validate: o.validate, save: function (d) { return AD.api.send('PATCH', endpoint + row.id + '/', d); }, done: done });
      if (act === 'del') AD.confirm({ title: 'Delete this ' + title + '?', text: 'This cannot be undone.', danger: true, ok: 'Delete' }).then(function (ok) { if (ok) AD.run(AD.api.del(endpoint + row.id + '/'), 'Deleted', done); });
    };
  }

  /* ================================================================== play & earn */
  AD.page('play', {
    section: 'content',
    render: function (view, r) {
      var tab = r.id || 'quizzes', write = AD.can('content', 'write');
      var t = [['#/play/quizzes', 'Free quizzes'], ['#/play/games', 'Game words & statements']];
      if (AD.can('wallet')) t.push(['#/play/rounds', 'Rounds played']);
      view.innerHTML = AD.header('Play & earn', 'Free quizzes and mini-games that pay small wallet rewards. Limits are in <a class="link" href="#/settings">Site settings</a>.') + AD.tabs(t, '#/play/' + tab) + '<div id="lst"></div>';
      var host = U.$('#lst');
      if (tab === 'quizzes') return AD.options().then(function (o) {
        var fields = [{ name: 'title', label: 'Quiz title', required: true, span: 2 },
          { name: 'course', label: 'Questions come from', type: 'select', numeric: true, options: o.courses.map(function (c) { return { value: c.id, label: c.title }; }), help: 'Uses the active questions of this course (lesson and bank questions).' },
          { name: 'minutes', label: 'Study card reading time (min)', type: 'number', min: 1 },
          { name: 'questions_per_round', label: 'Questions per round', type: 'number', min: 2, max: 15 },
          { name: 'seconds_per_question', label: 'Seconds per question', type: 'number', min: 5, max: 120 },
          { name: 'notes', label: 'Study card points', type: 'lines', span: 2, rows: 4 },
          { name: 'sort_order', label: 'Position', type: 'number', min: 0 }, { name: 'is_active', label: 'Active', type: 'checkbox', default: true }];
        AD.list(host, {
          endpoint: '/play-topics/', toolbar: write ? AD.btn('add', 'Add quiz', 'plus', 'btn-primary') : '',
          columns: [{ label: 'Quiz', render: function (x) { return '<b>' + esc(x.title) + '</b><br><span class="text-xs text-ink-500">' + esc(x.course_title) + '</span>'; } },
            { label: 'Round', render: function (x) { return x.questions_per_round + ' questions · ' + x.seconds_per_question + ' s each'; } },
            { label: 'Question pool', right: true, render: function (x) { return x.bank_size < x.questions_per_round ? '<span class="font-semibold text-bad-600">' + x.bank_size + ' (too few)</span>' : x.bank_size; } },
            { label: 'Status', render: function (x) { return x.is_active ? AD.tag('active') : AD.tag('draft', 'Off'); } }],
          actions: rowActions(write), empty: 'No free quizzes yet', emptyIcon: 'list-checks',
          onAction: crud('/play-topics/', 'free quiz', fields, { icon: 'list-checks', defaults: { is_active: true, minutes: 3, questions_per_round: 5, seconds_per_question: 20 } })
        });
      });
      if (tab === 'games') {
        var fields = [{ name: 'game', label: 'Game', type: 'select', options: Object.keys(GAME).map(function (k) { return { value: k, label: GAME[k] }; }) },
          { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
          { name: 'text_a', label: 'Term, word or statement', required: true, span: 2, help: 'Memory: the term (e.g. CTR). Scramble: one word, 4–14 letters. Rapid fire: a statement to judge.' },
          { name: 'text_b', label: 'Meaning or hint', span: 2, help: 'Memory: the meaning. Scramble: a hint. Not used for rapid fire.' },
          { name: 'is_true', label: 'This statement is true', type: 'checkbox', default: true, span: 2, help: 'Rapid fire only. Untick for false statements.' }];
        AD.list(host, {
          endpoint: '/game-items/', params: r.query,
          filters: [{ type: 'search', name: 'search', label: 'Search' }, { name: 'game', label: 'All games', options: Object.keys(GAME).map(function (k) { return { value: k, label: GAME[k] }; }) }],
          toolbar: write ? AD.btn('add', 'Add item', 'plus', 'btn-primary') : '',
          columns: [{ label: 'Game', render: function (x) { return '<span class="tag tag-sky">' + GAME[x.game] + '</span>'; } },
            { label: 'Item', render: function (x) { return '<b>' + esc(x.text_a) + '</b>' + (x.text_b ? '<br><span class="text-xs text-ink-500">' + esc(x.text_b) + '</span>' : ''); } },
            { label: 'Answer', render: function (x) { return x.game === 'rapid' ? (x.is_true ? '<span class="tag tag-good">True</span>' : '<span class="tag tag-bad">False</span>') : ''; } },
            { label: 'Status', render: function (x) { return x.is_active ? AD.tag('active') : AD.tag('draft', 'Off'); } }],
          summary: function (d, rows) { var c = { memory: 0, scramble: 0, rapid: 0 }; rows.forEach(function (x) { if (x.is_active) c[x.game]++; }); return '<p class="border-b border-line px-4 py-2.5 text-xs text-ink-500">Active items: memory ' + c.memory + ' (needs 6+) · scramble ' + c.scramble + ' (needs 5+) · rapid fire ' + c.rapid + ' (needs 10+). More items mean less repetition.</p>'; },
          actions: rowActions(write), empty: 'No items', emptyIcon: 'gamepad-2',
          onAction: crud('/game-items/', 'game item', fields, { icon: 'gamepad-2', defaults: { game: r.query.game || 'memory', is_active: true, is_true: true } })
        });
        return;
      }
      AD.list(host, {
        endpoint: '/play-rounds/', params: r.query,
        filters: [{ type: 'search', name: 'search', label: 'Player, IP or guest id' }, { name: 'kind', label: 'All games', options: [{ value: 'quiz', label: 'Free quiz' }].concat(Object.keys(GAME).map(function (k) { return { value: k, label: GAME[k] }; })) },
          { type: 'date', name: 'play_date', label: 'Day' }, { type: 'toggle', name: 'rewarded', label: 'Paid rounds only' }],
        columns: [{ label: 'When', cls: 'whitespace-nowrap', render: function (x) { return AD.dt(x.finished_at); } },
          { label: 'Player', render: function (x) { return x.player.id ? '<a class="link" href="#/users/' + x.player.id + '">' + esc(x.player.name) + '</a>' : '<span class="text-ink-500">' + esc(x.player.name) + '</span>'; } },
          { label: 'Game', render: function (x) { return x.kind === 'quiz' ? 'Quiz: ' + esc(x.topic_title || '') : GAME[x.kind]; } },
          { label: 'Score', right: true, render: function (x) { return x.score + '/' + x.total; } },
          { label: 'Reward', right: true, render: function (x) { return x.reward ? '<b class="text-good-600">' + U.inr(x.reward) + '</b>' : '<span class="text-xs text-ink-500">' + esc((x.reward_note || '').replace(/_/g, ' ')) + '</span>'; } },
          { label: 'IP', cls: 'text-xs text-ink-500', render: function (x) { return '<button class="hover:text-sky-700" data-act="ip">' + esc(x.ip || '') + '</button>'; } }],
        empty: 'No rounds', emptyIcon: 'gamepad-2',
        onAction: function (act, x) { if (act === 'ip') location.hash = '#/play/rounds?search=' + encodeURIComponent(x.ip); }
      });
    }
  });

  /* ================================================================== certificates */
  AD.page('certificates', {
    section: 'certificates',
    render: function (view, r) {
      var write = AD.can('certificates', 'write');
      view.innerHTML = AD.header('Certificates', 'Issued automatically when a learner completes a course. Revoked certificates show as withdrawn on the verify page.') + '<div id="lst"></div>';
      return AD.options().then(function (o) {
        AD.list(U.$('#lst'), {
          endpoint: '/certificates/', params: r.query.q ? { search: r.query.q } : r.query,
          filters: [{ type: 'search', name: 'search', label: 'Certificate ID, name or email' }, { name: 'course', label: 'All courses', options: o.courses.map(function (c) { return { value: c.id, label: c.title }; }) },
            { name: 'is_revoked', label: 'Valid and revoked', options: [{ value: 'false', label: 'Valid' }, { value: 'true', label: 'Revoked' }] }],
          columns: [{ label: 'Certificate', render: function (c) { return '<a class="font-mono font-semibold hover:text-sky-700" target="_blank" rel="noopener" href="../certificate.html?id=' + encodeURIComponent(c.code) + '">' + esc(c.code) + '</a>' + (c.issued_by_admin ? '<br><span class="tag tag-orange">Issued by admin</span>' : ''); } },
            { label: 'Name on certificate', render: function (c) { return '<b>' + esc(c.name_on_certificate) + '</b><br><a class="text-xs text-ink-500 hover:text-sky-700" href="#/users/' + c.user.id + '">' + esc(c.user.email) + '</a>'; } },
            { label: 'Course', render: function (c) { return esc(c.course_title); } },
            { label: 'Score', right: true, render: function (c) { return c.score_percent + '%'; } },
            { label: 'Issued', cls: 'whitespace-nowrap', render: function (c) { return AD.day(c.issued_at); } },
            { label: 'Status', render: function (c) { return c.is_revoked ? AD.tag('revoked') + '<br><span class="text-xs text-ink-500">' + esc(c.revoked_reason) + '</span>' : AD.tag('valid'); } }],
          actions: write ? function (c) { return AD.iconBtn('edit', 'pencil', 'Fix name') + (c.is_revoked ? AD.btn('restore', 'Restore') : AD.btn('revoke', 'Revoke', null, 'btn-ghost !text-bad-600')); } : null,
          empty: 'No certificates', emptyIcon: 'award',
          onAction: function (act, c, b, reload) {
            if (act === 'edit') AD.editor({ title: 'Fix certificate name', icon: 'award', wide: false, cols: 1, sub: 'For spelling mistakes only. The ID stays the same.', values: c, fields: [{ name: 'name_on_certificate', label: 'Name on certificate', required: true }], save: function (d) { return AD.api.patch('/certificates/' + c.id + '/', d); }, done: reload });
            if (act === 'revoke') AD.confirm({ title: 'Revoke ' + c.code + '?', text: 'Anyone who checks it will see it was withdrawn.', danger: true, ok: 'Revoke', input: { label: 'Reason (shown on the verify page)', required: 'Add a reason.' } }).then(function (v) { if (v) AD.run(AD.api.post('/certificates/' + c.id + '/revoke/', { reason: v }), 'Certificate revoked', reload); });
            if (act === 'restore') AD.run(AD.api.post('/certificates/' + c.id + '/restore/', {}), 'Certificate restored', reload);
          }
        });
      });
    }
  });

  /* ================================================================== reviews */
  AD.page('reviews', {
    section: 'content',
    render: function (view) {
      var write = AD.can('content', 'write');
      view.innerHTML = AD.header('Reviews', 'Learner reviews shown on the home page and course pages.') +
        '<div class="mb-5 flex items-start gap-3 rounded-2xl border border-warn-600/30 bg-warn-50 px-4 py-3 text-sm text-ink-800">' + icon('alert-triangle', 'mt-0.5 flex-none text-warn-600') + '<span>Only publish reviews from real learners, with their permission. Replace the starter sample reviews before launch, and tick <b>Verified</b> only after you have checked the person bought the course.</span></div><div id="lst"></div>';
      return AD.options().then(function (o) {
        var fields = [{ name: 'name', label: 'Learner name', required: true }, { name: 'city', label: 'City', optional: true },
          { name: 'course', label: 'Course', type: 'select', numeric: true, blank: 'General (no course)', options: o.courses.map(function (c) { return { value: c.id, label: c.title }; }) },
          { name: 'package_name', label: 'Package they bought', optional: true },
          { name: 'text', label: 'Review', type: 'textarea', span: 2, rows: 4, required: true }, { name: 'result', label: 'Result in a few words', optional: true, span: 2, placeholder: 'e.g. First paid order in 5 weeks' },
          { name: 'rating', label: 'Stars', type: 'select', numeric: true, options: [5, 4, 3, 2, 1].map(function (n) { return { value: n, label: n + ' stars' }; }) }, { name: 'sort_order', label: 'Position', type: 'number', min: 0 },
          { name: 'is_verified', label: 'Verified buyer', type: 'checkbox', help: 'Shows a verified badge.' }, { name: 'is_active', label: 'Show on website', type: 'checkbox', default: true }];
        AD.list(U.$('#lst'), {
          endpoint: '/testimonials/', toolbar: write ? AD.btn('add', 'Add review', 'plus', 'btn-primary') : '',
          filters: [{ type: 'search', name: 'search', label: 'Search' }, { name: 'is_verified', label: 'All reviews', options: [{ value: 'true', label: 'Verified' }, { value: 'false', label: 'Not verified' }] }],
          columns: [{ label: 'Learner', render: function (x) { return '<div class="flex items-center gap-3">' + U.avatar(x.name, 34) + '<div><b>' + esc(x.name) + '</b><br><span class="text-xs text-ink-500">' + esc([x.city, x.package_name].filter(Boolean).join(' · ')) + '</span></div></div>'; } },
            { label: 'Review', render: function (x) { return '<p class="max-w-md text-[13px] text-ink-700">' + esc(x.text.length > 140 ? x.text.slice(0, 140) + '…' : x.text) + '</p><p class="mt-1 flex items-center gap-1 text-xs text-orange-500">' + U.stars(x.rating, 'i-sm') + (x.course_title ? '<span class="ml-1 text-ink-500">' + esc(x.course_title) + '</span>' : '') + '</p>'; } },
            { label: 'Status', render: function (x) { return (x.is_verified ? '<span class="tag tag-good">Verified</span>' : '<span class="tag tag-warn">Not verified</span>') + '<br>' + (x.is_active ? '<span class="text-xs text-ink-500">Shown</span>' : '<span class="text-xs text-ink-500">Hidden</span>'); } }],
          actions: rowActions(write), empty: 'No reviews yet', emptyIcon: 'star',
          onAction: crud('/testimonials/', 'review', fields, { icon: 'star', defaults: { rating: 5, is_active: true } })
        });
      });
    }
  });

  /* ================================================================== FAQs */
  AD.page('faqs', {
    section: 'content',
    render: function (view) {
      var write = AD.can('content', 'write');
      view.innerHTML = AD.header('FAQs', 'Questions on the help page. Tick "Show on home page" for the most important ones.') + '<div id="lst"></div>';
      var fields = [{ name: 'category', label: 'Topic', type: 'select', options: ['Courses', 'Payments', 'Refer & earn', 'Play & earn', 'Certificates', 'Account'] }, { name: 'sort_order', label: 'Position', type: 'number', min: 0 },
        { name: 'question', label: 'Question', span: 2, required: true, maxlength: 200 }, { name: 'answer', label: 'Answer', type: 'textarea', span: 2, rows: 5, required: true },
        { name: 'show_on_home', label: 'Show on home page', type: 'checkbox' }, { name: 'is_active', label: 'Active', type: 'checkbox', default: true }];
      AD.list(U.$('#lst'), {
        endpoint: '/faqs/', toolbar: write ? AD.btn('add', 'Add FAQ', 'plus', 'btn-primary') : '',
        filters: [{ type: 'search', name: 'search', label: 'Search' }, { name: 'category', label: 'All topics', options: ['Courses', 'Payments', 'Refer & earn', 'Play & earn', 'Certificates', 'Account'] }],
        columns: [{ label: 'Question', render: function (x) { return '<b>' + esc(x.question) + '</b><p class="mt-1 max-w-2xl text-xs text-ink-500">' + esc(x.answer.length > 160 ? x.answer.slice(0, 160) + '…' : x.answer) + '</p>'; } },
          { label: 'Topic', render: function (x) { return '<span class="tag tag-sky">' + esc(x.category) + '</span>'; } },
          { label: 'Where', render: function (x) { return (x.is_active ? (x.show_on_home ? 'Home + help' : 'Help page') : '<span class="text-ink-400">Hidden</span>'); } },
          { label: '#', right: true, k: 'sort_order' }],
        actions: rowActions(write), empty: 'No FAQs', emptyIcon: 'help-circle',
        onAction: crud('/faqs/', 'FAQ', fields, { icon: 'help-circle', defaults: { category: 'Courses', is_active: true } })
      });
    }
  });
})();
