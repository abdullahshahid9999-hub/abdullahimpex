import { Router } from 'express';
import { ZodObject, ZodRawShape } from 'zod';
import { supabaseAdmin } from '../supabaseAdmin';
import { asyncRoute, ApiError } from '../middleware/error';

interface CrudOptions {
  table: string;
  schema: ZodObject<ZodRawShape>;
  searchColumns: string[]; // columns to match against the ?search= query param
  label: string; // human readable, used in error messages e.g. "Supplier"
}

/**
 * Builds a simple, secure CRUD router for a table: list/search, get one,
 * create, update, delete. Used for Suppliers and Customers, which don't
 * need any special business logic beyond basic record-keeping.
 */
export function createCrudRouter({ table, schema, searchColumns, label }: CrudOptions) {
  const router = Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const search = (req.query.search as string | undefined)?.trim();
      let query = supabaseAdmin.from(table).select('*').order('name', { ascending: true });

      if (search && searchColumns.length > 0) {
        const orFilter = searchColumns.map((col) => `${col}.ilike.%${search}%`).join(',');
        query = query.or(orFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json({ data });
    })
  );

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error) throw new ApiError(404, `${label} not found.`);
      res.json({ data });
    })
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const body = schema.parse(req.body);
      const { data, error } = await supabaseAdmin.from(table).insert(body).select().single();
      if (error) throw error;
      res.status(201).json({ data });
    })
  );

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const body = schema.partial().parse(req.body);
      const { data, error } = await supabaseAdmin
        .from(table)
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ data });
    })
  );

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      const { error } = await supabaseAdmin.from(table).delete().eq('id', req.params.id);
      if (error) {
        throw new ApiError(409, `This ${label.toLowerCase()} has related records and cannot be deleted.`);
      }
      res.status(204).send();
    })
  );

  return router;
}
