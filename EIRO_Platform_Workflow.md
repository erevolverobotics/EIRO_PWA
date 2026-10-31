# EIRO Platform — Complete Workflow & Feature Guide

> **EIRO** = Educational & Innovative Robotics Olympiad
> A multi-district school robotics competition platform that manages the entire event lifecycle — from school registration to certificate publication — across multiple districts, venues, and categories.

---

## What Is This App?

EIRO is a **competition management system** for an annual school robotics olympiad held across **multiple districts in Tamil Nadu**. It is NOT just a website — it is a full operations platform used simultaneously by:

- Organizers setting up the season
- Schools registering their student teams
- Coordinators managing the event on the ground
- Judges scoring competitions in real-time
- The public viewing results

Think of it like **a city marathon management system** — one platform manages registrations, race-day operations, timing, and results.

---

## The 7 Competition Categories

Every team belongs to one of these 7 competition types. Each has a different scoring engine:

| Category | Type | Scoring Engine | Description |
|----------|------|----------------|-------------|
| **SUMO** | Robot Battle | Match Tournament | Two robots fight to push each other out of a ring |
| **MAZE** | Autonomous | Timed Technical | Robot must solve a maze as fast as possible |
| **WALL** | Autonomous | Timed Technical | Robot follows a wall path in minimum time |
| **ECO CITY** | Project | Judged Rubric | Smart waste management solution presentation |
| **NEXTGEN FACTORY** | Project + Robot | Hybrid | Industrial automation simulation |
| **INNOVATOR JUNIOR** | Innovation | Judged Rubric | Innovative project for younger students |
| **INNOVATOR SENIOR** | Innovation | Judged Rubric | Innovative project for senior students |

---

## The 7 User Roles

```
SUPER_ADMIN
  └── Can do everything. Sets up seasons, manages all districts globally.

DISTRICT_ADMIN
  └── Manages one district's schools, venues, events, and approvals.

VENUE_COORDINATOR
  └── On-site operations — check-in, arenas, attendance.

SCHOOL_COORDINATOR
  └── Represents one school — registers teams, manages students, tracks fees.

JUDGE
  └── Assigned to specific matches or categories — submits scorecards.

HEAD_JUDGE
  └── Verifies and locks scores across a category. Resolves disputes.

CHECKIN_VOLUNTEER
  └── Marks attendance for students at the venue on event day.
```

---

## The Full Season Lifecycle

A "season" is one year's competition cycle. It goes through 6 phases in order:

```
SETUP
  |  Super Admin creates the season, sets categories, fee rules, districts.
  v
REGISTRATION_OPEN
  |  Schools can now register teams and pay fees. District Admins review.
  v
REGISTRATION_CLOSED
  |  No more new registrations. Coordinators verify all pending payments.
  v
ACTIVE
  |  Event day(s) running. Live scoring, attendance, scheduling all active.
  v
COMPLETED
  |  All matches done. Head Judges lock scores. Results computed. Certs generated.
  v
ARCHIVED
     Season moved to archive. Historical read-only.
```

---

## Why Each Admin Page Exists

### Seasons (`/admin/seasons`)
- **Purpose**: Create and manage competition years (2026, 2027, etc.)
- **When used**: Before registration opens. Super Admin sets dates and advances phases.
- **Key actions**: Create season → Set reg dates → Advance phase when ready

---

### Districts (`/admin/districts`)
- **Purpose**: Each district is a geographic region with its own schools, venue, and admin.
- **When used**: During SETUP phase — before schools can register.
- **Key actions**: Add districts (Trichy, Chennai...) → Assign District Admin → Add venues
- **Why needed**: Registration is district-specific. A school in Trichy registers under Trichy District. Their payments go to the Trichy District Coordinator. Their scores are managed by Trichy judges.

---

### Categories (`/admin/categories`)
- **Purpose**: Configure the rules for each of the 7 categories — team sizes, fees, rounds.
- **When used**: During SETUP. Must be done before schools register.
- **Key actions**: Set min/max team size → Set fee (Rs. or free) → Set number of rounds
- **Example**: SUMO = 2 members, Rs.500 fee, 3 rounds. ECO_CITY = 2-5 members, free, 1 round.

---

