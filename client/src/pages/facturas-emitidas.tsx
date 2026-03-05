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
  ReceiptText,
  Search,
  RefreshCw,
  Printer,
  Ban,
  MoreHorizontal,
  X,
} from "lucide-react";
import {
  PrintFactura,
  imprimirEnMovil,
  lempiras,
  type LineaItem,
  type TipoGravamen,
} from "@/lib/factura-print";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mapDetalleToLinea(d: any): LineaItem {
  return {
    id: d.id,
    descripcion: d.descripcion,
    cantidad: parseFloat(d.cantidad),
    precioUnitario: parseFloat(d.precio_unitario),
    descuento: parseFloat(d.descuento),
    tipoGravamen: d.tipo_gravamen as TipoGravamen,
  };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function FacturasEmitidas() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);

  // ── Búsqueda
  const [search, setSearch] = useState("");

  // ── Factura seleccionada para acciones
  const [selected, setSelected] = useState<any | null>(null);
  const [showAcciones, setShowAcciones] = useState(false);

  // ── Modal reimprimir
  const [showPrint, setShowPrint] = useState(false);
  const [printLineas, setPrintLineas] = useState<LineaItem[]>([]);

  // ── Confirmar anulación
  const [showAnular, setShowAnular] = useState(false);
  const [anulando, setAnulando] = useState(false);

  // ── Carga de datos
  const {
    data: facturas = [],
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["facturas_emitidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facturas")
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

  // ─── Filtrado
  const q = search.toLowerCase().trim();
  const filtradas = q
    ? facturas.filter(
        (f: any) =>
          f.numero_factura?.toLowerCase().includes(q) ||
          f.cliente_nombre?.toLowerCase().includes(q) ||
          f.cliente_rtn?.toLowerCase().includes(q),
      )
    : facturas;

  // ─── Reimprimir: cargar líneas y abrir modal
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { size: letter portrait; margin: 10mm 12mm 10mm 12mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  });

  async function abrirReimprimir(factura: any) {
    const { data, error } = await supabase
      .from("detalle_facturas")
      .select("*")
      .eq("factura_id", factura.id)
      .order("linea");
    if (error) {
      toast({
        title: "Error cargando detalle",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setPrintLineas((data ?? []).map(mapDetalleToLinea));
    setShowAcciones(false);
    setShowPrint(true);
  }

  async function handleMobilePrint() {
    if (!selected || !dfact) return;
    await imprimirEnMovil(selected, dfact, printLineas);
  }

  // ─── Anular
  async function confirmarAnular() {
    if (!selected) return;
    setAnulando(true);
    try {
      const { error } = await supabase
        .from("facturas")
        .update({ estado: "anulada", updated_at: new Date().toISOString() })
        .eq("id", selected.id);
      if (error) throw error;
      toast({ title: `Factura ${selected.numero_factura} anulada` });
      queryClient.invalidateQueries({ queryKey: ["facturas_emitidas"] });
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      setShowAnular(false);
      setShowAcciones(false);
      setSelected(null);
    } catch (err: any) {
      toast({
        title: "Error al anular",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setAnulando(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ReceiptText className="w-6 h-6" /> Facturas Emitidas
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta, reimprimi o anula facturas emitidas
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

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por No. factura, cliente o RTN…"
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

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtradas.length} factura{filtradas.length !== 1 ? "s" : ""}
            {q ? ` para "${search}"` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Factura</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">RTN</TableHead>
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
                    {q
                      ? "Sin resultados para esa búsqueda"
                      : "Aún no hay facturas emitidas"}
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">
                      {f.numero_factura}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {f.fecha_emision}
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate">
                      {f.cliente_nombre}
                    </TableCell>
                    <TableCell className="font-mono text-xs hidden md:table-cell">
                      {f.cliente_rtn ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {lempiras(parseFloat(f.total))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          f.estado === "anulada"
                            ? "destructive"
                            : f.estado === "pagada"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {f.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelected(f);
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
              {selected?.numero_factura}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            {selected?.cliente_nombre}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full justify-start gap-2"
              onClick={() => abrirReimprimir(selected)}
            >
              <Printer className="w-4 h-4" /> Reimprimir
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              disabled={selected?.estado === "anulada"}
              onClick={() => {
                setShowAcciones(false);
                setShowAnular(true);
              }}
            >
              <Ban className="w-4 h-4" />
              {selected?.estado === "anulada" ? "Ya anulada" : "Anular factura"}
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
              {selected?.numero_factura}
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
          {/* Vista previa escalable */}
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
                {selected && dfact && (
                  <PrintFactura
                    factura={selected}
                    dfact={dfact}
                    lineas={printLineas}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar anulación ── */}
      <AlertDialog open={showAnular} onOpenChange={setShowAnular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará como <strong>anulada</strong> la factura{" "}
              <span className="font-mono">{selected?.numero_factura}</span> de{" "}
              <strong>{selected?.cliente_nombre}</strong>. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAnular}
              disabled={anulando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {anulando ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
