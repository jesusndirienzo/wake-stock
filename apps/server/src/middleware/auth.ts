import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "USER";
    area: "COCINA" | "BARRA" | null;
  };
}

// Middleware de verificación de autenticación
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): any => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ error: "Acceso denegado. Token no proporcionado." });
    }

    // El token debe venir en formato "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res
        .status(401)
        .json({ error: "Acceso denegado. Formato de token inválido." });
    }

    // Verificar el token JWT
    const decoded = jwt.verify(
      token,
      JWT_SECRET,
    ) as AuthenticatedRequest["user"];

    // Adjuntar los datos de usuario decodificados al objeto de la petición (req)
    req.user = decoded;

    return next();
  } catch (error) {
    console.error("❌ Error en verificación de token:", error);
    return res
      .status(401)
      .json({ error: "Acceso denegado. Token inválido o expirado." });
  }
};

// Middleware para autorizar roles específicos (ADMIN o USER)
export const requireRole = (allowedRole: "ADMIN" | "USER") => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): any => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    if (req.user.role !== allowedRole) {
      return res
        .status(403)
        .json({ error: "Acceso denegado. Permisos insuficientes." });
    }

    return next();
  };
};
