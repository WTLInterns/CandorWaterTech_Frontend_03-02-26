import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { FormEvent, useEffect, useState } from "react";

interface Lead {
  id: string;
  companyName?: string;
  phone?: string;
  address?: string;
  product?: string;
  quantity?: number;
  status?: string;
  assignedAgentId?: string;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Lead>({
    queryKey: ["lead", id],
    enabled: typeof id === "string",
    queryFn: async () => {
      const res = await api.get(`/leads/${id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Lead) => {
      await api.put(`/leads/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      router.push("/leads");
    },
  });

  function handleChange<K extends keyof Lead>(key: K, value: Lead[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    try {
      await updateMutation.mutateAsync(form);
    } catch (err) {
      setError("Failed to update lead");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteMutation.mutateAsync();
    } catch (err) {
      setError("Failed to delete lead");
    }
  }

  return (
    <Layout>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Lead Details</h1>
        {isLoading && <p>Loading...</p>}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        {form && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Customer Name</label>
              <input
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={form.companyName ?? ""}
                onChange={(e) => handleChange("companyName", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                  value={form.phone ?? ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Address</label>
                <input
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                  value={form.address ?? ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Product</label>
                <input
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                  value={form.product ?? ""}
                  onChange={(e) => handleChange("product", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Quantity</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                  value={form.quantity ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "quantity",
                      e.target.value === "" ? ("" as unknown as number) : Number(e.target.value),
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                  value={form.status ?? "NEW"}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="PROPOSAL">PROPOSAL</option>
                  <option value="CLOSED_WON">CLOSED_WON</option>
                  <option value="CLOSED_LOST">CLOSED_LOST</option>
                </select>
              </div>
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
