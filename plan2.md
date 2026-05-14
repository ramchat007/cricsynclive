Phase 1: Frictionless Onboarding (The Free Hook)

Next Task: Build the "Quick Match Start" flow. A user should be able to land on the homepage, click "Start Match", enter two team names, and instantly jump into the scoring interface without having to create a full tournament, define squads, or register players.

Why: This is how you get them hooked. Once they score one match, they will want to save the stats, which requires an account.

Phase 2: The Core Management Engine (The Pro Value)

Next Task: Build the Knockout Bracket visualizer and the Automated NRR calculations.

Why: This is the biggest pain point for local organizers. If your app calculates NRR instantly and generates a beautiful bracket they can share on WhatsApp, they will pay the ₹999 for the Pro tier.

Phase 3: The Monetization Engine (The Payment Gateway)

Next Task: Integrate Razorpay (since your audience is primarily Indian grassroots/corporate cricket).

Why: The paywalls (<FeatureGate>) are already built. Now we just need to connect the Stripe/Razorpay webhook so that when they swipe their card, their subscription_tier in Supabase instantly changes from free to pro.

Phase 4: The Broadcast Studio Expansion (The High-Ticket Value)

Next Task: Refine the OBS Controller and build the "Wireless Camera Feeds" (turning a smartphone browser into a camera source).

Why: This locks in the high-end corporate leagues willing to pay ₹4999+ for a professional stream.
