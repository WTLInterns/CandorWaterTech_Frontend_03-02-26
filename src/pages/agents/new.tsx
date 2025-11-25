import Layout from "@/components/Layout";
import { FormEvent, useState } from "react";
import api from "@/lib/apiClient";
import { useRouter } from "next/router";

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/agents", {
        name,
        email,
        passwordHash: password,
      });
      router.push("/agents");
    } catch (err) {
      setError("Failed to create agent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">New Agent</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-sm px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Agent"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
