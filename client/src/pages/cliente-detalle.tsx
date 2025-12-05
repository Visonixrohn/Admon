import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function ClienteDetalle() {
  const [match, params] = useRoute("/clientes/:id");
  const id = params?.id as string | undefined;
  const [cliente, setCliente] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .limit(1)
        .single();
      if (!error) setCliente(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (!id) return <div className="p-6">ID de cliente no proporcionado.</div>;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Detalle de Cliente</h1>
      <div className="mt-6">
        {loading && <p>Cargando...</p>}
        {!loading && !cliente && <p>No se encontró el cliente.</p>}
        {cliente && (
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
        )}
      </div>
    </div>
  );
}
