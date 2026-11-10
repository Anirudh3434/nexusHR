# The Hub (ذا هب) — Product Understanding Document

| | |
|---|---|
| **URL analysed** | https://the-hub-v22.netlify.app/#/landing |
| **Date of analysis** | 10 Nov 2026 |
| **Method** | Read-only. Public pages rendered + all client source (`index.html`, 14 JS files, CSS, manifest, service worker) downloaded and reviewed. **No credentials entered, no account created, no form submitted, no action with real-world effect taken.** |
| **Artefact** | `docs/the-hub-v22-understanding.md` |
| **Verdict** | A high-fidelity, fully clickable **front-end prototype / sales demo**, not a working product. No backend, no real accounts, no real payments. |

---

## 1. Executive summary

The Hub is a **Saudi event-industry marketplace** with two connected sides:

1. **Event staffing** — event companies publish events with paid role slots; individual workers apply, get shortlisted, interviewed, invited and formally accepted.
2. **Service booking** — clients (private or business) find service providers (photographers, DJs, makeup artists, decorators…), compare packages, request a booking, receive a proposal, and run the job in a shared project workspace.

The prototype is unusually complete for a demo: **four personas, ~40 screens, realistic seed data, two full state machines, subscription billing, trust/verification layers, bilingual Arabic/English RTL UI, and a PWA shell**. Everything is simulated locally in the browser.

The strategic positioning is deliberately narrow and compliance-aware:

> "Software tools, not staffing." The Hub is **not an employer, not a labour supplier, and not a payment intermediary**. Companies select, contract, pay and supervise workers directly. The Hub only charges its own subscription / unlock / advertising fees.

This positioning is repeated on the landing page, in the company event flow, and in the billing screen. It is clearly a deliberate answer to Saudi labour-supply and payment-intermediation regulation.

---

## 2. Market context and brand

- **Market:** Saudi Arabia. Cities: Riyadh, Jeddah, Dammam, Khobar, Makkah, Madinah, Abha, AlUla.
- **Language:** Arabic-first (`lang="ar" dir="rtl"`), full English toggle. **2,052 translation keys** in `js/i18n.js`.
- **Currency:** SAR. Formatting differs per language (e.g. `1,500 ر.س` vs `SAR 1,500`).
- **Brand:** `the hub.` — dark charcoal (`#0E0E10`) with a muted gold accent (`#D4A574`). Editorial, premium, calm. Faceless generated illustrations instead of stock people.
- **Tagline:** "People for event experiences" / «الأشخاص المناسبون لفعاليات لا تُنسى».
- **Positioning statement:** "Discover talent. Build your team. Book services. All in one place."
- **Legal footer:** "Not legally classified or approved. The Hub provides software tools; contracting, payment and supervision happen directly between the parties."
- **Demo banner (always visible):** "Prototype — fictional demo data stored in your browser only. Not a live service."

---

## 3. The four personas

Signup is a **four-pathway choice**, not a single form. Each pathway creates a different account shape.

| Persona | Arabic | What they do | Key capability |
|---|---|---|---|
| **Worker** | فرد / مشارك في الفعاليات | Individual event talent (host, usher, photographer, DJ…) | Apply to event role slots; build verified experience |
| **Provider** | مقدم خدمة | Service business / freelancer selling packages | Publish services, receive requests, deliver projects |
| **Company** | شركة / منظم فعاليات | Event organiser / agency | Publish events, hire staff, manage close-out |
| **Client** | عميل / باحث عن خدمة | Private or business buyer | Search providers, book, manage projects |

A provider is a **hybrid**: it gets its own provider dashboard **and** reuses the worker's "Opportunities / Applications" screens (`P.opps = W.opps`), because a photographer may both sell packages and apply to staffed event slots.

**Accounts can be switched without logging out** via the account menu — this is a demo device to tour all four personas quickly. Demo accounts are flagged `demo: true`; all other seeded accounts are `hidden` but selectable under "Other seeded accounts".

