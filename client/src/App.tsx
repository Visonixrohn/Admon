import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Payments from "@/pages/payments";
import Subscriptions from "@/pages/subscriptions";
import EstadoCuentas from "@/pages/estado-cuentas";
import Statistics from "@/pages/statistics";
import Proyecto from "@/pages/proyecto";
import ProyectoVentas from "@/pages/proyecto-ventas";
import ClienteDetalle from "@/pages/cliente-detalle";
import ProyectoDetalle from "@/pages/proyecto-detalle";
import ContratosActivos from "@/pages/contratos-activos";
import Configuracion from "@/pages/configuracion";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import React, { useEffect, useState } from "react";

function Router({ authed, onLogin }: { authed: boolean; onLogin: () => void }) {
  const [location, setLocation] = useLocation();

  // If authenticated and currently at /login, redirect to home
  if (authed && location === "/login") {
    setLocation("/");
  }

  const wrap = (C: any) => (props: any) => (authed ? <C {...props} /> : <Login onSuccess={onLogin} />);

  return (
    <Switch>
      <Route path="/" component={wrap(Dashboard)} />
      <Route path="/clientes/proyecto/ventas" component={wrap(ProyectoVentas)} />
      <Route path="/clientes/proyecto/:id" component={wrap(ProyectoDetalle)} />
      <Route path="/clientes/proyecto" component={wrap(Proyecto)} />
      <Route path="/clientes/:id" component={wrap(ClienteDetalle)} />
      <Route path="/clientes" component={wrap(Clients)} />
      <Route path="/contratos-activos" component={wrap(ContratosActivos)} />
      <Route path="/configuracion" component={wrap(Configuracion)} />
      <Route path="/pagos" component={wrap(Payments)} />
      <Route path="/pagos/estado-de-cuentas" component={wrap(EstadoCuentas)} />
      <Route path="/suscripciones" component={wrap(Subscriptions)} />
      <Route path="/estadisticas" component={wrap(Statistics)} />
      <Route path="/login" component={() => <Login onSuccess={onLogin} />} />
      <Route component={wrap(NotFound)} />
    </Switch>
  );
}

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("admon-auth");
      setAuthed(v === "true");
    } catch (e) {
      setAuthed(false);
    }
  }, []);

  if (authed === null) return null;
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="visonixro-theme">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router authed={authed} onLogin={() => setAuthed(true)} />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
