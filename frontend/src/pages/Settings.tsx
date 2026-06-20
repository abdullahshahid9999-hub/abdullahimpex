import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { triggerBlobDownload } from '../lib/format';
import { PageHeader } from '../components/ui';

interface Company {
  id: string;
  name: string;
  ntn: string | null;
  strn: string | null;
  address: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  is_default: boolean;
}

const MODULES = [
  { key: 'stock', label: 'Stock' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'customers', label: 'Customers' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'sales', label: 'Sales' },
  { key: 'invoices', label: 'Invoices' },
];

function CompanyCard({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const [form, setForm] = useState(company);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/companies/${company.id}`, {
        name: form.name,
        ntn: form.ntn,
        strn: form.strn,
        address: form.address,
        phone: form.phone,
        phone2: form.phone2,
        email: form.email,
      });
      toast.success('Company details updated.');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-bold">{company.name}</p>
          {company.is_default && <p className="text-xs text-ink-faint">Default for invoices</p>}
        </div>
        {!editing && (
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">NTN</label>
              <input className="input font-mono" value={form.ntn ?? ''} onChange={(e) => setForm({ ...form, ntn: e.target.value })} />
            </div>
            <div>
              <label className="label">S.T Registration #</label>
              <input className="input font-mono" value={form.strn ?? ''} onChange={(e) => setForm({ ...form, strn: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone 2</label>
              <input className="input" value={form.phone2 ?? ''} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-1 text-sm text-ink-muted">
          <p>NTN: {company.ntn || '—'}</p>
          {company.strn && <p>S.T Reg #: {company.strn}</p>}
          <p>{company.phone}{company.phone2 ? ` / ${company.phone2}` : ''}</p>
          <p>{company.email}</p>
          <p>{company.address}</p>
        </div>
      )}
    </div>
  );
}

function BackupExport() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(MODULES.map((m) => m.key));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  function toggle(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function handleDownload() {
    if (selected.length === 0) {
      toast.error('Choose at least one module.');
      return;
    }
    setDownloading(true);
    try {
      const params = new URLSearchParams({ modules: selected.join(',') });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const blob = await api.download(`/export?${params.toString()}`);
      triggerBlobDownload(blob, `backup-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Backup downloaded.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not generate backup.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card p-5">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <div>
          <p className="font-display text-sm font-bold">Data export &amp; backup</p>
          <p className="mt-0.5 text-xs text-ink-muted">Download an Excel copy of your data, for a chosen period.</p>
        </div>
        <span className="text-xs font-semibold text-accent-dark">{open ? 'Hide' : 'Open'}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="label">Modules to include</label>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggle(m.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected.includes(m.key) ? 'border-ink bg-ink text-white' : 'border-line text-ink-muted'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tenure from (optional)</label>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Tenure to (optional)</label>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-ink-faint">Stock is always exported in full — date ranges apply to purchases, sales, and invoices.</p>
          <button className="btn-primary" disabled={downloading} onClick={handleDownload}>
            <Download size={16} /> {downloading ? 'Preparing…' : 'Download backup'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.get<{ data: Company[] }>('/companies');
    setCompanies(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company profiles and data backup." />
      <div className="space-y-6 px-8 py-6">
        <div>
          <h2 className="mb-3 font-display text-sm font-bold text-ink-muted">Company profiles</h2>
          {loading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {companies.map((c) => (
                <CompanyCard key={c.id} company={c} onSaved={load} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-display text-sm font-bold text-ink-muted">Backup</h2>
          <BackupExport />
        </div>
      </div>
    </div>
  );
}
