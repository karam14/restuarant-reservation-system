"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  domain: string | null;
  settings: Record<string, any>;
}

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
});

export function TenantProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchTenant() {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", tenantSlug)
        .single();

      if (!error && data) {
        setTenant(data);
      }
      setLoading(false);
    }

    fetchTenant();
  }, [tenantSlug]);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
