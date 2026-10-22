# EIRO Competition Management Platform

**Progressive Web App built on Next.js 14+ · Firebase · TypeScript · Tailwind CSS**

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Firebase project with Firestore + Authentication enabled
- `npm` (with D: drive cache if C: drive space is limited)

### 2. Clone & Install
```bash
# Set npm cache to D: drive if C: is low on space
npm config set cache "D:\npm-cache"

cd D:\EIRO_PWA\eiro-app
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and fill in your Firebase credentials:
```bash
copy .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

### 4. Run Development Server
```bash
# With increased Node.js memory (recommended)
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run dev
```

Open **http://localhost:3000**

---

## 🏗️ Architecture

```
eiro-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Super Admin / District Admin screens (A01–A18)
│   │   ├── coordinator/        # School Coordinator screens (S01–S12)
│   │   ├── judge/              # Judge / Head Judge screens (J01–J06)
│   │   ├── venue/              # Venue Coordinator screens (V09–V14)
│   │   ├── events/             # Public events listing
│   │   ├── results/            # Public results page
│   │   ├── verify/             # Public certificate verification
│   │   ├── login/              # Authentication
│   │   └── signup/             # Registration
│   ├── components/
│   │   ├── ui/index.tsx        # Shared design system components
│   │   ├── layout/             # Sidebar + Header
│   │   └── PwaProvider.tsx     # Service worker registration
│   └── lib/
│       ├── types.ts            # Firestore-aligned TypeScript types
│       ├── utils.ts            # Helper utilities
│       ├── sw-register.ts      # PWA SW registration
│       └── firebase/
│           ├── config.ts       # Firebase SDK init
│           └── auth-context.tsx# Authentication context + hooks
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
├── firestore.rules             # Production security rules
├── firestore.indexes.json      # Composite indexes
└── .env.example                # Environment template
```

---

## 👤 Role-Based Access

| Role | Dashboard URL | Description |
|------|--------------|-------------|
| Super Admin | `/admin` | Full system control, all districts |
| District Admin | `/admin` | District-scoped admin |
| School Coordinator | `/coordinator` | Team registration, QR passes, results |
| Judge | `/judge` | Score submission, timed runs, matches |
| Head Judge | `/judge` | + Score verification & locking |
| Venue Coordinator | `/venue` | Check-in, payments, queue, adjustments |

---

## 📋 Competition Workflow

```
Season Setup (Admin)
  └─► District Events Created
        └─► School Registration Opens
              └─► Teams Register (Coordinator)
                    └─► Bulk CSV Upload OR Manual Entry
                          └─► Payment Verification (Cash/UPI/Bank)
                                └─► Admin Approves Schools & Teams
                                      └─► Training Days (Day 1 & Day 2)
                                            └─► Competition Day
                                                  ├─► QR Check-in
                                                  ├─► Eligibility Checks
                                                  ├─► Scoring (Matches / Timed Runs / Rubric)
                                                  ├─► Head Judge Verification & Lock
                                                  └─► Results Publication + Certificates
```

---

## 🔥 Firebase Setup

### Deploy Security Rules
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Required Firestore Collections
- `seasons` · `events` · `schools` · `teams` · `students`
- `stageEntries` · `payments` · `trainingAttendance`
- `scorecards` · `rankings` · `teamAdjustments` · `auditLog`

---

## 📱 PWA Features
- **Offline support** — Static pages and assets cached by service worker
- **Install prompt** — Add to home screen on iOS/Android
- **Push notifications** — Infrastructure ready (VAPID key needed)
- **Background sync** — Score submission retry on reconnect (stub ready)

---

## 🛠️ Production Build
```bash
npm run build
npm run start
```

Or deploy to **Vercel** (recommended):
```bash
npx vercel --prod
```

Set all `NEXT_PUBLIC_FIREBASE_*` environment variables in your Vercel project settings.

---

## 📄 License
© 2026 Evolve Robotics. All rights reserved.
