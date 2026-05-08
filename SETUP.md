# Easily — Event Ticketing System Setup Guide

## Prerequisites

- Node.js 20+
- npm
- A Supabase account (free tier: https://supabase.com)
- A Vercel account (free tier: https://vercel.com)

---

## 1. Supabase Project Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Name**: `easily-event-ticketing`
   - **Database Password**: Create a strong password (save this)
   - **Region**: Choose the closest to your event location
4. Wait for the project to provision (~2 minutes)

### 1.2 Get API Credentials

1. In your Supabase dashboard, go to **Project Settings > API**
2. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open `supabase/schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or **Ctrl+Enter**)
6. Verify all tables were created:
   - `users`
   - `tickets`
   - `activity_logs`

### 1.4 Enable Auth (Email/Password)

1. Go to **Authentication > Providers**
2. Make sure **Email** is enabled
3. Under **Email > Confirm email**: Disable (for simplicity — enable if you want email verification)
4. Go to **Authentication > Settings**:
   - **Site URL**: `http://localhost:3000` (dev) + your Vercel URL (prod)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback` and `https://your-domain.vercel.app/auth/callback`

### 1.5 Create the First Master Admin

Since the schema creates a placeholder admin, you need to create a real user:

1. Go to **Authentication > Users**
2. Click **Add User**
3. Enter:
   - **Email**: `admin@easily.com` (or your preferred email)
   - **Password**: Choose a strong password
4. Click **Create User**
5. Go to **Table Editor > users**
6. Click **Insert row**
7. Fill in:
   - `id`: Copy the user's ID from Authentication > Users
   - `email`: Same email you just used
   - `password_hash`: Leave as empty string `""`
   - `role`: `master_admin`
   - `name`: `Master Admin`
   - `is_active`: `true`
8. Click **Save**

Alternatively, use the SQL Editor:

```sql
-- First, find the user's ID from auth.users
SELECT id, email FROM auth.users;

-- Then insert into public.users
INSERT INTO public.users (id, email, password_hash, role, name, is_active)
VALUES ('the-uuid-from-above', 'admin@easily.com', '', 'master_admin', 'Master Admin', true);
```

---

## 2. Local Development Setup

### 2.1 Clone and Install

```bash
git clone <your-repo-url> event-ticketing
cd event-ticketing
npm install
```

### 2.2 Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace the values with what you copied from Step 1.2.

### 2.3 Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2.4 Login

Sign in with the master admin credentials you created in Step 1.5.

---

## 3. Deploy to Vercel

### 3.1 Push to GitHub

```bash
git init
git add .
git commit -m "initial commit: event ticketing system"
git remote add origin https://github.com/your-username/event-ticketing.git
git push -u origin main
```

### 3.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New > Project**
3. Import your GitHub repository
4. Under **Environment Variables**, add the same three variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**

### 3.3 Update Supabase Redirect URLs

1. Go to your Supabase dashboard > **Authentication > Settings**
2. Under **Redirect URLs**, add:
   - `https://your-project.vercel.app/auth/callback`

---

## 4. Creating Staff & Scanner Users

### 4.1 Via the Dashboard (Master Admin Only)

1. Log in as master admin
2. Go to **Users** from the dashboard
3. Click **+ Add User**
4. Fill in name, email, password, and role
5. Click **Create User**

### 4.2 Via Supabase Dashboard

1. Go to **Authentication > Users > Add User**
2. Create the user with email/password
3. Go to **Table Editor > users**
4. Insert a new row with the user's ID, email, role (`staff_admin` or `scanner`), and name

---

## 5. Daily Operations

### Creating Tickets
1. Staff/Master admin clicks **Create**
2. Enters visitor name (required)
3. (Optional) Adds notes
4. Clicks **Generate Ticket**
5. Downloads QR as PNG or PDF
6. Sends to attendee manually via WhatsApp/email

### Scanning at Entry
1. Scanner/Staff opens **Scan**
2. Clicks **Start Scanning**
3. Points camera at attendee's QR code
4. Result appears: VALID / INVALID / ALREADY USED
5. Valid tickets are automatically marked as checked in

### Lost QR Recovery
1. Staff/Master opens **Find Ticket**
2. Searches by visitor name or ticket code
3. Clicks **Re-download QR** on the matching ticket
4. Sends the new QR to the attendee

### Editing a Ticket Name (Master Admin Only)
1. Go to **Tickets**
2. Find the ticket
3. Click **Edit** next to the name
4. Enter the new name and save
5. Change is logged in activity logs

### Revoking a Ticket (Master Admin Only)
1. Go to **Tickets**
2. Find the ticket
3. Click **Revoke**
4. Ticket becomes invalid for entry

---

## 6. Project Structure

```
event-ticketing/
├── app/
│   ├── api/
│   │   ├── scan/             # Atomic check-in endpoint
│   │   └── users/create/     # User creation endpoint
│   ├── auth/callback/        # Supabase auth callback
│   ├── dashboard/            # Protected dashboard routes
│   │   ├── create/           # Ticket creation page
│   │   ├── logs/             # Activity logs (master only)
│   │   ├── scan/             # QR scanner page
│   │   ├── search/           # Lost QR recovery
│   │   ├── tickets/          # Ticket management
│   │   ├── users/            # User management (master only)
│   │   ├── layout.tsx        # Dashboard layout (auth check)
│   │   └── page.tsx          # Role-based home
│   ├── globals.css           # Tailwind + custom theme
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Login page
├── components/
│   ├── Header.tsx            # App header with branding
│   ├── Footer.tsx            # Footer with "Powered by..."
│   ├── Navigation.tsx        # Role-based bottom nav
│   ├── StaffDashboard.tsx    # Staff home screen
│   ├── MasterDashboard.tsx   # Master home screen + stats
│   └── ScannerDashboard.tsx  # Scanner redirect
├── lib/
│   └── supabase/
│       ├── admin.ts          # Service role client (server-only)
│       ├── client.ts         # Browser client
│       ├── middleware.ts     # Proxy helper for auth
│       └── server.ts         # Server component client
├── supabase/
│   └── schema.sql            # Full DB schema + RLS + triggers
├── proxy.ts                  # Auth + role protection (Next.js 16)
├── SETUP.md                  # This file
├── .env.local.example        # Environment template
└── package.json
```

---

## 7. Free Tier Limits

| Service | Limit | Our Usage |
|---------|-------|-----------|
| Supabase DB | 500 MB | ~5 MB for 350 tickets |
| Supabase Auth | 50,000 users | 5-10 users |
| Vercel Functions | 100 GB-hours | Well within limit |
| Vercel Bandwidth | 100 GB | Minimal |
| Vercel Builds | 6,000 min/mo | ~2 min per build |

---

## 8. Security Notes

- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is never exposed to the browser. It's only used server-side in the users API route and in Supabase dashboard.
- **RLS policies** prevent unauthorized access at the database level.
- **activity_logs** are protected by database triggers — no one can UPDATE or DELETE logs.
- **Atomic check-in** prevents race conditions where two scanners check the same ticket simultaneously.
- **Proxy** (`proxy.ts`) protects routes based on user role. Logs and Users pages are master-admin-only.

---

## 9. Troubleshooting

**Login says "Invalid login credentials"**
- Make sure the user exists in both `auth.users` AND `public.users`
- Check that the password is correct

**QR scanner shows "Camera access denied"**
- Use HTTPS (required for camera access)
- On HTTP localhost, camera works but some browsers require HTTPS

**Build fails with TypeScript errors**
- Run `npm run build` locally first
- Check for any type mismatches

**Tables not found**
- Make sure you ran the full `schema.sql` in Supabase SQL Editor
- Check that the tables appear in Table Editor
