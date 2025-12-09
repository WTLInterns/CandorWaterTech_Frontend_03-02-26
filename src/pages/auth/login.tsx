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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F69FF] to-[#3AA0FF] px-4 font-[system-ui,_-apple-system,BlinkMacSystemFont,Inter,Roboto,Segoe_UI,sans-serif]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-5xl rounded-[32px] overflow-hidden shadow-[0_32px_60px_rgba(15,23,42,0.35)] backdrop-blur-sm bg-white/90"
      >
        <div className="grid grid-cols-1 md:grid-cols-[480px_minmax(0,1fr)] min-h-[600px] relative">
          {/* LEFT PANEL – BRANDING */}
          <div className="relative text-white px-16 py-16 flex flex-col justify-between bg-transparent">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 opacity-30">
              <img
                src="/3139256.jpg"
                alt="Background"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0F69FF] to-[#3AA0FF] mix-blend-multiply"></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="text-center relative z-10">
                {/* centered logo */}
                <div className="flex justify-center mb-10">
                  <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-2">
                    <img
                      src="/CWT%20New%20Logo%201.jpeg"
                      alt="Candor Water Tech logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                {/* welcome text */}
                <div className="space-y-4 max-w-sm mx-auto">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/80">
                    Welcome to
                  </p>
                  <h1 className="text-4xl font-semibold leading-tight">
                    Candor Water Tech
                  </h1>
                  <p className="text-sm leading-relaxed text-white/80 px-4">
                    Sign in to your central workspace for sales performance,
                    field activity, and live location monitoring.
                  </p>
                </div>
              </div>

              {/* footer */}
              <div className="text-center text-xs text-white/60 relative z-10">
                2025 Candor Water Tech. All rights reserved.
              </div>
            </div>
          </div>

          {/* RIGHT PANEL – LOGIN FORM */}
          <div className="relative bg-white/95 backdrop-blur-sm px-16 py-16 flex flex-col justify-center text-slate-800">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                Login to your account
              </h2>
              <p className="text-sm text-slate-500">
                Use your Candor Water Tech credentials to continue.
              </p>
            </div>

            {serverError && (
              <div className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {serverError}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Username */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">
                  Username
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your username or email"
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-2 pt-0 text-[15px] text-slate-800 placeholder-slate-400 focus:border-b-2 focus:border-[#0F69FF] focus:outline-none focus:ring-0"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-2 pt-0 text-[15px] text-slate-800 placeholder-slate-400 focus:border-b-2 focus:border-[#0F69FF] focus:outline-none focus:ring-0"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between text-xs mt-2">
                <label className="inline-flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#0F69FF] focus:ring-[#0F69FF]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-[#0F69FF] font-medium hover:underline text-sm"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Login button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-[#0F69FF] to-[#3AA0FF] text-white font-medium text-sm shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-200"
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-slate-500">Or continue with</span>
                </div>
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {/* Google */}
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
                    G
                  </span>
                  <span>Google</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-sm font-semibold text-white">
                    f
                  </span>
                  <span>Facebook</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
          