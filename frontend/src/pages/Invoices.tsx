import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Download } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { money, formatDate, triggerBlobDownload } from '../lib/format';
import { PageHeader, EmptyState } from '../components/ui';

interface InvoiceRow {
  id: string;
  serial_number: number;
  invoice_date: string;
  period_start: string | null;
  period_end: string | null;
  grand_total: number;
  companies: { name: string } | null;
  customers: { name: string } | null;
}

export default function Invoices() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get<{ data: InvoiceRow[] }>(`/invoices?${params.toString()}`);
      setItems(res.data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function downloadPdf(inv: InvoiceRow) {
    try {
      const blob = await api.download(`/invoices/${inv.id}/pdf`);
      triggerBlobDownload(blob, `invoice-${inv.serial_number}.pdf`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not download invoice.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Tenure-wise billing — pick a date range to view invoices for a period."
        action={
          <Link to="/invoices/new" className="btn-primary">
            <Plus size={16} /> New invoice
          </Link>
        }
      />
      <div className="px-8 py-6">
        <div className="flex items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to) && (
            <button
              className="btn-ghost"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="card mt-4">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState title="No invoices found" hint="Create a new invoice, or widen your date range." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Serial #</th>
                  <th>Date</th>
                  <th>Company</th>
                  <th>Customer</th>
                  <th className="text-right">Grand total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr key={inv.id}>
                    <td className="data-num">{inv.serial_number}</td>
                    <td>{formatDate(inv.invoice_date)}</td>
                    <td>{inv.companies?.name}</td>
                    <td className="font-medium">{inv.customers?.name ?? 'Walk-in'}</td>
                    <td className="data-num text-right">{money(inv.grand_total)}</td>
                    <td className="text-right">
                      <button className="btn-ghost px-2" onClick={() => downloadPdf(inv)} title="Download PDF">
                        <Download size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
