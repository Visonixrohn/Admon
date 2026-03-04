import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, TrendingUp, Info } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function lempiras(n: number) {
  return `L ${Number(n).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

// ─── ISV ──────────────────────────────────────────────────────────────────────
// Honduras SAR: ISV 15 % general, ISV 18 % bebidas alcohólicas, cigarrillos, etc.
function calcISV(base: number, tasa: number) {
  const isv = base * tasa;
  return { base, isv, total: base + isv };
}

// ISV inverso: dado el precio final con ISV, obtener la base y el ISV
function calcISVInverso(total: number, tasa: number) {
  const base = total / (1 + tasa);
  const isv = total - base;
  return { base, isv, total };
}

// ─── ISR Personas Naturales 2024 (Honduras) ──────────────────────────────────
// Tabla progresiva SAR HN
const TRAMOS_ISR = [
  { hasta: 152902.52, exceso: 0, tasa: 0, base: 0 },
  { hasta: 236562.52, exceso: 152902.52, tasa: 0.15, base: 0 },
  { hasta: 610433.76, exceso: 236562.52, tasa: 0.2, base: 12549.0 },
  { hasta: Infinity, exceso: 610433.76, tasa: 0.25, base: 87425.45 },
];

function calcISRNatural(ingresoAnual: number): {
  tramos: { rango: string; base: number; tasa: number; impuesto: number }[];
  totalISR: number;
  tasaEfectiva: number;
} {
  let totalISR = 0;
  const tramos: {
    rango: string;
    base: number;
    tasa: number;
    impuesto: number;
  }[] = [];

  // Tramo 1: 0 – 152,902.52 → 0%
  if (ingresoAnual > 0) {
    const base = Math.min(ingresoAnual, 152902.52);
    tramos.push({ rango: "0 – 152,902.52", base, tasa: 0, impuesto: 0 });
  }
  // Tramo 2: 152,902.52 – 236,562.52 → 15%
  if (ingresoAnual > 152902.52) {
    const base = Math.min(ingresoAnual, 236562.52) - 152902.52;
    const imp = base * 0.15;
    totalISR += imp;
    tramos.push({
      rango: "152,902.53 – 236,562.52",
      base,
      tasa: 0.15,
      impuesto: imp,
    });
  }
  // Tramo 3: 236,562.52 – 610,433.76 → 20%
  if (ingresoAnual > 236562.52) {
    const base = Math.min(ingresoAnual, 610433.76) - 236562.52;
    const imp = base * 0.2;
    totalISR += imp;
    tramos.push({
      rango: "236,562.53 – 610,433.76",
      base,
      tasa: 0.2,
      impuesto: imp,
    });
  }
  // Tramo 4: > 610,433.76 → 25%
  if (ingresoAnual > 610433.76) {
    const base = ingresoAnual - 610433.76;
    const imp = base * 0.25;
    totalISR += imp;
    tramos.push({ rango: "> 610,433.76", base, tasa: 0.25, impuesto: imp });
  }

  const tasaEfectiva = ingresoAnual > 0 ? totalISR / ingresoAnual : 0;
  return { tramos, totalISR, tasaEfectiva };
}

// ISR Personas Jurídicas Honduras: 25% sobre renta neta
// (Impuesto Mínimo Alternativo: 1.5% de activos netos si es mayor)
function calcISRJuridica(rentaNeta: number, activosNetos: number) {
  const isr = rentaNeta * 0.25;
  const ima = activosNetos * 0.015; // Impuesto Mínimo Alternativo 1.5%
  const impuesto = Math.max(isr, ima);
  return { isr, ima, impuesto, esIMA: ima > isr };
}

// ─── Retención ISR en la Fuente ──────────────────────────────────────────────
// 12.5% sobre honorarios profesionales pagados a personas naturales
function calcRetencion(honorario: number, tasa: number) {
  const retencion = honorario * tasa;
  return { honorario, retencion, neto: honorario - retencion };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function CalculosImpuestos() {
  // ── ISV
  const [isvMonto, setIsvMonto] = useState("");
  const [isvTasa, setIsvTasa] = useState<"0.15" | "0.18">("0.15");
  const [isvModo, setIsvModo] = useState<"directo" | "inverso">("directo");

  const isvResult = (() => {
    const n = parseFloat(isvMonto.replace(/,/g, "")) || 0;
    const t = parseFloat(isvTasa);
    return isvModo === "directo" ? calcISV(n, t) : calcISVInverso(n, t);
  })();

  // ── ISR Personas Naturales
  const [isrIngresoAnual, setIsrIngresoAnual] = useState("");
  const isrNatural = calcISRNatural(
    parseFloat(isrIngresoAnual.replace(/,/g, "")) || 0,
  );

  // ── ISR Personas Jurídicas
  const [isrRentaNeta, setIsrRentaNeta] = useState("");
  const [isrActivosNetos, setIsrActivosNetos] = useState("");
  const isrJuridica = calcISRJuridica(
    parseFloat(isrRentaNeta.replace(/,/g, "")) || 0,
    parseFloat(isrActivosNetos.replace(/,/g, "")) || 0,
  );

  // ── Retención ISR
  const [retHonorario, setRetHonorario] = useState("");
  const [retTasa, setRetTasa] = useState("0.125");
  const retResult = calcRetencion(
    parseFloat(retHonorario.replace(/,/g, "")) || 0,
    parseFloat(retTasa),
  );

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Calculator className="w-6 h-6" /> Cálculo de Impuestos
        </h1>
        <p className="text-sm text-muted-foreground">
          ISV e ISR según tarifas SAR Honduras vigentes
        </p>
      </div>

      <Tabs defaultValue="isv">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="isv">ISV (Ventas)</TabsTrigger>
          <TabsTrigger value="isr_natural">ISR Persona Natural</TabsTrigger>
          <TabsTrigger value="isr_juridica">ISR Persona Jurídica</TabsTrigger>
          <TabsTrigger value="retencion">Retención ISR Fuente</TabsTrigger>
        </TabsList>

        {/* ── ISV ── */}
        <TabsContent value="isv" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Impuesto Sobre las Ventas
                (ISV)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {isvModo === "directo"
                      ? "Monto / Base imponible (L)"
                      : "Total con ISV incluido (L)"}
                  </label>
                  <Input
                    className="w-full sm:w-48 font-mono"
                    value={isvMonto}
                    onChange={(e) => setIsvMonto(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Tasa ISV
                  </label>
                  <Select
                    value={isvTasa}
                    onValueChange={(v) => setIsvTasa(v as any)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.15">15% (General)</SelectItem>
                      <SelectItem value="0.18">18% (Bebidas/Tabaco)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Modo de cálculo
                  </label>
                  <Select
                    value={isvModo}
                    onValueChange={(v) => setIsvModo(v as any)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="directo">
                        Base → Total (agregar ISV)
                      </SelectItem>
                      <SelectItem value="inverso">
                        Total → Base (extraer ISV)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    Base Imponible
                  </p>
                  <p className="text-xl font-bold font-mono">
                    {lempiras(isvResult.base)}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    ISV ({isvTasa === "0.15" ? "15%" : "18%"})
                  </p>
                  <p className="text-xl font-bold font-mono text-orange-600">
                    {lempiras(isvResult.isv)}
                  </p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Total con ISV</p>
                  <p className="text-xl font-bold font-mono text-primary">
                    {lempiras(isvResult.total)}
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 flex gap-2 items-start">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  El ISV 15% aplica a la mayoría de bienes y servicios. El 18%
                  aplica a bebidas alcohólicas, cervezas y cigarrillos. Algunos
                  productos pueden ser exentos o exonerados según Decreto
                  51-2003 y sus reformas (SAR Honduras).
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ISR Natural ── */}
        <TabsContent value="isr_natural" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                ISR Persona Natural — Tabla Progresiva 2024
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Ingreso Anual Gravable (L)
                </label>
                <Input
                  className="w-full sm:w-52 font-mono"
                  value={isrIngresoAnual}
                  onChange={(e) => setIsrIngresoAnual(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Tabla de tramos */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Rango (L)</th>
                      <th className="text-right py-2">Base en tramo</th>
                      <th className="text-right py-2">Tasa</th>
                      <th className="text-right py-2">Impuesto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isrNatural.tramos.map((t) => (
                      <tr key={t.rango} className="border-b">
                        <td className="py-2 font-mono text-xs">{t.rango}</td>
                        <td className="py-2 text-right font-mono">
                          {lempiras(t.base)}
                        </td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={t.tasa === 0 ? "secondary" : "default"}
                          >
                            {pct(t.tasa)}
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-mono">
                          {lempiras(t.impuesto)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-muted/30">
                      <td className="py-2" colSpan={3}>
                        Total ISR Anual
                      </td>
                      <td className="py-2 text-right font-mono text-primary">
                        {lempiras(isrNatural.totalISR)}
                      </td>
                    </tr>
                    <tr className="text-muted-foreground text-xs">
                      <td className="py-1" colSpan={3}>
                        ISR mensual estimado
                      </td>
                      <td className="py-1 text-right font-mono">
                        {lempiras(isrNatural.totalISR / 12)}
                      </td>
                    </tr>
                    <tr className="text-muted-foreground text-xs">
                      <td className="py-1" colSpan={3}>
                        Tasa efectiva
                      </td>
                      <td className="py-1 text-right font-mono">
                        {pct(isrNatural.tasaEfectiva)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 flex gap-2 items-start">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Tramos ISR 2024 según tarifas vigentes SAR Honduras (Art. 22
                  Ley de ISR). El cálculo es sobre ingreso neto gravable anual
                  (ingresos brutos menos deducciones permitidas). Se debe
                  presentar declaración anual antes del 30 de abril del año
                  siguiente.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ISR Jurídica ── */}
        <TabsContent value="isr_juridica" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                ISR Persona Jurídica — Tasa 25% / IMA 1.5%
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Renta Neta Gravable (L)
                  </label>
                  <Input
                    className="font-mono"
                    value={isrRentaNeta}
                    onChange={(e) => setIsrRentaNeta(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ingresos totales menos deducciones
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Activos Netos Totales (L)
                  </label>
                  <Input
                    className="font-mono"
                    value={isrActivosNetos}
                    onChange={(e) => setIsrActivosNetos(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Para calcular IMA (1.5% activos)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    ISR 25% sobre renta neta
                  </p>
                  <p className="text-xl font-bold font-mono">
                    {lempiras(isrJuridica.isr)}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    IMA 1.5% activos netos
                  </p>
                  <p className="text-xl font-bold font-mono">
                    {lempiras(isrJuridica.ima)}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-4 ${
                    isrJuridica.esIMA
                      ? "bg-orange-50 dark:bg-orange-950/20"
                      : "bg-primary/5"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">
                    Impuesto a pagar{" "}
                    {isrJuridica.esIMA ? "(aplica IMA)" : "(aplica ISR)"}
                  </p>
                  <p className="text-xl font-bold font-mono text-primary">
                    {lempiras(isrJuridica.impuesto)}
                  </p>
                  {isrJuridica.esIMA && (
                    <Badge
                      variant="outline"
                      className="text-orange-600 mt-1 text-xs"
                    >
                      Impuesto Mínimo Alternativo
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 flex gap-2 items-start">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Las personas jurídicas tributan el 25% sobre renta neta. El
                  Impuesto Mínimo Alternativo (IMA) es el 1.5% del total de
                  activos netos cuando este resulte mayor al ISR calculado (Art.
                  22-A, Ley de ISR Honduras). Declaración anual: 30 de abril.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Retención ISR en la fuente ── */}
        <TabsContent value="retencion" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Retención ISR en la Fuente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Monto bruto del pago (L)
                  </label>
                  <Input
                    className="w-full sm:w-48 font-mono"
                    value={retHonorario}
                    onChange={(e) => setRetHonorario(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Tasa de retención
                  </label>
                  <Select value={retTasa} onValueChange={setRetTasa}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.125">
                        12.5% — Honorarios profesionales
                      </SelectItem>
                      <SelectItem value="0.10">
                        10% — Dividendos/utilidades
                      </SelectItem>
                      <SelectItem value="0.125">
                        12.5% — Servicios técnicos
                      </SelectItem>
                      <SelectItem value="0.25">25% — No residentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Monto Bruto</p>
                  <p className="text-xl font-bold font-mono">
                    {lempiras(retResult.honorario)}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    Retención ISR ({pct(parseFloat(retTasa))})
                  </p>
                  <p className="text-xl font-bold font-mono text-red-600">
                    {lempiras(retResult.retencion)}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Neto a pagar</p>
                  <p className="text-xl font-bold font-mono text-green-600">
                    {lempiras(retResult.neto)}
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 flex gap-2 items-start">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  La retención se aplica sobre pagos a personas naturales y
                  jurídicas según el tipo de ingreso. El agente retenedor debe
                  remitir al SAR mediante F-101 mensualmente. Honorarios
                  profesionales: 12.5%. Dividendos: 10%. No residentes: 25%.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
