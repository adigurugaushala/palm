// PayU SHA-512 hash tests. The request hash formula per PayU docs:
//   sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
// Cross-check: hash the exact plaintext ourselves and confirm our module produces the same thing.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const payu = require('../../server/payu');

test('request hash matches the documented pipe-joined formula', () => {
  const order = {
    key: 'JP***g', txnid: 'abc123', amount: '10.00', productinfo: 'test product',
    firstname: 'Ravi', email: 'r@example.com', udf1: '', udf2: '', udf3: '', udf4: '', udf5: '',
  };
  const salt = 'eCw****jQ';
  const expected = crypto.createHash('sha512').update(
    `${order.key}|${order.txnid}|${order.amount}|${order.productinfo}|${order.firstname}|${order.email}|||||||||||${salt}`
  ).digest('hex');
  const actual = payu.buildCheckoutFields({ key: order.key, salt, baseUrl: 'https://test.payu.in' }, {
    txnid: order.txnid, amount: order.amount, productinfo: order.productinfo,
    firstname: order.firstname, email: order.email, surl: 's', furl: 'f',
  }).fields.hash;
  assert.strictEqual(actual, expected);
});

test('response hash is the reversed formula', () => {
  const salt = 'secret-salt';
  const key = 'MKEY01';
  const body = {
    status: 'success', key, txnid: 'TX1', amount: '799.00', productinfo: 'guruji',
    firstname: 'Ravi', email: 'r@example.com', udf1: 'GJ-1', udf2: 'UID', udf3: '', udf4: '', udf5: '',
  };
  const expected = crypto.createHash('sha512').update(
    `${salt}|${body.status}||||||${body.udf5}|${body.udf4}|${body.udf3}|${body.udf2}|${body.udf1}|${body.email}|${body.firstname}|${body.productinfo}|${body.amount}|${body.txnid}|${body.key}`
  ).digest('hex');
  body.hash = expected;
  assert.strictEqual(payu.verifyResponseHash({ salt, key }, body), true);
  body.hash = 'bogus';
  assert.strictEqual(payu.verifyResponseHash({ salt, key }, body), false);
});

test('amount is always formatted to two decimals in request hash', () => {
  const fields = payu.buildCheckoutFields(
    { key: 'K', salt: 'S', baseUrl: 'https://test.payu.in' },
    { txnid: 'T', amount: 799, productinfo: 'p', firstname: 'F', email: 'e@x.com', surl: 's', furl: 'f' },
  ).fields;
  assert.strictEqual(fields.amount, '799.00');
});
