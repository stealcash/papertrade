# PaperTrade Admin Frontend

Admin portal for managing PaperTrade platform.

## Features
- Admin & Superadmin authentication
- User management
- System configuration (superadmin only)
- Analytics dashboard

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and set `NEXT_PUBLIC_API_URL` to your Django backend URL.

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Access admin portal:**
   Open http://localhost:4000

## Credentials
Only users with `admin` or `superadmin` role can log in.

## Port
Runs on port **4000** (different from main user frontend on 3000)

## Scripts
- `npm run dev` - Start development server on port 4000
- `npm run build` - Build for production
- `npm start` - Start production server
