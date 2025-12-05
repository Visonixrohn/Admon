import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import VentaForm from "@/components/proyecto-venta-form";
import { useToast } from "@/hooks/use-toast";

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
};

export default function ProyectoVentas() {
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<VentaRow> | null>(null);
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});

  async function load() {
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
  }

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
      <div className="p-6 lg:p-8">
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

        <div className="mt-6">
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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ventas.map((v) => (
                <Card key={v.id} className="hover-elevate shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          <Link href={`/clientes/proyecto/${v.proyecto}`}>
                            {projectsMap[v.proyecto ?? ""] ??
                              v.proyecto ??
                              "Proyecto sin nombre"}
                          </Link>
                        </h3>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <div>
                            <strong>Cliente:</strong>{" "}
                            <Link href={`/clientes/${v.cliente}`}>
                              {clientsMap[v.cliente ?? ""] ?? v.cliente ?? "—"}
                            </Link>
                          </div>
                          <div className="mt-1">
                            <strong>Tipo:</strong> {v.tipo_de_venta ?? "—"}
                          </div>
                          <div className="mt-1">
                            <strong>Fecha:</strong>{" "}
                            {v.fecha ? new Date(v.fecha).toLocaleString() : "—"}
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">
                          <div>
                            <strong>Pago inicial:</strong> {fmt(v.pago_inicial)}
                          </div>
                          <div>
                            <strong>Total a pagar:</strong>{" "}
                            {fmt(v.total_a_pagar)}
                          </div>
                          <div>
                            <strong>Mensualidad:</strong> {fmt(v.mensualidad)}
                          </div>
                          <div>
                            <strong>Cant. pagos:</strong>{" "}
                            {v.cantidad_de_pagos ?? "—"}
                          </div>
                        </div>
                      </div>

                      {/* Edición y eliminación deshabilitadas en las cards de venta */}
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