---

## 4. Information architecture

Hash-based router (`#/route/param`). Public routes are open; `#/app/*` requires a session (otherwise redirects to landing).

### Public

| Route | Screen |
|---|---|
| `#/landing` | Marketing landing page |
| `#/interest` and `#/interest/:type` | Early-access interest form (pre-selects persona) |
| `#/login` | Demo persona picker + email/password form |
| `#/signup` | Persona chooser |
| `#/signup/:type` | Persona-specific registration |

### Worker (`#/app/...`)

`home` · `opps` · `opp/:eventId` · `applications` · `applications/:id` · `inbox` · `schedule` · `profile` (tabs: overview, roles, portfolio, history, reviews, availability, settings) · `billing`

### Company

`home` · `events` · `event/:id/:tab` · `create` · `create/:id` · `applicants` · `interviews` · `staffing` · `inbox` · `company` · `billing` · `settings`

Event detail tabs: **overview, applicants, interviews, staffing, live, close-out, audit log** (plus a hidden `replace` view for filling a drop-out).

### Provider

`home` · `requests` · `requests/:id` · `projects` · `projects/:id` · `opps` · `opp/:id` · `applications` · `inbox` · `availability` · `services` (package editor) · `page` (public profile) · `billing` · `settings`

### Client

`home` · `find` · `provider/:id` · `requests` · `requests/:id` · `projects` · `projects/:id` · `inbox` · `settings`

Navigation is a persistent sidebar on desktop and a **bottom tab bar (4 items + "More")** on mobile.

---

## 5. Core workflows

### 5.1 Event staffing (company ↔ worker)

```
Company                    Worker
-------                    ------
Create event (5 steps)
  basics → roles+pay → schedule → requirements → review
Publish  ───────────────►  Event appears in Opportunities
                           (if role, nationality, language match)
                           Opens detail (paid unlock — see §6)
                           Apply with note + chosen slot
Review applicants  ◄──────
Shortlist / reject
Invite to interview ─────► Accept / decline interview
Mark interview pass/fail
Send work invitation ────► Accept / decline
                           ├─ Accept → other active applications auto-flagged "conflict"
                           └─ Decline → company notified
Event runs (LIVE phase)
Close out:
  mark attended / no-show per person
  (worker can dispute attendance)
  completed → both sides can review
```

**Application state machine**

`applied → shortlisted → interview_invited → interview_confirmed → interview_passed → work_invited → accepted → completed`

Terminal / side states: `interview_declined`, `declined`, `withdrawn`, `not_selected`, `conflict`, `noshow`.

**Event state machine**

`draft → published → (live → awaiting close-out) → completed`
Side state: `cancelled` (all active applicants notified).

**Notable product decisions**
- Every state change is a **formal action card inside the conversation**, not just a status update — the message thread is the audit trail.
- Accepting a work invite **automatically conflicts out** the worker's other active applications for overlapping dates.
- Double-booking is blocked at apply, shortlist, invite and accept time.
- Late-evening events (end `24:00`) are normalised so the end time falls on the next day.
- Event covers are **generated from the roles required** (host, usher, photographer, DJ, etc.), not uploaded images — a deliberate art-direction choice that also avoids fake stock imagery.
- Public event descriptions are scanned for phone numbers, emails and social handles; contact-sharing in descriptions/notes is blocked client-side.

### 5.2 Service booking (client ↔ provider)

```
Client                                Provider
------                                --------
Search / filter providers
  (role, category, city, price, rating, date availability)
Open public profile
  packages (Basic/Advanced/Premium) + add-ons
Request booking (date, time, city, location, notes)
  ─────────────────────────────────►  Receives request
                                       Sends proposal (price + notes)
  Accept proposal  ◄──────────────────
  → Project created (shared workspace)
     checklist · updates feed · messages
     provider marks DELIVERED
     client confirms COMPLETION
     (or reports an issue → back to active)
     both sides review each other
```

