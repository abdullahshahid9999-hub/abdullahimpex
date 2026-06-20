import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabaseAdmin';
import { asyncRoute, ApiError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

const itemSchema = z.object({
  stock_id: z.string().uuid(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
});

const purchaseSchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  purchase_date: z.string(), // ISO date
  supplier_invoice_ref: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

// GET /purchases?from=&to= -> list with supplier name + item count
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    let query = supabaseAdmin
      .from('purchases')
      .select('*, suppliers(name), purchase_items(id)')
      .order('purchase_date', { ascending: false });

    if (from) query = query.gte('purchase_date', from);
    if (to) query = query.lte('purchase_date', to);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  })
);

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('purchases')
      .select('*, suppliers(name), purchase_items(*, stock(name, code, size, unit))')
      .eq('id', req.params.id)
      .single();
    if (error) throw new ApiError(404, 'Purchase not found.');
    res.json({ data });
  })
);

router.post(
  '/',
  asyncRoute(async (req: AuthedRequest, res) => {
    const body = purchaseSchema.parse(req.body);

    const { data, error } = await supabaseAdmin.rpc('create_purchase', {
      p_supplier_id: body.supplier_id ?? null,
      p_purchase_date: body.purchase_date,
      p_supplier_invoice_ref: body.supplier_invoice_ref ?? null,
      p_notes: body.notes ?? null,
      p_created_by: req.user?.id ?? null,
      p_items: body.items,
    });

    if (error) throw new ApiError(400, error.message);
    res.status(201).json({ data: { id: data } });
  })
);

export default router;
