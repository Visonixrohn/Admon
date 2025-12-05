import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/use-clientes";
import { mockClients } from "@/lib/mockData";
import { queryClient } from "@/lib/queryClient";

type Cliente = {
  id: string;
  nombre: string;
  telefono?: string | null;
  rtn?: string | null;
  oficio?: string | null;
  created_at?: string | null;
};

export default function Clients() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const { toast } = useToast();

  const {
    clientes,
    isLoading,
    createCliente,
    updateCliente,
    deleteCliente,
    createClienteAsync,
    updateClienteAsync,
  } = useClientes();

  const [localMock, setLocalMock] = useState<Cliente[] | null>(null);
  const [debugResult, setDebugResult] = useState<any>(null);

  const form = useForm<Partial<Cliente>>({
    defaultValues: { nombre: "", telefono: "", rtn: "", oficio: "" },
  });

  const sanitizeValues = (vals: Partial<Cliente> | null) => ({
    nombre: vals?.nombre?.toString().trim() ?? "",
    telefono: vals?.telefono?.toString().trim() ?? "",
    rtn: vals?.rtn?.toString().trim() ?? "",
    oficio: vals?.oficio?.toString().trim() ?? "",
  });
  const onSubmit = async (values: Partial<Cliente>) => {
    try {
      if (editing) {
        await updateClienteAsync({ ...(values as any), id: editing.id });
      } else {
        await createClienteAsync(values);
      }
      setDialogOpen(false);
      setEditing(null);
      form.reset();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error saving cliente:", e);
    }
  };

  const startEdit = (c: Cliente) => {
    setEditing(c);
    form.reset(sanitizeValues(c));
    setDialogOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            form.reset(sanitizeValues(null));
            setDialogOpen(true);
          }}
        >
          Agregar Cliente
        </Button>
      </div>

      <div>
        {isLoading ? (
          <p>Cargando...</p>
        ) : (clientes && clientes.length > 0) ||
          (localMock && localMock.length > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(localMock ?? clientes).map((c) => (
              <Card key={c.id} className="hover-elevate shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(c.nombre || "?")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-base truncate">
                            {c.nombre}
                          </div>
                          <div className="text-sm text-muted-foreground truncate mt-1">
                            {c.oficio ?? "-"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(c)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Eliminar cliente?"))
                                deleteCliente(c.id);
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <div className="text-xs uppercase font-medium text-muted-foreground">
                            Teléfono
                          </div>
                          <div className="truncate">
                            <a
                              className="text-foreground"
                              href={`tel:${c.telefono ?? ""}`}
                            >
                              {c.telefono ?? "-"}
                            </a>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase font-medium text-muted-foreground">
                            RTN
                          </div>
                          <div className="truncate">{c.rtn ?? "-"}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          {c.created_at
                            ? `Creado: ${formatDate(c.created_at)}`
                            : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p>No hay clientes.</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // map mockClients shape to Cliente
                  const mapped = mockClients.map((m: any) => ({
                    id: m.id,
                    nombre: m.name || m.nombre || "",
                    telefono: m.phone || m.telefono || null,
                    rtn: m.rtn ?? null,
                    oficio: m.oficio ?? null,
                    created_at:
                      (m.createdAt || m.created_at)?.toString?.() ?? null,
                  }));
                  setLocalMock(mapped);
                  toast({ title: "Cargando ejemplo local" });
                }}
              >
                Cargar ejemplo
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    const res = await (await import("@/lib/supabase")).supabase
                      .from("clientes")
                      .select("*");
                    setDebugResult(res);
                  } catch (e) {
                    setDebugResult(e);
                  }
                }}
              >
                Comprobar Supabase
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["clientes"] });
                  toast({ title: "Refrescando clientes" });
                }}
              >
                Refrescar
              </Button>
            </div>
            {debugResult && (
              <pre className="mt-2 text-xs max-h-40 overflow-auto bg-surface p-2 rounded">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) {
            setEditing(null);
            form.reset(sanitizeValues(null));
          } else {
            // If dialog opened and editing is set, ensure form is populated and sanitized
            if (editing) form.reset(sanitizeValues(editing));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...form.register("nombre", { required: true })} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...form.register("telefono")} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>RTN</FormLabel>
                <FormControl>
                  <Input {...form.register("rtn")} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Oficio</FormLabel>
                <FormControl>
                  <Input {...form.register("oficio")} />
                </FormControl>
              </FormItem>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{editing ? "Guardar" : "Crear"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
