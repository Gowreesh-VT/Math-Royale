# Math-Royale Scripts Documentation

**Last Updated:** April 2026

---

## Quick Command Reference

### Database Setup & Seeding
```bash
npm run seed                    # Seed questions
npm run setup                   # Setup main database
npm run seed-round2             # Seed all Round 2 questions
npm run setup-r2-test           # Dev shortcut: active test match
npm run setup-r2-semis          # Dev shortcut: active Semifinals test match
npm run setup-r2-finals         # Dev shortcut: active Finals test match
```

### Round 2 Tournament (Multi-Round)
```bash
npm run status-tournament       # View tournament bracket, active rounds, and matches
npm run initialize-tournament-multi # Create Round A (Groups)
npm run start-round-multi A     # Activate Round A matches globally
npm run advance-round-multi A   # Eliminate 40%, create and auto-start Round B
npm run advance-round-multi B   # Eliminate 60%, create and auto-start Round C
```

---

## Tournament Management (Round 2)

**`initialize-tournament-multi.ts`** - Create Round A matches
- **Usage:** `npm run initialize-tournament-multi`
- Gets all eligible teams with `hasRound2Access: true`
- Distributes them into multiple 1v1 matches for Round A
- Status: 'pending' (requires `start-round-multi`)

**`start-round-multi.ts`** - Activate a specific round stage
- **Usage:** `npm run start-round-multi <A|B|C>`
- Activates the stage and all its corresponding matches globally
- Teams can access their specific match using the ID assigned to them

**`status-tournament.ts`** - View tournament and match status
- **Usage:** `npm run status-tournament`
- Shows active stages, score brackets, matched teams, and exact timestamps
- Displays time remaining for active matches

**`advance-round-multi.ts`** - Calculate points and advance to next stage
- **Usage:** `npm run advance-round-multi <A|B>`
  - `A`: Round A → Round B (eliminates bottom 40%)
  - `B`: Round B → Round C (eliminates bottom 60%)
- Computes individual team points from all `MatchSubmission` details
- Sets `hasRound2Access: false` for eliminated teams
- Creates next round matches for advancing teams
- **Auto-activates** the next round immediately.

---

## Data Viewing

**`view-leaderboard.ts`** - View all participant scores
- **Usage:** `npm run view-leaderboard` or `npm run view-leaderboard <A|B|C>`
- Displays a formatted CLI table ranking all qualifying teams by their total submission points.
- Can view overall tournament global scores or scores specific to a `roundStage` (A, B, or C).

---

## Complete Workflow (Round 2)

```bash
# 1. Setup & Seeding
npm run seed-round2

# 2. Grant Round 2 Access to participating teams in MongoDB

# 3. Initialize Tournament (Creates Round A)
npm run initialize-tournament-multi

# 4. Start Round A
npm run start-round-multi A

# ... teams compete ...

# 5. Advance to Round B 
# (auto-eliminates bottom 40% and immediately starts Round B)
npm run advance-round-multi A

# ... teams compete ...

# 6. Advance to Finals (Round C)
# (auto-eliminates bottom 60% and immediately starts Round C)
npm run advance-round-multi B
```
