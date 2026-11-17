'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, homeFor } from '@/lib/api';
import { STRINGS } from '@/lib/i18n';

const AppCtx = createContext(null);
const ToastCtx = createContext(() => {});

const FALLBACK_CFG = { price: 799, base: 677, gst: 122, gstPercent: 18, durationMin: 30, statuses: [], topics: [], payments: { mode: 'off' }, meet: { provider: 'public' } };

export function Providers({ children }) {
  const [cfg, setCfg] = useState(null);
  const [me, setMe] = useState(undefined);       // undefined = still loading, null = signed out
  const [lang, setLangState] = useState('en');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    try { const l = localStorage.getItem('gj:lang'); if (l === 'te' || l === 'en') setLangState(l); } catch {}
    Promise.all([
      api('GET', '/config').catch(() => FALLBACK_CFG),
      api('GET', '/auth/me').then(r => r.user).catch(() => null),
    ]).then(([c, u]) => { setCfg(c); setMe(u); });
  }, []);

  useEffect(() => { document.documentElement.lang = lang === 'te' ? 'te' : 'en'; }, [lang]);

  const setLang = useCallback(l => { setLangState(l); try { localStorage.setItem('gj:lang', l); } catch {} }, []);
  const t = useCallback(k => STRINGS[lang]?.[k] ?? STRINGS.en[k] ?? k, [lang]);
  const refreshConfig = useCallback(async () => setCfg(await api('GET', '/config')), []);

  const toast = useCallback((msg, kind) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, msg, kind }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3600);
  }, []);

  const value = useMemo(() => ({ cfg: cfg || FALLBACK_CFG, cfgReady: !!cfg, me, setMe, lang, setLang, t, refreshConfig }), [cfg, me, lang, setLang, t, refreshConfig]);

  return (
    <AppCtx.Provider value={value}>
      <ToastCtx.Provider value={toast}>
        {children}
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map(x => <div key={x.id} className={`toast ${x.kind || ''}`}>{x.msg}</div>)}
        </div>
      </ToastCtx.Provider>
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
export const useToast = () => useContext(ToastCtx);

// Wraps an async action: shows errors as toasts and handles an expired session.
export function useAction() {
  const toast = useToast();
  const { setMe } = useApp();
  const router = useRouter();
  return useCallback(async (fn, okMsg) => {
    try {
      const r = await fn();
      if (okMsg) toast(okMsg);
      return r;
    } catch (e) {
      if (e.status === 401) { setMe(null); router.replace('/login'); toast('Please sign in again', 'bad'); }
      else toast(e.message, 'bad');
      return undefined;
    }
  }, [toast, setMe, router]);
}

// Route guard for portal pages.
export function RequireRole({ roles, children }) {
  const { me } = useApp();
  const router = useRouter();
  const path = usePathname();
  const ok = me && roles.includes(me.role);
  useEffect(() => {
    if (me === undefined) return;
    if (!me) router.replace('/login?next=' + encodeURIComponent(path));
    else if (!roles.includes(me.role)) router.replace(homeFor(me));
  }, [me, roles, router, path]);
  if (!ok) return <div className="loader"><div className="ring" /><span>Loading…</span></div>;
  return children;
}

export function Loader({ label = 'Loading…' }) {
  return <div className="loader"><div className="ring" /><span>{label}</span></div>;
}
