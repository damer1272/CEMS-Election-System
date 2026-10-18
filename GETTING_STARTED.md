# CEMS Election Management System — Getting Started

Step-by-step guide to run the app and open the admin panel.

---

## Prerequisites

- **Node.js** (v18 or newer recommended)
- **npm** (comes with Node.js)

> This project uses `npm`. You do **not** need `pnpm`.

---

## Step 1: Open the project folder

Open a terminal (PowerShell or Command Prompt) and go to the project directory:

```powershell
cd "C:\Users\HP\Downloads\CEMS Election Management System"
```

---

## Step 2: Install dependencies (first time only)

Run this once, before starting the server for the first time:

```powershell
npm install
```

Wait until it finishes without errors.

---

## Step 3: Start the development server

```powershell
npm run dev
```

You should see output similar to:

```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8443/
```

Keep this terminal window open while you use the app.

---

## Step 4: Open the app in your browser

| Page | URL | Description |
|------|-----|-------------|
| **Home / Live Results** | http://localhost:8443 | Public leaderboard and QR code for voters |
| **Voting** | http://localhost:8443/vote | Where voters cast their ballots |
| **Admin Login** | http://localhost:8443/admin/login | Admin sign-in page |
| **Admin Dashboard** | http://localhost:8443/admin | Admin panel (after login) |

---

## Step 5: Open the admin panel

### Option A — Direct link

Go to: **http://localhost:8443/admin/login**

### Option B — From the home page

1. Open http://localhost:8443
2. Scroll to the footer (bottom of the page)
3. Click **Admin Login →**

---

## Step 6: Log in

Use these credentials:

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `admin123` |

Click **Sign In**. You will be redirected to the admin dashboard at `/admin`.

> If you visit `/admin` without logging in, you are automatically sent back to the login page.

---

## Admin panel overview

After logging in, the sidebar gives access to:

- **Dashboard** — Election stats and live overview
- **Candidates** — Add CSG candidates who already won block offices (Rep / Secretary / Treasurer) in their course
- **Participants** — Manage registered voters (all students eligible to vote for CSG)
- **QR Codes** — Generate voting QR codes
- **Votes** — View cast votes
- **Results** — Election results
- **Settings** — Open/close election, configure CSG titles and dates
- **Admin Users** — Manage admin accounts
- **Audit Logs** — Activity history

> **Parliamentary note:** Block elections (per course) happen outside this system. Only those block winners are entered as CSG candidates here.

To log out, use the **Logout** button at the bottom of the sidebar.

---

## Other useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |

---

## Troubleshooting

**`pnpm` is not recognized**  
Use `npm` instead of `pnpm` for all commands.

**Port 8443 already in use**  
Stop any other process using that port, or set a different port:

```powershell
$env:PORT=3000; npm run dev
```

Then open http://localhost:3000 instead.

**Page does not load**  
Make sure `npm run dev` is still running and there are no errors in the terminal.
