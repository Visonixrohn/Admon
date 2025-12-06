import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default function ProyectoDetalle() {
  const [match, params] = useRoute("/clientes/proyecto/:id");
  const id = params?.id as string | undefined;
  const [proyecto, setProyecto] = useState<any | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("proyectos")
          .select("*")
          .eq("id", id)
          .limit(1)
          .single();
        if (!error) setProyecto(data);

        // fetch contratos and suscripciones that reference this proyecto
        const [cRes, sRes] = await Promise.all([
          supabase.from("contratos").select("cliente,id").eq("proyecto", id),
          supabase
            .from("suscripciones")
            .select("cliente,id")
            .eq("proyecto", id),
        ]);

        const contratos = Array.isArray(cRes.data) ? cRes.data : [];
        const suscripciones = Array.isArray(sRes.data) ? sRes.data : [];

        // collect unique client ids and mark acquisition types
        const clientMap: Record<
          string,
          { id: string; nombre?: string; tipos: Set<string> }
        > = {};
        contratos.forEach((c: any) => {
          if (!c?.cliente) return;
          const key = String(c.cliente);
          clientMap[key] = clientMap[key] ?? { id: key, tipos: new Set() };
          clientMap[key].tipos.add("contrato");
        });
        suscripciones.forEach((s: any) => {
          if (!s?.cliente) return;
          const key = String(s.cliente);
          clientMap[key] = clientMap[key] ?? { id: key, tipos: new Set() };
          clientMap[key].tipos.add("suscripcion");
        });

        const clientIds = Object.keys(clientMap);
        if (clientIds.length > 0) {
          const { data: clientsData } = await supabase
            .from("clientes")
            .select("id,nombre,telefono,rtn")
            .in("id", clientIds);
          const clientsArr = Array.isArray(clientsData) ? clientsData : [];
          clientsArr.forEach((cl: any) => {
            if (clientMap[cl.id]) clientMap[cl.id].nombre = cl.nombre;
          });
        }

        const clientsList = Object.values(clientMap).map((v) => ({
          id: v.id,
          nombre: v.nombre ?? v.id,
          tipos: Array.from(v.tipos),
        }));
        setClientes(clientsList);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error cargando proyecto detalle:", err);
      }
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
        {clientes && clientes.length > 0 && (
          <div className="mt-6">
            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold mb-3">
                  Clientes que adquirieron este proyecto
                </h2>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Acquisición</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map((cl) => (
                        <TableRow
                          key={cl.id}
                          className="cursor-pointer"
                          onClick={() => setLocation(`/clientes/${cl.id}`)}
                        >
                          <TableCell>{cl.nombre}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(cl.tipos || []).join(", ")}
                          </TableCell>
                          <TableCell className="text-sm text-primary">
                            Ver detalle
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
