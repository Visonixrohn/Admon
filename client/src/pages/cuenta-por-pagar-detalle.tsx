import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import {
	ArrowLeft,
	Plus,
	Banknote,
	Receipt,
	AlertCircle,
	FileText,
	Wallet,
	Calendar,
	History,
	Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import CuentasPorPagarPagoForm from "@/components/cuentas-por-pagar-pago-form";
import CuentasPorPagarAjustesForm from "@/components/cuentas-por-pagar-ajustes-form";

export default function CuentaPorPagarDetalle() {
	const { toast } = useToast();
	const [, navigate] = useLocation();
	const [match, params] = useRoute("/cuentas-por-pagar/:id");
	const id = params?.id;

	const [cuenta, setCuenta] = useState<any | null>(null);
	const [pagos, setPagos] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	const [openPago, setOpenPago] = useState(false);
	const [openCargo, setOpenCargo] = useState(false);
	const [openSettings, setOpenSettings] = useState(false);

	const fetchData = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		try {
			const [cRes, pagosRes] = await Promise.all([
				supabase.from("cuentas_por_pagar_with_saldo").select("*").eq("id", id).single(),
				supabase.from("cuentas_por_pagar_pagos").select("id, monto, fecha, metodo_pago, referencia").eq("cuenta_id", id).order("fecha", { ascending: false }),
			]);
			if (cRes.error) throw cRes.error;
			setCuenta(cRes.data);
			setPagos(pagosRes.data || []);
		} catch (err: any) {
			toast({ title: "Error", description: "No se pudo cargar la información", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	}, [id, toast]);

	useEffect(() => { fetchData(); }, [fetchData]);

	const porcentajePagado = useMemo(() => {
		if (!cuenta) return 0;
		const pagado = Number(cuenta.monto) - Number(cuenta.saldo);
		return Math.max(0, Math.min(100, Math.round((pagado / Number(cuenta.monto)) * 100)));
	}, [cuenta]);

	if (loading) return <div className="p-12 text-center animate-pulse text-muted-foreground font-medium">Sincronizando datos...</div>;
	if (!cuenta) return <div className="p-12 text-center">Cuenta no encontrada.</div>;

	return (
		<div className="min-h-screen bg-slate-50/30 p-4 md:p-8">
			<div className="mx-auto max-w-5xl space-y-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div className="space-y-3">
						<Button variant="ghost" onClick={() => navigate("/cuentas-por-pagar")} className="h-8 px-2 text-muted-foreground hover:text-primary">
							<ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
						</Button>
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-3xl font-black tracking-tight text-slate-900">{cuenta.proveedor}</h1>
								<Badge variant={cuenta.saldo <= 0 ? "secondary" : "default"} className="rounded-full shadow-none">{cuenta.estado_calculado}</Badge>
							</div>
							<p className="text-slate-500 font-medium mt-1 flex items-center gap-2"><FileText className="h-4 w-4" /> {cuenta.descripcion || "Sin descripción disponible"}</p>
						</div>
					</div>

					<div className="flex gap-3">
						<Dialog open={openSettings} onOpenChange={setOpenSettings}>
							<DialogTrigger asChild>
								<Button variant="outline" className="border-slate-200 bg-white shadow-sm">
									<Settings className="mr-2 h-4 w-4" /> Ajustes
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-md">
								<DialogHeader>
									<DialogTitle>Ajustes de cuenta</DialogTitle>
									<DialogDescription>Editar datos de la cuenta (no se puede modificar el monto).</DialogDescription>
								</DialogHeader>
								<CuentasPorPagarAjustesForm cuentaId={id} onSaved={() => { setOpenSettings(false); fetchData(); }} />
							</DialogContent>
						</Dialog>

						<Dialog open={openCargo} onOpenChange={setOpenCargo}>
							<DialogTrigger asChild>
								<Button variant="destructive" className="shadow-sm">
									<AlertCircle className="mr-2 h-4 w-4 text-red-400" /> Agregar Cargo
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-md">
								<DialogHeader>
									<DialogTitle>Registrar Cargo</DialogTitle>
									<DialogDescription>Registra un cargo (se guardará como monto negativo) para esta cuenta.</DialogDescription>
								</DialogHeader>
								<CuentasPorPagarPagoForm cuentaId={id} isCargo={true} onCreated={() => { setOpenCargo(false); fetchData(); }} />
							</DialogContent>
						</Dialog>

						<Dialog open={openPago} onOpenChange={setOpenPago}>
							<DialogTrigger asChild>
								<Button className="bg-primary shadow-lg shadow-primary/20"><Plus className="mr-2 h-4 w-4" /> Abonar Pago</Button>
							</DialogTrigger>
							<DialogContent className="max-w-md">
								<DialogHeader>
									<DialogTitle>Registrar Abono</DialogTitle>
									<DialogDescription>Complete los datos del pago para reducir el saldo actual.</DialogDescription>
								</DialogHeader>
								<CuentasPorPagarPagoForm cuentaId={id} onCreated={() => { setOpenPago(false); fetchData(); }} />
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card className="border-none shadow-sm bg-white"><CardContent className="pt-6"><div className="flex items-center gap-3 text-slate-500 mb-2"><Receipt className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Total Facturado</span></div><div className="text-2xl font-black">{formatCurrency(Number(cuenta.monto))}</div></CardContent></Card>
					<Card className="border-none shadow-sm bg-white"><CardContent className="pt-6"><div className="flex items-center gap-3 text-primary mb-2"><Wallet className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Saldo Pendiente</span></div><div className="text-2xl font-black text-primary">{formatCurrency(Number(cuenta.saldo))}</div></CardContent></Card>
					<Card className="border-none shadow-sm bg-white"><CardContent className="pt-6"><div className="flex items-center gap-3 text-slate-500 mb-2"><Calendar className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Fecha de Vencimiento</span></div><div className="text-2xl font-black text-slate-700">{cuenta.fecha_vencimiento || "Pendiente"}</div></CardContent></Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					<div className="lg:col-span-3 space-y-6">
						<Card className="border-none shadow-sm bg-white"><CardHeader className="pb-2"><div className="flex justify-between items-end"><CardTitle className="text-sm font-bold text-slate-500 uppercase">Estado de Cobertura</CardTitle><span className="text-2xl font-black text-primary">{porcentajePagado}%</span></div></CardHeader><CardContent><Progress value={porcentajePagado} className="h-3 bg-slate-100" /><p className="text-xs text-slate-400 mt-4 font-medium flex items-center gap-2"><AlertCircle className="h-3 w-3" /> Faltan {formatCurrency(Number(cuenta.saldo))} para liquidar esta cuenta.</p></CardContent></Card>

						<Card className="border-none shadow-sm bg-white overflow-hidden"><CardHeader className="border-b border-slate-50"><div className="flex items-center gap-2"><History className="h-5 w-5 text-slate-400" /><CardTitle className="text-lg font-bold">Historial de Pagos</CardTitle></div></CardHeader><CardContent className="p-0">{pagos.length === 0 ? (<div className="py-20 text-center space-y-2"><Banknote className="h-10 w-10 text-slate-200 mx-auto" /><p className="text-slate-500 font-medium text-sm">No se han registrado abonos aún.</p></div>) : (<div className="divide-y divide-slate-50">{pagos.map((p) => (<div key={p.id} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors group"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs group-hover:bg-emerald-100 transition-colors">$</div><div><p className="font-bold text-slate-900 leading-none mb-1">{p.metodo_pago}</p><p className="text-xs text-slate-400 font-medium">Ref: {p.referencia || "N/A"}</p></div></div><div className="text-right"><p className="font-black" style={{color: Number(p.monto) < 0 ? '#dc2626' : '#059669'}}>{Number(p.monto) < 0 ? '-' : '+'}{formatCurrency(Math.abs(Number(p.monto)))}</p><p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">{p.fecha}</p></div></div>))}</div>)}</CardContent></Card>
					</div>

					<div className="space-y-6">
						<div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4"><h4 className="font-bold text-sm uppercase tracking-widest text-slate-400">Resumen Rápido</h4><div className="space-y-4"><div><p className="text-xs text-slate-500 font-bold">PAGADO</p><p className="text-xl font-bold text-emerald-400">{formatCurrency(Number(cuenta.monto) - Number(cuenta.saldo))}</p></div><div className="h-px bg-slate-800" /><div><p className="text-xs text-slate-500 font-bold">PENDIENTE</p><p className="text-xl font-bold text-primary-foreground">{formatCurrency(Number(cuenta.saldo))}</p></div></div></div>
					</div>
				</div>
			</div>
		</div>
	);
}
