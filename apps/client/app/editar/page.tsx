"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import AuthGuard from "../../components/AuthGuard";
import Header from "../../components/Header";
import { api } from "../../utils/api";

interface SupplierOption {
  id: string;
  name: string;
}

function EditarForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get("type") as "product" | "supplier";
  const id = searchParams.get("id");

  const isEditMode = !!id;
  const isAdmin = user?.role === "ADMIN";

  // Estado del formulario de Producto
  const [productForm, setProductForm] = useState({
    name: "",
    stock: "0",
    minQuantity: "1",
    maxQuantity: "10",
    durationDays: "" as string | number,
    imageUrl: "",
    supplierId: "",
    unit: "UNIDAD",
    notes: "",
    area: "",
  });

  // Estado del formulario de Proveedor
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
  });

  const [suppliersList, setSuppliersList] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirigir si no es admin
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        setError(null);

        // Si es producto, cargamos la lista de proveedores para el select
        if (type === "product") {
          const suppliersRes = await api.get("/api/suppliers");
          if (suppliersRes.ok) {
            const data = await suppliersRes.json();
            setSuppliersList(data);
          }
        }

        // Si es modo edición, cargamos la entidad
        if (isEditMode) {
          const endpoint =
            type === "product" ? `/api/products/${id}` : `/api/suppliers/${id}`;
          const res = await api.get(endpoint);
          if (!res.ok) {
            throw new Error(
              `No se pudo obtener la información del ${type === "product" ? "producto" : "proveedor"}`,
            );
          }
          const data = await res.json();

          if (type === "product") {
            setProductForm({
              name: data.name || "",
              stock: data.stock !== undefined ? String(data.stock) : "0",
              minQuantity:
                data.minQuantity !== undefined ? String(data.minQuantity) : "1",
              maxQuantity:
                data.maxQuantity !== undefined
                  ? String(data.maxQuantity)
                  : "10",
              durationDays:
                data.durationDays !== null && data.durationDays !== undefined
                  ? data.durationDays
                  : "",
              imageUrl: data.imageUrl || "",
              supplierId: data.supplierId || "",
              unit: data.unit || "UNIDAD",
              notes: data.notes || "",
              area: data.area || "",
            });
          } else {
            setSupplierForm({
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              website: data.website || "",
              notes: data.notes || "",
            });
          }
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error al cargar los datos",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (type === "product" || type === "supplier") {
      loadInitialData();
    } else {
      setIsLoading(false);
      setError(
        "Tipo de formulario no válido. Especifique ?type=product o ?type=supplier",
      );
    }
  }, [type, id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};
      let response: Response;

      if (type === "product") {
        if (!productForm.name.trim())
          throw new Error("El nombre es obligatorio");

        endpoint = isEditMode ? `/api/products/${id}` : "/api/products";
        body = {
          name: productForm.name,
          stock: Number(productForm.stock),
          minQuantity: Number(productForm.minQuantity),
          maxQuantity: Number(productForm.maxQuantity),
          durationDays:
            productForm.durationDays !== ""
              ? Number(productForm.durationDays)
              : null,
          imageUrl: productForm.imageUrl || null,
          supplierId: productForm.supplierId || null,
          unit: productForm.unit,
          notes: productForm.notes || null,
          area: productForm.area || null,
        };
        response = isEditMode
          ? await api.put(endpoint, body)
          : await api.post(endpoint, body);
      } else {
        if (!supplierForm.name.trim())
          throw new Error("El nombre es obligatorio");

        endpoint = isEditMode ? `/api/suppliers/${id}` : "/api/suppliers";
        body = {
          name: supplierForm.name,
          email: supplierForm.email || null,
          phone: supplierForm.phone || null,
          website: supplierForm.website || null,
          notes: supplierForm.notes || null,
        };
        response = isEditMode
          ? await api.put(endpoint, body)
          : await api.post(endpoint, body);
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error ||
            `Error al guardar el ${type === "product" ? "producto" : "proveedor"}`,
        );
      }

      router.push(type === "product" ? "/inventario" : "/proveedores");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(type === "product" ? "/inventario" : "/proveedores");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans w-full items-center overflow-x-hidden">
        <div className="w-full">
          <Header />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-24! text-zinc-500 gap-3 box-border">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-100 border-t-[#2B4236]" />
          <p className="text-sm font-medium">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans w-full items-center overflow-x-hidden">
        <div className="w-full">
          <Header />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6! text-center box-border">
          <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mb-4!">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-800">Acceso Denegado</h2>
          <p className="text-sm font-medium text-zinc-500 max-w-md mt-1!">
            Esta sección es exclusiva para usuarios administradores. Serás
            redirigido al panel principal.
          </p>
        </div>
      </div>
    );
  }

  const formTitle = `${isEditMode ? "Editar" : "Nuevo"} ${type === "product" ? "Producto" : "Proveedor"}`;

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans w-full items-center overflow-x-hidden">
      <div className="w-full">
        <Header />
      </div>

      {/* main estructurado a max-w-[94vw] adaptado a tu Home */}
      <main className="flex-1 w-full max-w-[94vw] xl:max-w-240 flex flex-col py-8! mb-24! box-border">
        {/* Cabecera */}
        <div className="flex flex-col gap-2 mb-8! pb-4! border-b border-zinc-105">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-800 transition-colors mb-3! group self-start"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            Volver
          </button>
          <h1 className="text-3xl font-black tracking-tight text-[#2B4236]">
            {formTitle}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-zinc-500">
            Rellena los campos para{" "}
            {isEditMode
              ? "actualizar los datos en"
              : "crear un nuevo elemento en"}{" "}
            Wake Stock.
          </p>
        </div>

        {/* Notificaciones de Error */}
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

        {/* Tarjeta de Formulario Base */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-zinc-200 rounded-[28px] p-6! sm:p-8! space-y-6! shadow-[0_4px_20px_rgba(0,0,0,0.02)] box-border"
        >
          {type === "product" ? (
            // FORMULARIO DE PRODUCTO REESTILIZADO
            <div className="space-y-5!">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Café en grano Arabica"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4!">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Existencias Iniciales
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stock: e.target.value })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.minQuantity}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        minQuantity: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Stock Máximo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.maxQuantity}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        maxQuantity: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4!">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Días de Duración (Consumo)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Sin límite"
                    value={productForm.durationDays}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        durationDays:
                          e.target.value !== ""
                            ? Math.max(1, parseInt(e.target.value) || 1)
                            : "",
                      })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Unidad de Medida
                  </label>
                  <select
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unit: e.target.value })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-bold text-zinc-800 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm cursor-pointer"
                  >
                    <option value="UNIDAD">Unidad</option>
                    <option value="KG">Kg</option>
                    <option value="GRAMOS">Gramos</option>
                    <option value="PAQUETE">Paquete</option>
                    <option value="LITRO">Litro</option>
                    <option value="CAJA">Caja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Proveedor Suministrador
                  </label>
                  <select
                    value={productForm.supplierId}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        supplierId: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-bold text-zinc-800 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm cursor-pointer"
                  >
                    <option value="">Ninguno / Sin Proveedor</option>
                    {suppliersList.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                  Área de Visibilidad
                </label>
                <select
                  value={productForm.area}
                  onChange={(e) =>
                    setProductForm({ ...productForm, area: e.target.value })
                  }
                  className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-bold text-zinc-800 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm cursor-pointer"
                >
                  <option value="">Ambos (Cocina y Barra)</option>
                  <option value="COCINA">Solo Cocina</option>
                  <option value="BARRA">Solo Barra</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                  URL de la Imagen del Producto
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={productForm.imageUrl}
                  onChange={(e) =>
                    setProductForm({ ...productForm, imageUrl: e.target.value })
                  }
                  className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                  Notas del Producto
                </label>
                <textarea
                  rows={3}
                  placeholder="Instrucciones de almacenamiento, observaciones..."
                  value={productForm.notes}
                  onChange={(e) =>
                    setProductForm({ ...productForm, notes: e.target.value })
                  }
                  className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm resize-y"
                />
              </div>
            </div>
          ) : (
            // FORMULARIO DE PROVEEDOR REESTILIZADO
            <div className="space-y-5!">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuciones Horeca SL"
                  value={supplierForm.name}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4!">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. +34 600 000 000"
                    value={supplierForm.phone}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        phone: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="Ej. contacto@proveedor.com"
                    value={supplierForm.email}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                  Sitio Web
                </label>
                <input
                  type="text"
                  placeholder="Ej. www.proveedor.com"
                  value={supplierForm.website}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      website: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2! pl-1!">
                  Notas de Entrega / Información de Reparto
                </label>
                <textarea
                  rows={4}
                  placeholder="Escribe aquí las franjas horarias de reparto, días de entrega, pedido mínimo o notas generales..."
                  value={supplierForm.notes}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, notes: e.target.value })
                  }
                  className="w-full rounded-2xl bg-white border border-zinc-200 py-3! px-4! text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-[#2B4236] focus:ring-1 focus:ring-[#2B4236] shadow-sm resize-y"
                />
              </div>
            </div>
          )}

          {/* Botones de Acción Estilo Premium */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5! border-t border-zinc-200 box-border">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-6! py-3.5! text-sm font-bold text-zinc-700 hover:text-[#2B4236] transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#2B4236] hover:bg-[#354f41] px-8! py-3.5! text-sm font-bold text-white outline-none transition-all duration-200 shadow-[0_4px_12px_rgba(43,66,54,0.3)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none cursor-pointer border-none"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isEditMode ? "Guardar Cambios" : "Crear"}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-100 border-t-[#2B4236]" />
        </div>
      }
    >
      <EditarForm />
    </Suspense>
  );
}
