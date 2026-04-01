# Scripts Documentation

**Last Updated:** January 2, 2026

---

## Quick Command Reference

### Round 1 (Bingo)
```bash
npm run seed                    # Seed Round 1 questions
npm run start-round1 120        # Start Round 1 (120 mins)
npm run status-round1           # Check status & auto-stop
npm run extend-round1 30        # Add 30 more minutes
npm run stop-round1             # Manually stop
```

### Round 2 (Tug of War)
```bash
npm run seed-round2             # Seed all Round 2 questions
npm run setup-r2-semis          # Dev shortcut: active Semifinals test match
npm run setup-r2-finals         # Dev shortcut: active Finals test match
npm run view-top-teams          # View Round 1 top 8
npm run initialize-tournament   # Create Quarterfinals
npm run start-round 1           # Start Quarterfinals
npm run start-match <matchId>   # Start individual match
npm run view-bracket            # Monitor tournament
npm run advance-round 1         # Advance to Semifinals
npm run start-round 2           # Start Semifinals
npm run advance-round 2         # Advance to Finals
npm run start-round 3           # Start Finals (all matches)
npm run start-match <matchId>   # Start specific final match
npm run view-bracket            # Monitor tournament
```

---

## Round 1 Scripts

**`start-round1.ts`** - Start Round 1 with configurable duration
- **Usage:** `npm run start-round1 [minutes]` (e.g., `120` for 2 hours)
- Creates Round1Session with auto-stop enabled
- Grid becomes visible at `/round1`
- Timer displayed on frontend

**`stop-round1.ts`** - Manually stop active Round 1
- **Usage:** `npm run stop-round1`
- Hides grid immediately
- Use for emergency stop or early termination

**`extend-round1.ts`** - Add time to active Round 1
- **Usage:** `npm run extend-round1 [minutes]` (e.g., `30`)
- Extends `endTime` by specified minutes
- Auto-stop triggers at new end time

**`status-round1.ts`** - Check Round 1 status
- **Usage:** `npm run status-round1`
- Shows current status, time remaining
- **Auto-stops expired sessions**

---

## Round 2 Scripts

**`seed-round2-questions.ts`** - Seed 24 Round 2 questions
- **Usage:** `npm run seed-round2`
- 8 questions per round (4 Side A + 4 Side B)
- Run before initializing tournament

**`setup-round2-test-db.ts`** - Seed a direct dev Round 2 match
- **Usage:** `npm run setup-r2-test -- <email> <1|2|3>`
- Creates a direct active Quarterfinals, Semifinals, or Finals dev match for the given email
- Also available as shortcuts:
  `npm run setup-r2-semis`
  `npm run setup-r2-finals`

**`view-top-teams.ts`** - View top 8 teams from Round 1
- **Usage:** `npm run view-top-teams`
- Shows Round 2 access status
- Provides MongoDB commands to grant access

**`initialize-tournament.ts`** - Create Quarterfinals (8 teams)
- **Usage:** `npm run initialize-tournament`
- Requires exactly 8 teams with `hasRound2Access: true`
- Creates 1 match (4v4)
- Status: 'pending' (not started)

**`start-round.ts`** - Start a pending round
- **Usage:** `npm run start-round <1|2|3>`
- Activates round and all matches
- Teams can access `/round2/match/[matchId]`

**`start-match.ts`** - Start an individual match by ID
- **Usage:** `npm run start-match <matchId>`
- Activates specific match (useful for running 2 finals simultaneously)
- Use `npm run view-bracket` to find matchIds
- Teams can access `/round2/match/[matchId]`

**`view-bracket.ts`** - View tournament bracket (admin)
- **Usage:** `npm run view-bracket`
- Shows all rounds, scores, status
- Displays time remaining for active matches

**`advance-round.ts`** - Advance to next round
- **Usage:** `npm run advance-round <1|2>`
- Eliminates losing teams
- Creates next round (2v2 or 1v1)
- Status: 'pending' (requires `start-round`)

---

## Complete Workflows

### Round 1 Flow
```bash
npm run seed                # Seed questions
npm run start-round1 120    # Start (2 hours)
# ... teams compete ...
npm run stop-round1         # Stop (or auto-stops)
```

### Round 2 Flow
```bash
npm run seed-round2                # Seed all questions
npm run view-top-teams             # Check top 8
# Grant Round 2 access in MongoDB to top 8 teams
npm run initialize-tournament      # Create Quarterfinals
npm run start-round 1              # Start Quarterfinals
# ... match completes ...
npm run advance-round 1            # Create Semifinals
npm run start-round 2              # Start Semifinals
# ... match completes ...
npm run advance-round 2            # Create Finals (creates 2 matches)

# Option 1: Start all finals together
npm run start-round 3              # Start both finals

# Option 2: Start finals individually (e.g., for 2 simultaneous finals)
npm run view-bracket               # Get matchIds
npm run start-match <matchId1>     # Start first final
npm run start-match <matchId2>     # Start second final
```

---

## Rules Summary

### Round 1 (Bingo)
- Configurable duration (60-120 mins typical)
- Grid visible only when active
- Auto-stop when time expires
- Frontend timer updates every second

### Round 2 (Tug of War)
- **Quarterfinals:** 8 teams (4v4) → 4 winners
- **Semifinals:** 4 teams (2v2) → 2 winners
- **Finals:** 2 teams (1v1) → 1 winner
- **Duration:** 45 minutes per round
- **Scoring:** +10 correct, -5 wrong
- **Win:** First to 75 points OR higher score at time expiry

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Round 1 is already active" | `npm run stop-round1` then restart |
| "No active Round 1 session" | `npm run start-round1 <mins>` |
| "Round not active" (API) | Admin must start round |
| Auto-stop not working | Run `npm run status-round1` to trigger |
| "Need 8 teams with Round 2 access" | Grant access in MongoDB to exactly 8 teams |
| "Round X is not completed yet" | Wait for match to finish or set `winningSide` manually |
| "Need at least 4 questions" | `npm run seed-round2` |

---

## API Endpoints

**Round 1**
- `GET /api/round1/status` - Timer status & time remaining
- `GET /api/question` - Questions (requires active round)
- `POST /api/sync-score` - Sync scores (requires active round)

**Round 2**
- `GET /api/Round-2/active-match` - Current match for team
- `GET /api/Round-2/match/[matchId]` - Match details
- `POST /api/Round-2/sync` - Sync submissions

---

**End of Documentation**