**Request states:** `requested → proposed → confirmed` (creates project) · `declined` · `cancelled`
**Project states:** `active → delivered → completed` (with an `issue` loop back to active)

**Packages** are shaped by service type — photography packages carry hours/photos/delivery/video; music packages carry hours/sets/sound/lighting/MC; general services carry hours/crew. This is a neat domain-modelling touch rather than a generic "price + description".

### 5.3 Trust and reputation

Reputation is layered, and the UI explicitly separates the layers rather than collapsing them into one "verified" tick:

| Layer | Meaning |
|---|---|
| Contact verified | Phone/email confirmed |
| Identity verified | ID checked |
| Business verified | CR document checked → company shows "Under review" until approved |
| Experience record | `self` → `review` → `verified` (with optional proof file) |
| Portfolio item | `self` / `review` / `verified` / `hub` (earned from a completed Hub event) |
| Reviews | **Only possible after completed, verified work**; tied to the specific application/project and role |
| Attendance | Company marks attended / no-show; worker can dispute; company resolves |

The landing page states the principle: **"Verified does not mean endorsed."** Reviews are role-specific, so a strong host is not automatically shown as a strong brand ambassador.

---

## 6. Monetisation model (as designed)

| Plan | Price | Service categories | Opportunity credits / month | Team members |
|---|---|---|---|---|
| Free | SAR 0 | 1 | 0 (5 starter opens, lifetime) | 1 |
| Professional | SAR 199 / mo | 3 | 5 | 1 |
| Business | SAR 499 / mo | 6 | 15 | 5 |

- **Pay-per-opportunity unlock:** 5 free lifetime opens, then plan credits, then **SAR 15 per open**. Unlock is charged when a worker opens a full event detail.
- **Free preview** when all of the worker's matching roles are already full — avoids charging for a dead opportunity.
- **Backup / directly invited** workers are charged only when they **confirm**, not when invited.
- **30-day free trial** once per account (`trialUsed` flag); downgrade keeps data.
- Companies pay workers **directly**; The Hub does not take a wage share.
- Sponsored search / ads and true pay-per-unlock billing are explicitly declared **out of scope for the demo**.
- Billing screen includes plan cards, current plan, trial end date, and an invoice table (seeded with two SAR 499 subscription invoices and one trial invoice).

This is a credible "SaaS + credits" model rather than a commission-on-wages model, which keeps the platform outside payment intermediation.

---

## 7. Feature inventory (by area)

**Public / growth**
- Early-access interest form with persona pre-selection, Saudi phone validation (accepts Arabic-Indic digits), city list, consent, honeypot, source/UTM capture, success state.
- Real submission via **Netlify Forms** (`form-name=interest`) — see risk in §11.
- Bilingual toggle on every public screen.

**Worker**
- Dashboard with application pipeline, upcoming work, profile completion %, saved/blocked dates.
- Opportunity search with filters (role, category, city, date, pay, language, nationality), role-match and eligibility engine.
- Application timeline, withdrawal, interview response, invite response, dispute attendance.
- Schedule (month/week calendar) merging accepted work and blocked dates.
- Profile with 7 tabs, public preview mode, portfolio upload (image resized client-side to data URL), experience records with proof, role management, availability preferences (cities, weekdays, hours, notice period), settings.
- 5-open credits panel.

**Company**
- Dashboard: open events, applicants to review, interviews, staffing gaps.
- 5-step event wizard with per-step validation, save-as-draft, publish, edit, cancel.
- Applicant table with filters, shortlist/reject, interview scheduling, work invitation, per-event audit log.
- Staffing view with filled/vacancy per slot, backfill and replacement invitations.
- Live view for the event day, close-out view for attendance + no-shows, dispute resolution.
- Company profile: legal identity (CR number, entity type, established year), verification document state, team members with plan-limited seats, past projects, reviews.
- Billing/settings.

