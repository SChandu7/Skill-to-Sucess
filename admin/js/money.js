/* Money: orders (list, detail, refund, mark paid, offline payment), withdrawals, referrals, wallet ledger */
(function () {
  'use strict';
  var AD = STS.admin, U = STS.ui, esc = U.esc, icon = U.icon;

  function exportBtn(kind) { return AD.can('exports') ? '<button class="btn btn-ghost" data-export="' + kind + '">' + icon('download', 'i-sm') + 'Export CSV</button>' : ''; }
  function wireExport(view) {
    U.$$('[data-export]', view).forEach(function (b) {
      b.addEventListener('click', function () { U.busy(b, true, 'Preparing'); AD.api.download('/export/' + b.dataset.export + '/', 'skilltosuccess-' + b.dataset.export + '.csv').then(function () { U.busy(b, false); }, function (e) { U.busy(b, false); U.toast(e.message, null, true); }); });
    });
  }
  function who(u) { return '<a class="font-semibold text-ink-900 hover:text-sky-700" href="#/users/' + u.id + '">' + esc(u.name) + '</a><br><span class="text-xs text-ink-500">' + esc(u.email) + '</span>'; }

  /* ================================================================== orders */
  AD.page('orders', {
    section: 'orders',
    render: function (view, r) {
      if (r.id) return orderDetail(view, r.id);
      var write = AD.can('orders', 'write');
      view.innerHTML = AD.header('Orders', 'Every checkout, paid or not. Paid orders unlock access straight away.', exportBtn('orders') + (write ? '<button class="btn btn-primary" id="manual">' + icon('plus', 'i-sm') + 'Record offline payment</button>' : '')) + '<div id="lst"></div>';
      wireExport(view);
      var params = Object.assign({ hide_cancelled: '1' }, r.query);
      AD.list(U.$('#lst'), {
        endpoint: '/orders/', params: params,
        filters: [{ type: 'search', name: 'search', label: 'Order no., learner, payment ID' },
          { name: 'status', label: 'Any status', options: [{ value: 'paid', label: 'Paid' }, { value: 'created', label: 'Awaiting payment' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }, { value: 'cancelled', label: 'Cancelled' }] },
          { name: 'kind', label: 'Any type', options: [{ value: 'package', label: 'Package' }, { value: 'upgrade', label: 'Upgrade' }, { value: 'course', label: 'Single course' }] },
          { type: 'date', name: 'date_from', label: 'From' }, { type: 'date', name: 'date_to', label: 'To' }, { type: 'toggle', name: 'hide_cancelled', label: 'Hide cancelled' }],
        columns: [
          { label: 'Order', render: function (o) { return '<span class="font-semibold">' + esc(o.number) + '</span><br><span class="text-xs text-ink-500">' + AD.dt(o.created_at) + '</span>'; } },
          { label: 'Learner', render: function (o) { return who(o.user); } },
          { label: 'Item', render: function (o) { return esc(o.title) + (o.referral_code ? '<br><span class="text-xs text-orange-600">' + icon('gift', 'i-sm') + ' ' + esc(o.referrer_name || o.referral_code) + '</span>' : ''); } },
          { label: 'Amount', right: true, render: function (o) { return '<b>' + U.inr(o.amount) + '</b>' + (o.discount || o.play_used ? '<br><span class="text-xs text-ink-500">−' + U.inr(o.discount + o.play_used) + ' off</span>' : ''); } },
          { label: 'Status', render: function (o) { return AD.tag(o.status) + (o.method ? '<br><span class="text-xs text-ink-500">' + esc(o.method) + '</span>' : ''); } }
        ],
        summary: function (d) { return d.count !== undefined ? '<p class="border-b border-line px-4 py-2.5 text-xs text-ink-500">' + U.num(d.count) + ' orders</p>' : ''; },
        href: function (o) { return '#/orders/' + o.id; }, empty: 'No orders match these filters', emptyIcon: 'shopping-bag'
      });
      var mb = U.$('#manual'); if (mb) mb.addEventListener('click', manualOrder);
    }
  });

  function orderDetail(view, id) {
    return AD.api.get('/orders/' + id + '/').then(function (o) {
      var write = AD.can('orders', 'write');
      var acts = '';
      if (write && o.status === 'paid') acts += '<button class="btn btn-ghost !text-bad-600" data-o="refund">' + icon('undo-2', 'i-sm') + 'Refund</button>';
      if (write && ['created', 'failed', 'cancelled'].indexOf(o.status) >= 0) acts += '<button class="btn btn-primary" data-o="paid">' + icon('check', 'i-sm') + 'Mark as paid</button>';
      view.innerHTML = AD.header('Order ' + esc(o.number), AD.tag(o.status) + ' Created ' + AD.dt(o.created_at), acts, ['#/orders', 'All orders']) +
        '<div class="grid gap-6 xl:grid-cols-[1fr_380px]"><div class="space-y-6">' +
        '<section class="card p-5 sm:p-6"><h2 class="mb-2 text-lg">' + esc(o.title) + '</h2>' + AD.kv([
          ['Type', esc({ package: 'Package', upgrade: 'Upgrade', course: 'Single course' }[o.kind])], ['Price', U.inr(o.price)], o.discount ? ['Referral discount', '−' + U.inr(o.discount)] : null, o.play_used ? ['Play rewards used', '−' + U.inr(o.play_used)] : null,
          ['Amount charged', '<b class="text-lg">' + U.inr(o.amount) + '</b>'], ['Paid at', AD.dt(o.paid_at)], ['Method', esc(o.method)], ['Gateway', esc(o.provider)], ['Gateway order ID', '<span class="font-mono text-xs">' + esc(o.provider_order_id) + '</span>'],
          ['Payment ID', '<span class="font-mono text-xs select-all">' + esc(o.provider_payment_id) + '</span>'], o.failure_reason ? ['Failure', '<span class="text-bad-600">' + esc(o.failure_reason) + '</span>'] : null, ['Referral code', esc(o.referral_code)],
          ['IP address', esc(o.ip || '')], o.admin_note ? ['Admin note', esc(o.admin_note)] : null]) + '</section>' +
        (o.status === 'refunded' ? '<section class="card border-bad-500/30 p-5"><h2 class="mb-2 text-lg text-bad-600">Refund</h2>' + AD.kv([['Refunded', U.inr(o.refund_amount)], ['When', AD.dt(o.refunded_at)], ['Reason', esc(o.refund_reason)], ['Reference', esc(o.refund_reference)]]) + '</section>' : '') +
        '<section class="card p-5 sm:p-6"><h2 class="mb-3 text-lg">Gateway events</h2>' + (o.events.length ? '<ul class="space-y-2">' + o.events.map(function (e) {
          return '<li class="rounded-xl border border-line"><details><summary class="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm"><span class="font-mono font-semibold">' + esc(e.event) + '</span><span class="text-ink-500">' + esc(e.provider) + '</span><span class="ml-auto text-xs text-ink-500">' + AD.dt(e.created_at) + '</span></summary><pre class="max-h-72 overflow-auto border-t border-line bg-cloud p-4 text-xs">' + esc(JSON.stringify(e.payload, null, 2)) + '</pre></details></li>';
        }).join('') + '</ul>' : '<p class="text-sm text-ink-500">No webhook events for this order.</p>') + '</section></div>' +
        '<aside class="space-y-6"><section class="card p-5"><h2 class="mb-3 text-lg">Learner</h2><div class="flex items-center gap-3">' + U.avatar(o.user.name, 44) + '<div class="min-w-0">' + who(o.user) + (o.user.phone ? '<br><span class="text-xs text-ink-500">' + esc(o.user.phone) + '</span>' : '') + '</div></div></section>' +
        (o.referral ? '<section class="card p-5"><h2 class="mb-2 text-lg">Referral</h2>' + AD.kv([['Referrer', '<a class="link" href="#/users/' + o.referral.referrer.id + '">' + esc(o.referral.referrer.name) + '</a>'], ['Cashback', U.inr(o.referral.cashback_amount) + ' (' + o.referral.cashback_percent + '%)'], ['Status', AD.tag(o.referral.status)], o.referral.flag_reason ? ['Flag', esc(o.referral.flag_reason)] : null]) + '</section>' : '') +
        '<section class="card px-4 pt-4"><h2 class="px-1 text-lg">History</h2>' + (o.activity.length ? '<ul class="divide-y divide-line">' + o.activity.map(function (a) { return AD.activityRow(a); }).join('') + '</ul>' : '<p class="px-1 py-4 text-sm text-ink-500">No history.</p>') + '</section></aside></div>';

      view.addEventListener('click', function (e) {
        var b = e.target.closest('[data-o]'); if (!b) return;
        if (b.dataset.o === 'refund') {
          AD.confirm({
            title: 'Refund ' + U.inr(o.amount) + '?', danger: true, ok: 'Refund order',
            text: 'Access from this order is removed, its certificates are withdrawn, referral cashback is reversed and play rewards used are returned.',
            input: { label: 'Reason', required: 'Add a reason.', placeholder: 'e.g. Charged twice' },
            extra: o.provider === 'razorpay' ? '<label class="mt-4 flex items-start gap-2.5 text-sm"><input type="checkbox" class="check" id="via" checked><span>Send the money back through Razorpay now. Untick if you already refunded it from the Razorpay dashboard.</span></label>' : '<p class="mt-3 text-xs text-ink-500">This order was not paid through Razorpay. Return the money manually.</p>'
          }).then(function (reason) {
            if (!reason) return;
            var via = document.getElementById('via');
            AD.run(AD.api.post('/orders/' + o.id + '/refund/', { reason: reason, via_gateway: via ? via.checked : false }), 'Order refunded', AD.refresh);
          });
        }
        if (b.dataset.o === 'paid') {
          AD.editor({ title: 'Mark as paid', icon: 'check', wide: false, cols: 1, sub: 'Use this only when you have confirmed the money arrived (for example in the Razorpay dashboard or your bank). Access is unlocked and cashback is created.',
            fields: [{ name: 'reference', label: 'Payment reference', required: true, placeholder: 'UTR, Razorpay payment ID or receipt no.' }, { name: 'method', label: 'Method', type: 'select', options: ['UPI', 'Card', 'Netbanking', 'Bank transfer', 'Cash', 'Manual'] }],
            ok: 'Mark as paid', saved: 'Order marked as paid', save: function (d) { return AD.api.post('/orders/' + o.id + '/mark-paid/', d); }, done: AD.refresh });
        }
      });
    });
  }

  function manualOrder() {
    AD.options().then(function (o) {
      var picked = null;
      var m = U.modal({ title: 'Record offline payment', icon: 'banknote', wide: true, sub: 'For cash or bank transfers. Creates a paid order, unlocks access and handles referral cashback.',
        body: '<form novalidate id="mo" class="grid gap-4 sm:grid-cols-2"><div class="relative sm:col-span-2"><label class="label" for="mo-q">Learner</label><input class="input" id="mo-q" name="user" placeholder="Search by name, email or mobile" autocomplete="off"><div id="mo-res" class="absolute left-0 right-0 z-10 mt-1 hidden rounded-2xl border border-line bg-white p-1 shadow-pop"></div></div>' +
          '<div><label class="label" for="mo-kind">What they bought</label><select class="input" id="mo-kind" name="kind"><option value="package">Package</option><option value="course">Single course</option></select></div>' +
          '<div><label class="label" for="mo-slug">Item</label><select class="input" id="mo-slug" name="slug"></select></div>' +
          '<div><label class="label" for="mo-amt">Amount received</label><div class="flex" data-field><span class="grid place-items-center rounded-l-xl border border-r-0 border-line bg-cloud px-3 text-sm text-ink-600">₹</span><input class="input !rounded-l-none tabular" id="mo-amt" name="amount" type="number" min="0"></div><p class="mt-1 text-xs text-ink-500">Leave empty to use the normal price.</p></div>' +
          '<div><label class="label" for="mo-method">Method</label><select class="input" id="mo-method" name="method"><option>Bank transfer</option><option>UPI</option><option>Cash</option><option>Cheque</option></select></div>' +
          '<div><label class="label" for="mo-ref">Payment reference</label><input class="input" id="mo-ref" name="reference" placeholder="UTR or receipt no."></div>' +
          '<div><label class="label" for="mo-code">Referral code <span class="font-normal text-ink-400">(optional)</span></label><input class="input uppercase" id="mo-code" name="ref_code"></div></form>',
        actions: [{ label: 'Cancel', cls: 'btn-ghost', close: true }, { label: 'Record payment', icon: 'save', onClick: function (close, b) { submit(close, b); } }] });
      var f = m.body.querySelector('#mo'), q = f.querySelector('#mo-q'), res = f.querySelector('#mo-res'), kind = f.querySelector('#mo-kind'), slug = f.querySelector('#mo-slug'), t;
      function items() { slug.innerHTML = (kind.value === 'package' ? o.packages.map(function (p) { return '<option value="' + p.slug + '">' + esc(p.name) + ' · ' + U.inr(p.price) + '</option>'; }) : o.courses.map(function (c) { return '<option value="' + c.slug + '">' + esc(c.title) + ' · ' + U.inr(c.price) + '</option>'; })).join(''); }
      kind.addEventListener('change', items); items();
      q.addEventListener('input', function () {
        picked = null; clearTimeout(t);
        if (q.value.trim().length < 2) { res.classList.add('hidden'); return; }
        t = setTimeout(function () {
          AD.api.get('/users/', { search: q.value.trim(), page_size: 6 }).then(function (d) {
            res.innerHTML = d.results.length ? d.results.map(function (u) { return '<button type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-sky-50" data-u="' + u.id + '" data-n="' + esc(u.name) + ' (' + esc(u.email) + ')">' + U.avatar(u.name, 28) + '<span class="min-w-0"><span class="block truncate text-sm font-semibold">' + esc(u.name) + '</span><span class="block truncate text-xs text-ink-500">' + esc(u.email) + ' · ' + esc(u.package || 'Free') + '</span></span></button>'; }).join('') : '<p class="px-3 py-2 text-sm text-ink-500">No learner found. Ask them to sign up first.</p>';
            res.classList.remove('hidden');
          });
        }, 220);
      });
      res.addEventListener('click', function (e) { var b = e.target.closest('[data-u]'); if (!b) return; picked = Number(b.dataset.u); q.value = b.dataset.n; res.classList.add('hidden'); });
      function submit(close, b) {
        U.fieldError(f, null);
        if (!picked) return U.fieldError(f, 'user', 'Search and pick the learner from the list.');
        var ref = f.querySelector('#mo-ref').value.trim(); if (!ref) return U.fieldError(f, 'reference', 'Enter the payment reference.');
        var amt = f.querySelector('#mo-amt').value;
        U.busy(b, true, 'Saving');
        AD.api.post('/orders/manual/', { user: picked, kind: kind.value, slug: slug.value, amount: amt ? Number(amt) : '', method: f.querySelector('#mo-method').value, reference: ref, ref_code: f.querySelector('#mo-code').value.trim() })
          .then(function (ord) { close(); U.toast('Payment recorded. Access unlocked.'); location.hash = '#/orders/' + ord.id; }, function (err) { U.busy(b, false); AD.showErrors(f, err); });
      }
    });
  }

  /* ================================================================== withdrawals */
  AD.page('withdrawals', {
    section: 'wallet',
    render: function (view, r) {
      var write = AD.can('wallet', 'write'), c = AD.counters();
      view.innerHTML = AD.header('Withdrawals', 'Send the money by UPI first, then mark it paid with the UTR number. Learners are notified.', exportBtn('withdrawals')) +
        (c.pending_withdrawals ? '<div class="mb-5 flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-ink-800">' + icon('banknote', 'text-orange-600') + '<span><b>' + c.pending_withdrawals + ' requests</b> waiting, ' + U.inr(c.pending_withdrawal_amount) + ' in total.</span></div>' : '') + '<div id="lst"></div>';
      wireExport(view);
      AD.list(U.$('#lst'), {
        endpoint: '/withdrawals/', params: Object.assign({ status: 'processing' }, r.query),
        filters: [{ type: 'search', name: 'search', label: 'Learner, UPI or UTR' }, { name: 'status', label: 'All statuses', options: [{ value: 'processing', label: 'Waiting to pay' }, { value: 'paid', label: 'Paid' }, { value: 'rejected', label: 'Rejected' }] }],
        columns: [
          { label: 'Requested', cls: 'whitespace-nowrap', render: function (t) { return AD.dt(t.created_at) + '<br><span class="text-xs text-ink-500">' + U.ago(t.created_at) + '</span>'; } },
          { label: 'Learner', render: function (t) { return who(t.user) + (t.user.pan ? '<br><span class="text-xs text-ink-500">PAN ' + esc(t.user.pan) + '</span>' : ''); } },
          { label: 'Pay to UPI', render: function (t) { return '<span class="select-all font-mono text-[13px]">' + esc(t.upi_id) + '</span>'; } },
          { label: 'Amount', right: true, render: function (t) { return '<b class="text-base">' + U.inr(Math.abs(t.amount)) + '</b>'; } },
          { label: 'Status', render: function (t) { return AD.tag(t.status, t.status === 'processing' ? 'Waiting' : null) + (t.utr ? '<br><span class="text-xs text-ink-500">UTR ' + esc(t.utr) + '</span>' : '') + (t.admin_note ? '<br><span class="text-xs text-ink-500">' + esc(t.admin_note) + '</span>' : '') + (t.processed_by_name ? '<br><span class="text-xs text-ink-400">by ' + esc(t.processed_by_name) + '</span>' : ''); } }
        ],
        actions: write ? function (t) { return t.status === 'processing' ? AD.btn('copy', '', 'copy') + AD.btn('pay', 'Mark paid', 'check', 'btn-primary') + AD.btn('reject', 'Reject', null, 'btn-ghost !text-bad-600') : ''; } : null,
        empty: 'No withdrawal requests here', emptyIcon: 'banknote',
        onAction: function (act, t, b, reload) {
          var done = function () { reload(); AD.poll(); };
          if (act === 'copy') U.copy(t.upi_id, 'UPI ID');
          if (act === 'pay') AD.confirm({ title: 'Mark ' + U.inr(Math.abs(t.amount)) + ' as paid?', text: 'Send the money to <b class="font-mono">' + esc(t.upi_id) + '</b> first. Then enter the bank UTR / reference.', ok: 'Mark paid', icon: 'banknote', input: { label: 'UTR / reference number', required: 'Enter the UTR so the learner can check it.' } })
            .then(function (utr) { if (utr) AD.run(AD.api.post('/withdrawals/' + t.id + '/pay/', { utr: utr }), 'Marked as paid', done); });
          if (act === 'reject') AD.confirm({ title: 'Reject this withdrawal?', text: 'The amount goes back to the learner\'s wallet.', danger: true, ok: 'Reject', input: { label: 'Reason (shown to the learner)', required: 'Add a reason.', placeholder: 'e.g. UPI ID is not valid' } })
            .then(function (reason) { if (reason) AD.run(AD.api.post('/withdrawals/' + t.id + '/reject/', { reason: reason }), 'Withdrawal rejected', done); });
        }
      });
    }
  });

  /* ================================================================== referrals */
  AD.page('referrals', {
    section: 'wallet',
    render: function (view, r) {
      var write = AD.can('wallet', 'write');
      view.innerHTML = AD.header('Referrals', 'One level only: a learner earns cashback when a friend buys with their code. Flagged referrals wait for your review.', exportBtn('referrals')) + '<div id="lst"></div>';
      wireExport(view);
      AD.list(U.$('#lst'), {
        endpoint: '/referrals/', params: r.query,
        filters: [{ type: 'search', name: 'search', label: 'Names, emails, code or order' }, { name: 'status', label: 'All statuses', options: [{ value: 'review', label: 'Under review' }, { value: 'active', label: 'Active' }, { value: 'reversed', label: 'Reversed' }] }],
        columns: [
          { label: 'Date', cls: 'whitespace-nowrap', render: function (x) { return AD.day(x.created_at); } },
          { label: 'Referrer', render: function (x) { return who(x.referrer) + '<br><span class="font-mono text-xs text-sky-700">' + esc(x.referrer.code || '') + '</span>'; } },
          { label: 'Friend', render: function (x) { return who(x.referred); } },
          { label: 'Order', render: function (x) { return esc(x.order_number) + '<br><span class="text-xs text-ink-500">' + U.inr(x.amount_paid) + ' · ' + esc(x.order_status) + '</span>'; } },
          { label: 'Cashback', right: true, render: function (x) { return '<b>' + U.inr(x.cashback_amount) + '</b><br><span class="text-xs text-ink-500">' + x.cashback_percent + '%</span>'; } },
          { label: 'Status', render: function (x) { return AD.tag(x.status) + (x.flag_reason ? '<br><span class="text-xs text-ink-500">' + esc(x.flag_reason) + '</span>' : ''); } }
        ],
        actions: write ? function (x) { return (x.status === 'review' ? AD.btn('approve', 'Approve', 'check', 'btn-primary') : '') + (x.status !== 'reversed' ? AD.btn('reverse', 'Reverse', null, 'btn-ghost !text-bad-600') : ''); } : null,
        empty: 'No referrals here', emptyIcon: 'gift',
        onAction: function (act, x, b, reload) {
          var done = function () { reload(); AD.poll(); };
          if (act === 'approve') AD.confirm({ title: 'Approve this referral?', text: U.inr(x.cashback_amount) + ' cashback for ' + esc(x.referrer.name) + ' is released (after the normal hold period).', ok: 'Approve', icon: 'check' })
            .then(function (ok) { if (ok) AD.run(AD.api.post('/referrals/' + x.id + '/approve/', {}), 'Referral approved', done); });
          if (act === 'reverse') AD.confirm({ title: 'Reverse this cashback?', text: 'The ' + U.inr(x.cashback_amount) + ' cashback is cancelled. The friend keeps their purchase.', danger: true, ok: 'Reverse', input: { label: 'Reason (shown to the referrer)', required: 'Add a reason.', placeholder: 'e.g. Self-referral with a second account' } })
            .then(function (reason) { if (reason) AD.run(AD.api.post('/referrals/' + x.id + '/reverse/', { reason: reason }), 'Cashback reversed', done); });
        }
      });
    }
  });

  /* ================================================================== ledger */
  AD.page('ledger', {
    section: 'wallet',
    render: function (view, r) {
      view.innerHTML = AD.header('Wallet ledger', 'Every credit and debit in every learner wallet. Balances are always calculated from this list.') + '<div id="lst"></div>';
      AD.list(U.$('#lst'), {
        endpoint: '/transactions/', params: r.query,
        filters: [{ type: 'search', name: 'search', label: 'Learner or title' },
          { name: 'kind', label: 'All types', options: [{ value: 'cashback', label: 'Referral cashback' }, { value: 'play', label: 'Play rewards' }, { value: 'withdrawal', label: 'Withdrawals' }, { value: 'checkout', label: 'Used at checkout' }, { value: 'adjustment', label: 'Adjustments' }] },
          { name: 'status', label: 'All statuses', options: ['completed', 'held', 'processing', 'paid', 'rejected', 'reversed'].map(function (s) { return { value: s, label: s[0].toUpperCase() + s.slice(1) }; }) }],
        columns: [
          { label: 'Date', cls: 'whitespace-nowrap', render: function (t) { return AD.dt(t.created_at); } },
          { label: 'Learner', render: function (t) { return who(t.user); } },
          { label: 'Entry', render: function (t) { return esc(t.title || t.kind) + '<br><span class="text-xs text-ink-500">' + esc(t.kind) + (t.order_number ? ' · ' + esc(t.order_number) : '') + (t.processed_by_name ? ' · by ' + esc(t.processed_by_name) : '') + '</span>'; } },
          { label: 'Status', render: function (t) { return AD.tag(t.status) + (t.available_at && new Date(t.available_at) > new Date() ? '<br><span class="text-xs text-ink-500">clears ' + U.ago(t.available_at) + '</span>' : ''); } },
          { label: 'Amount', right: true, render: function (t) { return '<b class="' + (t.amount < 0 ? 'text-bad-600' : 'text-good-600') + '">' + (t.amount < 0 ? '−' : '+') + U.inr(Math.abs(t.amount)) + '</b>'; } }
        ],
        empty: 'No wallet entries', emptyIcon: 'wallet-cards'
      });
    }
  });
})();
