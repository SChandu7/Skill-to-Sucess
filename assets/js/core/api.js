/* SkillToSuccess — API client.
 * JWT: the short-lived access token is kept in memory (+ sessionStorage so a page change does not need a refresh).
 * Same-domain API  -> the refresh token is an httpOnly cookie that JavaScript can never read.
 * Other-domain API -> browsers block that cookie, so we ask the server for the refresh token (same as the app does)
 *                     and keep it in localStorage. On 401 we refresh once and retry.
 * Every error becomes an Error with .message (human text), .field, .status and .code.
 */
window.STS = window.STS || {};

STS.api = (function () {
  'use strict';
  var BASE = STS.config.API_BASE;
  var ORIGIN = STS.config.API_ORIGIN || '';

  // When Django is on another domain, file links like /media/... must point there too.
  function absolute(v) {
    if (!ORIGIN || v === null || typeof v !== 'object') {
      return (ORIGIN && typeof v === 'string' && /^\/(media|api)\//.test(v)) ? ORIGIN + v : v;
    }
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) v[i] = absolute(v[i]); return v; }
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) v[k] = absolute(v[k]);
    return v;
  }
  var KEY = 'sts:access', FLAG = 'sts:li', GUEST = 'sts:guest', RKEY = 'sts:refresh';
  // The API on another domain cannot use the login cookie, so the refresh token comes back in the reply.
  var CROSS_SITE = !!ORIGIN && ORIGIN.replace(/^https?:\/\//, '').split(':')[0] !== location.hostname;
  // Cookies are only used when the API is on the same domain. Across domains we send tokens instead,
  // so we must NOT ask for cookies: browsers refuse that when the server answers with '*'.
  var CREDS = CROSS_SITE ? 'omit' : 'include';
  var access = null, refreshing = null;

  function store(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* */ } }
  function local(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  try { access = sessionStorage.getItem(KEY); } catch (e) { access = null; }

  function setAccess(tok) { access = tok || null; store(KEY, access); if (tok) local(FLAG, '1'); }
  function setRefresh(tok) { if (CROSS_SITE) local(RKEY, tok || null); }
  function getRefresh() { return CROSS_SITE ? local(RKEY) : null; }
  function clearSession() { setAccess(null); local(FLAG, null); local(RKEY, null); }
  function maybeLoggedIn() { return !!access || local(FLAG) === '1' || !!getRefresh(); }

  function guestKey() {
    var k = local(GUEST);
    if (!k) { k = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36); local(GUEST, k); }
    return k;
  }

  function ApiError(body, status) {
    var e = new Error((body && body.detail) || (status >= 500 ? 'Our server had a problem. Please try again in a minute.' : 'Something went wrong. Please try again.'));
    e.field = body && body.field; e.status = status; e.code = body && body.code; e.data = body;
    return e;
  }

  function refresh() {
    if (refreshing) return refreshing;
    var h = { 'Content-Type': 'application/json' };
    if (CROSS_SITE) h['X-Client'] = 'mobile';
    refreshing = fetch(BASE + '/auth/refresh/', { method: 'POST', credentials: CREDS, headers: h,
      body: JSON.stringify(CROSS_SITE ? { refresh: getRefresh() || '' } : {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.access) throw ApiError(j, r.status); setAccess(j.access); setRefresh(j.refresh); return j.access; }); })
      .catch(function (e) { clearSession(); throw e; })
      .finally(function () { refreshing = null; });
    return refreshing;
  }

  function request(method, path, body, opts) {
    opts = opts || {};
    var headers = { 'X-Guest-Key': guestKey() };
    if (CROSS_SITE) headers['X-Client'] = 'mobile';
    var isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (access) headers.Authorization = 'Bearer ' + access;
    return fetch(BASE + path, { method: method, credentials: CREDS, headers: headers, body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)) })
      .then(function (r) {
        if (r.status === 401 && !opts.retried && !opts.noRefresh && maybeLoggedIn()) {
          return refresh().then(function () { return request(method, path, body, Object.assign({}, opts, { retried: true })); }, function () {
            throw ApiError({ detail: 'Your session has ended. Please log in again.', code: 'session_expired' }, 401);
          });
        }
        if (opts.raw) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw ApiError(j, r.status); }); return r; }
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { if (r.status === 401) clearSession(); throw ApiError(j, r.status); }
          return absolute(j);
        });
      }, function () { throw ApiError({ detail: 'No internet connection. Check your network and try again.', code: 'offline' }, 0); });
  }

  var get = function (p, o) { return request('GET', p, undefined, o); };
  var post = function (p, b, o) { return request('POST', p, b === undefined ? {} : b, o); };
  var patch = function (p, b) { return request('PATCH', p, b); };
  var del = function (p) { return request('DELETE', p); };

  function authDone(res) { setAccess(res.access); setRefresh(res.refresh); return res; }

  return {
    request: request, get: get, post: post, patch: patch, del: del,
    guestKey: guestKey, maybeLoggedIn: maybeLoggedIn, clearSession: clearSession, refresh: refresh,
    hasToken: function () { return !!access; },
    absolute: absolute,

    // Public
    site: function () { return get('/site/'); },
    course: function (slug) { return get('/courses/' + encodeURIComponent(slug) + '/'); },
    faqs: function () { return get('/faqs/'); },
    testimonials: function () { return get('/testimonials/'); },
    verifyCertificate: function (code) { return get('/certificates/' + encodeURIComponent(code) + '/', { noRefresh: true }); },
    contact: function (data) { return post('/contact/', data); },
    chat: function (messages) { return post('/chat/', { messages: messages }, { noRefresh: true }); },

    // Auth
    register: function (d) { d.guest_key = guestKey(); return post('/auth/register/', d).then(authDone); },
    login: function (identifier, password) { return post('/auth/login/', { identifier: identifier, password: password }, { noRefresh: true }).then(authDone); },
    logout: function () { return post('/auth/logout/', { refresh: getRefresh() || '' }, { noRefresh: true }).finally(clearSession); },
    sendOtp: function (phone) { return post('/auth/otp/', { phone: phone }, { noRefresh: true }); },
    resetPassword: function (phone, code, password) { return post('/auth/password-reset/', { phone: phone, code: code, password: password }, { noRefresh: true }); },

    // Me
    me: function () { return get('/me/'); },
    updateProfile: function (p) { return patch('/me/', p); },
    changePassword: function (o, n) { return post('/me/password/', { old_password: o, new_password: n }).then(authDone); },
    notifications: function () { return get('/me/notifications/'); },
    readNotifications: function () { return post('/me/notifications/read/'); },
    earnings: function (qs) { return get('/earnings/?' + qs); },
    myCourses: function () { return get('/me/courses/'); },
    courseChoices: function () { return get('/me/courses/choose/'); },
    chooseCourses: function (slugs) { return post('/me/courses/choose/', { courses: slugs }); },
    myCertificates: function () { return get('/me/certificates/'); },
    myOrders: function () { return get('/me/orders/'); },
    wallet: function (kind) { return get('/me/wallet/' + (kind && kind !== 'all' ? '?kind=' + kind : '')); },
    withdraw: function (amount, upi) { return post('/me/wallet/withdraw/', { amount: amount, upi: upi }); },
    referrals: function () { return get('/me/referrals/'); },
    deleteRequest: function (reason) { return post('/me/delete-request/', { reason: reason }); },

    // Learning
    lesson: function (id) { return get('/lessons/' + id + '/'); },
    quiz: function (id) { return get('/lessons/' + id + '/quiz/'); },
    quizCheck: function (id, q, a) { return post('/lessons/' + id + '/quiz/check/', { question: q, answer: a }); },
    quizSubmit: function (id, answers) { return post('/lessons/' + id + '/quiz/submit/', { answers: answers }); },
    completeLesson: function (id) { return post('/lessons/' + id + '/complete/'); },

    // Checkout
    quote: function (item) { return post('/orders/quote/', item); },
    createOrder: function (item) { return post('/orders/', item); },
    verifyOrder: function (number, p) { return post('/orders/' + number + '/verify/', p); },
    cancelOrder: function (number, reason, error) { return post('/orders/' + number + '/cancel/', { reason: reason, error: error }); },
    checkRef: function (code) { return get('/referrals/check/' + encodeURIComponent(code) + '/', { noRefresh: true }); },

    // Play
    play: function () { return get('/play/'); },
    playStart: function (topic) { return post('/play/quiz/' + topic + '/start/'); },
    playAnswer: function (round, q, a) { return post('/play/rounds/' + round + '/answer/', { question: q, answer: a }); },
    playFinish: function (round) { return post('/play/rounds/' + round + '/finish/'); },
    gameStart: function (kind) { return post('/play/games/' + kind + '/start/'); },
    gameSubmit: function (round, data) { return post('/play/rounds/' + round + '/submit/', data); },
    playClaim: function () { return post('/play/claim/'); }
  };
})();
