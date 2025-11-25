import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { FormEvent, useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function AgentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Agent>({
    queryKey: ["agent", id],
    enabled: typeof id === "string",
    queryFn: async () => {
      const res = await api.get(`/agents/${id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Agent) => {
      await api.put(`/agents/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      router.push("/agents");
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    try {
      await updateMutation.mutateAsync(form);
    } catch (err) {
      setError("Failed to update agent");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteMutation.mutateAsync();
    } catch (err) {
      setError("Failed to delete agent");
    }
  }

  return (
    <Layout>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Agent Details</h1>
        {isLoading && <p>Loading...</p>}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        {form && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <input
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={form.active ? "Active" : "Inactive"}
                readOnly
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
