import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Printer,
  Ban,
  MoreHorizontal,
  X,
  CheckCircle2,
  XCircle,
  SendHorizonal,
  Clock,
} from "lucide-react";
import {
  lempiras,
  calcularLinea,
  type LineaItem,
  type TipoGravamen,
} from "@/lib/factura-print";
import { PrintCotizacion } from "@/pages/cotizar";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapDetalleToCotLinea(d: any): LineaItem {
  return {
    id: d.id,
    descripcion: d.descripcion,
    cantidad: parseFloat(d.cantidad),
    precioUnitario: parseFloat(d.precio_unitario),
    descuento: parseFloat(d.descuento),
    tipoGravamen: d.tipo_gravamen as TipoGravamen,
  };
}

const ESTADO_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  borrador: "outline",
  enviada: "default",
  aceptada: "secondary",
  rechazada: "destructive",
  vencida: "outline",
  cancelada: "destructive",
};

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

// ─── Página ───────────────────────────────────────────────────────────────────
export default function CotizacionesEmitidas() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [selected, setSelected] = useState<any | null>(null);
  const [showAcciones, setShowAcciones] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printLineas, setPrintLineas] = useState<LineaItem[]>([]);
  const [showCambiarEstado, setShowCambiarEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [cambiando, setCambiando] = useState(false);

  // ── Datos
  const {
    data: cotizaciones = [],
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dfact } = useQuery({
    queryKey: ["datos_facturacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datos_facturacion")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data ?? null;
    },
  });

  // ── Filtrado
  const q = search.toLowerCase().trim();
  const filtradas = cotizaciones.filter((c: any) => {
    const matchSearch =
      !q ||
      c.numero_cotizacion?.toLowerCase().includes(q) ||
      c.cliente_nombre?.toLowerCase().includes(q) ||
      c.cliente_rtn?.toLowerCase().includes(q);
    const matchEstado = filtroEstado === "todos" || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  // ── Imprimir desktop
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selected
      ? `cotizacion de cliente: ${selected.cliente_nombre}, cotizacion numero: ${selected.numero_cotizacion}`
      : "Cotizacion",
    pageStyle: `@page { size: letter portrait; margin: 10mm 12mm 10mm 12mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`,
  });

  async function abrirReimprimir(cotizacion: any) {
    const { data, error } = await supabase
      .from("detalle_cotizaciones")
      .select("*")
      .eq("cotizacion_id", cotizacion.id)
      .order("linea");
    if (error) {
      toast({
        title: "Error cargando detalle",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setPrintLineas((data ?? []).map(mapDetalleToCotLinea));
    setShowAcciones(false);
    setShowPrint(true);
  }

  // ── Imprimir móvil
  async function handleMobilePrint() {
    if (!selected || !printLineas.length) return;

    const filas = printLineas
      .map((l) => {
        const { sub } = calcularLinea(l);
        return `<tr style="border-bottom:1px solid #ddd">
        <td style="padding:4px 0;font-size:11px;word-break:break-word">${l.descripcion}</td>
        <td style="text-align:right;font-size:11px">${l.cantidad}</td>
        <td style="text-align:right;font-size:11px">${l.precioUnitario.toFixed(2)}</td>
        <td style="text-align:right;font-size:11px">${sub.toFixed(2)}</td>
      </tr>`;
      })
      .join("");

    const logoRes = await fetch("/vsr.png");
    const logoBlob = await logoRes.blob();
    const logoSrc = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result as string);
      r.readAsDataURL(logoBlob);
    });

    const total = parseFloat(selected.total ?? "0");

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>cotizacion de cliente: ${selected.cliente_nombre}, cotizacion numero: ${selected.numero_cotizacion}</title>
<style>@page{size:letter portrait;margin:10mm 12mm;}body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:20px;}table{border-collapse:collapse;width:100%}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
</head><body>
<div style="text-align:center;margin-bottom:16px"><img src="${logoSrc}" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto"/><p style="font-weight:bold;font-size:14px;margin-top:4px;text-transform:uppercase">ESTUDIO DIGITAL VISONIXRO</p></div>
<div style="display:flex;justify-content:space-between;margin-bottom:16px">
<div><p><strong>Cliente:</strong> ${selected.cliente_nombre}</p>${selected.cliente_rtn ? `<p><strong>RTN:</strong> ${selected.cliente_rtn}</p>` : ""}
<p><strong>No.:</strong> ${selected.numero_cotizacion}</p>
<p><strong>Fecha:</strong> ${selected.fecha_emision}</p>${selected.fecha_validez ? `<p><strong>Válida hasta:</strong> ${selected.fecha_validez}</p>` : ""}</div>
<div style="text-align:right"><p style="font-size:22px;font-weight:bold;color:#1a56db">COTIZACIÓN</p></div>
</div><hr/>
<table style="margin-top:12px"><thead><tr style="border-bottom:2px solid #000"><th style="text-align:left;padding-bottom:4px">Descripción</th><th style="text-align:right;width:7%">Cant.</th><th style="text-align:right;width:14%">P.U.</th><th style="text-align:right;width:14%">Total</th></tr></thead><tbody>${filas}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-top:16px"><div style="border-top:2px solid #000;padding-top:8px;font-weight:bold;font-size:14px">Total: L ${total.toFixed(2)}</div></div>
${selected.notas ? `<div style="margin-top:16px;font-size:11px"><p style="font-weight:bold">Notas:</p><p>${selected.notas}</p></div>` : ""}
${selected.condiciones ? `<div style="margin-top:8px;font-size:11px"><p style="font-weight:bold">Condiciones:</p><p>${selected.condiciones}</p></div>` : ""}
<div style="border-top:1px solid #ccc;padding-top:8px;margin-top:20px;font-size:10px;color:#555;text-align:center"><p>Esta cotización no constituye una factura fiscal.</p></div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  // ── Cambiar estado
  async function confirmarCambioEstado() {
    if (!selected || !nuevoEstado) return;
    setCambiando(true);
    try {
      const { error } = await supabase
        .from("cotizaciones")
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq("id", selected.id);
      if (error) throw error;
      toast({
        title: `Cotización actualizada a "${ESTADO_LABELS[nuevoEstado]}"`,
      });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      setShowCambiarEstado(false);
      setShowAcciones(false);
      setSelected(null);
    } catch (err: any) {
      toast({
        title: "Error al actualizar estado",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCambiando(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Cotizaciones Emitidas
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta, reimprimi o cambia el estado de cotizaciones
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por No., cliente o RTN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtradas.length} cotización{filtradas.length !== 1 ? "es" : ""}
            {q ? ` para "${search}"` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Cotización</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">
                  Válida hasta
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-10"
                  >
                    {q || filtroEstado !== "todos"
                      ? "Sin resultados para esa búsqueda"
                      : "No hay cotizaciones aún. Ve a Cotizar para crear una."}
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.numero_cotizacion}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {c.fecha_emision}
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate">
                      {c.cliente_nombre}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono">
                      {c.fecha_validez ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {lempiras(parseFloat(c.total))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_BADGE[c.estado] ?? "outline"}>
                        {ESTADO_LABELS[c.estado] ?? c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelected(c);
                          setShowAcciones(true);
                        }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Modal de acciones ── */}
      <Dialog open={showAcciones} onOpenChange={setShowAcciones}>
        <DialogContent className="w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {selected?.numero_cotizacion}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-1">
            {selected?.cliente_nombre}
          </p>
          <p className="text-sm font-semibold mb-3">
            {lempiras(parseFloat(selected?.total ?? "0"))}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full justify-start gap-2"
              onClick={() => abrirReimprimir(selected)}
            >
              <Printer className="w-4 h-4" /> Reimprimir
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                setNuevoEstado(selected?.estado ?? "enviada");
                setShowAcciones(false);
                setShowCambiarEstado(true);
              }}
            >
              <SendHorizonal className="w-4 h-4" /> Cambiar estado
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              disabled={selected?.estado === "cancelada"}
              onClick={() => {
                setNuevoEstado("cancelada");
                setShowAcciones(false);
                setShowCambiarEstado(true);
              }}
            >
              <Ban className="w-4 h-4" />
              {selected?.estado === "cancelada"
                ? "Ya cancelada"
                : "Cancelar cotización"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal reimprimir ── */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="w-[98vw] max-w-[880px] max-h-[90vh] overflow-y-auto p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" /> Reimprimir —{" "}
              {selected?.numero_cotizacion}
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
                {selected && (
                  <PrintCotizacion
                    cotizacion={selected}
                    dfact={dfact}
                    lineas={printLineas}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal cambiar estado ── */}
      <AlertDialog open={showCambiarEstado} onOpenChange={setShowCambiarEstado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar estado</AlertDialogTitle>
            <AlertDialogDescription>
              Cotización{" "}
              <span className="font-mono font-semibold">
                {selected?.numero_cotizacion}
              </span>{" "}
              — {selected?.cliente_nombre}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {k === "enviada" && (
                      <SendHorizonal className="inline w-3 h-3 mr-1" />
                    )}
                    {k === "aceptada" && (
                      <CheckCircle2 className="inline w-3 h-3 mr-1 text-green-500" />
                    )}
                    {k === "rechazada" && (
                      <XCircle className="inline w-3 h-3 mr-1 text-red-500" />
                    )}
                    {k === "vencida" && (
                      <Clock className="inline w-3 h-3 mr-1" />
                    )}
                    {k === "cancelada" && (
                      <Ban className="inline w-3 h-3 mr-1 text-destructive" />
                    )}
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarCambioEstado}
              disabled={cambiando}
              className={
                nuevoEstado === "cancelada"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {cambiando ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
