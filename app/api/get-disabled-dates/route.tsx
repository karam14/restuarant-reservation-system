import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return new NextResponse(JSON.stringify({ error: 'Start date and end date are required' }), {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const supabase = createClient();

  // Fetch weekly schedule to see which days of week are disabled
  const { data: weeklySchedule, error: weeklyError } = await supabase
    .from('weekly_schedule')
    .select('day_of_week, is_enabled');

  if (weeklyError) {
    return new NextResponse(JSON.stringify({ error: 'Error fetching weekly schedule' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Create a map of disabled days of week
  const disabledDaysOfWeek = new Set<number>();
  weeklySchedule?.forEach(schedule => {
    if (!schedule.is_enabled) {
      disabledDaysOfWeek.add(schedule.day_of_week);
    }
  });

  // Fetch specific days that are explicitly disabled or enabled
  const { data: specificDays, error: daysError } = await supabase
    .from('days')
    .select('day_date, is_enabled')
    .gte('day_date', startDate)
    .lte('day_date', endDate);

  if (daysError) {
    return new NextResponse(JSON.stringify({ error: 'Error fetching specific days' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Build list of disabled dates
  const disabledDates: string[] = [];
  const enabledDates: string[] = [];

  // Create a map of specific day overrides
  const specificDayMap = new Map<string, boolean>();
  specificDays?.forEach(day => {
    if (day.is_enabled !== null) {
      specificDayMap.set(day.day_date, day.is_enabled);
    }
  });

  // Generate all dates in range and check if disabled
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Check if this specific date has an override
    if (specificDayMap.has(dateString)) {
      const isEnabled = specificDayMap.get(dateString);
      if (isEnabled === false) {
        disabledDates.push(dateString);
      } else if (isEnabled === true && disabledDaysOfWeek.has(dayOfWeek)) {
        // This specific day overrides a disabled day of week
        enabledDates.push(dateString);
      }
    } else {
      // No specific override, check weekly schedule
      if (disabledDaysOfWeek.has(dayOfWeek)) {
        disabledDates.push(dateString);
      }
    }
  }

  return new NextResponse(JSON.stringify({ 
    disabledDates,
    enabledDates 
  }), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

