import PDFDocument from "pdfkit";

interface ProductData {
  name: string;
  stock: number;
  unit: string;
}

export async function generateInventoryPDF(
  products: ProductData[],
  userName: string,
  date: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      bufferPages: true,
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Título
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("Reporte de Inventario", { align: "center" })
      .moveDown(0.5);

    // Fecha y usuario
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Fecha: ${date.toLocaleDateString("es-ES")}`, { align: "left" })
      .text(`Generado por: ${userName}`)
      .moveDown(1);

    // Tabla header
    const tableTop = doc.y;
    const colWidth = 200;
    const rowHeight = 25;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Producto", 50, tableTop)
      .text("Stock Actual", 50 + colWidth, tableTop)
      .text("Unidad", 50 + colWidth + 120, tableTop);

    // Línea separadora
    doc
      .moveTo(50, tableTop + 20)
      .lineTo(550, tableTop + 20)
      .stroke();

    let currentY = tableTop + 30;

    // Filas de productos
    doc.font("Helvetica").fontSize(10);
    products.forEach((product) => {
      // Verificar salto de página ANTES de escribir la fila
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.text(product.name, 50, currentY, { width: colWidth });
      doc.text(product.stock.toString(), 50 + colWidth, currentY);
      doc.text(product.unit, 50 + colWidth + 120, currentY);

      currentY += rowHeight;
    });

    // Footer
    doc
      .moveTo(50, currentY + 10)
      .lineTo(550, currentY + 10)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Total productos: ${products.length}`, 50, currentY + 20, {
        align: "center",
      });

    doc.end();
  });
}

interface OrderRequestProductData {
  name: string;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  status: string;
  supplier: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

export async function generateOrderRequestPDF(
  products: OrderRequestProductData[],
  userName: string,
  date: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      bufferPages: true,
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Título
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("Solicitud de Pedidos", { align: "center" })
      .moveDown(0.5);

    // Fecha y usuario
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Fecha: ${date.toLocaleDateString("es-ES")}`, { align: "left" })
      .text(`Generado por: ${userName}`)
      .moveDown(1);

    // Ordenar productos: primero por proveedor, luego por nombre
    const sortedProducts = [...products].sort((a, b) => {
      const supplierA = a.supplier?.name || "zzz_sin_proveedor";
      const supplierB = b.supplier?.name || "zzz_sin_proveedor";

      if (supplierA !== supplierB) {
        return supplierA.localeCompare(supplierB);
      }
      return a.name.localeCompare(b.name);
    });

    // Definir columnas y anchos
    const columns = [
      { header: "Producto", x: 50, width: 100 },
      { header: "Stock", x: 155, width: 30 },
      { header: "Mín", x: 190, width: 25 },
      { header: "Máx", x: 220, width: 25 },
      { header: "Unidad", x: 250, width: 40 },
      { header: "Estado", x: 295, width: 60 },
      { header: "A pedir", x: 360, width: 35 },
      { header: "Proveedor", x: 400, width: 70 },
      { header: "Contacto", x: 475, width: 60 },
    ];

    const rowHeight = 22;
    let currentY = doc.y;
    const tableTop = currentY;

    // Headers de tabla
    doc
      .font("Helvetica-Bold")
      .fontSize(8);

    columns.forEach((col) => {
      doc.text(col.header, col.x, tableTop, { width: col.width });
    });

    // Línea separadora
    doc
      .moveTo(50, tableTop + 18)
      .lineTo(535, tableTop + 18)
      .stroke();

    currentY = tableTop + 25;

    // Filas de productos
    doc.font("Helvetica").fontSize(8);
    sortedProducts.forEach((product) => {
      // Verificar salto de página
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;

        // Repetir headers después del salto
        doc.font("Helvetica-Bold").fontSize(8);
        columns.forEach((col) => {
          doc.text(col.header, col.x, currentY, { width: col.width });
        });

        doc
          .moveTo(50, currentY + 18)
          .lineTo(535, currentY + 18)
          .stroke();

        currentY += 25;
        doc.font("Helvetica").fontSize(8);
      }

      const toPedir = Math.max(0, product.maxQuantity - product.stock);
      const toPedirStr = Number(toPedir.toFixed(2)).toString();
      const providerName = product.supplier?.name || "Sin proveedor";
      const contactInfo = product.supplier?.phone || product.supplier?.email || "";

      doc.text(product.name, 50, currentY, { width: 100 });
      doc.text(product.stock.toString(), 155, currentY);
      doc.text(product.minQuantity.toString(), 190, currentY);
      doc.text(product.maxQuantity.toString(), 220, currentY);
      doc.text(product.unit, 250, currentY);
      doc.text(product.status, 295, currentY, { width: 60 });
      doc.text(toPedirStr, 360, currentY);
      doc.text(providerName, 400, currentY, { width: 70 });
      doc.text(contactInfo, 475, currentY, { width: 60 });

      currentY += rowHeight;
    });

    // Línea final de tabla
    doc
      .moveTo(50, currentY)
      .lineTo(535, currentY)
      .stroke();

    // Footer
    currentY += 20;
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Total productos: ${products.length}`, 50, currentY, {
        align: "center",
      });

    doc.end();
  });
}
