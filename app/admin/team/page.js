'use client';
import { useState } from 'react';
import { AdminShell, PageHead, useLoad, Confirm } from '@/components/Admin';
import { Modal } from '@/components/Portal';
import { useApp, useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';

const ROLE = { admin: 'Administrator', reviewer: 'Guruji' };

function AddMember({ onClose, onDone }) {
  const run = useAction();
  const [f, setF] = useState({ name: '', email: '', role: 'reviewer', password: '' });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    const r = await run(() => api('POST', '/admin/staff', f), 'Team member added');
    setBusy(false);
    if (r) { onDone(); onClose(); }
  };
  return (
    <Modal title="Add a team member" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <div className="field"><label htmlFor="sn">Full name</label><input id="sn" className="input" value={f.name} onChange={set('name')} required maxLength={80} /></div>
        <div className="field"><label htmlFor="se">Email</label><input id="se" className="input" type="email" value={f.email} onChange={set('email')} required /></div>
        <div className="field"><span className="label">Role</span>
          <div className="segmented" role="group" aria-label="Role">
            {['reviewer', 'admin'].map(r => <button type="button" key={r} aria-pressed={f.role === r} onClick={() => setF({ ...f, role: r })}>{ROLE[r]}</button>)}
          </div>
        </div>
        <div className="field"><label htmlFor="sp">Temporary password</label><input id="sp" className="input" type="password" value={f.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
          <small className="muted">At least 8 characters. Share it privately and ask them to change it after signing in.</small></div>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className={`btn ${busy ? 'busy' : ''}`} type="submit">Add member</button></div>
      </form>
    </Modal>
  );
}

function Team() {
  const { me } = useApp();
  const run = useAction();
  const [d, load] = useLoad('/admin/staff', { staff: [] });
  const [adding, setAdding] = useState(false);
  const [toggle, setToggle] = useState(null);
  const [reset, setReset] = useState(null);
  const [pw, setPw] = useState('');
  if (!d) return <Loader />;

  return (
    <>
      <PageHead title="Guruji team"><button className="btn" onClick={() => setAdding(true)}><Icon name="plus" />Add member</button></PageHead>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Name</th><th>Role</th><th>Status</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {d.staff.map(s => (
              <tr key={s.id}>
                <td><b>{s.name}</b><span className="sub">{s.email}</span></td>
                <td>{ROLE[s.role] || s.role}</td>
                <td><span className={`badge ${s.active ? 'ok' : ''}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn ghost sm" onClick={() => { setPw(''); setReset(s); }}>Reset password</button>
                  {s.id !== me.id && <button className="btn outline sm" style={{ marginLeft: 6 }} onClick={() => setToggle(s)}>{s.active ? 'Deactivate' : 'Reactivate'}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <AddMember onClose={() => setAdding(false)} onDone={load} />}
      {toggle && (
        <Confirm title={toggle.active ? `Deactivate ${toggle.name}?` : `Reactivate ${toggle.name}?`} danger={toggle.active} confirmLabel={toggle.active ? 'Deactivate' : 'Reactivate'} onClose={() => setToggle(null)}
          onConfirm={async () => { const r = await run(() => api('PUT', `/admin/staff/${toggle.id}`, { active: !toggle.active }), 'Saved'); if (r) load(); return !!r; }}>
          <p>{toggle.active ? 'They will be signed out at once and can no longer open the workspace. Their past cases are kept.' : 'They will be able to sign in to the workspace again.'}</p>
        </Confirm>
      )}
      {reset && (
        <Confirm title={`New password for ${reset.name}`} confirmLabel="Set password" onClose={() => setReset(null)}
          onConfirm={async () => !!(await run(() => api('PUT', `/admin/staff/${reset.id}`, { password: pw }), 'Password updated'))}>
          <div className="field"><label htmlFor="np">New password</label><input id="np" className="input" type="password" value={pw} onChange={e => setPw(e.target.value)} minLength={8} autoComplete="new-password" autoFocus /></div>
        </Confirm>
      )}
    </>
  );
}

export default function Page() {
  return <AdminShell><Team /></AdminShell>;
}
