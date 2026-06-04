"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ChevronRight, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantInfo {
  tenant_id: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function SelectTenantPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allTenants, setAllTenants] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function fetchTenants() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: superAdmin } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (superAdmin) {
        setIsSuperAdmin(true);
        const { data: all } = await supabase
          .from("tenants")
          .select("id, name, slug")
          .order("name");
        setAllTenants(all || []);
      } else {
        const { data: userTenants } = await supabase
          .from("user_tenants")
          .select("tenant_id, role, tenant:tenants(id, name, slug)")
          .eq("user_id", user.id);

        const list = (userTenants || []) as unknown as TenantInfo[];
        if (list.length === 1) {
          router.push(`/${list[0].tenant.slug}/dashboard`);
          return;
        }
        setTenants(list);
      }

      setLoading(false);
    }

    fetchTenants();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md space-y-4 p-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  const items = isSuperAdmin
    ? allTenants.map((t) => ({ slug: t.slug, name: t.name, role: "super_admin" }))
    : tenants.map((t) => ({
        slug: t.tenant.slug,
        name: t.tenant.name,
        role: t.role,
      }));

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md space-y-4 p-4">
        <div className="text-center space-y-2">
          <Building2 className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Kies een restaurant</h1>
          <p className="text-muted-foreground text-sm">
            Selecteer het restaurant dat u wilt beheren
          </p>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <Card
              key={item.slug}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/${item.slug}/dashboard`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.role}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}

          {isSuperAdmin && (
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors border-dashed"
              onClick={() => router.push("/onboarding")}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <PlusCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Nieuw restaurant</p>
                    <p className="text-xs text-muted-foreground">
                      Onboard een nieuw restaurant
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
