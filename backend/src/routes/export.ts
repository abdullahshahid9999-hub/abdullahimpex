import { Router } from 'express';
import dayjs from 'dayjs';
import { buildBackupWorkbook } from '../lib/excel';
import { asyncRoute, ApiError } from '../middleware/error';

const router = Router();

const ALL_MODULES = ['stock', 'suppliers', 'customers', 'purchases', 'sales', 'invoices'] as const;

// GET /export?modules=stock,sales&from=2026-01-01&to=2026-06-30
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const modulesParam = (req.query.modules as string | undefined)?.trim();
    const modules = modulesParam
      ? (modulesParam.split(',').filter((m) => ALL_MODULES.includes(m as any)) as typeof ALL_MODULES[number][])
      : [...ALL_MODULES];

    if (modules.length === 0) {
      throw new ApiError(400, 'Choose at least one module to export.');
    }

    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const buffer = await buildBackupWorkbook(modules, from, to);
    const filenameDate = dayjs().format('YYYY-MM-DD');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${filenameDate}.xlsx"`);
    res.send(buffer);
  })
);

export default router;
