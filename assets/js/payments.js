/* Payments. The server decides the provider:
 *   'razorpay' → real Razorpay Checkout (UPI, cards, netbanking)
 *   'mock'     → simulated sheet for testing (only when the server runs with PAYMENT_PROVIDER=mock)
 * Resolves with { razorpay_payment_id, razorpay_order_id, razorpay_signature } for /orders/<n>/verify/.
 */
window.STS = window.STS || {};

STS.pay = (function () {
  'use strict';
  var U = STS.ui;

  function razorpay(p) {
    return new Promise(function (resolve, reject) {
      function go() {
        var rz = new window.Razorpay({
          key: p.key, order_id: p.order_id, amount: p.amount, currency: p.currency, name: p.name, description: p.description,
          prefill: p.prefill, theme: { color: '#0A7BC2' }, retry: { enabled: true },
          handler: function (r) { resolve(r); },
          modal: { ondismiss: function () { var e = new Error('Payment window closed. You have not been charged.'); e.cancelled = true; reject(e); } }
        });
        rz.on('payment.failed', function (r) { var e = new Error((r.error && r.error.description) || 'Payment failed. No money was taken. Try another method.'); e.failed = true; e.detail = r.error; reject(e); });
        rz.open();
      }
      if (window.Razorpay) go();
      else {
        var s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = go; s.onerror = function () { reject(new Error('Could not load the payment window. Check your internet and try again.')); };
        document.head.appendChild(s);
      }
    });
  }

  function mock(p) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var body = U.h('<div><div class="mb-5 flex items-center justify-between rounded-2xl bg-cloud px-4 py-3"><div><p class="text-sm text-ink-500">' + U.esc(p.description) + '</p><p class="font-display text-2xl font-semibold tabular">' + U.inr(p.amount / 100) + '</p></div><span class="tag tag-orange">Test mode</span></div>' +
        '<p class="mb-4 text-sm text-ink-600">The server is in test mode, so no real money moves. Switch PAYMENT_PROVIDER to razorpay to take live payments.</p>' +
        '<button class="btn btn-primary btn-lg btn-block" data-pay>' + U.icon('lock', 'i-sm') + 'Pay ' + U.inr(p.amount / 100) + ' (test)</button>' +
        '<button class="mt-3 w-full text-center text-sm font-semibold text-ink-500 hover:underline" data-fail>Simulate a failed payment</button></div>');
      var m = U.modal({ title: 'Complete payment', icon: 'lock', body: body, onClose: function () { if (!settled) { settled = true; var e = new Error('Payment window closed. You have not been charged.'); e.cancelled = true; reject(e); } } });
      function run(fail) {
        m.body.innerHTML = '<div class="grid place-items-center py-10 text-center"><svg class="h-14 w-14 animate-spin text-sky-600" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".2" stroke-width="2.5" fill="none"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg><p class="mt-5 font-display text-lg font-semibold">Confirming with your bank</p></div>';
        setTimeout(function () {
          settled = true; m.close();
          if (fail) { var e = new Error('Your bank declined the payment. No money was taken. Try UPI or another card.'); e.failed = true; reject(e); }
          else resolve({ razorpay_payment_id: 'pay_test_' + Math.random().toString(36).slice(2, 10), razorpay_order_id: p.order_id, razorpay_signature: 'mock-ok' });
        }, 1100);
      }
      body.querySelector('[data-pay]').addEventListener('click', function () { run(false); });
      body.querySelector('[data-fail]').addEventListener('click', function () { run(true); });
    });
  }

  return { start: function (p) { return p.provider === 'razorpay' ? razorpay(p) : mock(p); } };
})();
