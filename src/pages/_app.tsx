import type { AppProps } from "next/app";
import "../styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/lib/authStore";

const PUBLIC_ROUTES = ["/", "/auth/login"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  // Wait for zustand persist to hydrate from localStorage
  useEffect(() => {
    // `persist` middleware attaches a `persist` helper on the store
    const unsub = (useAuthStore as any).persist?.onFinishHydration?.(() => {
      setHydrated(true);
    });

    if ((useAuthStore as any).persist?.hasHydrated?.()) {
      setHydrated(true);
    }

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (PUBLIC_ROUTES.includes(router.pathname)) return;
    if (!isAuthenticated) {
      router.replace("/");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated && !PUBLIC_ROUTES.includes(router.pathname)) {
    // Avoid flicker while we don't yet know auth state
    return null;
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) {
    return null;
  }

  return <>{children}</>;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
