// Removes metadata from uploaded photos before they are stored. Phone photos carry EXIF data,
// which can include GPS location, camera serial numbers and the time of the photo. Only the
// metadata segments are removed; the picture data and the colour profile are kept.
// Returns null if the file structure cannot be read, so the caller can reject it.

// JPEG: drop APP1 (EXIF/XMP), APP3–APP15 (vendor and IPTC data) and COM. Keep APP0 (JFIF) and APP2 (ICC colour).
function stripJpeg(buf) {
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length) {
    if (i + 2 > buf.length || buf[i] !== 0xFF) return null;
    const marker = buf[i + 1];
    if (marker === 0xD9) { out.push(buf.subarray(i, i + 2)); break; }                 // end of image
    if (marker === 0xDA) { out.push(buf.subarray(i)); break; }                          // scan data follows: keep the rest
    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { out.push(buf.subarray(i, i + 2)); i += 2; continue; }
    if (i + 4 > buf.length) return null;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return null;
    const seg = buf.subarray(i, i + 2 + len);
    const metadata = marker === 0xFE || (marker >= 0xE1 && marker <= 0xEF && marker !== 0xE2);
    if (!metadata) out.push(seg);
    i += 2 + len;
  }
  return Buffer.concat(out);
}

// PNG: drop text chunks (tEXt, zTXt, iTXt), EXIF (eXIf) and last-modified time (tIME).
const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);
function stripPng(buf) {
  const out = [buf.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) return null;
    if (!PNG_DROP.has(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(out);
}

// WebP: drop EXIF and XMP chunks and clear their flags in the VP8X header.
function stripWebp(buf) {
  const chunks = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const id = buf.toString('latin1', i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    const end = i + 8 + size + (size & 1);
    if (end > buf.length) return null;
    if (id !== 'EXIF' && id !== 'XMP ') {
      const chunk = Buffer.from(buf.subarray(i, end));
      if (id === 'VP8X' && chunk.length >= 9) chunk[8] &= ~(0x04 | 0x08);              // XMP and EXIF flags
      chunks.push(chunk);
    }
    i = end;
  }
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const head = Buffer.alloc(8);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

function stripMetadata(buf, type) {
  if (type === 'jpg') return stripJpeg(buf);
  if (type === 'png') return stripPng(buf);
  if (type === 'webp') return stripWebp(buf);
  return null;
}

module.exports = { stripMetadata, stripJpeg, stripPng, stripWebp };
