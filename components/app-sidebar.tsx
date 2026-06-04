"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  CalendarDays,
  Settings,
  LogOut,
  ChevronsUpDown,
  Building2,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_KEYS = [
  { key: "nav.dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { key: "nav.reservations", icon: CalendarCheck, href: "/reservations" },
  { key: "nav.timeSlots", icon: Clock, href: "/time-slots" },
  { key: "nav.schedule", icon: CalendarDays, href: "/schedule" },
  { key: "nav.settings", icon: Settings, href: "/settings" },
];

const LANGUAGES = [
  { code: "nl", label: "Nederlands" },
  { code: "en", label: "English" },
];

export function AppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();
  const { tenant } = useTenant();
  const { t, locale } = useTranslations();
  const tenantSlug = params.tenant as string;
  const [canSwitchTenant, setCanSwitchTenant] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function checkMultiTenant() {
      const userId = session!.user.id;

      const { data: superAdmin } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (superAdmin) {
        setCanSwitchTenant(true);
        return;
      }

      const { data: tenants } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .eq("user_id", userId);

      if (tenants && tenants.length > 1) {
        setCanSwitchTenant(true);
      }
    }

    checkMultiTenant();
  }, [session, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const switchLanguage = async (lang: string) => {
    if (!tenant) return;
    const { error } = await supabase
      .from("tenants")
      .update({ settings: { ...tenant.settings, locale: lang } })
      .eq("id", tenant.id);

    if (!error) {
      window.location.reload();
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href={`/${tenantSlug}/dashboard`} className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg truncate">
            {tenant?.name || tenantSlug}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_KEYS.map((item) => {
                const fullHref = `/${tenantSlug}${item.href}`;
                const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/");

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={fullHref}>
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.language")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LANGUAGES.map((lang) => (
                <SidebarMenuItem key={lang.code}>
                  <SidebarMenuButton
                    isActive={locale === lang.code}
                    onClick={() => switchLanguage(lang.code)}
                  >
                    <Globe className="h-4 w-4" />
                    <span>{lang.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {(tenant?.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{tenant?.name}</span>
                    </div>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                {canSwitchTenant && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/select-tenant">{t("nav.switchTenant")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
