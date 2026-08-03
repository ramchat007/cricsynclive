Phase 1: The First Fold (Match Context & Main Score)
The goal here is to give the user immediate situational awareness without requiring them to scroll.

1.1 Unified Match Header:

Consolidate the tournament name, match type (e.g., League Match), venue, and timestamp into a single, compact header block.

1.2 Team Scores & Innings Status:

Display both teams clearly. Team A (batting) with their score and overs. Team B with their status ("Yet to Bat" or "Needs X runs in Y balls").

1.3 The Projections Block:

Add a compact 2-column card right beneath the scores showing Current RR and Projected Score (or Required RR for the second innings).

Phase 2: High-Density Live Action Block
This phase replaces the bulky, oversized player cards with clean, data-rich tables.

2.1 The Batting Grid:

Implement a tight grid layout with columns: Batters | R | B | 4s | 6s | SR.

Highlight the active striker (e.g., with an asterisk \* or a colored accent).

2.2 The Bowling Grid:

Implement a matching grid for the current bowler: Bowlers | O | M | R | W | Eco.

2.3 Current Partnership:

Insert a dedicated row for the current partnership directly below the bowler stats (e.g., Partnership: 45 (22)).

2.4 Recent Deliveries (Timeline):

Strip out duplicate "This Over" elements. Keep a single, unified horizontal scroll of the last 6-12 balls at the bottom of this block.

Phase 3: Event-Driven Commentary Feed
Transforming the commentary from a basic text list into a premium broadcast timeline.

3.1 Two-Column Timeline Structure:

Left side: A fixed-width column containing the ball outcome badge (colored circle) and the over/ball number (e.g., 2.4).

Right side: The descriptive text of the delivery.

3.2 Rich Wicket Events:

When a wicket occurs, inject the dismissed batsman's final stat line directly into the commentary feed so users don't have to hunt for it.

3.3 New Player Injections:

Insert a mini-profile card into the feed whenever a new batter arrives at the crease (Name, Batting Style, Tournament Stats).

Phase 4: Navigation & Global Elements
Optimizing how users move around the live match data.

4.1 Sticky Tab Switcher:

Move the navigation tabs (Live, Scorecard, Commentary, Info) directly below the Phase 1 Score Block. Pin it so it stays visible as the user scrolls down through the scorecard or commentary.

4.2 Engagement Counters:

Position your Total Views and Live Viewers counters in a clean strip right below the tab switcher to build social proof and engagement.
