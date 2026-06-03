# Restaurant Reservation System — API Integration Guide

This skill helps you integrate a restaurant's website with our reservation system API. Customers can browse available dates, pick a time slot, and book a table — all from the restaurant's own website.

## Base URL

The reservation system is hosted at:

```
https://restuarant-reservation-system.vercel.app
```

## Tenant Slug

Each restaurant on the platform has a unique **tenant slug**. This slug is part of every API URL. The restaurant admin will provide this slug when onboarding.

Use environment variables so you can develop against the test tenant and deploy against the real one:

```env
# .env.development — use the shared test tenant for development
NEXT_PUBLIC_RESERVATION_API=https://restuarant-reservation-system.vercel.app
NEXT_PUBLIC_TENANT_SLUG=test-restaurant

# .env.production — the restaurant's real tenant slug (provided by admin)
NEXT_PUBLIC_RESERVATION_API=https://restuarant-reservation-system.vercel.app
NEXT_PUBLIC_TENANT_SLUG=<your-restaurant-slug>
```

The `test-restaurant` tenant has sample data (time slots at 12:00, 13:00, 18:00, 19:00, 20:00 — closed on Sundays) so you can develop and test without affecting any real restaurant's data.

All API URLs follow the pattern: `{BASE_URL}/api/{TENANT_SLUG}/{endpoint}`

---

## API Endpoints

### 1. Get Disabled Dates

Returns which dates are unavailable (restaurant closed) within a date range. Use this to disable dates in your date picker.

```
GET /api/{tenant-slug}/get-disabled-dates?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| startDate | string | Yes | Start of range (YYYY-MM-DD) |
| endDate | string | Yes | End of range (YYYY-MM-DD) |

**Response:**
```json
{
  "disabledDates": ["2026-06-07", "2026-06-14", "2026-06-21"],
  "enabledDates": []
}
```

**Usage:** When rendering a calendar/date picker, disable all dates in `disabledDates`. Fetch this for the visible month range. For the `test-restaurant` tenant, Sundays are disabled.

---

### 2. Get Available Time Slots

Returns available time slots for a specific date. Call this after the user picks a date.

```
GET /api/{tenant-slug}/get-available-blocks?date={YYYY-MM-DD}
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| date | string | Yes | The selected date (YYYY-MM-DD) |

**Response:**
```json
{
  "timeSlots": [
    { "id": "uuid-1", "label": "12:00:00" },
    { "id": "uuid-2", "label": "13:00:00" },
    { "id": "uuid-3", "label": "18:00:00" },
    { "id": "uuid-4", "label": "19:00:00" },
    { "id": "uuid-5", "label": "20:00:00" }
  ]
}
```

**Usage:** Show these as selectable buttons or a dropdown. The `label` is in `HH:MM:SS` format — display as `HH:MM` to the user. An empty `timeSlots` array means the restaurant is closed on that date.

---

### 3. Make a Reservation

Creates a new reservation. This is the endpoint your booking form submits to.

```
POST /api/{tenant-slug}/make-reservation
Content-Type: application/json
```

**Request Body:**
```json
{
  "date": "2026-06-10",
  "block": "19:00",
  "name": "Jan de Vries",
  "email": "jan@example.com",
  "phone": "0612345678",
  "peopleCount": 4,
  "g-recaptcha-response": "recaptcha-token-here"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | string | Yes | Reservation date (YYYY-MM-DD) |
| block | string | Yes | Time slot (HH:MM format, must match an available slot from endpoint 2) |
| name | string | Yes | Guest's full name |
| email | string | Yes | Guest's email (confirmation email is sent here automatically) |
| phone | string | Yes | Guest's phone number |
| peopleCount | number | Yes | Number of guests |
| g-recaptcha-response | string | Yes | Google reCAPTCHA v2/v3 token for spam protection |

**Success Response (200):**
```json
{
  "message": "Reservation successfully made"
}
```

**Error Responses:**
| Status | Meaning |
|--------|---------|
| 400 | Missing fields, date/time unavailable, or invalid time slot |
| 404 | Tenant not found (wrong slug) |
| 500 | Server error |

**What happens after a successful reservation:**
1. Reservation is created with `status: 'pending'`
2. Guest receives a confirmation email
3. Restaurant receives a notification email
4. Restaurant admin confirms or cancels from their dashboard

---

## CORS

The API allows requests from the domain configured in the restaurant's tenant settings. During development against `test-restaurant`, CORS allows `localhost`. For production, the restaurant admin must set their website's domain in the reservation system settings so the API accepts requests from it.

---

## Typical Integration Flow

```
1. Page loads → fetch disabled dates for the visible month
   GET /api/{slug}/get-disabled-dates?startDate=2026-06-01&endDate=2026-06-30

2. User picks a date → fetch available time slots
   GET /api/{slug}/get-available-blocks?date=2026-06-10

3. User picks a slot, fills in name/email/phone/guests, submits
   POST /api/{slug}/make-reservation
   Body: { date, block, name, email, phone, peopleCount, g-recaptcha-response }

4. Show success/error message to user
```

---

## Example: React Integration

```tsx
const API = process.env.NEXT_PUBLIC_RESERVATION_API;
const SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG;

// 1. Fetch disabled dates for the calendar
async function getDisabledDates(startDate: string, endDate: string) {
  const res = await fetch(
    `${API}/api/${SLUG}/get-disabled-dates?startDate=${startDate}&endDate=${endDate}`
  );
  const data = await res.json();
  return data.disabledDates; // string[] of YYYY-MM-DD
}

// 2. Fetch time slots after user picks a date
async function getTimeSlots(date: string) {
  const res = await fetch(`${API}/api/${SLUG}/get-available-blocks?date=${date}`);
  const data = await res.json();
  return data.timeSlots; // { id: string, label: string }[]
}

// 3. Submit the reservation
async function makeReservation(form: {
  date: string;
  block: string;
  name: string;
  email: string;
  phone: string;
  peopleCount: number;
  recaptchaToken: string;
}) {
  const res = await fetch(`${API}/api/${SLUG}/make-reservation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: form.date,
      block: form.block,
      name: form.name,
      email: form.email,
      phone: form.phone,
      peopleCount: form.peopleCount,
      "g-recaptcha-response": form.recaptchaToken,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Reservation failed");
  }

  return await res.json();
}
```

## Example: Plain JavaScript / Vanilla

```html
<script>
  const API = "https://restuarant-reservation-system.vercel.app";
  const SLUG = "test-restaurant"; // swap for real slug in production

  // Fetch time slots
  fetch(`${API}/api/${SLUG}/get-available-blocks?date=2026-06-10`)
    .then(r => r.json())
    .then(data => {
      data.timeSlots.forEach(slot => {
        // slot.label = "18:00:00" — render as button
      });
    });
</script>
```

---

## Test Tenant Details

The `test-restaurant` tenant is always available for development:

- **Slug:** `test-restaurant`
- **Open days:** Monday through Saturday
- **Closed:** Sundays
- **Time slots:** 12:00, 13:00, 18:00, 19:00, 20:00
- **Sample reservations:** 3 (pending, confirmed, cancelled)

Use it freely for testing — it won't affect any real restaurant's data.
