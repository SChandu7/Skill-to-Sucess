/* Top earners page: real buyers only, numbers worked out on the server (/top/?full=1) */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;
  var data = null, tab = 'earners';
  var MEDAL = [['bg-orange-400 text-ink-900', 'trophy', '1st'], ['bg-ink-200 text-ink-800', 'medal', '2nd'], ['bg-orange-200 text-orange-800', 'medal', '3rd']];

  function ago(v) {
    var s = Math.max(1, Math.round((Date.now() - new Date(v).getTime()) / 1000));
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return U.date(v, { day: 'numeric', month: 'short' });
  }

  function value(r) {
    return tab === 'earners'
      ? { big: U.inr(r.earned), small: r.friends ? r.friends + ' friend' + (r.friends === 1 ? '' : 's') + ' referred' : 'from finished courses', tone: 'text-good-600' }
      : { big: r.courses + ' course' + (r.courses === 1 ? '' : 's'), small: U.num(r.lessons) + ' lessons done', tone: 'text-ink-900' };
  }

  function stats(st) {
    var s = data.stats || {};
    var tiles = [['wallet', U.inr(s.earned), 'Earned by learners'], ['banknote', U.inr(s.paid_out), 'Paid out to UPI'],
                 ['users', U.num(s.earners), 'Learners earning'], ['award', U.num(s.certificates), 'Certificates earned']];
    U.$('#er-stats').innerHTML = tiles.map(function (t) {
      return '<div class="bg-white px-5 py-5 sm:px-7"><dt class="flex items-center gap-2 text-sm text-ink-500">' + U.icon(t[0], 'i-sm text-sky-600') + t[2] + '</dt>' +
        '<dd class="mt-1 font-display text-2xl font-semibold tabular sm:text-3xl">' + t[1] + '</dd></div>';
    }).join('');
  }

  function empty(text) {
    return '<div class="rounded-3xl border border-dashed border-line p-8 text-center text-ink-600 md:col-span-3">' + U.icon('trophy', 'i-lg text-orange-400') +
      '<p class="mt-3 font-display text-xl font-semibold text-ink-900">' + text + '</p>' +
      '<p class="mt-1 text-[15px]">We are just getting started. The first learners to finish courses and refer friends will appear here.</p>' +
      '<a class="btn btn-buy mt-5" href="packages.html">Be one of the first</a></div>';
  }

  function podium() {
    var rows = data[tab] || [];
    if (!rows.length) { U.$('#er-podium').innerHTML = empty(tab === 'earners' ? 'No earners on the board yet' : 'No learners on the board yet'); return; }
    U.$('#er-podium').innerHTML = rows.slice(0, 3).map(function (r, i) {
      var v = value(r), m = MEDAL[i];
      return '<article class="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card' + (i === 0 ? ' md:-mt-4 md:shadow-lift' : '') + '">' +
        '<span class="absolute right-5 top-5 tag ' + m[0] + '">' + U.icon(m[1], 'i-sm') + m[2] + '</span>' +
        U.avatar(r.name, 56) + '<p class="mt-4 truncate font-display text-xl font-semibold">' + U.esc(r.name) + '</p>' +
        '<p class="truncate text-sm text-ink-500">' + U.esc(r.city || 'India') + '</p>' +
        '<p class="mt-4 font-display text-3xl font-semibold tabular ' + v.tone + '">' + v.big + '</p><p class="text-sm text-ink-500">' + v.small + '</p></article>';
    }).join('');
  }

  function list() {
    var rows = data[tab] || [];
    U.$('#er-list-title').textContent = tab === 'earners' ? 'Top earners' : 'Top learners';
    U.$('#er-count').textContent = rows.length ? 'Top ' + rows.length : '';
    if (!rows.length) { U.$('#er-list').innerHTML = '<li class="p-6 text-center text-ink-500">The list fills up as learners finish courses and refer friends.</li>'; return; }
    U.$('#er-list').innerHTML = rows.map(function (r) {
      var v = value(r);
      return '<li class="flex items-center gap-4 px-5 py-3.5"><span class="grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-bold ' + (r.rank <= 3 ? MEDAL[r.rank - 1][0] : 'bg-cloud text-ink-600') + '">' + r.rank + '</span>' +
        U.avatar(r.name, 36) + '<div class="min-w-0 flex-1"><p class="truncate font-semibold">' + U.esc(r.name) + '</p><p class="truncate text-sm text-ink-500">' + U.esc(r.city || 'India') + '</p></div>' +
        '<div class="text-right"><p class="font-display text-lg font-semibold tabular ' + v.tone + '">' + v.big + '</p><p class="text-xs text-ink-500">' + v.small + '</p></div></li>';
    }).join('');
  }

  function payouts() {
    var rows = data.recent_payouts || [];
    U.$('#er-payouts').innerHTML = rows.length ? rows.map(function (p) {
      return '<li class="flex items-center gap-3">' + U.avatar(p.name, 36) + '<div class="min-w-0 flex-1"><p class="truncate text-[15px] font-semibold">' + U.esc(p.name) + '</p><p class="text-xs text-ink-500">' + ago(p.paid_at) + (p.city ? ' · ' + U.esc(p.city) : '') + '</p></div>' +
        '<span class="font-display font-semibold tabular text-good-600">' + U.inr(p.amount) + '</span></li>';
    }).join('') : '<li class="text-[15px] text-ink-500">Payouts to UPI will show here as soon as learners withdraw.</li>';
  }

  function ways(st) {
    var s = st.site.settings, P = st.site.packages.slice().sort(function (a, b) { return a.price - b.price; });
    var R = s.referral || {}, rewards = P.map(function (p) { return U.courseReward(p); }).filter(Boolean);
    var pcts = P.map(function (p) { return p.cashback_percent; });
    var tiers = (R.monthly_bonus || []).map(function (t) { return t.friends + ' friends → ' + U.inr(t.bonus); }).join(', ');
    var items = [
      ['graduation-cap', 'Finish a course', rewards.length ? U.inr(Math.min.apply(null, rewards)) + ' to ' + U.inr(Math.max.apply(null, rewards)) + ' per course' : 'Course rewards', 'Pass every lesson quiz and the reward lands in your wallet. Bigger packages pay more per course.'],
      ['share-2', 'Refer a friend', pcts.length ? Math.min.apply(null, pcts) + '% to ' + Math.max.apply(null, pcts) + '% cashback' : 'Referral cashback', 'Your friend saves ' + U.inr(R.friend_discount) + ' on their first package. You get cashback on the package they choose, at your package\'s rate or theirs, whichever is lower.'],
      ['calendar', 'Daily bonus', R.daily_bonus ? U.inr(R.daily_bonus) + ' a day' : 'Daily bonus', 'The first friend who buys with your code on any day earns you an extra bonus.'],
      ['target', 'Monthly milestones', tiers ? 'Up to ' + U.inr(Math.max.apply(null, (R.monthly_bonus || []).map(function (t) { return t.bonus; }))) : 'Milestones', tiers ? 'Bring friends within one month: ' + tiers + '.' : 'Reach a number of friends in a month for a one-off bonus.']
    ];
    U.$('#er-ways').innerHTML = items.map(function (w) {
      return '<article class="rounded-3xl border border-line bg-white p-6"><span class="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">' + U.icon(w[0], 'i-lg') + '</span>' +
        '<h3 class="mt-5 text-lg">' + w[1] + '</h3><p class="mt-1 font-display text-xl font-semibold text-orange-600">' + w[2] + '</p><p class="mt-2 text-[15px] text-ink-600">' + w[3] + '</p></article>';
    }).join('');
    U.$('#er-packages').innerHTML = '<thead class="bg-cloud text-sm text-ink-500"><tr><th class="px-5 py-3 font-semibold">Package</th><th class="px-5 py-3 font-semibold">Price</th><th class="px-5 py-3 font-semibold">Courses</th><th class="px-5 py-3 font-semibold">Per finished course</th><th class="px-5 py-3 font-semibold">Referral cashback</th></tr></thead><tbody class="divide-y divide-line">' +
      P.map(function (p) {
        return '<tr><td class="px-5 py-3 font-semibold">' + U.esc(p.name) + '</td><td class="px-5 py-3 tabular">' + U.inr(p.price) + '</td><td class="px-5 py-3">' + U.packageCourseCount(p) + '</td>' +
          '<td class="px-5 py-3 font-semibold tabular text-good-600">' + U.inr(U.courseReward(p)) + '</td><td class="px-5 py-3 tabular">' + p.cashback_percent + '%</td></tr>';
      }).join('') + '</tbody>';
  }

  function draw() { podium(); list(); }

  U.boot({ page: 'earners' }).then(function (st) {
    ways(st);
    U.$('#er-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]');
      if (!b || !data) return;
      tab = b.dataset.tab;
      U.$$('[data-tab]', U.$('#er-tabs')).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      draw();
    });
    A.get('/top/?full=1').then(function (d) { data = d; stats(st); draw(); payouts(); },
      function (err) { U.$('#er-podium').innerHTML = '<p class="text-bad-600 md:col-span-3">' + U.esc(err.message) + '</p>'; });
  });
})();