### Staff (`/admin/staff`)
- **Purpose**: Assign roles to registered users. This is how the system knows who is a judge vs admin.
- **When used**: During SETUP and throughout the event.
- **Key actions**: Find a user by email → Assign role (JUDGE, DISTRICT_ADMIN, etc.) → Revoke role
- **Why critical**: Without role assignment, users can sign up but have no access to anything. A judge cannot score unless assigned the JUDGE role.

---

### Schools / Team Approvals (`/admin/schools`)
- **Purpose**: Review and approve team registrations submitted by School Coordinators.
- **When used**: During REGISTRATION_OPEN phase.
- **States a team goes through**:
  ```
  DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED
                                     -> REJECTED
                                     -> CORRECTION_REQUIRED
  ```
- **Key actions**: Approve teams → Request corrections → Reject invalid registrations
- **Why needed**: Schools must be verified before they can compete. A team cannot get a slot in the schedule unless APPROVED.

---

### Schedule (`/admin/schedule`) — Read This Carefully

#### What Is The Schedule?

The schedule is the **event day timetable**. Think of it like a school timetable — but for match slots across multiple arenas running simultaneously.

On the day of the event, there might be:
- **5 arenas** running at the same time
- **50+ teams** competing across different categories
- Each match/attempt takes 20-60 minutes

Without a schedule, it would be chaos. Judges wouldn't know when/where to be. Teams wouldn't know when their turn is. Arenas would be idle or double-booked.

#### What Does a Time Slot Contain?

```
Time:     09:00 AM
Arena:    A1 (Sumo Ring 1)
Category: SUMO
Round:    Quarter Final 1
Teams:    Robo Warriors vs Iron Crushers
Judge:    Judge Priya
Duration: 30 minutes
```

#### Why the Schedule Feature Exists

| Without Schedule | With Schedule |
|-----------------|---------------|
| Teams don't know when to be at which arena | Every team gets their exact time slot |
| Judges have to be called one by one | Judges know their assignment in advance |
| Arenas may be idle or double-booked | Full utilization of all arenas |
| Chaos when 200 students arrive at once | Staggered check-in and organized flow |
| No systematic competition flow | Rounds (QF, SF, Final) happen in proper order |

#### Who Uses the Schedule?
- **District Admin** — builds the schedule before the event
- **Venue Coordinator** — monitors on the day, adjusts if needed
- **Judge** — knows exactly which slot/arena they're assigned to
- **School Coordinator / Teams** — can see their own time slots
- **Public** — can view the event's schedule on event day

---

### Scores (`/admin/scores`)
- **Purpose**: Head Judge reviews all submitted scorecards, flags disputes, verifies correctness, then locks scores.
- **When used**: During and after the ACTIVE phase.
- **Score lifecycle**:
  ```
  DRAFT (judge saves) -> SUBMITTED (judge submits) -> UNDER_REVIEW
    -> VERIFIED (head judge) -> LOCKED (immutable)
  ```
- **Why lock?**: Once locked, scores cannot be changed. Locking triggers result computation and certificate generation.
- **Key actions**: Review → Verify → Flag disputed scores → Lock all verified

---

### Payments (`/admin/payments`)
- **Purpose**: EIRO has NO payment gateway. All fees are paid in cash/UPI/bank transfer and manually verified by coordinators.
- **When used**: During REGISTRATION_OPEN and REGISTRATION_CLOSED phases.
- **Payment lifecycle**:
  ```
  Invoice created -> School pays (cash/UPI) -> Coordinator receives money
    -> Marks as VERIFIED in app with reference number
  ```
- **Key actions**: Find pending invoice → Choose method (Cash/UPI/Bank) → Enter reference/amount → Verify
- **Why needed**: Schools must have feeStatus: VERIFIED before their team gets an event slot.

---

### Live Operations (`/admin/live`)
- **Purpose**: Real-time view of all active arenas and matches on event day.
- **When used**: Only during ACTIVE phase (event day itself).
- **Key actions**: Monitor which arenas are active → View live match scores → Emergency Stop
- **Emergency Stop**: Halts all active matches instantly — used for fire alarms, medical emergencies, power outages, etc. All progress is auto-saved to Firestore.

---

### Attendance (`/admin/attendance`)
- **Purpose**: Mark which students physically arrived at the venue on event day.
- **When used**: Morning of event day during check-in.
- **Why needed**: Only checked-in students can compete. Teams with absent members may need to merge or withdraw.

---

### Reports (`/admin/reports`)
- **Purpose**: Generate district-wise participation reports, fee collection summaries, category-wise results.
- **When used**: After the event, for administrative records and media reporting.

