# Medaura — Medical Booking Platform

Medaura is a modern, Arabic-first healthcare booking platform that connects patients with doctors, clinics, and medical specialists across Egypt. It provides a seamless experience for booking appointments, managing medical records, and communicating with healthcare providers.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Frontend    | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Auth        | JWT (access + refresh tokens), HttpOnly cookies |
| API Pattern | Backend-for-Frontend (BFF) — Next.js API routes proxy to the Clynk backend |
| Backend     | [Clynk](https://github.com/Mohamed-Khayyal/Clynk) — Node.js / Express / MongoDB |
| Deployment  | Vercel (frontend) + Vercel Serverless (backend) |
| Fonts       | Google Fonts — Cairo (Arabic), Geist (Latin)   |
| UI          | Framer Motion, Swiper, SweetAlert2, Lucide Icons |

---

## Features

### Patient
- Browse doctors and clinics by specialty, rating, price, and location
- View full doctor profiles with ratings, availability, and pricing
- Book appointments by selecting a date and available time slot
- View and manage upcoming and past appointments
- Request prescription access from their doctor
- Rate and review doctors after visits
- Real-time booking notifications

### Doctor / Staff
- Personal dashboard with appointment statistics and weekly charts
- View today's appointments and patient lists
- Manage prescription requests
- Profile settings (photo, specialty, pricing, working hours)

### Clinic Owner
- Clinic dashboard with staff management
- Approve or reject staff members
- View clinic bookings and financial summaries
- Profit-sharing and transaction reports

### Admin
- Full user management (doctors, staff, clinics, patients)
- Verify or reject doctor and clinic registrations
- Audit log dashboard with IP geolocation, actor identity, and request history
- Real-time audit stats

---

## Project Structure

```
medaura/
├── app/
│   ├── (auth)/          # Login, Register, Forgot Password pages
│   ├── (site)/          # Public patient-facing pages
│   │   ├── doctors/     # Doctor listing + [id] profile page
│   │   ├── clinics/     # Clinic listing + [id] page
│   │   ├── specialties/ # Specialty browser
│   │   └── appointments/
│   ├── api/             # BFF API route handlers (proxy to Clynk backend)
│   ├── dashboard/       # Admin dashboard
│   ├── doctorDash/      # Doctor dashboard
│   ├── clinicDash/      # Clinic owner dashboard
│   └── providers/       # ThemeProvider, AuthContext
├── components/
│   ├── home/            # Homepage sections (Hero, BestDoctors, Specialties...)
│   ├── booking/         # DatePicker, TimePicker, ValidationModal
│   └── ui/              # Shared UI components
├── lib/
│   ├── api/             # API service clients (doctors, clinics, auth...)
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helpers and error handlers
├── locales/             # Arabic / English translation strings (i18n)
├── context/             # Auth context
└── public/              # Static assets (images, logo)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A running instance of the [Clynk backend](https://github.com/Mohamed-Khayyal/Clynk)

### Setup

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-clynk-backend.vercel.app
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment

The app is deployed on **Vercel** and automatically deploys on every push to `main`.

- **Frontend (Medaura):** https://medaura-pi.vercel.app
- **Backend (Clynk):** https://clynk.vercel.app

> TypeScript and ESLint build errors are intentionally suppressed in `next.config.js` to allow deployment while the codebase is actively being refactored. This does not affect runtime behavior.

---

## API Architecture (BFF Pattern)

All frontend pages call `/api/*` routes inside Next.js. These route handlers act as a secure proxy:

1. Read the authenticated user cookie (`jwt`)
2. Forward the request — including the real client IP via `x-forwarded-for` — to the Clynk backend
3. Return the response to the browser

This ensures backend API keys, tokens, and credentials are never exposed to the browser.

---

## License

Proprietary — All rights reserved © 2025 Mohamed Khayyal.
