import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

async function resolveTenant(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

function corsHeaders(domain: string | null) {
  const origin = domain ? `https://${domain}` : '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ 'tenant-slug': string }> }
) {
  const { 'tenant-slug': tenantSlug } = await params;
  const tenant = await resolveTenant(tenantSlug);
  const headers = new Headers(corsHeaders(tenant?.domain ?? null));
  return new NextResponse(null, { headers, status: 204 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ 'tenant-slug': string }> }
) {
  const { 'tenant-slug': tenantSlug } = await params;
  const tenant = await resolveTenant(tenantSlug);

  if (!tenant) {
    return new NextResponse(JSON.stringify({ error: 'Tenant not found' }), {
      status: 404,
    });
  }

  const headers = corsHeaders(tenant.domain);

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return new NextResponse(JSON.stringify({ error: 'Date is required' }), {
      status: 400,
      headers,
    });
  }

  const supabase = createClient();

  // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();

  // Attempt to fetch the specific day data
  const { data: dayData, error: dayError } = await supabase
    .from('days')
    .select('id, is_enabled')
    .eq('day_date', date)
    .eq('tenant_id', tenant.id)
    .single();

  if (dayError && dayError.code !== 'PGRST116') {
    return new NextResponse(JSON.stringify({ error: 'Error fetching day data' }), {
      status: 500,
      headers,
    });
  }

  let timeSlots: string | any[] = [];

  // Check if this specific day is explicitly disabled
  if (dayData && dayData.is_enabled === false) {
    return new NextResponse(JSON.stringify({ timeSlots: [] }), {
      status: 200,
      headers,
    });
  }

  if (dayData) {
    // It's an "afwijkende dag", fetch custom time slots
    const { data: customSlots, error: customSlotsError } = await supabase
      .from('day_time_slots')
      .select('id, time_slot_templates(slot_time)')
      .eq('day_id', dayData.id);

    if (customSlotsError) {
      return new NextResponse(JSON.stringify({ error: 'Error fetching custom time slots' }), {
        status: 500,
        headers,
      });
    }

    timeSlots = customSlots.map((slot: any) => ({
      id: slot.id,
      label: slot.time_slot_templates.slot_time,
    }));
  }

  // If no custom time slots, check weekly schedule
  if (timeSlots.length === 0) {
    const { data: weeklySchedule, error: weeklyScheduleError } = await supabase
      .from('weekly_schedule')
      .select('id, is_enabled')
      .eq('day_of_week', dayOfWeek)
      .eq('tenant_id', tenant.id)
      .single();

    if (weeklyScheduleError && weeklyScheduleError.code !== 'PGRST116') {
      return new NextResponse(JSON.stringify({ error: 'Error fetching weekly schedule' }), {
        status: 500,
        headers,
      });
    }

    // If weekly schedule exists and is disabled, return empty
    if (weeklySchedule && !weeklySchedule.is_enabled) {
      return new NextResponse(JSON.stringify({ timeSlots: [] }), {
        status: 200,
        headers,
      });
    }

    // If weekly schedule exists and is enabled, fetch its time slots
    if (weeklySchedule && weeklySchedule.is_enabled) {
      const { data: weeklySlots, error: weeklySlotsError } = await supabase
        .from('weekly_schedule_time_slots')
        .select('id, time_slot_templates(id, slot_time)')
        .eq('weekly_schedule_id', weeklySchedule.id);

      if (weeklySlotsError) {
        return new NextResponse(JSON.stringify({ error: 'Error fetching weekly time slots' }), {
          status: 500,
          headers,
        });
      }

      if (weeklySlots && weeklySlots.length > 0) {
        timeSlots = weeklySlots.map((slot: any) => ({
          id: slot.time_slot_templates.id,
          label: slot.time_slot_templates.slot_time,
        }));
      }
    }
  }

  // Fallback to all standard time slots if no weekly schedule or no weekly time slots
  if (timeSlots.length === 0) {
    const { data: standardSlots, error: standardSlotsError } = await supabase
      .from('time_slot_templates')
      .select('id, slot_time')
      .eq('tenant_id', tenant.id)
      .order('slot_time', { ascending: true });

    if (standardSlotsError) {
      return new NextResponse(JSON.stringify({ error: 'Error fetching standard time slots' }), {
        status: 500,
        headers,
      });
    }

    timeSlots = standardSlots.map((slot: any) => ({
      id: slot.id,
      label: slot.slot_time,
    }));
  }

  return new NextResponse(JSON.stringify({ timeSlots }), {
    status: 200,
    headers,
  });
}
