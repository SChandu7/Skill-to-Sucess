/* Certificate renderer (verify page, certificate page, dashboard). Scales with container-query units. */
window.STS = window.STS || {};

STS.cert = (function () {
  'use strict';
  var U = STS.ui;

  function verifyUrl(code) { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'verify.html?id=' + encodeURIComponent(code); }
  function qr(code) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode(0, 'M'); q.addData(verifyUrl(code)); q.make();
    return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
  }
  function render(c) {
    var s = U.state.site.settings;
    var d = new Date(c.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return '<div class="cert shadow-pop" role="img" aria-label="Certificate of completion for ' + U.esc(c.name) + ', ' + U.esc(c.course.title) + ', ID ' + U.esc(c.code) + '">' +
      '<div style="position:absolute;inset:0;background:linear-gradient(135deg,#F1F8FE 0%,#fff 45%,#FFF5EB 100%)"></div>' +
      '<div style="position:absolute;left:0;top:0;bottom:0;width:2.2cqw;background:linear-gradient(180deg,#0A7BC2,#45A8E8 70%,#FF9A3D)"></div>' +
      '<div style="position:absolute;inset:0;padding:6cqw 7cqw 6cqw 9cqw;display:flex;flex-direction:column">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:1.2cqw"><span style="width:4.4cqw;height:4.4cqw;display:block">' + U.LOGO_SVG + '</span>' +
      '<span class="font-display" style="font-size:2.3cqw;font-weight:600;color:#0C2238">Skill<span style="color:#F27F1B">To</span>Success</span></div>' +
      '<span style="font-size:1.45cqw;color:#64758A" class="tabular">ID ' + U.esc(c.code) + '</span></div>' +
      '<div style="margin-top:5cqw"><p class="font-display" style="font-size:1.8cqw;color:#0A7BC2;font-weight:600">Certificate of completion</p>' +
      '<p style="font-size:1.7cqw;color:#64758A;margin-top:2cqw">This certifies that</p>' +
      '<p class="font-display" style="font-size:5.2cqw;line-height:1.05;font-weight:600;letter-spacing:-.02em;color:#0C2238;margin-top:.8cqw">' + U.esc(c.name) + '</p>' +
      '<p style="font-size:1.7cqw;color:#64758A;margin-top:2cqw">has completed all ' + c.course.lesson_count + ' lessons and quizzes of</p>' +
      '<p class="font-display" style="font-size:2.9cqw;font-weight:600;color:#075E95;margin-top:.6cqw">' + U.esc(c.course.title) + '</p>' +
      '<p style="font-size:1.6cqw;color:#2B4560;margin-top:1.2cqw">Average quiz score ' + c.score + '%, issued on ' + d + '</p></div>' +
      '<div style="margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:3cqw"><div style="display:flex;gap:5cqw">' +
      sig(c.course.instructor || 'Instructor', 'Course instructor', 'M4 30c10-18 18-22 20-12s-6 14 2 4 14-20 18-10-4 16 6 8 12-14 18-6 6 4 14-2 16-6 30-4') +
      sig(s.founder, 'Founder, ' + s.brand, 'M6 26c8-2 14-16 22-14s-8 18 2 16 10-14 18-12-2 10 8 8 14-10 22-8 10 6 30 2') + '</div>' +
      '<div style="display:flex;align-items:center;gap:1.5cqw"><div style="text-align:right;font-size:1.2cqw;color:#64758A;line-height:1.35">Scan to verify<br>' + U.esc(location.host) + '</div><div style="width:9cqw;height:9cqw;padding:.6cqw;background:#fff;border:.12cqw solid #E3EAF2;border-radius:.6cqw">' + qr(c.code) + '</div></div></div></div>' +
      '<div style="position:absolute;right:7cqw;top:14cqw;width:11cqw;height:11cqw;border-radius:50%;background:#FF9A3D;display:grid;place-items:center;box-shadow:0 0 0 .6cqw #FFF5EB,0 0 0 .8cqw #FFB774">' +
      '<div style="text-align:center;color:#0C2238"><svg viewBox="0 0 32 32" style="width:4.2cqw;height:4.2cqw"><path d="M8 22.5 13.5 17l4 3 6.5-8.5" fill="none" stroke="#0C2238" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="font-display" style="font-size:1.2cqw;font-weight:700;margin-top:.2cqw">VERIFIED</div></div></div>' +
      (c.revoked ? '<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(255,255,255,.7)"><span class="font-display" style="font-size:6cqw;font-weight:700;color:#C2362B;transform:rotate(-12deg);border:.5cqw solid #C2362B;padding:1cqw 3cqw;border-radius:1cqw">REVOKED</span></div>' : '') +
      '</div>';
  }
  function sig(name, role, d) {
    return '<div><svg viewBox="0 0 120 40" style="width:13cqw;height:4.2cqw"><path d="' + d + '" fill="none" stroke="#0C2238" stroke-width="2" stroke-linecap="round"/></svg><div style="border-top:.12cqw solid #B3C0CE;padding-top:.6cqw;font-size:1.35cqw"><b>' + U.esc(name) + '</b><br><span style="color:#64758A">' + U.esc(role) + '</span></div></div>';
  }
  return { render: render, verifyUrl: verifyUrl };
})();