**Provider**
- Dashboard: new requests, upcoming projects, earnings-style metrics, rating.
- Request inbox with proposal flow, change requests, decline, cancel.
- Project workspace shared with client: checklist, updates, deliver, issue.
- Service/package editor with type-aware fields and add-ons.
- Public profile page (what clients see), availability manager, applications/opportunities reuse, billing/settings.

**Client**
- Discovery grid with role chips, filters (category, city, price, rating, available-on date), sorting.
- Provider public page: packages, add-ons, portfolio, reviews, availability calendar.
- Booking modal with date/time, city, location, budget, notes, add-on quantities, live total.
- Requests list, project workspace, reviews, settings.

**Shared**
- Inbox with conversation list, filters (all / events / requests / workers / clients / unread), formal action cards, system messages, read receipts, contact-info blocking.
- Notifications dropdown with unread count and deep links.
- Reviews (two-way, role-filtered).
- Calendar component (month/week/day) reused for schedule and availability.
- Plan & billing, account settings (notifications, privacy, 2FA toggle, connected accounts, region, password, delete account).
- Demo tools: reset demo, switch account, back to landing.

---

## 8. Domain model (as implemented)

All state is one JSON object in `localStorage` key `hubDemoV3`; UI state (language + session) in `hubUIV3`. Seed schema version `v: 4`, with a `seq` counter for IDs.

```
DB
├─ accounts[]        id, type(worker|provider|company|client), name, email, pw,
│                    city, plan, bio{en,ar}, roles[{rid,since}], experience[],
│                    portfolio[], packages[], addons[], availability{blocks[],prefs},
│                    verified{contact,identity,business}, settings{}, team[],
│                    projects[], opens{starterUsed,monthKey,monthUsed,paid,list},
│                    nat, langs, demo/hidden/deleted flags
├─ events[]          id, cid, title{en,ar}, desc{en,ar}, city, venue{en,ar},
│                    days[{date,start,end}], slots[{id,rid,count,pay,payType}],
│                    interview{required,date,start,end,location,instr},
│                    requirements{dress,nat,languages}, status
├─ applications[]    id, eid, sid, wid, status, attend, note, appliedAt,
│                    history[{st,ts}], interview{}, invite{}, backup/direct flags
├─ requests[]        id, clientId, providerId, packageId, addons[], date, start,
│                    city, location, notes, price, status, projectId, convId
├─ projects[]        id, requestId, clientId, providerId, title, price, date,
│                    status, checklist[], updates[], deliveredAt, completedAt
├─ conversations[]   id, kind(event|request), eid/aid/qid, parts[], msgs[], lastTs
│                    msgs: {type: text|sys|card, from, text{en,ar}, card, ts, readBy[]}
├─ reviews[]         id, kind(company_worker|worker_company|client_provider|provider_client),
│                    from, to, ref, rating, text{en,ar}, date, rid
├─ notifications[]   id, to, key, params, link, ts, read
├─ audit[]           id, ts, actor, key, params, eid/pid/qid
└─ billing[]         id, acct, date, descKey, plan, amount, status
```

Static reference data lives outside the DB:
- `ROLE_CATS` — 9 categories (Event Staffing; Entertainment & Live Shows; Media/Photography/Content; Production & Technical; Hospitality & F&B; Creative/Fashion/Styling; Experiences/Gaming/Interactive; Operations & Logistics; Language & Specialized Talent).
- `ROLE_LIB` — **44 roles**, 4 flagged for extra review (Drone Operator, Crowd Management, Valet Driver, Tour Guide), 1 marked manual (Chef / Cook).
- `CITIES` — 8 Saudi cities.
- `PLANS` — 3 plans.
- `DEMO_TODAY = 2026-10-22` — the whole demo runs on a **frozen "today"**, so relative dates, phases and eligibility stay coherent forever.

---

## 9. Technical architecture