---

### Publication (`/admin/publication`)
- **Purpose**: Publish final results to the public website and generate digital certificates.
- **When used**: After scores are locked and results are verified.
- **Why a separate step?**: Publication is irreversible. Once results go public, certificates are emailed to schools. This requires final confirmation from Super Admin.

---

## Complete User Journey

### School Coordinator (before event)
```
Sign up at /signup
  -> Gets SCHOOL_COORDINATOR role from Admin
  -> Creates teams (one per category they're entering)
  -> Uploads student members for each team
  -> Pays registration fee (cash/UPI to district coordinator)
  -> Waits for APPROVED status from District Admin
  -> Views their time slot from the published schedule
  -> Arrives on event day with students
```

### District Admin (event setup)
```
Gets DISTRICT_ADMIN role from Super Admin
  -> Reviews school applications (approve / reject / request correction)
  -> Verifies fee payments received from schools
  -> Builds the schedule (assigns time slots to teams across arenas)
  -> Assigns judges to specific arenas and time slots
  -> Monitors live operations on event day
  -> Reviews and approves scorecard verifications
```

### Judge (event day)
```
Gets JUDGE role from Admin
  -> Views assigned matches in judge dashboard
  -> Goes to assigned arena at assigned time (per schedule)
  -> Conducts match or evaluation
  -> Enters scores into app as DRAFT
  -> Submits scorecard when confirmed
  -> Head Judge reviews and verifies
```

### Super Admin (full season)
```
Creates Season -> Sets phases
  -> Adds Districts -> Assigns District Admins
  -> Configures Category rules and fees
  -> Assigns all other roles (Judges, Venue Coordinators)
  -> Monitors all districts during event
  -> Final lock of scores after Head Judge verification
  -> Publishes results globally
  -> Archives the season
```

---

## How All Pieces Connect (Data Flow)

```
Season
  |
  +-- Districts
  |     +-- Venues / Arenas
  |
  +-- Categories (rules per category)
  |
  +-- Schools (apply per district)
  |     +-- Teams (registered per school, per category)
  |           +-- Students (members of each team)
  |                 +-- Registrations (approval + fee status)
  |
  +-- Schedule
  |     +-- TimeSlots (team + arena + judge + time)
  |           +-- Matches / TimedRuns (what actually happened)
  |
  +-- Scorecards (judge's evaluation per match)
  |     +-- Verified by Head Judge -> Locked
  |
  +-- Results (computed from locked scorecards)
  |     +-- Published -> visible to public
  |
  +-- Certificates (generated from published results)
        +-- Sent to schools via email
```

---

## Firestore Collections Reference

| Collection | What Is Stored |
|-----------|----------------|
| `seasons` | Competition years and current phase |
| `districts` | Geographic districts |
| `venues` | Physical event locations |
| `arenas` | Individual competition rings/halls within a venue |
| `schools` | Registered schools |
| `users` | All user profiles |
| `roleAssignments` | Who has which role (SUPER_ADMIN, JUDGE, etc.) |
| `teams` | Each competing team |
| `students` | Individual student members |
| `registrations` | Team registration and approval status |
| `invoices` | Fee invoices per team |
| `payments` | Verified payment records |
| `timeSlots` | Schedule entries (time + arena + team) |
| `matches` | SUMO match results |
| `scorecards` | Judge score submissions |
| `qualifications` | Which teams qualified for State Finals |
| `results` | Final computed rankings |
| `certificates` | Generated digital certificates |
| `config/categories` | Category rules (editable by Super Admin) |
| `auditLogs` | Immutable history of all admin actions |

---

## The Event Day Timeline

```
6:00 AM  -- Venue Coordinator opens the venue
7:00 AM  -- Check-in Volunteers start marking attendance as teams arrive
8:30 AM  -- Judges briefed on assigned arenas and time slots (from Schedule)
9:00 AM  -- First time slot begins (Schedule -> TimeSlots -> Matches start)
9:00-4PM -- Judges score matches in real-time -> Scorecards submitted
           Venue Coordinator monitors Live Operations dashboard
           District Admin can see all active arenas
4:00 PM  -- All matches completed
4:30 PM  -- Head Judge reviews all scorecards -> Verifies -> Locks scores
5:00 PM  -- Results computed automatically from locked scores
5:30 PM  -- Super Admin reviews and publishes results
6:00 PM  -- Certificates generated and emailed to schools
           Public results page goes live at /results
```

