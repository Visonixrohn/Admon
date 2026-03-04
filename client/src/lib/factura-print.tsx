import React from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type TipoGravamen =
  | "gravado_15"
  | "gravado_18"
  | "exento"
  | "exonerado"
  | "tasa_cero";

export interface LineaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tipoGravamen: TipoGravamen;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function calcularLinea(l: LineaItem) {
  const sub = l.cantidad * l.precioUnitario - l.descuento;
  const tasa =
    l.tipoGravamen === "gravado_15"
      ? 0.15
      : l.tipoGravamen === "gravado_18"
        ? 0.18
        : 0;
  const isv = sub * tasa;
  return { sub, isv, total: sub + isv };
}

export function calcularTotales(lineas: LineaItem[]) {
  let subtotal = 0,
    exentos = 0,
    exonerados = 0,
    tasaCero = 0;
  let grav15 = 0,
    isv15 = 0,
    grav18 = 0,
    isv18 = 0;

  for (const l of lineas) {
    const { sub, isv } = calcularLinea(l);
    subtotal += sub;
    if (l.tipoGravamen === "exento") exentos += sub;
    else if (l.tipoGravamen === "exonerado") exonerados += sub;
    else if (l.tipoGravamen === "tasa_cero") tasaCero += sub;
    else if (l.tipoGravamen === "gravado_15") {
      grav15 += sub;
      isv15 += isv;
    } else if (l.tipoGravamen === "gravado_18") {
      grav18 += sub;
      isv18 += isv;
    }
  }
  const total = subtotal + isv15 + isv18;
  return { subtotal, exentos, exonerados, tasaCero, grav15, isv15, grav18, isv18, total };
}

