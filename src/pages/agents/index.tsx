import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function AgentsPage() {
  const { data, isLoading, isError } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data;
    },
  });

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Agents</h1>
          <Link
            href="/agents/new"
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            New Agent
          </Link>
        </div>
        {isLoading && <p>Loading...</p>}
        {isError && <p className="text-red-600">Failed to load agents.</p>}
        {data && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link href={`/agents/${agent.id}`} className="text-indigo-600 hover:underline">
                        {agent.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{agent.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{agent.role}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{agent.active ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
