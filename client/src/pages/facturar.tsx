import React, { useEffect, useRef, useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Printer,
  Trash2,
  FileText,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { imprimirEnMovil } from "@/lib/factura-print";

// ─── Tipos ──────────────────────────────────────────────────────────────────
type TipoGravamen =
  | "gravado_15"
  | "gravado_18"
  | "exento"
  | "exonerado"
  | "tasa_cero";

interface LineaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tipoGravamen: TipoGravamen;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcularLinea(l: LineaItem) {
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

function calcularTotales(lineas: LineaItem[]) {
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
  return {
    subtotal,
    exentos,
    exonerados,
    tasaCero,
    grav15,
    isv15,
    grav18,
    isv18,
    total,
  };
}

function lempiras(n: number) {
  return `L ${n.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generarCorrelativo(
  prefEst: string,
  prefPE: string,
  prefTD: string,
  correlativo: number,
) {
  const seq = String(correlativo).padStart(8, "0");
  return `${(prefEst || "000").padStart(3, "0")}-${(prefPE || "001").padStart(3, "0")}-${(prefTD || "01").padStart(2, "0")}-${seq}`;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

const LABEL_GRAVAMEN: Record<TipoGravamen, string> = {
  gravado_15: "ISV 15%",
  gravado_18: "ISV 18%",
  exento: "Exento",
  exonerado: "Exonerado",
  tasa_cero: "Tasa Cero",
};

// ─── Componente de impresión ──────────────────────────────────────────────────
function PrintFactura({
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
      {/* Logo y nombre — centrado, arriba de todo */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <img
          src="/vsr.png"
          alt="Visonixro"
          style={{
            width: "90px",
            height: "90px",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
          }}
        />
        <p
          style={{
            fontWeight: "bold",
            fontSize: "15px",
            marginTop: "6px",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          ESTUDIO DIGITAL VISONIXRO
        </p>
      </div>

      {/* Encabezado empresa */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div style={{ maxWidth: "280px" }}>
          <p style={{ fontWeight: "bold", fontSize: "11px" }}>CLIENTE</p>
          <p>RTN: {factura.clienteRtn || "—"}</p>
          <p>Nombre: {factura.clienteNombre}</p>
          <p>Dirección: {factura.clienteDireccion || "—"}</p>
          <p style={{ marginTop: "8px" }}>
            Fecha Emisión: {new Date().toLocaleDateString("es-HN")}
          </p>
          <p>No. Documento: {factura.numero}</p>
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
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #000" }}>
            <th
              style={{ textAlign: "left", paddingBottom: "4px", width: "38%" }}
            >
              Descripción
            </th>
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
                <td
                  style={{
                    padding: "4px 6px 4px 0",
                    wordBreak: "break-word",
                    fontSize: "11px",
                  }}
                >
                  {l.descripcion}
                </td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>
                  {l.cantidad}
                </td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>
                  {l.precioUnitario.toFixed(2)}
                </td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>
                  {l.descuento.toFixed(2)}
                </td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>
                  {LABEL_GRAVAMEN[l.tipoGravamen]}
                </td>
                <td style={{ textAlign: "right", fontSize: "11px" }}>
                  {sub.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totales */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "24px",
        }}
      >
        <table style={{ width: "340px" }}>
          <tbody>
            {[
              ["Subtotal", totales.subtotal],
              ["Valores Exentos", totales.exentos],
              ["Valores Exonerados", totales.exonerados],
              ["Valores Alícuota Tasa Cero", totales.tasaCero],
              ["Monto Gravable ISV 15%", totales.grav15],
              ["ISV 15%", totales.isv15],
              ["Monto Gravable ISV 18%", totales.grav18],
              ["ISV 18%", totales.isv18],
            ].map(([lbl, val]) => (
              <tr key={lbl as string}>
                <td style={{ padding: "2px 8px" }}>{lbl as string}</td>
                <td style={{ textAlign: "right", padding: "2px 0" }}>
                  L {(val as number).toFixed(2)}
                </td>
              </tr>
            ))}
            <tr
              style={{
                borderTop: "2px solid #000",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              <td style={{ padding: "4px 8px" }}>Total L</td>
              <td style={{ textAlign: "right" }}>
                L {totales.total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notas SAR */}
      <div style={{ marginTop: "24px", fontSize: "11px" }}>
        <p>No. de Orden de Compra Exenta: {factura.noOrdenExenta || "—"}</p>
        <p>
          No. de Constancia de registro exonerado:{" "}
          {factura.noConstanciaExonerado || "—"}
        </p>
        <p>No. de registro de la SAG: {factura.noRegistroSag || "—"}</p>
      </div>

      {/* Spacer empuja el pie hacia abajo */}
      <div style={{ flex: 1 }} />

      {/* CAI y Rango — pie de página en flujo normal (no absolute) */}
      <div
        style={{
          borderTop: "1px solid #ccc",
          paddingTop: "8px",
          marginTop: "16px",
          fontSize: "10px",
          color: "#555",
        }}
      >
        <p>CAI: {dfact?.cai || "—"}</p>
        <p>
          Rango Autorizado: {dfact?.rango_inicio || "—"} al{" "}
          {dfact?.rango_fin || "—"}
        </p>
        <p>Fecha Límite de Emisión: {dfact?.fecha_limite || "—"}</p>
      </div>
    </div>
  );
}

// ─── Genera HTML standalone para imprimir en móvil ───────────────────────────
function buildFacturaHtml(
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

  const totalesRows = [
    ["Subtotal", totales.subtotal],
    ["Valores Exentos", totales.exentos],
    ["Valores Exonerados", totales.exonerados],
    ["Valores Alícuota Tasa Cero", totales.tasaCero],
    ["Monto Gravable ISV 15%", totales.grav15],
    ["ISV 15%", totales.isv15],
    ["Monto Gravable ISV 18%", totales.grav18],
    ["ISV 18%", totales.isv18],
  ]
    .map(
      ([lbl, val]) =>
        `<tr><td style="padding:2px 8px">${lbl}</td><td style="text-align:right;padding:2px 0">L ${(val as number).toFixed(2)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Factura ${factura.numero}</title>
  <style>
    @page { size: letter portrait; margin: 10mm 12mm 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
    .page { width: 100%; min-height: 100vh; padding: 24px; display: flex; flex-direction: column; }
    table { border-collapse: collapse; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
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
      <p>RTN: ${factura.clienteRtn || "—"}</p>
      <p>Nombre: ${factura.clienteNombre}</p>
      <p>Dirección: ${factura.clienteDireccion || "—"}</p>
      <p style="margin-top:6px">Fecha Emisión: ${new Date().toLocaleDateString("es-HN")}</p>
      <p>No. Documento: ${factura.numero}</p>
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
    <p>No. de Orden de Compra Exenta: ${factura.noOrdenExenta || "—"}</p>
    <p>No. de Constancia de registro exonerado: ${factura.noConstanciaExonerado || "—"}</p>
    <p>No. de registro de la SAG: ${factura.noRegistroSag || "—"}</p>
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Facturar() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);

  // ── Datos de facturación (SAR)
  const { data: dfact } = useQuery({
    queryKey: ["datos_facturacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datos_facturacion")
        .select("*")
        .limit(1);
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });

  // ── Catálogo de productos/servicios
  const { data: catalogo = [] } = useQuery({
    queryKey: ["productos_servicios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos_servicios")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Estado formulario
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteRtn, setClienteRtn] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [noOrdenExenta, setNoOrdenExenta] = useState("");
  const [noConstanciaExonerado, setNoConstanciaExonerado] = useState("");
  const [noRegistroSag, setNoRegistroSag] = useState("");
  const [lineas, setLineas] = useState<LineaItem[]>([]);
  const [showSarModal, setShowSarModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  // ── Modal de línea ──────────────────────────────────────────
  const [showLineaModal, setShowLineaModal] = useState(false);
  const [lineaEditId, setLineaEditId] = useState<string | null>(null); // null = nueva
  const [mlDescripcion, setMlDescripcion] = useState("");
  const [mlCantidad, setMlCantidad] = useState("1");
  const [mlPrecio, setMlPrecio] = useState("0");
  const [mlDescuento, setMlDescuento] = useState("0");
  const [mlGravamen, setMlGravamen] = useState<TipoGravamen>("gravado_15");
  const [mlCatalogoId, setMlCatalogoId] = useState("");

  function abrirNuevaLinea() {
    setLineaEditId(null);
    setMlDescripcion("");
    setMlCantidad("1");
    setMlPrecio("0");
    setMlDescuento("0");
    setMlGravamen("gravado_15");
    setMlCatalogoId("");
    setShowLineaModal(true);
  }

  function abrirEditarLinea(l: LineaItem) {
    setLineaEditId(l.id);
    setMlDescripcion(l.descripcion);
    setMlCantidad(String(l.cantidad));
    setMlPrecio(String(l.precioUnitario));
    setMlDescuento(String(l.descuento));
    setMlGravamen(l.tipoGravamen);
    setMlCatalogoId("");
    setShowLineaModal(true);
  }

  function aplicarCatalogoModal(productoId: string) {
    const prod: any = catalogo.find((p: any) => p.id === productoId);
    if (!prod) return;
    setMlDescripcion(prod.nombre);
    setMlPrecio(String(prod.precio_unitario ?? "0"));
    setMlGravamen(prod.tipo_gravamen ?? "gravado_15");
    setMlCatalogoId(productoId);
  }

  function guardarLineaModal() {
    if (!mlDescripcion.trim()) return;
    const nuevaLinea: LineaItem = {
      id: lineaEditId ?? uid(),
      descripcion: mlDescripcion,
      cantidad: parseFloat(mlCantidad) || 1,
      precioUnitario: parseFloat(mlPrecio) || 0,
      descuento: parseFloat(mlDescuento) || 0,
      tipoGravamen: mlGravamen,
    };
    if (lineaEditId) {
      setLineas((prev) =>
        prev.map((l) => (l.id === lineaEditId ? nuevaLinea : l)),
      );
    } else {
      setLineas((prev) => [...prev, nuevaLinea]);
    }
    setShowLineaModal(false);
  }

  // Número provisional
  const correlativoActual = dfact?.correlativo_actual ?? 1;
  const numeroProvisional = dfact
    ? generarCorrelativo(
        dfact.prefijo_establecimiento,
        dfact.prefijo_punto_emision,
        dfact.prefijo_tipo_doc,
        correlativoActual,
      )
    : "---";

  const totales = calcularTotales(lineas);

  // ── Líneas (addLinea ahora abre modal)
  function removeLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLinea(id: string, field: keyof LineaItem, value: any) {
    setLineas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  }

  function aplicarProductoCatalogo(lineaId: string, productoId: string) {
    const prod: any = catalogo.find((p: any) => p.id === productoId);
    if (!prod) return;
    setLineas((prev) =>
      prev.map((l) =>
        l.id === lineaId
          ? {
              ...l,
              descripcion: prod.nombre,
              precioUnitario: parseFloat(prod.precio_unitario ?? "0"),
              tipoGravamen: prod.tipo_gravamen ?? "gravado_15",
            }
          : l,
      ),
    );
  }

  // ── Guardar e imprimir
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { size: letter portrait; margin: 10mm 12mm 10mm 12mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  const handleMobilePrint = useCallback(async () => {
    if (!printData || !dfact) return;
    await imprimirEnMovil(printData, dfact, printData.lineas ?? []);
  }, [printData, dfact]);

  async function emitirFactura() {
    if (!dfact) {
      toast({
        title: "Configure primero los datos de facturación (SAR)",
        variant: "destructive",
      });
      return;
    }
    if (!clienteNombre.trim()) {
      toast({ title: "Ingrese el nombre del cliente", variant: "destructive" });
      return;
    }
    if (lineas.length === 0 || lineas.every((l) => !l.descripcion.trim())) {
      toast({ title: "Agregue al menos un ítem", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const numero = generarCorrelativo(
        dfact.prefijo_establecimiento,
        dfact.prefijo_punto_emision,
        dfact.prefijo_tipo_doc,
        dfact.correlativo_actual,
      );

      const payload = {
        numero_factura: numero,
        cai: dfact.cai,
        fecha_emision: new Date().toISOString().substring(0, 10),
        fecha_limite: dfact.fecha_limite,
        cliente_nombre: clienteNombre,
        cliente_rtn: clienteRtn || null,
        cliente_direccion: clienteDireccion || null,
        cliente_email: clienteEmail || null,
        subtotal: totales.subtotal,
        descuento_total: lineas.reduce((a, l) => a + l.descuento, 0),
        valores_exentos: totales.exentos,
        valores_exonerados: totales.exonerados,
        valores_tasa_cero: totales.tasaCero,
        monto_gravable_15: totales.grav15,
        isv_15: totales.isv15,
        monto_gravable_18: totales.grav18,
        isv_18: totales.isv18,
        total: totales.total,
        no_orden_exenta: noOrdenExenta || null,
        no_constancia_exonerado: noConstanciaExonerado || null,
        no_registro_sag: noRegistroSag || null,
        estado: "emitida",
      };

      const { data: facInserted, error: facError } = await supabase
        .from("facturas")
        .insert([payload])
        .select()
        .single();

      if (facError) throw facError;

      // Insertar detalles
      const detalles = lineas
        .filter((l) => l.descripcion.trim())
        .map((l, i) => {
          const { sub, isv, total } = calcularLinea(l);
          return {
            factura_id: facInserted.id,
            linea: i + 1,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precio_unitario: l.precioUnitario,
            descuento: l.descuento,
            tipo_gravamen: l.tipoGravamen,
            subtotal_linea: sub,
            isv_linea: isv,
            total_linea: total,
          };
        });

      if (detalles.length > 0) {
        const { error: detError } = await supabase
          .from("detalle_facturas")
          .insert(detalles);
        if (detError) throw detError;
      }

      // Incrementar correlativo
      await supabase
        .from("datos_facturacion")
        .update({
          correlativo_actual: dfact.correlativo_actual + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dfact.id);

      queryClient.invalidateQueries({ queryKey: ["datos_facturacion"] });
      queryClient.invalidateQueries({ queryKey: ["facturas"] });

      toast({
        title: `Factura ${numero} emitida`,
        description: lempiras(totales.total),
      });

      // Guardar snapshot de líneas ANTES de limpiar
      const lineasSnapshot = [...lineas];

      setPrintData({
        numero,
        clienteNombre,
        clienteRtn,
        clienteDireccion,
        noOrdenExenta,
        noConstanciaExonerado,
        noRegistroSag,
        lineas: lineasSnapshot,
      });
      setShowPrint(true);

      // Limpiar
      setClienteNombre("");
      setClienteRtn("");
      setClienteDireccion("");
      setClienteEmail("");
      setNoOrdenExenta("");
      setNoConstanciaExonerado("");
      setNoRegistroSag("");
      setLineas([
        {
          id: uid(),
          descripcion: "",
          cantidad: 1,
          precioUnitario: 0,
          descuento: 0,
          tipoGravamen: "gravado_15",
        },
      ]);
    } catch (err: any) {
      toast({
        title: "Error al emitir factura",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Receipt className="w-6 h-6" /> Facturar
          </h1>
          <p className="text-sm text-muted-foreground">
            Emisión de facturas según requerimientos SAR Honduras
          </p>
        </div>
        {dfact ? (
          <div className="text-sm text-right text-muted-foreground">
            <p className="font-mono text-foreground font-semibold">
              {numeroProvisional}
            </p>
            <p>Próximo número</p>
          </div>
        ) : (
          <Badge variant="destructive">
            Configure datos de facturación en Configuración
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Formulario izquierda ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm font-medium mb-1 block">
                    Nombre / Razón Social *
                  </label>
                  <Input
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Cliente S.A."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">RTN</label>
                  <Input
                    value={clienteRtn}
                    onChange={(e) => setClienteRtn(e.target.value)}
                    placeholder="0803XXXXXXXXX"
                    maxLength={14}
                    className="font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Dirección
                </label>
                <Input
                  value={clienteDireccion}
                  onChange={(e) => setClienteDireccion(e.target.value)}
                  placeholder="Tegucigalpa, Honduras"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Líneas */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Productos / Servicios</CardTitle>
              <Button size="sm" variant="outline" onClick={abrirNuevaLinea}>
                <Plus className="w-4 h-4 mr-1" /> Agregar línea
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[260px]">Descripción</TableHead>
                    <TableHead className="w-[70px]">Cant.</TableHead>
                    <TableHead className="w-[100px]">Precio Unit.</TableHead>
                    <TableHead className="w-[90px]">Descuento</TableHead>
                    <TableHead className="w-[120px]">Gravamen</TableHead>
                    <TableHead className="w-[90px] text-right">
                      Subtotal
                    </TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-6"
                      >
                        Sin líneas — haz clic en &quot;Agregar línea&quot;
                      </TableCell>
                    </TableRow>
                  ) : (
                    lineas.map((linea) => {
                      const { sub } = calcularLinea(linea);
                      return (
                        <TableRow
                          key={linea.id}
                          className="cursor-pointer hover:bg-muted/30"
                        >
                          <TableCell className="py-2">
                            {linea.descripcion || (
                              <span className="text-muted-foreground italic text-xs">
                                Sin descripción
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {linea.cantidad}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono">
                            {linea.precioUnitario.toFixed(2)}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono">
                            {linea.descuento.toFixed(2)}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs">
                              {LABEL_GRAVAMEN[linea.tipoGravamen]}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono font-semibold">
                            {lempiras(sub)}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => abrirEditarLinea(linea)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-3 h-3"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeLinea(linea.id)}
                                disabled={lineas.length === 1}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Campos SAR (opcionales) — botón interruptor */}
          <div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowSarModal(true)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Campos SAR (opcionales)
              {(noOrdenExenta || noConstanciaExonerado || noRegistroSag) && (
                <span className="ml-2 w-2 h-2 rounded-full bg-primary inline-block" />
              )}
            </Button>
          </div>
        </div>

        {/* ── Resumen derecha ── */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Subtotal", totales.subtotal],
                ["Valores Exentos", totales.exentos],
                ["Valores Exonerados", totales.exonerados],
                ["Valores Alícuota Tasa Cero", totales.tasaCero],
                ["Monto Gravable ISV 15%", totales.grav15],
                ["ISV 15%", totales.isv15],
                ["Monto Gravable ISV 18%", totales.grav18],
                ["ISV 18%", totales.isv18],
              ].map(([lbl, val]) => (
                <div
                  key={lbl as string}
                  className="flex justify-between text-muted-foreground"
                >
                  <span>{lbl as string}</span>
                  <span className="font-mono">{lempiras(val as number)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total L</span>
                <span className="font-mono">{lempiras(totales.total)}</span>
              </div>
              <Button
                className="w-full mt-4"
                onClick={emitirFactura}
                disabled={saving || !dfact}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Emitir Factura
              </Button>
            </CardContent>
          </Card>

          {/* Datos CAI activo */}
          {dfact && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">CAI Activo</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 text-muted-foreground">
                <p className="font-mono text-foreground break-all">
                  {dfact.cai}
                </p>
                <p>
                  Rango: {dfact.rango_inicio} — {dfact.rango_fin}
                </p>
                <p>Fecha límite: {dfact.fecha_limite}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Modal agregar / editar línea ── */}
      <Dialog open={showLineaModal} onOpenChange={setShowLineaModal}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {lineaEditId ? "Editar línea" : "Nueva línea"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {catalogo.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Del catálogo (opcional)
                </label>
                <Select
                  value={mlCatalogoId}
                  onValueChange={aplicarCatalogoModal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto/servicio…" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogo.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} — L{" "}
                        {parseFloat(p.precio_unitario).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Descripción *
              </label>
              <Textarea
                rows={2}
                value={mlDescripcion}
                onChange={(e) => setMlDescripcion(e.target.value)}
                placeholder="Descripción del producto o servicio…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Cantidad
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={mlCantidad}
                  onChange={(e) => setMlCantidad(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Precio Unitario (L)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mlPrecio}
                  onChange={(e) => setMlPrecio(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Descuento (L)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mlDescuento}
                  onChange={(e) => setMlDescuento(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Tipo de Gravamen
              </label>
              <Select
                value={mlGravamen}
                onValueChange={(v) => setMlGravamen(v as TipoGravamen)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gravado_15">
                    ISV 15% — Tasa general
                  </SelectItem>
                  <SelectItem value="gravado_18">
                    ISV 18% — Bebidas alcohólicas / tabaco
                  </SelectItem>
                  <SelectItem value="exento">Exento de ISV</SelectItem>
                  <SelectItem value="exonerado">
                    Exonerado (requiere constancia)
                  </SelectItem>
                  <SelectItem value="tasa_cero">Alícuota Tasa Cero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Preview de subtotal */}
            {(() => {
              const temp: LineaItem = {
                id: "_",
                descripcion: mlDescripcion,
                cantidad: parseFloat(mlCantidad) || 0,
                precioUnitario: parseFloat(mlPrecio) || 0,
                descuento: parseFloat(mlDescuento) || 0,
                tipoGravamen: mlGravamen,
              };
              const { sub, isv, total } = calcularLinea(temp);
              return (
                <div className="bg-muted/40 rounded-lg p-3 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="font-mono">{lempiras(sub)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ISV</p>
                    <p className="font-mono">{lempiras(isv)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Total línea
                    </p>
                    <p className="font-mono font-semibold">{lempiras(total)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLineaModal(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={guardarLineaModal}
              disabled={!mlDescripcion.trim()}
            >
              {lineaEditId ? "Actualizar" : "Agregar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de impresión */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="w-[98vw] max-w-[880px] max-h-[90vh] overflow-y-auto p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" /> Vista previa — {printData?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            {isMobile ? (
              <Button size="sm" onClick={handleMobilePrint}>
                <Printer className="w-4 h-4 mr-2" /> Abrir para imprimir
              </Button>
            ) : (
              <Button size="sm" onClick={() => handlePrint()}>
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
            )}
          </div>
          {/* Vista previa escalable: en móvil se escala para caber en pantalla */}
          <div
            className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              style={{
                transformOrigin: "top left",
                transform: isMobile
                  ? `scale(${Math.min(1, (window.innerWidth - 24) / 816)})`
                  : "scale(1)",
                width: "816px",
                marginBottom: isMobile
                  ? `${Math.max(0, 1056 * Math.min(1, (window.innerWidth - 24) / 816) - 1056)}px`
                  : 0,
              }}
            >
              <div ref={printRef}>
                {printData && dfact && (
                  <PrintFactura
                    factura={printData}
                    dfact={dfact}
                    lineas={printData.lineas ?? []}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Campos SAR ── */}
      <Dialog open={showSarModal} onOpenChange={setShowSarModal}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Campos SAR (opcionales)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                No. de Orden de Compra Exenta
              </label>
              <Input
                value={noOrdenExenta}
                onChange={(e) => setNoOrdenExenta(e.target.value)}
                placeholder="Dejar vacío si no aplica"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                No. de Constancia de Registro Exonerado
              </label>
              <Input
                value={noConstanciaExonerado}
                onChange={(e) => setNoConstanciaExonerado(e.target.value)}
                placeholder="Dejar vacío si no aplica"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                No. de Registro de la SAG
              </label>
              <Input
                value={noRegistroSag}
                onChange={(e) => setNoRegistroSag(e.target.value)}
                placeholder="Dejar vacío si no aplica"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setShowSarModal(false)}>
                Listo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
