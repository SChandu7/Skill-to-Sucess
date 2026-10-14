/* Live dashboard + activity log */
(function () {
  'use strict';
  var AD = STS.admin, U = STS.ui, C = STS.charts, esc = U.esc, icon = U.icon;
  var days = 30;

  function hello() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function delta(v) {
    if (v === null || v === undefined) return '<span class="text-xs text-ink-400">no earlier data</span>';
    var up = v >= 0;
    return '<span class="kpi-delta ' + (up ? 'up' : 'down') + ' inline-flex items-center gap-0.5 text-xs font-semibold">' + icon(up ? 'arrow-up' : 'arrow-down', 'i-sm') + Math.abs(v) + '%</span><span class="text-xs text-ink-400"> vs previous ' + days + ' days</span>';
  }
  function kpi(label, value, sub, sparkVals, color) {
    return '<div class="stat flex flex-col"><p class="k">' + label + '</p><div class="mt-1 flex items-end justify-between gap-3"><p class="v">' + value + '</p>' + (sparkVals ? C.spark(sparkVals, color) : '') + '</div><p class="mt-2 leading-snug">' + sub + '</p></div>';
  }
  function live(c) {
    return [['Revenue today', U.inr(c.revenue_today), 'indian-rupee', 'text-good-600'], ['Orders today', U.num(c.orders_today), 'shopping-bag', 'text-sky-600'], ['Sign-ups today', U.num(c.signups_today), 'user-plus', 'text-sky-600'],
      ['Lessons done today', U.num(c.lessons_today), 'graduation-cap', 'text-orange-500'], ['Online now', U.num(c.online_now), 'radio', 'text-good-600']].map(function (x) {
      return '<div class="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3"><span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white shadow-card">' + icon(x[2], 'i-sm ' + x[3]) + '</span><div class="min-w-0"><p class="truncate text-xs text-ink-500">' + x[0] + '</p><p class="font-display text-lg font-semibold tabular">' + x[1] + '</p></div></div>';
    }).join('');
  }
  function attention(c) {
    var items = [];
    if (AD.can('wallet') && c.pending_withdrawals) items.push(['#/withdrawals', 'banknote', c.pending_withdrawals + ' withdrawal' + (c.pending_withdrawals > 1 ? 's' : '') + ' to pay', U.inr(c.pending_withdrawal_amount) + ' requested']);
    if (AD.can('wallet') && c.flagged_referrals) items.push(['#/referrals?status=review', 'flag', c.flagged_referrals + ' referral' + (c.flagged_referrals > 1 ? 's' : '') + ' flagged', 'Same network as the referrer. Review before cashback is released.']);
    if (AD.can('messages') && c.open_messages) items.push(['#/messages', 'messages-square', c.open_messages + ' open message' + (c.open_messages > 1 ? 's' : ''), 'Learners are waiting for a reply.']);
    if (!items.length) return '<div class="flex items-center gap-3 rounded-2xl bg-good-50 px-4 py-3 text-sm text-good-700">' + icon('check-check') + 'All clear. Nothing needs your attention.</div>';
    return '<div class="grid gap-3 md:grid-cols-3">' + items.map(function (i) {
      return '<a href="' + i[0] + '" class="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 transition hover:border-orange-300"><span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white text-orange-600">' + icon(i[1], 'i-sm') + '</span><span class="min-w-0"><span class="block font-semibold text-ink-900">' + i[2] + '</span><span class="block text-xs text-ink-600">' + i[3] + '</span></span>' + icon('chevron-right', 'i-sm ml-auto mt-2 text-orange-500') + '</a>';
    }).join('') + '</div>';
  }

  AD.page('dashboard', {
    section: 'dashboard',
    render: function (view, r, ctx) {
      var me = AD.me();
      days = Number(r.query.days) || days;
      return AD.api.get('/dashboard/', { days: days }).then(function (d) {
        var k = d.kpis, s = d.series, c = d.counters;
        var rev = s.map(function (x) { return x.revenue; }), sig = s.map(function (x) { return x.signups; });
        view.innerHTML = AD.header(hello() + ', ' + esc(me.name.split(' ')[0]), 'Here is how ' + esc(me.brand) + ' is doing. Numbers refresh live.',
          '<div class="seg" role="group" aria-label="Period">' + [7, 30, 90].map(function (n) { return '<button data-days="' + n + '" aria-pressed="' + (n === days) + '">' + n + ' days</button>'; }).join('') + '</div>') +
          '<section class="mb-6 rounded-3xl bg-gradient-to-r from-sky-50 via-sky-50 to-orange-50 p-3"><div class="grid grid-cols-2 gap-2 md:grid-cols-5" id="d-live">' + live(c) + '</div></section>' +
          '<section class="mb-6" id="d-att">' + attention(c) + '</section>' +
          '<section class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">' +
          kpi('Revenue', U.inr(k.revenue), delta(k.revenue_change), rev, '#0A7BC2') +
          kpi('Paid orders', U.num(k.orders), delta(k.orders_change) + '<span class="block"></span><span class="text-xs text-ink-500">Average ' + U.inr(k.avg_order) + '</span>', s.map(function (x) { return x.orders; }), '#45A8E8') +
          kpi('New learners', U.num(k.signups), delta(k.signups_change), sig, '#FF9A3D') +
          kpi('Sign-up to purchase', k.conversion + '%', '<span class="text-xs text-ink-500">' + U.num(k.active_learners) + ' learners active in the last 7 days</span>') + '</section>' +
          '<div class="grid gap-6 xl:grid-cols-[1fr_380px]">' +
          '<div class="min-w-0 space-y-6">' +
          '<section class="card p-5 sm:p-6"><div class="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 class="text-lg">Revenue</h2><p class="text-sm text-ink-500">' + U.inr(k.revenue) + ' in ' + days + ' days · ' + U.inr(k.revenue_all_time) + ' all time</p></div><div id="ch-rev"></div></section>' +
          '<section class="card p-5 sm:p-6"><div class="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 class="text-lg">Learning and growth</h2><p class="text-sm text-ink-500">' + U.num(k.lessons_completed) + ' lessons completed · ' + U.num(k.certificates) + ' certificates</p></div><div id="ch-grow"></div></section>' +
          '<div class="grid gap-6 lg:grid-cols-2">' +
          '<section class="card p-5 sm:p-6"><h2 class="text-lg">Revenue by package</h2><p class="mb-4 text-sm text-ink-500">Last ' + days + ' days</p>' + C.bars(d.package_mix.map(function (p, i) { return { label: p.package__name, value: p.revenue, sub: p.orders + ' orders', color: ['#0A7BC2', '#1A8FD6', '#45A8E8', '#86C8F3', '#FF9A3D'][i % 5] }; }), { money: true }) +
          (d.course_sales.length ? '<p class="mb-3 mt-6 text-sm font-semibold text-ink-700">Single-course sales</p>' + C.bars(d.course_sales.map(function (p) { return { label: p.course__title, value: p.revenue, sub: p.orders + ' sold', color: '#FF9A3D' }; }), { money: true }) : '') + '</section>' +
          '<section class="card p-5 sm:p-6"><h2 class="text-lg">Most-studied courses</h2><p class="mb-4 text-sm text-ink-500">Lessons completed, last ' + days + ' days</p>' + C.bars(d.top_courses.map(function (c) { return { label: c.title, value: c.completions, sub: c.certificates_n + ' certificates', color: c.color }; })) + '</section>' +
          '<section class="card p-5 sm:p-6"><h2 class="text-lg">Learners per package</h2><p class="mb-4 text-sm text-ink-500">Current holders</p>' + C.bars(d.members.map(function (m) { return { label: m.name + ' (' + U.inr(m.price) + ')', value: m.n }; })) + '</section>' +
          '<section class="card p-5 sm:p-6"><h2 class="text-lg">Top referrers</h2><p class="mb-4 text-sm text-ink-500">Friends who bought, last ' + days + ' days</p>' +
          (d.top_referrers.length ? '<ul class="divide-y divide-line">' + d.top_referrers.map(function (t) { return '<li><a class="flex items-center gap-3 py-2.5 hover:text-sky-700" href="#/users/' + t.referrer__id + '">' + U.avatar(t.referrer__name, 32) + '<span class="flex-1 truncate font-medium">' + esc(t.referrer__name) + '</span><span class="text-sm tabular text-ink-600">' + t.friends + ' friends · ' + U.inr(t.cashback) + '</span></a></li>'; }).join('') + '</ul>' : '<p class="py-6 text-center text-sm text-ink-500">No referrals in this period</p>') +
          (d.methods.length ? '<p class="mb-2 mt-5 text-sm font-semibold text-ink-700">Payment methods</p><div class="flex flex-wrap gap-2">' + d.methods.map(function (m) { return '<span class="chip !cursor-default">' + esc(m.method) + ' <b class="tabular">' + m.n + '</b></span>'; }).join('') + '</div>' : '') + '</section>' +
          '</div>' +
          '<section class="card overflow-hidden"><div class="flex items-center justify-between p-5 pb-3 sm:px-6"><h2 class="text-lg">Latest paid orders</h2>' + (AD.can('orders') ? '<a class="link text-sm" href="#/orders">All orders</a>' : '') + '</div>' +
          AD.table([
            { label: 'Order', render: function (o) { return '<span class="font-semibold">' + esc(o.number) + '</span><br><span class="text-xs text-ink-500">' + AD.dt(o.paid_at) + '</span>'; } },
            { label: 'Learner', render: function (o) { return esc(o.user.name) + '<br><span class="text-xs text-ink-500">' + esc(o.user.email) + '</span>'; } },
            { label: 'Item', render: function (o) { return esc(o.title) + (o.referral_code ? '<br><span class="text-xs text-orange-600">Referred by ' + esc(o.referrer_name || o.referral_code) + '</span>' : ''); } },
            { label: 'Amount', right: true, render: function (o) { return '<b>' + U.inr(o.amount) + '</b>'; } }
          ], d.recent_orders, { href: AD.can('orders') ? function (o) { return '#/orders/' + o.id; } : null, empty: 'No paid orders yet', emptyIcon: 'shopping-bag' }) + '</section>' +
          '<section class="card p-5 sm:p-6"><h2 class="text-lg">Money overview</h2><p class="mb-4 text-sm text-ink-500">Last ' + days + ' days unless noted</p><div class="grid grid-cols-2 gap-3 2xl:grid-cols-4">' +
          [['Cashback earned', k.cashback_earned, 'gift'], ['Withdrawals paid', k.payouts, 'banknote'], ['Play rewards given', k.play_paid, 'gamepad-2'], ['Refunds', k.refunds, 'undo-2'],
            ['Wallet balance owed', k.wallet_liability, 'wallet', 'All learners, now'], ['Learners', k.users_total, 'users', 'All time', true], ['Buyers', k.buyers_total, 'user-check', 'All time', true], ['Revenue', k.revenue_all_time, 'indian-rupee', 'All time']].map(function (x) {
            return '<div class="rounded-2xl bg-cloud p-4"><p class="flex items-center gap-2 text-xs text-ink-500">' + icon(x[2], 'i-sm text-ink-400') + x[0] + '</p><p class="mt-1 font-display text-xl font-semibold tabular">' + (x[4] ? U.num(x[1]) : U.inr(x[1])) + '</p>' + (x[3] ? '<p class="text-[11px] text-ink-400">' + x[3] + '</p>' : '') + '</div>';
          }).join('') + '</div></section>' +
          '</div>' +
          '<aside class="space-y-6"><section class="card flex flex-col overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100vh-120px)]"><div class="flex items-center justify-between border-b border-line p-5 pb-4"><h2 class="flex items-center gap-2 text-lg"><span class="live-dot"></span>Live activity</h2>' + (AD.can('activity') ? '<a class="link text-sm" href="#/activity">Full log</a>' : '') + '</div><ul class="flex-1 divide-y divide-line overflow-y-auto px-4" id="feed"><li class="py-6"><div class="skel h-24"></div></li></ul></section>' +
          '<section class="card p-5"><div class="mb-3 flex items-center justify-between"><h2 class="text-lg">New learners</h2>' + (AD.can('users') ? '<a class="link text-sm" href="#/users">All</a>' : '') + '</div><ul class="divide-y divide-line">' +
          d.recent_signups.map(function (u) { return '<li><a class="flex items-center gap-3 py-2.5 hover:text-sky-700" href="' + (AD.can('users') ? '#/users/' + u.id : '#/dashboard') + '">' + U.avatar(u.name, 34) + '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold">' + esc(u.name) + '</span><span class="block truncate text-xs text-ink-500">' + esc(u.city || u.email) + ' · ' + U.ago(u.date_joined) + '</span></span>' + (u.package ? '<span class="tag tag-sky">' + esc(u.package) + '</span>' : '<span class="tag tag-mute">Free</span>') + '</a></li>'; }).join('') + '</ul></section></aside></div>';

        C.draw(U.$('#ch-rev'), { id: 'rev', data: s, keys: [{ k: 'revenue', label: 'Revenue', color: '#0A7BC2', money: true }], height: 250, title: 'Revenue per day' });
        C.draw(U.$('#ch-grow'), { id: 'grow', type: 'bar', data: s, keys: [{ k: 'signups', label: 'New learners', color: '#45A8E8' }, { k: 'lessons', label: 'Lessons completed', color: '#FF9A3D' }], height: 220, title: 'Sign-ups and lessons per day' });
        U.$$('[data-days]', view).forEach(function (b) { b.addEventListener('click', function () { days = Number(b.dataset.days); location.hash = '#/dashboard?days=' + days; }); });

        var feed = U.$('#feed'), seen = {};
        function addRows(rows, initial) {
          if (initial) feed.innerHTML = '';
          var fresh = rows.filter(function (a) { return !seen[a.id]; }).sort(function (a, b) { return a.id - b.id; });
          fresh.forEach(function (a) { seen[a.id] = 1; feed.insertAdjacentHTML('afterbegin', AD.activityRow(a, !initial)); });
          while (feed.children.length > 40) feed.lastElementChild.remove();
          if (!feed.children.length) feed.innerHTML = '<li class="py-10 text-center text-sm text-ink-500">Nothing yet. Activity appears here as it happens.</li>';
        }
        AD.api.get('/live/').then(function (lv) { addRows(lv.activity, true); });
        ctx.cleanup = AD.onLive(function (rows, first, counters) {
          if (rows.length && !first) { addRows(rows, false); var hot = rows.filter(function (a) { return a.action === 'order.paid' || a.action === 'user.registered'; })[0]; if (hot) U.toast(hot.message, CAT(hot)); }
          var l = U.$('#d-live'); if (l) l.innerHTML = live(counters);
          var at = U.$('#d-att'); if (at) at.innerHTML = attention(counters);
        });
      });
    }
  });
  function CAT(a) { return { order: 'shopping-bag', auth: 'user-plus' }[a.category] || 'activity'; }

  /* ------------------------------------------------------------------ activity log */
  AD.page('activity', {
    section: 'activity',
    render: function (view, r) {
      view.innerHTML = AD.header('Activity log', 'Everything that happens on the site and in this panel, newest first.') + '<div id="lst"></div>';
      AD.list(U.$('#lst'), {
        endpoint: '/activity/', params: r.query,
        filters: [{ type: 'search', name: 'search', label: 'Search messages, names, IDs' },
          { name: 'category', label: 'All areas', options: [['auth', 'Accounts'], ['order', 'Orders & payments'], ['learning', 'Learning'], ['wallet', 'Wallet'], ['referral', 'Referrals'], ['play', 'Play & earn'], ['support', 'Support'], ['admin', 'Admin changes'], ['system', 'System']].map(function (x) { return { value: x[0], label: x[1] }; }) },
          { name: 'level', label: 'All levels', options: [{ value: 'info', label: 'Info' }, { value: 'success', label: 'Success' }, { value: 'warning', label: 'Warning' }, { value: 'danger', label: 'Danger' }] },
          { type: 'date', name: 'date_from', label: 'From' }, { type: 'date', name: 'date_to', label: 'To' }],
        columns: [
          { label: 'When', cls: 'whitespace-nowrap', render: function (a) { return '<span class="text-ink-700">' + AD.dt(a.created_at) + '</span>'; } },
          { label: 'Event', render: function (a) { return '<div class="flex items-start gap-2">' + AD.tag(a.level) + '<span class="text-ink-800">' + esc(a.message) + '</span></div>'; } },
          { label: 'By', render: function (a) { return a.actor_id ? '<a class="link" href="#/' + (a.category === 'admin' ? 'team' : 'users/' + a.actor_id) + '">' + esc(a.actor_label) + '</a>' : '<span class="text-ink-500">' + esc(a.actor_label || 'System') + '</span>'; } },
          { label: 'Amount', right: true, render: function (a) { return a.amount ? U.inr(a.amount) : ''; } },
          { label: 'IP', cls: 'text-xs text-ink-500', render: function (a) { return esc(a.ip || ''); } }
        ],
        empty: 'No activity matches these filters', emptyIcon: 'activity'
      });
    }
  });
})();
