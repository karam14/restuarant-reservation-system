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

export async function GET(req: NextRequest) {
  const caller = await verifySuperAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: userTenants, error } = await admin
    .from("user_tenants")
    .select("user_id, role")
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!userTenants || userTenants.length === 0) {
    return NextResponse.json({ users: [] });
  }

  const {
    data: { users: authUsers },
  } = await admin.auth.admin.listUsers({ perPage: 1000 });

  const authMap = new Map(authUsers.map((u) => [u.id, u]));

  const users = userTenants.map((ut) => {
    const authUser = authMap.get(ut.user_id);
    return {
      id: ut.user_id,
      email: authUser?.email || "Unknown",
      role: ut.role,
      created_at: authUser?.created_at,
      last_sign_in_at: authUser?.last_sign_in_at,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const caller = await verifySuperAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, password, role, tenantId } = await req.json();

  if (!email || !password || !role || !tenantId) {
    return NextResponse.json(
      { error: "email, password, role, and tenantId are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  let userId: string;

  const {
    data: { users: existing },
  } = await admin.auth.admin.listUsers();
  const existingUser = existing.find((u) => u.email === email);

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: createError?.message || "Failed to create user" },
        { status: 500 }
      );
    }
    userId = newUser.user.id;
  }

  const { data: existingLink } = await admin
    .from("user_tenants")
    .select("user_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .single();

  if (existingLink) {
    return NextResponse.json(
      { error: "User is already assigned to this tenant" },
      { status: 409 }
    );
  }

  const { error: linkError } = await admin.from("user_tenants").insert({
    user_id: userId,
    tenant_id: tenantId,
    role,
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ userId, email, role });
}

export async function PATCH(req: NextRequest) {
  const caller = await verifySuperAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, tenantId, role } = await req.json();

  if (!userId || !tenantId || !role) {
    return NextResponse.json(
      { error: "userId, tenantId, and role are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_tenants")
    .update({ role })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const caller = await verifySuperAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, tenantId } = await req.json();

  if (!userId || !tenantId) {
    return NextResponse.json(
      { error: "userId and tenantId are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_tenants")
    .delete()
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
