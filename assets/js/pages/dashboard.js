/* Learner dashboard */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;
  var view = U.$('#view'), st, me;
  var STATUS = {
    pending: ['tag-orange', 'Pending'], locked: ['tag-sky', 'Learn to unlock'], available: ['tag-good', 'Available'], review: ['tag-warn', 'Under review'],
    processing: ['tag-orange', 'Processing'], paid: ['tag-mute', 'Paid'], rejected: ['tag-bad', 'Rejected'], reversed: ['tag-bad', 'Reversed'],
    used: ['tag-mute', 'Used'], reserved: ['tag-orange', 'Reserved'], released: ['tag-mute', 'Released'], completed: ['tag-mute', 'Done'], active: ['tag-good', 'Active']
  };
  function pill(s) { var x = STATUS[s] || ['tag-mute', s]; return '<span class="tag ' + x[0] + '">' + x[1] + '</span>'; }
  function head(title, sub, right) { return '<div class="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-display-md">' + title + '</h1>' + (sub ? '<p class="mt-1 text-ink-600">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>'; }
  function card(inner, cls) { return '<div class="rounded-3xl border border-line bg-white ' + (cls || 'p-6') + '">' + inner + '</div>'; }
  function loading() { view.innerHTML = '<div class="skel h-10 w-64"></div><div class="mt-6 grid gap-4 sm:grid-cols-3"><div class="skel h-32 rounded-3xl"></div><div class="skel h-32 rounded-3xl"></div><div class="skel h-32 rounded-3xl"></div></div>'; }
  function inviteLink() { return location.origin + location.pathname.replace(/[^/]*$/, '') + '?ref=' + me.referral_code; }
  function waText() { return 'I am learning digital skills on ' + st.site.settings.brand + '. Use my code ' + me.referral_code + ' to get ' + U.inr(st.site.settings.referral.friend_discount) + ' off any package: ' + inviteLink(); }

  function side() {
    var p = me.package;
    U.$('#me-card').innerHTML = U.avatar(me.name, 44) + '<div class="min-w-0"><p class="truncate font-semibold">' + U.esc(me.name) + '</p><p class="text-sm text-ink-500">' + (p ? U.esc(p.name) + ' package' : 'Free account') + '</p></div>';
    var cur = p ? st.packageMap[p.slug] : null;
    var nextP = st.site.packages.filter(function (x) { return !cur || x.price > cur.price; })[0];
    U.$('#side-upsell').innerHTML = nextP ? '<p class="text-sm font-semibold">' + (cur ? 'Upgrade to ' + U.esc(nextP.name) : 'Unlock full courses') + '</p><p class="mt-1 text-sm text-ink-600">' + (cur ? '+' + (U.packageCourseCount(nextP) - U.packageCourseCount(cur)) + ' more courses for ' + U.inr(Math.max(1, (nextP.price - cur.price) - Math.round((nextP.price - cur.price) * (st.site.settings.upgrade_discount || 0) / 100))) + '. Cashback rate goes to ' + nextP.cashback_percent + '%.' : 'Packages start at ' + U.inr(st.site.packages[0].price) + '.') + '</p><a class="btn btn-buy btn-sm btn-block mt-3" href="checkout.html?plan=' + nextP.slug + '">' + (cur ? 'Upgrade' : 'See packages') + '</a>'
      : '<p class="text-sm font-semibold">You have the top package</p><p class="mt-1 text-sm text-ink-600">Thank you for learning with us.</p>';
  }

  /* ---------- overview ---------- */
  function overview() {
    loading();
    Promise.all([A.wallet(), A.notifications(), U.refreshMe()]).then(function (r) {
      var w = r[0].balances, notes = (r[1].results || r[1]).slice(0, 6); me = r[2] || me;
      var hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
      var last = me.last_lesson, c = last ? st.courseMap[last.course] : (me.owned_courses[0] ? st.courseMap[me.owned_courses[0]] : null);
      view.innerHTML = chooseBanner() + '<div class="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 class="text-display-md">' + greet + ', ' + U.esc(me.first_name) + '</h1><p class="mt-1 text-ink-600">' + (me.streak_days ? 'You are on a ' + me.streak_days + '-day streak. One lesson today keeps it going.' : 'Finish one lesson today to start a streak.') + '</p></div>' +
        (me.package ? '<span class="tag tag-ink !px-3 !py-1.5 !text-sm">' + U.esc(me.package.name) + ' package</span>' : '<a class="btn btn-buy btn-sm" href="packages.html">Choose a package</a>') + '</div>' +
        '<div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">' +
        (last && c ? '<a href="lesson.html?l=' + last.id + '" class="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition hover:shadow-lift sm:flex-row">' +
          '<div class="aspect-[16/10] flex-none sm:aspect-auto sm:w-56" style="background:' + c.color + '">' + U.cover(c) + '</div>' +
          '<div class="flex flex-1 flex-col p-6"><p class="text-sm font-semibold text-sky-700">Continue learning</p><p class="mt-1 font-display text-xl font-semibold leading-snug">' + U.esc(last.title) + '</p><p class="text-sm text-ink-500">' + U.esc(last.course_title) + ', lesson ' + last.n + ' of ' + last.total + '</p>' +
          '<div class="mt-auto pt-5"><div class="meter"><span style="width:' + ((me.progress[last.course] || {}).pct || 0) + '%"></span></div><span class="mt-4 inline-flex items-center gap-2 font-semibold text-sky-700">' + U.icon('play', 'i-sm') + 'Resume lesson</span></div></div></a>' :
          card(c ? '<p class="font-display text-xl font-semibold">Start your first lesson</p><p class="mt-1 text-ink-600">' + U.esc(c.title) + ' is ready for you.</p><a class="btn btn-primary mt-5" href="course.html?c=' + c.slug + '">Open course</a>' : '<p class="font-display text-xl font-semibold">Start with a free lesson</p><p class="mt-1 text-ink-600">Every course has free preview lessons. Pick one to begin.</p><a class="btn btn-primary mt-5" href="courses.html">Browse courses</a>')) +
        '<div class="grid grid-cols-2 gap-3">' +
        [['zap', 'XP earned', U.num(me.xp), 'text-orange-500'], ['flame', 'Day streak', me.streak_days, 'text-bad-500'], ['check-circle-2', 'Lessons done', me.lessons_done, 'text-good-500'], ['award', 'Certificates', me.certificates, 'text-sky-600']]
          .map(function (s) { return '<div class="stat">' + U.icon(s[0], s[3]) + '<p class="v mt-3">' + s[2] + '</p><p class="k">' + s[1] + '</p></div>'; }).join('') + '</div></div>' +
        '<div class="mt-6 grid gap-6 lg:grid-cols-3">' +
        card('<p class="font-semibold">My courses</p>' + (me.owned_courses.length ? '<ul class="mt-4 space-y-4">' + me.owned_courses.slice(0, 4).map(function (s) { var cc = st.courseMap[s], p = me.progress[s] || { pct: 0 }; return cc ? '<li><a href="course.html?c=' + s + '" class="block"><div class="mb-1.5 flex justify-between gap-3 text-sm"><span class="truncate font-medium">' + U.esc(cc.title) + '</span><span class="tabular text-ink-500">' + p.pct + '%</span></div><div class="meter !h-1.5"><span style="width:' + p.pct + '%"></span></div></a></li>' : ''; }).join('') + '</ul><a class="link mt-4 inline-block text-sm" href="#courses">See all</a>' : '<p class="mt-3 text-sm text-ink-600">No courses yet.</p>')) +
        card('<div class="flex items-center justify-between"><p class="font-semibold">Wallet</p><a class="text-sm font-semibold text-sky-700 hover:underline" href="#wallet">Open</a></div><p class="mt-4 font-display text-4xl font-semibold tabular">' + U.inr(w.available) + '</p><p class="text-sm text-ink-500">Available to withdraw</p>' +
          '<div class="mt-5 grid grid-cols-2 gap-3 text-sm"><div class="rounded-2xl bg-orange-50 p-3"><p class="text-ink-600">Pending</p><p class="font-semibold tabular">' + U.inr(w.pending + w.locked + w.under_review) + '</p></div><div class="rounded-2xl bg-cloud p-3"><p class="text-ink-600">Withdrawn</p><p class="font-semibold tabular">' + U.inr(w.withdrawn) + '</p></div></div>') +
        (me.referral_code ? card('<p class="font-semibold">Your referral code</p><div class="mt-4 flex items-center gap-2"><span class="flex-1 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-4 py-2.5 text-center font-display text-xl font-semibold tracking-wide text-sky-800">' + U.esc(me.referral_code) + '</span><button class="grid h-12 w-12 place-items-center rounded-2xl border border-line hover:bg-cloud" data-copy-code aria-label="Copy code">' + U.icon('copy') + '</button></div>' +
          '<p class="mt-3 text-sm text-ink-600">Friends save ' + U.inr(st.site.settings.referral.friend_discount) + '. You get ' + me.cashback_percent + '% cashback.</p><a class="btn btn-soft btn-sm btn-block mt-4" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(waText()) + '">' + U.icon('message-circle', 'i-sm') + 'Share on WhatsApp</a>') :
          card('<p class="font-semibold">Refer &amp; earn</p><p class="mt-2 text-sm text-ink-600">Your code appears after your first purchase. Friends save ' + U.inr(st.site.settings.referral.friend_discount) + ' and you get cashback.</p><a class="btn btn-soft btn-sm mt-4" href="packages.html">See packages</a>')) + '</div>' +
        '<div class="mt-6">' + card('<p class="font-semibold">Recent activity</p>' + (notes.length ? '<ul class="mt-3 divide-y divide-line">' + notes.map(function (n) { return '<li class="flex items-start gap-3 py-3 text-[15px]">' + U.icon('bell', 'i-sm mt-1 text-ink-400') + '<span class="flex-1">' + U.esc(n.text) + '</span><span class="whitespace-nowrap text-xs text-ink-500">' + U.ago(n.created_at) + '</span></li>'; }).join('') + '</ul>' : '<p class="mt-3 text-sm text-ink-500">Nothing yet.</p>')) + '</div>';
      var cc2 = view.querySelector('[data-copy-code]'); if (cc2) cc2.addEventListener('click', function () { U.copy(me.referral_code, 'Referral code'); });
    }, fail);
  }

  function chooseBanner() {
    var p = me.package;
    if (!p || !p.courses_to_choose) return '';
    return '<a href="#choose" class="mb-6 flex items-start gap-3 rounded-2xl border border-orange-300 bg-orange-50 p-4 transition hover:border-orange-400">' +
      U.icon('gift', 'text-orange-600 mt-0.5') + '<span><b class="block">Pick your ' + p.courses_to_choose + ' course' + (p.courses_to_choose === 1 ? '' : 's') +
      '</b><span class="text-sm text-ink-600">Your ' + U.esc(p.name) + ' package is paid. Choose which courses you want.</span></span>' +
      U.icon('chevron-right', 'ml-auto mt-0.5 text-orange-500') + '</a>';
  }

  /* ---------- courses ---------- */
  function courses() {
    loading();
    A.myCourses().then(function (list) {
      var rest = st.site.courses.filter(function (c) { return !list.some(function (x) { return x.slug === c.slug; }); });
      view.innerHTML = chooseBanner() + head('My courses', list.length ? list.length + ' courses in your library' : 'You have not bought a course yet', '<a class="btn btn-ghost btn-sm" href="courses.html">Browse all</a>') +
        (list.length ? '<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">' + list.map(function (c) {
          return '<div class="flex flex-col">' + U.courseCard(c, { progress: c.progress, price: false }) + (c.next_lesson ? '<a class="btn btn-primary btn-sm mt-2" href="lesson.html?l=' + c.next_lesson.id + '">' + U.icon('play', 'i-sm') + (c.progress.done ? 'Continue' : 'Start') + '</a>' : '') + '</div>';
        }).join('') + '</div>' :
          card('<p class="font-display text-xl font-semibold">Your library is empty</p><p class="mt-1 text-ink-600">Watch the free lessons in any course, or pick a package to unlock full courses.</p><div class="mt-5 flex gap-2"><a class="btn btn-buy" href="packages.html">See packages</a><a class="btn btn-ghost" href="courses.html">Free lessons</a></div>')) +
        (rest.length ? '<h2 class="mt-12 text-2xl">Not in your library yet</h2><p class="mt-1 text-ink-600">Free lessons are open. Upgrade your package or buy a single course to unlock these.</p><div class="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">' + rest.map(function (c) { return U.courseCard(c, {}); }).join('') + '</div>' : '');
    }, fail);
  }

  /* ---------- choose the courses that came with the package ---------- */
  function choose() {
    loading();
    A.courseChoices().then(function (d) {
      if (!d.remaining) {
        view.innerHTML = head('Choose your courses') +
          card('<p class="font-display text-xl font-semibold">Nothing left to choose</p><p class="mt-1 text-ink-600">' +
            (d.all_courses ? 'Your ' + U.esc(d.package) + ' package already includes every course.'
              : 'All your package courses are picked. Ask support if you need one changed.') +
            '</p><a class="btn btn-primary mt-5" href="#courses">Go to my courses</a>');
        return;
      }
      var picked = [];
      var open = d.choices.filter(function (c) { return !c.owned; });
      function card1(c) {
        var on = picked.indexOf(c.slug) >= 0;
        return '<button type="button" data-pick="' + c.slug + '" aria-pressed="' + on + '" class="group flex flex-col overflow-hidden rounded-2xl border-2 text-left transition ' +
          (on ? 'border-sky-600 bg-sky-50/60 shadow-card' : 'border-line bg-white hover:border-sky-300') + '">' +
          '<span class="relative block aspect-[16/9] overflow-hidden" style="background:' + c.color + '">' + U.cover(c, 'h-full w-full object-cover') +
          (on ? '<span class="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-sky-600 text-white">' + U.icon('check', 'i-sm') + '</span>' : '') + '</span>' +
          '<span class="flex flex-1 flex-col p-4"><span class="font-semibold leading-snug">' + U.esc(c.title) + '</span>' +
          '<span class="mt-1 text-sm text-ink-500">' + c.lesson_count + ' lessons · ' + U.esc(c.level) + '</span></span></button>';
      }
      function paint() {
        U.$$('[data-pick]').forEach(function (b) {
          var on = picked.indexOf(b.dataset.pick) >= 0;
          b.setAttribute('aria-pressed', on);
          b.className = b.className.replace(/border-sky-600 bg-sky-50\/60 shadow-card|border-line bg-white hover:border-sky-300/,
            on ? 'border-sky-600 bg-sky-50/60 shadow-card' : 'border-line bg-white hover:border-sky-300');
          var tick = b.querySelector('.absolute');
          if (on && !tick) b.querySelector('span').insertAdjacentHTML('beforeend', '<span class="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-sky-600 text-white">' + U.icon('check', 'i-sm') + '</span>');
          if (!on && tick) tick.remove();
        });
        U.$('#pick-count').textContent = picked.length + ' of ' + d.remaining + ' chosen';
        U.$('#pick-save').disabled = picked.length === 0;
        U.$('#pick-save').textContent = picked.length ? 'Add ' + picked.length + ' course' + (picked.length === 1 ? '' : 's') + ' to my library' : 'Choose your courses';
      }
      // The reward follows the learner's own package, not the site default.
      var myPkg = me.package ? st.packageMap[me.package.slug] : null;
      var perCourse = U.courseReward(myPkg);
      view.innerHTML = head('Choose your courses',
          'Your ' + U.esc(d.package) + ' package lets you pick ' + d.slots + ' course' + (d.slots === 1 ? '' : 's') + '. ' +
          d.remaining + ' left to choose.') +
        (perCourse ? '<div class="mb-5 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-[15px]">' + U.icon('wallet', 'text-orange-600 mt-0.5') +
          '<p>Finish a course and <b>' + U.inr(perCourse) + '</b> goes to your wallet. All ' + d.slots + ' courses = <b>' + U.inr(perCourse * d.slots) + '</b>.</p></div>' : '') +
        '<div class="sticky top-[76px] z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-card backdrop-blur">' +
          '<p class="font-semibold" id="pick-count">0 of ' + d.remaining + ' chosen</p>' +
          '<button class="btn btn-buy" id="pick-save" disabled>Choose your courses</button></div>' +
        '<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">' + open.map(card1).join('') + '</div>' +
        '<p class="mt-5 text-sm text-ink-500">Choices are final. If you need a change later, contact support.</p>';

      view.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pick]'); if (!b) return;
        var slug = b.dataset.pick, i = picked.indexOf(slug);
        if (i >= 0) picked.splice(i, 1);
        else if (picked.length < d.remaining) picked.push(slug);
        else { U.toast('You can choose ' + d.remaining + ' course' + (d.remaining === 1 ? '' : 's') + '. Remove one first.', null, true); return; }
        paint();
      });
      U.$('#pick-save').addEventListener('click', function () {
        var btn = this;
        if (!picked.length) return;
        U.busy(btn, true, 'Adding');
        A.chooseCourses(picked).then(function (r) {
          U.setMe(r.user); me = r.user; side();
          U.toast(picked.length + ' course' + (picked.length === 1 ? '' : 's') + ' added. Start learning now.');
          location.hash = r.remaining ? '#choose' : '#courses';
          if (!r.remaining) U.$('#nav-choose').classList.add('hidden');
          route();
        }, function (err) { U.busy(btn, false); U.toast(err.message, null, true); });
      });
      paint();
    }, fail);
  }

  /* ---------- certificates ---------- */
  function certificates() {
    loading();
    A.myCertificates().then(function (list) {
      var issued = list.map(function (c) { return c.course.slug; });
      var inprog = me.owned_courses.filter(function (s) { return issued.indexOf(s) < 0; });
      view.innerHTML = head('Certificates', 'Issued after you pass every lesson quiz in a course.') +
        (list.length ? '<div class="grid gap-6 xl:grid-cols-2">' + list.map(function (c) {
          var dt = new Date(c.issued_at);
          var li = 'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=' + encodeURIComponent(c.course.title) + '&organizationName=' + encodeURIComponent(st.site.settings.brand) + '&issueYear=' + dt.getFullYear() + '&issueMonth=' + (dt.getMonth() + 1) + '&certId=' + c.code + '&certUrl=' + encodeURIComponent(STS.cert.verifyUrl(c.code));
          return card('<a href="certificate.html?id=' + c.code + '" class="block" aria-label="Open certificate">' + STS.cert.render(c) + '</a><div class="mt-5 flex flex-wrap items-center justify-between gap-3"><div><p class="font-semibold">' + U.esc(c.course.title) + '</p><p class="text-sm text-ink-500 tabular">' + c.code + ', issued ' + U.date(c.issued_at) + '</p></div>' +
            '<div class="flex flex-wrap gap-2"><button class="btn btn-ghost btn-sm" data-copy-v="' + c.code + '">' + U.icon('copy', 'i-sm') + 'Verify link</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + li + '">Add to LinkedIn</a><a class="btn btn-primary btn-sm" href="certificate.html?id=' + c.code + '">Open</a></div></div>', 'p-5');
        }).join('') + '</div>' : card('<p class="font-display text-xl font-semibold">No certificates yet</p><p class="mt-1 text-ink-600">Complete every lesson in a course to get your first one.</p>')) +
        (inprog.length ? '<h2 class="mt-10 text-2xl">On the way</h2><div class="mt-4 grid gap-3">' + inprog.map(function (s) {
          var c = st.courseMap[s], p = me.progress[s] || { done: 0, total: 0, pct: 0 }; if (!c) return '';
          return '<div class="flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-white p-4"><span class="h-10 w-10 flex-none overflow-hidden rounded-xl" style="background:' + c.color + '">' + U.cover(c) + '</span><div class="min-w-[180px] flex-1"><p class="font-semibold">' + U.esc(c.title) + '</p><div class="mt-2 flex items-center gap-3"><div class="meter max-w-[240px]"><span style="width:' + p.pct + '%"></span></div><span class="text-sm text-ink-500 tabular">' + (p.total - p.done) + ' lessons to go</span></div></div><a class="btn btn-ghost btn-sm" href="course.html?c=' + s + '">Continue</a></div>';
        }).join('') + '</div>' : '');
      U.$$('[data-copy-v]', view).forEach(function (b) { b.addEventListener('click', function () { U.copy(STS.cert.verifyUrl(b.dataset.copyV), 'Verify link'); }); });
    }, fail);
  }

  /* ---------- wallet ---------- */
  var txFilter = 'all';
  function wallet() {
    loading();
    A.wallet(txFilter).then(function (r) {
      var b = r.balances, list = r.transactions;
      view.innerHTML = head('Wallet', 'Cashback from referrals and rewards from play, in one place.') +
        '<div class="grid gap-4 sm:grid-cols-3">' +
        '<div class="rounded-3xl bg-gradient-to-br from-sky-700 to-sky-500 p-6 text-white"><p class="text-sky-100">Available</p><p class="mt-2 font-display text-4xl font-semibold tabular">' + U.inr(b.available) + '</p><p class="mt-1 text-sm text-sky-100">Ready to withdraw</p></div>' +
        '<div class="rounded-3xl border border-line bg-white p-6"><p class="text-ink-600">Pending</p><p class="mt-2 font-display text-4xl font-semibold tabular">' + U.inr(b.pending + b.locked + b.under_review) + '</p><p class="mt-1 text-sm text-ink-500">' + (b.locked ? U.inr(b.locked) + ' waits for your first course' : b.under_review ? U.inr(b.under_review) + ' under review' : 'In the ' + b.hold_days + '-day refund window') + '</p></div>' +
        '<div class="rounded-3xl border border-line bg-white p-6"><p class="text-ink-600">Earned so far</p><p class="mt-2 font-display text-4xl font-semibold tabular">' + U.inr(b.earned) + '</p><p class="mt-1 text-sm text-ink-500">' + U.inr(b.withdrawn) + ' withdrawn</p></div></div>' +
        (b.can_withdraw ? '' : '<div class="mt-4 flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-[15px]">' + U.icon('graduation-cap', 'mt-0.5 text-sky-700') + '<p><b>Learn first, then withdraw.</b> Complete any one course to unlock withdrawals. Your cashback is safe and keeps adding up until then.</p></div>') +
        '<div class="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">' +
        card('<h2 class="text-xl">Withdraw to UPI</h2><p class="mt-1 text-sm text-ink-600">Minimum ' + U.inr(b.min_withdrawal) + '. We pay it within ' + b.payout_hours + ' hours.</p>' +
          (b.blocked_by_play_cap ? '<div class="mt-4 flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-[15px]">' + U.icon('gamepad-2', 'mt-0.5 text-orange-600') +
            '<p><b>' + U.inr(b.play_cap_left) + ' of a withdrawal can be play money.</b> You can take out ' + U.inr(b.withdrawable_now) + ' now. Finish a course or refer a friend to unlock the other ' + U.inr(b.blocked_by_play_cap) + '.</p></div>' : '') +
          '<form class="mt-5 grid gap-4" id="wd" novalidate><div><label class="label" for="wd-amt">Amount</label><div class="relative" data-field><span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500">₹</span><input class="input pl-8 tabular" id="wd-amt" name="amount" inputmode="numeric" value="' + (b.withdrawable_now >= b.min_withdrawal ? b.withdrawable_now : '') + '" placeholder="' + b.min_withdrawal + '"></div>' +
          '<div class="mt-2 flex flex-wrap gap-2">' + [50, 100, 500].filter(function (v) { return v <= b.withdrawable_now && v >= b.min_withdrawal; }).map(function (v) { return '<button type="button" class="chip !py-1 !text-xs" data-amt="' + v + '">' + U.inr(v) + '</button>'; }).join('') + (b.withdrawable_now >= b.min_withdrawal ? '<button type="button" class="chip !py-1 !text-xs" data-amt="' + b.withdrawable_now + '">All ' + U.inr(b.withdrawable_now) + '</button>' : '') + '</div></div>' +
          '<div><label class="label" for="wd-upi">UPI ID</label><input class="input" id="wd-upi" name="upi" value="' + U.esc(r.upi_id || '') + '" placeholder="name@okhdfc" autocomplete="off"></div>' +
          '<button class="btn btn-primary btn-block"' + (b.can_withdraw && b.withdrawable_now >= b.min_withdrawal ? '' : ' disabled') + '>' + U.icon('send', 'i-sm') + 'Request withdrawal</button>' +
          (b.can_withdraw && b.withdrawable_now < b.min_withdrawal ? '<p class="text-center text-sm text-ink-500">You need ' + U.inr(b.min_withdrawal - b.withdrawable_now) + ' more to withdraw.</p>' : '') +
          '<p class="text-center text-xs text-ink-500">We email the team the moment you ask, and reply with the status.</p></form>') +
        card('<div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl">Transactions</h2><div class="seg" role="group" aria-label="Filter">' + [['all', 'All'], ['cashback', 'Cashback'], ['play', 'Play'], ['withdrawal', 'Withdrawals']].map(function (f) { return '<button data-f="' + f[0] + '" aria-pressed="' + (txFilter === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div></div>' +
          (list.length ? '<ul class="mt-4 divide-y divide-line">' + list.map(function (t) {
            var ic = { cashback: 'gift', daily: 'zap', monthly: 'trophy', course: 'graduation-cap', play: 'gamepad-2', withdrawal: 'banknote', checkout: 'ticket', adjustment: 'sliders-horizontal' }[t.kind] || 'wallet';
            return '<li class="flex items-center gap-3 py-3"><span class="grid h-10 w-10 flex-none place-items-center rounded-2xl ' + (t.amount > 0 ? 'bg-sky-50 text-sky-700' : 'bg-cloud text-ink-500') + '">' + U.icon(ic, 'i-sm') + '</span>' +
              '<div class="min-w-0 flex-1"><p class="truncate text-[15px] font-medium">' + U.esc(t.title) + '</p><p class="text-xs text-ink-500">' + U.esc(t.kind_label) + ', ' + U.date(t.created_at) + (t.status === 'pending' ? ', unlocks ' + U.ago(t.available_at) : '') + (t.utr ? ', ref ' + U.esc(t.utr) : '') + (t.note ? ', ' + U.esc(t.note) : '') + '</p></div>' +
              '<div class="text-right"><p class="font-semibold tabular ' + (t.amount > 0 ? 'text-good-600' : '') + '">' + (t.amount > 0 ? '+' : '−') + U.inr(Math.abs(t.amount)) + '</p>' + pill(t.status) + '</div></li>';
          }).join('') + '</ul>' : '<p class="mt-6 text-ink-500">Nothing here yet. Cashback and play rewards will show up in this list.</p>'), 'p-6') + '</div>';
      U.$$('[data-f]', view).forEach(function (bt) { bt.addEventListener('click', function () { txFilter = bt.dataset.f; wallet(); }); });
      U.$$('[data-amt]', view).forEach(function (bt) { bt.addEventListener('click', function () { U.$('#wd-amt').value = bt.dataset.amt; }); });
      var f = U.$('#wd');
      f.addEventListener('submit', function (e) {
        e.preventDefault(); U.fieldError(f, null);
        var bt = f.querySelector('button.btn-primary'); U.busy(bt, true, 'Sending request');
        A.withdraw(U.$('#wd-amt').value, U.$('#wd-upi').value).then(function () { U.toast('Withdrawal requested', 'banknote'); wallet(); }, function (err) { U.busy(bt, false); U.failure(err, f); });
      });
    }, fail);
  }

  /* ---------- refer ---------- */
  function refer() {
    if (!me.referral_code) {
      view.innerHTML = head('Refer & earn') + card('<div class="max-w-xl"><p class="font-display text-2xl font-semibold">Your code arrives with your first purchase</p><p class="mt-2 text-ink-600">Buy any package or course and you get a personal code. Friends who use it save ' + U.inr(st.site.settings.referral.friend_discount) + ', and you get cashback on what they pay. One level only.</p><a class="btn btn-buy mt-6" href="packages.html">See packages</a></div>');
      return;
    }
    loading();
    A.referrals().then(function (r) {
      var R = st.site.settings.referral;
      view.innerHTML = head('Refer & earn', 'Share your code. Friends save ' + U.inr(R.friend_discount) + '. You get ' + r.cashback_percent + '% cashback.') +
        '<div class="grid gap-6 xl:grid-cols-[1.3fr_1fr]">' +
        '<div class="rounded-3xl bg-gradient-to-br from-sky-800 to-sky-600 p-6 text-white sm:p-8"><p class="text-sm text-sky-100">Your code</p><div class="mt-2 flex flex-wrap items-center gap-3"><span class="rounded-2xl bg-white/15 px-5 py-3 font-display text-3xl font-semibold tracking-wide">' + U.esc(r.code) + '</span><button class="btn btn-buy btn-sm" data-c="code">' + U.icon('copy', 'i-sm') + 'Copy code</button></div>' +
        '<p class="mt-6 text-sm text-sky-100">Invite link</p><div class="mt-2 flex gap-2"><input class="input !border-white/20 !bg-white/10 !text-white" value="' + U.esc(inviteLink()) + '" readonly aria-label="Invite link"><button class="btn border border-white/25 text-white hover:bg-white/10" data-c="link" aria-label="Copy link">' + U.icon('copy', 'i-sm') + '</button></div>' +
        '<div class="mt-6 flex flex-wrap gap-2"><a class="btn btn-buy" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(waText()) + '">' + U.icon('message-circle', 'i-sm') + 'Share on WhatsApp</a><button class="btn border border-white/25 text-white hover:bg-white/10" data-c="msg">' + U.icon('copy', 'i-sm') + 'Copy message</button></div></div>' +
        '<div class="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">' + [['users', 'Friends joined', r.friends], ['indian-rupee', 'Total cashback', U.inr(r.total_cashback)], ['clock', 'Pending', U.inr(r.pending)]].map(function (s) { return '<div class="stat flex items-center gap-4"><span class="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700">' + U.icon(s[0]) + '</span><div><p class="v !text-2xl">' + s[2] + '</p><p class="k">' + s[1] + '</p></div></div>'; }).join('') + '</div></div>' +
        bonusPanel(r.bonuses) +
        '<div class="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">' +
        card('<h2 class="text-xl">Your friends</h2>' + (r.referrals.length ? '<div class="mt-4 overflow-x-auto"><table class="tbl min-w-[520px]"><thead><tr><th>Friend</th><th>Bought</th><th class="text-right">Paid</th><th class="text-right">Your cashback</th><th>Status</th></tr></thead><tbody>' +
          r.referrals.map(function (x) { return '<tr><td><div class="flex items-center gap-2.5">' + U.avatar(x.name, 30) + '<div><p class="font-medium">' + U.esc(x.name) + '</p><p class="text-xs text-ink-500">' + U.date(x.created_at) + '</p></div></div></td><td>' + U.esc(x.bought) + '</td><td class="text-right tabular">' + U.inr(x.paid) + '</td><td class="text-right font-semibold tabular text-good-600">' + U.inr(x.cashback) + '</td><td>' + pill(x.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' :
          '<p class="mt-4 text-ink-600">No one has used your code yet. Share it with a friend who wants to learn the same skills.</p>'), 'p-6') +
        card('<h2 class="text-xl">What you get per friend</h2><p class="mt-1 text-sm text-ink-500">At your rate of ' + r.cashback_percent + '%, after their ' + U.inr(R.friend_discount) + ' discount.</p><ul class="mt-4 divide-y divide-line">' +
          st.site.packages.map(function (p) { var paid = Math.max(1, p.price - R.friend_discount); return '<li class="flex justify-between py-2.5 text-[15px]"><span>Friend buys ' + U.esc(p.name) + '</span><span class="font-semibold tabular">' + U.inr(Math.round(paid * r.cashback_percent / 100)) + '</span></li>'; }).join('') + '</ul>' +
          '<div class="mt-5 rounded-2xl bg-cloud p-4 text-sm text-ink-700"><p class="font-semibold text-ink-900">The rules, plainly</p><ul class="mt-2 list-disc space-y-1 pl-5"><li>Only friends who use your own code count. One level, nothing more.</li><li>Cashback is held ' + R.hold_days + ' days' + (R.learn_first ? ', then unlocks once you have completed a course' : '') + '.</li><li>Self-referrals and fake accounts are removed.</li></ul><a class="link mt-3 inline-block" href="legal.html#referral">Full referral terms</a></div>', 'p-6') + '</div>';
      view.querySelector('[data-c="code"]').addEventListener('click', function () { U.copy(r.code, 'Code'); });
      view.querySelector('[data-c="link"]').addEventListener('click', function () { U.copy(inviteLink(), 'Invite link'); });
      view.querySelector('[data-c="msg"]').addEventListener('click', function () { U.copy(waText(), 'Message'); });
    }, fail);
  }

  function bonusPanel(bn) {
    if (!bn || (!bn.daily_bonus && !bn.tiers.length)) return '';
    var daily = bn.daily_bonus
      ? '<div class="flex items-start gap-4 rounded-2xl ' + (bn.daily_done_today ? 'border border-good-200 bg-good-50' : 'bg-cloud') + ' p-5">' +
          '<span class="grid h-11 w-11 flex-none place-items-center rounded-2xl ' + (bn.daily_done_today ? 'bg-good-500 text-white' : 'bg-white text-orange-600') + '">' + U.icon('zap') + '</span>' +
          '<div><p class="font-semibold">Daily bonus · ' + U.inr(bn.daily_bonus) + '</p>' +
          '<p class="text-[15px] text-ink-600">' + (bn.daily_done_today
              ? 'Earned today. The next one is available tomorrow.'
              : 'Get one friend to buy today, on any package, and ' + U.inr(bn.daily_bonus) + ' is added on top of your cashback.') + '</p></div></div>'
      : '';
    var tiers = bn.tiers.length
      ? '<div class="mt-4"><div class="flex items-end justify-between"><p class="font-semibold">' + bn.month + ' milestones</p>' +
          '<p class="text-sm text-ink-600"><b class="tabular">' + bn.friends_this_month + '</b> friends so far</p></div>' +
          '<ul class="mt-3 space-y-2">' + bn.tiers.map(function (t) {
            return '<li class="flex items-center gap-3 rounded-xl border ' + (t.reached ? 'border-good-200 bg-good-50' : 'border-line') + ' px-4 py-2.5 text-[15px]">' +
              U.icon(t.reached ? 'check-circle-2' : 'circle', 'i-sm ' + (t.reached ? 'text-good-600' : 'text-ink-300')) +
              '<span class="flex-1">' + t.friends + ' friends in one month</span>' +
              '<b class="tabular ' + (t.reached ? 'text-good-700' : 'text-ink-500') + '">' + U.inr(t.bonus) + '</b></li>';
          }).join('') + '</ul>' +
          (bn.next_tier ? '<p class="mt-3 text-sm text-ink-600">' + bn.next_tier.to_go + ' more friend' + (bn.next_tier.to_go === 1 ? '' : 's') + ' this month unlocks ' + U.inr(bn.next_tier.bonus) + '.</p>' : '') +
        '</div>'
      : '';
    return '<div class="mt-6">' + card('<div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl">Bonuses on top of cashback</h2>' +
      '<span class="tag tag-orange">' + U.inr(bn.earned_this_month) + ' this month</span></div>' +
      '<div class="mt-4">' + daily + tiers + '</div>', 'p-6') + '</div>';
  }

  /* ---------- orders ---------- */
  function orders() {
    loading();
    A.myOrders().then(function (list) {
      var label = { paid: ['tag-good', 'Paid'], created: ['tag-orange', 'Awaiting payment'], failed: ['tag-bad', 'Failed'], refunded: ['tag-mute', 'Refunded'] };
      view.innerHTML = head('Orders', 'Your purchases and receipts.') + (list.length ? card('<div class="overflow-x-auto"><table class="tbl min-w-[600px]"><thead><tr><th>Order</th><th>Item</th><th>Date</th><th>Status</th><th class="text-right">Amount</th><th></th></tr></thead><tbody>' +
        list.map(function (o) { var l = label[o.status] || ['tag-mute', o.status]; return '<tr><td class="tabular">' + U.esc(o.number) + '</td><td>' + U.esc(o.title) + '</td><td>' + U.date(o.created_at) + '</td><td><span class="tag ' + l[0] + '">' + l[1] + '</span></td><td class="text-right font-semibold tabular">' + U.inr(o.amount) + '</td><td class="text-right">' + (o.status === 'paid' || o.status === 'refunded' ? '<button class="btn btn-ghost btn-sm" data-inv="' + o.number + '">Receipt</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>', 'p-2 sm:p-4') :
        card('<p class="text-ink-600">No orders yet.</p><a class="btn btn-buy mt-4" href="packages.html">See packages</a>'));
      U.$$('[data-inv]', view).forEach(function (bt) {
        bt.addEventListener('click', function () {
          var o = list.filter(function (x) { return x.number === bt.dataset.inv; })[0], gross = o.amount + o.discount + o.play_used, base = Math.round(gross / 1.18);
          U.modal({ title: 'Receipt', icon: 'receipt', sub: 'Order ' + U.esc(o.number), body: '<dl class="space-y-2 text-[15px]"><div class="flex justify-between"><dt class="text-ink-500">Billed to</dt><dd>' + U.esc(me.name) + '</dd></div><div class="flex justify-between"><dt class="text-ink-500">Date</dt><dd>' + U.date(o.paid_at || o.created_at) + '</dd></div><div class="flex justify-between"><dt class="text-ink-500">Paid by</dt><dd>' + U.esc(o.method || '—') + '</dd></div>' +
            '<div class="divider my-3"></div><div class="flex justify-between"><dt>' + U.esc(o.title) + '</dt><dd class="tabular">' + U.inr(base) + '</dd></div><div class="flex justify-between"><dt class="text-ink-500">GST 18%</dt><dd class="tabular">' + U.inr(gross - base) + '</dd></div>' +
            (o.discount ? '<div class="flex justify-between text-good-600"><dt>Referral discount</dt><dd class="tabular">−' + U.inr(o.discount) + '</dd></div>' : '') + (o.play_used ? '<div class="flex justify-between text-good-600"><dt>Play rewards</dt><dd class="tabular">−' + U.inr(o.play_used) + '</dd></div>' : '') +
            '<div class="divider my-3"></div><div class="flex justify-between font-semibold"><dt>Total paid</dt><dd class="tabular">' + U.inr(o.amount) + '</dd></div>' + (o.refund_amount ? '<div class="flex justify-between text-bad-600"><dt>Refunded</dt><dd class="tabular">' + U.inr(o.refund_amount) + '</dd></div>' : '') + '</dl><p class="mt-5 text-xs text-ink-500">' + U.esc(st.site.settings.brand) + ', ' + U.esc(st.site.settings.address) + '. Prices include GST.</p>' });
        });
      });
    }, fail);
  }

  /* ---------- profile ---------- */
  function profile() {
    view.innerHTML = head('Profile', 'Your details and payout settings.') +
      '<div class="grid gap-6 xl:grid-cols-2">' +
      card('<h2 class="text-xl">Personal details</h2><form class="mt-5 grid gap-4" id="pf" novalidate>' +
        '<div><label class="label" for="p-name">Full name</label><input class="input" id="p-name" name="name" value="' + U.esc(me.name) + '"><p class="hint">Printed on your certificates.</p></div>' +
        '<div><label class="label" for="p-email">Email</label><input class="input bg-cloud" id="p-email" value="' + U.esc(me.email) + '" disabled><p class="hint">Contact support to change your login email.</p></div>' +
        '<div class="grid gap-4 sm:grid-cols-2"><div><label class="label" for="p-phone">Mobile</label><input class="input tabular" id="p-phone" name="phone" value="' + U.esc(me.phone || '') + '" maxlength="10"></div><div><label class="label" for="p-city">City</label><input class="input" id="p-city" name="city" value="' + U.esc(me.city || '') + '"></div></div>' +
        '<button class="btn btn-primary justify-self-start">Save changes</button></form>') +
      card('<h2 class="text-xl">Payout details</h2><p class="mt-1 text-sm text-ink-600">Needed to withdraw cashback. PAN may be needed where tax rules apply to larger payouts.</p><form class="mt-5 grid gap-4" id="po" novalidate>' +
        '<div><label class="label" for="p-upi">UPI ID</label><input class="input" id="p-upi" name="upi_id" value="' + U.esc(me.upi_id || '') + '" placeholder="name@okhdfc"></div>' +
        '<div><label class="label" for="p-pan">PAN <span class="font-normal text-ink-500">(optional)</span></label><input class="input uppercase tabular" id="p-pan" name="pan" maxlength="10" placeholder="' + (me.pan_masked ? 'Saved: ' + U.esc(me.pan_masked) : 'ABCDE1234F') + '"></div>' +
        '<button class="btn btn-primary justify-self-start">Save payout details</button></form>') +
      card('<h2 class="text-xl">Security</h2><p class="mt-1 text-sm text-ink-600">Change your password or sign out of this device.</p><div class="mt-5 flex flex-wrap gap-2"><button class="btn btn-ghost" data-pw>' + U.icon('lock', 'i-sm') + 'Change password</button><button class="btn btn-ghost" data-logout>' + U.icon('log-out', 'i-sm') + 'Log out</button></div>') +
      card('<h2 class="text-xl">Your data</h2><p class="mt-1 text-sm text-ink-600">Member since ' + U.date(me.date_joined) + '. You can ask us to export or delete your data at any time.</p><button class="btn btn-ghost mt-5" data-del>Request account deletion</button>') + '</div>';
    function save(form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault(); U.fieldError(form, null);
        var patch = {}; U.$$('input[name]', form).forEach(function (i) { if (i.name !== 'pan' || i.value) patch[i.name] = i.value; });
        var bt = form.querySelector('button'); U.busy(bt, true, 'Saving');
        A.updateProfile(patch).then(function (u) { U.busy(bt, false); me = u; U.setMe(u); U.toast('Changes saved'); U.header(); side(); }, function (err) { U.busy(bt, false); U.failure(err, form); });
      });
    }
    save(U.$('#pf')); save(U.$('#po'));
    view.querySelector('[data-logout]').addEventListener('click', function () { A.logout().then(function () { location.href = 'index.html'; }); });
    view.querySelector('[data-pw]').addEventListener('click', function () {
      var m = U.modal({ title: 'Change password', icon: 'lock', body: '<form class="grid gap-4" id="cpw" novalidate><div><label class="label" for="cp-old">Current password</label><input class="input" id="cp-old" name="old_password" type="password" autocomplete="current-password"></div><div><label class="label" for="cp-new">New password</label><input class="input" id="cp-new" name="new_password" type="password" autocomplete="new-password"></div><button class="btn btn-primary">Update password</button></form>' });
      var f = m.body.querySelector('#cpw');
      f.addEventListener('submit', function (e) { e.preventDefault(); U.fieldError(f, null); var bt = f.querySelector('button'); U.busy(bt, true); A.changePassword(U.$('#cp-old').value, U.$('#cp-new').value).then(function () { m.close(); U.toast('Password updated. Other devices are logged out.'); }, function (err) { U.busy(bt, false); U.failure(err, f); }); });
    });
    view.querySelector('[data-del]').addEventListener('click', function () {
      U.modal({ title: 'Delete your account?', icon: 'alert-triangle', tone: 'bg-bad-50 text-bad-600', body: '<p class="text-ink-700">We will delete your progress, certificates and wallet balance after confirming by email. Pending cashback is lost. This cannot be undone.</p>',
        actions: [{ label: 'Keep my account', cls: 'btn-ghost', close: true }, { label: 'Send deletion request', cls: 'btn-danger', onClick: function (close) { A.deleteRequest('').then(function (r) { close(); U.toast('Request received. Ticket ' + r.ticket, 'mail'); }, function (e) { U.failure(e); }); } }] });
    });
  }

  function fail(err) { view.innerHTML = card('<p class="font-semibold">This section did not load</p><p class="mt-1 text-ink-600">' + U.esc(err.message) + '</p><button class="btn btn-ghost mt-4" onclick="location.reload()">Try again</button>'); }

  var views = { overview: overview, choose: choose, courses: courses, certificates: certificates, wallet: wallet, refer: refer, orders: orders, profile: profile };
  function route() {
    var t = (location.hash || '#overview').slice(1); if (!views[t]) t = 'overview';
    U.$$('[data-tab]').forEach(function (a) { if (a.dataset.tab === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var cur = U.$('[data-tab="' + t + '"]'); if (cur && window.innerWidth < 1024) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
    document.title = cur.textContent.trim() + ' | SkillToSuccess';
    views[t]();
  }

  U.boot().then(function (state) {
    st = state; me = U.requireAuth(); if (!me) return;
    if (me.package && me.package.courses_to_choose) U.$('#nav-choose').classList.remove('hidden');
    window.addEventListener('hashchange', function () { route(); window.scrollTo({ top: 0 }); });
    side(); route();
  });
})();
