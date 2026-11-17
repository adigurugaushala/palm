// Shared checkout helpers for courses, services and donations.
// PayU payments are sent as a signed form (a full-page redirect to PayU's hosted checkout).
// Demo payments (no PayU keys, non-production only) go to the demo pay page.

export function postToPayU({ action, fields }) {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = action;
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement('input');
    i.type = 'hidden';
    i.name = k;
    i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

export function beginOrderPayment(payment, orderId, router) {
  if (payment?.mode === 'payu') return postToPayU(payment);
  router.push(`/orders/${orderId}/pay`);
}

export const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
