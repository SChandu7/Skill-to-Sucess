/* Checkout: account → payment → done. Every price shown comes from the server (/orders/quote/). */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;
  var root = U.$('#co-root');
  var plan = U.param('plan'), courseSlug = U.param('course');
  var item = { kind: 'package', slug: plan };      // courses are sold only inside packages
  var opts = { ref_code: U.savedRef(), use_play: false };

  U.boot({ noChat: true }).then(function (st) {
    if (!item.slug && courseSlug && st.courseMap[courseSlug]) {      // old ?course= links: the cheapest package with it
      var cp = U.cheapestPackageFor(courseSlug);
      if (cp) item.slug = cp.slug;
    }
    if (!item.slug || !st.packageMap[item.slug]) {
      var pop = st.site.packages.filter(function (p) { return p.is_popular; })[0] || st.site.packages[0];
      item = { kind: 'package', slug: pop.slug };
    }
    draw(st);
  });

  function steps(n) {
    return '<ol class="mb-8 flex items-center gap-3 text-sm font-semibold" aria-label="Checkout steps">' + ['Your details', 'Payment', 'Start learning'].map(function (s, i) {
      var stt = i + 1 < n ? 'done' : i + 1 === n ? 'cur' : 'todo';
      return (i ? '<li aria-hidden="true" class="h-px w-6 bg-ink-200 sm:w-12"></li>' : '') + '<li class="flex items-center gap-2 ' + (stt === 'todo' ? 'text-ink-400' : 'text-ink-900') + '"' + (stt === 'cur' ? ' aria-current="step"' : '') + '><span class="grid h-7 w-7 place-items-center rounded-full text-xs ' + (stt === 'done' ? 'bg-good-500 text-white' : stt === 'cur' ? 'bg-sky-600 text-white' : 'border border-ink-200') + '">' + (stt === 'done' ? U.icon('check', 'i-sm') : i + 1) + '</span><span class="hidden sm:inline">' + s + '</span></li>';
    }).join('') + '</ol>';
  }

  function summary(st, q) {
    var isCourse = item.kind === 'course', c = isCourse ? st.courseMap[item.slug] : null, p = isCourse ? null : st.packageMap[item.slug];
    var cur = st.me && st.me.package ? st.packageMap[st.me.package.slug] : null;
    var list = isCourse ? [c.slug] : p.courses.filter(function (s) { return q.kind !== 'upgrade' || !cur || cur.courses.indexOf(s) < 0; });
    return '<aside class="lg:sticky lg:top-[96px] lg:self-start"><div class="overflow-hidden rounded-3xl border border-line bg-white">' +
      '<div class="flex items-center gap-4 border-b border-line p-5"><div class="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-2xl" style="background:' + (isCourse ? c.color : '#0A7BC2') + '">' + (isCourse ? U.cover(c) : '<span class="h-9 w-9">' + U.LOGO_SVG + '</span>') + '</div>' +
      '<div class="min-w-0"><p class="text-sm text-ink-500">' + (q.kind === 'upgrade' ? 'Upgrade' : isCourse ? 'Single course' : 'Package') + '</p><p class="font-display text-lg font-semibold leading-snug">' + U.esc(q.title) + '</p></div></div>' +
      '<div class="p-5"><p class="text-sm font-semibold">' + (q.kind === 'upgrade' ? 'You add ' + list.length + ' courses' : 'What you get') + '</p><ul class="mt-3 space-y-1.5 text-[15px] text-ink-700">' +
      list.map(function (s) { return st.courseMap[s] ? '<li class="flex items-center gap-2">' + U.icon('check', 'i-sm text-sky-600') + U.esc(st.courseMap[s].title) + '</li>' : ''; }).join('') +
      '<li class="flex items-center gap-2">' + U.icon('award', 'i-sm text-sky-600') + 'Quizzes, certificates and lifetime access</li>' +
      (isCourse ? '' : '<li class="flex items-center gap-2">' + U.icon('gift', 'i-sm text-orange-500') + 'Your referral code at ' + p.cashback_percent + '% cashback</li>') + '</ul></div>' +
      '<dl class="space-y-2 border-t border-line p-5 text-[15px]" aria-live="polite">' +
      '<div class="flex justify-between"><dt class="text-ink-600">' + (q.kind === 'upgrade' ? 'Upgrade price' : 'Price') + '</dt><dd class="tabular">' + (q.kind !== 'upgrade' && q.mrp > q.price ? '<s class="mr-2 text-ink-400">' + U.inr(q.mrp) + '</s>' : '') + U.inr(q.price) + '</dd></div>' +
      (q.discount ? '<div class="flex justify-between text-good-600"><dt>Referral discount (' + U.esc(q.ref_name) + ')</dt><dd class="tabular">−' + U.inr(q.discount) + '</dd></div>' : '') +
      (q.play_used ? '<div class="flex justify-between text-good-600"><dt>Play rewards</dt><dd class="tabular">−' + U.inr(q.play_used) + '</dd></div>' : '') +
      '<div class="flex items-end justify-between border-t border-line pt-3"><dt class="font-semibold">Total</dt><dd class="font-display text-3xl font-semibold tabular">' + U.inr(q.total) + '</dd></div><p class="text-xs text-ink-500">' + (U.gstLine(q.total) || 'Includes GST') + '. Nothing is added on top. One-time payment.</p></dl></div>' +
      '<ul class="mt-5 grid gap-3 px-1 text-sm text-ink-600"><li class="flex items-center gap-2">' + U.icon('shield-check', 'text-sky-600') + 'Payments by Razorpay. We never see your card or UPI PIN.</li><li class="flex items-center gap-2">' + U.icon('zap', 'text-sky-600') + 'Courses unlock the moment payment is confirmed.</li><li class="flex items-center gap-2">' + U.icon('headphones', 'text-sky-600') + 'Charged twice or no access? We fix it within 7 days.</li></ul></aside>';
  }

  function draw(st) {
    var me = st.me;
    A.quote({ kind: item.kind, slug: item.slug, ref_code: opts.ref_code, use_play: opts.use_play }).then(function (q) {
      if (q.blocked) {
        root.innerHTML = '<div class="mx-auto max-w-lg rounded-3xl border border-line bg-white p-8 text-center"><span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-700">' + U.icon('check-circle-2', 'i-lg') + '</span><h1 class="mt-4 text-2xl">Nothing to pay here</h1><p class="mt-2 text-ink-600">' + U.esc(q.reason) + '</p><div class="mt-6 flex justify-center gap-2"><a class="btn btn-primary" href="dashboard.html#courses">Go to my courses</a><a class="btn btn-ghost" href="packages.html">See packages</a></div></div>';
        return;
      }
      var next = encodeURIComponent('checkout.html?plan=' + item.slug);
      root.innerHTML = '<div class="grid gap-8 lg:grid-cols-[1fr_420px]"><section class="rounded-3xl border border-line bg-white p-6 sm:p-8">' + steps(1) +
        '<h1 class="text-display-md">' + (me ? 'Confirm and pay' : 'Create your account') + '</h1>' +
        '<p class="mt-2 text-ink-600">' + (me ? 'You are buying as <b>' + U.esc(me.name) + '</b> (' + U.esc(me.email) + ').' : 'Then pay securely with UPI, card or netbanking. Already a member? <a class="link" href="login.html?next=' + next + '">Log in</a>') + '</p>' +
        '<form class="mt-8 grid gap-5" id="co-form" novalidate>' +
        (me ? '' : '<div class="grid gap-5 sm:grid-cols-2"><div class="sm:col-span-2"><label class="label" for="f-name">Full name</label><input class="input" id="f-name" name="name" autocomplete="name" placeholder="As you want it on your certificate" required></div>' +
          '<div><label class="label" for="f-phone">Mobile number</label><div class="flex" data-field><span class="grid place-items-center rounded-l-xl border border-r-0 border-line bg-cloud px-3 text-sm text-ink-600">+91</span><input class="input !rounded-l-none tabular" id="f-phone" name="phone" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="98765 43210" required></div></div>' +
          '<div><label class="label" for="f-email">Email</label><input class="input" id="f-email" name="email" type="email" autocomplete="email" placeholder="you@gmail.com" required></div>' +
          '<div class="sm:col-span-2"><label class="label" for="f-pass">Create password</label><div class="relative" data-field><input class="input pr-12" id="f-pass" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters, not only numbers" required><button type="button" class="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:bg-cloud" data-eye aria-label="Show password">' + U.icon('eye', 'i-sm') + '</button></div></div></div>') +
        (q.first_purchase ? '<div><label class="label" for="f-ref">Referral code <span class="font-normal text-ink-500">(optional)</span></label><div class="flex gap-2" data-field><input class="input uppercase tabular" id="f-ref" name="ref_code" value="' + U.esc(opts.ref_code) + '" placeholder="ARJUN25" autocomplete="off"><button type="button" class="btn btn-ghost" data-apply>Apply</button></div>' +
          (q.ref_valid ? '<p class="mt-2 flex items-center gap-1.5 text-sm font-medium text-good-600">' + U.icon('check-circle-2', 'i-sm') + 'Code applied. ' + U.inr(q.discount) + ' off, from ' + U.esc(q.ref_name) + '.</p>' : q.ref_message ? '<p class="error">' + U.esc(q.ref_message) + '</p>' : '<p class="hint">A friend\'s code takes ' + U.inr(st.site.settings.referral.friend_discount) + ' off your first purchase.</p>') + '</div>' : '') +
        (q.play_available > 0 ? '<label class="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4"><input type="checkbox" class="check" id="f-play"' + (opts.use_play ? ' checked' : '') + '><span><span class="font-semibold">Use ' + U.inr(q.play_available) + ' from your play rewards</span><span class="block text-sm text-ink-600">Earned from free quizzes and games.</span></span></label>' : '') +
        '<div class="grid gap-3 rounded-2xl bg-cloud p-4 text-[15px]"><label class="flex items-start gap-3"><input type="checkbox" class="check" name="t1"><span>I agree to the <a class="link" href="legal.html#terms" target="_blank">Terms of use</a> and <a class="link" href="legal.html#referral" target="_blank">Referral terms</a>.</span></label>' +
        '<label class="flex items-start gap-3"><input type="checkbox" class="check" name="t2"><span>I have read the <a class="link" href="legal.html#refund" target="_blank">Refund policy</a> and understand course access starts immediately.</span></label><p class="error hidden" id="t-err">Tick both boxes to continue.</p></div>' +
        '<div id="pay-err" hidden></div>' +
        '<button class="btn btn-buy btn-lg btn-block" id="pay-btn">' + U.icon('lock', 'i-sm') + 'Continue to pay ' + U.inr(q.total) + '</button>' +
        '<p class="-mt-2 text-center text-xs text-ink-500">The price is checked again on our server before payment.</p></form></section>' + summary(st, q) + '</div>';
      bind(st, q);
    }, function (e) { U.failure(e); });
  }

  function keep() { var f = ['f-name', 'f-phone', 'f-email'].map(function (i) { return U.$('#' + i); }); if (!f[0]) return; try { sessionStorage.setItem('sts:co', JSON.stringify(f.map(function (i) { return i.value; }))); } catch (e) { /* */ } }
  function restore() { var f = ['f-name', 'f-phone', 'f-email'].map(function (i) { return U.$('#' + i); }); if (!f[0]) return; try { var v = JSON.parse(sessionStorage.getItem('sts:co') || 'null'); if (v) f.forEach(function (i, k) { i.value = v[k] || ''; }); } catch (e) { /* */ } }

  function bind(st, q) {
    var form = U.$('#co-form');
    restore();
    var eye = form.querySelector('[data-eye]');
    if (eye) eye.addEventListener('click', function () { var i = U.$('#f-pass'); i.type = i.type === 'password' ? 'text' : 'password'; eye.innerHTML = U.icon(i.type === 'password' ? 'eye' : 'eye-off', 'i-sm'); });
    var apply = form.querySelector('[data-apply]'), ref = U.$('#f-ref');
    if (apply) apply.addEventListener('click', function () { opts.ref_code = ref.value.trim().toUpperCase(); keep(); draw(st); });
    if (ref) ref.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); apply.click(); } });
    var play = U.$('#f-play'); if (play) play.addEventListener('change', function () { opts.use_play = play.checked; keep(); draw(st); });
    var phone = U.$('#f-phone'); if (phone) phone.addEventListener('input', function () { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      U.fieldError(form, null);
      var terr = U.$('#t-err'); terr.classList.add('hidden');
      if (!form.elements.namedItem('t1').checked || !form.elements.namedItem('t2').checked) { terr.classList.remove('hidden'); return; }
      var btn = U.$('#pay-btn'); U.busy(btn, true, 'Preparing payment');
      var box = U.$('#pay-err'); box.hidden = true;
      var me = st.me, order = null;
      var ready = me ? Promise.resolve(me) : A.register({ name: U.$('#f-name').value, phone: U.$('#f-phone').value, email: U.$('#f-email').value, password: U.$('#f-pass').value })
        .then(function (sent) { U.busy(btn, true, 'Waiting for the email code'); return U.signupCode(sent); })
        .then(function (r) { st.me = r.user; U.setMe(r.user); U.header(); if (r.claimed_play_rewards) U.toast(U.inr(r.claimed_play_rewards) + ' of play rewards moved to your wallet', 'gift'); return r.user; });
      ready.then(function () {
        return A.createOrder({ kind: item.kind, slug: item.slug, ref_code: opts.ref_code, use_play: opts.use_play });
      }).then(function (res) {
        order = res.order;
        U.busy(btn, true, 'Waiting for payment');
        return STS.pay.start(res.payment);
      }).then(function (pay) {
        U.busy(btn, true, 'Unlocking your courses');
        return A.verifyOrder(order.number, pay);
      }).then(success, function (err) {
        U.busy(btn, false);
        if (order && (err.cancelled || err.failed)) A.cancelOrder(order.number, err.message, err.detail).catch(function () { /* */ });
        if (err.field && U.fieldError(form, err.field, err.message)) return;
        box.hidden = false;
        box.innerHTML = '<div class="flex gap-3 rounded-2xl border border-bad-500/30 bg-bad-50 p-4 text-[15px]">' + U.icon('alert-triangle', 'mt-0.5 text-bad-600') + '<div><p class="font-semibold text-bad-600">' + (err.cancelled ? 'Payment not completed' : 'Something went wrong') + '</p><p class="text-ink-700">' + U.esc(err.message) + '</p></div></div>';
        if (st.me && !me) { var saved = box.innerHTML; draw(st); setTimeout(function () { var b = U.$('#pay-err'); if (b) { b.hidden = false; b.innerHTML = saved; } }, 500); }
      });
    });
  }

  function success(res) {
    try { localStorage.removeItem('sts:ref'); sessionStorage.removeItem('sts:co'); sessionStorage.removeItem('sts:site'); } catch (e) { /* */ }
    var o = res.order, u = res.user;
    var pick = (u.package && u.package.courses_to_choose) || 0;
    U.setMe(u); U.header(); U.confetti();
    root.innerHTML = '<div class="mx-auto max-w-2xl">' + steps(3) + '<div class="rounded-3xl border border-line bg-white p-6 text-center sm:p-10">' +
      '<span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-good-500 text-white" style="animation:pop .45s both">' + U.icon('check', 'i-lg') + '</span>' +
      '<h1 class="mt-5 text-display-md">You are in, ' + U.esc(u.first_name) + '.</h1><p class="mt-2 text-ink-600">' + U.esc(o.title) + ' is unlocked.</p>' +
      (pick ? '<p class="mx-auto mt-4 max-w-md rounded-2xl border border-orange-200 bg-orange-50 p-4 text-[15px] text-orange-900">Next step: choose the <b>' + pick + ' course' + (pick === 1 ? '' : 's') + '</b> you want in your library.</p>' : '') +
      '<dl class="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 text-left text-sm"><div class="rounded-2xl bg-cloud p-3"><dt class="text-ink-500">Order ID</dt><dd class="font-semibold tabular">' + U.esc(o.number) + '</dd></div><div class="rounded-2xl bg-cloud p-3"><dt class="text-ink-500">Paid</dt><dd class="font-semibold tabular">' + U.inr(o.amount) + (o.method ? ' by ' + U.esc(o.method) : '') + '</dd></div></dl>' +
      '<div class="mt-8 flex flex-col justify-center gap-2 sm:flex-row">' +
        (pick ? '<a class="btn btn-buy btn-lg" href="dashboard.html#choose">' + U.icon('gift') + 'Choose my ' + pick + ' course' + (pick === 1 ? '' : 's') + '</a>'
              : (o.first_lesson ? '<a class="btn btn-buy btn-lg" href="lesson.html?l=' + o.first_lesson + '">' + U.icon('play') + 'Start learning</a>' : '')) +
        '<a class="btn btn-ghost btn-lg" href="dashboard.html">Go to dashboard</a></div></div>' +
      (u.referral_code ? '<div class="mt-6 rounded-3xl bg-gradient-to-br from-sky-800 to-sky-600 p-6 text-white sm:p-8"><p class="text-sm text-sky-100">Your referral code</p><div class="mt-2 flex flex-wrap items-center gap-3"><span class="rounded-2xl bg-white/15 px-4 py-2 font-display text-2xl font-semibold tracking-wide">' + U.esc(u.referral_code) + '</span><button class="btn btn-buy btn-sm" data-copy>' + U.icon('copy', 'i-sm') + 'Copy invite link</button></div>' +
        '<p class="mt-4 text-[15px] text-sky-50">Friends save ' + U.inr(U.state.site.settings.referral.friend_discount) + '. You get ' + u.cashback_percent + '% cashback on what they pay.' + (U.state.site.settings.referral.learn_first ? ' Cashback unlocks after you finish your first course.' : '') + '</p></div>' : '') + '</div>';
    var cp = root.querySelector('[data-copy]');
    if (cp) cp.addEventListener('click', function () { U.copy(location.origin + '/?ref=' + u.referral_code, 'Invite link'); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
