import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { money } from '../lib/format';
import { PageHeader, SearchInput, EmptyState, Badge } from '../components/ui';
import Modal from '../components/Modal';

interface StockItem {
  id: string;
  code: string;
  name: string;
  size: string | null;
  unit: 'ft' | 'set' | 'nos' | 'mtr';
  quantity: number;
  purchase_rate: number;
  sale_rate: number | null;
  description: string | null;
  low_stock_threshold: number | null;
}

const UNITS = ['ft', 'set', 'nos', 'mtr'] as const;

function StockForm({
  initial,
  onSaved,
  onClose,
}: {
  initial: Partial<StockItem> | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    size: initial?.size ?? '',
    unit: initial?.unit ?? 'nos',
    quantity: initial?.quantity ?? 0,
    purchase_rate: initial?.purchase_rate ?? 0,
    sale_rate: initial?.sale_rate ?? '',
    description: initial?.description ?? '',
    low_stock_threshold: initial?.low_stock_threshold ?? 5,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      api.get<{ code: string }>('/stock/next-code').then((r) => setForm((f) => ({ ...f, code: r.code })));
    }
  }, [isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code,
      name: form.name,
      size: form.size || null,
      unit: form.unit,
      quantity: Number(form.quantity),
      purchase_rate: Number(form.purchase_rate),
      sale_rate: form.sale_rate === '' ? null : Number(form.sale_rate),
      description: form.description || null,
      low_stock_threshold: Number(form.low_stock_threshold),
    };
    try {
      if (isEdit) {
        await api.put(`/stock/${initial!.id}`, payload);
        toast.success('Stock item updated.');
      } else {
        await api.post('/stock', payload);
        toast.success('Stock item added.');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not save item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Item code</label>
          <input className="input font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as any })}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Product name</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Size / dimensions</label>
          <input
            className="input font-mono"
            placeholder="e.g. 25*26*88 or 12*55"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Quantity</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value as any })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Purchase rate</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={form.purchase_rate}
            onChange={(e) => setForm({ ...form, purchase_rate: e.target.value as any })}
            required
          />
        </div>
        <div>
          <label className="label">Sale rate (optional)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={form.sale_rate}
            onChange={(e) => setForm({ ...form, sale_rate: e.target.value as any })}
          />
        </div>
        <div>
          <label className="label">Low stock alert at</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={form.low_stock_threshold}
            onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value as any })}
          />
        </div>
      </div>
      <div>
        <label className="label">Description (optional)</label>
        <textarea
          className="input"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
        </button>
      </div>
    </form>
  );
}

export default function Stock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | StockItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ data: StockItem[] }>(`/stock?search=${encodeURIComponent(search)}`);
      setItems(res.data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not load stock.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDelete(item: StockItem) {
    if (!window.confirm(`Delete "${item.name}" (${item.code})? This cannot be undone.`)) return;
    try {
      await api.del(`/stock/${item.id}`);
      toast.success('Item deleted.');
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not delete item.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle="Spinning machinery parts on hand — search by code, or by name and size."
        action={
          <button className="btn-primary" onClick={() => setModal('add')}>
            <Plus size={16} /> Add item
          </button>
        }
      />
      <div className="px-8 py-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by code, name, or size…" />

        <div className="card mt-4">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState title="No stock items found" hint="Try a different search, or add a new item." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Unit</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Purchase rate</th>
                  <th className="text-right">Sale rate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const low = item.quantity <= (item.low_stock_threshold ?? 5);
                  return (
                    <tr key={item.id}>
                      <td className="data-num">{item.code}</td>
                      <td className="font-medium">{item.name}</td>
                      <td className="data-num">{item.size || '—'}</td>
                      <td>{item.unit}</td>
                      <td className="data-num text-right">
                        {item.quantity}
                        {low && (
                          <span className="ml-2">
                            <Badge tone="danger">Low</Badge>
                          </span>
                        )}
                      </td>
                      <td className="data-num text-right">{money(item.purchase_rate)}</td>
                      <td className="data-num text-right">{item.sale_rate != null ? money(item.sale_rate) : '—'}</td>
                      <td className="text-right">
                        <button className="btn-ghost px-2" onClick={() => setModal(item)}>
                          <Pencil size={15} />
                        </button>
                        <button className="btn-ghost px-2 hover:text-danger" onClick={() => handleDelete(item)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add stock item' : 'Edit stock item'} onClose={() => setModal(null)}>
          <StockForm
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
