import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CuentasPorPagarAjustesForm({
  cuentaId,
  onSaved,
}: {
  cuentaId?: string | null;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [proveedor, setProveedor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaVenc, setFechaVenc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!cuentaId) return;
      const { data, error } = await supabase
        .from("cuentas_por_pagar")
        .select("proveedor, descripcion, fecha_vencimiento")
        .eq("id", cuentaId)
        .single();
      if (error) return;
      setProveedor(data.proveedor || "");
      setDescripcion(data.descripcion || "");
      setFechaVenc(data.fecha_vencimiento || "");
    }
    load();
  }, [cuentaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cuentaId) return;
    setLoading(true);
    const payload: any = {
      proveedor: proveedor || null,
      descripcion: descripcion || null,
      fecha_vencimiento: fechaVenc || null,
    };
    try {
      const { error } = await supabase
        .from("cuentas_por_pagar")
        .update(payload)
        .eq("id", cuentaId);
      setLoading(false);
      if (error) throw error;
      toast({
        title: "Cuenta actualizada",
        description: "Datos actualizados correctamente.",
      });
      onSaved?.();
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar la cuenta",
        variant: "destructive",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Proveedor</Label>
        <Input
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          placeholder="Nombre del proveedor"
        />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Detalle"
        />
      </div>
      <div>
        <Label>Fecha de Vencimiento</Label>
        <Input
          type="date"
          value={fechaVenc}
          onChange={(e) => setFechaVenc(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
