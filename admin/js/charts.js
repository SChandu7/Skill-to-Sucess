/* Tiny dependency-free SVG charts for the admin dashboard: area/line and column charts with hover tooltips. */
STS.charts = (function () {
  'use strict';
  var U = STS.ui;

  function niceMax(v) {
    if (v <= 0) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    var m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * p;
  }
  function short(n) { n = Number(n) || 0; return n >= 1e7 ? (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr' : n >= 1e5 ? (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n)); }
  function label(d) { var x = new Date(d + 'T00:00:00'); return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }

  /* o: {data:[{date,...}], keys:[{k, label, color, money}], type:'area'|'bar', height} */
  function draw(host, o) {
    var W = 720, H = o.height || 240, P = { l: 44, r: 12, t: 14, b: 26 };
    var data = o.data, n = data.length, keys = o.keys;
    var max = niceMax(Math.max.apply(null, data.map(function (d) { return Math.max.apply(null, keys.map(function (k) { return Number(d[k.k]) || 0; })); })));
    var iw = W - P.l - P.r, ih = H - P.t - P.b;
    var x = function (i) { return P.l + (n === 1 ? iw / 2 : (o.type === 'bar' ? (i + 0.5) * iw / n : i * iw / (n - 1))); };
    var y = function (v) { return P.t + ih - (v / max) * ih; };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="h-auto w-full" role="img" aria-label="' + U.esc(o.title || 'Chart') + '"><defs>' +
      keys.map(function (k, i) { return '<linearGradient id="g' + o.id + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + k.color + '" stop-opacity=".22"/><stop offset="1" stop-color="' + k.color + '" stop-opacity="0"/></linearGradient>'; }).join('') + '</defs>';
    for (var g = 0; g <= 4; g++) {
      var gv = max * g / 4, gy = y(gv);
      svg += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + gy + '" y2="' + gy + '" stroke="#E3EAF2" stroke-dasharray="' + (g ? '3 4' : '0') + '"/>' +
        '<text x="' + (P.l - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#8696A8">' + (keys[0].money ? '₹' : '') + short(gv) + '</text>';
    }
    var step = Math.max(1, Math.ceil(n / 7));
    data.forEach(function (d, i) { if (i % step === 0 || i === n - 1) svg += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 && o.type !== 'bar' ? 'start' : i === n - 1 && o.type !== 'bar' ? 'end' : 'middle') + '" font-size="11" fill="#8696A8">' + label(d.date) + '</text>'; });
    if (o.type === 'bar') {
      var bw = Math.max(2, Math.min(22, iw / n * 0.62 / keys.length));
      keys.forEach(function (k, ki) {
        data.forEach(function (d, i) {
          var v = Number(d[k.k]) || 0, bx = x(i) - (bw * keys.length) / 2 + ki * bw;
          svg += '<rect x="' + bx + '" y="' + y(v) + '" width="' + (bw - 1) + '" height="' + Math.max(0, P.t + ih - y(v)) + '" rx="' + Math.min(4, bw / 2) + '" fill="' + k.color + '"/>';
        });
      });
    } else {
      keys.forEach(function (k, ki) {
        var pts = data.map(function (d, i) { return [x(i), y(Number(d[k.k]) || 0)]; });
        var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
        if (ki === 0) svg += '<path d="' + line + ' L' + pts[pts.length - 1][0] + ' ' + (P.t + ih) + ' L' + pts[0][0] + ' ' + (P.t + ih) + ' Z" fill="url(#g' + o.id + ki + ')"/>';
        svg += '<path d="' + line + '" fill="none" stroke="' + k.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"' + (ki ? ' stroke-dasharray="5 5"' : '') + '/>';
      });
    }
    svg += '<line data-cursor x1="0" x2="0" y1="' + P.t + '" y2="' + (P.t + ih) + '" stroke="#0C2238" stroke-opacity=".25" visibility="hidden"/>';
    keys.forEach(function (k, ki) { if (o.type !== 'bar') svg += '<circle data-dot="' + ki + '" r="4.5" fill="#fff" stroke="' + k.color + '" stroke-width="2.4" visibility="hidden"/>'; });
    svg += '<rect data-hit x="' + P.l + '" y="' + P.t + '" width="' + iw + '" height="' + ih + '" fill="transparent"/></svg>';

    host.innerHTML = '<div class="relative">' + svg + '<div data-tip class="pointer-events-none absolute z-10 hidden min-w-[140px] rounded-xl bg-ink-900 px-3 py-2 text-xs text-white shadow-pop"></div></div>' +
      (keys.length > 1 ? '<div class="mt-2 flex flex-wrap gap-4 text-xs text-ink-600">' + keys.map(function (k, i) { return '<span class="flex items-center gap-1.5"><span class="h-2 w-4 rounded-full" style="background:' + k.color + (i && o.type !== 'bar' ? ';opacity:.7' : '') + '"></span>' + U.esc(k.label) + '</span>'; }).join('') + '</div>' : '');
    var el = host.querySelector('svg'), tip = host.querySelector('[data-tip]'), cur = el.querySelector('[data-cursor]');
    function at(evt) {
      var r = el.getBoundingClientRect(), sx = (evt.clientX - r.left) * W / r.width;
      var i = o.type === 'bar' ? Math.floor((sx - P.l) / (iw / n)) : Math.round((sx - P.l) / (iw / Math.max(1, n - 1)));
      i = Math.max(0, Math.min(n - 1, i));
      var d = data[i], px = x(i);
      cur.setAttribute('x1', px); cur.setAttribute('x2', px); cur.setAttribute('visibility', 'visible');
      keys.forEach(function (k, ki) { var dot = el.querySelector('[data-dot="' + ki + '"]'); if (dot) { dot.setAttribute('cx', px); dot.setAttribute('cy', y(Number(d[k.k]) || 0)); dot.setAttribute('visibility', 'visible'); } });
      tip.innerHTML = '<p class="mb-1 font-semibold">' + label(d.date) + '</p>' + keys.map(function (k) { return '<p class="flex justify-between gap-4"><span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" style="background:' + k.color + '"></span>' + U.esc(k.label) + '</span><b class="tabular">' + (k.money ? U.inr(d[k.k]) : U.num(d[k.k])) + '</b></p>'; }).join('');
      tip.classList.remove('hidden');
      var left = px / W * r.width, tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(r.width - tw, left - tw / 2)) + 'px'; tip.style.top = '-8px'; tip.style.transform = 'translateY(-100%)';
    }
    function out() { tip.classList.add('hidden'); cur.setAttribute('visibility', 'hidden'); U.$$('[data-dot]', el).forEach(function (d) { d.setAttribute('visibility', 'hidden'); }); }
    var hit = el.querySelector('[data-hit]');
    hit.addEventListener('mousemove', at); hit.addEventListener('mouseleave', out);
    hit.addEventListener('touchstart', function (e) { at(e.touches[0]); }, { passive: true });
  }

  /* Horizontal bars: rows [{label, value, sub, color}] */
  function bars(rows, o) {
    o = o || {};
    if (!rows.length) return '<p class="py-6 text-center text-sm text-ink-500">' + U.esc(o.empty || 'No data for this period') + '</p>';
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; })) || 1;
    return '<ul class="space-y-3">' + rows.map(function (r, i) {
      return '<li><div class="mb-1 flex items-baseline justify-between gap-3 text-sm"><span class="truncate font-medium text-ink-800">' + U.esc(r.label) + '</span><span class="whitespace-nowrap tabular text-ink-600">' + (o.money ? U.inr(r.value) : U.num(r.value)) + (r.sub ? ' <span class="text-ink-400">· ' + U.esc(r.sub) + '</span>' : '') + '</span></div>' +
        '<div class="h-2.5 overflow-hidden rounded-full bg-cloud"><div class="h-full rounded-full" style="width:' + Math.max(2, r.value / max * 100) + '%;background:' + (r.color || (i === 0 ? '#0A7BC2' : '#45A8E8')) + '"></div></div></li>';
    }).join('') + '</ul>';
  }

  /* Tiny sparkline for KPI cards */
  function spark(values, color) {
    if (!values.length) return '';
    var W = 120, H = 32, max = Math.max.apply(null, values) || 1, n = values.length;
    var d = values.map(function (v, i) { return (i ? 'L' : 'M') + (n === 1 ? W / 2 : i * W / (n - 1)).toFixed(1) + ' ' + (H - 2 - v / max * (H - 4)).toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="h-8 w-[120px]" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + (color || '#0A7BC2') + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  return { draw: draw, bars: bars, spark: spark, short: short };
})();
