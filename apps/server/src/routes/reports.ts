import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router: Router = Router();

// 1. POST /api/reports → guardar reporte de checklist (ADMIN y USER pueden enviar)
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'El campo items es obligatorio y debe ser un arreglo' });
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'El checklist no puede estar vacío' });
    }

    const itemIds: string[] = items.map((item: { id?: string }) => item.id).filter((id): id is string => !!id);

    // Si no es ADMIN, evitar reportar productos que ya están bloqueados (reportados y aún sin atender)
    if (req.user?.role !== 'ADMIN' && itemIds.length > 0) {
      const alreadyReported = await prisma.product.findMany({
        where: { id: { in: itemIds }, reportedAt: { not: null } },
        select: { id: true, name: true },
      });
      if (alreadyReported.length > 0) {
        return res.status(409).json({
          error: 'Algunos productos ya fueron reportados y están bloqueados hasta que se actualice su stock',
          products: alreadyReported.map((p) => p.name),
        });
      }
    }

    const submittedBy = req.user?.name || req.user?.email || 'Usuario';

    const report = await prisma.checklistReport.create({
      data: {
        submittedBy,
        items, // Prisma maneja automáticamente el mapeo a JSON
      },
    });

    // Marcar los productos incluidos como "ya reportados" (bloqueados hasta que se actualice el stock)
    if (itemIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: itemIds } },
        data: { reportedAt: new Date() },
      });
    }

    return res.status(201).json(report);
  } catch (error) {
    console.error('❌ Error al crear reporte de checklist:', error);
    return res.status(500).json({ error: 'Error al crear reporte de checklist' });
  }
});

// 2. GET /api/reports → listar historial de reportes (solo ADMIN)
router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const reports = await prisma.checklistReport.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(reports);
  } catch (error) {
    console.error('❌ Error al obtener reportes:', error);
    return res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

export default router;
