import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function ProyectoDetalle() {
  const [match, params] = useRoute("/clientes/proyecto/:id");
  const id = params?.id as string | undefined;
  const [proyecto, setProyecto] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("proyectos")
        .select("*")
        .eq("id", id)
        .limit(1)
        .single();
      if (!error) setProyecto(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (!id) return <div className="p-6">ID de proyecto no proporcionado.</div>;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Detalle de Proyecto</h1>
      <div className="mt-6">
        {loading && <p>Cargando...</p>}
        {!loading && !proyecto && <p>No se encontró el proyecto.</p>}
        {proyecto && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div>
                  <strong>Nombre:</strong> {proyecto.nombre}
                </div>
                <div>
                  <strong>Tipo:</strong> {proyecto.tipo ?? "—"}
                </div>
                <div>
                  <strong>Correo admin:</strong>{" "}
                  {proyecto.correo_administracion ?? "—"}
                </div>
                <div>
                  <strong>Creación:</strong>{" "}
                  {proyecto.creacion
                    ? new Date(proyecto.creacion).toLocaleString()
                    : "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
