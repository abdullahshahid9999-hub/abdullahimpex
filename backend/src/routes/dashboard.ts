import { Router } from 'express';
import dayjs from 'dayjs';
import { supabaseAdmin } from '../supabaseAdmin';
import { asyncRoute } from '../middleware/error';

const router = Router();

router.get(
  '/summary',
  asyncRoute(async (_req, res) => {
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');

    const [stockRes, salesRes, purchasesRes, invoicesRes, customersRes, suppliersRes] = await Promise.all([
      supabaseAdmin.from('stock').select('quantity, purchase_rate, low_stock_threshold'),
      supabaseAdmin.from('sales').select('total_amount').gte('sale_date', startOfMonth).lte('sale_date', today),
      supabaseAdmin.from('purchases').select('total_amount').gte('purchase_date', startOfMonth).lte('purchase_date', today),
      supabaseAdmin
        .from('invoices')
        .select('id, serial_number, invoice_date, grand_total, customers(name), companies(name)')
        .order('invoice_date', { ascending: false })
        .limit(5),
      supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('suppliers').select('id', { count: 'exact', head: true }),
    ]);

    if (stockRes.error) throw stockRes.error;
    if (salesRes.error) throw salesRes.error;
    if (purchasesRes.error) throw purchasesRes.error;
    if (invoicesRes.error) throw invoicesRes.error;

    const stockValue = (stockRes.data ?? []).reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.purchase_rate),
      0
    );
    const lowStockCount = (stockRes.data ?? []).filter(
      (s) => Number(s.quantity) <= Number(s.low_stock_threshold ?? 5)
    ).length;
    const salesThisMonth = (salesRes.data ?? []).reduce((sum, s) => sum + Number(s.total_amount), 0);
    const purchasesThisMonth = (purchasesRes.data ?? []).reduce((sum, p) => sum + Number(p.total_amount), 0);

    res.json({
      data: {
        totalStockItems: (stockRes.data ?? []).length,
        stockValue,
        lowStockCount,
        salesThisMonth,
        purchasesThisMonth,
        totalCustomers: customersRes.count ?? 0,
        totalSuppliers: suppliersRes.count ?? 0,
        recentInvoices: invoicesRes.data ?? [],
      },
    });
  })
);

export default router;
