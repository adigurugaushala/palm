// PayU India Hosted Checkout — SHA-512 hash generation and reverse verification.
// Field order per the official PayU spec:
//   request  : key|txnid|amount|productinfo|firstname|email|udf1..udf5|||||| salt
//   response : salt|status|||||| udf5..udf1|email|firstname|productinfo|amount|txnid|key    (reversed)
// Live  endpoint:  https://secure.payu.in/_payment
// Test  endpoint:  https://test.payu.in/_payment
const { sha512 } = require('./util');

const PIPES = Array.from({ length: 5 }, () => ''); // five empty udf fields by default

function payField(name, v) { return v == null ? '' : String(v); }

// Request hash per PayU spec:
//   key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
// (five empty udf6..udf10 reserved fields, then SALT.)
function requestHashString({ key, txnid, amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5 }, salt) {
  const udf = [udf1, udf2, udf3, udf4, udf5].map(v => payField(null, v));
  return [
    key, txnid, Number(amount).toFixed(2), productinfo, firstname, email,
    udf[0], udf[1], udf[2], udf[3], udf[4],
    '', '', '', '', '',
    salt,
  ].join('|');
}

// Reverse hash for a PayU response:
//   SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
// (five empty udf10..udf6 reserved fields between status and udf5.)
function responseHashString(r, salt) {
  const additionalCharges = r.additionalCharges;
  const base = [
    salt, r.status,
    '', '', '', '', '',
    payField('udf5', r.udf5), payField('udf4', r.udf4), payField('udf3', r.udf3), payField('udf2', r.udf2), payField('udf1', r.udf1),
    r.email, r.firstname, r.productinfo, Number(r.amount).toFixed(2), r.txnid, r.key,
  ].join('|');
  return additionalCharges ? additionalCharges + '|' + base : base;
}

function buildCheckoutFields(cfg, order) {
  const fields = {
    key: cfg.key,
    txnid: order.txnid,
    amount: Number(order.amount).toFixed(2),
    productinfo: order.productinfo,
    firstname: order.firstname,
    email: order.email,
    phone: order.phone || '',
    surl: order.surl,
    furl: order.furl,
    udf1: order.udf1 || '',
    udf2: order.udf2 || '',
    udf3: order.udf3 || '',
    udf4: order.udf4 || '',
    udf5: order.udf5 || '',
  };
  fields.hash = sha512(requestHashString(fields, cfg.salt));
  return { action: cfg.baseUrl + '/_payment', fields };
}

function verifyResponseHash(cfg, body) {
  if (!body?.hash) return false;
  const expected = sha512(responseHashString(body, cfg.salt));
  // use case-insensitive compare since PayU returns lowercase hex
  return expected.toLowerCase() === String(body.hash).toLowerCase();
}

module.exports = { buildCheckoutFields, verifyResponseHash, requestHashString, responseHashString };
