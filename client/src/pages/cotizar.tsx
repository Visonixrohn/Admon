import React, { useRef, useState, useCallback, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Printer,
  Trash2,
  FileText,
  RefreshCw,
  Check,
  ChevronsUpDown,
  Search,
  ClipboardList,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useReactToPrint } from "react-to-print";
import {
  calcularLinea,
  calcularTotales,
  lempiras,
  LABEL_GRAVAMEN,
  type LineaItem,
  type TipoGravamen,
} from "@/lib/factura-print";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Componente PrintCotizacion ───────────────────────────────────────────────
export function PrintCotizacion({
  cotizacion,
  dfact,
  lineas,
}: {
  cotizacion: any;
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

      {/* Logo y nombre */}
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

      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div style={{ maxWidth: "280px" }}>
          <p style={{ fontWeight: "bold", fontSize: "11px" }}>CLIENTE</p>
          <p>Nombre: {cotizacion.clienteNombre || cotizacion.cliente_nombre}</p>
          {(cotizacion.clienteRtn || cotizacion.cliente_rtn) && (
            <p>RTN: {cotizacion.clienteRtn || cotizacion.cliente_rtn}</p>
          )}
          {(cotizacion.clienteDireccion || cotizacion.cliente_direccion) && (
            <p>
              Dirección:{" "}
              {cotizacion.clienteDireccion || cotizacion.cliente_direccion}
            </p>
          )}
          {(cotizacion.clienteTelefono || cotizacion.cliente_telefono) && (
            <p>
              Tel: {cotizacion.clienteTelefono || cotizacion.cliente_telefono}
            </p>
          )}
          <p style={{ marginTop: "8px" }}>
            Fecha Emisión:{" "}
            {new Date(
              cotizacion.fecha_emision || Date.now(),
            ).toLocaleDateString("es-HN")}
          </p>
          {cotizacion.fecha_validez && (
            <p>
              Válida hasta:{" "}
              {new Date(
                cotizacion.fecha_validez + "T12:00:00",
              ).toLocaleDateString("es-HN")}
            </p>
          )}
          <p>
            No. Cotización: {cotizacion.numero || cotizacion.numero_cotizacion}
          </p>
        </div>
        <div style={{ textAlign: "right", maxWidth: "320px" }}>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "#1a56db" }}>
            COTIZACIÓN
          </p>
          <p style={{ fontWeight: "bold" }}>
            {dfact?.nombre || "ESTUDIO DIGITAL VISONIXRO"}
          </p>
          {dfact?.direccion && (
            <p style={{ fontSize: "11px" }}>{dfact.direccion}</p>
          )}
          {dfact?.rtn && <p>RTN: {dfact.rtn}</p>}
          {dfact?.telefono && <p>Teléfono: {dfact.telefono}</p>}
          {dfact?.email && <p>Email: {dfact.email}</p>}
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
              style={{ textAlign: "left", paddingBottom: "4px", width: "42%" }}
            >
              Descripción
            </th>
            <th style={{ textAlign: "right", width: "7%" }}>Cant.</th>
            <th style={{ textAlign: "right", width: "14%" }}>Precio Unit.</th>
            <th style={{ textAlign: "right", width: "10%" }}>Desc.</th>
            <th style={{ textAlign: "right", width: "13%" }}>Gravamen</th>
            <th style={{ textAlign: "right", width: "14%" }}>Subtotal</th>
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
              ...(totales.exentos > 0
                ? [["Valores Exentos", totales.exentos]]
                : []),
              ...(totales.exonerados > 0
                ? [["Valores Exonerados", totales.exonerados]]
                : []),
              ...(totales.tasaCero > 0
                ? [["Tasa Cero", totales.tasaCero]]
                : []),
              ...(totales.grav15 > 0
                ? [
                    ["Monto Gravable ISV 15%", totales.grav15],
                    ["ISV 15%", totales.isv15],
                  ]
                : []),
              ...(totales.grav18 > 0
                ? [
                    ["Monto Gravable ISV 18%", totales.grav18],
                    ["ISV 18%", totales.isv18],
                  ]
                : []),
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

      {/* Notas y condiciones */}
      {(cotizacion.notas || cotizacion.condiciones) && (
        <div style={{ marginTop: "24px", fontSize: "11px" }}>
          {cotizacion.notas && (
            <>
              <p style={{ fontWeight: "bold" }}>Notas:</p>
              <p style={{ marginBottom: "8px", whiteSpace: "pre-wrap" }}>
                {cotizacion.notas}
              </p>
            </>
          )}
          {cotizacion.condiciones && (
            <>
              <p style={{ fontWeight: "bold" }}>Condiciones:</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{cotizacion.condiciones}</p>
            </>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div
        style={{
          borderTop: "1px solid #ccc",
          paddingTop: "8px",
          marginTop: "16px",
          fontSize: "10px",
          color: "#555",
          textAlign: "center",
        }}
      >
        <p>
          Esta cotización no constituye una factura fiscal. Precios en Lempiras
          hondureños.
        </p>
        {dfact?.email && (
          <p>
            Consultas: {dfact.email}{" "}
            {dfact?.telefono ? `| ${dfact.telefono}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Cotizar() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);

  // ── Datos empresa (reutilizamos datos_facturacion para nombre/teléfono/email)
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

  // ── Clientes para autocompletar
  const { data: clientesData = [] } = useQuery({
    queryKey: ["clientes_ac"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id,nombre,rtn,email,direccion")
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Historial de clientes en cotizaciones emitidas
  const { data: cotizacionesHist = [] } = useQuery({
    queryKey: ["cotizaciones_hist_clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select(
          "cliente_nombre,cliente_rtn,cliente_direccion,cliente_email,cliente_telefono",
        )
        .order("fecha_emision", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Lista combinada de clientes sugeridos
  type SugCliente = {
    key: string;
    nombre: string;
    rtn: string;
    direccion: string;
    email: string;
    telefono: string;
  };
  const clientesSugeridos = useMemo<SugCliente[]>(() => {
    const map = new Map<string, SugCliente>();
    for (const c of clientesData as any[]) {
      const key = (c.nombre || "").toLowerCase().trim();
      if (key)
        map.set(key, {
          key,
          nombre: c.nombre,
          rtn: c.rtn || "",
          direccion: c.direccion || "",
          email: c.email || "",
          telefono: "",
        });
    }
    for (const f of cotizacionesHist as any[]) {
      const key = (f.cliente_nombre || "").toLowerCase().trim();
      if (!key) continue;
      if (map.has(key)) {
        const ex = map.get(key)!;
        if (!ex.direccion && f.cliente_direccion)
          ex.direccion = f.cliente_direccion;
        if (!ex.rtn && f.cliente_rtn) ex.rtn = f.cliente_rtn;
        if (!ex.email && f.cliente_email) ex.email = f.cliente_email;
        if (!ex.telefono && f.cliente_telefono)
          ex.telefono = f.cliente_telefono;
      } else {
        map.set(key, {
          key,
          nombre: f.cliente_nombre,
          rtn: f.cliente_rtn || "",
          direccion: f.cliente_direccion || "",
          email: f.cliente_email || "",
          telefono: f.cliente_telefono || "",
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [clientesData, cotizacionesHist]);

  // ── Estado formulario
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteRtn, setClienteRtn] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [fechaValidez, setFechaValidez] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().substring(0, 10);
  });
  const [notas, setNotas] = useState("");
  const [condiciones, setCondiciones] = useState(
    "Precios en Lempiras. Impuestos incluidos donde aplique.",
  );
  const [lineas, setLineas] = useState<LineaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  // ── Combobox cliente
  const [openClienteCombo, setOpenClienteCombo] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");

  // ── Modal de línea
  const [showLineaModal, setShowLineaModal] = useState(false);
  const [lineaEditId, setLineaEditId] = useState<string | null>(null);
  const [mlDescripcion, setMlDescripcion] = useState("");
  const [mlCantidad, setMlCantidad] = useState("1");
  const [mlPrecio, setMlPrecio] = useState("0");
  const [mlDescuento, setMlDescuento] = useState("0");
  const [mlGravamen, setMlGravamen] = useState<TipoGravamen>("gravado_15");
  const [mlTotal, setMlTotal] = useState("0");
  const [openDescCombo, setOpenDescCombo] = useState(false);
  const [descSearch, setDescSearch] = useState("");

  function abrirNuevaLinea() {
    setLineaEditId(null);
    setMlDescripcion("");
    setMlCantidad("1");
    setMlPrecio("0");
    setMlDescuento("0");
    setMlGravamen("gravado_15");
    setMlTotal("0");
    setOpenDescCombo(false);
    setDescSearch("");
    setShowLineaModal(true);
  }

  function abrirEditarLinea(l: LineaItem) {
    setLineaEditId(l.id);
    setMlDescripcion(l.descripcion);
    setMlCantidad(String(l.cantidad));
    setMlPrecio(String(l.precioUnitario));
    setMlDescuento(String(l.descuento));
    setMlGravamen(l.tipoGravamen);
    const { total } = calcularLinea(l);
    setMlTotal(total.toFixed(2));
    setOpenDescCombo(false);
    setDescSearch("");
    setShowLineaModal(true);
  }

  function handleMlTotalChange(totalStr: string) {
    setMlTotal(totalStr);
    const total = parseFloat(totalStr) || 0;
    const cant = parseFloat(mlCantidad) || 1;
    const desc = parseFloat(mlDescuento) || 0;
    const tasa =
      mlGravamen === "gravado_15"
        ? 0.15
        : mlGravamen === "gravado_18"
          ? 0.18
          : 0;
    const sub = tasa > 0 ? total / (1 + tasa) : total;
    const precio = (sub + desc) / Math.max(cant, 0.000001);
    setMlPrecio(Math.max(0, precio).toFixed(6));
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

  function seleccionarCliente(c: SugCliente) {
    setClienteNombre(c.nombre);
    setClienteRtn(c.rtn);
    setClienteDireccion(c.direccion);
    setClienteEmail(c.email);
    setClienteTelefono(c.telefono);
    setOpenClienteCombo(false);
    setClienteSearch("");
  }

  function removeLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  const totales = calcularTotales(lineas);

  // ── Imprimir (desktop)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printData
      ? `cotizacion de cliente: ${printData.clienteNombre}, cotizacion numero: ${printData.numero}`
      : "Cotizacion",
    pageStyle: `@page { size: letter portrait; margin: 10mm 12mm 10mm 12mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`,
  });

  // ── Imprimir (móvil) — genera HTML standalone
  const handleMobilePrint = useCallback(async () => {
    if (!printData) return;
    const lineasSnap: LineaItem[] = printData.lineas ?? [];
    const tots = calcularTotales(lineasSnap);

    const filas = lineasSnap
      .map((l) => {
        const { sub } = calcularLinea(l);
        return `<tr style="border-bottom:1px solid #ddd">
        <td style="padding:4px 0;font-size:11px;word-break:break-word">${l.descripcion}</td>
        <td style="text-align:right;font-size:11px">${l.cantidad}</td>
        <td style="text-align:right;font-size:11px">${l.precioUnitario.toFixed(2)}</td>
        <td style="text-align:right;font-size:11px">${l.descuento.toFixed(2)}</td>
        <td style="text-align:right;font-size:11px">${LABEL_GRAVAMEN[l.tipoGravamen]}</td>
        <td style="text-align:right;font-size:11px">${sub.toFixed(2)}</td>
      </tr>`;
      })
      .join("");

    const totRows = [
      ["Subtotal", tots.subtotal],
      ...(tots.exentos > 0 ? [["Exentos", tots.exentos]] : []),
      ...(tots.grav15 > 0
        ? [
            ["Gravable 15%", tots.grav15],
            ["ISV 15%", tots.isv15],
          ]
        : []),
      ...(tots.grav18 > 0
        ? [
            ["Gravable 18%", tots.grav18],
            ["ISV 18%", tots.isv18],
          ]
        : []),
    ]
      .map(
        ([lbl, v]) =>
          `<tr><td style="padding:2px 8px">${lbl}</td><td style="text-align:right">L ${(v as number).toFixed(2)}</td></tr>`,
      )
      .join("");

    const logoRes = await fetch("/vsr.png");
    const logoBlob = await logoRes.blob();
    const logoSrc = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result as string);
      r.readAsDataURL(logoBlob);
    });

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>cotizacion de cliente: ${printData.clienteNombre}, cotizacion numero: ${printData.numero}</title>
<style>@page{size:letter portrait;margin:10mm 12mm;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0;padding:24px;}table{border-collapse:collapse;width:100%}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
</head><body>
<div style="text-align:center;margin-bottom:16px"><img src="${logoSrc}" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto"/><p style="font-weight:bold;font-size:14px;margin-top:4px;text-transform:uppercase;letter-spacing:1px">ESTUDIO DIGITAL VISONIXRO</p></div>
<div style="display:flex;justify-content:space-between;margin-bottom:20px">
<div style="max-width:48%"><p style="font-weight:bold;font-size:11px">CLIENTE</p><p>Nombre: ${printData.clienteNombre}</p>${printData.clienteRtn ? `<p>RTN: ${printData.clienteRtn}</p>` : ""}${printData.clienteDireccion ? `<p>Dir: ${printData.clienteDireccion}</p>` : ""}<p style="margin-top:6px">Fecha: ${new Date().toLocaleDateString("es-HN")}</p><p>No. Cotización: ${printData.numero}</p>${printData.fechaValidez ? `<p>Válida hasta: ${new Date(printData.fechaValidez + "T12:00:00").toLocaleDateString("es-HN")}</p>` : ""}</div>
<div style="text-align:right;max-width:48%"><p style="font-size:22px;font-weight:bold;color:#1a56db">COTIZACIÓN</p>${dfact?.nombre ? `<p style="font-weight:bold">${dfact.nombre}</p>` : ""}</div>
</div><hr/>
<table style="margin-top:14px"><thead><tr style="border-bottom:2px solid #000"><th style="text-align:left;padding-bottom:4px;width:38%">Descripción</th><th style="text-align:right;width:7%">Cant.</th><th style="text-align:right;width:14%">Precio Unit.</th><th style="text-align:right;width:10%">Desc.</th><th style="text-align:right;width:13%">Gravamen</th><th style="text-align:right;width:14%">Total</th></tr></thead><tbody>${filas}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-top:20px"><table style="width:300px"><tbody>${totRows}<tr style="border-top:2px solid #000;font-weight:bold;font-size:13px"><td style="padding:4px 8px">Total L</td><td style="text-align:right">L ${tots.total.toFixed(2)}</td></tr></tbody></table></div>
${printData.notas ? `<div style="margin-top:20px;font-size:11px"><p style="font-weight:bold">Notas:</p><p>${printData.notas}</p></div>` : ""}
${printData.condiciones ? `<div style="margin-top:8px;font-size:11px"><p style="font-weight:bold">Condiciones:</p><p>${printData.condiciones}</p></div>` : ""}
<div style="border-top:1px solid #ccc;padding-top:8px;margin-top:20px;font-size:10px;color:#555;text-align:center"><p>Esta cotización no constituye una factura fiscal.</p></div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, [printData, dfact]);

  // ── Emitir cotización
  async function emitirCotizacion() {
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
      // Obtener número usando la función SQL
      const { data: numData, error: numError } = await supabase.rpc(
        "siguiente_numero_cotizacion",
      );
      if (numError) throw numError;
      const numero = numData as string;

      const payload = {
        numero_cotizacion: numero,
        fecha_emision: new Date().toISOString().substring(0, 10),
        fecha_validez: fechaValidez || null,
        cliente_nombre: clienteNombre,
        cliente_rtn: clienteRtn || null,
        cliente_direccion: clienteDireccion || null,
        cliente_email: clienteEmail || null,
        cliente_telefono: clienteTelefono || null,
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
        notas: notas || null,
        condiciones: condiciones || null,
        estado: "borrador",
      };

      const { data: cotInserted, error: cotError } = await supabase
        .from("cotizaciones")
        .insert([payload])
        .select()
        .single();
      if (cotError) throw cotError;

      // Insertar detalles
      const detalles = lineas
        .filter((l) => l.descripcion.trim())
        .map((l, i) => {
          const { sub, isv, total } = calcularLinea(l);
          return {
            cotizacion_id: cotInserted.id,
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
          .from("detalle_cotizaciones")
          .insert(detalles);
        if (detError) throw detError;
      }

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({
        queryKey: ["cotizaciones_hist_clientes"],
      });

      toast({
        title: `Cotización ${numero} creada`,
        description: lempiras(totales.total),
      });

      const lineasSnapshot = [...lineas];
      setPrintData({
        numero,
        clienteNombre,
        clienteRtn,
        clienteDireccion,
        clienteEmail,
        clienteTelefono,
        fecha_emision: new Date().toISOString().substring(0, 10),
        fechaValidez,
        notas,
        condiciones,
        lineas: lineasSnapshot,
      });
      setShowPrint(true);

      // Limpiar formulario
      setClienteNombre("");
      setClienteRtn("");
      setClienteDireccion("");
      setClienteEmail("");
      setClienteTelefono("");
      setNotas("");
      setCondiciones("Precios en Lempiras. Impuestos incluidos donde aplique.");
      setLineas([]);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setFechaValidez(d.toISOString().substring(0, 10));
    } catch (err: any) {
      toast({
        title: "Error al crear cotización",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // ─── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Cotizar
          </h1>
          <p className="text-sm text-muted-foreground">
            Crear cotizaciones de productos y servicios
          </p>
        </div>
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
                {/* Nombre combobox */}
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm font-medium mb-1 block">
                    Nombre / Razón Social *
                  </label>
                  <Popover
                    open={openClienteCombo}
                    onOpenChange={setOpenClienteCombo}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClienteCombo}
                        className="w-full justify-between font-normal h-9 px-3 text-sm"
                      >
                        <span className="truncate text-left flex-1">
                          {clienteNombre || (
                            <span className="text-muted-foreground">
                              Buscar o escribir cliente…
                            </span>
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Nombre o RTN…"
                          value={clienteSearch}
                          onValueChange={setClienteSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {clienteSearch ? (
                              <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                                onClick={() => {
                                  setClienteNombre(clienteSearch);
                                  setOpenClienteCombo(false);
                                  setClienteSearch("");
                                }}
                              >
                                <Search className="inline mr-2 h-3 w-3" />
                                Usar &quot;{clienteSearch}&quot;
                              </button>
                            ) : (
                              <p className="px-3 py-2 text-sm text-muted-foreground">
                                Sin clientes.
                              </p>
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {clienteSearch && (
                              <CommandItem
                                key="__custom__"
                                value="__custom__"
                                onSelect={() => {
                                  setClienteNombre(clienteSearch);
                                  setOpenClienteCombo(false);
                                  setClienteSearch("");
                                }}
                              >
                                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground text-sm">
                                  Usar &quot;{clienteSearch}&quot;
                                </span>
                              </CommandItem>
                            )}
                            {clientesSugeridos
                              .filter((c) => {
                                if (!clienteSearch) return true;
                                const s = clienteSearch.toLowerCase();
                                return (
                                  c.nombre.toLowerCase().includes(s) ||
                                  c.rtn.toLowerCase().includes(s)
                                );
                              })
                              .map((c) => (
                                <CommandItem
                                  key={c.key}
                                  value={c.key}
                                  onSelect={() => seleccionarCliente(c)}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${clienteNombre === c.nombre ? "opacity-100" : "opacity-0"}`}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">
                                      {c.nombre}
                                    </span>
                                    {c.rtn && (
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {c.rtn}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {/* RTN */}
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
                {/* Dirección */}
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    Dirección
                  </label>
                  <Input
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    placeholder="Ciudad, dirección…"
                  />
                </div>
                {/* Email y teléfono */}
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Teléfono
                  </label>
                  <Input
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="+504 XXXX-XXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vigencia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vigencia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Válida hasta
                  </label>
                  <Input
                    type="date"
                    value={fechaValidez}
                    onChange={(e) => setFechaValidez(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-5">
                  {[15, 30, 60].map((dias) => (
                    <Button
                      key={dias}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + dias);
                        setFechaValidez(d.toISOString().substring(0, 10));
                      }}
                    >
                      {dias}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ítems */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base">Ítems / Servicios</CardTitle>
              <Button size="sm" onClick={abrirNuevaLinea}>
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {lineas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <FileText className="w-8 h-8 opacity-40" />
                  <p className="text-sm">
                    Sin ítems. Haga clic en &quot;Agregar&quot;.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right w-16">Cant.</TableHead>
                        <TableHead className="text-right w-24 hidden sm:table-cell">
                          P.U.
                        </TableHead>
                        <TableHead className="text-right w-24">Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineas.map((l) => {
                        const { total } = calcularLinea(l);
                        return (
                          <TableRow
                            key={l.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => abrirEditarLinea(l)}
                          >
                            <TableCell className="text-sm max-w-[200px]">
                              <p className="truncate font-medium">
                                {l.descripcion}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {LABEL_GRAVAMEN[l.tipoGravamen]}
                              </p>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {l.cantidad}
                            </TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell font-mono">
                              {lempiras(l.precioUnitario)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {lempiras(total)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeLinea(l.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas y condiciones */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notas y Condiciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Notas / Observaciones
                </label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Información adicional para el cliente…"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Condiciones
                </label>
                <Textarea
                  value={condiciones}
                  onChange={(e) => setCondiciones(e.target.value)}
                  placeholder="Condiciones de pago, entrega, etc."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Resumen derecho ── */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">
                    {lempiras(totales.subtotal)}
                  </span>
                </div>
                {totales.exentos > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exentos</span>
                    <span className="font-mono">
                      {lempiras(totales.exentos)}
                    </span>
                  </div>
                )}
                {totales.isv15 > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ISV 15%</span>
                    <span className="font-mono">{lempiras(totales.isv15)}</span>
                  </div>
                )}
                {totales.isv18 > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ISV 18%</span>
                    <span className="font-mono">{lempiras(totales.isv18)}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>TOTAL</span>
                <span className="font-mono">{lempiras(totales.total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {lineas.length} ítem{lineas.length !== 1 ? "s" : ""}
              </p>

              <Separator />

              <div className="pt-2 space-y-2">
                <Button
                  className="w-full"
                  onClick={emitirCotizacion}
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ClipboardList className="w-4 h-4 mr-2" />
                  )}
                  {saving ? "Guardando…" : "Emitir Cotización"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Modal de línea ── */}
      <Dialog open={showLineaModal} onOpenChange={setShowLineaModal}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lineaEditId ? "Editar ítem" : "Agregar ítem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Catálogo */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Seleccionar del catálogo
              </label>
              <Popover open={openDescCombo} onOpenChange={setOpenDescCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal h-9 px-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      Buscar producto/servicio…
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar…"
                      value={descSearch}
                      onValueChange={setDescSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        {(catalogo as any[])
                          .filter(
                            (p) =>
                              !descSearch ||
                              p.nombre
                                .toLowerCase()
                                .includes(descSearch.toLowerCase()),
                          )
                          .map((p: any) => (
                            <CommandItem
                              key={p.id}
                              value={p.id}
                              onSelect={() => {
                                setMlDescripcion(p.nombre);
                                setMlPrecio(String(p.precio_unitario ?? "0"));
                                setMlGravamen(p.tipo_gravamen ?? "gravado_15");
                                const cant = parseFloat(mlCantidad) || 1;
                                const desc = parseFloat(mlDescuento) || 0;
                                const precio = parseFloat(
                                  p.precio_unitario ?? "0",
                                );
                                const tasa =
                                  (p.tipo_gravamen ?? "gravado_15") ===
                                  "gravado_15"
                                    ? 0.15
                                    : p.tipo_gravamen === "gravado_18"
                                      ? 0.18
                                      : 0;
                                const sub = cant * precio - desc;
                                setMlTotal((sub + sub * tasa).toFixed(2));
                                setOpenDescCombo(false);
                                setDescSearch("");
                              }}
                            >
                              <div className="flex justify-between w-full">
                                <span className="text-sm">{p.nombre}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  L{" "}
                                  {parseFloat(p.precio_unitario ?? 0).toFixed(
                                    2,
                                  )}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Descripción *
              </label>
              <Textarea
                value={mlDescripcion}
                onChange={(e) => setMlDescripcion(e.target.value)}
                placeholder="Descripción del producto o servicio"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Cantidad
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={mlCantidad}
                  onChange={(e) => {
                    setMlCantidad(e.target.value);
                    const cant = parseFloat(e.target.value) || 1;
                    const precio = parseFloat(mlPrecio) || 0;
                    const desc = parseFloat(mlDescuento) || 0;
                    const tasa =
                      mlGravamen === "gravado_15"
                        ? 0.15
                        : mlGravamen === "gravado_18"
                          ? 0.18
                          : 0;
                    const sub = cant * precio - desc;
                    setMlTotal((sub + sub * tasa).toFixed(2));
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Precio Unitario
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mlPrecio}
                  onChange={(e) => {
                    setMlPrecio(e.target.value);
                    const precio = parseFloat(e.target.value) || 0;
                    const cant = parseFloat(mlCantidad) || 1;
                    const desc = parseFloat(mlDescuento) || 0;
                    const tasa =
                      mlGravamen === "gravado_15"
                        ? 0.15
                        : mlGravamen === "gravado_18"
                          ? 0.18
                          : 0;
                    const sub = cant * precio - desc;
                    setMlTotal((sub + sub * tasa).toFixed(2));
                  }}
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
                  onChange={(e) => {
                    setMlDescuento(e.target.value);
                    const desc = parseFloat(e.target.value) || 0;
                    const cant = parseFloat(mlCantidad) || 1;
                    const precio = parseFloat(mlPrecio) || 0;
                    const tasa =
                      mlGravamen === "gravado_15"
                        ? 0.15
                        : mlGravamen === "gravado_18"
                          ? 0.18
                          : 0;
                    const sub = cant * precio - desc;
                    setMlTotal((sub + sub * tasa).toFixed(2));
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Total Línea (calculado)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mlTotal}
                  onChange={(e) => handleMlTotalChange(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Gravamen</label>
              <Select
                value={mlGravamen}
                onValueChange={(v) => setMlGravamen(v as TipoGravamen)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LABEL_GRAVAMEN) as TipoGravamen[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {LABEL_GRAVAMEN[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLineaModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarLineaModal}
                disabled={!mlDescripcion.trim()}
              >
                {lineaEditId ? "Guardar cambios" : "Agregar ítem"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de impresión ── */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="w-[98vw] max-w-[880px] max-h-[90vh] overflow-y-auto p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" /> Cotización {printData?.numero}
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
          <div
            className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch" as any }}
          >
            <div
              style={{
                transformOrigin: "top left",
                transform: isMobile
                  ? `scale(${Math.min(1, (window.innerWidth - 24) / 816)})`
                  : "scale(1)",
                width: "816px",
              }}
            >
              <div ref={printRef}>
                {printData && (
                  <PrintCotizacion
                    cotizacion={printData}
                    dfact={dfact}
                    lineas={printData.lineas ?? []}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
