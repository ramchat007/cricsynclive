🏗️ The Ultimate V2 Architecture Blueprint
We are organizing the Next.js 15 App Router into 4 secure, scalable Zones.

Zone 1: The Public & Monetization Shell (public)
/ (Homepage, Features, CTA)

/pricing [NEW] (Premium subscription plans and Razorpay checkout)

/about & /contact

/stats (Global Stats)

/login & /signup (Supabase Auth portal)

/register/[tournamentId] [NEW] (Public form for players to register for a specific tournament, upload their Cloudinary headshot, and pay an entry fee if required).

Zone 2: The Tournament Management Hub (dashboard)
/dashboard (Live / Upcoming / Completed / My Tournaments)

/t/[tournamentId] (The Tournament Public/Admin Page)

Tabs: Matches | Bracket | Teams | Players [NEW] | Points | Stats | Admin

Admin Setup: Team Branding (Cloudinary logos), Tournament Banners (Cloudinary).

Access Control: [NEW] Add emails to assign roles (Admin or Scorer).

Zone 3: The Control Consoles (console) -> Secure, Role-Based Access
/match/[matchId] (✅ CORE MATH BUILT) -> Only accessible to Admin or Scorer.

/auction/[tournamentId] -> (Pulls players directly from the /register forms).

/controller/[matchId] -> (The OBS Overlay Manager - Gated behind Premium tier).

Zone 4: The OBS Broadcast Endpoints (broadcast)
/broadcast/ticker/[matchId]

/broadcast/spotlight/[matchId] (Now displays high-res Cloudinary player headshots).

/broadcast/banner/[matchId] (Custom Cloudinary break banners).

🗺️ The 7-Phase Execution Plan
To build a SaaS platform of this scale without the database breaking, we must execute in this exact order:

Phase 1: Auth, Roles, & Revenue (The Foundation)
Set up Supabase Auth.

Create the profiles table and the user_roles linking table (Admin vs. Scorer).

Build the /pricing page and integrate your payment gateway to unlock "Premium" database flags for paying users.

Phase 2: Tournament Hub & Media (The Cloudinary Phase)
Create tournaments and teams tables.

Wire up the Cloudinary Upload API in Next.js.

Build the UI to create a tournament and upload Team Logos and Tournament Banners.

Phase 3: The Public Registration Portal
Build the /register/[tournamentId] page.

Allow players to fill out their stats (Batting style, Bowling style) and upload a profile photo via Cloudinary.

Build the "Players" tab in the dashboard so the Admin can approve/reject registrations.

Phase 4: The Franchise Auction Console
Because Phase 3 is done, the Auction console automatically populates with registered players and their headshots.

Build the Live WebSockets Auction room (Sold/Unsold, Purse deduction, Squad auto-assignment).

Phase 5: The Match Engine (✅ Core Math Completed)
Wire our existing Live Scorer to Phase 2 and Phase 3 so it automatically fetches the real Team Names, Cloudinary Logos, and Registered Squads.

Phase 6: The Premium TV Broadcast Suite (OBS Studio Integration)
Gated for Premium Users only.

Build the Overlay Controller UI to trigger graphics manually.

Build the transparent OBS screens (Ticker, Break Banners, Player Spotlight with photos).

Phase 7: Post-Match Automations
Build the Points Table automator (Wins, Losses, NRR).

Build the interactive Knockout Bracket UI.

Build the Global Orange Cap/Purple Cap leaderboards.
