import Layout from "@/components/Layout";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import Modal from "@/components/Modal";
import Input from "@/components/Input";

interface Lead {
  id: string;
  companyName?: string;
  product?: string;
  quantity?: number;
  amount?: number;
  status?: string;
  address?: string;
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      // optional toast
    }
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
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-900/70">
                      {/* Order # -> use lead id */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">{lead.id}</td>
                      {/* Customer -> companyName, click to open chat */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openChat(lead)}
                          className="text-sky-300 hover:text-sky-200 hover:underline"
                        >
                          {lead.companyName ?? "-"}
                        </button>
                      </td>
                      {/* Agent */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">
                        {getAgentName(lead)}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2 whitespace-nowrap text-[11px]">{lead.status ?? "-"}</td>
                      {/* Product */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">{lead.product ?? "-"}</td>
                      {/* Qty */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">
                        {lead.quantity ?? "-"}
                      </td>
                      {/* Amount */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">
                        {lead.amount != null ? `₹${lead.amount.toFixed(2)}` : "-"}
                      </td>
                      {/* Address */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300">{lead.address ?? "-"}</td>
                      {/* Created */}
                      <td className="px-3 py-2 whitespace-nowrap text-[11px] text-slate-400">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={9}
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

        {/* Sales order chat modal (customer name click) */}
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
                  const isAdmin = source === "ADMIN" || !source; // default to admin for old data
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
                        <div className="mt-1 text-sm whitespace-pre-wrap">
                          {c.message}
                        </div>
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
      </div>
    </Layout>
  );
}
