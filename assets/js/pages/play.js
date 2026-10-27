/* Play & earn: daily quizzes and three quick games. The server times, checks and pays every round. */
(function () {
  'use strict';
  var U = STS.ui, A = STS.api;
  var data = null, settings = null, current = null;   // current = { stop() } for the running round

  var GAMES = {
    memory: { title: 'Memory match', icon: 'brain', tone: 'bg-sky-50 text-sky-700', blurb: 'Match 6 terms with their meanings before 60 seconds run out.', reward: 'Up to ₹3' },
    scramble: { title: 'Word scramble', icon: 'shuffle', tone: 'bg-orange-50 text-orange-700', blurb: 'Unscramble 5 words from digital skills. A hint helps with each one.', reward: '₹1 per word, up to ₹3' },
    rapid: { title: 'Rapid fire', icon: 'zap', tone: 'bg-good-50 text-good-700', blurb: '10 true or false statements in 30 seconds. Trust your first answer.', reward: 'Up to ₹2' }
  };
  var NOTES = {
    already_paid_today: 'You already earned from this one today, so this round is just for practice. Try another game or quiz.',
    total_cap: 'You have collected your full Play & earn reward. Keep playing for practice and XP.',
    daily_cap: 'You have collected your full Play & earn reward. Keep playing for practice and XP.',
    ip_cap: 'Rewards from this network are used up for today. Try again tomorrow.',
    too_slow: 'Time ran out before you submitted, so this round has no reward.'
  };

  /* ------------------------------------------------------------------ lobby */
  function load() {
    return A.play().then(function (d) { data = d; renderLobby(); }, function (err) { U.$('#games').innerHTML = '<p class="text-bad-600">' + U.esc(err.message) + '</p>'; });
  }

  function renderLobby() {
    var me = U.state.me, d = data;
    U.$('#paused').hidden = d.enabled;
    var cap = d.total_cap, got = d.earned_total || 0;
    var pct = cap ? Math.min(100, Math.round(got / cap * 100)) : 0;
    U.$('#today').innerHTML =
      '<div class="flex items-center justify-between"><p class="text-sm font-semibold text-ink-500">Your Play &amp; earn reward</p><span class="tag tag-orange">' + U.icon('flame', 'i-sm') + (me ? me.streak_days + '-day streak' : 'Guest') + '</span></div>' +
      '<p class="mt-2 font-display text-[40px] font-semibold leading-none tabular">' + U.inr(got) + (cap ? '<span class="text-lg font-medium text-ink-400"> / ' + U.inr(cap) + '</span>' : '') + '</p>' +
      (cap ? '<p class="mt-1 text-sm text-ink-500">' + (got >= cap ? 'Fully collected. Games still count for XP.' : U.inr(cap - got) + ' left to earn, once per account') + '</p>' : '') +
      '<div class="meter mt-4"><span style="width:' + pct + '%"></span></div>' +
      (me ? '<p class="mt-4 text-sm text-ink-600">Rewards land in your wallet. Take them off a package price at checkout, or withdraw them with your other earnings. <a class="link" href="dashboard.html#wallet">Open wallet</a></p>'
        : '<div class="mt-4 rounded-2xl bg-sky-50 p-4 text-[15px]">' + (d.guest_unclaimed ? '<p class="font-semibold text-sky-800">' + U.inr(d.guest_unclaimed) + ' is waiting for you.</p>' : '') +
          '<p class="text-ink-700">You can play as a guest. Create a free account to keep your rewards in a wallet.</p><a class="btn btn-primary btn-sm mt-3" href="login.html?next=play.html#register">Create free account</a></div>');

    U.$('#games').innerHTML = d.games.map(function (g) {
      var m = GAMES[g.kind];
      return '<article class="card flex flex-col p-5">' +
        '<div class="flex items-start justify-between"><span class="grid h-12 w-12 place-items-center rounded-2xl ' + m.tone + '">' + U.icon(m.icon, 'i-lg') + '</span>' + (g.paid_today ? '<span class="tag tag-good">' + U.icon('check', 'i-sm') + 'Earned today</span>' : '<span class="tag tag-mute">' + m.reward + '</span>') + '</div>' +
        '<h3 class="mt-4 text-lg">' + m.title + '</h3><p class="mt-1 flex-1 text-[15px] text-ink-600">' + m.blurb + '</p>' +
        '<button class="btn ' + (g.paid_today ? 'btn-ghost' : 'btn-primary') + ' mt-5" data-game="' + g.kind + '"' + (!g.ready || !d.enabled ? ' disabled' : '') + '>' + (g.ready ? (g.paid_today ? 'Practice again' : 'Play now') : 'Coming soon') + '</button></article>';
    }).join('');

    U.$('#quiz-sub').textContent = 'One quiz per course. Each correct answer earns ' + U.inr(d.per_correct) + ', up to ' + U.inr(d.per_quiz_cap) + ' a quiz.';
    U.$('#topics').innerHTML = d.topics.length ? d.topics.map(function (t) {
      return '<article class="card flex gap-4 p-4">' +
        '<div class="relative h-20 w-20 flex-none overflow-hidden rounded-2xl" style="background:' + t.course.color + '">' + U.cover({ cover: t.course.cover, color: t.course.color, code: t.course.title.slice(0, 2).toUpperCase() }, 'h-full w-full object-cover') + '</div>' +
        '<div class="flex min-w-0 flex-1 flex-col"><h3 class="text-base leading-snug">' + U.esc(t.title) + '</h3>' +
        '<p class="mt-1 text-sm text-ink-500">' + t.questions + ' questions · ' + t.seconds + ' sec each</p>' +
        '<div class="mt-auto flex flex-wrap items-center gap-2 pt-3">' + (t.paid_today ? '<span class="tag tag-good">' + U.icon('check', 'i-sm') + 'Earned today</span>' : '') +
        '<button class="btn btn-soft btn-sm ml-auto" data-topic="' + t.id + '"' + (d.enabled ? '' : ' disabled') + '>' + (t.paid_today ? 'Practice' : 'Start quiz') + U.icon('arrow-right', 'i-sm') + '</button></div></div></article>';
    }).join('') : '<p class="text-ink-500">Quizzes will appear here soon.</p>';

    U.$('#board').innerHTML = d.leaderboard.length ? d.leaderboard.map(function (r, i) {
      var rank = r.rank || i + 1;
      return '<li class="flex items-center gap-3 rounded-xl px-2 py-2 ' + (r.me ? 'bg-sky-50' : '') + '"><span class="w-6 text-center font-display text-sm font-semibold ' + (rank <= 3 ? 'text-orange-500' : 'text-ink-400') + '">' + rank + '</span>' + U.avatar(r.name, 32) +
        '<span class="min-w-0 flex-1"><span class="block truncate text-[15px] font-semibold">' + U.esc(r.name) + (r.me ? ' (you)' : '') + '</span>' + (r.city ? '<span class="block truncate text-xs text-ink-500">' + U.esc(r.city) + '</span>' : '') + '</span><span class="text-sm font-semibold tabular text-ink-700">' + U.num(r.xp) + ' XP</span></li>';
    }).join('') : '<li class="text-sm text-ink-500">Be the first on the board.</li>';

    U.$('#rules').innerHTML = [
      ['indian-rupee', 'Each game and each quiz pays once a day. Play again any time for practice.'],
      ['target', 'You can earn up to ' + U.inr(d.total_cap) + ' in total per account. It is a one-time reward, not daily.'],
      ['shopping-bag', 'Use it to reduce a package price at checkout, or withdraw it with your other earnings.'],
      ['timer', 'Rounds are timed on our server, so answers after time is up do not count.']
    ].map(function (r) { return '<li class="flex gap-3">' + U.icon(r[0], 'mt-0.5 flex-none text-sky-600') + '<span>' + r[1] + '</span></li>'; }).join('');
  }

  /* ------------------------------------------------------------------ stage helpers */
  var stage = function () { return U.$('#stage'); };
  function openStage(title, sub, iconName) {
    U.$('#lobby').hidden = true;
    var s = stage(); s.hidden = false;
    s.innerHTML = '<div class="mb-6 flex items-center gap-3"><button class="btn btn-ghost btn-sm" data-leave>' + U.icon('arrow-left', 'i-sm') + 'Back</button>' +
      '<div class="ml-1 min-w-0"><p class="flex items-center gap-2 font-display text-lg font-semibold">' + U.icon(iconName, 'text-sky-600') + U.esc(title) + '</p>' + (sub ? '<p class="truncate text-sm text-ink-500">' + U.esc(sub) + '</p>' : '') + '</div></div>' +
      '<div class="card p-5 sm:p-8" data-board><div class="skel h-48"></div></div>';
    s.querySelector('[data-leave]').addEventListener('click', leave);
    window.scrollTo({ top: 0 });
    return s.querySelector('[data-board]');
  }
  function leave() {
    if (current) { current.stop(); current = null; }
    stage().hidden = true; stage().innerHTML = '';
    U.$('#lobby').hidden = false;
    load();
  }
  function countdown(el, seconds, onEnd) {
    var left = seconds, bar = el.querySelector('[data-bar]'), txt = el.querySelector('[data-left]');
    function paint() {
      if (txt) txt.textContent = left + 's';
      if (bar) { bar.style.width = (left / seconds * 100) + '%'; bar.style.background = left <= 5 ? '#E0473A' : '#FF9A3D'; }
    }
    paint();
    var t = setInterval(function () { left--; paint(); if (left <= 0) { clearInterval(t); t = null; onEnd(); } }, 1000);
    return { stop: function () { if (t) { clearInterval(t); t = null; } }, left: function () { return left; } };
  }
  function timerBar() {
    return '<div class="flex items-center gap-3"><div class="meter !h-2 flex-1"><span data-bar style="width:100%;transition:width 1s linear,background .3s"></span></div><span class="w-10 text-right font-display font-semibold tabular" data-left></span></div>';
  }

  function result(board, r, o) {
    var won = r.reward > 0, me = U.state.me;
    if (won) U.confetti();
    board.innerHTML = '<div class="text-center">' +
      '<span class="mx-auto grid h-16 w-16 place-items-center rounded-3xl ' + (won ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-700') + ' animate-pop">' + U.icon(won ? 'trophy' : 'target', 'i-lg') + '</span>' +
      '<p class="mt-5 text-sm font-semibold text-ink-500">' + (o.scoreLabel || 'Your score') + '</p>' +
      '<p class="font-display text-5xl font-semibold tabular">' + r.score + '<span class="text-2xl text-ink-400">/' + r.total + '</span></p>' +
      '<p class="mt-4 text-lg">' + (won ? 'You earned <b class="text-orange-600">' + U.inr(r.reward) + '</b>' + (me ? ', added to your wallet.' : '.') : 'No reward this round.') + '</p>' +
      (r.reward_note && NOTES[r.reward_note] ? '<p class="mx-auto mt-2 max-w-md text-[15px] text-ink-600">' + NOTES[r.reward_note] + '</p>' : '') +
      (r.total_cap ? '<p class="mt-3 text-sm text-ink-500">Collected: ' + U.inr(r.earned_total) + ' of ' + U.inr(r.total_cap) + ' (once per account)</p>' : '') +
      (won && !me ? '<div class="mx-auto mt-6 max-w-md rounded-2xl bg-sky-50 p-4 text-[15px] text-ink-700">Guest rewards are kept in this browser for 7 days. <a class="link" href="login.html?next=play.html#register">Create a free account</a> to move them to your wallet.</div>' : '') +
      '</div>' + (o.review || '') +
      '<div class="mt-8 flex flex-col justify-center gap-2 sm:flex-row"><button class="btn btn-primary" data-again>' + U.icon('rotate-ccw', 'i-sm') + 'Play again</button><button class="btn btn-ghost" data-back>More games and quizzes</button></div>';
    board.querySelector('[data-again]').addEventListener('click', o.again);
    board.querySelector('[data-back]').addEventListener('click', leave);
  }
  function failed(board, err) {
    board.innerHTML = '<div class="py-6 text-center"><span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bad-50 text-bad-600">' + U.icon('alert-triangle') + '</span><p class="mt-4 font-semibold">' + U.esc(err.message) + '</p><button class="btn btn-ghost mt-5" data-back>Back to games</button></div>';
    board.querySelector('[data-back]').addEventListener('click', leave);
  }

  /* ------------------------------------------------------------------ quiz */
  function startQuiz(topicId) {
    var t = data.topics.filter(function (x) { return x.id === topicId; })[0]; if (!t) return;
    var board = openStage(t.title, t.course.title, 'list-checks');
    A.playStart(t.id).then(function (r) {
      var q = STS.quiz.run(board, r.questions, {
        timer: r.seconds,
        check: function (qq, k) { return A.playAnswer(r.round, qq.id, k); },
        onDone: function () {
          board.innerHTML = '<div class="skel h-48"></div>';
          A.playFinish(r.round).then(function (res) { result(board, res, { scoreLabel: 'Correct answers', again: function () { startQuiz(topicId); } }); }, function (err) { failed(board, err); });
        }
      });
      current = q;
    }, function (err) { failed(board, err); });
  }

  /* ------------------------------------------------------------------ memory match */
  function memory() {
    var board = openStage('Memory match', 'Match each term with its meaning', 'brain');
    A.gameStart('memory').then(function (r) {
      var cards = [];
      r.pairs.forEach(function (p, i) { cards.push({ pair: i, text: p.term, kind: 'term' }); cards.push({ pair: i, text: p.meaning, kind: 'meaning' }); });
      cards = U.shuffle(cards);
      var open = [], matched = 0, moves = 0, ended = false;
      board.innerHTML = timerBar() + '<div class="mt-3 flex justify-between text-sm text-ink-500"><span>Pairs: <b class="text-ink-800" data-m>0</b>/' + r.pairs.length + '</span><span>Moves: <b class="text-ink-800" data-mv>0</b></span></div>' +
        '<div class="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">' + cards.map(function (c, i) {
          return '<button class="mem h-24 sm:h-28" data-i="' + i + '" aria-label="Hidden card"><span class="in"><span class="f">' + U.icon(c.kind === 'term' ? 'type' : 'lightbulb', 'i-lg opacity-80') + '</span><span class="b ' + (c.kind === 'term' ? 'text-sky-800' : 'text-ink-700 !font-medium !text-[13px]') + '">' + U.esc(c.text) + '</span></span></button>';
        }).join('') + '</div>';
      var clock = countdown(board, r.seconds, function () { finish(false); });
      current = { stop: function () { ended = true; clock.stop(); } };
      function finish(done) {
        if (ended) return; ended = true; clock.stop();
        U.$$('.mem', board).forEach(function (b) { b.disabled = true; });
        setTimeout(function () {
          board.innerHTML = '<div class="skel h-48"></div>';
          A.gameSubmit(r.round, { completed: done, moves: moves }).then(function (res) {
            result(board, res, { scoreLabel: done ? 'Pairs matched in ' + moves + ' moves' : 'Pairs matched', again: memory });
          }, function (err) { failed(board, err); });
        }, done ? 500 : 0);
      }
      U.$$('.mem', board).forEach(function (b) {
        b.addEventListener('click', function () {
          if (ended || open.length >= 2 || b.classList.contains('flip') || b.classList.contains('done')) return;
          var c = cards[b.dataset.i];
          b.classList.add('flip'); b.setAttribute('aria-label', c.text); open.push(b);
          if (open.length < 2) return;
          moves++; board.querySelector('[data-mv]').textContent = moves;
          var a = cards[open[0].dataset.i], z = cards[open[1].dataset.i];
          if (a.pair === z.pair && a.kind !== z.kind) {
            open.forEach(function (x) { x.classList.remove('flip'); x.classList.add('done'); x.disabled = true; });
            open = []; matched++; board.querySelector('[data-m]').textContent = matched;
            if (matched === r.pairs.length) finish(true);
          } else {
            var pairOpen = open; open = pairOpen;
            setTimeout(function () { pairOpen.forEach(function (x) { x.classList.remove('flip'); x.setAttribute('aria-label', 'Hidden card'); }); open = []; }, 800);
          }
        });
      });
    }, function (err) { failed(board, err); });
  }

  /* ------------------------------------------------------------------ word scramble */
  function scramble() {
    var board = openStage('Word scramble', 'Type the real word', 'shuffle');
    A.gameStart('scramble').then(function (r) {
      var i = 0, given = [], ended = false;
      board.innerHTML = timerBar() + '<div data-w class="mt-6"></div>';
      var clock = countdown(board, r.seconds, function () { submit(); });
      current = { stop: function () { ended = true; clock.stop(); } };
      function show() {
        var w = r.words[i];
        board.querySelector('[data-w]').innerHTML =
          '<p class="text-sm font-semibold text-ink-500">Word ' + (i + 1) + ' of ' + r.words.length + '</p>' +
          '<div class="mt-4 flex flex-wrap justify-center gap-2">' + w.scrambled.split('').map(function (ch) { return '<span class="grid h-12 w-11 place-items-center rounded-xl border border-line bg-sky-50 font-display text-xl font-semibold text-sky-800">' + U.esc(ch) + '</span>'; }).join('') + '</div>' +
          '<p class="mt-4 text-center text-[15px] text-ink-600">' + U.icon('lightbulb', 'i-sm text-orange-500') + ' ' + U.esc(w.hint) + ' <span class="text-ink-400">(' + w.length + ' letters)</span></p>' +
          '<form class="mx-auto mt-5 flex max-w-sm gap-2" novalidate><label class="sr-only" for="sw">Your answer</label><input id="sw" class="input text-center font-display text-lg uppercase tracking-widest" maxlength="' + (w.length + 2) + '" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn btn-primary">' + (i === r.words.length - 1 ? 'Finish' : 'Next') + '</button></form>' +
          '<button class="mx-auto mt-3 block text-sm font-semibold text-ink-500 hover:text-sky-700" data-skip>Skip this word</button>';
        var f = board.querySelector('form'), inp = board.querySelector('#sw');
        inp.focus();
        f.addEventListener('submit', function (e) { e.preventDefault(); next(inp.value); });
        board.querySelector('[data-skip]').addEventListener('click', function () { next(''); });
      }
      function next(v) {
        if (ended) return;
        given[i] = String(v || '').trim().toUpperCase();
        if (++i < r.words.length) show(); else submit();
      }
      function submit() {
        if (ended) return; ended = true; clock.stop();
        while (given.length < r.words.length) given.push('');
        board.innerHTML = '<div class="skel h-48"></div>';
        A.gameSubmit(r.round, { words: given }).then(function (res) {
          var review = '<ul class="mx-auto mt-8 max-w-md divide-y divide-line rounded-2xl border border-line">' + (res.solutions || []).map(function (s, k) {
            var ok = given[k] === s;
            return '<li class="flex items-center gap-3 px-4 py-3">' + U.icon(ok ? 'check-circle-2' : 'x', ok ? 'text-good-500' : 'text-bad-500') + '<span class="font-display font-semibold tracking-wide">' + U.esc(s) + '</span>' + (!ok && given[k] ? '<span class="ml-auto text-sm text-ink-400 line-through">' + U.esc(given[k]) + '</span>' : '') + '</li>';
          }).join('') + '</ul>';
          result(board, res, { scoreLabel: 'Words solved', review: review, again: scramble });
        }, function (err) { failed(board, err); });
      }
      show();
    }, function (err) { failed(board, err); });
  }

  /* ------------------------------------------------------------------ rapid fire */
  function rapid() {
    var board = openStage('Rapid fire', 'True or false? Go with your gut', 'zap');
    A.gameStart('rapid').then(function (r) {
      var i = 0, given = [], ended = false;
      board.innerHTML = timerBar() + '<div data-s class="mt-6"></div>';
      var clock = countdown(board, r.seconds, function () { submit(); });
      current = { stop: function () { ended = true; clock.stop(); } };
      function onKey(e) { if (e.key === 't' || e.key === 'ArrowLeft') answer(true); if (e.key === 'f' || e.key === 'ArrowRight') answer(false); }
      document.addEventListener('keydown', onKey);
      function show() {
        board.querySelector('[data-s]').innerHTML =
          '<p class="text-sm font-semibold text-ink-500">Statement ' + (i + 1) + ' of ' + r.statements.length + '</p>' +
          '<p class="mt-4 min-h-[96px] font-display text-2xl font-semibold leading-snug animate-rise">' + U.esc(r.statements[i]) + '</p>' +
          '<div class="mt-6 grid grid-cols-2 gap-3"><button class="btn btn-lg border-2 border-good-500 bg-good-50 text-good-700 hover:bg-good-500 hover:text-white" data-a="1">' + U.icon('check') + 'True</button><button class="btn btn-lg border-2 border-bad-500 bg-bad-50 text-bad-600 hover:bg-bad-500 hover:text-white" data-a="0">' + U.icon('x') + 'False</button></div>' +
          '<p class="mt-3 hidden text-center text-xs text-ink-400 sm:block">Keyboard: T for true, F for false</p>';
        U.$$('[data-a]', board).forEach(function (b) { b.addEventListener('click', function () { answer(b.dataset.a === '1'); }); });
      }
      function answer(v) {
        if (ended) return;
        given[i] = v;
        if (++i < r.statements.length) show(); else submit();
      }
      function submit() {
        if (ended) return; ended = true; clock.stop(); document.removeEventListener('keydown', onKey);
        board.innerHTML = '<div class="skel h-48"></div>';
        A.gameSubmit(r.round, { answers: given }).then(function (res) {
          var review = '<ul class="mx-auto mt-8 max-w-xl divide-y divide-line rounded-2xl border border-line text-[15px]">' + r.statements.map(function (s, k) {
            var truth = (res.solutions || [])[k], ok = given[k] === truth;
            return '<li class="flex items-start gap-3 px-4 py-3">' + U.icon(ok ? 'check-circle-2' : 'x', 'mt-0.5 flex-none ' + (ok ? 'text-good-500' : 'text-bad-500')) + '<span class="flex-1">' + U.esc(s) + '</span><span class="tag ' + (truth ? 'tag-good' : 'tag-bad') + '">' + (truth ? 'True' : 'False') + '</span></li>';
          }).join('') + '</ul>';
          result(board, res, { scoreLabel: 'Correct answers', review: review, again: rapid });
        }, function (err) { failed(board, err); });
      }
      var prevStop = current.stop; current.stop = function () { prevStop(); document.removeEventListener('keydown', onKey); };
      show();
    }, function (err) { failed(board, err); });
  }

  /* ------------------------------------------------------------------ boot */
  U.boot().then(function (st) {
    settings = st.site.settings;
    if (st.me) A.playClaim().then(function (r) { if (r.claimed) { U.toast(U.inr(r.claimed) + ' of guest play rewards moved to your wallet.', 'wallet'); load(); } }, function () { /* ignore */ });
    load().then(function () {
      var g = U.param('game'), t = Number(U.param('quiz'));
      if (g && GAMES[g]) ({ memory: memory, scramble: scramble, rapid: rapid })[g]();
      else if (t) startQuiz(t);
    });
    U.$('#main').addEventListener('click', function (e) {
      var g = e.target.closest('[data-game]'), t = e.target.closest('[data-topic]');
      if (g && !g.disabled) ({ memory: memory, scramble: scramble, rapid: rapid })[g.dataset.game]();
      if (t && !t.disabled) startQuiz(Number(t.dataset.topic));
    });
  });
})();
