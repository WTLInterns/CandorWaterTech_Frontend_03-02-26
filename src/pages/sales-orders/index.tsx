import Layout from "@/components/Layout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";

interface Lead {
  id: string;
  companyName?: string;
  product?: string;
  quantity?: number;
  status?: string;
  assignedAgentId?: string;
  createdAt?: string;
}

interface Page<T> {
  content: T[];
}

interface Agent {
  id: string;
  name: string;
  employeeCode: number | null;
}

export default function SalesOrdersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery<Page<Lead>>({
    queryKey: ["sales-orders", { search }],
    queryFn: async () => {
      const res = await api.get("/leads", {
        params: { page: 0, size: 50, search: search || undefined },
      });
      return res.data;
    },
    refetchInterval: 8000,
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data;
    },
  });

  const rows = data?.content ?? [];

  function getAgentName(lead: Lead): string {
    if (!agents || !lead.assignedAgentId) return "-";
    const agent = agents.find(
      (a) => a.id === lead.assignedAgentId || String(a.employeeCode ?? a.id) === lead.assignedAgentId,
    );
    return agent?.name ?? "-";
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Sales Orders</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Track all orders raised by the field and head-office teams.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order or customer"
              className="w-48 sm:w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60">
          {isLoading && (
            <div className="px-4 py-6 text-sm text-slate-400">Loading sales orders...</div>
          )}
          {isError && (
            <div className="px-4 py-6 text-sm text-red-400">
              Failed to load data. Please try again.
            </div>
          )}
          {data && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-900/80 text-left text-[11px] font-medium text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Order #</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Agent</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-900/70">
                      {/* Order # -> use lead id */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">{lead.id}</td>
                      {/* Customer -> companyName */}
                      <td className="px-3 py-2 whitespace-nowrap">{lead.companyName ?? "-"}</td>
                      {/* Agent */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">
                        {getAgentName(lead)}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2 whitespace-nowrap text-[11px]">{lead.status ?? "-"}</td>
                      {/* Amount -> quantity placeholder */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        Qty: {lead.quantity ?? "-"}
                      </td>
                      {/* Created */}
                      <td className="px-3 py-2 whitespace-nowrap text-[11px] text-slate-400">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-sm text-slate-300"
                      >
                        No leads / orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
