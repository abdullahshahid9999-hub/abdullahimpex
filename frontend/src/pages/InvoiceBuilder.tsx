import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Download } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { money, todayIso, triggerBlobDownload } from '../lib/format';
import { PageHeader } from '../components/ui';
import SearchableSelect from '../components/SearchableSelect';

interface Company {
  id: string;
  name: string;
  is_default: boolean;
}
interface Customer {
  id: string;
  name: string;
}
interface LineItem {
  stock_id: string | null;
  product_name: string;
  size: string;
  unit: string;
  quantity: string;
  rate: string;
  tax_rate: string;
}

const blankItem: LineItem = { stock_id: null, product_name: '', size: '', unit: '', quantity: '', rate: '', tax_rate: '0' };

export default function InvoiceBuilder() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ ...blankItem }]);
  const [saleIds, setSaleIds] = useState<string[]>([]);
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Company[] }>('/companies').then((r) => {
      setCompanies(r.data);
      const def = r.data.find((c) => c.is_default);
      if (def) setCompanyId(def.id);
    });
    api.get<{ data: Customer[] }>('/customers').then((r) => setCustomers(r.data));
  }, []);

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function pullUnbilledSales() {
    if (!customerId) {
      toast.error('Pick a customer first.');
      return;
    }
    setPulling(true);
    try {
      const params = new URLSearchParams({ customer_id: customerId });
      if (periodStart) params.set('from', periodStart);
      if (periodEnd) params.set('to', periodEnd);
      const res = await api.get<{ data: any[] }>(`/invoices/draft-items?${params.toString()}`);

      const pulled: LineItem[] = [];
      const sIds: string[] = [];
      for (const sale of res.data) {
        sIds.push(sale.id);
        for (const si of sale.sale_items) {
          pulled.push({
            stock_id: si.stock?.id ?? null,
            product_name: si.stock?.name ?? 'Item',
            size: si.stock?.size ?? '',
            unit: si.stock?.unit ?? '',
            quantity: String(si.quantity),
            rate: String(si.rate),
            tax_rate: '0',
          });
        }
      }
      if (pulled.length === 0) {
        toast('No un-invoiced sales found for this customer in that range.');
      } else {
        setItems(pulled);
        setSaleIds(sIds);
        toast.success(`Pulled ${pulled.length} line item(s) from sales.`);
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not pull sales.');
    } finally {
      setPulling(false);
    }
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const taxTotal = items.reduce((s, i) => {
    const excl = (Number(i.quantity) || 0) * (Number(i.rate) || 0);
    return s + (excl * (Number(i.tax_rate) || 0)) / 100;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.product_name && i.quantity);
    if (validItems.length === 0) {
      toast.error('Add at least one line item.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ data: { id: string; serial_number: number } }>('/invoices', {
        company_id: companyId,
        customer_id: customerId || null,
        invoice_date: invoiceDate,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        sale_ids: saleIds,
        items: validItems.map((i) => ({
          stock_id: i.stock_id,
          product_name: i.product_name,
          size: i.size,
          unit: i.unit,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          tax_rate: Number(i.tax_rate) || 0,
        })),
      });
      toast.success(`Invoice #${res.data.serial_number} created.`);
      setCreatedInvoiceId(res.data.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not create invoice.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadCreatedPdf() {
    if (!createdInvoiceId) return;
    const blob = await api.download(`/invoices/${createdInvoiceId}/pdf`);
    triggerBlobDownload(blob, 'invoice.pdf');
  }

  if (createdInvoiceId) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center px-8 text-center">
        <h2 className="font-display text-xl font-bold">Invoice created</h2>
        <p className="mt-1 text-sm text-ink-muted">You can download the PDF now or find it later in Invoices.</p>
        <div className="mt-6 flex gap-3">
          <button className="btn-secondary" onClick={() => navigate('/invoices')}>
            Back to invoices
          </button>
          <button className="btn-primary" onClick={downloadCreatedPdf}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="New invoice" subtitle="Choose which company this invoice is issued under." />
      <form onSubmit={handleSubmit} className="px-8 py-6">
        <div className="card p-5">
          <h3 className="mb-4 font-display text-sm font-bold">Company profile</h3>
          <div className="flex gap-3">
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCompanyId(c.id)}
                className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                  companyId === c.id ? 'border-ink bg-ink text-white' : 'border-line text-ink hover:border-line-strong'
                }`}
              >
                <p className="font-semibold">{c.name}</p>
                {c.is_default && <p className={`text-xs ${companyId === c.id ? 'text-white/60' : 'text-ink-faint'}`}>Default</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="card mt-4 p-5">
          <h3 className="mb-4 font-display text-sm font-bold">Buyer &amp; tenure</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="label">Customer</label>
              <SearchableSelect
                value={customerId}
                onChange={setCustomerId}
                options={customers.map((c) => ({ id: c.id, label: c.name }))}
                placeholder="Search customer…"
              />
            </div>
            <div>
              <label className="label">Invoice date</label>
              <input type="date" className="input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div>
              <label className="label">Period start (tenure)</label>
              <input type="date" className="input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <label className="label">Period end (tenure)</label>
              <input type="date" className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div className="col-span-2 flex items-end">
              <button type="button" className="btn-secondary" disabled={pulling} onClick={pullUnbilledSales}>
                {pulling ? 'Pulling…' : 'Pull un-invoiced sales for this period'}
              </button>
            </div>
          </div>
        </div>

        <div className="card mt-4 p-5">
          <h3 className="mb-4 font-display text-sm font-bold">Line items</h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  className="input col-span-3"
                  placeholder="Product name"
                  value={item.product_name}
                  onChange={(e) => updateItem(idx, { product_name: e.target.value })}
                />
                <input
                  className="input col-span-2 font-mono"
                  placeholder="Size"
                  value={item.size}
                  onChange={(e) => updateItem(idx, { size: e.target.value })}
                />
                <input
                  className="input col-span-1"
                  placeholder="Unit"
                  value={item.unit}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="input col-span-1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="input col-span-2"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => updateItem(idx, { rate: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="input col-span-1"
                  placeholder="S.T %"
                  value={item.tax_rate}
                  onChange={(e) => updateItem(idx, { tax_rate: e.target.value })}
                />
                <button
                  type="button"
                  className="btn-ghost col-span-2 hover:text-danger"
                  onClick={() => setItems((rows) => rows.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-secondary mt-3" onClick={() => setItems((rows) => [...rows, { ...blankItem }])}>
            <Plus size={14} /> Add line item
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-ink-muted">
            Subtotal: <span className="data-num font-semibold text-ink">Rs. {money(subtotal)}</span> · Tax:{' '}
            <span className="data-num font-semibold text-ink">Rs. {money(taxTotal)}</span> · Grand total:{' '}
            <span className="data-num font-semibold text-ink">Rs. {money(subtotal + taxTotal)}</span>
          </div>
          <button type="submit" disabled={saving || !companyId} className="btn-primary">
            {saving ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
