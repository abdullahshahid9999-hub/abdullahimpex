import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabaseAdmin';
import { asyncRoute, ApiError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { nextInvoiceSerial } from '../lib/codeGen';
import { renderInvoicePdf } from '../lib/pdf';

const router = Router();

const lineItemSchema = z.object({
  stock_id: z.string().uuid().optional().nullable(),
  product_name: z.string().trim().min(1),
  size: z.string().trim().optional().nullable(),
  unit: z.string().trim().optional().nullable(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  tax_rate: z.number().nonnegative().default(0),
});

const invoiceSchema = z.object({
  company_id: z.string().uuid(),
  customer_id: z.string().uuid().optional().nullable(),
  invoice_date: z.string(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
  sale_ids: z.array(z.string().uuid()).optional().default([]),
});

// GET /invoices?from=&to=&customer_id=  -> tenure-wise listing
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { from, to, customer_id } = req.query as Record<string, string | undefined>;
    let query = supabaseAdmin
      .from('invoices')
      .select('*, companies(name), customers(name)')
      .order('invoice_date', { ascending: false });

    if (from) query = query.gte('invoice_date', from);
    if (to) query = query.lte('invoice_date', to);
    if (customer_id) query = query.eq('customer_id', customer_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  })
);

router.get(
  '/next-serial',
  asyncRoute(async (_req, res) => {
    const serial = await nextInvoiceSerial();
    res.json({ serial });
  })
);

// Pull un-invoiced sales for a customer within a date range — used by the
// invoice builder to suggest line items for "tenure wise" / monthly billing.
router.get(
  '/draft-items',
  asyncRoute(async (req, res) => {
    const { customer_id, from, to } = req.query as Record<string, string | undefined>;
    if (!customer_id) throw new ApiError(400, 'customer_id is required.');

    let query = supabaseAdmin
      .from('sales')
      .select('id, sale_date, sale_items(*, stock(name, code, size, unit))')
      .eq('customer_id', customer_id)
      .eq('invoiced', false)
      .order('sale_date', { ascending: true });

    if (from) query = query.gte('sale_date', from);
    if (to) query = query.lte('sale_date', to);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  })
);

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*, companies(*), customers(*), invoice_items(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw new ApiError(404, 'Invoice not found.');
    res.json({ data });
  })
);

router.post(
  '/',
  asyncRoute(async (req: AuthedRequest, res) => {
    const body = invoiceSchema.parse(req.body);
    const serial = await nextInvoiceSerial();

    const { data, error } = await supabaseAdmin.rpc('create_invoice', {
      p_serial_number: serial,
      p_company_id: body.company_id,
      p_customer_id: body.customer_id ?? null,
      p_invoice_date: body.invoice_date,
      p_period_start: body.period_start ?? null,
      p_period_end: body.period_end ?? null,
      p_created_by: req.user?.id ?? null,
      p_items: body.items,
      p_sale_ids: body.sale_ids ?? [],
    });

    if (error) throw new ApiError(400, error.message);
    res.status(201).json({ data: { id: data, serial_number: serial } });
  })
);

// GET /invoices/:id/pdf -> generates and streams the printable PDF
router.get(
  '/:id/pdf',
  asyncRoute(async (req, res) => {
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*, companies(*), customers(*), invoice_items(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !invoice) throw new ApiError(404, 'Invoice not found.');

    const pdfBuffer = await renderInvoicePdf(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.serial_number}.pdf"`);
    res.send(pdfBuffer);
  })
);

export default router;
