'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { useApp, Loader } from '@/components/Providers';
import { ReportView } from '@/components/Portal';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDay } from '@/lib/format';

function Reports() {
  const { t } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [list, setList] = useState(null);
  const [report, setReport] = useState(null);
  const sel = params.get('id');

  useEffect(() => { api('GET', '/bookings').then(r => setList(r.bookings.filter(b => b.reportReady))).catch(() => setList([])); }, []);
  const active = sel || list?.[0]?.id;
  useEffect(() => {
    if (!active) return;
    setReport(null);
    api('GET', `/bookings/${active}/report`).then(setReport).catch(() => setReport(false));
  }, [active]);

  if (!list) return <Loader />;
  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Your readings</span><h1>{t('reports')}</h1></div></div>
      {!list.length ? (
        <div className="card empty"><Icon name="document" /><h3>No reports yet</h3><p>Your written report appears here once Guruji publishes it after your consultation.</p><Link href="/bookings" className="btn outline" style={{ marginTop: 18 }}>View your bookings</Link></div>
      ) : (
        <div className="layout-2">
          <div>{report === null ? <Loader /> : report === false ? <div className="notice bad"><Icon name="alert" />This report could not be loaded.</div> : <ReportView report={report} />}</div>
          <aside className="side">
            <div className="card">
              <div className="card-title"><h3>Download</h3></div>
              <a className="btn block" href={`/api/bookings/${encodeURIComponent(active)}/report.pdf`} download><Icon name="download" />Download PDF</a>
              <p className="muted" style={{ marginTop: 10 }}>Your report is private — only you can download it while signed in.</p>
            </div>
            {list.length > 1 && (
              <div className="card">
                <div className="card-title"><h3>All reports</h3></div>
                <div className="list-rows">
                  {list.map(b => (
                    <button key={b.id} className="list-row" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer', gridTemplateColumns: '1fr auto' }} onClick={() => router.replace(`/reports?id=${b.id}`)}>
                      <span><span className="t">{fmtDay(b.date)}</span><span className="s" style={{ display: 'block' }}>{b.id} · {b.reviewer}</span></span>
                      {b.id === active ? <span className="badge brand">Open</span> : <Icon name="arrowRight" size={18} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <CustomerShell><Suspense fallback={<Loader />}><Reports /></Suspense></CustomerShell>;
}
