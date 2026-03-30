import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Plus, 
  Receipt, 
  Wallet, 
  AlertCircle, 
  ArrowUpRight, 
  RefreshCcw, 
  Search, 
  Calendar 
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import CuentasPorPagarForm from "@/components/cuentas-por-pagar-form";
import CuentasPorPagarPagoForm from "@/components/cuentas-por-pagar-pago-form";
import { formatCurrency } from "@/lib/utils";

type CuentaPorPagar = {
  id: string | number;
  proveedor?: string | null;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  monto?: number | string | null;
  saldo?: number | string | null;
  estado_calculado?: string | null;
};

const getStatusStyles = (estado?: string | null) => {
  const value = (estado || "").toLowerCase();
  if (value.includes("vencid")) return "destructive";
  if (value.includes("pagad")) return "secondary";
  if (value.includes("pendiente")) return "default";
  return "outline";
};

export default function CuentasPorPagarPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [openNuevaCuenta, setOpenNuevaCuenta] = useState(false);
  const [openPagoRapido, setOpenPagoRapido] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data = [], isLoading, isFetching } = useQuery<CuentaPorPagar[]>({
    queryKey: ["cuentas_por_pagar", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cuentas_por_pagar_with_saldo")
        .select("*")
        .order("fecha_vencimiento", { ascending: true })
        .limit(200);

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const filteredData = useMemo(() => {
    return data.filter(c => 
      c.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const resumen = useMemo(() => {
    const total = data.reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const saldoPendiente = data.reduce((acc, item) => acc + Number(item.saldo || 0), 0);
    const vencidas = data.filter(item => (item.estado_calculado || "").toLowerCase().includes("vencid")).length;

    return { totalDocs: data.length, total, saldoPendiente, vencidas };
  }, [data]);

  const onCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cuentas_por_pagar"] });
    setOpenNuevaCuenta(false);
    setOpenPagoRapido(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Cuentas por Pagar</h1>
            <p className="text-slate-500 font-medium">Control de obligaciones y flujo de caja saliente.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["cuentas_por_pagar"] })}
              className={isFetching ? "animate-spin" : ""}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>

            <Dialog open={openPagoRapido} onOpenChange={setOpenPagoRapido}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white">Registrar Pago</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Pago Rápido</DialogTitle>
                </DialogHeader>
                <CuentasPorPagarPagoForm onCreated={onCreated} />
              </DialogContent>
            </Dialog>

            <Dialog open={openNuevaCuenta} onOpenChange={setOpenNuevaCuenta}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Cuenta por Pagar</DialogTitle>
                </DialogHeader>
                <CuentasPorPagarForm onCreated={onCreated} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Documentos" value={resumen.totalDocs} icon={Receipt} color="blue" />
          <StatCard title="Monto Total" value={formatCurrency(resumen.total)} icon={Wallet} color="slate" />
          <StatCard title="Saldo Pendiente" value={formatCurrency(resumen.saldoPendiente)} icon={ArrowUpRight} color="orange" />
          <StatCard title="Vencidas" value={resumen.vencidas} icon={AlertCircle} color="red" />
        </div>

        {/* Main Content Card */}
        <Card className="border-none shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Listado de Obligaciones</CardTitle>
                <CardDescription>Visualiza el estado de tus pagos pendientes.</CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar proveedor..." 
                  className="pl-10 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 bg-white/50">
            {isLoading ? (
              <div className="flex h-60 items-center justify-center space-x-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.2s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.4s]" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 bg-slate-100 rounded-full">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">No hay resultados</p>
                  <p className="text-sm text-slate-500">Intenta ajustar tus criterios de búsqueda.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredData.map((c) => (
                  <Card
                    key={c.id}
                    className="group border-slate-100 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 cursor-pointer overflow-hidden"
                    onClick={() => setLocation(`/cuentas-por-pagar/${c.id}`)}
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                            {c.proveedor || "Sin Proveedor"}
                          </h3>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            ID: #{String(c.id).slice(-6)}
                          </p>
                        </div>
                        <Badge variant={getStatusStyles(c.estado_calculado)} className="shadow-none capitalize">
                          {c.estado_calculado || "Pendiente"}
                        </Badge>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase">Total</span>
                          <span className="font-bold text-slate-900">{formatCurrency(Number(c.monto || 0))}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                          <span className="text-xs font-semibold text-slate-500 uppercase">Saldo</span>
                          <span className="font-bold text-primary">{formatCurrency(Number(c.saldo || 0))}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pt-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Vencimiento: <span className="text-slate-900">{c.fecha_vencimiento || "N/A"}</span></span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    slate: "text-slate-600 bg-slate-50 border-slate-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
    red: "text-red-600 bg-red-50 border-red-100",
  };

  return (
    <Card className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
          </div>
          <div className={`p-3 rounded-2xl ${colors[color]} border transition-transform group-hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}