import { useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/apiClient";
import { useAuthStore } from "@/lib/authStore";

const loginSchema = z.object({
  username: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const res = await api.post("/auth/login", values);
      setUser(res.data);
      router.push("/dashboard");
    } catch (err: any) {
      setServerError("Invalid email or password");
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl"
          animate={{ x: [0, 40, -20, 0], y: [0, 20, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-sky-500/30 blur-3xl"
          animate={{ x: [0, -30, 10, 0], y: [0, -10, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">FieldForcePro</h1>
          <p className="text-sm text-slate-400">
            Sign in to manage your sales, field staff, and real-time activity.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-xl shadow-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-medium">Welcome back</h2>
            <p className="text-xs text-slate-400">
              Use your work email and password to access the dashboard.
            </p>
          </div>

          {serverError && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {serverError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-xs text-red-400">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/40 transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
