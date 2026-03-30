import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

export default function CuentasPorPagarPagoForm({
  cuentaId,
  onCreated,
  isCargo = false,
}: {
  cuentaId?: string;
  onCreated?: () => void;
  isCargo?: boolean;
}) {
  const { toast } = useToast();
  const [cuenta, setCuenta] = useState(cuentaId || "");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [metodo, setMetodo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: cuentas, isLoading: cuentasLoading } = useQuery({
    queryKey: ["cuentas_por_pagar", "select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cuentas_por_pagar_with_saldo")
        .select("id,proveedor,descripcion,monto,saldo,fecha_vencimiento")
        .order("fecha_vencimiento", { ascending: true })
        .limit(500);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const rawAmount = Number(monto || 0);
    const signedAmount = isCargo ? -Math.abs(rawAmount) : rawAmount;
    const payload = {
      cuenta_id: cuenta || null,
      monto: signedAmount,
      fecha: fecha || null,
      metodo_pago: metodo || null,
      referencia: referencia || null,
    };
    const { data, error } = await supabase
      .from("cuentas_por_pagar_pagos")
      .insert([payload]);
    setLoading(false);
    if (error) {
      toast({
        title: isCargo ? "Error registrando cargo" : "Error registrando pago",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: isCargo ? "Cargo registrado" : "Pago registrado",
      description: isCargo
        ? "Cargo registrado correctamente."
        : "Pago registrado correctamente.",
    });
    setMonto("");
    setFecha("");
    setMetodo("");
    setReferencia("");
    onCreated?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!cuentaId && (
        <div>
          <Label>Cuenta</Label>
          {cuentasLoading ? (
            <div className="text-sm text-muted-foreground">
              Cargando cuentas...
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCuenta("");
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Escribe para buscar cuenta..."
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input type="hidden" value={cuenta} />
              {showDropdown && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover p-1 shadow-md">
                  {(cuentas || [])
                    .filter((c: any) => {
                      const term = searchTerm.trim().toLowerCase();
                      if (!term) return true;
                      const prov = String(c.proveedor ?? "").toLowerCase();
                      const desc = String(c.descripcion ?? "").toLowerCase();
                      return (
                        prov.includes(term) ||
                        desc.includes(term) ||
                        (c.id && String(c.id).includes(term))
                      );
                    })
                    .slice(0, 50)
                    .map((c: any) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setCuenta(String(c.id));
                          setSearchTerm(
                            `${c.proveedor ?? "Proveedor"} — ${c.descripcion ?? ""} — Saldo: ${formatCurrency(Number(c.saldo ?? c.monto ?? 0))}`,
                          );
                          setShowDropdown(false);
                        }}
                        className="w-full text-left rounded px-2 py-1 text-sm hover:bg-muted/50"
                      >
                        <div className="font-medium">
                          {c.proveedor ?? "Proveedor"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.descripcion ?? ""} —{" "}
                          {formatCurrency(Number(c.saldo ?? c.monto ?? 0))}
                        </div>
                      </button>
                    ))}
                  {(cuentas || []).filter((c: any) => {
                    const term = searchTerm.trim().toLowerCase();
                    return (
                      term &&
                      (String(c.proveedor ?? "")
                        .toLowerCase()
                        .includes(term) ||
                        String(c.descripcion ?? "")
                          .toLowerCase()
                          .includes(term) ||
                        (c.id && String(c.id).includes(term)))
                    );
                  }).length === 0 && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      No se encontraron cuentas
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div>
        <Label>Monto</Label>
        <Input
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div>
        <Label>Fecha</Label>
        <Input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>
      <div>
        <Label>Método</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={metodo === "efectivo" ? "default" : "ghost"}
            onClick={() => setMetodo("efectivo")}
            className={metodo === "efectivo" ? "" : ""}
          >
            Efectivo
          </Button>
          <Button
            type="button"
            variant={metodo === "tarjeta" ? "default" : "ghost"}
            onClick={() => setMetodo("tarjeta")}
          >
            Tarjeta
          </Button>
          <Button
            type="button"
            variant={metodo === "transferencia" ? "default" : "ghost"}
            onClick={() => setMetodo("transferencia")}
          >
            Transferencia
          </Button>
        </div>
      </div>
      <div>
        <Label>Referencia</Label>
        <Input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          placeholder="Ref. banco"
        />
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Guardando..."
            : isCargo
              ? "Registrar cargo"
              : "Registrar pago"}
        </Button>
      </div>
    </form>
  );
}
