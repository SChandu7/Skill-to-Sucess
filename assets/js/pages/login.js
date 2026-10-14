/* Login, free registration and SMS password reset */
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
    if (s.play.enabled) U.$('#reg-lead').textContent = 'A free account opens every preview lesson and keeps your play rewards (up to ' + U.inr(s.play.daily_cap) + ' a day).';

    function tab(which) {
      var reg = which === 'reg';
      U.$('#t-login').setAttribute('aria-pressed', String(!reg)); U.$('#t-reg').setAttribute('aria-pressed', String(reg));
      U.$('#p-login').hidden = reg; U.$('#p-reg').hidden = !reg;
      (reg ? U.$('#r-name') : U.$('#l-id')).focus();
    }
    U.$('#t-login').addEventListener('click', function () { tab('login'); });
    U.$('#t-reg').addEventListener('click', function () { tab('reg'); });
    U.$('#to-reg').addEventListener('click', function () { tab('reg'); });
    if (location.hash === '#register') tab('reg');

    U.$$('[data-eye]').forEach(function (b) { b.addEventListener('click', function () { var i = U.$('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; b.innerHTML = U.icon(i.type === 'password' ? 'eye' : 'eye-off', 'i-sm'); }); });
    var rp = U.$('#r-phone'); rp.addEventListener('input', function () { rp.value = rp.value.replace(/\D/g, '').slice(0, 10); });

    var fl = U.$('#f-login');
    fl.addEventListener('submit', function (e) {
      e.preventDefault(); U.fieldError(fl, null);
      var id = U.$('#l-id').value.trim(), pw = U.$('#l-pass').value;
      if (!id) return U.fieldError(fl, 'identifier', 'Enter your email or mobile number.');
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
        .then(function () { location.href = next(); }, function (err) { U.busy(b, false); U.failure(err, fr); });
    });

    U.$('#forgot').addEventListener('click', function () {
      var phone = '';
      var m = U.modal({ title: 'Reset your password', icon: 'lock', sub: 'We send a 6-digit code to your registered mobile number.', body: '<form id="fp" class="grid gap-4" novalidate><div><label class="label" for="fp-phone">Mobile number</label><input class="input tabular" id="fp-phone" name="phone" inputmode="numeric" maxlength="10" placeholder="98765 43210"></div><button class="btn btn-primary btn-block">Send code</button></form>' });
      var f = m.body.querySelector('#fp');
      f.addEventListener('submit', function step1(e) {
        e.preventDefault(); U.fieldError(f, null);
        phone = U.$('#fp-phone').value.replace(/\D/g, '');
        var b = f.querySelector('button'); U.busy(b, true, 'Sending');
        A.sendOtp(phone).then(function (r) {
          f.removeEventListener('submit', step1);
          f.innerHTML = '<p class="text-[15px] text-ink-600">' + U.esc(r.detail) + (r.debug_code ? ' <span class="tag tag-orange">Test code: ' + r.debug_code + '</span>' : '') + '</p>' +
            '<div><label class="label" for="fp-otp">6-digit code</label><input class="input text-center font-display text-2xl tracking-[0.5em] tabular" id="fp-otp" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>' +
            '<div><label class="label" for="fp-new">New password</label><input class="input" id="fp-new" name="password" type="password" minlength="8" autocomplete="new-password"></div><button class="btn btn-primary btn-block">Set new password</button>';
          U.$('#fp-otp').focus();
          f.addEventListener('submit', function (ev) {
            ev.preventDefault(); U.fieldError(f, null);
            var b2 = f.querySelector('button'); U.busy(b2, true, 'Saving');
            A.resetPassword(phone, U.$('#fp-otp').value.trim(), U.$('#fp-new').value).then(function () { m.close(); U.toast('Password updated. Log in with your new password.'); U.$('#l-id').value = phone; U.$('#l-pass').focus(); }, function (err) { U.busy(b2, false); U.failure(err, f); });
          });
        }, function (err) { U.busy(b, false); U.failure(err, f); });
      });
    });
  });
})();
