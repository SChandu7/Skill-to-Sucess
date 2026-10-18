/* SkillToSuccess — "Mitra" chat assistant.
 * Tries the server assistant (Gemini, /chat/) when it is configured; otherwise uses the built-in answers below,
 * which read live prices and rules from the site data, so they are always up to date.
 */
window.STS = window.STS || {};

STS.chat = (function () {
  'use strict';
  var U = STS.ui, A = STS.api, C = STS.config;
  var KEY = 'sts:chat';
  var state = { open: false, history: [], flow: null, remote: C.CHAT_REMOTE };
  var els = {};
  function S() { return U.state.site; }
  function R() { return S().settings.referral; }
  function P() { return S().settings.play; }

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state.history.slice(-40))); } catch (e) { /* */ } }
  function restore() { try { state.history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { state.history = []; } }

  function pkgList() {
    return 'Here are the packages. Each is a one-time payment with lifetime access:<br>' +
      S().packages.map(function (p) { return '• <b>' + U.esc(p.name) + '</b>: ' + U.inr(p.price) + ' — ' + U.packageCourseLine(p).toLowerCase() + ', ' + U.inr(U.courseReward(p)) + ' back per course you finish, refer & earn at ' + p.cashback_percent + '%'; }).join('<br>') +
      '<br>You choose your own courses from the dashboard right after paying.' +
      '<br><a href="packages.html">Compare packages side by side</a>';
  }
  function courseInfo(c) {
    var p = U.cheapestPackageFor(c.slug);
    return '<b>' + U.esc(c.title) + '</b> (' + c.level + ', ' + c.lesson_count + ' lessons, about ' + c.hours + ' hours)' + (c.instructor ? ' with ' + U.esc(c.instructor.name) : '') + '.<br>' + U.esc(c.short_description) +
      '<br>Free preview lessons are open. Get it alone for ' + U.inr(c.price) + (p ? ' or pick it inside the ' + U.esc(p.name) + ' package (' + U.inr(p.price) + ') or any bigger one' : '') + '.<br><a href="course.html?c=' + c.slug + '">Open the course page</a>';
  }
  function findCourse(t) {
    var best = null;
    S().courses.forEach(function (c) {
      var words = (c.title + ' ' + c.slug.replace(/-/g, ' ')).toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length > 2 && ['and', 'for', 'the', 'with', 'your', 'get', 'first', 'everyday', 'work'].indexOf(w) < 0; });
      var hit = words.filter(function (w) { return t.indexOf(w) >= 0; }).length;
      if (hit && (!best || hit > best.hit)) best = { c: c, hit: hit };
    });
    return best && best.c;
  }

  var intents = [
    { id: 'human', re: /human|person|agent|call|phone|whatsapp|contact|support|talk to/, a: function () { var s = S().settings; return 'Our team is available ' + U.esc(s.hours) + ':<br>• Phone / WhatsApp: <b>' + U.esc(s.phone) + '</b><br>• Email: <b>' + U.esc(s.email) + '</b><br><a href="https://wa.me/' + s.whatsapp + '" target="_blank" rel="noopener">Open WhatsApp chat</a> or use the <a href="contact.html">contact form</a>.'; } },
    { id: 'guarantee', re: /guarantee|job guarantee|income|salary|how much can i earn|per month|mlm|scam|chain|level/, a: function () { return 'Straight answer: we sell courses, not income. There is no guaranteed job or earning.<br>Refer & earn is <b>one level only</b>. You get cashback when a friend buys with your code, and that is where it stops. No teams, no levels, no targets.'; } },
    { id: 'withdraw', re: /withdraw|payout|upi id|bank|transfer|redeem|cash out/, a: function () { var r = R(); return 'Withdrawals go to your UPI ID:<br>• Minimum ' + U.inr(r.min_withdraw) + '<br>• Cashback is held ' + r.hold_days + ' days (refund window)' + (r.learn_first ? '<br>• Complete at least one course to unlock withdrawals' : '') + '<br>• Paid within ' + r.payout_hours + ' hours of your request' +
      (r.withdraw_play_cap ? '<br>• Only ' + U.inr(r.withdraw_play_cap) + ' of a withdrawal can be Play &amp; earn money — the rest comes from finished courses and referrals' : '') +
      '<br><a href="dashboard.html#wallet">Open your wallet</a>'; } },
    { id: 'refer', re: /refer|referral|cashback|commission|invite|share code|my code/, a: function () {
      var u = U.state.me, r = R(), rates = S().packages.map(function (p) { return p.cashback_percent; });
      var you = u && u.referral_code ? '<br><br>Your code is <b>' + U.esc(u.referral_code) + '</b> and your rate is <b>' + u.cashback_percent + '%</b>. <a href="dashboard.html#refer">Share it</a>' : '<br><br>You get your code after your first purchase.';
      return 'Refer & earn, in short:<br>1. Buy any package and get your personal code<br>2. A friend buys with your code and gets ' + U.inr(r.friend_discount) + ' off<br>3. You get cashback: ' + Math.min.apply(null, rates) + '% to ' + Math.max.apply(null, rates) + '% of what they paid, based on your package<br><br>Only people <b>you</b> invite count. One level, nothing more.' + you;
    } },
    { id: 'refund', re: /refund|money back|cancel|return/, a: function () { return 'Course access opens right after payment, so purchases are generally non-refundable.<br>If you were charged twice, charged by mistake, or did not get access, write to <b>' + U.esc(S().settings.email) + '</b> within 7 days with your order ID.<br><a href="legal.html#refund">Read the refund policy</a>'; } },
    { id: 'upgrade', re: /upgrade|switch package|higher package|change plan/, a: function () { var ps = S().packages; var d = S().settings.upgrade_discount || 0, gap = ps.length > 1 ? ps[1].price - ps[0].price : 0;
      return 'You can upgrade any time and pay only the difference' + (d ? ', with ' + d + '% off that difference' : '') + '.' +
        (ps.length > 1 ? ' Example: ' + U.esc(ps[0].name) + ' to ' + U.esc(ps[1].name) + ' costs ' + U.inr(Math.max(1, gap - Math.round(gap * d / 100))) + '.' : '') +
        ' You then pick the extra courses, and your progress and certificates stay.<br><a href="packages.html">See packages</a>'; } },
    { id: 'cert', re: /certif|verify|verification/, a: function () { var q = S().settings.quiz; return 'Pass the quiz after each lesson (' + q.pass + ' of ' + q.questions + ' correct). Finish all lessons and your certificate is issued with a unique ID that anyone can check on our <a href="verify.html">verify page</a>.'; } },
    { id: 'pay', re: /pay|upi|card|emi|razorpay|gpay|phonepe|paytm|netbank/, a: function () { return 'We accept UPI (GPay, PhonePe, Paytm), debit and credit cards, and netbanking through Razorpay. Prices include GST. Access starts as soon as the payment is confirmed.'; } },
    { id: 'play', re: /play|game|quiz|reward|coin|free money/, a: function () { var p = P(); return 'Play & earn: learn and win small rewards.<br>• Free quizzes: ' + U.inr(p.per_correct) + ' per correct answer, up to ' + U.inr(p.per_quiz_cap) + ' a quiz<br>• Mini games: memory match, word scramble, rapid fire<br>• Up to ' + U.inr(p.daily_cap) + ' a day, and up to ' + U.inr(p.checkout_max) + ' can be used on your first package<br><a href="play.html">Start playing</a>'; } },
    { id: 'free', re: /free|preview|trial|demo|sample|before buy/, a: function () { return 'Every course has free preview lessons, an intro video and a PDF cheat sheet. Open any course from the <a href="courses.html">course list</a> and look for the "Free" tags.'; } },
    { id: 'coursereward', re: /finish|complete|reward for course|cashback for course|course reward|how much back|calculator/, a: function () {
      var cr = S().settings.course_reward || {};
      if (!cr.enabled) return 'Finish your lessons and you earn a certificate for each course.';
      return 'Finish a course and money goes to your wallet. Bigger packages pay more per course:<br>' +
        S().packages.map(function (p) { return '• ' + U.esc(p.name) + ' (' + U.inr(p.price) + '): <b>' + U.inr(U.courseReward(p)) + '</b> a course, up to ' + U.inr(p.max_course_cashback); }).join('<br>') +
        '<br>It counts when you pass every lesson quiz, waits ' + cr.hold_days + ' days, then you can withdraw it.<br><a href="packages.html#calc-h">Try the cashback calculator</a>';
    } },
    { id: 'gst', re: /gst|tax|invoice|bill|extra charge/, a: function () {
      var g = S().settings.gst || {};
      if (!g.percent) return 'The price you see is the price you pay. Nothing extra at checkout.';
      return 'The price already includes GST at ' + g.percent + '%. <b>Nothing is added at checkout.</b><br>' +
        S().packages.slice(0, 2).map(function (p) { var b = Math.round(p.price / (1 + g.percent / 100)); return '• ' + U.esc(p.name) + ' ' + U.inr(p.price) + ' = ' + U.inr(b) + ' course value + ' + U.inr(p.price - b) + ' GST'; }).join('<br>') +
        '<br>Your receipt email shows the split.';
    } },
    { id: 'jobs', re: /job|hiring|placement|work|career|interview/, a: function () {
      var j = S().settings.jobs || {};
      return j.live ? 'Job connect is open. <a href="jobs.html">See it here</a>.'
        : 'Job connect is coming soon. ' + U.esc(j.text || '') + '<br>Join the waiting list on the <a href="jobs.html">Job connect page</a>.';
    } },
    { id: 'choose', re: /choose|pick|select course|which course|my courses/, a: function () {
      return 'You pick your own courses.<br>1. Buy a package<br>2. Open <a href="dashboard.html#choose">Choose your courses</a> in your dashboard<br>3. Pick any courses from the library, up to the number your package allows<br>Choices are final, so pick carefully. Contact support if you need a change.';
    } },
    { id: 'access', re: /lifetime|validity|expire|how long|access/, a: function () { return 'Access is lifetime for the courses in your package, including updates to them.'; } },
    { id: 'login', re: /login|log in|password|forgot|account|sign up|register/, a: function () { return 'Log in with your email or mobile number on the <a href="login.html">login page</a>. Forgot the password? Tap "Forgot password" there to get a reset code by SMS.'; } },
    { id: 'progress', re: /my progress|my course|continue|where was i/, a: function () {
      var u = U.state.me; if (!u) return 'Log in to see your progress. <a href="login.html">Log in</a>';
      if (!u.owned_courses.length) return 'You have a free account. Free preview lessons are open in every course. <a href="courses.html">Browse courses</a>';
      return 'You have ' + u.owned_courses.length + ' courses.' + (u.last_lesson ? ' <a href="lesson.html?l=' + u.last_lesson.id + '">Continue "' + U.esc(u.last_lesson.title) + '"</a>.' : '') + ' <a href="dashboard.html#courses">See all progress</a>';
    } },
    { id: 'packages', re: /package|price|cost|fee|plan|how much|rate|charges/, a: pkgList },
    { id: 'courses', re: /course|what.*learn|topics|syllabus|list/, a: function () { return 'We have ' + S().courses.length + ' courses: ' + S().courses.map(function (c) { return '<a href="course.html?c=' + c.slug + '">' + U.esc(c.title) + '</a>'; }).join(', ') + '.'; } },
    { id: 'greet', re: /^(hi|hello|hey|namaste|namaskaram|hii+|good (morning|evening|afternoon))\b/, a: function () { var u = U.state.me; return 'Hi' + (u ? ' ' + U.esc(u.first_name) : '') + '! I am ' + C.ASSISTANT + '. Ask me about courses, prices, certificates or refer & earn.'; } },
    { id: 'thanks', re: /thank|thanks|^ok|okay|great|super/, a: function () { return 'Happy to help. Anything else?'; } }
  ];
  var START = ['Which package suits me?', 'Prices', 'How does refer & earn work?', 'Free lessons', 'Talk to a person'];
  var GOALS = [
    ['Grow on Instagram or YouTube', ['instagram', 'capcut', 'youtube']],
    ['Get freelance work', ['canva', 'capcut', 'freelancing']],
    ['Get a marketing job', ['digital-marketing', 'seo', 'meta-ads', 'personal-branding']],
    ['Grow my own business', ['digital-marketing', 'meta-ads', 'canva']],
    ['Use AI at work', ['ai-tools', 'personal-branding']]
  ];
  var BUDGETS = [['Under ₹1,000', 1000], ['₹1,000 to ₹3,000', 3000], ['Above ₹3,000', 1e9]];
  function recommend(gi, budget) {
    var want = GOALS[gi][1].filter(function (s) { return U.state.courseMap[s]; });
    var fits = S().packages.map(function (p) { return { p: p, hit: want.filter(function (s) { return p.courses.indexOf(s) >= 0; }).length }; });
    var inB = fits.filter(function (f) { return f.p.price <= budget; });
    var best = (inB.length ? inB : fits.slice().sort(function (a, b) { return a.p.price - b.p.price; }).slice(0, 1)).sort(function (a, b) { return b.hit - a.hit || a.p.price - b.p.price; })[0];
    var full = fits.filter(function (f) { return f.hit === want.length; }).sort(function (a, b) { return a.p.price - b.p.price; })[0];
    var p = best.p, covered = want.filter(function (s) { return p.courses.indexOf(s) >= 0; });
    var msg = 'For "' + GOALS[gi][0] + '", I suggest the <b>' + U.esc(p.name) + ' package</b> at ' + U.inr(p.price) + '.' + (covered.length ? '<br>It covers ' + covered.map(function (s) { return U.esc(U.state.courseMap[s].title); }).join(', ') + '.' : '');
    if (full && full.p.slug !== p.slug) msg += '<br>To get every course for this goal, ' + U.esc(full.p.name) + ' (' + U.inr(full.p.price) + ') covers all of them. You can upgrade later and pay only the difference.';
    return msg + '<br><a href="checkout.html?plan=' + p.slug + '">Get ' + U.esc(p.name) + '</a> or <a href="packages.html">compare packages</a>';
  }
  function answer(text) {
    var t = String(text).toLowerCase().trim();
    if (/which package|suits me|suggest|recommend|best for me|confused|help me choose/.test(t)) { state.flow = { step: 'goal' }; return { html: 'Happy to help you choose. What is your main goal?', chips: GOALS.map(function (g) { return g[0]; }) }; }
    if (state.flow) {
      if (state.flow.step === 'goal') { var gi = GOALS.findIndex(function (g) { return g[0].toLowerCase() === t; }); if (gi >= 0) { state.flow = { step: 'budget', goal: gi }; return { html: 'Got it. What budget are you comfortable with?', chips: BUDGETS.map(function (b) { return b[0]; }) }; } }
      else { var bi = BUDGETS.findIndex(function (b) { return b[0].toLowerCase() === t; }); if (bi >= 0) { var g = state.flow.goal; state.flow = null; return { html: recommend(g, BUDGETS[bi][1]), chips: ['How does refer & earn work?', 'Free lessons'] }; } }
      state.flow = null;
    }
    if (!/refer|refund|package|price|withdraw|cashback/.test(t)) { var c = findCourse(t); if (c) return { html: courseInfo(c), chips: ['Which package suits me?', 'Prices'] }; }
    for (var j = 0; j < intents.length; j++) if (intents[j].re.test(t)) return { html: intents[j].a(), chips: ['Which package suits me?', 'Talk to a person'] };
    return { html: 'I am not sure about that one. I can help with courses, packages, payments, certificates, refer & earn and play rewards. For anything else, our team is on WhatsApp at <b>' + U.esc(S().settings.phone) + '</b>.', chips: START };
  }

  function mount() {
    if (els.fab) return;
    restore();
    els.fab = U.h('<button class="chat-fab btn btn-primary !rounded-full !py-3.5 !pl-4 !pr-5 shadow-pop" aria-expanded="false" aria-controls="chat-panel">' + U.icon('message-circle') + '<span class="hidden sm:inline">Ask ' + C.ASSISTANT + '</span></button>');
    els.fab.addEventListener('click', function () { if (state.open) close(); else open(); });
    document.body.appendChild(els.fab);
  }
  function build() {
    els.panel = U.h('<section id="chat-panel" class="chat-panel" role="dialog" aria-label="Chat with ' + C.ASSISTANT + '">' +
      '<header class="flex items-center gap-3 border-b border-line bg-sky-50/60 px-4 py-3"><span class="grid h-10 w-10 place-items-center rounded-full bg-sky-600 text-white">' + U.icon('sparkles') + '</span>' +
      '<div class="min-w-0 flex-1"><p class="font-display font-semibold">' + C.ASSISTANT + '</p><p class="flex items-center gap-1.5 text-xs text-ink-500"><span class="h-1.5 w-1.5 rounded-full bg-good-500"></span>Answers instantly</p></div>' +
      '<button class="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-white" data-clear aria-label="Start over" title="Start over">' + U.icon('rotate-ccw', 'i-sm') + '</button>' +
      '<button class="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-white" data-close aria-label="Close chat">' + U.icon('x') + '</button></header>' +
      '<div class="flex-1 space-y-3 overflow-y-auto px-4 py-4" data-log aria-live="polite"></div>' +
      '<div class="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none" data-chips></div>' +
      '<form class="flex items-center gap-2 border-t border-line p-3" data-form><label for="chat-in" class="sr-only">Message</label><input id="chat-in" class="input !rounded-full !py-2.5" placeholder="Ask about courses, prices, cashback…" autocomplete="off" maxlength="300">' +
      '<button class="grid h-11 w-11 flex-none place-items-center rounded-full bg-sky-600 text-white hover:bg-sky-700" aria-label="Send">' + U.icon('send', 'i-sm') + '</button></form>' +
      '<p class="px-4 pb-3 text-center text-[11px] text-ink-400">Automated answers. Prices on the pricing page are final.</p></section>');
    els.log = els.panel.querySelector('[data-log]'); els.chips = els.panel.querySelector('[data-chips]'); els.input = els.panel.querySelector('#chat-in');
    els.panel.querySelector('[data-close]').addEventListener('click', close);
    els.panel.querySelector('[data-clear]').addEventListener('click', function () { state.history = []; state.flow = null; save(); els.log.innerHTML = ''; welcome(); });
    els.panel.querySelector('[data-form]').addEventListener('submit', function (e) { e.preventDefault(); var v = els.input.value.trim(); if (v) { els.input.value = ''; send(v); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) close(); });
    document.body.appendChild(els.panel);
    if (state.history.length) state.history.forEach(function (m) { bubble(m.role, m.html, true); }); else welcome();
  }
  function welcome() { var u = U.state.me; push('bot', 'Hi' + (u ? ' ' + U.esc(u.first_name) : '') + ', I am ' + C.ASSISTANT + '. I can help you pick a package, explain refer & earn, or find a course.'); chips(START); }
  function bubble(role, html, quiet) { var b = U.h('<div class="bubble ' + (role === 'me' ? 'me' : 'bot') + '"' + (quiet ? ' style="animation:none"' : '') + '></div>'); b.innerHTML = html; els.log.appendChild(b); els.log.scrollTop = els.log.scrollHeight; }
  function push(role, html) { state.history.push({ role: role, html: html }); save(); bubble(role, html); }
  function chips(list) { els.chips.innerHTML = ''; (list || []).forEach(function (c) { var b = U.h('<button class="chip flex-none !py-1.5 !text-[13px]">' + U.esc(c) + '</button>'); b.addEventListener('click', function () { send(c); }); els.chips.appendChild(b); }); }
  function send(text) {
    if (!els.panel) build();
    push('me', U.esc(text)); chips([]);
    var typing = U.h('<div class="bubble bot typing" aria-label="Typing"><span></span><span></span><span></span></div>');
    els.log.appendChild(typing); els.log.scrollTop = els.log.scrollHeight;
    var done = function (res) { typing.remove(); push('bot', res.html); chips(res.chips); };
    var local = answer(text);
    var guided = state.flow || /which package|suits me|recommend/.test(text.toLowerCase()) || GOALS.some(function (g) { return g[0] === text; }) || BUDGETS.some(function (b) { return b[0] === text; });
    if (state.remote && !guided && local.chips === START) {
      var msgs = state.history.map(function (m) { return { role: m.role === 'me' ? 'user' : 'model', text: m.html.replace(/<[^>]+>/g, ' ') }; });
      A.chat(msgs).then(function (r) { done({ html: U.esc(r.reply).replace(/\n/g, '<br>'), chips: r.chips && r.chips.length ? r.chips : ['Which package suits me?', 'Talk to a person'] }); },
        function (e) { if (e.code === 'chat_unavailable') state.remote = false; done(local); });
    } else setTimeout(function () { done(local); }, 350 + Math.min(800, text.length * 10));
  }
  function open() { if (!els.panel) build(); state.open = true; els.panel.hidden = false; els.fab.setAttribute('aria-expanded', 'true'); els.fab.innerHTML = U.icon('x') + '<span class="hidden sm:inline">Close</span>'; setTimeout(function () { els.input.focus(); }, 50); }
  function close() { state.open = false; if (els.panel) els.panel.hidden = true; els.fab.setAttribute('aria-expanded', 'false'); els.fab.innerHTML = U.icon('message-circle') + '<span class="hidden sm:inline">Ask ' + C.ASSISTANT + '</span>'; els.fab.focus(); }

  return { mount: mount, open: open, ask: function (t) { open(); send(t); } };
})();
