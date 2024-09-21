import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return new NextResponse(JSON.stringify({ error: 'Date is required' }), {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
      },
    });
  }

  const supabase = createClient();

  // Attempt to fetch the day data
  const { data: dayData, error: dayError } = await supabase
    .from('days')
    .select('id')
    .eq('day_date', date)
    .single();

  if (dayError && dayError.code !== 'PGRST116') {  // Handle no rows found error
    return new NextResponse(JSON.stringify({ error: 'Error fetching day data' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
      },
    });
  }

  let timeSlots: string | any[] = [];

  if (dayData) {
    // It's an "afwijkende dag", fetch custom time slots
    const { data: customSlots, error: customSlotsError } = await supabase
      .from('day_time_slots')
      .select('id, time_slot_templates(slot_time)')
      .eq('day_id', dayData.id);

    if (customSlotsError) {
      return new NextResponse(JSON.stringify({ error: 'Error fetching custom time slots' }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
        },
      });
    }

    timeSlots = customSlots.map((slot: any) => ({
      id: slot.id,
      label: slot.time_slot_templates.slot_time,
    }));
  }

  if (timeSlots.length === 0) {
    // It's not an "afwijkende dag" or no custom slots were found, fetch standard time slots
    const { data: standardSlots, error: standardSlotsError } = await supabase
      .from('time_slot_templates')
      .select('id, slot_time')
      .order('slot_time', { ascending: true });

    if (standardSlotsError) {
      return new NextResponse(JSON.stringify({ error: 'Error fetching standard time slots' }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
        },
      });
    }

    timeSlots = standardSlots.map((slot: any) => ({
      id: slot.id,
      label: slot.slot_time,
    }));
  }

  return new NextResponse(JSON.stringify({ timeSlots }), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
    },
  });
}