| Aspect | Finding |
|---|---|
| Type | Static single-page app. No framework, no build step, **zero runtime dependencies**. |
| Scripts | 14 classic `<script>` tags sharing globals (`window.H`, `H.DB`, `H.views`, `H.A`, `H.S`). |
| Size | ~427 KB unminified JS (i18n alone 103 KB) + 26 KB CSS. |
| Rendering | Full `innerHTML` re-render per action; delegated `click` / `change` / `input` / `submit` handlers; `data-act` / `data-bind` / `data-submit` attributes. |
| Routing | `location.hash` parser; unknown routes fall back to landing or a not-found view. |
| State | `localStorage` JSON blob + in-memory `H.V` view state; explicit `H.save()` after every mutation. |
| Auth | **None.** Email/password compared against plaintext seed values; session is just an account ID in `localStorage`. Account switching is a first-class demo feature. |
| Backend | **None observed.** Network log shows only the document, CSS, 14 JS files and the logo. No XHR/fetch during use. |
| Files | Images read via `FileReader` and resized to a data URL; verification documents store **only the file name**, not the content. |
| PWA | `manifest.webmanifest` + service worker (`hub-v2-7`), network-first with cache fallback, standalone display, dark theme. |
| Hosting | Netlify. One real server interaction exists: the interest form POST to Netlify Forms. |
| i18n | Flat key dictionary, `t(key, params)`, bilingual objects `{en, ar}` in data, `H.L()` accessor, `dir` flips on `<html>`. |
| Imagery | Procedural SVG avatars, event covers derived from role mix, and a small set of photos under `assets/photos/`. |
| Quality signals | Defensive `try/catch` around render with an error buffer, focus/selection preservation across re-renders, no test suite, no minification, no analytics. |

The code is well organised for a prototype: clear separation of `core` (state + domain rules), `features` (matching, credits, packages), `ui` (shared components), `views_*` (one file per persona), `cover`/`visuals` (art), `i18n`, `data` (seed). Business rules live in `core.js` as testable functions that return `{ok}` or `{ok:false, err}` — a good foundation if this is later ported to a real backend.

---

## 10. UX and design observations

- **Strong visual identity.** Dark, restrained, gold accent; generous spacing; consistent card language. It reads as a premium product, not a template.
- **Arabic is genuinely first-class**, not a translation afterthought: RTL layout, Arabic-Indic digit handling, Arabic-first seed content, bilingual date/currency formatting.
- **Progressive disclosure done well:** the 5-step event wizard, tabbed event management, tabbed profile, and modal-based actions keep dense flows manageable.
- **The conversation is the source of truth.** Formal actions appear as cards in the thread, which makes the audit trail legible to non-technical users.
- **Empty, loading, error and success states** exist (empty states, toasts, inline field errors, confirm dialogs).
- **Accessibility basics present:** landmarks, `aria-label` on icon-only controls, `role="dialog"` + `aria-modal`, `aria-live` toast region, Escape closes modals, visible focus styling. Not formally audited (no Lighthouse run was performed in this analysis).
- **Mobile:** bottom tab bar, collapsible sidebar sheet, single-column forms, responsive grids.
- **Generated artwork** avoids the "fake stock-photo marketplace" look and sidesteps image licensing. Uploaded photos override illustrations when present.

Minor rough edges noticed in source: the demo date is hard-coded (fine for a demo, fatal for production), some seeded strings appear to have been rendered with mojibake in one tool view (likely a console encoding artefact, since the live page renders Arabic correctly), and a few views are stubs (e.g. `provider.reviews` returns "not found").

---

## 11. What is real vs. simulated (important)

| Claim / feature | Reality |
|---|---|
| Accounts, login, sessions | Simulated in `localStorage`; plaintext passwords in seed; no server |
| Events, applications, projects | Fully simulated state machines; deterministic seed data |
| Payments, invoices, subscriptions | Simulated rows; no payment gateway |
| Verification (contact / ID / CR) | Simulated badges and document names only |
| File uploads | Images become base64 in `localStorage`; documents are name-only |
| Notifications / email / SMS | In-app only; no delivery |
| Search / filters / matching | Real client-side logic over seed data |
| Multi-user collaboration | Impossible — single browser, single local DB |
| **Interest form** | **Real.** It POSTs to Netlify Forms with name, phone, city, specialty, persona, source, language. |

