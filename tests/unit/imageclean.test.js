// Profile photo metadata removal. Synthetic files stand in for phone photos that carry EXIF
// (location, device) and XMP data; the picture must still read back at the same size.
const test = require('node:test');
const assert = require('node:assert');
const { imageSize } = require('image-size');
const { stripMetadata, stripJpeg, stripPng, stripWebp } = require('../../server/imageclean');

const SECRET = 'GPS 17.3850N 78.4867E';

function jpeg() {
  const soi = Buffer.from([0xFF, 0xD8]);
  const app0 = Buffer.from([0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const exif = Buffer.concat([Buffer.from([0xFF, 0xE1]), Buffer.from([0, 2 + 6 + SECRET.length]), Buffer.from('Exif\0\0'), Buffer.from(SECRET)]);
  const sof = Buffer.from([0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x96, 0x00, 0xC8, 0x01, 0x01, 0x11, 0x00]); // 200 x 150, 1 component
  const sos = Buffer.from([0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00]);
  const data = Buffer.from([0x12, 0x34, 0x56]);
  return Buffer.concat([soi, app0, exif, sof, sos, data, Buffer.from([0xFF, 0xD9])]);
}

function png() {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(320, 0); ihdr.writeUInt32BE(240, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('tEXt', Buffer.from('Location\0' + SECRET)), chunk('eXIf', Buffer.from(SECRET)), chunk('IDAT', Buffer.from([1, 2, 3])), chunk('IEND', Buffer.alloc(0))]);
}

function webp() {
  const chunk = (id, data) => { const pad = data.length & 1; const b = Buffer.alloc(8 + data.length + pad); b.write(id, 0, 'latin1'); b.writeUInt32LE(data.length, 4); data.copy(b, 8); return b; };
  const vp8x = Buffer.alloc(10); vp8x[0] = 0x2C; // EXIF, XMP and alpha flags set
  vp8x.writeUIntLE(319, 4, 3); vp8x.writeUIntLE(239, 7, 3); // 320 x 240
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), chunk('VP8X', vp8x), chunk('EXIF', Buffer.from(SECRET)), chunk('XMP ', Buffer.from(SECRET)), chunk('VP8L', Buffer.from([0x2F, 0, 0, 0, 0]))]);
  const head = Buffer.alloc(8); head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

test('JPEG: location metadata is removed and the picture is kept', () => {
  const src = jpeg();
  const out = stripJpeg(src);
  assert.ok(out, 'parsed');
  assert.ok(!out.includes(Buffer.from(SECRET)), 'EXIF text removed');
  assert.ok(out.includes(Buffer.from([0x12, 0x34, 0x56])), 'image data kept');
  assert.deepStrictEqual(imageSize(out), { width: 200, height: 150, type: 'jpg' });
});

test('JPEG: a truncated segment is rejected', () => {
  const bad = Buffer.from([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x40, 0x01]);
  assert.strictEqual(stripJpeg(bad), null);
});

test('PNG: text and EXIF chunks are removed, header and data kept', () => {
  const out = stripPng(png());
  assert.ok(out, 'parsed');
  assert.ok(!out.includes(Buffer.from(SECRET)), 'metadata removed');
  assert.deepStrictEqual(imageSize(out), { width: 320, height: 240, type: 'png' });
});

test('WebP: EXIF and XMP chunks are removed and their flags cleared', () => {
  const out = stripWebp(webp());
  assert.ok(out, 'parsed');
  assert.ok(!out.includes(Buffer.from(SECRET)), 'metadata removed');
  assert.strictEqual(out[20] & 0x0C, 0, 'EXIF and XMP flags cleared');
  assert.strictEqual(out.readUInt32LE(4), out.length - 8, 'RIFF size corrected');
  assert.deepStrictEqual(imageSize(out), { width: 320, height: 240, type: 'webp' });
});

test('unknown types are not stripped', () => {
  assert.strictEqual(stripMetadata(Buffer.from('GIF89a'), 'gif'), null);
});
