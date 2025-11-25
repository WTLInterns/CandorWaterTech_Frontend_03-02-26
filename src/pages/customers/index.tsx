import Layout from "@/components/Layout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";

interface Customer {
  id: string;
  name: string;
  segment?: string;
  city?: string;
  contactName?: string;
  phone?: string;
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery<Customer[]>({
    queryKey: ["customers", { search }],
    queryFn: async () => {
      const res = await api.get("/customers", { params: { search } });
      return res.data;
    },
  });

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Customers</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage key accounts and retail outlets in your territory.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city, or contact"
            className="w-full sm:w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60">
          {isLoading && (
            <div className="px-4 py-6 text-sm text-slate-400">Loading customers...</div>
          )}
          {isError && (
            <div className="px-4 py-6 text-sm text-red-400">
              Failed to load customers. Ensure /customers API is implemented.
            </div>
          )}
          {data && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-900/80 text-left text-[11px] font-medium text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Segment</th>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-900/70">
                      <td className="px-3 py-2 whitespace-nowrap">{customer.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{customer.segment ?? "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{customer.city ?? "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{customer.contactName ?? "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{customer.phone ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
