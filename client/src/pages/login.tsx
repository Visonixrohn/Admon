import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  onSuccess?: () => void;
};

export default function Login({ onSuccess }: Props) {
  const { toast } = useToast();
  const [clave, setClave] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("configuracion")
        .select("clave")
        .limit(1)
        .single();
      if (error) throw error;

      const stored = data?.clave ?? null;
      if (!stored) {
        toast({ title: "No hay clave configurada" });
        return;
      }

      if (clave === stored) {
        localStorage.setItem("admon-auth", "true");
        toast({ title: "Acceso concedido" });
        onSuccess?.();
      } else {
        toast({ title: "Clave incorrecta" });
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error comprobando clave:", err);
      toast({ title: "Error comprobando clave", description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-900 p-4">
      <div style={{ width: 420 }}>
        <Card className="bg-slate-800 text-white border-transparent">
          <CardContent>
            <div className="flex flex-col items-center">
              <img
                src="/vsr.png"
                alt="Visonixro"
                className="h-16 w-16 object-contain mb-3"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-center">Clave</label>
                <Input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="text-black placeholder:text-gray-400 bg-white"
                  style={{ color: '#000' }}
                />
              </div>

              <div className="flex justify-center">
                <Button onClick={onSubmit} disabled={loading} className="w-40">
                  {loading ? "Comprobando..." : "Entrar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