> **Privacy note:** because the interest form is a live Netlify Forms endpoint, any test submission would create a real lead record containing personal data. This analysis deliberately did not submit it. Before sharing the demo publicly, decide whether that endpoint should stay live, and add a retention/deletion policy and a proper privacy notice.

---

## 12. Gaps and risks for production

**Security / trust boundary**
- All authorisation and validation is client-side. Anyone can edit `localStorage` and grant themselves any state, plan, verification badge or review.
- Passwords are stored and compared in plaintext; no hashing, no sessions, no rate limiting, no CSRF, no RBAC.
- No server-side state machine means no protection against double-booking, duplicate reviews or fraudulent attendance.
- Uploaded images go to `localStorage` (≈5 MB quota) — no object storage, no virus scanning, no signed URLs. Document uploads do not persist content at all.

**Legal / regulatory (KSA)**
- The "not an employer / not a labour supplier / not a payment intermediary" framing is a good start, but event staffing, temporary work, wage protection, VAT, e-contracts and consumer protection all need local counsel review before launch.
- Verification ("verified") must map to a defensible process, not a badge; the prototype already says "verified does not mean endorsed", which should be preserved in the terms.
- Personal data (phone, ID/iqama references, CR numbers) requires a PDPL-compliant privacy programme.

**Product / operational**
- No real identity/KYC, e-signature, invoicing/ZATCA, escrow or dispute process with teeth.
- Attendance disputes are one-click resolved by the company (fine for demo, risky in reality).
- Credits/unlock pricing is approved in copy but not billable; no refunds, receipts, tax handling or dunning.
- No moderation of public descriptions beyond a client-side contact-info regex.
- No analytics, error monitoring, or support tooling.
- `localStorage` schema is versioned only by a constant (`v: 4`); no migrations.
- No automated tests. Business rules are pure functions, so they are portable — but untested.

**UX / content**
- Demo-only features (account switcher, reset demo, other seeded accounts) must be stripped or gated in production.
- Only Arabic and English are implemented despite 10 languages listed in the language picker.
- Frozen `DEMO_TODAY` and hard-coded calendar year 2026 must become real time.
- Some edge states are stubs (provider reviews view, several `not_found` fallbacks).

---

## 13. Open questions for the product owner

1. **Is the goal to ship this prototype, or to use it as a spec for a production build?** The code is demo-grade; the domain logic is the valuable asset.
2. **Who is the paying customer first** — companies hiring staff, or clients booking providers? The demo supports both, which doubles the surface area.
3. **What is the real monetisation launch plan?** Subscription-only, unlocks, or sponsored placement? The copy says unlocks/ads are "approved pricing" but out of demo scope.
4. **What verification is legally required** before a worker can be booked (ID, iqama, work permit, age, insurance)?
5. **Who holds the contract** — The Hub (agency model) or the parties (marketplace model)? The current copy commits hard to marketplace.
6. **Payments:** direct between parties, or facilitated? If facilitated, escrow/licensing changes the entire compliance posture.
7. **Data residency and PDPL:** where will KYC documents and phone numbers live?
8. **Which features are must-have for a first real release** — event staffing, service booking, or both?
9. **Should "provider" and "worker" remain separate account types**, or become one "talent" account with two modes? The prototype already blurs them.

---

## 14. Suggested path to a production build

