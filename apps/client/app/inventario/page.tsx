"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../utils/api";
import AuthGuard from "../../components/AuthGuard";
import Header from "../../components/Header";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
  status: "DISPONIBLE" | "AGOTADO" | "BAJO_STOCK";
  unit: string;
  imageUrl: string | null;
  notes: string | null;
  isFavorite: boolean;
  area: "COCINA" | "BARRA" | null;
  reportedAt: string | null;
  durationDays: number | null;
  supplierId: string | null;
  supplier: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
  } | null;
}

export default function InventarioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "alert" | "available" | "favorite"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await api.get("/api/products");
        if (!response.ok) {
          throw new Error("Error al cargar la lista de productos");
        }
        const data = await response.json();
        setProducts(data);

        const initialInputs: Record<string, number> = {};
        data.forEach((p: Product) => {
          initialInputs[p.id] = p.stock;
        });
        setStockInputs(initialInputs);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error al obtener productos",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleStockInputChange = (id: string, value: number) => {
    if (value < 0) return;
    const product = products.find((p) => p.id === id);
    if (product && user?.role === "USER" && value > product.maxQuantity) {
      value = product.maxQuantity;
    }
    setStockInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveStock = async (id: string) => {
    const newStock = stockInputs[id];
    if (newStock === undefined || newStock < 0) return;

    const product = products.find((p) => p.id === id);
    if (!product) return;

    setUpdatingStockId(id);
    setError(null);
    setSuccess(null);

    if (user?.role === "USER" && newStock > product.maxQuantity) {
      setError(
        `El stock no puede superar el máximo establecido de ${product.maxQuantity} unidades.`,
      );
      setUpdatingStockId(null);
      return;
    }

    try {
      const response = await api.patch(`/api/products/${id}/stock`, {
        stock: newStock,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Error al actualizar el stock");
      }

      const updatedProduct = (await response.json()) as Product;

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updatedProduct : p)),
      );

      setSuccess(
        `Stock de "${updatedProduct.name}" actualizado a ${updatedProduct.stock} uds.`,
      );

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar stock",
      );
    } finally {
      setUpdatingStockId(null);
    }
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      const response = await api.patch(`/api/products/${id}/favorite`, {
        isFavorite: !current,
      });
      if (!response.ok) return;
      const updatedProduct = (await response.json()) as Product;
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updatedProduct : p)),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar favorito",
      );
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar el producto "${name}"?`,
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await api.delete(`/api/products/${id}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Error al eliminar el producto");
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSuccess(`El producto "${name}" ha sido eliminado exitosamente.`);
      setExpandedId(null);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar producto",
      );
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (filterStatus === "alert") {
      return (
        matchesSearch &&
        (product.status === "AGOTADO" || product.status === "BAJO_STOCK")
      );
    }
    if (filterStatus === "available") {
      return matchesSearch && product.status === "DISPONIBLE";
    }
    if (filterStatus === "favorite") {
      return matchesSearch && product.isFavorite;
    }
    return matchesSearch;
  });

  const isAdmin = user?.role === "ADMIN";

  const UNIT_LABELS: Record<string, string> = {
    UNIDAD: "uds", KG: "kg", GRAMOS: "gr",
    PAQUETE: "pack", LITRO: "l", CAJA: "box",
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans w-full items-center overflow-x-hidden">
        <div className="w-full">
          <Header />
        </div>

        {/* main adaptado con max-w-[94vw] igual que Checklist */}
        <main className="flex-1 w-full max-w-[94vw] xl:max-w-350 flex flex-col py-8! mb-24! box-border">
          {/* Cabecera de Página */}
          <div className="flex flex-col gap-4 mb-8! pb-4! border-b border-zinc-105">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[#2B4236]">
                  Inventario General
                </h1>
                <p className="mt-1.5 text-sm font-medium text-zinc-500">
                  Consulta la disponibilidad y gestiona las existencias actuales
                  de la cafetería.
                </p>
              </div>

              {/* Botón Nuevo Producto */}
              {isAdmin && (
                <div className="flex mb-2.5! mt-3! shrink-0">
                  <button
                    onClick={() => router.push("/editar?type=product")}
                    className="px-5! py-4! rounded-xl border border-zinc-200 bg-[#2B4236] hover:bg-[#354f41] text-white text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    Nuevo Producto
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notificaciones */}
          {error && (
            <div className="mb-6! flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-4! text-sm font-semibold text-red-700 shadow-sm animate-in fade-in duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6! flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4! text-sm font-semibold text-emerald-700 shadow-sm animate-in fade-in duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Filtros y Búsqueda */}
          <div className="flex flex-col md:flex-row gap-4 mb-8! mt-3!">
            {/* Buscador */}
            <div className="relative p-2! flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-zinc-400"></div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto por nombre..."
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3! pl-12! pr-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
              />
            </div>

            {/* Pestañas de Filtro */}
            <div className="flex rounded-2xl border border-zinc-200 bg-zinc-50 p-2! self-start md:self-auto shadow-inner">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-5! py-2! text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-[#2B4236] text-white shadow-md"
                    : "text-zinc-550 hover:text-zinc-900"
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                onClick={() => setFilterStatus("alert")}
                className={`px-5! py-2! text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  filterStatus === "alert"
                    ? "bg-[#2B4236] text-white shadow-md"
                    : "text-zinc-550 hover:text-zinc-900"
                }`}
              >
                Alertas (
                {
                  products.filter(
                    (p) => p.status === "AGOTADO" || p.status === "BAJO_STOCK",
                  ).length
                }
                )
              </button>
              <button
                onClick={() => setFilterStatus("favorite")}
                className={`px-5! py-2! text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  filterStatus === "favorite"
                    ? "bg-[#2B4236] text-white shadow-md"
                    : "text-zinc-550 hover:text-zinc-900"
                }`}
              >
                Recurrentes (
                {products.filter((p) => p.isFavorite).length})
              </button>
              <button
                onClick={() => setFilterStatus("available")}
                className={`px-5! py-2! text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  filterStatus === "available"
                    ? "bg-[#2B4236] text-white shadow-md"
                    : "text-zinc-550 hover:text-zinc-900"
                }`}
              >
                Disponibles (
                {products.filter((p) => p.status === "DISPONIBLE").length})
              </button>
            </div>
          </div>

          {/* Lista de Acordeones */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-24!">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-100 border-t-[#2B4236]" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20! text-center border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50 p-6!">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-14 h-14 text-zinc-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-bold text-zinc-800">
                No se encontraron productos
              </h3>
              <p className="mt-1 text-sm font-medium text-zinc-500">
                Prueba ajustando los filtros de búsqueda.
              </p>
            </div>
          ) : (
            <div className="space-y-3!">
              {filteredProducts.map((product) => {
                const isExpanded = expandedId === product.id;

                let badgeColor = "";
                let statusLabel = "";
                if (product.status === "AGOTADO") {
                  badgeColor =
                    "bg-red-50 text-red-700 p-1.5! mr-2! border-red-100";
                  statusLabel = "Agotado";
                } else if (product.status === "BAJO_STOCK") {
                  badgeColor =
                    "bg-amber-50 text-amber-700 p-1.5! mr-2! border-amber-100";
                  statusLabel = "Bajo Stock";
                } else {
                  badgeColor =
                    "bg-emerald-50 text-emerald-700 p-1.5! mr-2! border-emerald-100";
                  statusLabel = "Disponible";
                }

                return (
                  <div
                    key={product.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden box-border ${
                      isExpanded
                        ? "border-[#2B4236] bg-zinc-50/40 shadow-[0_4px_12px_rgba(43,66,54,0.05)]"
                        : "border-zinc-200 bg-white hover:border-[#2B4236]/30 hover:bg-zinc-50/40 shadow-[0_4px_10px_rgba(0,0,0,0.02)]"
                    }`}
                  >
                    {/* Cabecera del Acordeón */}
                    <div
                      onClick={() => toggleExpand(product.id)}
                      className="group p-4! relative flex items-center justify-between cursor-pointer select-none box-border"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0 pl-1!">
                        {/* Indicador de flecha */}
                        <div
                          className={`text-zinc-400 transition-transform duration-300 ${isExpanded ? "rotate-90 text-[#2B4236]" : ""}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m8.25 4.5 7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-zinc-900 text-base truncate group-hover:text-[#2B4236] transition-colors duration-200">
                              {product.name}
                            </h3>
                            {product.isFavorite && (
                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5! py-0.5!">
                                ★ Recurrente
                              </span>
                            )}
                            {product.area && (
                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 rounded-md px-1.5! py-0.5!">
                                {product.area === "COCINA" ? "Cocina" : "Barra"}
                              </span>
                            )}
                            {product.reportedAt && (
                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-md px-1.5! py-0.5!">
                                Ya reportado
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-zinc-500 truncate mt-0.5!">
                            Proveedor:{" "}
                            {product.supplier?.name || "Sin Proveedor"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 box-border pr-1!">
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(product.id, product.isFavorite);
                            }}
                            title={
                              product.isFavorite
                                ? "Quitar de recurrentes"
                                : "Marcar como recurrente"
                            }
                            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                              product.isFavorite
                                ? "text-amber-500 hover:text-amber-600"
                                : "text-zinc-300 hover:text-zinc-400"
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill={product.isFavorite ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                              />
                            </svg>
                          </button>
                        )}
                        <span className="text-sm font-bold text-zinc-700 bg-white border border-zinc-200 px-3! py-1! rounded-xl shadow-sm">
                          {product.stock} {UNIT_LABELS[product.unit] ?? "uds"}.
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider rounded-lg border ${badgeColor}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Contenido Desplegable */}
                    {isExpanded && (
                      <div className="border-t border-zinc-200 p-6! bg-white rounded-b-2xl space-y-6! box-border animate-in fade-in duration-200">
                        <div className="flex flex-col md:flex-row gap-6!">
                          {/* Miniatura del producto */}
                          {product.imageUrl && (
                            <div className="w-full md:w-32 h-32 shrink-0 relative rounded-2xl border border-zinc-200 overflow-hidden bg-zinc-50 shadow-sm">
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}

                          {/* Ficha de Detalles */}
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5! text-sm font-medium">
                            <div>
                              <span className="text-zinc-400">
                                Mínimo Requerido:
                              </span>
                              <span className="ml-2 font-bold text-zinc-800">
                                {product.minQuantity} {UNIT_LABELS[product.unit] ?? "uds"}.
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-400">
                                Capacidad Máxima:
                              </span>
                              <span className="ml-2 font-bold text-zinc-800">
                                {product.maxQuantity} {UNIT_LABELS[product.unit] ?? "uds"}.
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-400">
                                Duración Estimada:
                              </span>
                              <span className="ml-2 font-bold text-zinc-800">
                                {product.durationDays
                                  ? `${product.durationDays} días`
                                  : "N/D"}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-400">
                                Contacto Proveedor:
                              </span>
                              {product.supplier ? (
                                <span className="ml-2 font-bold text-[#2B4236]">
                                  {product.supplier.phone ||
                                    product.supplier.website ||
                                    "N/D"}
                                </span>
                              ) : (
                                <span className="ml-2 font-bold text-zinc-400">
                                  N/D
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Notas */}
                        {product.notes && (
                          <div>
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                              Notas
                            </span>
                            <p className="mt-1.5! text-sm font-medium text-zinc-700 bg-zinc-50 rounded-xl px-4! py-3! border border-zinc-200">
                              {product.notes}
                            </p>
                          </div>
                        )}

                        {/* Fila Inferior de Acciones */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-zinc-200 pt-5! gap-4!">
                          {/* Control de Stock Rápido */}
                          <div className="flex items-center gap-3.5! box-border">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                              Stock Rápido:
                            </span>
                            <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1!">
                              <button
                                onClick={() =>
                                  handleStockInputChange(
                                    product.id,
                                    Math.max(
                                      0,
                                      (stockInputs[product.id] ??
                                        product.stock) - 1,
                                    ),
                                  )
                                }
                                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-50 text-zinc-500 hover:text-[#2B4236] transition-colors cursor-pointer"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2.5}
                                  stroke="currentColor"
                                  className="w-3.5 h-3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 12h14"
                                  />
                                </svg>
                              </button>

                              <input
                                type="string"
                                min="0"
                                value={stockInputs[product.id] ?? product.stock}
                                onChange={(e) =>
                                  handleStockInputChange(
                                    product.id,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-12 text-center bg-transparent border-none text-zinc-900 text-sm font-bold focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
                              />

                              <button
                                onClick={() =>
                                  handleStockInputChange(
                                    product.id,
                                    Math.min(
                                      (stockInputs[product.id] ??
                                        product.stock) + 1,
                                      user?.role === "USER"
                                        ? product.maxQuantity
                                        : Infinity,
                                    ),
                                  )
                                }
                                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-50 text-zinc-500 hover:text-[#2B4236] transition-colors cursor-pointer"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2.5}
                                  stroke="currentColor"
                                  className="w-3.5 h-3.5 text-zinc-600"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m7.5-7.5h-15"
                                  />
                                </svg>
                              </button>
                            </div>

                            {/* Botón Aplicar Guardado */}
                            {(stockInputs[product.id] ?? product.stock) !==
                              product.stock && (
                              <button
                                onClick={() => handleSaveStock(product.id)}
                                disabled={updatingStockId === product.id}
                                className="flex items-center gap-1 bg-[#2B4236] hover:bg-[#354f41] disabled:opacity-50 text-white text-xs font-bold px-4! py-2.5! rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                              >
                                {updatingStockId === product.id
                                  ? "Guardando..."
                                  : "Aplicar"}
                              </button>
                            )}
                          </div>

                          {/* Controles de Gestión Administrativa */}
                          {isAdmin && (
                            <div className="flex items-center gap-2.5! self-end sm:self-auto">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/editar?type=product&id=${product.id}`,
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4! py-2.5! text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-[#2B4236] transition-all cursor-pointer shadow-sm active:scale-95"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2.3}
                                  stroke="currentColor"
                                  className="w-3.5 h-3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 20.089a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                  />
                                </svg>
                                Editar
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteProduct(product.id, product.name)
                                }
                                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4! py-2.5! text-xs font-bold text-red-600 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer shadow-sm active:scale-95"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2.3}
                                  stroke="currentColor"
                                  className="w-3.5 h-3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m14.74 9-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                  />
                                </svg>
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
