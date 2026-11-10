/* Certificate renderer (verify page, certificate page, dashboard). A4 landscape, scales with container-query units (cqw),
 * prints to PDF from the certificate page. The signature is the image uploaded in Admin → Site settings → Certificate. */
window.STS = window.STS || {};

STS.cert = (function () {
  'use strict';
  var U = STS.ui;
  var NAVY = '#0C2238', SKY = '#0A7BC2', GOLD = '#C8963E', ORANGE = '#F27F1B', MUTED = '#5B6B7E';
  var SERIF = "Georgia,'Times New Roman',serif";

  function verifyUrl(code) { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'verify.html?id=' + encodeURIComponent(code); }
  function qr(code) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode(0, 'M'); q.addData(verifyUrl(code)); q.make();
    return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
  }

  // Gold rosette with ribbon tails: the "verified" seal.
  function seal() {
    var pts = [];
    for (var i = 0; i < 48; i++) { var r = i % 2 ? 44 : 48, a = Math.PI * i / 24; pts.push((50 + r * Math.cos(a)).toFixed(2) + ',' + (50 + r * Math.sin(a)).toFixed(2)); }
    return '<svg viewBox="0 0 100 130" style="width:100%;height:100%" aria-hidden="true">' +
      '<path d="M30 80 18 128 33 118 42 131 50 88Z" fill="' + SKY + '"/><path d="M70 80 82 128 67 118 58 131 50 88Z" fill="#075E95"/>' +
      '<polygon points="' + pts.join(' ') + '" fill="' + GOLD + '"/>' +
      '<circle cx="50" cy="50" r="38" fill="#E9C77E"/><circle cx="50" cy="50" r="33" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 2"/>' +
      '<path d="M37 51 46 60 64 40" fill="none" stroke="' + NAVY + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="50" y="76" text-anchor="middle" font-family="Lexend,Arial,sans-serif" font-size="7.5" font-weight="700" fill="' + NAVY + '" letter-spacing="1">VERIFIED</text></svg>';
  }

  // Thin corner flourish, used four times.
  function corner(style) {
    return '<svg viewBox="0 0 60 60" style="position:absolute;width:6.5cqw;height:6.5cqw;' + style + '" aria-hidden="true">' +
      '<path d="M2 58V14C2 7 7 2 14 2h44" fill="none" stroke="' + GOLD + '" stroke-width="1.6"/>' +
      '<path d="M9 58V19c0-6 4-10 10-10h39" fill="none" stroke="' + GOLD + '" stroke-width=".8" opacity=".7"/>' +
      '<circle cx="14" cy="14" r="2.4" fill="' + GOLD + '"/></svg>';
  }

  function signatureBlock(signer) {
    var mark = signer.signature
      ? '<img src="' + U.esc(signer.signature) + '" alt="Signature of ' + U.esc(signer.name) + '" style="display:block;max-width:24cqw;max-height:7.6cqw;margin:0 auto -.6cqw;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.2) brightness(1.05)">'
      : '<span style="display:block;font-family:\'Segoe Script\',\'Brush Script MT\',\'Lucida Handwriting\',cursive;font-size:3cqw;line-height:1.2;color:' + NAVY + ';white-space:nowrap">' + U.esc(signer.name) + '</span>';
    return '<div style="text-align:center;min-width:22cqw">' + '<div style="height:7.8cqw;display:flex;align-items:flex-end;justify-content:center">' + mark + '</div>' +
      '<div style="border-top:.14cqw solid ' + NAVY + ';margin-top:.5cqw;padding-top:.7cqw"><div style="font-size:1.45cqw;font-weight:700;color:' + NAVY + '">' + U.esc(signer.name) + '</div>' +
      '<div style="font-size:1.2cqw;color:' + MUTED + ';margin-top:.15cqw">' + U.esc(signer.title) + '</div></div></div>';
  }

  function render(c) {
    var s = U.state.site.settings;
    var signer = c.signer || { name: s.founder, title: 'Founder, ' + s.brand, signature: '' };
    var d = new Date(c.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    var host = location.host || 'skilltosuccess.org';
    return '<div class="cert shadow-pop" role="img" aria-label="Certificate of completion for ' + U.esc(c.name) + ', ' + U.esc(c.course.title) + ', ID ' + U.esc(c.code) + '">' +
      // paper, watermark and frame
      '<div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 100% 0%,#FFF6E9 0%,rgba(255,255,255,0) 55%),radial-gradient(90% 80% at 0% 100%,#EEF6FD 0%,rgba(255,255,255,0) 55%),#FFFDF9"></div>' +
      '<div style="position:absolute;right:-6cqw;bottom:-9cqw;width:46cqw;height:46cqw;opacity:.045">' + U.LOGO_SVG + '</div>' +
      '<div style="position:absolute;inset:2.2cqw;border:.32cqw solid ' + NAVY + '"></div>' +
      '<div style="position:absolute;inset:3cqw;border:.1cqw solid ' + GOLD + '"></div>' +
      corner('left:3.6cqw;top:3.6cqw') + corner('right:3.6cqw;top:3.6cqw;transform:scaleX(-1)') +
      corner('left:3.6cqw;bottom:3.6cqw;transform:scaleY(-1)') + corner('right:3.6cqw;bottom:3.6cqw;transform:scale(-1,-1)') +
      // content
      '<div style="position:absolute;inset:0;padding:6.4cqw 8cqw 5.6cqw;display:flex;flex-direction:column">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div style="display:flex;align-items:center;gap:1.2cqw"><span style="width:4.6cqw;height:4.6cqw;display:block;border-radius:.8cqw;overflow:hidden">' + U.LOGO_SVG + '</span>' +
        '<div><div class="font-display" style="font-size:2.3cqw;font-weight:600;color:' + NAVY + ';line-height:1">Skill<span style="color:' + ORANGE + '">To</span>Success</div>' +
        '<div style="font-size:1.05cqw;letter-spacing:.18em;color:' + MUTED + ';margin-top:.45cqw">LEARN · FINISH · GROW</div>' +
        (s.msme && s.msme.number ? '<div style="font-size:1cqw;color:' + MUTED + ';margin-top:.4cqw">Govt. of India registered MSME · ' + U.esc(s.msme.number) + '</div>' : '') + '</div></div>' +
        '<div style="text-align:right;font-size:1.15cqw;color:' + MUTED + ';line-height:1.5">Certificate ID<br><b class="tabular" style="font-size:1.45cqw;color:' + NAVY + ';letter-spacing:.04em">' + U.esc(c.code) + '</b></div></div>' +
      '<div style="margin-top:3.6cqw;padding-right:16cqw">' +
        '<div style="display:flex;align-items:center;gap:1.2cqw"><span style="width:3.5cqw;height:.3cqw;background:' + ORANGE + '"></span>' +
        '<span class="font-display" style="font-size:1.55cqw;font-weight:700;letter-spacing:.32em;color:' + SKY + '">CERTIFICATE OF COMPLETION</span></div>' +
        '<p style="font-size:1.6cqw;color:' + MUTED + ';margin-top:2.4cqw">This is to certify that</p>' +
        '<p style="font-family:' + SERIF + ';font-size:5.4cqw;line-height:1.08;font-weight:700;color:' + NAVY + ';margin-top:.6cqw;letter-spacing:-.01em">' + U.esc(c.name) + '</p>' +
        '<div style="width:34cqw;height:.12cqw;background:linear-gradient(90deg,' + GOLD + ',rgba(200,150,62,0));margin-top:1.2cqw"></div>' +
        '<p style="font-size:1.6cqw;color:' + MUTED + ';margin-top:1.6cqw">has successfully completed the online course</p>' +
        '<p class="font-display" style="font-size:2.75cqw;line-height:1.2;font-weight:600;color:#075E95;margin-top:.7cqw">' + U.esc(c.course.title) + '</p>' +
        '<p style="font-size:1.4cqw;color:#2B4560;margin-top:1.3cqw">' + c.course.lesson_count + ' lessons and every lesson quiz passed &nbsp;·&nbsp; Average quiz score <b>' + c.score + '%</b> &nbsp;·&nbsp; Issued on <b>' + d + '</b></p>' +
      '</div>' +
      '<div style="margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:3cqw">' +
        signatureBlock(signer) +
        (c.course.instructor ? '<div style="text-align:center;min-width:16cqw"><div style="height:7.8cqw"></div><div style="border-top:.14cqw solid #B3C0CE;margin-top:.5cqw;padding-top:.7cqw"><div style="font-size:1.45cqw;font-weight:700;color:' + NAVY + '">' + U.esc(c.course.instructor) + '</div><div style="font-size:1.2cqw;color:' + MUTED + ';margin-top:.15cqw">Course instructor</div></div></div>' : '') +
        '<div style="display:flex;align-items:center;gap:1.4cqw"><div style="text-align:right;font-size:1.1cqw;color:' + MUTED + ';line-height:1.45">Scan to verify<br><b style="color:' + NAVY + '">' + U.esc(host) + '/verify</b></div>' +
        '<div style="width:8.6cqw;height:8.6cqw;padding:.6cqw;background:#fff;border:.12cqw solid #E3EAF2;border-radius:.6cqw">' + qr(c.code) + '</div></div>' +
      '</div></div>' +
      '<div style="position:absolute;right:8.5cqw;top:12.5cqw;width:13cqw;height:17cqw">' + seal() + '</div>' +
      (c.revoked ? '<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(255,255,255,.72)"><span class="font-display" style="font-size:6cqw;font-weight:700;color:#C2362B;transform:rotate(-12deg);border:.5cqw solid #C2362B;padding:1cqw 3cqw;border-radius:1cqw">REVOKED</span></div>' : '') +
      '</div>';
  }
  return { render: render, verifyUrl: verifyUrl };
})();
