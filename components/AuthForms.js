'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp, useAction } from './Providers';
import { AuthLayout } from './Shells';
import Icon from './Icon';
import { api, homeFor } from '@/lib/api';

function useAfterLogin() {
  const { setMe } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  return user => {
    setMe(user);
    const next = params.get('next');
    const safe = next && next.startsWith('/') && !next.startsWith('//');
    router.replace(safe && user.role === 'customer' ? next : homeFor(user));
  };
}

function GoogleButton() {
  const { cfg } = useApp();
  const ref = useRef(null);
  const done = useAfterLogin();
  const run = useAction();
  useEffect(() => {
    if (!cfg.googleClientId || !ref.current) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async r => { const d = await run(() => api('POST', '/auth/google', { credential: r.credential })); if (d) done(d.user); },
      });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 380 });
    };
    document.body.appendChild(s);
    return () => s.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.googleClientId]);
  if (!cfg.googleClientId) return null;
  return <><div ref={ref} style={{ minHeight: 44, display: 'flex', justifyContent: 'center' }} /><div className="or">or with email</div></>;
}

export function LoginForm() {
  const { cfg } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [devName, setDevName] = useState('');
  const run = useAction();
  const done = useAfterLogin();
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    const d = await run(() => api('POST', '/auth/login', { email, password }));
    setBusy(false);
    if (d) done(d.user);
  };
  const dev = async e => {
    e.preventDefault();
    const d = await run(() => api('POST', '/auth/dev', { name: devName }));
    if (d) done(d.user);
  };
  return (
    <AuthLayout quote={<>Every line tells a story. <em>Let&rsquo;s read yours together.</em></>}>
      <Link href="/" className="back-home"><Icon name="arrowLeft" />Back to Guruji</Link>
      <span className="eyebrow on-ivory">Welcome back</span>
      <h1>Sign in</h1>
      <p className="sub">Continue to your consultations, messages and reports.</p>
      <GoogleButton />
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="em">Email</label><input id="em" className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button className={`btn block ${busy ? 'busy' : ''}`} style={{ marginTop: 22 }} type="submit">Sign in</button>
      </form>
      <p className="alt">New to Guruji? <Link href="/register" className="link">Create an account</Link></p>
      <p className="alt" style={{ marginTop: 8 }}>Forgotten your password? Write to {cfg.supportEmail ? <a className="link" href={`mailto:${cfg.supportEmail}`}>{cfg.supportEmail}</a> : 'support'} from your registered email and we will help you back in.</p>
      {cfg.devLogin && (
        <form onSubmit={dev} className="notice" style={{ marginTop: 20, flexDirection: 'column' }}>
          <strong>Development sign-in</strong>
          <span>Only available when NODE_ENV is not production.</span>
          <div className="row" style={{ width: '100%' }}><input className="input" placeholder="Any name" value={devName} onChange={e => setDevName(e.target.value)} required /><button className="btn outline sm" type="submit">Enter</button></div>
        </form>
      )}
    </AuthLayout>
  );
}

export function RegisterForm() {
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const run = useAction();
  const done = useAfterLogin();
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Please enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Please enter a valid email';
    if (f.mobile && !/^[6-9]\d{9}$/.test(f.mobile)) er.mobile = 'Enter a 10-digit Indian mobile number';
    if (f.password.length < 8) er.password = 'Use at least 8 characters';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    const d = await run(() => api('POST', '/auth/register', f), 'Welcome to Guruji');
    setBusy(false);
    if (d) done(d.user);
  };
  const field = (k, label, props = {}, hint) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <input id={k} className="input" value={f[k]} onChange={set(k)} aria-invalid={!!errs[k]} aria-describedby={`${k}-h`} {...props} />
      <span id={`${k}-h`} className={errs[k] ? 'err' : 'hint'}>{errs[k] || hint || ''}</span>
    </div>
  );
  return (
    <AuthLayout quote={<>A personal reading, <em>written for you</em> and kept private.</>}>
      <Link href="/" className="back-home"><Icon name="arrowLeft" />Back to Guruji</Link>
      <span className="eyebrow on-ivory">Create your account</span>
      <h1>Begin your consultation</h1>
      <p className="sub">One account for booking, messages with Guruji and your reports.</p>
      <GoogleButton />
      <form onSubmit={submit} noValidate>
        {field('name', 'Full name', { autoComplete: 'name' })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('mobile', 'Mobile (optional)', { inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' }, 'So Guruji can reach you about your session. No OTP, no marketing messages.')}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password' }, 'At least 8 characters')}
        <button className={`btn block ${busy ? 'busy' : ''}`} style={{ marginTop: 22 }} type="submit">Create account</button>
      </form>
      <p className="alt">Already registered? <Link href="/login" className="link">Sign in</Link></p>
      <p className="alt" style={{ marginTop: 6 }}>By continuing you agree to our <Link href="/terms" className="link">Terms &amp; Privacy</Link>.</p>
    </AuthLayout>
  );
}

export function StaffForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const run = useAction();
  const { setMe } = useApp();
  const router = useRouter();
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    const d = await run(() => api('POST', '/auth/staff', { email, password }));
    setBusy(false);
    if (d) { setMe(d.user); router.replace(homeFor(d.user)); }
  };
  return (
    <AuthLayout quote={<>Guruji workspace <em>and administration</em></>}>
      <Link href="/" className="back-home"><Icon name="arrowLeft" />Back to the website</Link>
      <span className="eyebrow on-ivory">Staff only</span>
      <h1>Staff sign-in</h1>
      <p className="sub">For Guruji reviewers and administrators. Customers can <Link href="/login" className="link">sign in here</Link>.</p>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="se">Work email</label><input id="se" className="input" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="sp">Password</label><input id="sp" className="input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button className={`btn block ${busy ? 'busy' : ''}`} style={{ marginTop: 22 }} type="submit">Sign in</button>
      </form>
    </AuthLayout>
  );
}
