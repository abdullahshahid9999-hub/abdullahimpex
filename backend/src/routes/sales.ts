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

const saleSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  sale_date: z.string(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

// GET /sales?customer_id=&from=&to=&uninvoiced=true
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { customer_id, from, to, uninvoiced } = req.query as Record<string, string | undefined>;
    let query = supabaseAdmin
      .from('sales')
      .select('*, customers(name), sale_items(id)')
      .order('sale_date', { ascending: false });

    if (customer_id) query = query.eq('customer_id', customer_id);
    if (from) query = query.gte('sale_date', from);
    if (to) query = query.lte('sale_date', to);
    if (uninvoiced === 'true') query = query.eq('invoiced', false);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  })
);

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('*, customers(name), sale_items(*, stock(name, code, size, unit))')
      .eq('id', req.params.id)
      .single();
    if (error) throw new ApiError(404, 'Sale not found.');
    res.json({ data });
  })
);

router.post(
  '/',
  asyncRoute(async (req: AuthedRequest, res) => {
    const body = saleSchema.parse(req.body);

    const { data, error } = await supabaseAdmin.rpc('create_sale', {
      p_customer_id: body.customer_id ?? null,
      p_sale_date: body.sale_date,
      p_notes: body.notes ?? null,
      p_created_by: req.user?.id ?? null,
      p_items: body.items,
    });

    // create_sale raises a friendly Postgres exception when stock is
    // insufficient — surface that message directly to the user.
    if (error) throw new ApiError(400, error.message);
    res.status(201).json({ data: { id: data } });
  })
);

export default router;