---

## FAQ

**Q: Why can't schools pay online?**
EIRO is a district-level government-school competition. Most participating schools are rural government schools without reliable access to online payment. All fees are collected in cash or local UPI and manually verified by the District Coordinator.

**Q: Why must a team be APPROVED before getting a schedule slot?**
An unapproved team may have incomplete student lists, unpaid fees, or ineligible members. The approval gate ensures only valid teams are scheduled to compete.

**Q: Why are scores locked before publication?**
Once locked, scores become the permanent audit record. This prevents any post-event tampering. Certificates are generated directly from locked scores and cannot be regenerated if scores change.

**Q: What if a team member is absent on event day?**
If the minimum team size is not met, the team can request a Team Adjustment (merge with another team or transfer members) through the Adjustments module. This must be approved before competition starts.

**Q: Can one school enter multiple categories?**
Yes. A school can register separate teams for each of the 7 categories. Each team is independent — separate approval, separate fee, separate time slot in the schedule.

**Q: What is State Finals?**
District Preliminary events select the top teams per category. Those teams qualify for the State Finals — a single final event where all district winners compete. The same platform manages both stages.

---

# EIRO November 14 Competition — Practical Setup Guide

> **Event**: District Preliminary Competition
> **Date**: Saturday, November 14, 2026
> **Schools**: 6 participating schools
> **Training**: Pre-event training sessions on different days before Nov 14

---

## Overview Timeline

```
NOW (Oct 31)       → Today: All 6 schools registered, teams created, fees verified
Nov 1–13           → Training sessions on different days for each school
Nov 13 (evening)   → Schedule finalized, judges briefed
Nov 14 (event day) → Competition from 9 AM
Nov 14 (evening)   → Results locked and published
```

---

## Phase 1 — Complete NOW (Oct 31 – Nov 1)

These must be done before training can begin.

### Step 1: Create the Season (Super Admin)

Go to `/admin/seasons` → **Create Season**

```
Name:          EIRO 2026 — District Preliminary
Year:          2026
Reg Opens:     2026-09-01
Reg Closes:    2026-11-05
```

Then **Advance Phase** to `REGISTRATION_OPEN`.

---

### Step 2: Add Your District (Super Admin)

Go to `/admin/districts` → **Add District**

```
Name:        [Your District Name]
State:       Tamil Nadu
Coordinator: [Your Name / Lead Coordinator]
```

---

### Step 3: Configure Categories (Super Admin)

Go to `/admin/categories` → Edit each category you are running.

For a 6-school district preliminary, typically active categories are:

| Category | Team Size | Fee | Rounds |
|----------|-----------|-----|--------|
| SUMO | 2 members | Rs. 500 | 3 (Round Robin / KO) |
| MAZE | 2 members | Rs. 500 | 2 attempts each |
| WALL | 2 members | Rs. 500 | 2 attempts each |
| ECO CITY | 2-5 members | Free | 1 presentation |
| INNOVATOR JR | 2-6 members | Free | 1 presentation |

---

### Step 4: Create Accounts for All 6 School Coordinators

Each school's coordinator must:
1. Sign up at `/signup` with their school email
2. You then go to `/admin/staff` and assign them `SCHOOL_COORDINATOR` role

```
School 1 Coordinator → Sign up → Assign SCHOOL_COORDINATOR
School 2 Coordinator → Sign up → Assign SCHOOL_COORDINATOR
...repeat for all 6 schools
```

> **Tip**: Do a WhatsApp group call with all 6 coordinators and get them to sign up live while you assign roles.

---

### Step 5: Schools Register Their Teams

Each School Coordinator logs in and registers their teams. For each team they fill:
- Team name
- Category (SUMO, MAZE, etc.)
- Student member names and grades

After submission, each team shows as `SUBMITTED` in `/admin/schools`.

---

### Step 6: Approve All Teams (District Admin)

Go to `/admin/schools` → filter by `SUBMITTED`

For each team:
- Review student list is complete
- Click **Approve** if everything is correct
- Click **Correction Required** with a note if something is missing
- Once correction is submitted by school, review again and approve

> Target: All 6 schools fully APPROVED by **Nov 5**

---

### Step 7: Verify Fee Payments (District Admin)

Go to `/admin/payments`

