import { z } from 'zod';
import { createCrudRouter } from '../lib/crudRouter';

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required'),
  contact_person: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  address: z.string().trim().optional().nullable(),
  ntn: z.string().trim().optional().nullable(),
  strn: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export default createCrudRouter({
  table: 'customers',
  schema: customerSchema,
  searchColumns: ['name', 'phone', 'contact_person'],
  label: 'Customer',
});
