import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { PageHeader, SearchInput, EmptyState } from '../components/ui';
import Modal from '../components/Modal';

interface Customer {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  ntn: string | null;
  strn: string | null;
}

function CustomerForm({
  initial,
  onSaved,
  onClose,
}: {
  initial: Partial<Customer> | null;
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
    strn: initial?.strn ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${initial!.id}`, form);
        toast.success('Customer updated.');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added.');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not save customer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Customer / company name</label>
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
          <label className="label">NTN</label>
          <input className="input font-mono" value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} />
        </div>
        <div>
          <label className="label">S.T Registration #</label>
          <input className="input font-mono" value={form.strn} onChange={(e) => setForm({ ...form, strn: e.target.value })} />
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
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
        </button>
      </div>
    </form>
  );
}

export default function Customers() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | Customer | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.get<{ data: Customer[] }>(`/customers?search=${encodeURIComponent(search)}`);
    setItems(res.data);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDelete(c: Customer) {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return;
    try {
      await api.del(`/customers/${c.id}`);
      toast.success('Customer deleted.');
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not delete customer.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Mills and businesses you sell to."
        action={
          <button className="btn-primary" onClick={() => setModal('add')}>
            <Plus size={16} /> Add customer
          </button>
        }
      />
      <div className="px-8 py-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search customers…" />
        <div className="card mt-4">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState title="No customers yet" hint="Add your first customer to start recording sales." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact person</th>
                  <th>Phone</th>
                  <th>NTN</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.contact_person || '—'}</td>
                    <td className="data-num">{c.phone || '—'}</td>
                    <td className="data-num">{c.ntn || '—'}</td>
                    <td className="text-right">
                      <button className="btn-ghost px-2" onClick={() => setModal(c)}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-ghost px-2 hover:text-danger" onClick={() => handleDelete(c)}>
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
        <Modal title={modal === 'add' ? 'Add customer' : 'Edit customer'} onClose={() => setModal(null)}>
          <CustomerForm
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
