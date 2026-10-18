/* SkillToSuccess admin panel — shell, router, API helpers, tables, forms and dialogs.
 * Every page registers itself with STS.admin.page(name, {...}) and is rendered into #view.
 */
window.STS = window.STS || {};

STS.admin = (function () {
  'use strict';
  var U = STS.ui, A = STS.api, esc = U.esc, icon = U.icon;
  var me = null, opts = null, pages = {}, counters = {}, liveTimer = null, liveAfter = 0, liveSubs = [], current = null;

  /* ------------------------------------------------------------------ API */
  function qs(params) {
    var p = [];
    Object.keys(params || {}).forEach(function (k) { var v = params[k]; if (v !== '' && v != null && v !== false) p.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); });
    return p.length ? '?' + p.join('&') : '';
  }
  var api = {
    get: function (path, params) { return A.get('/admin' + path + qs(params)); },
    post: function (path, body) { return A.post('/admin' + path, body); },
    patch: function (path, body) { return A.patch('/admin' + path, body); },
    put: function (path, body) { return A.request('PUT', '/admin' + path, body); },
    del: function (path) { return A.request('DELETE', '/admin' + path, undefined, { raw: true }); },
    send: function (method, path, body) { return A.request(method, '/admin' + path, body); },
    download: function (path, filename) {
      return A.request('GET', '/admin' + path, undefined, { raw: true }).then(function (r) { return r.blob(); }).then(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = filename; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      });
    }
  };
  function loadOptions(force) {
    if (opts && !force) return Promise.resolve(opts);
    return api.get('/options/').then(function (o) { opts = o; return o; });
  }
  function can(section, mode) { return !!(me && me.sections[section] && me.sections[section][mode || 'read']); }

  /* ------------------------------------------------------------------ formatting */
  function dt(v) { if (!v) return '—'; var d = new Date(v); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }
  function day(v) { return v ? U.date(v) : '—'; }
  var TAGS = {
    paid: ['tag-good', 'Paid'], created: ['tag-warn', 'Awaiting payment'], failed: ['tag-bad', 'Failed'], cancelled: ['tag-mute', 'Cancelled'], refunded: ['tag-ink', 'Refunded'],
    completed: ['tag-good', 'Completed'], held: ['tag-warn', 'Under review'], processing: ['tag-sky', 'Processing'], rejected: ['tag-bad', 'Rejected'], reversed: ['tag-mute', 'Reversed'],
    active: ['tag-good', 'Active'], review: ['tag-warn', 'Under review'],
    new: ['tag-orange', 'New'], open: ['tag-sky', 'In progress'], resolved: ['tag-good', 'Resolved'],
    blocked: ['tag-bad', 'Blocked'], published: ['tag-good', 'Published'], draft: ['tag-mute', 'Draft'], revoked: ['tag-bad', 'Revoked'], valid: ['tag-good', 'Valid'],
    info: ['tag-sky', 'Info'], success: ['tag-good', 'Success'], warning: ['tag-warn', 'Warning'], danger: ['tag-bad', 'Danger']
  };
  function tag(status, label) { var t = TAGS[status] || ['tag-mute', status]; return '<span class="tag ' + t[0] + '">' + esc(label || t[1]) + '</span>'; }
  var CAT_ICON = { auth: 'user-plus', order: 'shopping-bag', learning: 'graduation-cap', wallet: 'wallet', referral: 'gift', play: 'gamepad-2', support: 'message-circle', admin: 'sliders-horizontal', system: 'cpu' };
  var LEVEL_TONE = { info: 'bg-sky-50 text-sky-700', success: 'bg-good-50 text-good-700', warning: 'bg-warn-50 text-warn-600', danger: 'bg-bad-50 text-bad-600' };
  function activityRow(a, isNew) {
    return '<li class="flex gap-3 px-1 py-3 ' + (isNew ? 'feed-new' : '') + '"><span class="grid h-9 w-9 flex-none place-items-center rounded-xl ' + (LEVEL_TONE[a.level] || LEVEL_TONE.info) + '">' + icon(CAT_ICON[a.category] || 'activity', 'i-sm') + '</span>' +
      '<div class="min-w-0 flex-1"><p class="text-[14px] leading-snug text-ink-800">' + esc(a.message) + '</p><p class="mt-0.5 text-xs text-ink-500">' + U.ago(a.created_at) + (a.actor_label ? ' · ' + esc(a.actor_label) : '') + (a.ip ? ' · ' + esc(a.ip) : '') + '</p></div>' +
      (a.amount ? '<span class="whitespace-nowrap text-sm font-semibold tabular ' + (a.category === 'order' ? 'text-good-600' : 'text-ink-700') + '">' + U.inr(a.amount) + '</span>' : '') + '</li>';
  }

  /* ------------------------------------------------------------------ dialogs */
  function confirmBox(o) {
    return new Promise(function (resolve) {
      var done = false;
      var body = '<p class="text-[15px] text-ink-700">' + (o.text || '') + '</p>' + (o.input ? '<form class="mt-4" novalidate data-f><label class="label" for="cf-in">' + esc(o.input.label) + '</label>' +
        (o.input.textarea ? '<textarea class="input min-h-[90px]" id="cf-in" name="v" placeholder="' + esc(o.input.placeholder || '') + '"></textarea>' : '<input class="input" id="cf-in" name="v" type="' + (o.input.type || 'text') + '" placeholder="' + esc(o.input.placeholder || '') + '" value="' + esc(o.input.value || '') + '">') +
        (o.input.help ? '<p class="mt-1 text-xs text-ink-500">' + esc(o.input.help) + '</p>' : '') + '</form>' : '') + (o.extra || '');
      var m = U.modal({
        title: o.title, icon: o.icon || (o.danger ? 'alert-triangle' : 'help-circle'), tone: o.danger ? 'bg-bad-50 text-bad-600' : 'bg-sky-50 text-sky-700', body: body,
        onClose: function () { if (!done) resolve(null); },
        actions: [{ label: 'Cancel', cls: 'btn-ghost', close: true }, {
          label: o.ok || 'Confirm', cls: o.danger ? 'btn-danger' : 'btn-primary', onClick: function (close) {
            var v = true;
            if (o.input) {
              var f = m.body.querySelector('[data-f]'); v = m.body.querySelector('#cf-in').value.trim();
              if (o.input.required && !v) { U.fieldError(f, 'v', o.input.required === true ? 'This is required.' : o.input.required); return; }
            }
            done = true; close(); resolve(v);
          }
        }]
      });
      var f = m.body.querySelector('[data-f]'); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); m.el.querySelector('[data-actions] .btn:last-child').click(); });
    });
  }
  /* Run an action, toast the result and reload. */
  function run(promise, msg, then) {
    return promise.then(function (r) { if (msg) U.toast(typeof msg === 'function' ? msg(r) : msg); if (then) then(r); return r; }, function (err) { U.toast(err.message, null, true); throw err; });
  }

  /* ------------------------------------------------------------------ forms */
  function optionsOf(f) { var o = typeof f.options === 'function' ? f.options() : f.options || []; return o.map(function (x) { return typeof x === 'object' ? x : { value: x, label: x }; }); }
  function fieldHTML(f, v) {
    var id = 'f-' + f.name, req = f.required ? ' required' : '', span = f.span === 2 ? ' sm:col-span-2' : '';
    var label = '<label class="label" for="' + id + '">' + esc(f.label) + (f.optional ? ' <span class="font-normal text-ink-400">(optional)</span>' : '') + '</label>';
    var help = f.help ? '<p class="mt-1 text-xs text-ink-500">' + f.help + '</p>' : '';
    var h;
    if (v === undefined || v === null) v = f.default !== undefined ? f.default : '';
    switch (f.type) {
      case 'checkbox':
        return '<label class="flex items-start gap-2.5 rounded-xl border border-line bg-white p-3' + span + '"><input type="checkbox" class="check" name="' + f.name + '" id="' + id + '"' + (v ? ' checked' : '') + '><span><span class="block text-[15px] font-semibold text-ink-800">' + esc(f.label) + '</span>' + (f.help ? '<span class="block text-xs text-ink-500">' + f.help + '</span>' : '') + '</span></label>';
      case 'textarea':
        h = '<textarea class="input min-h-[' + (f.rows ? f.rows * 24 : 110) + 'px] ' + (f.mono ? 'font-mono text-[13px]' : '') + '" id="' + id + '" name="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '"' + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + req + '>' + esc(v) + '</textarea>'; break;
      case 'lines':
        h = '<textarea class="input min-h-[' + (f.rows ? f.rows * 24 : 110) + 'px]" id="' + id + '" name="' + f.name + '" placeholder="One per line">' + esc((v || []).join('\n')) + '</textarea>'; help = '<p class="mt-1 text-xs text-ink-500">' + (f.help || 'One item per line.') + '</p>'; break;
      case 'select':
        h = '<select class="input" id="' + id + '" name="' + f.name + '"' + req + '>' + (f.blank !== undefined ? '<option value="">' + esc(f.blank) + '</option>' : '') +
          optionsOf(f).map(function (o) { return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select>'; break;
      case 'multi':
        var sel = (v || []).map(String);
        h = '<div class="flex flex-wrap gap-2 rounded-xl border border-line bg-white p-3" id="' + id + '" data-multi="' + f.name + '">' + optionsOf(f).map(function (o) {
          return '<label class="chip cursor-pointer has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-800"><input type="checkbox" class="sr-only" value="' + esc(o.value) + '"' + (sel.indexOf(String(o.value)) >= 0 ? ' checked' : '') + '>' + esc(o.label) + '</label>';
        }).join('') + '</div>'; break;
      case 'file':
        var cur = v && typeof v === 'object' ? v.url : v;
        h = (cur ? '<div class="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-cloud px-3 py-2 text-sm">' + (f.image && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(cur) ? '<img src="' + esc(cur) + '" alt="" class="h-10 w-16 rounded-md object-cover">' : icon('file-text', 'i-sm text-ink-500')) +
          '<a class="link truncate" target="_blank" rel="noopener" href="' + esc(cur) + '">' + esc((v && v.name) || 'Current file') + '</a><label class="ml-auto flex items-center gap-1.5 text-ink-600"><input type="checkbox" class="check !mt-0" name="clear_' + f.name + '">Remove</label></div>' : '') +
          '<input type="file" class="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-semibold file:text-sky-700 hover:file:bg-sky-100" id="' + id + '" name="' + f.name + '"' + (f.accept ? ' accept="' + f.accept + '"' : '') + '>'; break;
      case 'json':
        h = '<textarea class="input font-mono !text-[13px]" id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 4) +
            '" spellcheck="false">' + esc(v == null || v === '' ? '[]' : (typeof v === 'string' ? v : JSON.stringify(v, null, 2))) + '</textarea>'; break;
      case 'color':
        h = '<div class="flex gap-2"><input type="color" class="h-[46px] w-14 flex-none cursor-pointer rounded-xl border border-line bg-white p-1" value="' + esc(v || '#0A7BC2') + '" data-color-for="' + id + '"><input class="input font-mono" id="' + id + '" name="' + f.name + '" value="' + esc(v || '#0A7BC2') + '" maxlength="7"></div>'; break;
      default:
        h = '<input class="input' + (f.type === 'number' ? ' tabular' : '') + '" id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '"' +
          (f.min !== undefined ? ' min="' + f.min + '"' : '') + (f.max !== undefined ? ' max="' + f.max + '"' : '') + (f.step ? ' step="' + f.step + '"' : '') + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : '') + req + '>';
        if (f.prefix) h = '<div class="flex" data-field><span class="grid place-items-center rounded-l-xl border border-r-0 border-line bg-cloud px-3 text-sm text-ink-600">' + f.prefix + '</span>' + h.replace('class="input', 'class="input !rounded-l-none') + '</div>';
    }
    return '<div class="' + span + '">' + label + h + help + '</div>';
  }
  function formHTML(fields, values, cols) {
    values = values || {};
    var out = '', group = null;
    fields.forEach(function (f) {
      if (f.section) { out += '<h3 class="mt-2 border-t border-line pt-5 font-sans text-sm font-bold uppercase tracking-wide text-ink-500 sm:col-span-2 first:mt-0 first:border-0 first:pt-0">' + esc(f.section) + '</h3>'; return; }
      if (f.show && !f.show(values)) return;
      out += fieldHTML(f, values[f.name]);
    });
    return '<div class="grid gap-4 ' + (cols === 1 ? '' : 'sm:grid-cols-2') + '">' + out + '</div>';
  }
  function wireForm(el) {
    U.$$('[data-color-for]', el).forEach(function (c) { var t = el.querySelector('#' + c.dataset.colorFor); c.addEventListener('input', function () { t.value = c.value.toUpperCase(); }); t.addEventListener('input', function () { if (/^#[0-9a-f]{6}$/i.test(t.value)) c.value = t.value; }); });
  }
  /* Read form values. Returns {data, multipart} where data is a plain object or a FormData. */
  function readForm(el, fields) {
    var data = {}, files = {}, clears = {};
    fields.forEach(function (f) {
      if (f.section || f.readonly) return;
      var inp = el.querySelector('[name="' + f.name + '"]');
      if (f.type === 'multi') { var box = el.querySelector('[data-multi="' + f.name + '"]'); if (!box) return; data[f.name] = U.$$('input:checked', box).map(function (i) { return f.numeric === false ? i.value : Number(i.value); }); return; }
      if (!inp) return;
      if (f.type === 'checkbox') data[f.name] = inp.checked;
      else if (f.type === 'file') { if (inp.files && inp.files[0]) files[f.name] = inp.files[0]; var c = el.querySelector('[name="clear_' + f.name + '"]'); if (c && c.checked) clears['clear_' + f.name] = 'true'; }
      else if (f.type === 'lines') data[f.name] = inp.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      else if (f.type === 'json') {
        var raw = inp.value.trim() || '[]';
        try { data[f.name] = JSON.parse(raw); }
        catch (e) { throw { message: 'Check "' + (f.label || f.name) + '": that is not valid JSON.', field: f.name }; }
      }
      else if (f.type === 'number') data[f.name] = inp.value === '' ? (f.nullable ? null : 0) : Number(inp.value);
      else if (f.type === 'select' && f.numeric) data[f.name] = inp.value === '' ? null : Number(inp.value);
      else if (f.type === 'select' && f.nullable && inp.value === '') data[f.name] = null;
      else if ((f.type === 'password' || f.omitEmpty) && !inp.value.trim()) return;
      else data[f.name] = inp.value.trim();
    });
    if (!Object.keys(files).length && !Object.keys(clears).length) return data;
    var fd = new FormData();
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      if (Array.isArray(v)) { var f = fields.filter(function (x) { return x.name === k; })[0]; if (f && f.type === 'multi') v.forEach(function (x) { fd.append(k, x); }); else fd.append(k, JSON.stringify(v)); }
      else fd.append(k, v === null ? '' : typeof v === 'boolean' ? (v ? 'true' : 'false') : v);
    });
    Object.keys(files).forEach(function (k) { fd.append(k, files[k]); });
    Object.keys(clears).forEach(function (k) { fd.append(k, clears[k]); });
    return fd;
  }
  function showErrors(form, err) {
    U.fieldError(form, null);
    var errs = err.data && err.data.errors, shown = false;
    if (errs && typeof errs === 'object') {
      Object.keys(errs).forEach(function (k) {
        var input = form.querySelector('[name="' + k + '"]') || form.querySelector('[data-multi="' + k + '"]'); if (!input) return;
        var msg = Array.isArray(errs[k]) ? errs[k][0] : (typeof errs[k] === 'string' ? errs[k] : JSON.stringify(errs[k]));
        input.setAttribute('aria-invalid', 'true');
        (input.closest('[data-field]') || input).insertAdjacentHTML('afterend', '<p class="error" data-for="' + k + '">' + esc(msg) + '</p>');
        if (!shown) { input.focus(); shown = true; }
      });
    }
    if (!shown && err.field) shown = U.fieldError(form, err.field, err.message);
    if (!shown) U.toast(err.message, null, true);
    else U.toast('Please fix the highlighted field.', null, true);
  }
  /* Modal editor: fields + values + save(data) -> Promise */
  function editor(o) {
    var m = U.modal({ title: o.title, icon: o.icon || 'pencil', sub: o.sub, wide: o.wide !== false, body: '<form novalidate data-ed>' + formHTML(o.fields, o.values || {}, o.cols) + '</form>',
      actions: (o.remove ? [{ label: 'Delete', cls: 'btn-ghost !text-bad-600 sm:mr-auto', onClick: function (close) { o.remove().then(function (ok) { if (ok !== false) close(); }); } }] : [])
        .concat([{ label: 'Cancel', cls: 'btn-ghost', close: true }, { label: o.ok || 'Save', icon: 'save', onClick: function (close, btn) { submit(btn, close); } }]) });
    var form = m.body.querySelector('[data-ed]');
    wireForm(form);
    form.addEventListener('submit', function (e) { e.preventDefault(); var b = m.el.querySelector('[data-actions] .btn:last-child'); submit(b, m.close); });
    function submit(btn, close) {
      U.fieldError(form, null);
      var data = readForm(form, o.fields);
      if (o.validate) { var bad = o.validate(data instanceof FormData ? Object.fromEntries(data) : data); if (bad) { U.fieldError(form, bad[0], bad[1]); return; } }
      U.busy(btn, true, 'Saving');
      o.save(data).then(function (r) { U.busy(btn, false); close(); if (o.done) o.done(r); U.toast(o.saved || 'Saved'); }, function (err) { U.busy(btn, false); showErrors(form, err); });
    }
    return m;
  }

  /* ------------------------------------------------------------------ list / table */
  function table(cols, rows, o) {
    o = o || {};
    if (!rows.length) return '<div class="px-6 py-14 text-center"><span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cloud text-ink-400">' + icon(o.emptyIcon || 'search') + '</span><p class="mt-3 font-semibold text-ink-700">' + esc(o.empty || 'Nothing here yet') + '</p>' + (o.emptyHint ? '<p class="mt-1 text-sm text-ink-500">' + o.emptyHint + '</p>' : '') + '</div>';
    return '<div class="overflow-x-auto"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th class="' + (c.cls || '') + (c.right ? ' text-right' : '') + '">' + esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr data-row="' + i + '"' + (o.href ? ' class="cursor-pointer hover:bg-sky-50/50" data-href="' + esc(o.href(r)) + '"' : '') + '>' + cols.map(function (c) {
          var v = c.render ? c.render(r) : esc(r[c.k] == null ? '—' : r[c.k]);
          return '<td class="' + (c.cls || '') + (c.right ? ' text-right tabular' : '') + '">' + v + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function pager(d, go) {
    if (!d || !d.pages || d.pages <= 1) return '';
    return '<div class="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-600"><span>Page ' + d.page + ' of ' + d.pages + ' · ' + U.num(d.count) + ' total</span><div class="flex gap-2">' +
      '<button class="btn btn-ghost btn-sm" data-page="' + (d.page - 1) + '"' + (d.previous ? '' : ' disabled') + '>' + icon('chevron-left', 'i-sm') + 'Previous</button>' +
      '<button class="btn btn-ghost btn-sm" data-page="' + (d.page + 1) + '"' + (d.next ? '' : ' disabled') + '>Next' + icon('chevron-right', 'i-sm') + '</button></div></div>';
  }
  /* A filterable, paginated list bound to an endpoint.
   * o: {endpoint, params, filters:[{name,type:'search'|'select'|'date',label,options}], columns, href(row), empty, actions(row)->html, onAction(act,row,btn,reload), toolbar, card:true}
   */
  function list(host, o) {
    var state = Object.assign({ page: 1 }, o.params || {}), rows = [], last = null;
    var filters = (o.filters || []).map(function (f) {
      if (f.type === 'search') return '<div class="relative min-w-[200px] flex-1 sm:max-w-xs">' + icon('search', 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 i-sm') + '<input type="search" class="input !py-2 pl-9 text-sm" data-flt="' + f.name + '" placeholder="' + esc(f.label || 'Search') + '" value="' + esc(state[f.name] || '') + '"></div>';
      if (f.type === 'date') return '<label class="flex items-center gap-2 text-sm text-ink-600">' + esc(f.label) + '<input type="date" class="input !w-auto !py-2 text-sm" data-flt="' + f.name + '" value="' + esc(state[f.name] || '') + '"></label>';
      if (f.type === 'toggle') return '<label class="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" class="check !mt-0" data-flt="' + f.name + '"' + (state[f.name] ? ' checked' : '') + '>' + esc(f.label) + '</label>';
      return '<select class="input !w-auto !py-2 text-sm" data-flt="' + f.name + '" aria-label="' + esc(f.label) + '"><option value="">' + esc(f.label) + '</option>' + optionsOf(f).map(function (x) { return '<option value="' + esc(x.value) + '"' + (String(state[f.name] || '') === String(x.value) ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select>';
    }).join('');
    host.innerHTML = (filters || o.toolbar ? '<div class="mb-4 flex flex-wrap items-center gap-2">' + filters + '<div class="ml-auto flex flex-wrap gap-2">' + (o.toolbar || '') + '</div></div>' : '') +
      '<div class="card overflow-hidden" data-body><div class="space-y-2 p-4"><div class="skel h-10"></div><div class="skel h-10"></div><div class="skel h-10"></div></div></div>';
    var body = host.querySelector('[data-body]');
    function load() {
      var params = Object.assign({}, state); if (params.page === 1) delete params.page;
      return api.get(o.endpoint, params).then(function (d) {
        last = d; rows = Array.isArray(d) ? d : d.results;
        if (o.transform) rows = o.transform(rows);
        var cols = o.columns.slice();
        if (o.actions) cols.push({ label: '', cls: 'w-px whitespace-nowrap text-right', render: function (r) { return '<div class="flex justify-end gap-1">' + o.actions(r) + '</div>'; } });
        body.innerHTML = (o.summary ? o.summary(d, rows) : '') + table(cols, rows, { href: o.href, empty: o.empty, emptyHint: o.emptyHint, emptyIcon: o.emptyIcon }) + pager(Array.isArray(d) ? null : d);
        if (o.onLoad) o.onLoad(d, rows, body);
      }, function (err) { body.innerHTML = '<p class="p-6 text-bad-600">' + esc(err.message) + '</p>'; });
    }
    var t;
    U.$$('[data-flt]', host).forEach(function (el) {
      var h = function () { state[el.dataset.flt] = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value.trim(); state.page = 1; load(); };
      if (el.type === 'search') el.addEventListener('input', function () { clearTimeout(t); t = setTimeout(h, 250); }); else el.addEventListener('change', h);
    });
    host.addEventListener('click', function (e) {
      var pg = e.target.closest('[data-page]'); if (pg) { state.page = Number(pg.dataset.page); load(); return; }
      var act = e.target.closest('[data-act]');
      if (act && o.onAction) { e.stopPropagation(); var tr = act.closest('[data-row]'); o.onAction(act.dataset.act, tr ? rows[Number(tr.dataset.row)] : null, act, load); return; }
      if (e.target.closest('a,button,input,select,label')) return;
      var row = e.target.closest('[data-href]'); if (row) location.hash = row.dataset.href;
    });
    load();
    return { reload: load, state: state, rows: function () { return rows; }, data: function () { return last; } };
  }
  function btn(act, label, ic, cls) { return '<button class="btn btn-sm ' + (cls || 'btn-ghost') + '" data-act="' + act + '"' + (label ? '' : ' aria-label="' + act + '"') + '>' + (ic ? icon(ic, 'i-sm') : '') + (label || '') + '</button>'; }
  function iconBtn(act, ic, label, cls) { return '<button class="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-cloud hover:text-ink-900 ' + (cls || '') + '" data-act="' + act + '" title="' + esc(label) + '" aria-label="' + esc(label) + '">' + icon(ic, 'i-sm') + '</button>'; }

  /* ------------------------------------------------------------------ page chrome */
  function header(title, sub, actions, back) {
    return '<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div class="min-w-0">' +
      (back ? '<a href="' + back[0] + '" class="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-sky-700">' + icon('arrow-left', 'i-sm') + esc(back[1]) + '</a>' : '') +
      '<h1 class="truncate font-display text-[26px] font-semibold leading-tight text-ink-900">' + title + '</h1>' + (sub ? '<p class="mt-1 text-[15px] text-ink-500">' + sub + '</p>' : '') + '</div>' +
      (actions ? '<div class="flex flex-wrap gap-2">' + actions + '</div>' : '') + '</div>';
  }
  function tabs(items, active) {
    return '<div class="tabs mb-6" role="tablist">' + items.map(function (t) { return '<a class="tab" role="tab" href="' + t[0] + '"' + (t[0] === active ? ' aria-selected="true"' : '') + '>' + esc(t[1]) + (t[2] ? ' <span class="ml-1 rounded-full bg-orange-100 px-1.5 text-xs text-orange-700">' + t[2] + '</span>' : '') + '</a>'; }).join('') + '</div>';
  }
  function kv(rows) { return '<dl class="divide-y divide-line">' + rows.filter(Boolean).map(function (r) { return '<div class="flex justify-between gap-4 py-2.5 text-[15px]"><dt class="text-ink-500">' + esc(r[0]) + '</dt><dd class="min-w-0 text-right font-medium text-ink-800">' + (r[1] == null || r[1] === '' ? '—' : r[1]) + '</dd></div>'; }).join('') + '</dl>'; }
  function denied() { return '<div class="card mx-auto max-w-md p-10 text-center"><span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cloud text-ink-500">' + icon('lock') + '</span><h1 class="mt-4 text-xl">No access</h1><p class="mt-1 text-ink-600">Your role (' + esc(me.role_label) + ') cannot open this section. Ask the owner if you need it.</p></div>'; }

  /* ------------------------------------------------------------------ navigation */
  var NAV = [
    ['Overview', [['dashboard', 'layout-dashboard', 'Dashboard', 'dashboard'], ['activity', 'activity', 'Activity log', 'activity']]],
    ['People', [['users', 'users', 'Learners', 'users'], ['team', 'user-cog', 'Team & roles', 'team']]],
    ['Money', [['orders', 'shopping-bag', 'Orders', 'orders'], ['withdrawals', 'banknote', 'Withdrawals', 'wallet', 'pending_withdrawals'], ['referrals', 'gift', 'Referrals', 'wallet', 'flagged_referrals'], ['ledger', 'wallet-cards', 'Wallet ledger', 'wallet']]],
    ['Catalog', [['courses', 'book-open', 'Courses', 'catalog'], ['packages', 'package', 'Packages', 'catalog'], ['setup', 'folder', 'Categories & instructors', 'catalog']]],
    ['Engagement', [['play', 'gamepad-2', 'Play & earn', 'content'], ['certificates', 'award', 'Certificates', 'certificates'], ['reviews', 'star', 'Reviews', 'content'], ['faqs', 'help-circle', 'FAQs', 'content']]],
    ['Support', [['messages', 'messages-square', 'Messages', 'messages', 'open_messages'], ['broadcast', 'megaphone', 'Broadcast', 'notifications']]],
    ['System', [['settings', 'settings', 'Site settings', 'settings'], ['exports', 'file-spreadsheet', 'Exports', 'exports']]]
  ];
  function sidebar() {
    return NAV.map(function (g) {
      var items = g[1].filter(function (i) { return can(i[3]); });
      if (!items.length) return '';
      return '<div class="mb-3"><p class="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">' + g[0] + '</p>' + items.map(function (i) {
        return '<a class="side-link" href="#/' + i[0] + '" data-nav="' + i[0] + '">' + icon(i[1], 'text-ink-400') + '<span class="flex-1">' + i[2] + '</span>' + (i[4] ? '<span class="hidden rounded-full bg-orange-400 px-1.5 text-[11px] font-bold text-ink-900" data-badge="' + i[4] + '"></span>' : '') + '</a>';
      }).join('') + '</div>';
    }).join('');
  }
  function shell() {
    document.title = 'Admin | ' + me.brand;
    U.$('#app').innerHTML =
      '<div class="lg:grid lg:min-h-screen lg:grid-cols-[256px_1fr]">' +
      '<aside class="adm-side fixed inset-y-0 left-0 z-50 flex w-[272px] -translate-x-full flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0" id="side">' +
      '<div class="flex h-16 flex-none items-center gap-2.5 border-b border-line px-5"><span class="h-8 w-8">' + U.LOGO_SVG + '</span><span class="font-display text-[17px] font-semibold">Skill<span class="text-orange-500">To</span>Success</span><span class="tag tag-sky ml-auto !px-2 !py-0.5 text-[11px]">Admin</span></div>' +
      '<nav class="flex-1 overflow-y-auto p-3" aria-label="Admin">' + sidebar() + '</nav>' +
      '<div class="flex-none border-t border-line p-3"><a class="side-link" href="../index.html" target="_blank" rel="noopener">' + icon('external-link', 'text-ink-400') + 'View website</a></div></aside>' +
      '<div class="fixed inset-0 z-40 hidden bg-ink-900/40 lg:hidden" id="side-ov"></div>' +
      '<div class="min-w-0">' +
      '<header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">' +
      '<button class="grid h-10 w-10 place-items-center rounded-lg hover:bg-cloud lg:hidden" id="side-btn" aria-label="Open menu">' + icon('menu') + '</button>' +
      '<div class="relative min-w-0 flex-1 sm:max-w-md">' + icon('search', 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 i-sm') + '<input type="search" id="gsearch" class="input !py-2 pl-9 text-sm" placeholder="Search learners, orders, courses, certificates" autocomplete="off"><div id="gresults" class="absolute left-0 right-0 top-12 z-50 hidden max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-pop"></div></div>' +
      '<div class="ml-auto flex items-center gap-3"><span class="hidden items-center gap-2 text-sm text-ink-600 md:flex" title="Live updates every 10 seconds"><span class="live-dot"></span><span id="online">Live</span></span>' +
      (me.payment_provider === 'mock' ? '<span class="tag tag-warn hidden sm:inline-flex" title="Set PAYMENT_PROVIDER=razorpay in .env for real payments">Test payments</span>' : '') +
      '<div class="relative"><button id="acct" class="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 hover:border-sky-300" aria-haspopup="menu">' + U.avatar(me.name, 30) + '<span class="hidden text-left leading-tight sm:block"><span class="block text-sm font-semibold">' + esc(me.name.split(' ')[0]) + '</span><span class="block text-[11px] text-ink-500">' + esc(me.role_label) + '</span></span></button>' +
      '<div id="acct-menu" class="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-line bg-white p-2 shadow-pop" hidden><p class="px-3 py-2 text-sm"><b class="block">' + esc(me.name) + '</b><span class="text-ink-500">' + esc(me.email) + '</span></p><div class="divider my-1"></div>' +
      '<a class="side-link !py-2" href="../dashboard.html#profile">' + icon('user', 'text-ink-400') + 'My profile</a><button class="side-link !py-2 w-full" id="logout">' + icon('log-out', 'text-ink-400') + 'Log out</button></div></div></div></header>' +
      '<main id="view" class="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8" tabindex="-1"></main></div></div>';
    var side = U.$('#side'), ov = U.$('#side-ov');
    function closeSide() { side.classList.add('-translate-x-full'); ov.classList.add('hidden'); }
    U.$('#side-btn').addEventListener('click', function () { side.classList.remove('-translate-x-full'); ov.classList.remove('hidden'); });
    ov.addEventListener('click', closeSide); side.addEventListener('click', function (e) { if (e.target.closest('a')) closeSide(); });
    var ab = U.$('#acct'), am = U.$('#acct-menu');
    ab.addEventListener('click', function (e) { e.stopPropagation(); am.hidden = !am.hidden; });
    document.addEventListener('click', function (e) { if (!am.hidden && !am.contains(e.target)) am.hidden = true; });
    U.$('#logout').addEventListener('click', function () { A.logout().then(start, start); });
    globalSearch();
  }
  function globalSearch() {
    var inp = U.$('#gsearch'), box = U.$('#gresults'), t, seq = 0;
    function hide() { box.classList.add('hidden'); }
    inp.addEventListener('input', function () {
      clearTimeout(t); var q = inp.value.trim();
      if (q.length < 2) return hide();
      t = setTimeout(function () {
        var my = ++seq;
        api.get('/search/', { q: q }).then(function (r) {
          if (my !== seq) return;
          var grp = function (title, items, fn) { return items.length ? '<p class="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">' + title + '</p>' + items.map(fn).join('') : ''; };
          var row = function (href, ic, a, b) { return '<a class="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-sky-50" href="' + href + '">' + icon(ic, 'i-sm text-ink-400') + '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold">' + esc(a) + '</span><span class="block truncate text-xs text-ink-500">' + esc(b) + '</span></span></a>'; };
          var html = grp('Learners', r.users, function (u) { return row('#/users/' + u.id, 'user', u.name, u.email + (u.phone ? ' · ' + u.phone : '')); }) +
            grp('Orders', r.orders, function (o) { return row('#/orders/' + o.id, 'receipt', o.number + ' · ' + U.inr(o.amount), o.user + ' · ' + o.title + ' · ' + o.status); }) +
            grp('Courses', r.courses, function (c) { return row('#/courses/' + c.id, 'book-open', c.title, c.slug); }) +
            grp('Certificates', r.certificates, function (c) { return row('#/certificates?q=' + encodeURIComponent(c.code), 'award', c.code, c.name); });
          box.innerHTML = html || '<p class="px-3 py-4 text-sm text-ink-500">No matches for "' + esc(q) + '"</p>';
          box.classList.remove('hidden');
        }, function () { /* ignore */ });
      }, 220);
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') { inp.value = ''; hide(); } });
    box.addEventListener('click', function (e) { if (e.target.closest('a')) { hide(); inp.value = ''; } });
    document.addEventListener('click', function (e) { if (!box.contains(e.target) && e.target !== inp) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); inp.focus(); } });
  }

  /* ------------------------------------------------------------------ live polling (badges + feed) */
  function paintCounters() {
    U.$$('[data-badge]').forEach(function (b) { var n = counters[b.dataset.badge] || 0; b.textContent = n; b.classList.toggle('hidden', !n); });
    var o = U.$('#online'); if (o) o.textContent = (counters.online_now || 0) + ' online now';
  }
  function poll() {
    if (document.hidden) return;
    api.get('/live/', { after: liveAfter }).then(function (r) {
      counters = r.counters; paintCounters();
      var rows = r.activity || [];
      if (rows.length) { var max = Math.max.apply(null, rows.map(function (a) { return a.id; })); var first = !liveAfter; liveAfter = Math.max(liveAfter, max); liveSubs.forEach(function (fn) { fn(rows, first, r.counters); }); }
      else liveSubs.forEach(function (fn) { fn([], false, r.counters); });
    }, function (err) { if (err.status === 401) start(); });
  }
  function onLive(fn) { liveSubs.push(fn); return function () { liveSubs = liveSubs.filter(function (x) { return x !== fn; }); }; }

  /* ------------------------------------------------------------------ router */
  function page(name, def) { pages[name] = def; }
  function parse() {
    var h = location.hash.replace(/^#\/?/, '') || 'dashboard';
    var q = {}, qi = h.indexOf('?');
    if (qi >= 0) { new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { q[k] = v; }); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0], id: parts[1], sub: parts[2], query: q, path: '#/' + h };
  }
  function route() {
    var r = parse(), def = pages[r.name];
    if (current && current.cleanup) { try { current.cleanup(); } catch (e) { /* */ } }
    current = { cleanup: null };
    U.$$('[data-nav]').forEach(function (a) { if (a.dataset.nav === r.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var old = U.$('#view'), view = old.cloneNode(false); old.replaceWith(view);   // fresh element = no stale listeners
    if (!def) { view.innerHTML = header('Page not found', 'That admin page does not exist.') + '<a class="btn btn-primary" href="#/dashboard">Go to dashboard</a>'; return; }
    if (def.section && !can(def.section)) { view.innerHTML = denied(); return; }
    view.innerHTML = '<div class="space-y-3"><div class="skel h-9 w-64"></div><div class="skel h-64 rounded-3xl"></div></div>';
    window.scrollTo(0, 0);
    try {
      var ret = def.render(view, r, current);
      if (ret && ret.catch) ret.catch(function (err) { view.innerHTML = '<div class="card p-8 text-center"><p class="font-semibold text-bad-600">' + esc(err.message) + '</p><button class="btn btn-ghost mt-4" onclick="location.reload()">Reload</button></div>'; });
    } catch (e) { view.innerHTML = '<p class="text-bad-600">' + esc(e.message) + '</p>'; console.error(e); }
  }

  /* ------------------------------------------------------------------ login + start */
  function loginScreen(msg) {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    document.title = 'Admin sign in | SkillToSuccess';
    U.$('#app').innerHTML = '<main class="grid min-h-screen lg:grid-cols-2"><div class="relative hidden overflow-hidden bg-gradient-to-br from-sky-800 via-sky-700 to-sky-500 p-12 text-white lg:flex lg:flex-col">' +
      '<div class="flex items-center gap-2.5"><span class="h-9 w-9">' + U.LOGO_SVG + '</span><span class="font-display text-lg font-semibold">SkillToSuccess</span></div>' +
      '<div class="mt-auto max-w-md"><p class="font-display text-[34px] font-semibold leading-tight">Run the whole academy from one place.</p><ul class="mt-6 space-y-3 text-sky-100">' +
      ['Live sales, signups and learning activity', 'Courses, lessons, quizzes and packages', 'Orders, refunds, cashback and withdrawals', 'Every change saved in the activity log'].map(function (t) { return '<li class="flex items-center gap-3">' + icon('check-circle-2', 'text-orange-300') + t + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="flex items-center justify-center p-6"><form id="alf" class="w-full max-w-sm" novalidate><div class="mb-8 flex items-center gap-2.5 lg:hidden"><span class="h-9 w-9">' + U.LOGO_SVG + '</span><span class="font-display text-lg font-semibold">SkillToSuccess</span></div>' +
      '<p class="eyebrow">' + icon('shield-check', 'i-sm') + 'Admin panel</p><h1 class="text-display-md">Sign in</h1><p class="mt-2 text-ink-600">Use your team account.</p>' +
      (msg ? '<div class="mt-5 rounded-xl bg-bad-50 px-4 py-3 text-sm text-bad-600">' + esc(msg) + '</div>' : '') +
      '<div class="mt-6 grid gap-4"><div><label class="label" for="al-id">Email</label><input class="input" id="al-id" name="identifier" autocomplete="username" required></div>' +
      '<div><label class="label" for="al-pw">Password</label><input class="input" id="al-pw" name="password" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn btn-primary btn-lg btn-block">Sign in</button></div><p class="mt-6 text-center text-sm text-ink-500"><a class="link" href="../index.html">Back to website</a></p></form></div></main>';
    var f = U.$('#alf');
    U.$('#al-id').focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault(); U.fieldError(f, null);
      var b = f.querySelector('button'); U.busy(b, true, 'Signing in');
      A.login(U.$('#al-id').value.trim(), U.$('#al-pw').value).then(function (r) {
        if (!r.user.is_staff) { A.logout(); loginScreen('This account is not part of the admin team.'); return; }
        start();
      }, function (err) { U.busy(b, false); U.failure(err, f); });
    });
  }
  /* Dropdown menus: <button data-menu-btn> followed by <div data-menu hidden> */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-menu-btn]');
    U.$$('[data-menu]').forEach(function (m) { if (b && m === b.nextElementSibling) { m.hidden = !m.hidden; } else if (!m.contains(e.target) || e.target.closest('button,a')) m.hidden = true; });
  });
  var hashBound = false;
  function start() {
    if (!A.maybeLoggedIn()) return loginScreen();
    return api.get('/me/').then(function (m) {
      me = m; liveAfter = 0; liveSubs = [];
      shell();
      if (!hashBound) { window.addEventListener('hashchange', route); hashBound = true; }
      route();
      poll();
      if (liveTimer) clearInterval(liveTimer);
      liveTimer = setInterval(poll, 10000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
    }, function (err) {
      if (err.status === 403) { A.logout(); return loginScreen('This account is not part of the admin team.'); }
      if (err.status === 401) return loginScreen();
      U.$('#app').innerHTML = '<div class="grid min-h-screen place-items-center p-6 text-center"><div><p class="font-semibold text-bad-600">' + esc(err.message) + '</p><button class="btn btn-primary mt-4" onclick="location.reload()">Try again</button></div></div>';
    });
  }

  return {
    start: start, page: page, api: api, can: can, me: function () { return me; }, options: loadOptions, counters: function () { return counters; }, onLive: onLive, poll: poll,
    dt: dt, day: day, tag: tag, activityRow: activityRow, confirm: confirmBox, run: run, formHTML: formHTML, wireForm: wireForm, readForm: readForm, showErrors: showErrors, editor: editor,
    table: table, list: list, refresh: function () { route(); }, btn: btn, iconBtn: iconBtn, header: header, tabs: tabs, kv: kv, denied: denied, qs: qs
  };
})();