For each school that has paid their fees (cash/UPI collected by you):
- Click **Verify** on their invoice
- Select method (Cash / UPI / Bank Transfer)
- Enter the amount and transaction reference
- Confirm

> Free categories (ECO CITY, Innovators) will auto-show as NOT_REQUIRED — no action needed.

---

### Step 8: Close Registration

Go to `/admin/seasons` → Advance Phase to `REGISTRATION_CLOSED`

After this, no new teams can be added. The approved team list is now fixed.

---

## Phase 2 — Training Days (Nov 1–13)

Training sessions happen at your venue on different days before the competition.
This is where teams practice using the arenas.

### Setting Up Training Sessions in the App

Go to `/admin/attendance` → Training Sessions → **Add Session**

For each training day, create a session:

```
Example — School 1 & 2 Training:
  Date:    Nov 3, 2026 (Sunday)
  Venue:   [Your Venue Name]
  Schools: DAV School, KV No.1
  Time:    9:00 AM – 1:00 PM
  Status:  SCHEDULED

Example — School 3, 4 & 5 Training:
  Date:    Nov 7, 2026 (Thursday after school)
  Venue:   [Your Venue Name]
  Schools: St. Joseph's, PSBB, Srinivasa School
  Time:    3:30 PM – 6:00 PM
  Status:  SCHEDULED

Example — School 6 + All Schools Open Practice:
  Date:    Nov 10, 2026 (Sunday)
  Venue:   [Your Venue Name]
  Schools: All 6 schools welcome
  Time:    9:00 AM – 12:00 PM
  Status:  SCHEDULED
```

### On Each Training Day

1. Open `/admin/attendance` → select the session
2. Check-in Volunteer marks which students are present
3. This records training attendance (useful if any student disputes on event day)
4. After session, mark session as `COMPLETED`

---

## Phase 3 — Build the Nov 14 Schedule (Nov 11–13)

### Step 9: Add Arenas

Go to Firestore Console → `arenas` collection → Add documents for each arena:

```
Arena A1: Sumo Ring 1       (category: SUMO)
Arena A2: Sumo Ring 2       (category: SUMO)
Arena B1: Maze Track 1      (category: MAZE)
Arena B2: Wall Track        (category: WALL)
Arena C1: Presentation Hall (category: ECO_CITY / Innovators)
```

### Step 10: Assign Judges (Admin → Staff)

Go to `/admin/staff` → Assign `JUDGE` role to each judge:

```
Judge 1 (Sumo) → JUDGE role
Judge 2 (Sumo) → JUDGE role
Judge 3 (Maze/Wall) → JUDGE role
Judge 4 (Rubric) → HEAD_JUDGE role (for presentations)
```

### Step 11: Build the Schedule

Go to `/admin/schedule` → **Add Slot** for each match/attempt

**Recommended slot order for 6 schools with SUMO Round Robin:**

> 6 schools × 1 team each = 6 teams. Round robin = 15 matches (each pair plays once).
> At 30 min/match with 2 simultaneous arenas → ~4 hours of SUMO.

```
09:00  Arena A1  School1 vs School2  SUMO  QF1   Judge 1
09:00  Arena A2  School3 vs School4  SUMO  QF2   Judge 2
09:30  Arena A1  School1 vs School3  SUMO  QF3   Judge 1
09:30  Arena A2  School2 vs School5  SUMO  QF4   Judge 2
10:00  Arena A1  School4 vs School6  SUMO  QF5   Judge 1
10:00  Arena A2  School5 vs School6  SUMO  QF6   Judge 2
...continue for all pairs...
12:00  Arena A1  Top 2 Schools       SUMO  FINAL Judge 1
```

**For MAZE / WALL (timed runs — each team gets 2 attempts):**

```
09:00  Arena B1  School1 Team  MAZE  Attempt 1  Judge 3
09:20  Arena B1  School2 Team  MAZE  Attempt 1  Judge 3
09:40  Arena B1  School3 Team  MAZE  Attempt 1  Judge 3
10:00  Arena B1  School4 Team  MAZE  Attempt 1  Judge 3
10:20  Arena B1  School5 Team  MAZE  Attempt 1  Judge 3
10:40  Arena B1  School6 Team  MAZE  Attempt 1  Judge 3
11:00  Arena B1  School1 Team  MAZE  Attempt 2  Judge 3
...repeat...
```

**For presentations (ECO CITY, Innovators) — 20 min each:**

