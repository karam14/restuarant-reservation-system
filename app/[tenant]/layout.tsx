"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TenantProvider } from "@/lib/tenant-context";
import { useParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  return (
    <TenantProvider tenantSlug={tenantSlug}>
      <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
            <ThemeSwitcher />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      </TooltipProvider>
      <Toaster />
    </TenantProvider>
  );
}
