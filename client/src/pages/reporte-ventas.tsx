import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3, RefreshCw, FileDown } from "lucide-react";

function lempiras(n: number) {
  return `L ${Number(n).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function agruparPorMes(facturas: any[]) {
  const mapa: Record<
    string,
    {
      mes: string;
      total: number;
      isv15: number;
      isv18: number;
      cantidad: number;
    }
  > = {};
  for (const f of facturas) {
    const mes = f.fecha_emision?.substring(0, 7) ?? "?";
    if (!mapa[mes])
      mapa[mes] = { mes, total: 0, isv15: 0, isv18: 0, cantidad: 0 };
    mapa[mes].total += parseFloat(f.total ?? "0");
    mapa[mes].isv15 += parseFloat(f.isv_15 ?? "0");
    mapa[mes].isv18 += parseFloat(f.isv_18 ?? "0");
    mapa[mes].cantidad += 1;
  }
  return Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes));
}

function fechaLocal(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReporteVentas() {
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return fechaLocal(d);
  });
  const [fechaHasta, setFechaHasta] = useState(() => fechaLocal());

  const {
    data: facturas = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["facturas_reporte", fechaDesde, fechaHasta],
    queryFn: async () => {
      let q = supabase
        .from("facturas")
        .select("*")
        .neq("estado", "anulada")
        .order("fecha_emision", { ascending: false });
      if (fechaDesde) q = q.gte("fecha_emision", fechaDesde);
      if (fechaHasta) q = q.lte("fecha_emision", fechaHasta);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const porMes = agruparPorMes(facturas);

  const totales = facturas.reduce(
    (acc: any, f: any) => {
      acc.total += parseFloat(f.total ?? "0");
      acc.subtotal += parseFloat(f.subtotal ?? "0");
      acc.isv15 += parseFloat(f.isv_15 ?? "0");
      acc.isv18 += parseFloat(f.isv_18 ?? "0");
      acc.exentos += parseFloat(f.valores_exentos ?? "0");
      acc.exonerados += parseFloat(f.valores_exonerados ?? "0");
      acc.tasaCero += parseFloat(f.valores_tasa_cero ?? "0");
      return acc;
    },
    {
      total: 0,
      subtotal: 0,
      isv15: 0,
      isv18: 0,
      exentos: 0,
      exonerados: 0,
      tasaCero: 0,
    },
  );

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Reporte de Ventas
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumen de facturación por período
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <Badge variant="secondary">{facturas.length} facturas</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Facturado",
            value: totales.total,
            color: "text-primary",
          },
          { label: "ISV 15%", value: totales.isv15, color: "text-orange-500" },
          { label: "ISV 18%", value: totales.isv18, color: "text-red-500" },
          {
            label: "Subtotal (sin ISV)",
            value: totales.subtotal,
            color: "text-muted-foreground",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-lg font-bold font-mono ${item.color}`}>
                {lempiras(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico por mes */}
      {porMes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => lempiras(v)} />
                <Legend />
                <Bar
                  dataKey="total"
                  name="Total"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="isv15"
                  name="ISV 15%"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="isv18"
                  name="ISV 18%"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resumen de gravámenes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Desglose por Tipo de Gravamen (SAR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              [
                "Monto Gravable ISV 15%",
                totales.subtotal -
                  totales.exentos -
                  totales.exonerados -
                  totales.tasaCero,
              ],
              ["ISV 15% recaudado", totales.isv15],
              ["ISV 18% recaudado", totales.isv18],
              ["Valores Exentos", totales.exentos],
              ["Valores Exonerados", totales.exonerados],
              ["Valores Tasa Cero", totales.tasaCero],
            ].map(([lbl, val]) => (
              <div key={lbl as string} className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{lbl as string}</p>
                <p className="font-mono font-semibold">
                  {lempiras(val as number)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Listado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle de Facturas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">ISV 15%</TableHead>
                <TableHead className="text-right">ISV 18%</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-10"
                  >
                    Sin facturas en el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                facturas.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm">
                      {f.numero_factura}
                    </TableCell>
                    <TableCell>{f.fecha_emision}</TableCell>
                    <TableCell>{f.cliente_nombre}</TableCell>
                    <TableCell className="text-right font-mono">
                      {lempiras(parseFloat(f.subtotal ?? "0"))}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {lempiras(parseFloat(f.isv_15 ?? "0"))}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {lempiras(parseFloat(f.isv_18 ?? "0"))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {lempiras(parseFloat(f.total ?? "0"))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          f.estado === "emitida"
                            ? "default"
                            : f.estado === "anulada"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {f.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
