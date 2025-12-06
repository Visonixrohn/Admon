import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClienteDetalle() {
  const [match, params] = useRoute("/clientes/:id");
  const id = params?.id as string | undefined;
  const [cliente, setCliente] = useState<any | null>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [suscripciones, setSuscripciones] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const [cRes, pagosRes, contratosRes, subsRes] = await Promise.all([
          supabase.from("clientes").select("*").eq("id", id).limit(1).single(),
          supabase
            .from("pagos")
            .select(
              "id,fecha_de_creacion,tipo,proyecto,monto,notas,referencia_id,created_at"
            )
            .eq("cliente", id)
            .order("fecha_de_creacion", { ascending: false }),
          supabase
            .from("contratos")
            .select(
              "id,monto_total,pago_inicial,cantidad_de_pagos,proximo_pago,proyecto,estado"
            )
            .eq("cliente", id),
          supabase
            .from("suscripciones")
            .select("id,mensualidad,proxima_fecha_de_pago,proyecto,is_active")
            .eq("cliente", id),
        ]);

        if (!cRes.error) setCliente(cRes.data);
        setPagos(Array.isArray(pagosRes.data) ? pagosRes.data : []);
        setContratos(Array.isArray(contratosRes.data) ? contratosRes.data : []);
        setSuscripciones(Array.isArray(subsRes.data) ? subsRes.data : []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error cargando detalle de cliente:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Derived calculations
  const pagosRealizados = pagos || [];

  // calcular saldo de contratos: monto_total - pago_inicial - pagos registrados (por contrato)
  const contratosWithRestante = contratos.map((ct: any) => {
    const paid = (pagosRealizados || [])
      .filter(
        (p: any) =>
          p.tipo === "contrato" && String(p.referencia_id) === String(ct.id)
      )
      .reduce((s: number, p: any) => s + Number(p.monto ?? 0), 0);
    const restante =
      Number(ct.monto_total ?? 0) - Number(ct.pago_inicial ?? 0) - paid;
    return { ...ct, pagos_registrados: paid, restante };
  });

  const totalContratoRestante = contratosWithRestante.reduce(
    (s: number, c: any) => s + Math.max(0, Number(c.restante ?? 0)),
    0
  );

  // suscripciones vencidas: proxima_fecha_de_pago < now && is_active
  const now = new Date();
  const susVencidas = (suscripciones || [])
    .filter((s: any) => {
      const next = s.proxima_fecha_de_pago
        ? new Date(s.proxima_fecha_de_pago)
        : null;
      return s.is_active && next && next < now;
    })
    .map((s: any) => ({
      ...s,
      monto_due: Number(s.mensualidad ?? 0),
      fecha: s.proxima_fecha_de_pago,
    }));

  const totalSusVencidas = susVencidas.reduce(
    (s: number, x: any) => s + Number(x.monto_due ?? 0),
    0
  );

  const totalSaldo = totalContratoRestante + totalSusVencidas;

  // pagos vencidos (list) — desde contratos (proximo_pago < now) y suscripciones (proxima_fecha_de_pago < now)
  const vencimientos: any[] = [];
  contratosWithRestante.forEach((c: any) => {
    if (c.proximo_pago) {
      const d = new Date(c.proximo_pago);
      if (d < now && c.estado === "activo") {
        const cuota =
          Number(c.cantidad_de_pagos ?? 1) > 0
            ? (Number(c.monto_total ?? 0) - Number(c.pago_inicial ?? 0)) /
              Number(c.cantidad_de_pagos ?? 1)
            : 0;
        vencimientos.push({
          tipo: "contrato",
          proyecto: c.proyecto,
          fecha: c.proximo_pago,
          monto: cuota,
          contratoId: c.id,
        });
      }
    }
  });
  susVencidas.forEach((s: any) => {
    vencimientos.push({
      tipo: "suscripcion",
      proyecto: s.proyecto,
      fecha: s.fecha,
      monto: s.monto_due,
      suscripcionId: s.id,
    });
  });

  if (!id) return <div className="p-6">ID de cliente no proporcionado.</div>;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Detalle de Cliente</h1>
      <div className="mt-6">
        {loading && <p>Cargando...</p>}
        {!loading && !cliente && <p>No se encontró el cliente.</p>}
        {cliente && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div>
                    <strong>Nombre:</strong> {cliente.nombre}
                  </div>
                  <div>
                    <strong>Teléfono:</strong> {cliente.telefono ?? "—"}
                  </div>
                  <div>
                    <strong>RTN:</strong> {cliente.rtn ?? "—"}
                  </div>
                  <div>
                    <strong>Oficio:</strong> {cliente.oficio ?? "—"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Saldo total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalSaldo)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Suma de contratos pendientes y suscripciones vencidas
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Saldo contratos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {formatCurrency(totalContratoRestante)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Total restante en contratos
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suscripciones vencidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {formatCurrency(totalSusVencidas)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Total mensualidades vencidas
                  </div>
                </CardContent>
              </Card>
              {/* Próximos pagos se coloca abajo en su propia fila para mostrarse amplia */}
            </div>

            {/* Card amplia de Próximos pagos */}
            <div className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Próximos pagos</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const upcoming: any[] = [];
                    contratosWithRestante.forEach((c: any) => {
                      if (c.proximo_pago) {
                        const d = new Date(c.proximo_pago);
                        if (
                          d >= new Date(new Date().setHours(0, 0, 0, 0)) &&
                          c.estado === "activo"
                        ) {
                          const cuota =
                            Number(c.cantidad_de_pagos ?? 1) > 0
                              ? (Number(c.monto_total ?? 0) -
                                  Number(c.pago_inicial ?? 0)) /
                                Number(c.cantidad_de_pagos ?? 1)
                              : 0;
                          upcoming.push({
                            tipo: "contrato",
                            proyecto: c.proyecto,
                            fecha: c.proximo_pago,
                            monto: cuota,
                            contratoId: c.id,
                          });
                        }
                      }
                    });
                    (suscripciones || []).forEach((s: any) => {
                      if (s.proxima_fecha_de_pago) {
                        const d = new Date(s.proxima_fecha_de_pago);
                        if (
                          d >= new Date(new Date().setHours(0, 0, 0, 0)) &&
                          s.is_active
                        ) {
                          upcoming.push({
                            tipo: "suscripcion",
                            proyecto: s.proyecto,
                            fecha: s.proxima_fecha_de_pago,
                            monto: Number(s.mensualidad ?? 0),
                            suscripcionId: s.id,
                          });
                        }
                      }
                    });
                    upcoming.sort(
                      (a, b) =>
                        new Date(a.fecha).getTime() -
                        new Date(b.fecha).getTime()
                    );
                    const next = upcoming.slice(0, 5);
                    if (next.length === 0)
                      return (
                        <div className="text-sm text-muted-foreground">
                          No hay próximos pagos
                        </div>
                      );
                    return (
                      <div className="space-y-2">
                        {next.map((n, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="text-sm">
                              <div className="font-medium">
                                {n.tipo === "contrato"
                                  ? "Contrato"
                                  : "Suscripción"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {n.proyecto ?? "-"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(Number(n.monto ?? 0))}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(n.fecha)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pagos realizados</CardTitle>
                </CardHeader>
                <CardContent>
                  {pagosRealizados.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No hay pagos registrados
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Notas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagosRealizados.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>
                                {formatDate(
                                  p.fecha_de_creacion ?? p.created_at
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.tipo}
                              </TableCell>
                              <TableCell className="text-sm">
                                {p.proyecto ?? "-"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(p.monto ?? 0))}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.notas ?? "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pagos vencidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {vencimientos.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No hay vencimientos
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vencimientos.map((v, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{formatDate(v.fecha)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {v.tipo}
                              </TableCell>
                              <TableCell className="text-sm">
                                {v.proyecto ?? "-"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(v.monto ?? 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
