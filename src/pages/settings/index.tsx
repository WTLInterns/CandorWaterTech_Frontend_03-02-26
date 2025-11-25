import Layout from "@/components/Layout";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/lib/authStore";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    // Wire to a real /users/me profile update endpoint when available
    console.log("Profile update", values);
    alert("Profile update submitted (mock). Wire this to backend when ready.");
  }

  return (
    <Layout>
      <div className="max-w-xl space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Update your profile information and credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">Full Name</label>
            <input
              {...register("name")}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">Email</label>
            <input
              type="email"
              {...register("email")}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">New Password</label>
            <input
              type="password"
              {...register("password")}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
            <p className="text-[11px] text-slate-500">
              Leave blank to keep your existing password.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-lg shadow-indigo-600/40 transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
