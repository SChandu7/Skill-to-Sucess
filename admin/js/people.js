/* Learners (list + full profile with actions) and Team & roles */
(function () {
  'use strict';
  var AD = STS.admin, U = STS.ui, esc = U.esc, icon = U.icon;

  function statusTag(u) { return u.is_active ? '' : AD.tag('blocked'); }

  /* ------------------------------------------------------------------ list */
  AD.page('users', {
    section: 'users',
    render: function (view, r) {
      if (r.id) return detail(view, r.id, r.sub);
      return AD.options().then(function (o) {
        view.innerHTML = AD.header('Learners', 'Everyone who signed up. Click a learner to see their courses, orders, wallet and activity.',
          AD.can('exports') ? '<button class="btn btn-ghost" id="exp">' + icon('download', 'i-sm') + 'Export CSV</button>' : '') + '<div id="lst"></div>';
        var ex = U.$('#exp'); if (ex) ex.addEventListener('click', function () { U.busy(ex, true, 'Preparing'); AD.api.download('/export/users/', 'learners.csv').then(function () { U.busy(ex, false); }, function (e) { U.busy(ex, false); U.toast(e.message, null, true); }); });
        AD.list(U.$('#lst'), {
          endpoint: '/users/', params: r.query,
          filters: [{ type: 'search', name: 'search', label: 'Name, email, phone, city or code' },
            { name: 'package', label: 'Any package', options: [{ value: 'none', label: 'No package (free)' }].concat(o.packages.map(function (p) { return { value: p.slug, label: p.name }; })) },
            { name: 'status', label: 'Any status', options: [{ value: 'active', label: 'Active' }, { value: 'blocked', label: 'Blocked' }] },
            { name: 'ordering', label: 'Newest first', options: [{ value: '-spent', label: 'Top spenders' }, { value: '-xp', label: 'Most XP' }, { value: '-last_seen_at', label: 'Recently active' }, { value: 'name', label: 'Name A–Z' }, { value: 'date_joined', label: 'Oldest first' }] },
            { type: 'toggle', name: 'buyers', label: 'Buyers only' }],
          columns: [
            { label: 'Learner', render: function (u) { return '<div class="flex items-center gap-3">' + U.avatar(u.name, 36) + '<div class="min-w-0"><p class="font-semibold text-ink-900">' + esc(u.name) + ' ' + statusTag(u) + '</p><p class="truncate text-xs text-ink-500">' + esc(u.email) + '</p></div></div>'; } },
            { label: 'Mobile', cls: 'tabular whitespace-nowrap', render: function (u) { return esc(u.phone || '—'); } },
            { label: 'City', render: function (u) { return esc(u.city || '—'); } },
            { label: 'Package', render: function (u) { return u.package ? '<span class="tag tag-sky">' + esc(u.package) + '</span>' : '<span class="tag tag-mute">Free</span>'; } },
            { label: 'Spent', right: true, render: function (u) { return u.spent ? '<b>' + U.inr(u.spent) + '</b><br><span class="text-xs text-ink-500">' + u.orders_paid + ' order' + (u.orders_paid > 1 ? 's' : '') + '</span>' : '—'; } },
            { label: 'XP', right: true, render: function (u) { return U.num(u.xp); } },
            { label: 'Joined', cls: 'whitespace-nowrap', render: function (u) { return AD.day(u.date_joined) + '<br><span class="text-xs text-ink-500">' + (u.last_seen_at ? 'seen ' + U.ago(u.last_seen_at) : 'never active') + '</span>'; } }
          ],
          href: function (u) { return '#/users/' + u.id; }, empty: 'No learners match these filters', emptyIcon: 'users'
        });
      });
    }
  });

  /* ------------------------------------------------------------------ detail */
  function detail(view, id, tab) {
    tab = tab || 'courses';
    return Promise.all([AD.api.get('/users/' + id + '/'), AD.options()]).then(function (res) {
      var u = res[0], o = res[1], w = u.wallet, write = AD.can('users', 'write');
      var ownedIds = u.courses.map(function (c) { return c.id; });
      var tabsDef = [['courses', 'Courses', u.courses.length], ['orders', 'Orders', u.orders.length], ['wallet', 'Wallet', null], ['referrals', 'Referrals', u.referrals_made.length], ['certificates', 'Certificates', u.certificates.length], ['activity', 'Activity', null]]
        .filter(function (t) { return (t[0] !== 'orders' || AD.can('orders')) && (t[0] !== 'wallet' || AD.can('wallet')); });
      var actions = write ? '<button class="btn btn-ghost" data-do="edit">' + icon('pencil', 'i-sm') + 'Edit</button>' +
        '<div class="relative"><button class="btn btn-ghost" data-menu-btn>More' + icon('chevron-down', 'i-sm') + '</button><div data-menu class="absolute right-0 top-12 z-40 w-60 rounded-2xl border border-line bg-white p-2 shadow-pop" hidden>' +
        [['grant', 'lock-open', 'Give course access'], ['cert', 'award', 'Issue certificate', 'certificates'], ['wallet', 'wallet', 'Credit or debit wallet', 'wallet'], ['notify', 'bell', 'Send notification'], ['password', 'lock', 'Set new password']]
          .filter(function (a) { return !a[3] || AD.can(a[3], 'write'); }).map(function (a) { return '<button class="side-link !py-2 w-full" data-do="' + a[0] + '">' + icon(a[1], 'text-ink-400') + a[2] + '</button>'; }).join('') + '</div></div>' +
        (u.is_active ? '<button class="btn btn-ghost !text-bad-600" data-do="block">' + icon('ban', 'i-sm') + 'Block</button>' : '<button class="btn btn-primary" data-do="unblock">' + icon('user-check', 'i-sm') + 'Unblock</button>') : '';

      view.innerHTML = AD.header('<span class="flex items-center gap-3">' + U.avatar(u.name, 44) + '<span>' + esc(u.name) + '</span></span>',
        (u.package ? '<span class="tag tag-sky">' + esc(u.package) + ' package</span> ' : '<span class="tag tag-mute">Free account</span> ') + statusTag(u) + ' Joined ' + AD.day(u.date_joined) + (u.last_seen_at ? ' · last seen ' + U.ago(u.last_seen_at) : ''), actions, ['#/users', 'All learners']) +
        (!u.is_active && u.blocked_reason ? '<div class="mb-6 flex items-center gap-3 rounded-2xl bg-bad-50 px-4 py-3 text-sm text-bad-600">' + icon('ban', 'i-sm') + 'Blocked: ' + esc(u.blocked_reason) + '</div>' : '') +
        '<div class="grid gap-6 xl:grid-cols-[340px_1fr]"><aside class="space-y-6">' +
        '<section class="card p-5"><h2 class="mb-2 text-lg">Profile</h2>' + AD.kv([['Email', '<span class="select-all">' + esc(u.email) + '</span>'], ['Mobile', esc(u.phone || '')], ['City', esc(u.city)], ['XP', U.num(u.xp) + ' · ' + u.streak_days + '-day streak'],
          ['Referral code', u.referral_code ? '<span class="font-mono">' + esc(u.referral_code) + '</span>' : 'After first purchase'], ['Referred by', esc(u.referred_by_name || '')], ['UPI ID', esc(u.upi_id)], ['PAN', esc(u.pan)], ['Sign-up IP', esc(u.signup_ip || '')], ['Total spent', u.spent ? U.inr(u.spent) : '₹0']]) + '</section>' +
        (w ? '<section class="card p-5"><div class="mb-3 flex items-center justify-between"><h2 class="text-lg">Wallet</h2>' + (w.can_withdraw ? '<span class="tag tag-good">Can withdraw</span>' : '<span class="tag tag-warn" title="Must complete a course first">Learn-first lock</span>') + '</div>' +
          '<p class="font-display text-3xl font-semibold tabular">' + U.inr(w.available) + '</p><p class="text-sm text-ink-500">available now</p>' +
          '<div class="mt-4 grid grid-cols-2 gap-2 text-sm">' + [['Pending (hold)', w.pending], ['Locked', w.locked], ['Under review', w.under_review], ['Processing', w.processing], ['Withdrawn', w.withdrawn], ['Total earned', w.earned]].map(function (x) { return '<div class="rounded-xl bg-cloud px-3 py-2"><p class="text-xs text-ink-500">' + x[0] + '</p><p class="font-semibold tabular">' + U.inr(x[1]) + '</p></div>'; }).join('') + '</div></section>' : '') +
        '</aside><section class="min-w-0">' + AD.tabs(tabsDef.map(function (t) { return ['#/users/' + id + '/' + t[0], t[1], t[2]]; }), '#/users/' + id + '/' + tab) + '<div id="utab"></div></section></div>';

      var reload = AD.refresh;
      view.addEventListener('click', function (e) {
        var b = e.target.closest('[data-do]'); if (!b) return;
        doAction(b.dataset.do, u, o, ownedIds, reload);
      });
      renderTab(U.$('#utab'), tab, u, o, reload);
    });
  }

  function renderTab(host, tab, u, o, reload) {
    var write = AD.can('users', 'write');
    if (tab === 'courses') {
      host.innerHTML = '<div class="card overflow-hidden">' + AD.table([
        { label: 'Course', render: function (c) { return '<a class="font-semibold hover:text-sky-700" href="#/courses/' + c.id + '">' + esc(c.title) + '</a>'; } },
        { label: 'Access', render: function (c) { return c.via === 'package' ? '<span class="tag tag-sky">Package</span>' : '<span class="tag tag-orange whitespace-nowrap">Single course</span>'; } },
        { label: 'Progress', render: function (c) { var p = c.progress; return '<div class="flex min-w-[160px] items-center gap-2"><div class="meter flex-1"><span style="width:' + p.pct + '%"></span></div><span class="w-20 text-right text-xs tabular text-ink-600">' + p.done + '/' + p.total + '</span></div>'; } },
        { label: '', cls: 'w-px text-right', render: function (c) { return write && c.via !== 'package' ? '<button class="btn btn-ghost btn-sm !text-bad-600" data-revoke="' + c.id + '">Remove access</button>' : ''; } }
      ], u.courses, { empty: 'No course access yet', emptyHint: 'Access comes from a package, a single-course order or a manual grant.', emptyIcon: 'book-open' }) + '</div>';
      U.$$('[data-revoke]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          AD.confirm({ title: 'Remove course access?', text: 'The learner keeps their progress, but cannot open paid lessons until access is given again.', danger: true, ok: 'Remove access' }).then(function (ok) {
            if (ok) AD.run(AD.api.post('/users/' + u.id + '/revoke-course/', { course: Number(b.dataset.revoke) }), 'Access removed', reload);
          });
        });
      });
    } else if (tab === 'orders') {
      host.innerHTML = '<div class="card overflow-hidden">' + AD.table([
        { label: 'Order', render: function (x) { return '<span class="font-semibold">' + esc(x.number) + '</span><br><span class="text-xs text-ink-500">' + AD.dt(x.created_at) + '</span>'; } },
        { label: 'Item', render: function (x) { return esc(x.title); } },
        { label: 'Status', render: function (x) { return AD.tag(x.status); } },
        { label: 'Amount', right: true, render: function (x) { return '<b>' + U.inr(x.amount) + '</b>'; } }
      ], u.orders, { href: function (x) { return '#/orders/' + x.id; }, empty: 'No orders', emptyIcon: 'shopping-bag' }) + '</div>';
    } else if (tab === 'wallet') {
      host.innerHTML = '<div class="card overflow-hidden">' + AD.table([
        { label: 'Date', cls: 'whitespace-nowrap', render: function (t) { return AD.dt(t.created_at); } },
        { label: 'Entry', render: function (t) { return '<span class="font-medium">' + esc(t.title || t.kind) + '</span><br><span class="text-xs text-ink-500">' + esc(t.kind) + (t.order_number ? ' · ' + esc(t.order_number) : '') + (t.utr ? ' · UTR ' + esc(t.utr) : '') + (t.admin_note ? ' · ' + esc(t.admin_note) : '') + '</span>'; } },
        { label: 'Status', render: function (t) { return AD.tag(t.status) + (t.available_at && new Date(t.available_at) > new Date() ? '<br><span class="text-xs text-ink-500">clears ' + U.ago(t.available_at) + '</span>' : ''); } },
        { label: 'Amount', right: true, render: function (t) { return '<b class="' + (t.amount < 0 ? 'text-bad-600' : 'text-good-600') + '">' + (t.amount < 0 ? '−' : '+') + U.inr(Math.abs(t.amount)) + '</b>'; } }
      ], u.transactions, { empty: 'No wallet entries', emptyIcon: 'wallet' }) + '</div>';
    } else if (tab === 'referrals') {
      host.innerHTML = '<div class="card overflow-hidden">' + AD.table([
        { label: 'Friend', render: function (x) { return '<a class="font-semibold hover:text-sky-700" href="#/users/' + x.referred.id + '">' + esc(x.referred.name) + '</a><br><span class="text-xs text-ink-500">' + AD.day(x.created_at) + '</span>'; } },
        { label: 'Order', render: function (x) { return esc(x.order_number) + ' · ' + U.inr(x.amount_paid); } },
        { label: 'Cashback', right: true, render: function (x) { return '<b>' + U.inr(x.cashback_amount) + '</b><br><span class="text-xs text-ink-500">' + x.cashback_percent + '%</span>'; } },
        { label: 'Status', render: function (x) { return AD.tag(x.status) + (x.flag_reason ? '<br><span class="text-xs text-ink-500">' + esc(x.flag_reason) + '</span>' : ''); } }
      ], u.referrals_made, { empty: 'No referrals yet', emptyIcon: 'gift' }) + '</div>';
    } else if (tab === 'certificates') {
      host.innerHTML = '<div class="card overflow-hidden">' + AD.table([
        { label: 'Certificate', render: function (c) { return '<a class="font-mono font-semibold hover:text-sky-700" target="_blank" rel="noopener" href="../certificate.html?id=' + encodeURIComponent(c.code) + '">' + esc(c.code) + '</a>' + (c.issued_by_admin ? ' <span class="tag tag-orange">by admin</span>' : ''); } },
        { label: 'Course', render: function (c) { return esc(c.course_title); } },
        { label: 'Score', right: true, render: function (c) { return c.score_percent + '%'; } },
        { label: 'Issued', render: function (c) { return AD.day(c.issued_at); } },
        { label: 'Status', render: function (c) { return c.is_revoked ? AD.tag('revoked') : AD.tag('valid'); } }
      ], u.certificates, { empty: 'No certificates yet', emptyIcon: 'award' }) + '</div>';
    } else {
      host.innerHTML = '<div class="card px-4">' + (u.activity.length ? '<ul class="divide-y divide-line">' + u.activity.map(function (a) { return AD.activityRow(a); }).join('') + '</ul>' : '<p class="py-10 text-center text-sm text-ink-500">No activity recorded</p>') + '</div>';
    }
  }

  function doAction(act, u, o, ownedIds, reload) {
    var base = '/users/' + u.id + '/';
    if (act === 'edit') {
      AD.editor({
        title: 'Edit ' + u.name, icon: 'user', values: Object.assign({}, u, { package: u.package_slug || '' }),
        fields: [{ name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Mobile number', prefix: '+91', maxlength: 10 }, { name: 'city', label: 'City' },
          { name: 'package', label: 'Package', type: 'select', blank: 'No package (free)', nullable: true, options: o.packages.map(function (p) { return { value: p.slug, label: p.name + ' (' + U.inr(p.price) + ')' }; }), help: 'Changing this gives or removes package access without an order. Use orders for real payments.' },
          { name: 'xp', label: 'XP', type: 'number', min: 0 }, { name: 'upi_id', label: 'UPI ID', optional: true }, { name: 'pan', label: 'PAN', optional: true, maxlength: 10 }],
        save: function (d) { return AD.api.patch(base, d); }, done: reload
      });
    } else if (act === 'block') {
      AD.confirm({ title: 'Block ' + u.name + '?', text: 'They are logged out on every device and cannot log in until you unblock them.', danger: true, ok: 'Block learner', input: { label: 'Reason (shown to the team only)', required: 'Add a reason.' } }).then(function (reason) {
        if (reason) AD.run(AD.api.patch(base, { is_active: false, blocked_reason: reason }), 'Learner blocked', reload);
      });
    } else if (act === 'unblock') {
      AD.run(AD.api.patch(base, { is_active: true, blocked_reason: '' }), 'Learner unblocked', reload);
    } else if (act === 'grant') {
      var avail = o.courses.filter(function (c) { return ownedIds.indexOf(c.id) < 0; });
      if (!avail.length) return U.toast('This learner already has every course.', 'info');
      AD.editor({ title: 'Give course access', icon: 'lock-open', sub: 'For offline payments, scholarships or support cases. The learner gets a notification.', wide: false,
        fields: [{ name: 'course', label: 'Course', type: 'select', numeric: true, options: avail.map(function (c) { return { value: c.id, label: c.title }; }) }], cols: 1, ok: 'Give access',
        save: function (d) { return AD.api.post(base + 'grant-course/', d); }, done: reload, saved: 'Access given' });
    } else if (act === 'cert') {
      AD.editor({ title: 'Issue a certificate', icon: 'award', sub: 'Normally certificates are issued automatically. Use this only to fix a problem.', wide: false, cols: 1,
        fields: [{ name: 'course', label: 'Course', type: 'select', numeric: true, options: o.courses.map(function (c) { return { value: c.id, label: c.title }; }) }], ok: 'Issue certificate',
        save: function (d) { return AD.api.post(base + 'issue-certificate/', d); }, done: reload, saved: 'Certificate issued' });
    } else if (act === 'wallet') {
      AD.editor({ title: 'Credit or debit wallet', icon: 'wallet', sub: 'Use a minus sign to debit, e.g. -50. The learner is notified and it is logged.', wide: false, cols: 1,
        fields: [{ name: 'amount', label: 'Amount in ₹', type: 'number', required: true }, { name: 'reason', label: 'Reason', required: true, placeholder: 'e.g. Bonus for course feedback' }],
        validate: function (d) { if (!d.amount) return ['amount', 'Enter an amount other than zero.']; if (!d.reason) return ['reason', 'Add a reason.']; },
        save: function (d) { return AD.api.post(base + 'wallet-adjust/', d); }, done: reload, saved: 'Wallet updated' });
    } else if (act === 'notify') {
      AD.editor({ title: 'Send a notification', icon: 'bell', sub: 'Appears in the bell menu on the website.', wide: false, cols: 1,
        fields: [{ name: 'text', label: 'Message', type: 'textarea', maxlength: 300, required: true }, { name: 'link', label: 'Link', optional: true, placeholder: 'e.g. course.html?c=seo' }],
        save: function (d) { return AD.api.post(base + 'notify/', d); }, saved: 'Notification sent' });
    } else if (act === 'password') {
      AD.editor({ title: 'Set a new password', icon: 'lock', sub: 'The learner is logged out everywhere. Share the new password privately.', wide: false, cols: 1,
        fields: [{ name: 'password', label: 'New password', type: 'text', required: true, autocomplete: 'off', help: 'At least 8 characters.' }],
        save: function (d) { return AD.api.post(base + 'set-password/', d); }, saved: 'Password updated' });
    }
  }

  /* ------------------------------------------------------------------ team */
  AD.page('team', {
    section: 'team',
    render: function (view) {
      return AD.options().then(function (o) {
        var write = AD.can('team', 'write'), me = AD.me();
        view.innerHTML = AD.header('Team & roles', 'People who can open this admin panel.', write ? '<button class="btn btn-primary" id="add">' + icon('user-plus', 'i-sm') + 'Add team member</button>' : '') +
          '<div class="mb-6 grid gap-3 md:grid-cols-4">' + [['Owner', 'Everything, including team and site settings.'], ['Manager', 'Everything except team and settings.'], ['Content editor', 'Courses, packages, play content, reviews and FAQs.'], ['Support', 'Learners, orders, certificates and messages. Mostly read-only.']]
            .map(function (x) { return '<div class="rounded-2xl border border-line bg-white p-4"><p class="font-semibold">' + x[0] + '</p><p class="mt-1 text-sm text-ink-500">' + x[1] + '</p></div>'; }).join('') + '</div><div id="lst"></div>';
        var fields = function (isNew) {
          return [{ name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true, help: isNew ? 'If this person already has a learner account, it becomes a team account.' : '' },
            { name: 'phone', label: 'Mobile number', optional: true, prefix: '+91', maxlength: 10 }, { name: 'role', label: 'Role', type: 'select', options: o.roles },
            { name: 'password', label: isNew ? 'Password' : 'New password', type: 'password', optional: !isNew, autocomplete: 'new-password', help: isNew ? 'At least 8 characters.' : 'Leave empty to keep the current password.' },
            { name: 'is_active', label: 'Active', type: 'checkbox', default: true, help: 'Inactive members cannot sign in.' }];
        };
        var lst = AD.list(U.$('#lst'), {
          endpoint: '/team/',
          columns: [
            { label: 'Member', render: function (m) { return '<div class="flex items-center gap-3">' + U.avatar(m.name, 36) + '<div><p class="font-semibold">' + esc(m.name) + (m.id === me.id ? ' <span class="tag tag-sky">You</span>' : '') + '</p><p class="text-xs text-ink-500">' + esc(m.email) + '</p></div></div>'; } },
            { label: 'Role', render: function (m) { var r = o.roles.filter(function (x) { return x.value === m.role; })[0]; return '<span class="tag ' + (m.role === 'owner' ? 'tag-orange' : 'tag-sky') + '">' + esc(r ? r.label : m.role) + '</span>'; } },
            { label: 'Status', render: function (m) { return m.is_active ? AD.tag('active') : AD.tag('blocked', 'Inactive'); } },
            { label: 'Last sign-in', render: function (m) { return m.last_login ? U.ago(m.last_login) : 'Never'; } }
          ],
          actions: write ? function () { return AD.btn('edit', 'Edit', 'pencil'); } : null,
          onAction: function (act, m, b, reload) {
            AD.editor({ title: 'Edit ' + m.name, icon: 'user-cog', values: m, fields: fields(false), save: function (d) { return AD.api.patch('/team/' + m.id + '/', d); }, done: reload });
          }
        });
        var add = U.$('#add');
        if (add) add.addEventListener('click', function () {
          AD.editor({ title: 'Add team member', icon: 'user-plus', values: { role: 'support', is_active: true }, fields: fields(true), ok: 'Add member', saved: 'Team member added',
            save: function (d) { return AD.api.post('/team/', d); }, done: lst.reload });
        });
      });
    }
  });
})();
