"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../utils/api";
import AuthGuard from "../../components/AuthGuard";
import Header from "../../components/Header";

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
  reportedAt: string | null;
  supplier: {
    name: string;
  } | null;
}

export default function ChecklistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "alert" | "available" | "favorite"
  >("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Obtener la lista de productos al cargar la página
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await api.get("/api/products");
        if (!response.ok) {
          throw new Error("Error al cargar la lista de productos");
        }
        const data = await response.json();
        setProducts(data);

        // Pre-seleccionar de forma automática productos AGOTADOS o en BAJO_STOCK
        const alertProductIds = data
          .filter(
            (p: Product) => p.status === "AGOTADO" || p.status === "BAJO_STOCK",
          )
          .map((p: Product) => p.id);
        setSelectedIds(alertProductIds);
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const isAdmin = user?.role === "ADMIN";

  const handleSelectAllAlerts = () => {
    const alertIds = products
      .filter(
        (p) =>
          (p.status === "AGOTADO" || p.status === "BAJO_STOCK") &&
          (isAdmin || !p.reportedAt),
      )
      .map((p) => p.id);
    setSelectedIds(alertIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleSubmitReport = async () => {
    if (selectedIds.length === 0) {
      setError("Por favor, selecciona al menos un producto para reportar.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const selectedProducts = products
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minQuantity: p.minQuantity,
        maxQuantity: p.maxQuantity,
        status: p.status,
        supplierName: p.supplier?.name || "Sin Proveedor",
        notes: p.notes || null,
      }));

    try {
      const response = await api.post("/api/reports", {
        items: selectedProducts,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Error al enviar el reporte");
      }

      setSuccess("¡Reporte de checklist enviado exitosamente!");
      setSelectedIds([]);

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar reporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado reactivo de productos (Buscador y Tabs)
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

  const UNIT_LABELS: Record<string, string> = {
    UNIDAD: "uds", KG: "kg", GRAMOS: "gr",
    PAQUETE: "pack", LITRO: "l", CAJA: "box",
  };

  return (
    <AuthGuard>
      {/* Contenedor principal alineado con el diseño responsivo centrado */}
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans w-full items-center overflow-x-hidden">
        <div className="w-full">
          <Header />
        </div>

        {/* main adaptado con max-w-[94vw] para simular los márgenes perfectos de la home */}
        <main className="flex-1 w-full max-w-[94vw] xl:max-w-350 flex flex-col py-8 mb-24 box-border">
          <div className="flex flex-col gap-4 mb-8 pb-4 border-b border-zinc-105">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Contenedor de botones */}
              <div className="flex gap-3 mb-2.5! mt-3! shrink-0">
                <button
                  onClick={handleSelectAllAlerts}
                  className="px-5! py-4! rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-[#2B4236] transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                >
                  Auto-seleccionar Alertas
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-3! py-3.5 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-red-600 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                >
                  Limpiar Todo
                </button>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-semibold text-red-700 shadow-sm animate-in fade-in duration-200">
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
            <div className="mb-6 flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-700 shadow-sm animate-in fade-in duration-200">
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
                placeholder="Buscar producto..."
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3! pl-6! pr-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
              />
            </div>

            {/* Pestañas de Filtro Rediseñadas al estilo Wake Stock */}
            <div className="flex rounded-2xl border border-zinc-200 bg-zinc-50 p-2! self-start md:self-auto shadow-inner">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-5! py-2! text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-[#2B4236] text-white shadow-md"
                    : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                onClick={() => setFilterStatus("alert")}
                className={`px-5! py-2! text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  filterStatus === "alert"
                    ? "bg-[#2B4236] text-white shadow-md"
                    : "text-zinc-500 hover:text-zinc-950"
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
                    : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                Recurrentes ({products.filter((p) => p.isFavorite).length})
              </button>
              <button
                onClick={() => setFilterStatus("available")}
                className={`px-5! py-2! text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  filterStatus === "available"
                    ? "bg-[#2B4236] text-white shadow-md"
                    : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                Disponibles (
                {products.filter((p) => p.status === "DISPONIBLE").length ||
                  products.filter((p) => p.status === "DISPONIBLE").length}
                )
              </button>
            </div>
          </div>

          {/* Listado de Productos */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-24">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-100 border-t-[#2B4236]" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50 p-6">
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
                Prueba con otro término de búsqueda o cambia de filtro.
              </p>
            </div>
          ) : (
            /* Cuadrícula de Tarjetas con gap-2 estricto alineado con la Home */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-32!">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                const isLocked = !!product.reportedAt && !isAdmin;

                // Colores de badges refinados
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
                    onClick={() => !isLocked && handleToggleSelect(product.id)}
                    title={
                      isLocked
                        ? "Ya fue reportado por cocina o barra. Se desbloquea al actualizar el stock."
                        : undefined
                    }
                    className={`group p-3! relative flex items-center justify-between rounded-2xl border transition-all duration-200 box-border ${
                      isLocked
                        ? "border-zinc-200 bg-zinc-50 opacity-60 cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      !isLocked && isSelected
                        ? "border-[#2B4236] bg-[#2B4236]/5 shadow-[0_4px_12px_rgba(43,66,84,0.08)]"
                        : !isLocked
                          ? "border-zinc-200 bg-white hover:border-[#2B4236]/30 hover:bg-zinc-50/40 shadow-[0_4px_10px_rgba(0,0,0,0.02)]"
                          : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Checkbox circular/redondeado premium */}
                      <div
                        className={`flex ml-2.5! h-5.5 w-5.5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? "border-[#2B4236] bg-[#2B4236] text-white"
                            : "border-zinc-300 bg-white group-hover:border-[#2B4236]/50"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Detalles del Producto */}
                      <div className="min-w-0">
                        <h4 className="flex items-center gap-1.5 font-bold text-zinc-900 truncate text-base group-hover:text-[#2B4236] transition-colors duration-200">
                          {product.name}
                          {product.isFavorite && (
                            <span className="text-amber-500 shrink-0" title="Recurrente">
                              ★
                            </span>
                          )}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-medium text-zinc-500">
                          <span className="truncate">
                            Prov: {product.supplier?.name || "Sin proveedor"}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="font-semibold text-zinc-600">
                            Stock: {product.stock}/{product.maxQuantity} {UNIT_LABELS[product.unit] ?? "uds"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badges de Estado y Bloqueo */}
                    <div className="flex flex-col items-end gap-1.5 ml-3 shrink-0">
                      {isLocked && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border bg-zinc-100 text-zinc-500 border-zinc-200">
                          Ya reportado
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${badgeColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Panel Flotante de Confirmación (Estilo Barra Premium Redondeada) */}
          {!isLoading && products.length > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92vw] max-w-340 bg-white/90 backdrop-blur-md py-4! px-6! z-30 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.15)] border border-zinc-100 flex items-center justify-between gap-4! animate-in slide-in-from-bottom duration-300">
              <div className="text-sm">
                <p className="text-[#2B4236] font-black text-base">
                  {selectedIds.length === 1
                    ? "1 producto seleccionado"
                    : `${selectedIds.length} productos seleccionados`}
                </p>
                <p className="text-xs font-medium text-zinc-400 hidden sm:block mt-0.5!">
                  Se enviará una instantánea del estado de stock de los
                  elementos seleccionados al historial.
                </p>
              </div>

              <button
                onClick={handleSubmitReport}
                disabled={isSubmitting || selectedIds.length === 0}
                className="flex items-center gap-2.5! rounded-xl bg-[#2B4236] px-6! py-3! text-sm font-bold text-white outline-none transition-all duration-200 hover:bg-[#354f41] shadow-[0_4px_12px_rgba(43,66,54,0.3)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none cursor-pointer border-none"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
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
                        d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                      />
                    </svg>
                    Enviar Reporte
                  </>
                )}
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
