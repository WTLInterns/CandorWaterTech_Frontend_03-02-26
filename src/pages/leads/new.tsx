import Layout from "@/components/Layout";
import { FormEvent, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useRouter } from "next/router";

interface Agent {
  id: string;
  name: string;
  employeeCode: number | null;
}

export default function NewLeadPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [status, setStatus] = useState("NEW");
  const [assignedAgentId, setAssignedAgentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAgents() {
      const res = await api.get<Agent[]>("/agents");
      setAgents(res.data);
    }
    loadAgents();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/leads", {
        companyName,
        phone,
        address,
        product,
        quantity: quantity === "" ? null : Number(quantity),
        status,
        assignedAgentId: assignedAgentId || null,
      });
      router.push("/leads");
    } catch (err) {
      setError("Failed to create lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">New Lead</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Customer Name</label>
            <input
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <input
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Product</label>
              <input
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
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
          <div>
            <label className="block text-sm font-medium text-slate-700">Assign to Agent</label>
            <select
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
              value={assignedAgentId}
              onChange={(e) => setAssignedAgentId(e.target.value)}
            >
              <option value="">-- Select Agent --</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.employeeCode ? `(ID: ${a.employeeCode})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Lead"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
