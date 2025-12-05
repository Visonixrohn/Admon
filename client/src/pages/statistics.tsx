import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  RefreshCcw,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { formatCurrency, getPaymentTypeLabel, getMonthName } from "@/lib/utils";
import type {
  DashboardStats,
  MonthlyRevenue,
  ClientWithPayments,
} from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  subtitle,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  subtitle?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {(trend || subtitle) && (
              <div className="flex items-center gap-2 mt-2">
                {trend && trendValue && (
                  <>
                    {trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        trend === "up" ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {trendValue}
                    </span>
                  </>
                )}
                {subtitle && (
                  <span className="text-xs text-muted-foreground">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Statistics() {
  const [timeRange, setTimeRange] = useState("6m");
  const toast = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["statistics", "stats"],
    queryFn: async () => {
      try {
        const [rPagos, rClientes, rSubs] = await Promise.all([
          supabase.from("pagos").select("monto"),
          supabase
            .from("clientes")
            .select("id,nombre,total_amount,number_of_payments"),
          supabase
            .from("suscripciones")
            .select("id,mensualidad,is_active,proxima_fecha_de_pago"),
        ]);
        const pagosData = Array.isArray(rPagos.data) ? rPagos.data : [];
        const clientesData = Array.isArray(rClientes.data)
          ? rClientes.data
          : [];
        const subsData = Array.isArray(rSubs.data) ? rSubs.data : [];

        const totalRevenue = pagosData.reduce(
          (s: number, p: any) => s + Number(p.monto ?? 0),
          0
        );
        const totalClients = clientesData.length;
        const activeSubscriptions = subsData.filter((s: any) =>
          s.is_active === undefined ? true : s.is_active
        ).length;
        const monthlyRecurringRevenue = subsData.reduce(
          (sum: number, s: any) => sum + Number(s.mensualidad ?? 0),
          0
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pendingPayments = subsData.filter((s: any) => {
          if (!s.proxima_fecha_de_pago) return false;
          const d = new Date(s.proxima_fecha_de_pago);
          d.setHours(0, 0, 0, 0);
          return d <= today;
        }).length;

        return {
          totalRevenue,
          totalClients,
          pendingPayments,
          activeSubscriptions,
          monthlyRecurringRevenue,
          overduePayments: pendingPayments,
        } as DashboardStats;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error loading statistics:", err);
        toast({ title: "Error cargando estadísticas", variant: "destructive" });
        return {
          totalRevenue: 0,
          totalClients: 0,
          pendingPayments: 0,
          activeSubscriptions: 0,
          monthlyRecurringRevenue: 0,
          overduePayments: 0,
        } as DashboardStats;
      }
    },
  });

  const { data: monthlyRevenue, isLoading: revenueLoading } = useQuery<
    MonthlyRevenue[]
  >({
    queryKey: ["statistics", "revenue"],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data, error } = await supabase
        .from("pagos")
        .select("id,fecha_de_creacion,monto,tipo")
        .gte("fecha_de_creacion", sixMonthsAgo.toISOString())
        .order("fecha_de_creacion", { ascending: true });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const months: Record<
        string,
        {
          month: string;
          subscriptions: number;
          oneTime: number;
          revenue: number;
        }
      > = {};
      const nowD = new Date();
      for (let i = 0; i < 6; i++) {
        const d = new Date(nowD.getFullYear(), nowD.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        months[key] = {
          month: d.toLocaleString(undefined, { month: "short" }),
          subscriptions: 0,
          oneTime: 0,
          revenue: 0,
        };
      }
      rows.forEach((r: any) => {
        const d = new Date(r.fecha_de_creacion);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        if (!months[key]) return;
        const monto = Number(r.monto ?? 0);
        months[key].revenue += monto;
        if (String(r.tipo) === "suscripcion")
          months[key].subscriptions += monto;
        else months[key].oneTime += monto;
      });
      return Object.values(months);
    },
  });

  const { data: clients } = useQuery<ClientWithPayments[]>({
    queryKey: ["statistics", "clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id,nombre,rtn,telefono,total_amount,number_of_payments");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: pagosAll } = useQuery<any[]>({
    queryKey: ["statistics", "pagos", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("tipo,monto");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const paymentTypeDistribution = (
    Array.isArray(pagosAll) ? pagosAll : []
  ).reduce((acc: Record<string, number>, p: any) => {
    const type = p?.tipo ?? "unico";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(paymentTypeDistribution).map(
    ([name, value]) => ({
      name: getPaymentTypeLabel(name),
      value,
    })
  );

  const revenueByType = (Array.isArray(pagosAll) ? pagosAll : []).reduce(
    (acc: Record<string, number>, p: any) => {
      const type = p?.tipo ?? "unico";
      acc[type] = (acc[type] || 0) + Number(p?.monto ?? 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const revenueDistributionData = Object.entries(revenueByType).map(
    ([name, value]) => ({
      name: getPaymentTypeLabel(name),
      value,
    })
  );

  const totalRevenue = stats?.totalRevenue || 0;
  const avgRevenuePerClient =
    clients && clients.length > 0 ? totalRevenue / clients.length : 0;

  const debtors = clients?.filter((c) => c.amountPending > 0) || [];
  const totalDebt = debtors.reduce((sum, c) => sum + c.amountPending, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            data-testid="text-page-title"
          >
            Estadisticas
          </h1>
          <p className="text-muted-foreground mt-1">
            Analisis detallado de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="w-[150px]"
              data-testid="select-time-range"
            >
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Ultimo mes</SelectItem>
              <SelectItem value="3m">Ultimos 3 meses</SelectItem>
              <SelectItem value="6m">Ultimos 6 meses</SelectItem>
              <SelectItem value="1y">Ultimo anio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          trend="up"
          trendValue="+18.2%"
          loading={statsLoading}
        />
        <StatCard
          title="Clientes Totales"
          value={String(stats?.totalClients || 0)}
          icon={Users}
          trend="up"
          trendValue="+5"
          loading={statsLoading}
        />
        <StatCard
          title="MRR"
          value={formatCurrency(stats?.monthlyRecurringRevenue || 0)}
          icon={RefreshCcw}
          subtitle={`${stats?.activeSubscriptions || 0} suscripciones`}
          loading={statsLoading}
        />
        <StatCard
          title="Deudas Pendientes"
          value={formatCurrency(totalDebt)}
          icon={CreditCard}
          subtitle={`${debtors.length} clientes`}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">
              Evolucion de Ingresos
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Mensual
            </Badge>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue || []}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--chart-1))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--chart-1))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) => `L ${value / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Total",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Clientes por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Ingresos por Tipo de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueDistributionData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `L ${value / 1000}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), ""]}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--chart-1))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Comparativa Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `L ${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), ""]}
                  />
                  <Legend />
                  <Bar
                    dataKey="oneTime"
                    name="Pagos Unicos"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="subscriptions"
                    name="Suscripciones"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Promedio por Cliente
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(avgRevenuePerClient)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ARR Proyectado</p>
                <p className="text-2xl font-bold">
                  {formatCurrency((stats?.monthlyRecurringRevenue || 0) * 12)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Tasa de Suscripcion
                </p>
                <p className="text-2xl font-bold">
                  {clients && clients.length > 0
                    ? `${Math.round(
                        (clients.filter((c) => c.paymentType === "suscripcion")
                          .length /
                          clients.length) *
                          100
                      )}%`
                    : "0%"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
