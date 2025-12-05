import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ContratosActivos() {
  function ContractCard({ contract }: { contract: any }) {
    const daysAgo = contract.fecha_de_creacion
      ? Math.floor(
          (Date.now() - new Date(contract.fecha_de_creacion).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;
    return (
      <Card
        className={`hover-elevate ${
          !contract.estado || contract.estado !== "activo" ? "opacity-70" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(
                    String(contract.clienteName ?? contract.cliente)
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{contract.clienteName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {contract.projectName}
                </p>
              </div>
            </div>
            <Badge
              className={
                contract.estado === "activo"
                  ? "bg-green-500/10 text-green-600"
                  : "bg-muted text-muted-foreground"
              }
            >
              {contract.estado}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monto total</span>
              <span className="font-semibold">
                {formatCurrency(contract.monto_total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pagos registrados</span>
              <span>{formatCurrency(contract.pagos_registrados)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor restante</span>
              <span className="font-semibold text-primary">
                {formatCurrency(contract.valor_restante)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span className="text-sm">
                {contract.fecha_de_creacion
                  ? formatDate(contract.fecha_de_creacion)
                  : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<
    "all" | "activo" | "cancelado"
  >("all");

  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          supabase.from("proyectos").select("id,nombre"),
          supabase.from("clientes").select("id,nombre"),
        ]);
        const pData = Array.isArray(pRes.data) ? pRes.data : [];
        const cData = Array.isArray(cRes.data) ? cRes.data : [];
        const pMap: Record<string, string> = {};
        const cMap: Record<string, string> = {};
        pData.forEach((p: any) => {
          if (p?.id) pMap[p.id] = p.nombre ?? p.id;
        });
        cData.forEach((c: any) => {
          if (c?.id) cMap[c.id] = c.nombre ?? c.id;
        });
        setProjectsMap(pMap);
        setClientsMap(cMap);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error cargando meta:", err);
      }
    })();
  }, []);

  const { data: subs, isLoading } = useQuery({
    queryKey: ["contratos-activos"],
    queryFn: async () => {
      const { data: contratosData, error: cErr } = await supabase
        .from("contratos")
        .select("*")
        .order("fecha_de_creacion", { ascending: false });
      if (cErr) throw cErr;
      const contratos = Array.isArray(contratosData) ? contratosData : [];

      // Si no hay contratos, devolver vacío
      if (contratos.length === 0) return [];

      // Obtener todos los pagos de tipo 'contrato' que referencien a estos contratos
      const ids = contratos.map((r: any) => r.id).filter(Boolean);
      const { data: pagosData, error: pErr } = await supabase
        .from("pagos")
        .select("referencia_id,monto,cliente,proyecto")
        .in("referencia_id", ids)
        .eq("tipo", "contrato");
      if (pErr) {
        // si falla la carga de pagos, no rompemos la vista; devolvemos contratos sin totales
        // eslint-disable-next-line no-console
        console.error("Error cargando pagos para contratos:", pErr);
        return contratos;
      }

      const pagos = Array.isArray(pagosData) ? pagosData : [];

      // Construir un mapa de sumas por referencia_id, filtrando por cliente+proyecto para precisión
      const pagosMap: Record<string, number> = {};
      pagos.forEach((p: any) => {
        if (!p || !p.referencia_id) return;
        const key = String(p.referencia_id);
        pagosMap[key] = (pagosMap[key] ?? 0) + Number(p.monto ?? 0);
      });

      // Adjuntar suma de pagos y restante a cada contrato
      const enriched = contratos.map((r: any) => {
        const paid = pagosMap[String(r.id)] ?? 0;
        const restante =
          Number(r.monto_total ?? 0) - Number(r.pago_inicial ?? 0) - paid;
        return { ...r, pagos_registrados: paid, valor_restante: restante };
      });

      return enriched;
    },
  });

  const list = (Array.isArray(subs) ? subs : []).map((r: any) => ({
    id: r.id,
    cliente: r.cliente,
    proyecto: r.proyecto,
    monto_total: Number(r.monto_total ?? 0),
    cantidad_de_pagos: Number(r.cantidad_de_pagos ?? 1),
    pago_inicial: Number(r.pago_inicial ?? 0),
    estado: r.estado ?? "activo",
    fecha_de_creacion: r.fecha_de_creacion ?? r.created_at ?? null,
    pagos_registrados: Number(r.pagos_registrados ?? 0),
    valor_restante: Number(
      r.valor_restante ??
        Number(r.monto_total ?? 0) - Number(r.pago_inicial ?? 0)
    ),
    clienteName: clientsMap[r.cliente] ?? r.cliente,
    projectName: projectsMap[r.proyecto] ?? r.proyecto,
  }));

  const filtered = list.filter((c) => {
    const matchesSearch = (
      String(c.clienteName ?? "") +
      " " +
      String(c.projectName ?? "")
    )
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    let matchesEstado = true;
    if (filterEstado === "activo") matchesEstado = c.estado === "activo";
    if (filterEstado === "cancelado") matchesEstado = c.estado === "cancelado";
    return matchesSearch && matchesEstado;
  });

  const stats = {
    total: list.length,
    activos: list.filter((l) => l.estado === "activo").length,
    cancelados: list.filter((l) => l.estado === "cancelado").length,
    total_restante: list.reduce((s, r) => s + Number(r.valor_restante ?? 0), 0),
  };

  return (
    <div className="p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Contratos Activos</h1>
        <p className="text-muted-foreground mt-1">
          Listado de suscripciones activas (contratos)
        </p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Card>
            <CardContent> Cargando... </CardContent>
          </Card>
        ) : list.length === 0 ? (
          <Card>
            <CardContent>No hay contratos activos</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold">{stats.activos}</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Cancelados</p>
                  <p className="text-2xl font-bold">{stats.cancelados}</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Total restante
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.total_restante)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o proyecto..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterEstado === "all" ? "secondary" : "ghost"}
                  onClick={() => setFilterEstado("all")}
                >
                  Todas
                </Button>
                <Button
                  variant={filterEstado === "activo" ? "secondary" : "ghost"}
                  onClick={() => setFilterEstado("activo")}
                >
                  Activas
                </Button>
                <Button
                  variant={filterEstado === "cancelado" ? "secondary" : "ghost"}
                  onClick={() => setFilterEstado("cancelado")}
                >
                  Canceladas
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c) => (
                <ContractCard key={c.id} contract={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
