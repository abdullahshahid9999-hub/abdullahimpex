import { supabaseAdmin } from '../supabaseAdmin';

/**
 * Generates the next stock code like "MR-0001", "MR-0002", ...
 * Looks at the highest existing numeric suffix and increments it.
 * Users can also type their own code manually — this is just a convenience.
 */
export async function nextStockCode(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('stock')
    .select('code')
    .ilike('code', 'MR-%')
    .order('code', { ascending: false })
    .limit(1);

  if (error) throw error;

  let next = 1;
  if (data && data.length > 0) {
    const match = data[0].code.match(/MR-(\d+)/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `MR-${String(next).padStart(4, '0')}`;
}

/**
 * Generates the next invoice serial number, continuing from your existing
 * paper-trail numbering (sample invoice was #973, so this starts at 974).
 */
export async function nextInvoiceSerial(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('serial_number')
    .order('serial_number', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0].serial_number + 1 : 974;
}
