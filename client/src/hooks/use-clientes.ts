import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Cliente = {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  rtn?: string | null;
  oficio?: string | null;
  created_at?: string | null;
};

export function useClientes() {
  const { toast } = useToast();

  const query = useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const res = await supabase.from("clientes").select("*");
      // Debug logs to help diagnose why no data is returned in some envs
      // (e.g., RLS, keys, content-type issues)
      // eslint-disable-next-line no-console
      console.debug("useClientes supabase response:", res);
      const { data, error } = res;
      if (error) {
        // eslint-disable-next-line no-console
        console.error("useClientes supabase error:", error);
        throw error;
      }
      return (data || []) as Cliente[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Cliente>) => {
      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            nombre: payload.nombre,
            email: payload.email ?? null,
            telefono: payload.telefono ?? null,
            rtn: payload.rtn ?? null,
            oficio: payload.oficio ?? null,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({ title: "Cliente creado" });
    },
    onError: () =>
      toast({ title: "Error creando cliente", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<Cliente> & { id: string }) => {
      const { data, error } = await supabase
        .from("clientes")
        .update({
          nombre: payload.nombre,
          email: payload.email ?? null,
          telefono: payload.telefono ?? null,
          rtn: payload.rtn ?? null,
          oficio: payload.oficio ?? null,
        })
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({ title: "Cliente actualizado" });
    },
    onError: () =>
      toast({ title: "Error actualizando cliente", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({ title: "Cliente eliminado" });
    },
    onError: () =>
      toast({ title: "Error eliminando cliente", variant: "destructive" }),
  });

  return {
    clientes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createCliente: (payload: Partial<Cliente>) =>
      createMutation.mutate(payload),
    updateCliente: (payload: Partial<Cliente> & { id: string }) =>
      updateMutation.mutate(payload),
    deleteCliente: (id: string) => deleteMutation.mutate(id),
    // Async variants so callers can await and react (close modal etc.)
    createClienteAsync: (payload: Partial<Cliente>) =>
      createMutation.mutateAsync(payload),
    updateClienteAsync: (payload: Partial<Cliente> & { id: string }) =>
      updateMutation.mutateAsync(payload),
    deleteClienteAsync: (id: string) => deleteMutation.mutateAsync(id),
  };
}
