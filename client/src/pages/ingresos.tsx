import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  TrendingUp,
  ArrowLeft,
  Wallet,
  Calendar,
  FileText,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PIngreso {
  id: string;
  monto: number;
  referencia: string | null;
  proyecto_id: string | null;
  fecha: string;
  created_at: string;
}

interface Proyecto {
  id: string;
  nombre: string;
}

interface ProyectoGroup {
  proyecto: Proyecto | null; // null = sin proyecto
  ingresos: PIngreso[];
  total: number;
}

const NO_PROJECT_KEY = "__sin_proyecto__";

export default function IngresosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Vista activa: null = lista de proyectos, string = id de proyecto seleccionado
  const [selectedProyecto, setSelectedProyecto] = useState<string | null>(null);

  // Modal nuevo ingreso
  const [modalOpen, setModalOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [proyectoId, setProyectoId] = useState("");

  // Modal eliminar
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Proyectos disponibles
  const { data: proyectos = [] } = useQuery<Proyecto[]>({
    queryKey: ["proyectos-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proyectos")
        .select("id,nombre")
        .order("nombre");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  // Todos los ingresos
  const { data: ingresos = [], isLoading } = useQuery<PIngreso[]>({
    queryKey: ["p_ingresos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("p_ingresos")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  // Agrupar por proyecto
  const proyectoMap: Record<string, Proyecto> = {};
  proyectos.forEach((p) => {
    proyectoMap[p.id] = p;
  });

  const groups: Record<string, ProyectoGroup> = {};
  ingresos.forEach((ing) => {
    const key = ing.proyecto_id ?? NO_PROJECT_KEY;
    if (!groups[key]) {
      groups[key] = {
        proyecto:
          ing.proyecto_id && proyectoMap[ing.proyecto_id]
            ? proyectoMap[ing.proyecto_id]
            : ing.proyecto_id
              ? { id: ing.proyecto_id, nombre: "Proyecto desconocido" }
              : null,
        ingresos: [],
        total: 0,
      };
    }
    groups[key].ingresos.push(ing);
    groups[key].total += Number(ing.monto ?? 0);
  });

  const sortedGroups = Object.entries(groups).sort(
    ([, a], [, b]) => b.total - a.total,
  );

  const totalGeneral = ingresos.reduce((s, i) => s + Number(i.monto ?? 0), 0);

  // Mutación crear ingreso
  const createMutation = useMutation({
    mutationFn: async (values: {
      monto: number;
      referencia: string;
      proyecto_id: string | null;
    }) => {
      const { error } = await supabase.from("p_ingresos").insert([
        {
          monto: values.monto,
          referencia: values.referencia || null,
          proyecto_id: values.proyecto_id || null,
          fecha: new Date().toISOString().slice(0, 10),
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ingreso registrado correctamente" });
      setModalOpen(false);
      setMonto("");
      setReferencia("");
      setProyectoId("");
      queryClient.invalidateQueries({ queryKey: ["p_ingresos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error al registrar ingreso",
        description: err?.message ?? "Error desconocido",
        variant: "destructive",
      });
    },
  });

  // Mutación eliminar ingreso
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("p_ingresos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ingreso eliminado" });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["p_ingresos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error eliminando ingreso",
        description: err?.message ?? "Error desconocido",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      toast({ title: "Ingresa un monto válido", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      monto: montoNum,
      referencia,
      proyecto_id: proyectoId || null,
    });
  };

  // Vista detalle de proyecto
  const activeGroup = selectedProyecto
    ? (groups[selectedProyecto] ?? null)
    : null;

  const formatFecha = (fecha: string) => {
    if (!fecha) return "-";
    const d = new Date(fecha + "T12:00:00");
    return d.toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedProyecto && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedProyecto(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {selectedProyecto
                ? (activeGroup?.proyecto?.nombre ?? "Sin proyecto")
                : "Ingresos"}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {selectedProyecto
                ? "Estado de cuenta de ingresos"
                : "Ingresos propios por proyecto"}
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ingreso
        </Button>
      </div>

      {/* ── VISTA LISTA DE PROYECTOS ── */}
      {!selectedProyecto && (
        <>
          {/* Tarjeta resumen total */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total ingresos
                </p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(totalGeneral)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="text-2xl font-semibold">{ingresos.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Cards por proyecto */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5 h-28" />
                </Card>
              ))}
            </div>
          ) : sortedGroups.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <TrendingUp className="h-14 w-14 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Sin ingresos registrados</p>
                <p className="text-sm mt-1">
                  Presiona "Nuevo Ingreso" para comenzar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedGroups.map(([key, group]) => {
                const pct =
                  totalGeneral > 0
                    ? Math.round((group.total / totalGeneral) * 100)
                    : 0;
                return (
                  <Card
                    key={key}
                    className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
                    onClick={() => setSelectedProyecto(key)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <p className="font-semibold truncate text-sm">
                            {group.proyecto?.nombre ?? "Sin proyecto"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {group.ingresos.length} reg.
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(group.total)}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>% del total</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Último:{" "}
                        {group.ingresos[0]
                          ? formatFecha(group.ingresos[0].fecha)
                          : "-"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── VISTA ESTADO DE CUENTA (detalle de proyecto) ── */}
      {selectedProyecto && activeGroup && (
        <>
          {/* Resumen del proyecto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(activeGroup.total)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Registros
                </p>
                <p className="text-3xl font-bold">
                  {activeGroup.ingresos.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Promedio
                </p>
                <p className="text-3xl font-bold">
                  {activeGroup.ingresos.length > 0
                    ? formatCurrency(
                        activeGroup.total / activeGroup.ingresos.length,
                      )
                    : formatCurrency(0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de movimientos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activeGroup.ingresos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Sin ingresos en este proyecto</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeGroup.ingresos.map((ing, idx) => (
                      <TableRow key={ing.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatFecha(ing.fecha)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ing.referencia ? (
                            ing.referencia
                          ) : (
                            <span className="text-muted-foreground italic">
                              Sin referencia
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(Number(ing.monto))}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(ing.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Fila total */}
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell colSpan={2} className="text-sm">
                        Total
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(activeGroup.total)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── MODAL NUEVO INGRESO ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Ingreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="i-monto">Monto *</Label>
              <Input
                id="i-monto"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-ref">Referencia</Label>
              <Textarea
                id="i-ref"
                placeholder="Descripción o referencia del ingreso"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-proyecto">Proyecto</Label>
              <Select value={proyectoId} onValueChange={setProyectoId}>
                <SelectTrigger id="i-proyecto">
                  <SelectValue placeholder="Selecciona un proyecto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {proyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha:{" "}
              {new Date().toLocaleDateString("es-HN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}{" "}
              (se registra automáticamente)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Guardando..." : "Guardar Ingreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM ELIMINAR ── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ingreso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El ingreso será eliminado
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
