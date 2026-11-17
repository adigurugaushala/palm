'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { useApp, useAction, Loader } from '@/components/Providers';
import { BookingStepper, PhotoUploader } from '@/components/Portal';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { age, fmtDayLong } from '@/lib/format';

const SUB = ['about', 'birth', 'questions', 'palm'];
const SUB_LABEL = { about: 'About you', birth: 'Birth details', questions: 'Your questions', palm: 'Palm photographs' };

function Details() {
  const { id } = useParams();
  const params = useSearchParams();
  const router = useRouter();
  const { me, cfg, t } = useApp();
  const run = useAction();
  const [b, setB] = useState(null);
  const [step, setStep] = useState(params.get('step') === 'palm' ? 'palm' : 'about');
  const [f, setF] = useState({});
  const [q, setQ] = useState([]);
  const [note, setNote] = useState('');
  const [hand, setHand] = useState('');
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('GET', `/bookings/${id}`).then(({ booking }) => {
      if (!booking.editable) { router.replace(`/bookings/${id}`); return; }
      setB(booking);
      setF({ lang: 'English', ct: 'Palmistry', ba: 'Known', cty: 'India', name: me?.name || '', mob: me?.mobile || '', ...booking.form });
      let topic = null;
      try { topic = sessionStorage.getItem('gj:topic'); } catch {}
      setQ(booking.questions.length ? booking.questions : topic && cfg.topics.includes(topic) ? [topic] : []);
      setNote(booking.note || '');
      setHand(booking.hand || '');
    }).catch(() => router.replace('/account'));
  }, [id, router, me, cfg.topics]);

  if (!b) return <Loader />;
  const idx = SUB.indexOf(step);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const go = s => { setStep(s); setErrs({}); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const validate = () => {
    const e = {};
    if (step === 'about') {
      if (!f.name || f.name.trim().length < 2) e.name = 'Please enter your full name';
      if (!f.dob) e.dob = 'Please choose your date of birth';
      else if (new Date(f.dob) > new Date()) e.dob = 'Date of birth cannot be in the future';
      if (!/^[6-9]\d{9}$/.test(f.mob || '')) e.mob = 'Enter a 10-digit Indian mobile number';
    }
    if (step === 'birth' && f.ct !== 'Palmistry' && !f.bp) e.bp = 'Birthplace is needed for an astrology reading';
    if (step === 'questions' && !q.length) e.q = 'Choose at least one topic';
    setErrs(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return false;
    setBusy(true);
    const r = await run(() => api('PUT', `/bookings/${id}/details`, { form: f, questions: q, note, hand }));
    setBusy(false);
    if (r) setB(r.booking);
    return !!r;
  };
  const next = async () => { if (await save()) go(SUB[idx + 1]); };
  const submit = async () => {
    if (!hand) { setErrs({ hand: 'Please tell us which hand you write with' }); return; }
    const missing = [0, 1, 2].filter(i => !b.photos.some(p => p.idx === i));
    if (missing.length) { setErrs({ photos: 'Please add the three required photographs' }); return; }
    setBusy(true);
    const ok = await run(async () => {
      await api('PUT', `/bookings/${id}/details`, { form: f, questions: q, note, hand });
      return api('POST', `/bookings/${id}/submit`);
    });
    setBusy(false);
    if (ok) { try { sessionStorage.removeItem('gj:topic'); } catch {} router.push(`/book/${id}/done`); }
  };

  const field = (k, label, props = {}, hint) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <input id={k} className="input" value={f[k] || ''} onChange={set(k)} aria-invalid={!!errs[k]} {...props} />
      {(errs[k] || hint) && <span className={errs[k] ? 'err' : 'hint'}>{errs[k] || hint}</span>}
    </div>
  );
  const select = (k, label, opts) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <select id={k} className="input" value={f[k] || ''} onChange={set(k)}>{opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}</select>
    </div>
  );

  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Booking {b.id} · {fmtDayLong(b.date)}, {b.slot}</span><h1>{step === 'palm' ? t('stepPalm') : t('stepDetails')}</h1></div></div>
      <BookingStepper step={step === 'palm' ? 3 : 2} />
      {b.flag?.type === 'returned' && <div className="notice warn" style={{ marginBottom: 18 }}><Icon name="alert" />Guruji asked: {b.flag.reason}</div>}
      <div className="substeps" aria-label="Form sections">
        {SUB.map((s, i) => <span key={s} className={s === step ? 'on' : i < idx ? 'done' : ''}>{i + 1}. {SUB_LABEL[s]}</span>)}
      </div>

      <section className="card step-panel" key={step}>
        {step === 'about' && (
          <>
            <div className="card-title"><h3>About you</h3><span className="muted">Signed in as {me?.email}</span></div>
            <div className="grid-2">
              {field('name', t('name'), { autoComplete: 'name' })}
              {field('mob', t('mob'), { inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' }, 'Guruji may call this number about your session')}
              {field('dob', t('dob'), { type: 'date', max: new Date().toISOString().slice(0, 10) }, f.dob ? `Age ${age(f.dob)}` : undefined)}
              {select('gn', 'Gender (optional)', ['', 'Female', 'Male', 'Other', 'Prefer not to say'])}
              {select('lang', t('lang'), ['English', 'తెలుగు', 'हिन्दी'])}
              <div className="field">
                <span className="label">Consultation type</span>
                <div className="chips">{['Palmistry', 'Astrology + Palmistry'].map(x => <button type="button" key={x} className="chip" aria-pressed={f.ct === x} onClick={() => setF({ ...f, ct: x })}>{x}</button>)}</div>
              </div>
            </div>
          </>
        )}
        {step === 'birth' && (
          <>
            <div className="card-title"><h3>Birth details</h3><span className="muted">{f.ct === 'Palmistry' ? 'Optional for palmistry' : 'Needed for astrology'}</span></div>
            <div className="grid-2">
              {field('bp', `Birthplace${f.ct !== 'Palmistry' ? '' : ' (optional)'}`, { autoComplete: 'off' }, 'Town or city, district')}
              {field('bt', 'Birth time (optional)', { type: 'time' })}
              {select('ba', 'How accurate is the birth time?', ['Known', 'Approximate', 'Unknown'])}
              <div />
              {field('city', 'Current city', { autoComplete: 'address-level2' })}
              {field('cty', 'Country', { autoComplete: 'country-name' })}
            </div>
          </>
        )}
        {step === 'questions' && (
          <>
            <div className="card-title"><h3>What would you like to discuss?</h3></div>
            <div className="field">
              <span className="label">Topics</span>
              <div className="chips" role="group" aria-label="Topics">
                {cfg.topics.map(x => <button type="button" key={x} className="chip" aria-pressed={q.includes(x)} onClick={() => setQ(q.includes(x) ? q.filter(y => y !== x) : [...q, x])}>{q.includes(x) && <Icon name="check" />}{x}</button>)}
              </div>
              {errs.q && <span className="err">{errs.q}</span>}
            </div>
            <div className="field">
              <label htmlFor="note">Your question for Guruji</label>
              <textarea id="note" className="input" rows={6} maxLength={4000} value={note} onChange={e => setNote(e.target.value)} placeholder="Share whatever context would help — a decision you are weighing, something you would like to understand." />
              <span className="hint">{note.length}/4000</span>
            </div>
          </>
        )}
        {step === 'palm' && (
          <>
            <div className="card-title"><h3>Which hand do you write with?</h3></div>
            <div className="chips" role="group" aria-label="Dominant hand">
              {['Right-handed', 'Left-handed'].map(x => <button type="button" key={x} className="chip" aria-pressed={hand === x} onClick={() => { setHand(x); setErrs({}); }}>{x}</button>)}
            </div>
            {errs.hand && <p className="err" style={{ marginTop: 8 }}>{errs.hand}</p>}
            <div className="notice" style={{ margin: '22px 0' }}><Icon name="lock" />Photographs are stored privately. Only you, your assigned Guruji and our administrators can see them.</div>
            <PhotoUploader booking={b} onChange={setB} />
            {errs.photos && <p className="err" style={{ marginTop: 12 }}>{errs.photos}</p>}
          </>
        )}
        <div className="form-foot">
          {idx > 0 ? <button className="btn ghost" onClick={() => go(SUB[idx - 1])}><Icon name="arrowLeft" />{t('back')}</button> : <span />}
          {step === 'palm'
            ? <button className={`btn ${busy ? 'busy' : ''}`} onClick={submit}>{t('submit')}<Icon name="arrowRight" /></button>
            : <button className={`btn ${busy ? 'busy' : ''}`} onClick={next}>{t('cont')}<Icon name="arrowRight" /></button>}
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Suspense fallback={<Loader />}><Details /></Suspense></CustomerShell>;
}
