import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CuentasPorPagarForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const { toast } = useToast();
  const [proveedor, setProveedor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaVenc, setFechaVenc] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      proveedor: proveedor || null,
      descripcion: descripcion || null,
      monto: Number(monto || 0),
      fecha_vencimiento: fechaVenc || null,
    };
    const { data, error } = await supabase
      .from("cuentas_por_pagar")
      .insert([payload]);
    setLoading(false);
    if (error) {
      toast({
        title: "Error creando cuenta por pagar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Cuenta creada",
      description: "Cuenta por pagar creada correctamente.",
    });
    setProveedor("");
    setDescripcion("");
    setMonto("");
    setFechaVenc("");
    onCreated?.();
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
        <Label>Monto</Label>
        <Input
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0.00"
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
          {loading ? "Guardando..." : "Crear cuenta por pagar"}
        </Button>
      </div>
    </form>
  );
}
