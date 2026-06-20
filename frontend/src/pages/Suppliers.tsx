import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { PageHeader, SearchInput, EmptyState } from '../components/ui';
import Modal from '../components/Modal';

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  ntn: string | null;
}

function SupplierForm({
  initial,
  onSaved,
  onClose,
}: {
  initial: Partial<Supplier> | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    contact_person: initial?.contact_person ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    ntn: initial?.ntn ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/suppliers/${initial!.id}`, form);
        toast.success('Supplier updated.');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier added.');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not save supplier.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Supplier name</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Contact person</label>
          <input className="input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">NTN (optional)</label>
          <input className="input font-mono" value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Address</label>
        <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add supplier'}
        </button>
      </div>
    </form>
  );
}

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | Supplier | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ data: Supplier[] }>(`/suppliers?search=${encodeURIComponent(search)}`);
      setItems(res.data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not load suppliers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDelete(s: Supplier) {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await api.del(`/suppliers/${s.id}`);
      toast.success('Supplier deleted.');
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not delete supplier.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="People and companies you buy machinery parts from."
        action={
          <button className="btn-primary" onClick={() => setModal('add')}>
            <Plus size={16} /> Add supplier
          </button>
        }
      />
      <div className="px-8 py-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers…" />
        <div className="card mt-4">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState title="No suppliers yet" hint="Add your first supplier to start recording purchases." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.name}</td>
                    <td>{s.contact_person || '—'}</td>
                    <td className="data-num">{s.phone || '—'}</td>
                    <td>{s.email || '—'}</td>
                    <td className="text-right">
                      <button className="btn-ghost px-2" onClick={() => setModal(s)}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-ghost px-2 hover:text-danger" onClick={() => handleDelete(s)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add supplier' : 'Edit supplier'} onClose={() => setModal(null)}>
          <SupplierForm
            initial={modal === 'add' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
