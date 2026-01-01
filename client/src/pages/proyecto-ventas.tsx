import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import VentaForm from "@/components/proyecto-venta-form";
import { useToast } from "@/hooks/use-toast";
import ContratoButton from "@/components/contrato-button";

type VentaRow = {
  id: string;
  fecha?: string | null;
  cliente?: string | null;
  proyecto?: string | null;
  tipo_de_venta?: string | null; // suscripcion | venta_total
  pago_inicial?: number | null;
  cantidad_de_pagos?: number | null;
  total_a_pagar?: number | null;
  mensualidad?: number | null;
  contrato_url?: string | null;
};

export default function ProyectoVentas() {
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<VentaRow> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from<VentaRow>("venta")
      .select("*")
      .order("fecha", { ascending: false });

    if (e) {
      setError(e.message ?? "Error al cargar ventas");
      setVentas([]);
    } else if (Array.isArray(data)) {
      setVentas(data);
    } else {
      setVentas([]);
    }
    setLoading(false);
  }, []);

  async function loadMeta() {
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
      console.error("Error cargando meta proyectos/clientes:", err);
    }
  }

  useEffect(() => {
    load();
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const { toast } = useToast();

  const deleteVenta = async (id: string) => {
    if (!confirm("Eliminar venta?")) return;
    try {
      const { error } = await supabase.from("venta").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Venta eliminada" });
      await load();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error eliminando venta:", err);
      toast({
        title: "Error al eliminar venta",
        description: err?.message ?? String(err),
      });
    }
  };

  const fmt = (v?: number | null) =>
    v === null || v === undefined ? "—" : v.toLocaleString();

  return (
    <>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Ventas de Proyectos</h1>
            <p className="text-muted-foreground mt-1">
              Listado de ventas conectadas a la tabla <code>venta</code> en
              Supabase.
            </p>
          </div>
          <div>
            <Button onClick={openCreate}>Crear Venta</Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por proyecto o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div>
          {loading && <p>Cargando ventas...</p>}
          {error && <p className="text-destructive">{error}</p>}

          {!loading && ventas.length === 0 && !error && (
            <Card>
              <CardContent className="p-6">
                No hay ventas registradas.
              </CardContent>
            </Card>
          )}

          {!loading && ventas.length > 0 && (
            <div className="space-y-3">
              {ventas
                .filter((v) => {
                  if (!searchQuery) return true;
                  const search = searchQuery.toLowerCase();
                  const proyecto = (projectsMap[v.proyecto ?? ""] || v.proyecto || "").toLowerCase();
                  const cliente = (clientsMap[v.cliente ?? ""] || v.cliente || "").toLowerCase();
                  return proyecto.includes(search) || cliente.includes(search);
                })
                .map((v) => (
                <Card key={v.id} className="hover-elevate shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                        <div className="flex items-center gap-2 sm:col-span-5 sm:justify-end sm:order-last">
                          <ContratoButton
                            ventaId={v.id}
                            contratoUrl={v.contrato_url}
                            onContratoUpdated={load}
                            clienteId={v.cliente ?? undefined}
                            proyectoId={v.proyecto ?? undefined}
                            tableName="venta"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">
                            <Link href={`/clientes/proyecto/${v.proyecto}`} className="hover:underline">
                              {projectsMap[v.proyecto ?? ""] ??
                                v.proyecto ??
                                "Proyecto sin nombre"}
                            </Link>
                          </h3>
                          <div className="text-sm text-muted-foreground truncate">
                            <Link href={`/clientes/${v.cliente}`} className="hover:underline">
                              {clientsMap[v.cliente ?? ""] ?? v.cliente ?? "—"}
                            </Link>
                          </div>
                        </div>

                        <div className="text-sm">
                          <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                            Tipo
                          </div>
                          <Badge variant="secondary">{v.tipo_de_venta ?? "—"}</Badge>
                        </div>

                        <div className="text-sm">
                          <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                            Pago inicial
                          </div>
                          <div className="font-medium">{fmt(v.pago_inicial)}</div>
                        </div>

                        <div className="text-sm">
                          <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                            Total / Mensualidad
                          </div>
                          <div className="font-medium">
                            {fmt(v.total_a_pagar)} / {fmt(v.mensualidad)}
                          </div>
                        </div>

                        <div className="text-sm">
                          <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                            Cant. pagos
                          </div>
                          <div>{v.cantidad_de_pagos ?? "—"}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <VentaForm
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) setEditing(null);
          }}
          onCreated={async () => {
            await load();
            await loadMeta();
          }}
          initialData={editing}
        />
      </div>
    </>
  );
}
