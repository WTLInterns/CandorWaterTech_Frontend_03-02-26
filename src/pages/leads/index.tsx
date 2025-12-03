import Layout from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import Modal from "@/components/Modal";
import Input from "@/components/Input";

interface Lead {
  id: string;
  companyName?: string; // customer name / company
  phone?: string;
  address?: string;
  product?: string;
  quantity?: number;
  status?: string;
  assignedAgentId?: string;
}

interface Agent {
  id: string;
  name: string;
  employeeCode: number | null;
}

interface Page<T> {
  content: T[];
}

export default function LeadsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Lead | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { data, isLoading, isError } = useQuery<Page<Lead>>({
    queryKey: ["leads"],
    queryFn: async () => {
      const res = await api.get("/leads", { params: { page: 0, size: 50 } });
      return res.data;
    },
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSelected(null);
    },
  });

  function getAgentName(lead: Lead): string {
    if (!agents || !lead.assignedAgentId) return "-";
    const agent = agents.find(
      (a) => a.id === lead.assignedAgentId || String(a.employeeCode ?? a.id) === lead.assignedAgentId,
    );
    return agent?.name ?? "-";
  }

  const canSend = useMemo(() => message.trim().length > 0 && !!chatLead, [message, chatLead]);

  async function openChat(lead: Lead) {
    setChatLead(lead);
    setChatOpen(true);
    setCommentLoading(true);
    try {
      const res = await api.get(`/leads/${lead.id}/comments`);
      setComments(res.data || []);
    } catch (e) {
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  }

  async function sendMessage() {
    const text = message.trim();
    if (!text || !chatLead) return;
    try {
      const res = await api.post(`/leads/${chatLead.id}/comments`, { message: text, source: "ADMIN" });
      setComments((prev) => [...prev, res.data]);
      setMessage("");
    } catch (e) {
      // optional: toast in future
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Leads</h1>
          <button
            onClick={() => router.push("/leads/new")}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Lead
          </button>
        </div>
        {isLoading && <p>Loading...</p>}
        {isError && <p className="text-red-600">Failed to load leads.</p>}
        {data && (
          <div className="overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/60">
            <table className="min-w-full text-sm text-slate-100">
              <thead className="bg-slate-800/80 text-left text-xs font-semibold text-slate-200">
                <tr>
                  <th className="px-4 py-2">Lead ID</th>
                  <th className="px-4 py-2">Customer Name</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Quantity</th>
                  <th className="px-4 py-2">Agent</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.content.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/60">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-300">
                      {lead.id}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{lead.companyName ?? "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{lead.product ?? "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{lead.quantity ?? "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{getAgentName(lead)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{lead.status ?? "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          className="rounded border border-slate-500 px-2 py-1 text-xs hover:bg-slate-700"
                          onClick={() => setSelected(lead)}
                        >
                          View
                        </button>
                        <button
                          className="rounded border border-indigo-500 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-600/20"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border border-emerald-500 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-600/20"
                          onClick={() => openChat(lead)}
                        >
                          Chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.content.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-300"
                    >
                      No leads found. Please add a lead.
                    </td>
                  </tr>
                )}

        {/* Lead Chat Modal */}
        <Modal
          open={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setComments([]);
            setMessage("");
            setChatLead(null);
          }}
          title={chatLead ? `Conversation: ${chatLead.companyName || chatLead.id}` : "Conversation"}
          footer={
            <>
              <button
                className="rounded border border-slate-500 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
                onClick={() => {
                  setChatOpen(false);
                  setComments([]);
                  setMessage("");
                  setChatLead(null);
                }}
              >
                Close
              </button>
              <button
                className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                onClick={sendMessage}
                disabled={!canSend}
              >
                Send
              </button>
            </>
          }
        >
          <div className="flex flex-col h-80">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {commentLoading ? (
                <div className="text-sm text-slate-400">Loading messages…</div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-slate-400">No messages yet.</div>
              ) : (
                comments.map((c: any) => {
                  const source = (c.source as string | undefined)?.toUpperCase() ?? "";
                  const isAdmin = source === "ADMIN" || !source;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-start gap-2 ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      {!isAdmin && (
                        <div className="shrink-0 h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold">
                          A
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-md px-3 py-2 ${
                          isAdmin ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-900"
                        }`}
                      >
                        <div className="text-[11px] flex items-center justify-between opacity-80">
                          <span>{isAdmin ? "Admin" : (c.agentName || "Agent")}</span>
                          <span>
                            {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <div className="mt-1 text-sm whitespace-pre-wrap">{c.message}</div>
                      </div>
                      {isAdmin && (
                        <div className="shrink-0 h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                          A
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                label=""
                placeholder="Write a message…"
                value={message}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && canSend) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
          </div>
        </Modal>
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-slate-900 text-slate-100 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="text-lg font-semibold">Lead Details</h2>
                <button
                  className="text-slate-400 hover:text-slate-200"
                  onClick={() => setSelected(null)}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold">Customer:</span> {selected.companyName ?? "-"}
                </div>
                <div>
                  <span className="font-semibold">Phone:</span> {selected.phone ?? "-"}
                </div>
                <div>
                  <span className="font-semibold">Address:</span> {selected.address ?? "-"}
                </div>
                <div>
                  <span className="font-semibold">Product:</span> {selected.product ?? "-"}
                </div>
                <div>
                  <span className="font-semibold">Quantity:</span> {selected.quantity ?? "-"}
                </div>
                <div>
                  <span className="font-semibold">Agent:</span> {getAgentName(selected)}
                </div>
                <div>
                  <span className="font-semibold">Status:</span> {selected.status ?? "-"}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-sm">
                <div className="space-x-2">
                  <button
                    onClick={() => router.push(`/leads/${selected.id}`)}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(selected.id)}
                    className="inline-flex items-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    🗑 Delete
                  </button>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-slate-300 hover:text-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
