/* Login (email + password), sign-up with an email code, and password reset with an email code */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;

  function next() {
    var n = U.param('next') || '';
    if (/^[\w\-]+\.html/.test(n) || /^admin\//.test(n)) {
      try { if (n.indexOf('?') > 0) sessionStorage.setItem('sts:nav', JSON.stringify({ page: n.split('?')[0].replace('.html', ''), q: n.split('?')[1].split('#')[0] })); } catch (e) { /* */ }
      return n;
    }
    return 'dashboard.html';
  }

  U.boot({ noShell: true, noChat: true }).then(function (st) {
    if (st.me) { location.replace(next()); return; }
    var s = st.site.settings;
    U.$('#help-phone').textContent = s.phone;
    U.$('#quote-by').innerHTML = ['Free preview lessons in every course', 'Certificates anyone can verify online', 'Refer a friend, earn cashback. One level only.'].map(function (t) { return '<li class="flex items-center gap-2.5">' + U.icon('check-circle-2', 'text-orange-300') + t + '</li>'; }).join('');
    U.$('#side-stats').innerHTML = U.proof(st.site.stats, 3).map(function (x) { return '<div><p class="font-display text-3xl font-semibold tabular">' + x[0] + '</p><p class="text-sm text-sky-100">' + x[1] + '</p></div>'; }).join('');
    if (s.play.enabled) U.$('#reg-lead').textContent = 'A free account opens every preview lesson and keeps your play rewards (up to ' + U.inr(s.play.total_cap) + ' per account).';

    function tab(which) {
      var reg = which === 'reg';
      U.$('#t-login').setAttribute('aria-pressed', String(!reg)); U.$('#t-reg').setAttribute('aria-pressed', String(reg));
      U.$('#p-login').hidden = reg; U.$('#p-reg').hidden = !reg;
      (reg ? U.$('#r-name') : U.$('#l-id')).focus();
    }
    U.$('#t-login').addEventListener('click', function () { tab('login'); });
    U.$('#t-reg').addEventListener('click', function () { tab('reg'); });
    U.$('#to-reg').addEventListener('click', function () { tab('reg'); });
    U.$('#to-login').addEventListener('click', function () { tab('login'); });
    if (location.hash === '#register') tab('reg');

    U.$$('[data-eye]').forEach(function (b) { b.addEventListener('click', function () { var i = U.$('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; b.innerHTML = U.icon(i.type === 'password' ? 'eye' : 'eye-off', 'i-sm'); }); });
    var rp = U.$('#r-phone'); rp.addEventListener('input', function () { rp.value = rp.value.replace(/\D/g, '').slice(0, 10); });

    var fl = U.$('#f-login');
    fl.addEventListener('submit', function (e) {
      e.preventDefault(); U.fieldError(fl, null);
      var id = U.$('#l-id').value.trim(), pw = U.$('#l-pass').value;
      if (!id) return U.fieldError(fl, 'identifier', 'Enter your email.');
      if (!pw) return U.fieldError(fl, 'password', 'Enter your password.');
      var b = fl.querySelector('button.btn-primary'); U.busy(b, true, 'Logging in');
      A.login(id, pw).then(function (r) { location.href = r.user.is_staff && !U.param('next') ? 'admin/' : next(); }, function (err) { U.busy(b, false); U.failure(err, fl); });
    });

    var fr = U.$('#f-reg');
    fr.addEventListener('submit', function (e) {
      e.preventDefault(); U.fieldError(fr, null); U.$('#agree-err').classList.add('hidden');
      if (!fr.elements.namedItem('agree').checked) { U.$('#agree-err').classList.remove('hidden'); return; }
      var b = fr.querySelector('button.btn-buy'); U.busy(b, true, 'Creating account');
      A.register({ name: U.$('#r-name').value, phone: U.$('#r-phone').value, email: U.$('#r-email').value, password: U.$('#r-pass').value })
        .then(function (sent) { U.busy(b, true, 'Waiting for the code'); return U.signupCode(sent); })
        .then(function () { location.href = next(); }, function (err) { U.busy(b, false); if (err.cancelled) U.$('#r-email').focus(); else U.failure(err, fr); });
    });

    U.$('#forgot').addEventListener('click', function () {
      var email = '', stop = null;
      var m = U.modal({ title: 'Reset your password', icon: 'lock', sub: 'We email a 6-digit code to the address you signed up with.',
        onClose: function () { if (stop) stop(); },
        body: '<form id="fp" class="grid gap-4" novalidate><div><label class="label" for="fp-email">Email</label><input class="input" id="fp-email" name="email" type="email" autocomplete="email" value="' + U.esc(U.$('#l-id').value.trim()) + '"></div><button class="btn btn-primary btn-block">Send code</button></form>' });
      var f = m.body.querySelector('#fp');
      f.addEventListener('submit', function step1(e) {
        e.preventDefault(); U.fieldError(f, null);
        email = U.$('#fp-email').value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return U.fieldError(f, 'email', 'Enter a valid email address.');
        var b = f.querySelector('button'); U.busy(b, true, 'Sending');
        A.forgotPassword(email).then(function (r) {
          f.removeEventListener('submit', step1);
          f.innerHTML = '<p class="text-[15px] text-ink-600">' + U.esc(r.detail) + '</p>' + U.CODE_FIELD +
            '<div><label class="label" for="fp-new">New password</label><input class="input" id="fp-new" name="password" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters, not only numbers"></div>' +
            '<button class="btn btn-primary btn-block" data-save>Set new password and log in</button><button type="button" class="text-sm font-semibold text-sky-700 hover:underline disabled:text-ink-400 disabled:no-underline" data-resend></button>';
          var code = U.$('#ec-code'), rb = f.querySelector('[data-resend]');
          U.onlyDigits(code); code.focus();
          stop = U.resendTimer(rb, r.resend_in);
          rb.addEventListener('click', function () {
            U.fieldError(f, null); U.busy(rb, true, 'Sending');
            A.forgotPassword(email).then(function (r2) { U.busy(rb, false); U.toast('New code sent', 'mail'); stop = U.resendTimer(rb, r2.resend_in); },
              function (err) { U.busy(rb, false); stop = U.resendTimer(rb, 0); U.failure(err, f); });
          });
          f.addEventListener('submit', function (ev) {
            ev.preventDefault(); U.fieldError(f, null);
            if (!/^\d{6}$/.test(code.value)) return U.fieldError(f, 'code', 'Enter the 6-digit code from the email.');
            var b2 = f.querySelector('[data-save]'); U.busy(b2, true, 'Saving');
            A.resetPasswordEmail(email, code.value, U.$('#fp-new').value).then(function (res) {
              m.close(); U.toast('Password updated. You are logged in.');
              location.href = res.user.is_staff && !U.param('next') ? 'admin/' : next();
            }, function (err) { U.busy(b2, false); U.failure(err, f); });
          });
        }, function (err) { U.busy(b, false); U.failure(err, f); });
      });
    });
  });
})();