1. **Freeze the spec, not the code.** Treat `core.js` + `features.js` as the executable requirements: extract the two state machines, the matching rules, the credit rules and the package model into typed domain modules with tests.
2. **Backend first.** Postgres + API with server-side authorisation; make every state transition a transaction (apply, accept, close-out, deliver, confirm). Replace `localStorage` with real sessions.
3. **Identity and verification.** Phone OTP for signup (Saudi numbers), then a staged KYC/CR verification workflow with document storage and reviewer tooling.
4. **Payments and contracts.** Integrate a Saudi PSP (e.g. Moyasar/Tap/HyperPay) for subscriptions and unlocks; add e-contracts and ZATCA-compliant invoices if any money flows through the platform.
5. **Messaging and notifications.** Server-side conversations, read receipts, rate limits, contact-info detection, email/SMS/push.
6. **Storage and media.** Object storage + signed URLs + image pipeline; never base64 in the database.
7. **Operational layer.** Audit log (append-only), moderation queue, dispute workflow, analytics, error monitoring, feature flags.
8. **Then port the UI.** Reuse the design language, the copy, the generated-cover system and the persona-specific navigation; rebuild on the existing Next.js stack (nexusHR) rather than extending the prototype.
9. **Accessibility and localisation pass.** Formal WCAG audit, real RTL/LTR QA, and only offer languages that are actually translated.

---

## 15. One-paragraph summary

The Hub is a polished, Arabic-first Saudi marketplace prototype for the events industry, covering two demand/supply loops — companies hiring event staff and clients booking service providers — wrapped in a credible SaaS monetisation model (subscription + opportunity unlocks) and a layered trust system (contact/identity/business verification, role-specific reviews tied to completed work, attendance confirmation and disputes). It is entirely client-side: a static Netlify SPA with a hash router, 14 hand-written JS files, realistic seed data on a frozen demo date, and no backend, authentication or payments. The demo is strong enough to sell the concept and precise enough to act as a functional specification; the next step is not to harden this code, but to lift its state machines, rules and design language into a real server-backed product.

---

## Appendix A — Enumerations

**Application statuses**
`applied`, `shortlisted`, `interview_invited`, `interview_confirmed`, `interview_declined`, `interview_passed`, `work_invited`, `accepted`, `declined`, `withdrawn`, `completed`, `not_selected`, `conflict`, `noshow`

**Event statuses / phases**
`draft`, `published`, `live`, `await_close`, `completed`, `cancelled`

**Request statuses**
`requested`, `proposed`, `confirmed`, `declined`, `cancelled`

**Project statuses**
`active`, `delivered`, `completed`

**Attendance**
`null` (not marked), `attended`, `noshow`, `disputed → resolved`

**Portfolio / experience statuses**
`self`, `review`, `verified`, `hub`

**Plan limits**
Free: 1 category, 0 credits, 1 member · Professional: 3, 5, 1 · Business: 6, 15, 5

**Opportunity unlocks**
5 free lifetime → plan credits monthly → SAR 15 per open; free preview if matching roles are full; backups charged on confirmation.

---

## Appendix B — Source map

| File | Responsibility |
|---|---|
| `js/roles.js` | 9 categories, 44 roles, review flags |
| `js/i18n.js` | 2,052 EN/AR strings |
| `js/data.js` | Seed accounts, events, applications, requests, projects, reviews, conversations, billing; frozen demo date |
| `js/core.js` | Storage, formatting, queries, all domain state transitions, auth, accounts, billing |
| `js/features.js` | Nationality/language matching, opportunity opens, packages, event phases, replacement logic |
| `js/ui.js` | Field builder, icons, badges, calendars, timelines, inbox, settings, availability, portfolio, reviews, billing |
| `js/views_public.js` | Landing, interest, login, 4-path signup |
| `js/views_worker.js` | Worker dashboard, opportunities, applications, schedule, 7-tab profile |
| `js/views_company.js` | Company dashboard, 5-step event wizard, event management tabs, staffing, company profile |
| `js/views_provider.js` | Provider dashboard, requests, projects, services, public profile |
| `js/views_client.js` | Client home, discovery, booking, requests, projects |
| `js/cover.js`, `js/visuals.js` | Generated event covers, avatars, portfolio scenes |
| `js/app.js` | Shell, navigation, router, delegated events |
| `sw.js`, `manifest.webmanifest` | PWA caching and install metadata |
