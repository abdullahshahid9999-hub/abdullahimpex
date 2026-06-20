import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { money, formatDate, todayIso } from '../lib/format';
import { PageHeader, EmptyState } from '../components/ui';
import Modal from '../components/Modal';

interface StockOption {
  id: string;
  code: string;
  name: string;
  size: string | null;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseRow {
  purchase_date: string;
  supplier_invoice_ref: string | null;
  total_amount: number;
  suppliers: { name: string } | null;
  purchase_items: { id: string }[];
  id: string;
}

interface LineItem {
  stock_id: string;
  quantity: string;
  rate: string;
}

function PurchaseForm({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [invoiceRef, setInvoiceRef] = useState('');
  const [rows, setRows] = useState<LineItem[]>([{ stock_id: '', quantity: '', rate: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: Supplier[] }>('/suppliers').then((r) => setSuppliers(r.data));
    api.get<{ data: StockOption[] }>('/stock').then((r) => setStockOptions(r.data));
  }, []);

  function updateRow(idx: number, patch: Partial<LineItem>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.rate) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items = rows
      .filter((r) => r.stock_id && r.quantity)
      .map((r) => ({ stock_id: r.stock_id, quantity: Number(r.quantity), rate: Number(r.rate) || 0 }));
    if (items.length === 0) {
      toast.error('Add at least one item.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/purchases', {
        supplier_id: supplierId || null,
        purchase_date: purchaseDate,
        supplier_invoice_ref: invoiceRef || null,
        items,
      });
      toast.success('Purchase recorded and stock updated.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not record purchase.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Supplier</label>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Purchase date</label>
          <input type="date" className="input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Supplier invoice ref (optional)</label>
          <input className="input" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Items</label>
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex gap-2">
              <select
                className="input flex-1"
                value={row.stock_id}
                onChange={(e) => updateRow(idx, { stock_id: e.target.value })}
              >
                <option value="">Select item…</option>
                {stockOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name} {s.size ? `(${s.size})` : ''}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Qty"
                className="input w-24"
                value={row.quantity}
                onChange={(e) => updateRow(idx, { quantity: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Rate"
                className="input w-28"
                value={row.rate}
                onChange={(e) => updateRow(idx, { rate: e.target.value })}
              />
              <button
                type="button"
                className="btn-ghost px-2 hover:text-danger"
                onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary mt-2"
          onClick={() => setRows((rs) => [...rs, { stock_id: '', quantity: '', rate: '' }])}
        >
          <Plus size={14} /> Add row
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <p className="text-sm text-ink-muted">
          Total: <span className="data-num font-semibold text-ink">Rs. {money(total)}</span>
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Record purchase'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function Purchases() {
  const [items, setItems] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get<{ data: PurchaseRow[] }>('/purchases');
    setItems(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle="Bring stock in from a supplier — quantities update automatically."
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Record purchase
          </button>
        }
      />
      <div className="px-8 py-6">
        <div className="card">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState title="No purchases recorded yet" hint="Record your first purchase to bring stock in." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Invoice ref</th>
                  <th>Items</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.purchase_date)}</td>
                    <td className="font-medium">{p.suppliers?.name ?? '—'}</td>
                    <td>{p.supplier_invoice_ref || '—'}</td>
                    <td className="data-num">{p.purchase_items?.length ?? 0}</td>
                    <td className="data-num text-right">{money(p.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal title="Record a purchase" onClose={() => setModalOpen(false)} width="max-w-2xl">
          <PurchaseForm
            onClose={() => setModalOpen(false)}
            onSaved={() => {
              setModalOpen(false);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
