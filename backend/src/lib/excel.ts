import ExcelJS from 'exceljs';
import { supabaseAdmin } from '../supabaseAdmin';

type ModuleKey = 'stock' | 'suppliers' | 'customers' | 'purchases' | 'sales' | 'invoices';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } } as const;

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = HEADER_FILL as any;
  row.alignment = { vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

async function addStockSheet(wb: ExcelJS.Workbook) {
  const { data } = await supabaseAdmin.from('stock').select('*').order('name');
  const ws = wb.addWorksheet('Stock');
  ws.columns = [
    { header: 'Code', key: 'code', width: 14 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Size', key: 'size', width: 16 },
    { header: 'Unit', key: 'unit', width: 8 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Purchase Rate', key: 'purchase_rate', width: 14 },
    { header: 'Sale Rate', key: 'sale_rate', width: 12 },
    { header: 'Description', key: 'description', width: 30 },
  ];
  (data ?? []).forEach((r) => ws.addRow(r));
  styleHeader(ws);
}

async function addPartySheet(wb: ExcelJS.Workbook, table: 'suppliers' | 'customers', title: string) {
  const { data } = await supabaseAdmin.from(table).select('*').order('name');
  const ws = wb.addWorksheet(title);
  ws.columns = [
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Contact Person', key: 'contact_person', width: 18 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Email', key: 'email', width: 22 },
    { header: 'Address', key: 'address', width: 32 },
    { header: 'NTN', key: 'ntn', width: 14 },
  ];
  (data ?? []).forEach((r) => ws.addRow(r));
  styleHeader(ws);
}

async function addPurchasesSheet(wb: ExcelJS.Workbook, from?: string, to?: string) {
  let q = supabaseAdmin
    .from('purchases')
    .select('purchase_date, supplier_invoice_ref, total_amount, suppliers(name)')
    .order('purchase_date', { ascending: false });
  if (from) q = q.gte('purchase_date', from);
  if (to) q = q.lte('purchase_date', to);
  const { data } = await q;
  const ws = wb.addWorksheet('Purchases');
  ws.columns = [
    { header: 'Date', key: 'purchase_date', width: 14 },
    { header: 'Supplier', key: 'supplier', width: 26 },
    { header: 'Supplier Invoice Ref', key: 'supplier_invoice_ref', width: 20 },
    { header: 'Total Amount', key: 'total_amount', width: 16 },
  ];
  (data ?? []).forEach((r: any) =>
    ws.addRow({ ...r, supplier: r.suppliers?.name ?? '' })
  );
  styleHeader(ws);
}

async function addSalesSheet(wb: ExcelJS.Workbook, from?: string, to?: string) {
  let q = supabaseAdmin
    .from('sales')
    .select('sale_date, total_amount, invoiced, customers(name)')
    .order('sale_date', { ascending: false });
  if (from) q = q.gte('sale_date', from);
  if (to) q = q.lte('sale_date', to);
  const { data } = await q;
  const ws = wb.addWorksheet('Sales');
  ws.columns = [
    { header: 'Date', key: 'sale_date', width: 14 },
    { header: 'Customer', key: 'customer', width: 26 },
    { header: 'Total Amount', key: 'total_amount', width: 16 },
    { header: 'Invoiced?', key: 'invoiced', width: 12 },
  ];
  (data ?? []).forEach((r: any) =>
    ws.addRow({ ...r, customer: r.customers?.name ?? '', invoiced: r.invoiced ? 'Yes' : 'No' })
  );
  styleHeader(ws);
}

async function addInvoicesSheet(wb: ExcelJS.Workbook, from?: string, to?: string) {
  let q = supabaseAdmin
    .from('invoices')
    .select('serial_number, invoice_date, grand_total, companies(name), customers(name)')
    .order('invoice_date', { ascending: false });
  if (from) q = q.gte('invoice_date', from);
  if (to) q = q.lte('invoice_date', to);
  const { data } = await q;
  const ws = wb.addWorksheet('Invoices');
  ws.columns = [
    { header: 'Serial #', key: 'serial_number', width: 10 },
    { header: 'Date', key: 'invoice_date', width: 14 },
    { header: 'Company', key: 'company', width: 18 },
    { header: 'Customer', key: 'customer', width: 26 },
    { header: 'Grand Total', key: 'grand_total', width: 16 },
  ];
  (data ?? []).forEach((r: any) =>
    ws.addRow({
      ...r,
      company: r.companies?.name ?? '',
      customer: r.customers?.name ?? '',
    })
  );
  styleHeader(ws);
}

export async function buildBackupWorkbook(modules: ModuleKey[], from?: string, to?: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Inventory Management System';
  wb.created = new Date();

  for (const mod of modules) {
    if (mod === 'stock') await addStockSheet(wb);
    if (mod === 'suppliers') await addPartySheet(wb, 'suppliers', 'Suppliers');
    if (mod === 'customers') await addPartySheet(wb, 'customers', 'Customers');
    if (mod === 'purchases') await addPurchasesSheet(wb, from, to);
    if (mod === 'sales') await addSalesSheet(wb, from, to);
    if (mod === 'invoices') await addInvoicesSheet(wb, from, to);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
