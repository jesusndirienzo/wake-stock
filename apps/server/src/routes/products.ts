import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { ProductStatus, ProductUnit } from '@prisma/client';

const router: Router = Router();

// Helper to determine status based on stock and minQuantity
function determineStatus(stock: number, minQuantity: number): ProductStatus {
  if (stock <= 0) {
    return 'AGOTADO';
  }
  if (stock <= minQuantity) {
    return 'BAJO_STOCK';
  }
  return 'DISPONIBLE';
}

// 1. GET /api/products → list all
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const products = await prisma.product.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    });
    return res.json(products);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// 2. GET /api/products/:id → get one
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
          }
        }
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json(product);
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    return res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// 3. POST /api/products → crear (solo ADMIN)
router.post('/', authMiddleware, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, stock, minQuantity, maxQuantity, durationDays, imageUrl, supplierId, unit, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    // Verificar si ya existe un producto con el mismo nombre
    const existingProduct = await prisma.product.findUnique({
      where: { name },
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Ya existe un producto con este nombre' });
    }

    // Verificar si el proveedor existe (si se proporciona supplierId)
    if (supplierId) {
      const supplierExists = await prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplierExists) {
        return res.status(400).json({ error: 'El proveedor especificado no existe' });
      }
    }

    const parsedStock = typeof stock === 'number' ? stock : parseInt(stock) || 0;
    const parsedMin = typeof minQuantity === 'number' ? minQuantity : parseInt(minQuantity) || 1;
    const parsedMax = typeof maxQuantity === 'number' ? maxQuantity : parseInt(maxQuantity) || 10;
    const parsedDuration = durationDays !== undefined && durationDays !== null
      ? (typeof durationDays === 'number' ? durationDays : parseInt(durationDays) || null)
      : null;

    const status = determineStatus(parsedStock, parsedMin);

    const product = await prisma.product.create({
      data: {
        name,
        stock: parsedStock,
        minQuantity: parsedMin,
        maxQuantity: parsedMax,
        durationDays: parsedDuration,
        imageUrl: imageUrl || null,
        notes: notes || null,
        supplierId: supplierId || null,
        status,
        unit: (unit as ProductUnit) || 'UNIDAD',
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
          }
        }
      }
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    return res.status(500).json({ error: 'Error al crear producto' });
  }
});

// 4. PUT /api/products/:id → editar (solo ADMIN)
router.put('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, stock, minQuantity, maxQuantity, durationDays, imageUrl, supplierId, unit, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    // Verificar si el producto existe
    const productExists = await prisma.product.findUnique({
      where: { id },
    });

    if (!productExists) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Si se está cambiando el nombre, verificar que no choque con otro producto
    if (name !== productExists.name) {
      const nameConflict = await prisma.product.findUnique({
        where: { name },
      });
      if (nameConflict) {
        return res.status(400).json({ error: 'Ya existe otro producto con este nombre' });
      }
    }

    // Verificar si el proveedor existe (si se proporciona supplierId)
    if (supplierId) {
      const supplierExists = await prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplierExists) {
        return res.status(400).json({ error: 'El proveedor especificado no existe' });
      }
    }

    const parsedStock = typeof stock === 'number' ? stock : parseInt(stock) || 0;
    const parsedMin = typeof minQuantity === 'number' ? minQuantity : parseInt(minQuantity) || 1;
    const parsedMax = typeof maxQuantity === 'number' ? maxQuantity : parseInt(maxQuantity) || 10;
    const parsedDuration = durationDays !== undefined && durationDays !== null
      ? (typeof durationDays === 'number' ? durationDays : parseInt(durationDays) || null)
      : null;

    const status = determineStatus(parsedStock, parsedMin);

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        stock: parsedStock,
        minQuantity: parsedMin,
        maxQuantity: parsedMax,
        durationDays: parsedDuration,
        imageUrl: imageUrl || null,
        notes: notes || null,
        supplierId: supplierId || null,
        status,
        unit: (unit as ProductUnit) || 'UNIDAD',
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
          }
        }
      }
    });

    return res.json(updatedProduct);
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    return res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// 5. DELETE /api/products/:id → eliminar (solo ADMIN)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Verificar si el producto existe
    const productExists = await prisma.product.findUnique({
      where: { id },
    });

    if (!productExists) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await prisma.product.delete({
      where: { id },
    });

    return res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    return res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// 6. PATCH /api/products/:id/stock → actualizar stock (ADMIN y USER)
// El PATCH solo actualiza el campo stock, nada más.
router.patch('/:id/stock', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      return res.status(400).json({ error: 'El campo stock es obligatorio' });
    }

    const parsedStock = typeof stock === 'number' ? stock : parseInt(stock);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: 'El stock debe ser un número entero mayor o igual a 0' });
    }

    // Verificar si el producto existe para saber su minQuantity y poder calcular el nuevo status
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const newStatus = determineStatus(parsedStock, product.minQuantity);

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        stock: parsedStock,
        status: newStatus,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
          }
        }
      }
    });

    return res.json(updatedProduct);
  } catch (error) {
    console.error('❌ Error al actualizar stock de producto:', error);
    return res.status(500).json({ error: 'Error al actualizar stock de producto' });
  }
});

export default router;
