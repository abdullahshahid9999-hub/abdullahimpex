import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { money, formatDate, todayIso } from '../lib/format';
import { PageHeader, EmptyState, Badge } from '../components/ui';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';

interface StockOption {
  id: string;
  code: string;
  name: string;
  size: string | null;
  unit: string;
  sale_rate: number | null;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
}

interface SaleRow {
  id: string;
  sale_date: string;
  total_amount: number;
  invoiced: boolean;
  customers: { name: string } | null;
  sale_items: { id: string }[];
}

interface LineItem {
  stock_id: string;
  quantity: string;
  rate: string;
}

function SaleForm({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(todayIso());
  const [rows, setRows] = useState<LineItem[]>([{ stock_id: '', quantity: '', rate: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: Customer[] }>('/customers').then((r) => setCustomers(r.data));
    api.get<{ data: StockOption[] }>('/stock').then((r) => setStockOptions(r.data));
  }, []);

  function updateRow(idx: number, patch: Partial<LineItem>) {
    setRows((rs) =>
      rs.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        // Pre-fill the sale rate from the item's default sale rate, if set.
        if (patch.stock_id) {
          const stock = stockOptions.find((s) => s.id === patch.stock_id);
          if (stock?.sale_rate != null) next.rate = String(stock.sale_rate);
        }
        return next;
      })
    );
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
      await api.post('/sales', {
        customer_id: customerId || null,
        sale_date: saleDate,
        items,
      });
      toast.success('Sale recorded and stock updated.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not record sale.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Customer</label>
          <SearchableSelect
            value={customerId}
            onChange={setCustomerId}
            options={customers.map((c) => ({ id: c.id, label: c.name }))}
            placeholder="Search customer…"
          />
        </div>
        <div>
          <label className="label">Sale date</label>
          <input type="date" className="input" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="label">Items</label>
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const stock = stockOptions.find((s) => s.id === row.stock_id);
            return (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={row.stock_id}
                    onChange={(id) => updateRow(idx, { stock_id: id })}
                    options={stockOptions.map((s) => ({
                      id: s.id,
                      label: `${s.code} — ${s.name}${s.size ? ` (${s.size})` : ''}`,
                      sublabel: `${s.quantity} ${s.unit} in stock`,
                    }))}
                    placeholder="Search item by code or name…"
                  />
                </div>
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
                  className="btn-ghost mt-1 px-2 hover:text-danger"
                  onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={15} />
                </button>
                {stock && Number(row.quantity) > stock.quantity && (
                  <p className="absolute mt-12 text-xs text-danger">Only {stock.quantity} available</p>
                )}
              </div>
            );
          })}
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
            {saving ? 'Saving…' : 'Record sale'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function Sales() {
  const [items, setItems] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get<{ data: SaleRow[] }>('/sales');
    setItems(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Sell stock to a customer — quantities update automatically."
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Record sale
          </button>
        }
      />
      <div className="px-8 py-6">
        <div className="card">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState title="No sales recorded yet" hint="Record your first sale to a customer." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Invoiced</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDate(s.sale_date)}</td>
                    <td className="font-medium">{s.customers?.name ?? 'Walk-in'}</td>
                    <td className="data-num">{s.sale_items?.length ?? 0}</td>
                    <td>
                      <Badge tone={s.invoiced ? 'success' : 'default'}>{s.invoiced ? 'Invoiced' : 'Pending'}</Badge>
                    </td>
                    <td className="data-num text-right">{money(s.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal title="Record a sale" onClose={() => setModalOpen(false)} width="max-w-2xl">
          <SaleForm
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
