import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

async function verifySuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  return superAdmin ? user : null;
}

export async function POST(req: NextRequest) {
  const caller = await verifySuperAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const {
    name,
    slug,
    email: tenantEmail,
    domain,
    logoUrl,
    brandColor,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
    adminEmail,
    adminPassword,
  } = await req.json();

  if (!name || !slug || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "name, slug, adminEmail, and adminPassword are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existingTenant) {
    return NextResponse.json(
      { error: "A restaurant with this slug already exists" },
      { status: 409 }
    );
  }

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name,
      slug,
      email: tenantEmail || null,
      domain: domain || null,
      logo_url: logoUrl || null,
      brand_color: brandColor || "#4CAF50",
      smtp_host: smtpHost || null,
      smtp_port: smtpPort || 587,
      smtp_user: smtpUser || null,
      smtp_pass: smtpPass || null,
      smtp_secure: smtpSecure ?? true,
      settings: { locale: "nl" },
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: tenantError?.message || "Failed to create tenant" },
      { status: 500 }
    );
  }

  let userId: string;

  const {
    data: { users: existing },
  } = await admin.auth.admin.listUsers();
  const existingUser = existing.find((u) => u.email === adminEmail);

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: newUser, error: userError } =
      await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

    if (userError || !newUser.user) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        { error: userError?.message || "Failed to create admin user" },
        { status: 500 }
      );
    }
    userId = newUser.user.id;
  }

  const { error: linkError } = await admin.from("user_tenants").insert({
    user_id: userId,
    tenant_id: tenant.id,
    role: "admin",
  });

  if (linkError) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    admin: { email: adminEmail, userId },
  });
}
