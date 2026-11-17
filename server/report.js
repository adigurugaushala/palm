const path = require('path');
const PDFDocument = require('pdfkit');
const { json } = require('./util');

const F = (pkg, file) => path.join(path.dirname(require.resolve(`@fontsource/${pkg}/package.json`)), 'files', file);
const FONTS = {
  latin: F('noto-sans', 'noto-sans-latin-400-normal.woff'),
  latinB: F('noto-sans', 'noto-sans-latin-700-normal.woff'),
  telugu: F('noto-sans-telugu', 'noto-sans-telugu-telugu-400-normal.woff'),
  teluguB: F('noto-sans-telugu', 'noto-sans-telugu-telugu-700-normal.woff'),
  deva: F('noto-sans-devanagari', 'noto-sans-devanagari-devanagari-400-normal.woff'),
  devaB: F('noto-sans-devanagari', 'noto-sans-devanagari-devanagari-700-normal.woff'),
};
const RED = '#A81919', ORANGE = '#FF6F00', GREY = '#777777';

// Split text into runs per script so each run uses a font that has its glyphs.
function runs(text) {
  const out = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    let s = c >= 0x0C00 && c <= 0x0C7F ? 'telugu' : c >= 0x0900 && c <= 0x097F ? 'deva' : 'latin';
    const prev = out[out.length - 1];
    if (prev && (s === 'latin' && /[\s‌‍.,!?;:()\-'"]/.test(ch))) s = prev.s; // keep spaces/punct with current run
    if (prev && prev.s === s) prev.t += ch; else out.push({ s, t: ch });
  }
  return out;
}
function write(doc, text, { bold = false, size = 11, color = '#262626', ...opts } = {}) {
  const r = runs(String(text || ' '));
  doc.fontSize(size).fillColor(color);
  r.forEach((run, i) => doc.font(run.s + (bold ? 'B' : '')).text(run.t, { ...opts, continued: i < r.length - 1 || !!opts.continued }));
}

function renderReport(b, reviewer, out) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Guruji Report ${b.id}` } });
  for (const [k, f] of Object.entries(FONTS)) doc.registerFont(k, f);
  doc.pipe(out);
  const form = json(b.form, {}), cl = json(b.checklist, {});

  doc.rect(0, 0, doc.page.width, 90).fill(RED);
  doc.font('latinB').fontSize(24).fillColor('#fff').text('GURUJI', 50, 28);
  doc.font('latin').fontSize(10).fillColor('#ffd9b8').text('PALMISTRY • GUIDANCE', 50, 58);
  doc.moveDown(3);
  doc.y = 115;

  write(doc, 'Palmistry Consultation Report', { bold: true, size: 18, color: RED });
  write(doc, `Booking ${b.id}  •  Session ${b.date}, ${b.slot}  •  Reviewed by ${reviewer}`, { size: 10, color: GREY });
  doc.moveDown();

  const row = (k, v) => { write(doc, k + ': ', { bold: true, continued: true }); write(doc, v || '—'); };
  write(doc, 'About you', { bold: true, size: 13, color: ORANGE }); doc.moveDown(0.3);
  row('Name', form.name);
  row('Date of birth', form.dob);
  if (form.bp) row('Birthplace', form.bp + (form.bt ? `, ${form.bt} (${form.ba || 'Known'})` : ''));
  row('Dominant hand', b.hand);
  row('Topics', json(b.questions, []).join(', '));
  doc.moveDown();

  const entries = Object.entries(cl).filter(([, v]) => v && v !== '—');
  if (entries.length) {
    write(doc, 'Palm observations', { bold: true, size: 13, color: ORANGE }); doc.moveDown(0.3);
    entries.forEach(([k, v]) => row(k, v));
    doc.moveDown();
  }

  write(doc, "Guruji's guidance", { bold: true, size: 13, color: ORANGE }); doc.moveDown(0.3);
  for (const para of (b.report_notes || '').split(/\n+/)) { write(doc, para, { lineGap: 3 }); doc.moveDown(0.4); }

  doc.moveDown(2);
  write(doc, `Published ${b.report_published_at || ''} UTC. This report reflects a traditional palmistry reading and is offered for guidance only.`, { size: 8, color: GREY });
  doc.end();
}

// Certificate of completion, A4 landscape. Issued only after Guruji marks the course complete.
function renderCertificate({ name, course, date, certNo }, out) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50, info: { Title: `Guruji certificate ${certNo}` } });
  for (const [k, f] of Object.entries(FONTS)) doc.registerFont(k, f);
  doc.pipe(out);
  const W = doc.page.width, H = doc.page.height;
  doc.lineWidth(2).strokeColor(RED).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(0.6).strokeColor(ORANGE).rect(34, 34, W - 68, H - 68).stroke();
  doc.y = 100;
  write(doc, 'GURUJI', { bold: true, size: 18, color: RED, align: 'center', characterSpacing: 4 });
  doc.moveDown(1.6);
  write(doc, 'Certificate of completion', { size: 30, color: RED, align: 'center' });
  doc.moveDown(0.8);
  write(doc, 'This certifies that', { size: 12, color: GREY, align: 'center' });
  doc.moveDown(0.4);
  write(doc, name, { bold: true, size: 26, align: 'center' });
  doc.moveDown(0.4);
  write(doc, 'has successfully completed', { size: 12, color: GREY, align: 'center' });
  doc.moveDown(0.4);
  write(doc, course, { bold: true, size: 18, color: RED, align: 'center' });
  doc.moveDown(2);
  const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date ? new Date(date) : new Date());
  write(doc, `Issued on ${when}   ·   Certificate no. ${certNo}`, { size: 10, color: GREY, align: 'center' });
  doc.end();
}

module.exports = { renderReport, renderCertificate };
