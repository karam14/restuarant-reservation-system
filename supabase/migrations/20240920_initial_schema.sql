-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================
-- Table: time_slot_templates
-- ============================================
CREATE TABLE public.time_slot_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    slot_time time WITHOUT TIME ZONE NOT NULL,
    max_reservations integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- Table: days
-- ============================================
CREATE TABLE public.days (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    day_date date NOT NULL UNIQUE,
    is_holiday boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_enabled boolean
);

-- ============================================
-- Table: day_time_slots
-- ============================================
CREATE TABLE public.day_time_slots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    day_id uuid REFERENCES public.days(id),
    time_slot_template_id uuid REFERENCES public.time_slot_templates(id),
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- Table: reservations
-- ============================================
CREATE TABLE public.reservations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    guest_name text NOT NULL,
    guest_email text NOT NULL,
    guest_phone text NOT NULL,
    reservation_time timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text])),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    guests_count bigint
);

-- ============================================
-- Table: reservation_time_slots
-- ============================================
CREATE TABLE public.reservation_time_slots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    reservation_id uuid REFERENCES public.reservations(id),
    day_time_slot_id uuid REFERENCES public.day_time_slots(id),
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- Table: weekly_schedule
-- ============================================
CREATE TABLE public.weekly_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    day_of_week integer NOT NULL UNIQUE CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- Table: weekly_schedule_time_slots
-- ============================================
CREATE TABLE public.weekly_schedule_time_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    weekly_schedule_id uuid NOT NULL REFERENCES public.weekly_schedule(id),
    time_slot_template_id uuid NOT NULL REFERENCES public.time_slot_templates(id),
    created_at timestamp with time zone DEFAULT now()
);