export function lempiras(n: number) {
  return `L ${n.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const LABEL_GRAVAMEN: Record<TipoGravamen, string> = {
  gravado_15: "ISV 15%",
  gravado_18: "ISV 18%",
  exento: "Exento",
  exonerado: "Exonerado",
  tasa_cero: "Tasa Cero",
};

// ─── Componente de impresión (desktop) ────────────────────────────────────────
export function PrintFactura({
  factura,
  dfact,
  lineas,
}: {
  factura: any;
  dfact: any;
  lineas: LineaItem[];
}) {
  const totales = calcularTotales(lineas);

  return (
    <div
      style={{
        width: "816px",
        minHeight: "1056px",
        margin: "0 auto",
        background: "white",
        padding: "36px 40px 28px 40px",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        color: "#000",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`@page { size: letter portrait; margin: 10mm 12mm 10mm 12mm; }`}</style>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <img
          src="/vsr.png"
          alt="Visonixro"
          style={{ width: "90px", height: "90px", objectFit: "contain", display: "block", margin: "0 auto" }}
        />
        <p style={{ fontWeight: "bold", fontSize: "15px", marginTop: "6px", letterSpacing: "1px", textTransform: "uppercase" }}>
          ESTUDIO DIGITAL VISONIXRO
        </p>
      </div>

      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ maxWidth: "280px" }}>
          <p style={{ fontWeight: "bold", fontSize: "11px" }}>CLIENTE</p>
          <p>RTN: {factura.clienteRtn || factura.cliente_rtn || "—"}</p>
          <p>Nombre: {factura.clienteNombre || factura.cliente_nombre}</p>
          <p>Dirección: {factura.clienteDireccion || factura.cliente_direccion || "—"}</p>
          <p style={{ marginTop: "8px" }}>Fecha Emisión: {factura.fecha_emision || new Date().toLocaleDateString("es-HN")}</p>
          <p>No. Documento: {factura.numero || factura.numero_factura}</p>
        </div>
        <div style={{ textAlign: "right", maxWidth: "320px" }}>
          <p style={{ fontSize: "22px", fontWeight: "bold" }}>FACTURA</p>
          <p style={{ fontWeight: "bold" }}>{dfact?.nombre || ""}</p>
          <p style={{ fontSize: "11px" }}>{dfact?.direccion || ""}</p>
          <p>RTN: {dfact?.rtn || ""}</p>
          <p>Teléfono: {dfact?.telefono || ""}</p>
          <p>Email: {dfact?.email || ""}</p>
        </div>
      </div>

      <hr />

      {/* Tabla de líneas */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000" }}>
            <th style={{ textAlign: "left", paddingBottom: "4px", width: "38%" }}>Descripción</th>
            <th style={{ textAlign: "right", width: "7%" }}>Cant.</th>
            <th style={{ textAlign: "right", width: "13%" }}>Precio Unit.</th>
            <th style={{ textAlign: "right", width: "11%" }}>Desc.</th>
            <th style={{ textAlign: "right", width: "13%" }}>Gravamen</th>
            <th style={{ textAlign: "right", width: "13%" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) => {
            const { sub } = calcularLinea(l);
            return (
              <tr key={l.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "4px 6px 4px 0", wordBreak: "break-word", fontSize: "11px" }}>{l.descripcion}</td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>{l.cantidad}</td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>{l.precioUnitario.toFixed(2)}</td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>{l.descuento.toFixed(2)}</td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>{LABEL_GRAVAMEN[l.tipoGravamen]}</td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>{sub.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <table style={{ width: "340px" }}>
          <tbody>
            {([
              ["Subtotal", totales.subtotal],
              ["Valores Exentos", totales.exentos],
              ["Valores Exonerados", totales.exonerados],
              ["Valores Alícuota Tasa Cero", totales.tasaCero],
              ["Monto Gravable ISV 15%", totales.grav15],
              ["ISV 15%", totales.isv15],
              ["Monto Gravable ISV 18%", totales.grav18],
              ["ISV 18%", totales.isv18],
            ] as [string, number][]).map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ padding: "2px 8px" }}>{lbl}</td>
                <td style={{ textAlign: "right", padding: "2px 0" }}>L {val.toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #000", fontWeight: "bold", fontSize: "14px" }}>
              <td style={{ padding: "4px 8px" }}>Total L</td>
              <td style={{ textAlign: "right" }}>L {totales.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notas SAR */}
      <div style={{ marginTop: "24px", fontSize: "11px" }}>
        <p>No. de Orden de Compra Exenta: {factura.noOrdenExenta || factura.no_orden_exenta || "—"}</p>
        <p>No. de Constancia de registro exonerado: {factura.noConstanciaExonerado || factura.no_constancia_exonerado || "—"}</p>
        <p>No. de registro de la SAG: {factura.noRegistroSag || factura.no_registro_sag || "—"}</p>
      </div>

      <div style={{ flex: 1 }} />

      {/* Pie */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: "8px", marginTop: "16px", fontSize: "10px", color: "#555" }}>
        <p>CAI: {dfact?.cai || "—"}</p>
        <p>Rango Autorizado: {dfact?.rango_inicio || "—"} al {dfact?.rango_fin || "—"}</p>
        <p>Fecha Límite de Emisión: {dfact?.fecha_limite || "—"}</p>
      </div>
    </div>
  );
}

// ─── Genera HTML standalone para imprimir en móvil ────────────────────────────
export function buildFacturaHtml(
  factura: any,
  dfact: any,
  lineas: LineaItem[],
  logoSrc: string,
): string {
  const totales = calcularTotales(lineas);
  const filas = lineas
    .map((l) => {
      const { sub } = calcularLinea(l);
      return `<tr style="border-bottom:1px solid #ddd">
        <td style="padding:4px 6px 4px 0;font-size:11px;word-break:break-word">${l.descripcion}</td>
        <td style="text-align:right;font-size:11px">${l.cantidad}</td>
        <td style="text-align:right;font-size:11px">${l.precioUnitario.toFixed(2)}</td>
        <td style="text-align:right;font-size:11px">${l.descuento.toFixed(2)}</td>
        <td style="text-align:right;font-size:11px">${LABEL_GRAVAMEN[l.tipoGravamen]}</td>
        <td style="text-align:right;font-size:11px">${sub.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const totalesRows = ([
    ["Subtotal", totales.subtotal],
    ["Valores Exentos", totales.exentos],
    ["Valores Exonerados", totales.exonerados],
    ["Valores Alícuota Tasa Cero", totales.tasaCero],
    ["Monto Gravable ISV 15%", totales.grav15],
    ["ISV 15%", totales.isv15],
    ["Monto Gravable ISV 18%", totales.grav18],
    ["ISV 18%", totales.isv18],
  ] as [string, number][])
    .map(([lbl, val]) => `<tr><td style="padding:2px 8px">${lbl}</td><td style="text-align:right;padding:2px 0">L ${val.toFixed(2)}</td></tr>`)
    .join("");

  const numero = factura.numero || factura.numero_factura;
  const clienteRtn = factura.clienteRtn || factura.cliente_rtn || "—";
  const clienteNombre = factura.clienteNombre || factura.cliente_nombre;
  const clienteDireccion = factura.clienteDireccion || factura.cliente_direccion || "—";
  const fechaEmision = factura.fecha_emision || new Date().toLocaleDateString("es-HN");
  const noOrdenExenta = factura.noOrdenExenta || factura.no_orden_exenta || "—";
  const noConstanciaExonerado = factura.noConstanciaExonerado || factura.no_constancia_exonerado || "—";
  const noRegistroSag = factura.noRegistroSag || factura.no_registro_sag || "—";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Factura ${numero}</title>
  <style>
    @page { size: letter portrait; margin: 10mm 12mm 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
    .page { width: 100%; min-height: 100vh; padding: 24px; display: flex; flex-direction: column; }
    table { border-collapse: collapse; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div style="text-align:center;margin-bottom:16px">
    <img src="${logoSrc}" alt="VSR" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto" />
    <p style="font-weight:bold;font-size:14px;margin-top:4px;letter-spacing:1px;text-transform:uppercase">ESTUDIO DIGITAL VISONIXRO</p>
  </div>
  <div style="display:flex;justify-content:space-between;margin-bottom:20px">
    <div style="max-width:48%">
      <p style="font-weight:bold;font-size:11px">CLIENTE</p>
      <p>RTN: ${clienteRtn}</p>
      <p>Nombre: ${clienteNombre}</p>
      <p>Dirección: ${clienteDireccion}</p>
      <p style="margin-top:6px">Fecha Emisión: ${fechaEmision}</p>
      <p>No. Documento: ${numero}</p>
    </div>
    <div style="text-align:right;max-width:48%">
      <p style="font-size:20px;font-weight:bold">FACTURA</p>
      <p style="font-weight:bold">${dfact?.nombre || ""}</p>
      <p style="font-size:11px">${dfact?.direccion || ""}</p>
      <p>RTN: ${dfact?.rtn || ""}</p>
      <p>Teléfono: ${dfact?.telefono || ""}</p>
      <p>Email: ${dfact?.email || ""}</p>
    </div>
  </div>
  <hr />
  <table style="width:100%;margin-top:14px">
    <thead>
      <tr style="border-bottom:2px solid #000">
        <th style="text-align:left;padding-bottom:4px;width:38%">Descripción</th>
        <th style="text-align:right;width:7%">Cant.</th>
        <th style="text-align:right;width:13%">Precio Unit.</th>
        <th style="text-align:right;width:11%">Desc.</th>
        <th style="text-align:right;width:13%">Gravamen</th>
        <th style="text-align:right;width:13%">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:20px">
    <table style="width:320px">
      <tbody>
        ${totalesRows}
        <tr style="border-top:2px solid #000;font-weight:bold;font-size:13px">
          <td style="padding:4px 8px">Total L</td>
          <td style="text-align:right">L ${totales.total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div style="margin-top:20px;font-size:11px">
    <p>No. de Orden de Compra Exenta: ${noOrdenExenta}</p>
    <p>No. de Constancia de registro exonerado: ${noConstanciaExonerado}</p>
    <p>No. de registro de la SAG: ${noRegistroSag}</p>
  </div>
  <div style="flex:1"></div>
  <div style="border-top:1px solid #ccc;padding-top:8px;margin-top:14px;font-size:10px;color:#555">
    <p>CAI: ${dfact?.cai || "—"}</p>
    <p>Rango Autorizado: ${dfact?.rango_inicio || "—"} al ${dfact?.rango_fin || "—"}</p>
    <p>Fecha Límite de Emisión: ${dfact?.fecha_limite || "—"}</p>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`;
}

/** Convierte el logo a base64 para incrustar en HTML móvil */
export async function fetchLogoBase64(): Promise<string> {
  try {
    const resp = await fetch("/vsr.png");
    const buf = await resp.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const mime = resp.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${b64}`;
  } catch {
    return "/vsr.png";
  }
}

/** Abre una pestaña nueva con el HTML de la factura y lanza el diálogo de impresión del navegador */
export async function imprimirEnMovil(factura: any, dfact: any, lineas: LineaItem[]) {
  const logoSrc = await fetchLogoBase64();
  const html = buildFacturaHtml(factura, dfact, lineas, logoSrc);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
