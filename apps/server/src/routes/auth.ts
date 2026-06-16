import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { authMiddleware, requireRole, AuthenticatedRequest } from "../middleware/auth.js";

const router: Router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret-token-wake-stock-2026";

router.post("/login", async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Validar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Firmar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        area: user.area,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        area: user.area,
      },
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Registrar nuevo usuario
router.post("/register", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name, role, area } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, contraseña y nombre son requeridos" });
    }

    // Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "El correo electrónico ya está registrado" });
    }

    const finalRole: "ADMIN" | "USER" = role === "ADMIN" ? "ADMIN" : "USER";
    let finalArea: "COCINA" | "BARRA" | null = null;

    // Un USER siempre debe tener un área asignada; un ADMIN nunca la necesita (ve todo)
    if (finalRole === "USER") {
      if (area !== "COCINA" && area !== "BARRA") {
        return res.status(400).json({ error: "Los usuarios deben tener un área asignada: COCINA o BARRA" });
      }
      finalArea = area;
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: finalRole,
        area: finalArea,
      },
    });

    return res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        area: user.area,
      },
    });
  } catch (error) {
    console.error("❌ Error en registro:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Listar usuarios existentes (solo ADMIN) — útil para obtener IDs y asignar área por Postman
router.get("/users", authMiddleware, requireRole("ADMIN"), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        area: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    return res.json(users);
  } catch (error) {
    console.error("❌ Error al obtener usuarios:", error);
    return res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Actualizar rol/área de un usuario existente (solo ADMIN)
router.patch("/users/:id", authMiddleware, requireRole("ADMIN"), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { role, area } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (role !== undefined && role !== "ADMIN" && role !== "USER") {
      return res.status(400).json({ error: "Rol inválido. Debe ser ADMIN o USER" });
    }
    if (area !== undefined && area !== null && area !== "COCINA" && area !== "BARRA") {
      return res.status(400).json({ error: "Área inválida. Debe ser COCINA, BARRA o null" });
    }

    const resultingRole: "ADMIN" | "USER" = role !== undefined ? role : existingUser.role;
    let resultingArea: "COCINA" | "BARRA" | null = area !== undefined ? area : existingUser.area;

    if (resultingRole === "ADMIN") {
      resultingArea = null; // El admin siempre ve todo, no necesita área
    } else if (resultingArea !== "COCINA" && resultingArea !== "BARRA") {
      return res.status(400).json({ error: "Los usuarios deben tener un área asignada: COCINA o BARRA" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: resultingRole, area: resultingArea },
      select: { id: true, email: true, name: true, role: true, area: true },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
    return res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

export default router;
