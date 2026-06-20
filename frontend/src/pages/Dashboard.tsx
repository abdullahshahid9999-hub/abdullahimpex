import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, ApiClientError } from '../lib/api';
import { money, formatDate } from '../lib/format';
import { PageHeader, StatCard, EmptyState } from '../components/ui';

interface Summary {
  totalStockItems: number;
  stockValue: number;
  lowStockCount: number;
  salesThisMonth: number;
  purchasesThisMonth: number;
  totalCustomers: number;
  totalSuppliers: number;
  recentInvoices: Array<{
    id: string;
    serial_number: number;
    invoice_date: string;
    grand_total: number;
    customers: { name: string } | null;
    companies: { name: string } | null;
  }>;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: Summary }>('/dashboard/summary')
      .then((res) => setSummary(res.data))
      .catch((err) => {
        const message = err instanceof ApiClientError ? err.message : 'Could not reach the server.';
        setError(message);
        toast.error(message);
      });
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="A snapshot of stock, sales, and billing." />
      <div className="px-8 py-6">
        {!summary ? (
          <p className="text-sm text-ink-muted">{error ? `Couldn't load dashboard: ${error}` : 'Loading…'}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Stock items" value={String(summary.totalStockItems)} />
              <StatCard
                label="Stock value"
                value={`Rs. ${money(summary.stockValue)}`}
                hint="At purchase rate"
              />
              <StatCard
                label="Low stock"
                value={String(summary.lowStockCount)}
                tone={summary.lowStockCount > 0 ? 'warning' : 'default'}
                hint="Items at/below threshold"
              />
              <StatCard label="Sales this month" value={`Rs. ${money(summary.salesThisMonth)}`} />
              <StatCard label="Purchases this month" value={`Rs. ${money(summary.purchasesThisMonth)}`} />
              <StatCard label="Customers" value={String(summary.totalCustomers)} />
              <StatCard label="Suppliers" value={String(summary.totalSuppliers)} />
            </div>

            <div className="card mt-6">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-sm font-bold">Recent invoices</h2>
                <Link to="/invoices" className="text-sm font-medium text-accent-dark hover:underline">
                  View all
                </Link>
              </div>
              {summary.recentInvoices.length === 0 ? (
                <EmptyState title="No invoices yet" hint="Invoices you create will show up here." />
              ) : (
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>Serial #</th>
                      <th>Date</th>
                      <th>Company</th>
                      <th>Customer</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="data-num">{inv.serial_number}</td>
                        <td>{formatDate(inv.invoice_date)}</td>
                        <td>{inv.companies?.name}</td>
                        <td>{inv.customers?.name ?? 'Walk-in'}</td>
                        <td className="data-num text-right">{money(inv.grand_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
