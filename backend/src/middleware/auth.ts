import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';

export interface AuthedRequest extends Request {
  user?: { id: string; email: string | undefined };
}

/**
 * Every protected route runs through this first. The frontend logs the user
 * in via Supabase Auth (handled entirely by Supabase, not us) and then sends
 * the resulting access token on every API call as:
 *   Authorization: Bearer <token>
 *
 * We verify that token directly with Supabase on every request — if it's
 * missing, expired, or forged, the request is rejected before it ever
 * touches a database query.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Not signed in.' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch (err) {
    next(err);
  }
}