```
09:00  Hall C   School1 Team  ECO_CITY  Presentation  Judge 4
09:20  Hall C   School2 Team  ECO_CITY  Presentation  Judge 4
09:40  Hall C   School3 Team  ECO_CITY  Presentation  Judge 4
...
```

> **Tip**: Use the **Timeline view** in `/admin/schedule` to visually check for arena clashes or gaps.

---

## Phase 4 — Event Day (November 14)

### Morning Checklist (7:00 AM – 9:00 AM)

| Time | Who | Action |
|------|-----|--------|
| 7:00 AM | Venue Coordinator | Open venue, set up arenas |
| 7:30 AM | Check-in Volunteers | Start at entry gate |
| 7:30–9:00 AM | Students arrive | Volunteers mark attendance in `/admin/attendance` |
| 8:30 AM | Super Admin / District Admin | Open `/admin/live` — monitor dashboard |
| 8:45 AM | Judges | Briefed, go to assigned arenas |
| 9:00 AM | All | First slot begins |

### During Competition (9:00 AM – 4:00 PM)

**Judges** (on their phones at the arena):
- Open judge dashboard at `/judge`
- Select their assigned match
- Enter scores after each bout
- Submit scorecard when match is complete

**District Admin / Venue Coordinator** (on laptop):
- Monitor `/admin/live` for all active arenas
- Check if any arena is idle (drag schedule forward if needed)
- Handle any team adjustments through `/admin/adjustments`

**Check-in Volunteers**:
- Any late-arriving students get marked present as they arrive
- Report absent students to Venue Coordinator immediately

### If Emergency Happens

1. Go to `/admin/live`
2. Click **Emergency Stop**
3. Confirm — all active matches are halted instantly in the app
4. Handle the situation
5. Resume manually by updating match statuses in Firestore

---

## Phase 5 — After Competition (Nov 14, 4:00 PM onward)

### Step 12: Head Judge Locks Scores

Go to `/admin/scores`

1. Review all submitted scorecards
2. Verify each one (check judge's notes, flag any disputes)
3. Resolve any flagged cards with the judges in person
4. Once all verified → click **Lock All Verified Scores**

> This is irreversible. Do NOT lock until all disputes are resolved.

### Step 13: Advance Season to COMPLETED

Go to `/admin/seasons` → **Advance Phase** to `COMPLETED`

Results are now computed from locked scores.

### Step 14: Publish Results

Go to `/admin/publication`

1. Review the final rankings for each category
2. Confirm qualifiers for State Finals
3. Click **Publish Results**

Results are now visible at `/results` (public page).

### Step 15: Generate Certificates

Still in `/admin/publication`:

1. Click **Generate Certificates** for all categories
2. Certificates are sent to school coordinator emails automatically
3. Winners get Winner certificates; all participants get Participation certificates

---

## Complete Nov 14 Checklist

### Before Nov 14

- [ ] Season created with correct dates
- [ ] District configured
- [ ] All 6 schools have signed-up coordinator accounts
- [ ] All teams registered and APPROVED
- [ ] All fee payments VERIFIED
- [ ] Training sessions created and attendance marked for each session
- [ ] Arenas added to Firestore
- [ ] All judges assigned JUDGE role
- [ ] Full schedule built in `/admin/schedule` — no clashes
- [ ] Registration closed (`REGISTRATION_CLOSED` phase)

### Night Before (Nov 13)

- [ ] Print the schedule (or share PDF with all coordinators via WhatsApp)
- [ ] Share time slot with each school coordinator (they know when to bring students)
- [ ] Confirm all 6 school coordinators know venue address and parking
- [ ] Brief judges on their arena assignment and time slots
- [ ] Charge all devices (phones for judges, laptop for admin)
- [ ] Test judge login on one phone to confirm it works

### Event Day Morning (Nov 14)

- [ ] `/admin/live` open on admin laptop
- [ ] All judges logged in on their phones
- [ ] Attendance marking started by volunteers
- [ ] First matches begin at 9:00 AM per schedule

### Event Day Evening (Nov 14)

- [ ] All scorecards submitted
- [ ] Head Judge verified and locked all scores
- [ ] Results published at `/results`
- [ ] Certificates generated and emailed
- [ ] Season advanced to `COMPLETED`

---

> **Remember**: With 6 schools, this is a manageable pilot. Use this event to identify what works and what needs improvement in the platform before scaling to more districts.
