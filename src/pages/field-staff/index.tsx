import Layout from "@/components/Layout";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { Edit2, Trash2, Mail } from "lucide-react";
import toast from "react-hot-toast";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mobile?: string;
  aadhaar?: string;
  employeeCode?: number;
}

interface AgentFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  mobile: string;
  aadhaar: string;
}

export default function FieldStaffPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [emailTarget, setEmailTarget] = useState<Agent | null>(null);
  const [form, setForm] = useState<AgentFormState>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    mobile: "",
    aadhaar: "",
  });

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<Agent[]>({
    queryKey: ["field-staff", { search }],
    queryFn: async () => {
      const res = await api.get("/agents", { params: { search } });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: AgentFormState) => {
      const res = await api.post("/agents", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-staff"] });
      setIsModalOpen(false);
      toast.success("Field staff created");
    },
    onError: () => {
      toast.error("Failed to create field staff");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: AgentFormState & { id: string }) => {
      const res = await api.put(`/agents/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-staff"] });
      setIsModalOpen(false);
      toast.success("Field staff updated");
    },
    onError: () => {
      toast.error("Failed to update field staff");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-staff"] });
      setDeleteTarget(null);
      toast.success("Field staff deleted");
    },
    onError: () => {
      toast.error("Failed to delete field staff");
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/agents/${id}/send-credentials`);
    },
    onSuccess: () => {
      setEmailTarget(null);
      toast.success("Login details emailed to staff");
    },
    onError: () => {
      toast.error("Failed to send email");
    },
  });

  function openCreateModal() {
    setEditingAgent(null);
    setForm({ firstName: "", middleName: "", lastName: "", email: "", mobile: "", aadhaar: "" });
    setIsModalOpen(true);
  }

  function openEditModal(agent: Agent) {
    setEditingAgent(agent);
    const [firstName = "", lastName = ""] = (agent.name || "").split(" ");
    setForm({
      firstName,
      middleName: "",
      lastName,
      email: agent.email,
      mobile: agent.mobile || "",
      aadhaar: agent.aadhaar || "",
    });
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.mobile) {
      toast.error("First name, email and mobile are required");
      return;
    }
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Field Staff</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage your on-ground field staff and login credentials.
            </p>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="flex-1 sm:w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={openCreateModal}
              className="whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-xs sm:text-sm font-medium text-white shadow hover:bg-indigo-500"
            >
              Add Field Staff
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60">
          {isLoading && (
            <div className="px-4 py-6 text-sm text-slate-400">Loading field staff...</div>
          )}
          {isError && (
            <div className="px-4 py-6 text-sm text-red-400">Failed to load agents from /agents API.</div>
          )}
          {data && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-900/80 text-left text-[11px] font-medium text-slate-400">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.map((agent, index) => (
                    <tr key={agent.id} className="hover:bg-slate-900/70">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                        {agent.employeeCode ?? index + 1}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{agent.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{agent.email}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{agent.mobile || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-[11px] space-x-2">
                        <button
                          onClick={() => openEditModal(agent)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                          title="Edit field staff"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(agent)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-600 bg-red-950/40 text-red-400 hover:bg-red-900/70"
                          title="Delete field staff"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEmailTarget(agent)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-500 bg-sky-950/40 text-sky-400 hover:bg-sky-900/70"
                          title="Send login email"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-white">
              {editingAgent ? "Edit Field Staff" : "Add Field Staff"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              First time password will be set to the mobile number and emailed to the staff.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300">First name</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-300">Middle name</label>
                  <input
                    value={form.middleName}
                    onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-300">Last name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-300">Mobile number</label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300">Aadhaar card</label>
                <input
                  value={form.aadhaar}
                  onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingAgent ? "Save changes" : "Create staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-white">Delete field staff</h2>
            <p className="mt-2 text-xs text-slate-300">
              Are you sure you want to delete
              <span className="font-semibold"> {deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-500 disabled:opacity-60"
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {emailTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-white">Send login details</h2>
            <p className="mt-2 text-xs text-slate-300">
              Send login username and password to
              <span className="font-semibold"> {emailTarget.email}</span>?
            </p>
            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEmailTarget(null)}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => emailMutation.mutate(emailTarget.id)}
                className="rounded-md bg-sky-600 px-3 py-1.5 font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                disabled={emailMutation.isPending}
              >
                {emailMutation.isPending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
