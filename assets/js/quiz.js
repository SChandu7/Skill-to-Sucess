/* Reusable quiz runner. The server checks every answer, so correct answers are never in the page.
 * STS.quiz.run(el, questions, { check(q, index) -> Promise<{correct, correct_index, explanation}>, timer, onDone(answers, score) })
 */
window.STS = window.STS || {};

STS.quiz = (function () {
  'use strict';
  var U = STS.ui;

  function run(el, qs, o) {
    var i = 0, score = 0, answers = {}, marks = [], tick = null, locked = false;
    function stop() { if (tick) { clearInterval(tick); tick = null; } }
    function show() {
      stop(); locked = false;
      var q = qs[i];
      el.innerHTML =
        '<div class="flex items-center justify-between gap-3"><p class="text-sm font-semibold text-ink-500">Question ' + (i + 1) + ' of ' + qs.length + '</p>' +
        '<div class="flex gap-1.5" aria-hidden="true">' + qs.map(function (_, k) { return '<span class="h-1.5 w-6 rounded-full ' + (k < i ? (marks[k] ? 'bg-good-500' : 'bg-bad-500') : k === i ? 'bg-sky-600' : 'bg-line') + '"></span>'; }).join('') + '</div></div>' +
        (o.timer ? '<div class="meter mt-3 !h-1.5"><span data-t style="width:100%;transition:width 1s linear;background:#FF9A3D"></span></div>' : '') +
        '<h3 class="mt-5 text-xl">' + U.esc(q.text) + '</h3>' +
        '<div class="mt-5 grid gap-2.5" role="radiogroup" aria-label="Answer options">' + q.options.map(function (op, k) { return '<button class="opt" role="radio" aria-checked="false" data-k="' + k + '"><span class="dot">' + 'ABCDEF'[k] + '</span><span class="flex-1">' + U.esc(op) + '</span></button>'; }).join('') + '</div>' +
        '<div data-why class="mt-4" aria-live="polite"></div>';
      U.$$('[data-k]', el).forEach(function (b) { b.addEventListener('click', function () { pick(Number(b.dataset.k)); }); });
      if (o.timer) {
        var left = o.timer, bar = el.querySelector('[data-t]');
        requestAnimationFrame(function () { bar.style.width = ((left - 1) / o.timer * 100) + '%'; });
        tick = setInterval(function () { left--; bar.style.width = Math.max(0, (left - 1) / o.timer * 100) + '%'; if (left <= 3) bar.style.background = '#E0473A'; if (left <= 0) pick(-1); }, 1000);
      }
      var first = el.querySelector('[data-k]'); if (first && o.focus !== false) first.focus({ preventScroll: true });
    }
    function pick(k) {
      if (locked) return; locked = true; stop();
      var q = qs[i];
      U.$$('[data-k]', el).forEach(function (b) { b.disabled = true; if (Number(b.dataset.k) === k) b.setAttribute('aria-checked', 'true'); });
      answers[q.id] = k;
      o.check(q, k).then(function (r) {
        if (r.correct) score++;
        marks.push(!!r.correct);
        U.$$('[data-k]', el).forEach(function (b, idx) { if (idx === r.correct_index) b.classList.add('correct'); else if (idx === k) b.classList.add('wrong'); });
        var last = i === qs.length - 1;
        el.querySelector('[data-why]').innerHTML = '<div class="rounded-2xl ' + (r.correct ? 'bg-good-50 text-good-700' : 'bg-bad-50 text-bad-600') + ' px-4 py-3 text-[15px]"><b>' + (r.correct ? 'Correct.' : k < 0 ? 'Time is up.' : r.late ? 'Too late.' : 'Not quite.') + '</b> <span class="text-ink-700">' + U.esc(r.explanation || '') + '</span></div>' +
          '<button class="btn btn-dark mt-4" data-next>' + (last ? 'See result' : 'Next question') + U.icon('arrow-right', 'i-sm') + '</button>';
        var nb = el.querySelector('[data-next]'); nb.focus({ preventScroll: true });
        nb.addEventListener('click', function () { if (last) o.onDone(answers, score); else { i++; show(); } });
      }, function (err) {
        locked = false; U.$$('[data-k]', el).forEach(function (b) { b.disabled = false; });
        U.toast(err.message, null, true);
      });
    }
    show();
    return { stop: stop };
  }
  return { run: run };
})();
