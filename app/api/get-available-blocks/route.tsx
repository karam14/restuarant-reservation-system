import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  const supabase = createClient();

  // Check if the date is an "afwijkende dag"
  const { data: dayData, error: dayError } = await supabase
    .from('days')
    .select('id')
    .eq('day_date', date)
    .maybeSingle();

  if (dayError) {
    return NextResponse.json({ error: 'Error fetching day data' }, { status: 500 });
  }

  let timeSlots: string | any[] = [];

  if (dayData) {
    // It's an "afwijkende dag", fetch custom time slots
    const { data: customSlots, error: customSlotsError } = await supabase
      .from('day_time_slots')
      .select('id, time_slot_templates(slot_time)')
      .eq('day_id', dayData.id);

    if (customSlotsError) {
      return NextResponse.json({ error: 'Error fetching custom time slots' }, { status: 500 });
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
      return NextResponse.json({ error: 'Error fetching standard time slots' }, { status: 500 });
    }

    timeSlots = standardSlots.map((slot: any) => ({
      id: slot.id,
      label: slot.slot_time,
    }));
  }

  return NextResponse.json({ timeSlots });
}
