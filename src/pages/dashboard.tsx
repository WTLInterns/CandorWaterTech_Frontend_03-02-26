import Layout from "@/components/Layout";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#4f46e5", "#0ea5e9", "#22c55e", "#f97316"];

interface ActivityRow {
  id: string;
  time: string;
  agent: string;
  customer: string | null;
  activity: string;
  status: string;
}

interface InvoiceSummaryItem {
  total: number;
  createdAt: string;
}

interface LeadSummaryItem {
  id: string;
  status?: string;
  createdAt?: string;
}

interface Page<T> {
  content: T[];
}

const SPRING_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [totalSales, setTotalSales] = useState<number | null>(null);
  const [activeStaff, setActiveStaff] = useState<number | null>(null);
  const [totalLeads, setTotalLeads] = useState<number | null>(null);
  const [salesData, setSalesData] = useState<{ month: string; sales: number; target: number }[]>([]);
  const [statusBars, setStatusBars] = useState<{ name: string; value: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadActivities() {
      try {
        setLoadingActivities(true);
        const res = await axios.get<ActivityRow[]>(
          `${SPRING_API_BASE}/activities/latest`,
          { params: { limit: 6 } },
        );
        if (!cancelled) {
          setActivities(res.data || []);
        }
      } catch (e) {
        console.error("Failed to load latest activities", e);
      } finally {
        if (!cancelled) setLoadingActivities(false);
      }
    }
    loadActivities();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        setLoadingStats(true);

        const [invRes, agentsRes, leadsRes] = await Promise.all([
          axios.get<Page<InvoiceSummaryItem>>(`${SPRING_API_BASE}/invoices`, {
            params: { page: 0, size: 200 },
          }),
          axios.get(`${SPRING_API_BASE}/agents`),
          axios.get<Page<LeadSummaryItem>>(`${SPRING_API_BASE}/leads`, {
            params: { page: 0, size: 200 },
          }),
        ]);

        if (cancelled) return;

        const invoices = invRes.data.content || [];
        const leads = leadsRes.data.content || [];
        const agents = Array.isArray(agentsRes.data) ? agentsRes.data : [];

        // Total sales from invoices
        const total = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
        setTotalSales(total);

        // Active staff = number of agents
        setActiveStaff(agents.length);

        // Total leads
        setTotalLeads(leads.length);

        // Sales vs Target chart: last 6 months by invoice createdAt
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const series: { month: string; sales: number; target: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const label = monthNames[d.getMonth()];
          const monthTotal = invoices
            .filter((inv) => {
              if (!inv.createdAt) return false;
              const cd = new Date(inv.createdAt);
              return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
            })
            .reduce((sum, inv) => sum + (inv.total ?? 0), 0);
          const target = monthTotal > 0 ? monthTotal * 1.1 : 0;
          series.push({ month: label, sales: monthTotal, target });
        }
        setSalesData(series);

        // Lead status bars
        const statusCounts: Record<string, number> = {};
        leads.forEach((l) => {
          const s = (l.status || "UNKNOWN").toUpperCase();
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });
        const barData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        setStatusBars(barData);

        // Lead mix pie: Open / Won / Lost
        let open = 0,
          won = 0,
          lost = 0;
        leads.forEach((l) => {
          const s = (l.status || "").toUpperCase();
          if (s === "CLOSED_WON") won++;
          else if (s === "CLOSED_LOST") lost++;
          else open++;
        });
        setCategoryData([
          { name: "Open", value: open },
          { name: "Won", value: won },
          { name: "Lost", value: lost },
        ]);
      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Overview of sales performance, field activity, and pipeline health.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Total Sales</div>
            <div className="mt-2 text-2xl font-semibold">
              {totalSales != null ? `₹ ${totalSales.toLocaleString()}` : "-"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {loadingStats ? "Calculating from invoices..." : "From all invoices"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Active Field Staff</div>
            <div className="mt-2 text-2xl font-semibold">
              {activeStaff != null ? activeStaff : "-"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Total agents</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Total Leads</div>
            <div className="mt-2 text-2xl font-semibold">
              {totalLeads != null ? totalLeads : "-"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Across all agents</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Completed Activities</div>
            <div className="mt-2 text-2xl font-semibold">
              {activities.filter((a) => a.status?.toUpperCase?.() === "COMPLETED").length}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">From latest log</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Sales vs Target</h2>
              <span className="text-[11px] text-slate-400">Last 6 months (invoices)</span>
            </div>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">Lead Status Breakdown</h2>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", fontSize: 12 }}
                    />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">Lead Mix</h2>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      labelLine={false}
                      label={({ name, percent }) => {
                        const safePercent = typeof percent === "number" ? percent : 0;
                        return `${name} ${(safePercent * 100).toFixed(0)}%`;
                      }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Latest Activity</h2>
            <span className="text-[11px] text-slate-400">Today</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-slate-900/80 text-left text-[11px] font-medium text-slate-400">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Activity</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingActivities && activities.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-[11px] text-slate-400"
                    >
                      Loading latest activities...
                    </td>
                  </tr>
                )}
                {!loadingActivities && activities.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No activities yet.
                    </td>
                  </tr>
                )}
                {activities.map((a) => {
                  const status = a.status?.toUpperCase?.() ?? "";
                  const colorClass =
                    status === "COMPLETED"
                      ? "text-emerald-400"
                      : status === "SCHEDULED"
                      ? "text-amber-400"
                      : "text-sky-400";
                  return (
                    <tr key={a.id} className="hover:bg-slate-900/70">
                      <td className="px-3 py-2 whitespace-nowrap">{a.time}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{a.agent}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {a.customer || "-"}
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate">{a.activity}</td>
                      <td
                        className={`px-3 py-2 whitespace-nowrap text-[11px] ${colorClass}`}
                      >
                        {status.replace("_", " ") || "IN PROGRESS"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
