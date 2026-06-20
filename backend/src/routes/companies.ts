import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabaseAdmin';
import { asyncRoute, ApiError } from '../middleware/error';

const router = Router();

const companySchema = z.object({
  name: z.string().trim().min(1).optional(),
  ntn: z.string().trim().optional().nullable(),
  strn: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  phone2: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
});

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('is_default', { ascending: false });
    if (error) throw error;
    res.json({ data });
  })
);

router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = companySchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    res.json({ data });
  })
);

export default router;
