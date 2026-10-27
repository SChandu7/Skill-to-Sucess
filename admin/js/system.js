/* Support and system: messages, broadcast notifications, site settings, CSV exports */
(function () {
  'use strict';
  var AD = STS.admin, U = STS.ui, esc = U.esc, icon = U.icon;

  /* ================================================================== messages */
  AD.page('messages', {
    section: 'messages',
    render: function (view, r) {
      view.innerHTML = AD.header('Messages', 'Contact-form tickets. Replies go to the learner by email.') + '<div id="lst"></div>';
      var lst = AD.list(U.$('#lst'), {
        endpoint: '/messages/', params: r.query,
        filters: [{ type: 'search', name: 'search', label: 'Ticket, name, email or text' }, { name: 'status', label: 'All statuses', options: [{ value: 'new', label: 'New' }, { value: 'open', label: 'In progress' }, { value: 'resolved', label: 'Resolved' }] }],
        columns: [
          { label: 'Ticket', cls: 'whitespace-nowrap', render: function (m) { return '<b class="font-mono">' + esc(m.ticket) + '</b><br><span class="text-xs text-ink-500">' + U.ago(m.created_at) + '</span>'; } },
          { label: 'From', render: function (m) { return '<b>' + esc(m.name) + '</b><br><span class="text-xs text-ink-500">' + esc(m.email) + (m.phone ? ' · ' + esc(m.phone) : '') + '</span>'; } },
          { label: 'Message', render: function (m) { return '<span class="tag tag-sky">' + esc(m.topic) + '</span>' + (m.order_ref ? ' <span class="font-mono text-xs">' + esc(m.order_ref) + '</span>' : '') + '<p class="mt-1 max-w-lg text-[13px] text-ink-600">' + esc(m.message.length > 120 ? m.message.slice(0, 120) + '…' : m.message) + '</p>'; } },
          { label: 'Status', render: function (m) { return AD.tag(m.status) + (m.handled_by_name ? '<br><span class="text-xs text-ink-500">' + esc(m.handled_by_name) + '</span>' : ''); } }
        ],
        actions: function () { return AD.btn('open', 'Open', 'message-circle'); },
        empty: 'No messages', emptyIcon: 'messages-square',
        onAction: function (act, m, b, reload) { openMessage(m, function () { reload(); AD.poll(); }); }
      });
      if (r.query.open) AD.api.get('/messages/' + r.query.open + '/').then(function (m) { openMessage(m, lst.reload); });
    }
  });
  function openMessage(m, reload) {
    var write = AD.can('messages', 'write');
    var notes = (m.admin_note || '').split('\n').filter(Boolean);
    var md = U.modal({
      title: m.topic + ' · ' + m.ticket, icon: 'message-circle', wide: true, sub: esc(m.name) + ' · <a class="link" href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' + (m.phone ? ' · ' + esc(m.phone) : '') + ' · ' + AD.dt(m.created_at),
      body: '<div class="whitespace-pre-line rounded-2xl bg-cloud p-4 text-[15px] text-ink-800">' + esc(m.message) + '</div>' +
        (m.order_ref ? '<p class="mt-3 text-sm">Order: <a class="link" href="#/orders?search=' + encodeURIComponent(m.order_ref) + '">' + esc(m.order_ref) + '</a></p>' : '') +
        (m.user ? '<p class="mt-1 text-sm">Account: <a class="link" href="#/users/' + m.user + '">open learner profile</a></p>' : '') +
        (notes.length ? '<p class="mb-2 mt-5 text-sm font-semibold text-ink-700">Team notes and replies</p><ul class="space-y-2 text-sm">' + notes.map(function (n) { return '<li class="rounded-xl border border-line px-3 py-2 text-ink-700">' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
        (write ? '<form class="mt-5" novalidate data-rf><label class="label" for="rp">Reply by email</label><textarea class="input min-h-[120px]" id="rp" name="text" placeholder="Hi ' + esc(m.name.split(' ')[0]) + ', …"></textarea>' +
          '<label class="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" class="check !mt-0" id="rs" checked>Mark as resolved after sending</label></form>' : ''),
      actions: write ? [{ label: m.status === 'resolved' ? 'Reopen' : 'Mark resolved', cls: 'btn-ghost sm:mr-auto', onClick: function (close) { AD.run(AD.api.patch('/messages/' + m.id + '/', { status: m.status === 'resolved' ? 'open' : 'resolved' }), 'Status updated', function () { close(); reload(); }); } },
        { label: 'Close', cls: 'btn-ghost', close: true }, { label: 'Send reply', icon: 'send', onClick: function (close, b) {
          var f = md.body.querySelector('[data-rf]'), text = md.body.querySelector('#rp').value.trim();
          if (text.length < 2) return U.fieldError(f, 'text', 'Write a reply.');
          U.busy(b, true, 'Sending');
          AD.api.post('/messages/' + m.id + '/reply/', { text: text, resolve: md.body.querySelector('#rs').checked }).then(function () { close(); U.toast('Reply sent to ' + m.email); reload(); }, function (err) { U.busy(b, false); AD.showErrors(f, err); });
        } }] : [{ label: 'Close', cls: 'btn-ghost', close: true }]
    });
    if (write && m.status === 'new') AD.api.patch('/messages/' + m.id + '/', { status: 'open' }).then(function () { /* claimed */ }, function () { /* ignore */ });
  }

  /* ================================================================== broadcast */
  AD.page('broadcast', {
    section: 'notifications',
    render: function (view) {
      return AD.options().then(function (o) {
        var fields = [{ name: 'audience', label: 'Send to', type: 'select', span: 2, options: [{ value: 'all', label: 'All learners' }, { value: 'buyers', label: 'Learners who bought something' }, { value: 'free', label: 'Free accounts (never bought)' }]
            .concat(o.packages.map(function (p) { return { value: 'package:' + p.slug, label: p.name + ' package holders' }; }))
            .concat(o.courses.map(function (c) { return { value: 'course:' + c.slug, label: 'Learners with access to ' + c.title }; })) },
          { name: 'text', label: 'Message', type: 'textarea', span: 2, rows: 3, maxlength: 300, required: true, help: 'Up to 300 characters. Appears in the bell menu on the website.' },
          { name: 'link', label: 'Link', optional: true, span: 2, placeholder: 'e.g. course.html?c=ai-tools or packages.html' }];
        view.innerHTML = AD.header('Broadcast', 'Send an in-site notification to a group of learners.') +
          '<div class="grid gap-6 lg:grid-cols-[1fr_340px]"><form id="bf" novalidate class="card p-5 sm:p-8">' + AD.formHTML(fields, { audience: 'all' }) + '<div class="mt-6 flex justify-end"><button class="btn btn-primary">' + icon('megaphone', 'i-sm') + 'Send notification</button></div></form>' +
          '<aside class="card p-5"><h2 class="text-lg">Good to know</h2><ul class="mt-3 space-y-3 text-sm text-ink-600"><li class="flex gap-2">' + icon('info', 'mt-0.5 i-sm flex-none text-sky-600') + 'Notifications cannot be recalled. Check the text before sending.</li><li class="flex gap-2">' + icon('bell', 'mt-0.5 i-sm flex-none text-sky-600') + 'Learners see a dot on the bell icon until they open it.</li><li class="flex gap-2">' + icon('activity', 'mt-0.5 i-sm flex-none text-sky-600') + 'Each broadcast is saved in the activity log.</li></ul></aside></div>';
        var f = U.$('#bf');
        f.addEventListener('submit', function (e) {
          e.preventDefault(); U.fieldError(f, null);
          var d = AD.readForm(f, fields);
          if (d.text.length < 3) return U.fieldError(f, 'text', 'Write the message.');
          var sel = f.querySelector('[name="audience"]');
          AD.confirm({ title: 'Send this notification?', text: 'To: <b>' + esc(sel.options[sel.selectedIndex].text) + '</b><br><br>"' + esc(d.text) + '"', ok: 'Send now', icon: 'megaphone' }).then(function (ok) {
            if (!ok) return;
            var b = f.querySelector('button.btn-primary'); U.busy(b, true, 'Sending');
            AD.api.post('/notifications/broadcast/', d).then(function (r) { U.busy(b, false); U.toast('Sent to ' + U.num(r.sent) + ' learners'); f.reset(); }, function (err) { U.busy(b, false); AD.showErrors(f, err); });
          });
        });
      });
    }
  });

  /* ================================================================== settings */
  var SETTINGS = [
    { section: 'Brand and contact' },
    { name: 'brand_name', label: 'Brand name' }, { name: 'tagline', label: 'Tagline' },
    { name: 'founder_name', label: 'Founder name' }, { name: 'support_email', label: 'Support email', type: 'email' },
    { name: 'support_phone', label: 'Support phone' }, { name: 'support_whatsapp', label: 'WhatsApp number', help: 'Digits only with country code, e.g. 919876543210.' },
    { name: 'support_hours', label: 'Support hours' }, { name: 'address', label: 'Address' },
    { name: 'instagram_url', label: 'Instagram link', type: 'url', optional: true }, { name: 'youtube_url', label: 'YouTube link', type: 'url', optional: true },
    { name: 'linkedin_url', label: 'LinkedIn link', type: 'url', optional: true },
    { section: 'Website' },
    { name: 'announcement', label: 'Announcement bar', span: 2, optional: true, maxlength: 200, help: 'A short message at the top of every page. Leave empty to hide it.' },
    { name: 'maintenance_mode', label: 'Maintenance mode', type: 'checkbox', span: 2, help: 'Shows a "we are improving the site" page to everyone except the team.' },
    { section: 'Referral cashback (one level only)' },
    { name: 'referral_enabled', label: 'Referral codes on', type: 'checkbox' }, { name: 'referral_learn_first', label: 'Learn first', type: 'checkbox', help: 'Cashback can be withdrawn only after the referrer completes one course.' },
    { name: 'referral_friend_discount', label: 'Friend\'s discount', type: 'number', prefix: '₹', min: 0, help: 'Off the friend\'s first purchase.' },
    { name: 'referral_default_cashback', label: 'Cashback for single-course owners', type: 'number', min: 0, max: 60, help: '% used when the referrer has no package. Package rates are set on each package.' },
    { name: 'referral_hold_days', label: 'Hold period (days)', type: 'number', min: 0, help: 'Cashback waits this long (the refund window) before it can be withdrawn.' },
    { name: 'min_withdrawal', label: 'Minimum withdrawal', type: 'number', prefix: '₹', min: 1 },
    { name: 'payout_hours', label: 'We pay within (hours)', type: 'number', min: 1, help: 'Shown to the learner and in the email to you.' },
    { name: 'withdraw_play_cap', label: 'Play money allowed in one withdrawal', type: 'number', prefix: '₹', min: 0, span: 2, help: 'Keep this below the minimum withdrawal. The rest must be earned from courses or referrals, so games alone cannot be cashed out. 0 = no limit.' },
    { name: 'referral_daily_bonus', label: 'Daily referral bonus', type: 'number', prefix: '₹', min: 0, help: 'Paid for the first friend who buys on a day, on any package. 0 = off.' },
    { name: 'referral_daily_bonus_cap', label: 'Daily bonuses per day', type: 'number', min: 1 },
    { name: 'referral_monthly_bonus', label: 'Monthly milestones', type: 'json', span: 2, rows: 4, help: 'Example: [{"friends": 5, "bonus": 250}, {"friends": 10, "bonus": 750}]. Only the highest one reached is paid.' },
    { name: 'upgrade_discount_percent', label: 'Upgrade discount', type: 'number', min: 0, max: 90, span: 2, help: '% off the price difference when a learner moves to a bigger package.' },
    { section: 'Course completion reward' },
    { name: 'course_cashback_enabled', label: 'Pay for finished courses', type: 'checkbox' },
    { name: 'course_cashback', label: 'Default reward per finished course', type: 'number', prefix: '₹', min: 0, help: 'Used for single-course buyers, and for any package whose own amount is 0. Set the per-package amounts on the Packages page.' },
    { section: 'Tax' },
    { name: 'gst_percent', label: 'GST already inside every price', type: 'number', step: '0.01', min: 0, max: 50, help: 'Prices are inclusive, so nothing is added at checkout. This only splits the amount on receipts.' },
    { name: 'gst_number', label: 'Your GSTIN (shown on receipts)', type: 'text' },
    { section: 'Welcome poster' },
    { name: 'poster_enabled', label: 'Show the poster when the site opens', type: 'checkbox' },
    { name: 'poster_auto_close_seconds', label: 'Closes by itself after (seconds)', type: 'number', min: 0, max: 60, help: '0 = stays until the visitor closes it.' },
    { name: 'poster_title', label: 'Poster heading', type: 'text', span: 2 },
    { name: 'poster_text', label: 'Poster text', type: 'textarea', span: 2, rows: 2 },
    { name: 'poster_button', label: 'Button text', type: 'text' },
    { name: 'poster_link', label: 'Button goes to', type: 'text', help: 'A page on the site, e.g. packages.html' },
    { name: 'poster_image', label: 'Poster picture (optional)', type: 'file', span: 2, accept: 'image/*' },
    { section: 'Job connect' },
    { name: 'jobs_enabled', label: 'Show "Job connect" in the menu', type: 'checkbox' },
    { name: 'jobs_live', label: 'Openings are live', type: 'checkbox', help: 'Off = the page says it is coming soon and collects a waiting list.' },
    { name: 'jobs_text', label: 'What the page says', type: 'textarea', span: 2, rows: 2 },
    { section: 'Founder (About page)' },
    { name: 'founder_name', label: 'Founder name', type: 'text' },
    { name: 'founder_title', label: 'Title under the name', type: 'text', help: 'Example: Founder · B.Tech student' },
    { name: 'founder_bio', label: 'Short bio', type: 'textarea', span: 2, rows: 3 },
    { name: 'founder_photo', label: 'Founder photo', type: 'file', span: 2, accept: 'image/*' },
    { section: 'Play & earn' },
    { name: 'play_enabled', label: 'Play & earn on', type: 'checkbox', span: 2 },
    { name: 'play_total_cap', label: 'Total limit per learner (once, not daily)', type: 'number', prefix: '₹', min: 0, help: 'Most one account can ever earn from Play & earn. 0 = no limit.' }, { name: 'play_ip_daily_cap', label: 'Daily limit per network (IP)', type: 'number', prefix: '₹', min: 0, help: 'Stops one person farming rewards with many accounts.' },
    { name: 'play_per_correct', label: 'Reward per correct quiz answer', type: 'number', prefix: '₹', min: 0 }, { name: 'play_per_quiz_cap', label: 'Max reward per quiz', type: 'number', prefix: '₹', min: 0 },
    { name: 'play_game_win', label: 'Reward for winning a mini game', type: 'number', prefix: '₹', min: 0, span: 2, help: 'A partly finished game pays less. The total limit above still applies.' },
    { name: 'play_checkout_max', label: 'Max play rewards usable on one package order', type: 'number', prefix: '₹', min: 0, span: 2 },
    { section: 'Lessons and quizzes' },
    { name: 'quiz_questions_per_lesson', label: 'Questions after each lesson', type: 'number', min: 1, max: 10 }, { name: 'quiz_pass_correct', label: 'Correct answers needed to pass', type: 'number', min: 1, max: 10 },
    { name: 'free_preview_lessons', label: 'Free preview lessons per course', type: 'number', min: 0, help: 'A guide for new courses. Mark each free lesson in the course editor.' }
  ];
  AD.page('settings', {
    section: 'settings',
    render: function (view) {
      return AD.api.get('/settings/').then(function (s) {
        var write = AD.can('settings', 'write');
        view.innerHTML = AD.header('Site settings', 'Changes apply to the website within a minute.' + (s.updated_at ? ' Last saved ' + U.ago(s.updated_at) + '.' : '')) +
          '<form id="sf" novalidate class="card p-5 sm:p-8">' + AD.formHTML(SETTINGS, s) + (write ? '<div class="sticky bottom-0 -mx-5 -mb-5 mt-8 flex items-center justify-end gap-3 border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8"><span class="mr-auto text-sm text-ink-500" id="dirty"></span><button class="btn btn-primary">' + icon('save', 'i-sm') + 'Save settings</button></div>' : '<p class="mt-6 text-sm text-ink-500">Only the owner can change settings.</p>') + '</form>';
        var f = U.$('#sf');
        if (!write) U.$$('input,select,textarea', f).forEach(function (i) { i.disabled = true; });
        f.addEventListener('input', function () { var d = U.$('#dirty'); if (d) d.textContent = 'Unsaved changes'; });
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var d = AD.readForm(f, SETTINGS), b = f.querySelector('button.btn-primary');
          if (d.maintenance_mode && !s.maintenance_mode && !window.confirm('Turn on maintenance mode? Learners will not be able to use the site.')) return;
          U.busy(b, true, 'Saving');
          AD.api.patch('/settings/', d).then(function () { U.toast('Settings saved'); AD.refresh(); }, function (err) { U.busy(b, false); AD.showErrors(f, err); });
        });
      });
    }
  });

  /* ================================================================== exports */
  AD.page('exports', {
    section: 'exports',
    render: function (view) {
      var items = [['users', 'users', 'Learners', 'Name, email, phone, city, package, joined date, orders, total spent, referral code.'],
        ['orders', 'shopping-bag', 'Orders', 'Every order except cancelled ones, with discounts, play rewards used and payment IDs. Use it for accounts and GST.'],
        ['withdrawals', 'banknote', 'Withdrawals', 'All payout requests with PAN, UPI, amount, status and UTR. Use it for TDS records.'],
        ['referrals', 'gift', 'Referrals', 'Who referred whom, order, amount paid, cashback and status.']];
      view.innerHTML = AD.header('Exports', 'Download data as CSV files. They open in Excel and Google Sheets.') +
        '<div class="grid gap-4 md:grid-cols-2">' + items.map(function (x) {
          return '<div class="card flex items-start gap-4 p-5"><span class="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-sky-50 text-sky-700">' + icon(x[1]) + '</span><div class="min-w-0 flex-1"><p class="font-semibold">' + x[2] + '</p><p class="mt-1 text-sm text-ink-600">' + x[3] + '</p><button class="btn btn-ghost btn-sm mt-4" data-x="' + x[0] + '">' + icon('download', 'i-sm') + 'Download CSV</button></div></div>';
        }).join('') + '</div>';
      U.$$('[data-x]', view).forEach(function (b) {
        b.addEventListener('click', function () { U.busy(b, true, 'Preparing'); AD.api.download('/export/' + b.dataset.x + '/', 'skilltosuccess-' + b.dataset.x + '-' + new Date().toISOString().slice(0, 10) + '.csv').then(function () { U.busy(b, false); U.toast('Download started'); }, function (e) { U.busy(b, false); U.toast(e.message, null, true); }); });
      });
    }
  });
})();
