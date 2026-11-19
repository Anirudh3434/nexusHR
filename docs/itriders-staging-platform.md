# iTRiders.ai — Staging Platform Documentation

| | |
|---|---|
| **Target** | `https://staging.itriders.ai` |
| **Product** | iTRiders.ai — AI-powered IT job portal for the Canadian market |
| **Documented on** | 2026-11-16; employer area re-verified live 2026-11-17 |
| **Method** | Live black-box exploration via Playwright/browse (real browser session), HTML + JSON inspection |
| **Roles used** | Candidate account and employer account (both supplied by owner; credentials intentionally omitted from this file) |
| **Coverage** | Public, auth, and candidate areas fully explored; employer area verified live with a real employer session (§5.14–§5.15); admin area enumerated by route-probing only (role-guarded) |

> **Confidence legend:** ✅ verified live · 🟡 inferred from route/probe/HTML · ❓ unknown, needs credentials or source access

---

## 1. Executive summary

iTRiders is a **two-sided IT recruitment marketplace** for Canada: candidates build AI-matched profiles and apply to jobs; employers post jobs, search candidates, and manage applicants; admins moderate jobs, categories, employers, and candidates.

It is a **server-rendered Laravel monolith** (Blade templates + inline jQuery), not an SPA. Most pages are full HTML documents; a few interactions are AJAX against JSON endpoints. Identifiers are **ULIDs** (jobs carry both a numeric `id` and a ULID `job_key`), which suggests a hybrid legacy/schema-migration data model.

Current staging content: **32 live jobs**, **13 companies**, 10 job cards per page.

---

## 2. Technology stack & infrastructure

| Layer | Observation | Status |
|---|---|---|
| Backend framework | Laravel — `_token` CSRF fields, `XSRF-TOKEN` cookie, Laravel-encrypted query params (`{"iv","value","mac"}` on `managed_categories[]`), ULIDs | ✅ |
| Views | Blade server-side HTML, no SPA hydration | ✅ |
| CSS/JS | Bootstrap 5.3.3, jQuery 3.7.1, Select2 4.1.0-rc.0, Font Awesome 6.5.2, CKEditor 5.41.4, Croppie 2.6.5 | ✅ |
| Bundled app JS | `/assets/js/app.min.js?v=1787222796` (~37 KB) | ✅ |
| Auth | Session cookie + **mandatory email OTP** on login; optional TOTP and SMS 2FA | ✅ |
| Web server | Apache, `x-iplb-*` headers → Imperva/Incapsula IP load balancer in front | ✅ |
| Response headers | `cache-control: no-cache, private`, `x-frame-options: SAMEORIGIN`, `x-content-type-options: nosniff`, `x-xss-protection: 1; mode=block` | ✅ |
| Analytics | GA4 `G-HYNR4L5K1Z` (also firing on staging) | ✅ |
| APIs | No `/api/*` namespace; JSON returned by specific web routes | ✅ |
| Search | `GET /search/suggest?q=` typeahead endpoint | ✅ |

---

## 3. Roles & access model

| Role | Home | Guard behaviour observed |
|---|---|---|
| **Guest** | `/` | `/candidate/*` and `/employer/*` redirect to `/` or `/auth`; `/auth` redirects to `/` when already signed in |
| **Candidate** | `/candidate/dashboard` | `/employer/*` and `/admin/*` return **302 → `/candidate/dashboard`** (authenticated but wrong role) |
| **Employer** | `/employer/dashboard` 🟡 | Not reachable with the supplied account |
| **Admin** | `/admin/dashboard` 🟡 | Route exists, guarded the same way |

**Route-probing trick used throughout:** an existing route under a wrong role returns `200` **landing on `/candidate/dashboard`**, whereas a non-existent route returns `404` with the "404 NOT FOUND" page. This is how the employer/admin surface was mapped without access.

⚠️ **The supplied account is a candidate**, despite the `appstechy.com` domain (`Rohan M`, Software Development Engineer, 5.4 yrs, Bengaluru). Employer/admin functionality therefore could not be exercised.

---

## 4. Route map

### 4.1 Public / marketing ✅

| Path | Purpose |
|---|---|
| `/` | Landing: search bar, category grid, featured jobs, "how it works", testimonials, FAQ |
| `/jobs` | Job search + filter sidebar + detail panel (master/detail layout) |
| `/jobs/{jobUlid}/details` | JSON job detail payload (feeds the side panel) |
| `/jobs/{jobUlid}/apply` | **POST** quick-apply submission (AJAX) |
| `/cmp/{companyUlid}` | Public company profile page |
| `/cmp-preview/{companyUlid}?job={jobUlid}` | Shareable job preview page (used as `share_url` in the API) |
| `/about-us` | Marketing |
| `/contact-us` | Contact form (**POST** `/contact-us`) |
| `/sitemap.xml`, `/sitemap.xsl` | 52 URLs: 13 `/cmp/*`, 32 `/cmp-preview/*`, plus 5 static + 3 auth |
| `/auth`, `/auth?tab=signup&role=candidate\|employer` | Login / registration UI |
| `/login` (POST), `/logout` (POST), `/verify/otp`, `/register/candidate`, `/register/employer` | Auth actions |

**Absent (404):** `/privacy-policy`, `/terms`, `/faq`, `/blog`, `/pricing` — legal pages are modals/buttons, not routes.

### 4.2 Candidate ✅

| Path | Notes |
|---|---|
| `/candidate/dashboard` | Stats + AI matches + recent applications + saved jobs |
| `/candidate/profile` | Full profile editor incl. resume autofill, avatar upload |
| `/candidate/applied-jobs` | Application pipeline + withdraw |
| `/candidate/saved-jobs` | Bookmarked jobs, apply from here |
| `/candidate/ai-matches` | AI-ranked recommendations, apply modal |
| `/candidate/job-alerts` | Create/update/delete alerts (POST same path) |
| `/candidate/messages` | Conversations, attachments |
| `/candidate/notifications` | Categorised feed, mark/clear, preferences |
| `/candidate/change-password` | Password, email re-verify, magic link, delete account, TOTP + SMS 2FA |
| `/candidate/resume/{resumeUlid}/download` | Returns `application/pdf` |

**404 (not implemented):** `/candidate/preferences`, `/candidate/resume`, `/candidate/help`, `/candidate/applications`, `/candidate/saved`, `/candidate/matches`, `/candidate/alerts`, `/candidate/inbox`, `/candidate/settings`, `/candidate/account`, `/candidate/resumes`, `/candidate/upload-resume`, `/candidate/recommendations`

### 4.3 Employer 🟡 (routes exist, role-guarded)

`/employer/dashboard` · `/employer/job-postings` · `/employer/job-postings/create` · `/employer/job-postings/{id}` · `/employer/candidates` · `/employer/candidates/search` · `/employer/candidates/{id}` · `/employer/applications` · `/employer/company-profile` · `/employer/messages` · `/employer/notifications` · `/employer/change-password` · `/employer/team`

**404:** `/employer/settings`, `/employer/settings/profile`, `/employer/profile`, `/employer/job-alerts`, `/employer/saved-candidates`, `/employer/talent-pool`, `/employer/interviews`, `/employer/analytics`, `/employer/dashboard/analytics`, `/employer/billing`, `/employer/plans`, `/employer/offers`, `/employer/onboarding`, `/employer/verify`, `/employer/applications/{id}`, `/employer/job-postings/{id}/applicants`, `/employer/job-postings/{id}/edit`

### 4.4 Admin 🟡

**Exists:** `/admin/dashboard` · `/admin/job-postings` · `/admin/categories` · `/admin/employers` · `/admin/candidates`

**404:** `/admin` (root itself) · `/admin/login` (302 → `/`, never renders) · `/admin/users` · `/admin/jobs` · `/admin/settings` · `/admin/reports` · `/admin/roles` · `/admin/companies` · `/admin/plans` · `/admin/subscriptions` · `/admin/payments` · `/admin/logs` · `/admin/email-templates` · `/admin/notifications` · `/admin/messages` · `/admin/admins` · `/admin/profile` · `/admin/analytics` · `/admin/faqs` · `/admin/skills` · `/admin/audit` · `/admin/announcements` · `/admin/support` · `/admin/enquiries` · `/admin/contacts`

Also absent as admin entry points: `/superadmin`, `/administrator`, `/backend`, `/cms`, `/staff`, `/internal`, `/manage`, `/manage/dashboard`, `/control`, `/operator`, `/panel`.

---

## 5. Feature detail

### 5.1 Landing page ✅
Hero + search (keyword, skills multi-select via Select2, location, experience), quick category chips (Data Pipeline & ETL, Project & Program Management, Business Analysis & Consulting, DevOps Engineering, Enterprise Content Management, Frontend Development, Access Management & SSO, Agile Coaching & Scrum), "Why iTRiders", category grid, featured jobs with Save / View / Quick Apply, 3-step explainer, differentiators, testimonials, FAQ accordion, footer (Post a Job, Candidate Search, Company Profile, About Us, Sitemap).

### 5.2 Job search (`/jobs`) ✅
Master/detail layout (`#jobDetail` panel on desktop, `#mobileJobModal` on ≤1024 px).

**Filter parameters (confirmed from form names):**

```
q, location, min_exp, managed_skill_ids[], managed_categories[],
types[], work_modes[], exp[], is_urgent,
salary_tab (salary|contract), min_salary, max_salary,
sort, show_matching, page
```

Quick-filter chips call `applyQuickTag(field, value)` (e.g. `work_modes[]=Remote-only`, `is_urgent=1`, `q=AI / ML`). Filter state is mirrored into the URL and normalised on load by `cleanUrlOnLoad()`.

**Card data attributes:** `data-job-id` (numeric), `data-match-score`, `data-match-type`.

### 5.3 Job detail ✅
`GET /jobs/{ulid}/details` → JSON:

```json
{
  "share_url": "https://staging.itriders.ai/cmp-preview/{companyUlid}?job={jobUlid}",
  "id": 526,
  "title": "Full-Stack Developer",
  "company": "J&M Group Inc",
  "company_id": "01KGKX62SXX0RHJN60RAFZYE2K",
  "company_slug": "jm-group-inc",
  "location": "Mississauga",
  "is_remote": false,
  "is_paused": false,
  "is_inactive": false,
  "inactive_status": null,
  "tags": [{ "label": "Remote", "class": "tag-blue" },
           { "label": "Contract", "class": "tag-green" },
           { "label": "Full-Stack Development", "class": "tag-neutral" },
           { "label": "Any Exp", "class": "tag-neutral" }],
  "skills": [{ "name": "JavaScript", "is_synonym": false }]
}
```

Additional UI fields: deadline ("Deadline: Nov 30, 2026"), skills-required chips, long description (CKEditor HTML).

### 5.4 Quick Apply ✅
Modal `#quickApplyForm`, no `action` attribute — submitted by JS to **`POST /jobs/{jobUlid}/apply`** with `FormData` and `X-Requested-With: XMLHttpRequest`.

Fields: `_token`, `job_key`, `resume_option` (`previous` \| `upload`), `previous_resume_id`, `resume_option_choice` (radio), `resume` (file), `cover_letter` (textarea), `name`, `email`, `source`, `match_score`, `match_type`.

Modal shows **profile completion %** ("75% · Good Match"), saved resumes (`sde_resume.pdf`), upload limit **PDF/DOC/DOCX, max 5 MB**, optional cover letter.

### 5.5 Candidate dashboard ✅
Stat tiles: **Jobs Applied, Profile Views, Interviews, Saved Jobs** — each with a "today" delta.

Sections: `AI-Matched Jobs for You`, `Recent Applications`, `Your Top Skills`, `Saved Jobs`, `Companies Interested in You`, `All Professional Skills`.

### 5.6 Profile ✅
Resume **autofill ("Autofill from Resume")** — AI parsing of uploaded resume into structured sections.

Sections (inline CRUD modals: Add / Edit / Delete / Save / Cancel): **Skills, Experience, Education, Certifications, Preferences**.

Preference fields: `avatar`, `work_mode`, `employment_type`, `expected_salary`, `expected_salary_period`, `contract_rate`, `availability_status`, `notice_period`, `work_authorization`, `preferred_locations[]`, `willing_to_relocate`, `job_alerts`, `profile_visibility`.

Header shows completeness (`+ Complete Profile`) and `5.4 Yrs Exp`.

### 5.7 Applications ✅
Pipeline tabs, all currently 0 for this account:

`All` · `Applied` · `Application Viewed` · `Shortlisted` · `Interview Scheduled` · `Interviewed` · `Offer Sent` · `Offer Accepted` · `Offer Declined` · `Selected / Hired` · `Rejected / Not Selected` · `Withdrawn`

Summary tiles: Total Applied · In Progress · Interviews · Offer Received · Not Progressed. Withdraw action has a confirm dialog.

### 5.8 AI matching ✅
Match metadata travels with job cards (`match_score`, `match_type`), is attached to saved jobs and applications, and toggles between **"AI Match Score"** and **"Match Score"** depending on whether the user came from an explicit search (`showMatchingToggle`). `show_matching` is a first-class filter. Job skills include an `is_synonym` flag, implying synonym expansion on the matching side.

### 5.9 Job alerts ✅
Create/edit/delete via `POST /candidate/job-alerts` (`alert_id`, `_method` for update/delete).

Fields: `alert_name`, `frequency`, `weekly_days[]`, `work_modes[]`, `employment_types[]`, `countries[]`, `states[]`, `cities[]`, `salary_min`, `status`, `use_profile_preferences`.

### 5.10 Messages ✅
Two-pane conversation list, `All` / `Unread` filters, `Attach` for files. Conversation list loads server-side; per-thread polling not observed.

### 5.11 Notifications ✅
`GET /candidate/notifications/poll` → JSON badge feed (polled globally):

```json
{
  "notifications": [{
    "id": 6498,
    "type": "profile_improvement",
    "icon": "fa-star",
    "icon_color": "purple",
    "content": "Your profile completeness is at <strong>75%</strong>...",
    "is_read": true,
    "group": "today",
    "time_string": "3 minutes ago",
    "tag_label": "Tip",
    "subject_id": 155109,
    "created_at_iso": "2026-11-16T01:53:27-05:00"
  }],
  "unread_count": 0,
  "unread_messages_count": 0
}
```

Categories: `All`, `Applications`, `Messages`, `Profile Views`, `Job Matches`. Actions: mark all read, clear all, per-category preferences.

### 5.12 Account security ✅
- Change password (`current_password`, `password`, `password_confirmation`)
- Re-verify email address; **email me a login link** (magic link)
- Delete account
- **Authenticator (TOTP) 2FA**: enable, regenerate/reconfigure, disable
- **SMS 2FA**: enable with current number, change number & verify, disable
- Login itself always requires an **emailed 6-digit OTP** (15-minute expiry) before the dashboard

### 5.13 Auth UX ✅
`/auth` provides tabs **Sign In / Create Account** and a role switcher **Job Seeker / Employer** (`role_choice` = `candidate` | `employer`), posting to `POST /login`.

Anti-autofill hardening: hidden real `email` / `password` inputs paired with decoy `fake_email` / `fake_password` text inputs that JS promotes on interaction.

---

## 5.14 Employer area ✅ (verified 2026-11-17)

Signed in as employer **Chuwel** (owner *Lalit Sharma*, `xomifi1133@chuwel.com`), **Verified Employer**, 1 open role. Staff member *Anirudh* (`xomifi1132@chuwel.com`), role **Recuriter** (sic), department **HR**, access `Jobs · Applications · Candidates · Messages`.

### Routes (all ✅ live)

| Path | Purpose |
|---|---|
| `/employer/dashboard` | KPI cards, application pipeline, recent applicants, activity |
| `/employer/staff-dashboard` | Per-recruiter performance, assigned jobs, export |
| `/employer/jobs-management` | Job list by All / Live / Draft / Paused + department filter |
| `/employer/job-postings/create` | 4-step job wizard |
| `/employer/job-activity` | Views, applications, view-to-apply, time-to-fill, live feed |
| `/employer/applications` (`?status=…`) | ATS board + modals, CSV export |
| `/employer/candidates` | AI candidate search |
| `/employer/company-profile` | Branding, page settings, page performance |
| `/employer/team` | Staff CRUD + granular access, deactivation with reason |
| `/employer/departments` | Department CRUD + active toggle + staff counts |
| `/employer/roles` | Role CRUD per department + staff counts |
| `/employer/taxonomy-requests` | Request new job titles / skills |
| `/employer/messages` | Conversations, share job, schedule interview, email |
| `/employer/notifications` | Feed + preferences |
| `/employer/change-password` | Password, email, magic link, delete account, TOTP/SMS 2FA |

**Role guard:** `/candidate/dashboard` and `/admin/dashboard` both redirect an employer to `/employer/dashboard`. Permission middleware: `app/Http/Middleware/StaffPermissionMiddleware`.

### Dashboard
Greeting (time-aware: "Good morning/evening"), stats **Active Job Postings** (1, ↑1 today), **Total Applications** (0), **Interviews Scheduled** (0), **Application Pipeline** with per-status deep links (`?status=applied|viewed|shortlisted|interview_scheduled|interviewed|hired|rejected`), Recent Applicants, Recent Activity feed.

Live refresh by AJAX:
- `GET /employer/dashboard/weekly-data?offset=` → `{"counts":[0,0,0,0,0,0,0]}` (Highcharts series)
- `GET /employer/dashboard/all-data` → HTML fragments (`greeting`, `pipeline`) re-rendered in place
- `GET /employer/notifications/poll` → JSON badge feed

### Jobs management
Filters **All / Live / Draft / Paused**, department dropdown, **Export CSV / PDF**, bulk action form `POST /employer/job-postings/bulk` with `ids[]` + `action`.
Live posting: **C# Developer** — Burnaby, Full-time, 0 applicants, $200–$500, posted minutes ago.

### Job creation wizard — 4 steps
**1 Basics** (title, category, department, managed-by staff, third-party flag, employment type, work mode, location, country/state/city/address/postal, salary min/max/currency/pay frequency, show-salary toggle, benefits, description, skills, min experience, education, publish/expiry dates, status, urgent) → **2 Details** → **3 Requirements** → **4 Review**, with `Save Draft`, `Previous`/`Next`, `Publish Job`, and inline **"Terms to Request"** (asks admin to add a missing title/skill).

`POST /employer/job-postings` creates the posting.

### Applications (ATS)
12 statuses mirroring the candidate side. Action modals: **Update Application Status**, **Schedule Interview**, **Send Job Offer**, **Confirm Rejection**, **Record Interview Feedback**. `Export CSV`.

| Modal | Fields |
|---|---|
| Interview | `interview_type`, `interview_date`, `interview_time`, `timezone`, `meeting_link`, `phone_number`, `meeting_location`, `notes` |
| Offer | `title`, `employment_type`, `work_location`, `salary`, `salary_currency`, `salary_period`, `joining_date`, `offer_expiry_date`, `benefits`, `additional_notes`, `custom_message`, `terms` |
| Rejection | `rejection_reason` |
| Feedback | `interview_feedback`, `interview_result_summary`, `strengths`, `improvements`, `next_steps` |

### Candidate search (AI)
UI: keyword/skills, **Sort By** (Top / Mid / Low rated), **Score Range** 70–100 / 60–70 / 50–60, page size 10 / 20.

`GET /employer/candidates/search?q=java` →
```json
{"data":[{"id":102168,"score":0.962,"ai_match_score":96.2,"user_id":102790,
  "current_position":"Java8, SpringFramework Developer",
  "latest_work_title":"Java8, SpringFramework Developer",
  "job_preference":null,"experience_years":15,
  "city":"Mississauga","state":"Ontario","country":"Canada",
  "user_profile_image":null}]}
```
`q` is **required** — omitting it returns `422` `{"success":false,"message":"The Job Title (Keyword) field is required."}`.

### Company profile
Branding (logo, cover, tagline, `clients_count`, `founded`, `specialization[]`, `about`), contact (`recruiter_contact_email`, website, career page), address, industry/size, **Page Visibility & Settings** (public page on/off, show open roles), page performance (profile views, click-throughs, applications, follows), Open Jobs tab (1).

### Team / Departments / Roles (RBAC)
Team table: Name, Email, Role, **Access** (module list), Status, Actions. Deactivate requires a reason (≥3 chars) and `POST /employer/staff/{ulid}`.
Departments: name, status, staff count, toggle `POST /employer/departments/{id}/toggle`.
Roles: name, department, staff count, `POST /employer/roles/{id}`.

### Staff dashboard
Range selector (7/30/90 days), KPIs (team members, interviews conducted, hires, avg time-to-hire), recruiter performance cards, **Open Requisitions by Staff** table (staff, assigned jobs, applications, interviews), `Export Report`, `Create Staff`.

### Job activity
KPIs (job views, applications, view-to-apply rate, avg time-to-fill), per-job weekly views chart, live activity feed ("Lalit Sharma added a new team member: Anirudh", "Job posted: C# Developer"), source breakdown, `Export Report`.

### Taxonomy requests
Request custom **Job Titles** and **Skills**; states `All / Pending / Approved / Merged / Rejected / Withdrawn`; withdraw with optional reason (admin is notified).

- **Creation point is elsewhere.** There is no "create" control on `/employer/taxonomy-requests`; requests are opened from the **"No results" state of the Job Title / Skills Select2** in Create Job (`window.openTaxonomyRequestModal(type, term)`), a fixed `type` of `role` or `skill`.
- **Limits:** max **5 terms** per submission, **80 chars** each, charset `letters digits space - _ . / & ( )`, Enter/comma to add a tag, case-insensitive dedupe.
- **Per-term outcomes:** `submitted` · `already_exists` · `already_pending` · `error` — one submission can return a mixed result set.
- **Table is server-side** DataTable: `GET /employer/taxonomy-requests/data?status=&type=&start=&length=` (returns `{"draw":0,"recordsTotal":0,…}` when empty); the page body itself renders only "Loading requests…".
- **Endpoints:** `POST /taxonomy-requests` (`_token`, `type`, `names[]`) · `DELETE /taxonomy-requests/{id}/withdraw` (`{"reason": "<html>"}`).
- **Blocker semantics:** a *pending* term cannot be used on a posting until an admin approves it; *merged* means "use the canonical existing term" (nothing is added); *rejected* exposes no admin rationale in the employer UI.

### Messaging endpoints
```
GET  {prefix}/ajax/messages/conversations
GET  {prefix}/ajax/messages/conversations/{id}/messages
POST {prefix}/ajax/messages/conversations/{id}/send
GET  {prefix}/ajax/messages/conversations/{id}/shareable-jobs?q=
POST {prefix}/ajax/messages/conversations/{id}/send-email
POST /ajax/presence/ping          (405 on GET)
```
`{prefix}` is `/employer` for employers. Verified: `GET /employer/ajax/messages/conversations` → `[]` in 344 ms.

---

## 5.15 Hidden, undisclosed & unwired capabilities ✅ (verified 2026-11-17)

Not linked from any navigation item, or reachable only through a side effect. Method: parsed each employer page's HTML for hidden blocks/modals/comments, grepped every inline script for `fetch()` targets and route strings, then probed a 40-route matrix with `fetch(..., {redirect:"follow"})` (scripts in `.tmp/audit-hidden*.js`).

### Implemented, but no UI entry point

| Capability | Path / endpoint | How it's hidden |
|---|---|---|
| **Applicant full profile** | `GET /employer/applications/{ulid}/profile` | Reachable by clicking an application row; never named in the UI. Shows AI match %, **per-skill match breakdown**, contact details, resume download, Schedule / Message / Reject. |
| **Applicant detail panel** | `GET /employer/applications/{ulid}/details` | Same — an unlabelled partial route. |
| **Granular staff permissions** | `GET /employer/add-team-member` → 14 flags | Team table prints only 4 coarse access labels. Actual flags: `job_can_view/create/edit/delete`, `application_can_view/edit/delete`, `company_can_view/edit`, `candidate_can_view`, `message_can_view`. |
| **Staff create / edit as pages** | `/employer/add-team-member`, `/employer/edit-team-member/{ulid}` | Presented as modals; the real form is server-rendered. |
| **Department / Role CRUD pages** | `/employer/departments/create`, `/employer/departments/{id}/edit`, `/employer/roles/create`, `/employer/roles/{id}/edit` | Presented as inline modals. |
| **Active Sessions (device revocation)** | `POST /settings/sessions/revoke` | One line at the bottom of Change Password ("Windows PC · Edge 157 · Active now") with no nav. |
| **2FA — fully wired backend** | `/settings/2fa/email/toggle`, `sms/toggle`, `sms/send-verification`, `sms/verify`, `authenticator/setup`, `authenticator/toggle`, `authenticator/verify` | UI badges read **"Coming Soon"** beside Authenticator App and SMS, yet the buttons are enabled and the endpoints exist (`Verify & Enable`, `Regenerate / Reconfigure App`, `Disable`, `Change Phone Number & Verify`). Either ship the badges or the routes — not both. |
| **Bulk job actions** | `POST /employer/job-postings/bulk` (`ids[]`, `action`) | Hidden `#quickActionForm`; its `action` `<select>` has **zero options**, so the feature is stubbed but unreachable. |
| **CSV exports** | `GET /employer/jobs-management/export`, `GET /employer/applications/export` | Return `text/csv` directly and work without the Export button (button builds a query string client-side). |
| **Deep links** | `/employer/messages?conversation_id={ulid}`, `/employer/applications/{ulid}/profile` | Work, but undocumented; the dashboard links into them silently. |
| **Semantic search mode** | `#modeRibbon` + `#modeLabel` on `/employer/candidates` | "Semantic Results" ribbon only appears after a semantic query — implies a keyword↔semantic switch that has no visible toggle. |
| **Company page settings** | `/employer/company-profile` → "Page Settings" tab | `Public company page` and `Show open roles on page` toggles, easy to miss behind the tab. |
| **Conditional form blocks** | `#phone_number_container`, `#office_location_container`, `#offerSentWarning` | Only injected for certain interview types / offer states, so they look absent until the right branch is taken. |
| **Recent Activity History / Recruiting Team** | dashboard modals `#recentActivityModal` etc. | No trigger visible until the card header is clicked. |

### Backend endpoints with no UI at all

```
GET  /api/v1/locations/states?country_iso=CA        # full geography service
GET  /api/v1/locations/cities?state_id=… | ?state_name=…
GET  /employer/job-postings/staff-by-department?department_id=
GET  /employer/staff-dashboard/stats?days=          # feeds the KPI cards
GET  /employer/job-activity/stats?days=&job_id=     # feeds the charts
GET  /employer/dashboard/all-data                   # whole dashboard payload
GET  /employer/dashboard/weekly-data?offset=        # chart paging
POST /employer/notifications/preferences            # 405 on GET, no visible form
POST /ajax/presence/ping                            # online-status heartbeat
```

The `locations` pair is a complete states/cities lookup that the wizard and company profile call silently — useful if any other surface ever needs geography.

### Routes that look like features but are 500 (wildcard collision)

`/employer/job-postings/{id}` is registered against a **non-existent controller method**, so any word in that segment resolves to it:

| Route probed | Reality |
|---|---|
| `/employer/job-postings/import` | **Not a feature** — swallowed by the `{id}` wildcard |
| `/employer/staff/create` | **Not a feature** — same; real path is `/add-team-member` |
| `/employer/job-postings/bulk` (GET) | 500 on GET; it is a POST-only form target |

The two wildcard collisions return the 1.2 MB Ignition trace described in §9.1 #1a. Treat "import" and "staff/create" as **false positives** in any route inventory.

### Gated / context-only

- **Share Job** in Messages is `disabled` until a conversation exists.
- Taxonomy request modal opens only from a Select2 "no results" state.
- Offer / Interview / Rejection / Feedback modals exist only once an application does.

### Dead code

`/employer/company-profile` ships a commented-out control:
```html
<!-- <button class="btn btn-outline" onclick="showToast('Settings saved!')"> Settings </button> -->
```
No handler behind it — a fake success toast left in the template.

### Confirmed absent (404, not merely hidden)

No offers, interviews, analytics, reports, billing, plans, payments, integrations, webhooks, API tokens, audit log, saved candidates, talent pool, pipeline, calendar, tasks, email templates, or job import. Employer credentials are correctly refused on `/admin/*`.

---

## 6. Endpoint reference

### HTML routes
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | – | Landing |
| GET | `/jobs` | – | Search |
| GET | `/cmp/{ulid}` | – | Company page |
| GET | `/cmp-preview/{ulid}?job={ulid}` | – | Job share page |
| GET | `/about-us`, `/contact-us` | – | Marketing |
| POST | `/contact-us` | – | Enquiry form |
| GET | `/auth` | – | Login/signup UI |
| POST | `/login` | – | `email`, `password`, `role_choice`, `remember` |
| POST | `/register/candidate` | – | Candidate signup |
| POST | `/register/employer` | – | Employer signup 🟡 |
| GET/POST | `/verify/otp` | – | `email` + 6-digit `code` |
| GET | `/logout` | – | Renders page; actual logout is `POST /logout` |
| POST | `/logout` | ✅ | `_token` |
| GET | `/candidate/dashboard` … `/candidate/change-password` | candidate | See §4.2 |
| GET | `/employer/*` | employer | See §4.3 |
| GET | `/admin/*` | admin | See §4.4 |

### JSON / AJAX
| Method | Path | Response |
|---|---|---|
| GET | `/jobs/{ulid}/details` | `application/json` — job detail payload |
| POST | `/jobs/{ulid}/apply` | JSON — application result (FormData) |
| POST | `/candidate/jobs/toggle-save` | JSON — save/unsave (405 on GET, so POST-only) |
| GET | `/candidate/notifications/poll` | JSON — badge feed |
| GET | `/search/suggest?q=` | `{"suggestions": ["DevOps Engineer", …]}` |
| GET | `/candidate/resume/{ulid}/download` | `application/pdf` |

### `/jobs` search contract ✅ (decoded 2026-11-18)

There is no JSON search API. `/jobs` is **one endpoint with content negotiation**: the same Blade page renders full HTML normally, and returns JSON *fragments* when the request carries both `X-Requested-With: XMLHttpRequest` and `Accept: application/json`. `Accept` alone is not enough (returns the 190 KB HTML page); `Vary: X-Requested-With, Accept, Accept-Encoding` advertises the switch.

```
GET /jobs?<params>&_t=<Date.now()>
X-Requested-With: XMLHttpRequest
Accept: application/json

→ 200 {"jobs_html": "<div class=results-header>…", "sidebar_html": "<div class=filter-sidebar>…"}
```

Response is **only those two strings** — no counts, totals, page number or cursors. Everything (result count, cards, pagination, facet counts) must be scraped back out of the HTML:

| Fragment | What it contains |
|---|---|
| `jobs_html` | `.results-count` ("Filters 33 jobs found"), 10 × `.jl-card` (`data-job-token` = job ULID, `onclick="loadJobDetails(ulid, <score>)"`), `.pagination`, hidden `#targetSkillsData` / `#exactSkillsData` (the query-expansion dictionary and highlight list — see **How `q` is matched**), hidden echo of `managed_categories[]` |
| `sidebar_html` | Facet counts per option with the current filters applied (e.g. `Contract 30`, `Hybrid 30`, `Urgent Hiring 27`) |

**Parameters (all verified live)**

| Param | Type | Verified values / behaviour |
|---|---|---|
| `q` | string | Free text, matched as **one contiguous phrase - word order matters**, not as AND-ed tokens: `q=project manager` → 4 but `q=manager project` → **0**; `q=frontend developer` → 2 but `q=developer frontend` → **0**; `q=selenium kafka` → **0** even though one job carries both skills. Searched fields: **title**, **company**, **category tag** (all substring) and **skill names** (exact). Description, location and the work-mode/type/urgency/experience chips are **not** searched. A curated synonym table substitutes alternatives for known phrases (`tester` → `qa engineer`), which is why the board looks semantic. Empty or absent → all jobs. Full behaviour in **How `q` is matched** below. |
| `location` | string | Naive `LIKE %…%` against the location string. `Toronto` → 21, `Ontario` → 24, `ON` → **32 of 33**, `Atlantis` → 0. |
| `min_exp` | int | **Behaves as experience-band equality, not a minimum.** `1` → "Junior" (1 job), `3`/`5` → "Mid" (0), `8` → "Senior" (15), `10` → "Lead" (11). Sidebar legend (Mid 3–5, Senior 5–8, Lead 8+) overlaps at the boundaries. |
| `exp[]` | enum | `any` (no-op), `junior`, `mid`, `senior`, `lead`. Counts: 1 / 0 / 15 / 11. |
| `types[]` | int id | `1` Full-time (3), `2` Part-time (0), `3` Contract (30), `4` Freelance (0), `5` Internship (0), `6` Temporary (0). No id `0`. |
| `work_modes[]` | enum | `Remote-only` and `Remote` are aliases (1 job each), `Hybrid` (30), `On-site` (2). |
| `is_urgent` | `1` | 27 jobs. |
| `salary_tab` | enum | `salary` \| `contract` — selects which pair of inputs is read (see **Salary vs Contract** below). Anything else (`rate`, `Salary`, `Contract`, `bogus`) applies **no** pay filter at all. |
| `min_salary` / `max_salary` | number | Read only with `salary_tab=salary`. Compared as **raw numbers**, and the data is monthly: only 2 of 34 postings have a salary, both ≤ $500. The UI placeholders (`1K`, `2K`, `50K`) imply annual thousands, so any realistic annual figure returns 0. |
| `min_rate` / `max_rate` | number | Read only with `salary_tab=contract`. Numeric range on hourly rate; either bound may be omitted. Merely choosing the tab restricts to the **32 of 34** postings that have a rate. Non-numeric input (`abc`) silently drops the whole salary filter (34 results); `20 hrs` casts to `20`. Board rates run **$50–$100/hr** (`max_rate=50`→25, `60`→28, `80`→31, `100`→32). |
| `sort` | enum | `latest` (default), `best`, `salary_high`, `salary_low`, `rate_high`, `rate_low`. Invalid values fall back to `latest` silently (no 422). **`rate_*` returns 32 jobs instead of 33** — the rate sorter drops a posting with no hourly rate. Full behaviour in **Sorting variations** below. |
| `page` | int | Laravel paginator, 10 per page, 4 pages for 33 jobs. `page=99` → **200 with 0 cards and a "33 jobs found" header** (soft 404). Page links preserve filters. |
| `per_page` | int | **Ignored** — page size is fixed at 10. |
| `show_matching` | `1` | "Show Matching Jobs with Your Profile and preferences". With this candidate's empty target-skill set it returns **0 jobs with no explanation**. |
| `flush_cache` | `1` | No observable effect (same ~400 ms, same headers). |
| `_t` | int | Client cache-buster only (`Date.now()`). |

**Filter logic:** OR inside a group (`types[]=1&types[]=3` → 33), AND across groups (`types[]=1&work_modes[]=Hybrid` → 1). Count label concatenates the groups ("15 jobs found as Contract matching Hybrid with Senior experience").

### How `q` is matched — the "semantic" layer is a synonym table

There is **no embedding / vector / LLM search** on the public board: no `semantic`, `embedding`, `vector`, `openai` or `similarity` strings exist in the inline bundle, and every behaviour below reproduces with plain string matching. What reads as "semantic" is a **curated synonym dictionary** plus phrase matching.

The server normalises `q`, expands it, and ships both arrays back inside the HTML in two hidden inputs (no `name`, so they are never submitted):

| Hidden input | Value for `q=tester` | Role |
|---|---|---|
| `#targetSkillsData` | `["tester","qa engineer","qaengineer","test engineer","testengineer"]` | the expansion set |
| `#exactSkillsData` | `["tester"]` | literal phrase + de-spaced form + split words, used for highlighting |

That first array is the whole trick. `tester` is a dictionary key whose cluster is `{tester, qa engineer, test engineer}`; the job **Automation QA Engineer** carries "QA Engineer" in its indexed title/skills, so it is returned. Nothing infers that QA is testing.

**Normalisation** (verified): lowercase, trim, collapse repeated spaces, `-` → space. `TESTER`, ` tester`, `tester `, `qa-engineer` and `qa  engineer` all resolve to the same query; `automation-qa` ≡ `automation qa`.

**Fields searched** (positive and negative probes):

| Field | Match type | Proof |
|---|---|---|
| `title` | substring | `eveloper` → 10 titles; `kafk` / `afka` → Kafka Admin; `admin` → 2 |
| **company name** | substring | `Chuwel` → 1 (its only posting); `J&M`, `Group`, `Inc` → **33**; `J & M` / `jm group` → **0** (no `&`→`and`, no space-insensitive match) |
| category / primary `.jl-tags` chip | substring | `test` → Automation QA Engineer (chip `Test Automation`); `ci/cd & automation` → 2 |
| skill names (incl. `is_synonym` skills) | **exact name** | `selenium` → 2 but `selen` / `elenium` → **0**; `rest` → 1 (skill `REST`), `restful` → **0** |
| `description` | **not searched** | `lending` and `fico` → 0 although both are in the Automation QA Engineer description |
| `location` | **not searched** | `Toronto`, `Canada`, `Ontario` → 0 even though 21 jobs are in Toronto — location has its own parameter |
| work mode / type / urgency / experience chips | **not searched** | `hybrid`, `contract`, `urgent`, `9+ yrs` → 0 on a board where those chips appear on every card |

**The query is one phrase, not a bag of words** — the biggest departure from "semantic":

| Query | Jobs | Why |
|---|---|---|
| `project manager` | 4 | phrase present in titles |
| `manager project` | **0** | reversed |
| `frontend developer` | 2 | |
| `developer frontend` | **0** | reversed |
| `qa automation` | **0** | title is "Automation QA Engineer" |
| `automation qa` | 1 | contiguous prefix of that title |
| `selenium kafka` / `kafka selenium` | **0** | one job has both skills, but the phrase exists nowhere |
| `senior tester`, `qa tester`, `manual tester` | **0** | compounds are not dictionary keys |
| `testers` | **0** | no stemming |
| `testerz` | **0** | no typo tolerance |

**Where the dictionary is thin or asymmetric** (all verified):

| Query | Jobs | Note |
|---|---|---|
| `nodejs` | **0** | Technical Lead has skill `Node.js`; the `nodejs` cluster is `node, nestjs, nest`, which misses it |
| `node.js` | 1 | works |
| `c#` | 1 | works |
| `c++` | **0** | cluster is `cplusplus, cpp, stl…`; no posting |
| `quality assurance` | 1 | works via `qa` |
| `assurance` | **0** | alone, not a key |
| `tester` | 1 | works via `qa engineer` |
| `developer` | 10 | expansion set is just `["developer"]` — no SDE / software engineer / programmer equivalents |
| `programmer`, `coder`, `sde`, `swe` | **0** | 10 of the 34 postings are developer roles, but none of these words appear in a title, category or skill name |
| `sdet` | **0** | the dictionary *does* hold `software development engineer in test`, but no posting contains that phrase, so the expansion finds nothing |

Expansion nests at least two hops: `automation` → `aa` → `automation anywhere a360`; `test automation` → `automation framework` / `taf` / `automation testing` → `automation` → `aa`.

Practical rule: type the exact phrase as it would appear in a job title or company name, or one skill name on its own, in the original word order - and never combine two skills in one query.

**When embeddings would be the right tool** (and when they wouldn't):

| Signal | Keyword + synonyms is enough | Embeddings earn their cost |
|---|---|---|
| Corpus size | tens–low hundreds of postings | thousands+, or free-text documents (resumes) |
| Vocabulary | fixed skill taxonomy, short titles | open-ended user phrasing, typos, multi-word intents |
| Fields | title / skills / category | long descriptions, resumes, cover letters |
| Use case | filtering (location, type, salary) | similarity ("jobs like this", candidate ↔ job) |
| Explainability | must show exactly why a job matched | ranked relevance is acceptable |
| Ops | no index/rebuild pipeline | can re-embed on edit, pay per query |

Rule of thumb for this board: at 34 postings, plural normalisation + token AND + a filled synonym table fixes every failure found here for near-zero cost. Embeddings become worthwhile at roughly the point where the synonym table is unmaintainable (hundreds–thousands of postings, or once resumes are searched), and even then as a **hybrid** layer beside keyword search, never instead of it — embeddings cannot match `devel`, `afka` or `C#` reliably.

> The word "semantic" does appear on the **employer** side (`#modeRibbon` "Semantic Results" on `/employer/candidates`, §5.15). That is a different surface with its own pipeline; it is not used by the public board.

### Salary vs Contract tab

The sidebar has **one salary section with two tabs** — they are not two filters, they're two **units** sharing the same two input boxes:

| Tab | Hidden `salary_tab` | Inputs sent | Placeholders |
|---|---|---|---|
| **Salary** | `salary` | `min_salary`, `max_salary` | `e.g., 1K, 2K` / `e.g., 50K` |
| **Contract** | `contract` | `min_rate`, `max_rate` | `e.g., 20 hrs` / `e.g., 30 hrs` |

`setSalaryTab()` swaps the `name` attributes on the two fields and rewrites the placeholders; clicking a tab also **clears both values**. The tab is kept in the URL, so a shared link reopens on the same tab.

Server behaviour:

| `salary_tab` | Effect |
|---|---|
| `salary` | numeric range on the salary column |
| `contract` | numeric range on the hourly-rate column, **and** restricts to postings that have a rate |
| missing | no pay filter |
| `rate`, `Salary`, `Contract`, `bogus` | no pay filter (case-sensitive, only the two literals work) |

The filter is numeric and lenient in a dangerous way: `min_rate=abc` **drops the pay filter entirely** (all 34 jobs), while `min_rate=20 hrs` coerces to `20` and filters. So typing the unit can either work or silently switch the filter off.

What the live data looks like (34 jobs):

| Query | Jobs | Meaning |
|---|---|---|
| `salary_tab=contract&max_rate=40` | 0 | nothing below $40/hr |
| `max_rate=50` | 25 | cheapest band |
| `max_rate=60` | 28 | |
| `max_rate=80` | 31 | |
| `max_rate=100` | 32 | 32 postings have a rate |
| `min_rate=20&max_rate=30` | 0 | the placeholder's example range matches nothing — the board is $50–$100/hr |

Two postings have no rate at all (C# Developer, Product Owner), so **opening the Contract tab alone** drops the board from 34 to 32. On the Salary side only 2 postings have any figure and both are ≤ $500 — i.e. monthly amounts — while the placeholders suggest annual thousands, so `min_salary=1000` or `50000` returns zero.

### Experience: `min_exp` and `exp[]` are two filters, not two views

The UI has **two entry points for one idea** and posts both:

| Control | Param | Where |
|---|---|---|
| "Years of experience" number box | `min_exp` | hero banner (`#minExpInput`) |
| Experience checkboxes | `exp[]` (multi) | filter sidebar |

The flow is **asymmetric**, and that's where it breaks:

- **Number → checkbox:** typing in the years box auto-ticks the matching bucket (`syncExperienceRangeCheckbox()`), and **keeps the number**, so both params are submitted.
- **Checkbox → number:** clicking a checkbox (anything except "Any") **clears the years box**, so `min_exp` drops out of the request and only `exp[]` is sent.
- **But the auto-tick is never undone.** Typing `10` ticks *Lead*; clicking *Junior* afterwards clears the number and ticks Junior — and **Lead stays ticked**, so the request becomes `exp[]=junior&exp[]=lead` (OR) = 12 jobs, not 1.

`fetchJobs()` only keeps `min_exp` when the box is non-empty; an empty box deletes the param and leaves the checkboxes alone.

**When both do travel, the server ANDs them** (they are separate filters, not aliases):

| Request | Result |
|---|---|
| `?min_exp=1` | 1 job — "Junior" |
| `?exp[]=junior` | 1 job — "Junior" |
| `?min_exp=1&exp[]=junior` | 1 job (they agree — the normal result of typing `1`) |
| `?min_exp=10` | **11 jobs** — "Lead" |
| `?min_exp=10&exp[]=junior` | **0 jobs** — lead ∧ junior = ∅ (hand-built URL only) |
| `?min_exp=1&exp[]=lead` | **0 jobs** — junior ∧ lead = ∅ (hand-built URL only) |
| `?exp[]=junior&exp[]=lead` | 12 jobs — OR within the checkbox group |

Because clicking a box clears the number, a stale `min_exp` can't veto a manual selection — but a stale **auto-ticked checkbox** can silently broaden it, and the count label repeats only the checkbox text, so the extra tick is invisible in the message.

Three band tables also disagree, and they meet at 5:

| Boundary | Sidebar legend | JS `syncExperienceRangeCheckbox` | Server (`min_exp`) |
|---|---|---|---|
| 0–2 | Junior | Junior | Junior |
| 3–4 | Mid (3–5) | Mid | Mid |
| **5** | Mid **and** Senior | **Senior** | **Mid** |
| 6–8 | Senior (5–8) | Senior | Senior |
| 9+ | Lead (8+) | Lead | Lead |

So typing `5` ticks *Senior* in the UI while the server filters *Mid* (0 jobs) — and if the checkbox is left ticked, the AND makes the result empty regardless.

### Sorting variations ✅ (2026-11-18)

Sorting reorders the same result set (it does not filter — except `rate_*`). Observed on the live 33-job board:

| `sort=` | Jobs | What you actually get |
|---|---|---|
| `latest` (default) | 33 | Newest first. Also the silent fallback for **missing, empty, invalid, or wrongly-cased** values. |
| `best` | 33 | Adds the `.jl-match` badge to every card. Scores are **bimodal, not continuous**: 50% baseline, 69% for jobs sharing profile skills. Page 2 is all 50%. Same job reports `match_score: 0` from `/details`. |
| `salary_high` / `salary_low` | 33 | **Not a visible pay order** — 32 of 33 postings store no salary at all (`/details` → `salary: ""`), yet C# Developer (`$200–$500/mo`, the only one with pay) is **first in both directions**. Ordering among the null-salary jobs is internal-only, and `salary_high` is nearly identical to `rate_high`. |
| `rate_high` / `rate_low` | **32** | Drops the monthly-paid job (C# Developer) — the rate sorter filters to postings with an hourly rate. The remaining order matches `salary_high`. |
| `best&sort=latest` (duplicate) | 33 | Last parameter wins → `latest`. |
| `SALARY_HIGH` | 33 | Case-sensitive → falls back to `latest`. |
| `sort=` (empty) | 33 | → `latest`. |
| `sort[]=best` | — | **500** `{"success":false,"message":"Something went wrong…"}` (array where a string is expected). |
| `sort=<bogus>` | 33 | → `latest`, no error, no warning. |

Two further behaviours:

- **Keyword search overrides the user's sort.** `#heroSearchForm` submit and `#searchBtn` both set `.sort-select` to `best` and then call `fetchJobs()` — so typing a keyword and pressing Search silently switches Newest → Best Match.
- **Sort + pagination is unstable.** `?sort=salary_high` page 1 ends with token `01KZRXVGWMVZR1YBAH0C0DSCHJ` ("IT Project Manager") and page 2 **starts with the same token**: a non-unique `ORDER BY` over a mostly-NULL column, so one posting repeats and another is skipped entirely. Page links do preserve filters and sort (`?types[0]=3&sort=salary_high&work_modes[0]=Hybrid&page=2`).

### `managed_categories[]` — the encrypted category filter

Decodes to a Laravel Crypt payload (base64 JSON):

```json
{"iv":"3KMtAg54TDfxRkd0Gy8Vnw==","value":"GVRiqvda3HvsfNMmzut3/g==","mac":"1019eb46…","tag":""}
```
`iv` = 16 bytes, `value` = 16 bytes ciphertext (AES-256-CBC, so the plaintext is ≤15 bytes — a small integer), `mac` = 32 bytes as 64 hex chars (HMAC-SHA256), `tag` empty because CBC rather than GCM. **It cannot be decrypted without `APP_KEY`**, and it is *not* a security control:

- **Plain integers are accepted.** `?managed_categories[]=12` → `for "Infrastructure & Virtualization"`. The server resolves the id and echoes the category name in the count string.
- **Therefore the whole taxonomy enumerates.** Iterating ids `1..99` yields **98 categories** (id `95` is missing; `100+` and `9999` resolve to "No jobs found"). This is how the category list was dumped without logging in as admin.
- Multiple values are **OR-ed** (`13` + `80` → 5 jobs) but the count label names only the first category, so it reads "5 jobs found for \"Data Pipeline & ETL\"" when 2 of the 5 came from the other category.
- Invalid or MAC-failed blobs are **silently ignored** — `?managed_categories[]=not-a-blob` → 200 with all 33 jobs. No 422, no 500, fail-open.
- `q` + `managed_categories[]` → the category is **silently dropped** (`?q=engineer&…=13` → 7 jobs, the plain keyword count). `cleanUrlOnLoad()` also strips it client-side.

### Match score is three different numbers

| Surface | Value for the same job (C# Developer) | Meaning |
|---|---|---|
| Listing badge `.jl-match` | **50%** on `?sort=best`, **75%** on `?q=c%23`, absent on the default list | Actually query/relevance score, labelled "Match Score" |
| `onclick="loadJobDetails(ulid, 50)"` | 50 | The badge is passed into the detail panel as the match value |
| `GET /jobs/{ulid}/details` → `match_score` | **0** | Profile-based score, not computed for this candidate |
| Quick Apply hidden `match_score` | whatever the badge sent | Client-supplied; see §9.5 |

### Related endpoints

```
GET /taxonomy/skills?q=fig   → {"results":[{"id":"1364","skill_id":1364,"text":"Figma"},
                                            {"id":"syn_1126","skill_id":1364,"text":"Figma design"}]}
```
Select2 remote source. `id` is the value posted in `managed_skill_ids` (comma-separated, e.g. `1,2` → 2 jobs); `syn_*` ids are synonyms that collapse to a canonical `skill_id`. `flush_cache`, `_t` and `q` are the only accepted params.

`GET /jobs/{ulid}/details` → `share_url, id, title, company, company_id, company_slug, location, is_remote, is_paused, is_inactive, inactive_status, tags[], skills[{name,is_synonym}], salary, description, match_score, deadline, has_applied, is_saved, public_key, slug, logo_url`.

`GET /api/jobs` → `404 {"success":false,"message":"The route api\\/jobs could not be found."}` — an `/api/v1/*` namespace exists (see §5.15) but job search is not exposed there.

### Job alert form actions
`POST /candidate/job-alerts` with `_method=POST|PUT|DELETE` for create/update/delete.

---

## 7. Data model (inferred) 🟡

```
User (candidate | employer | admin)
 ├─ CandidateProfile: headline, years_experience, location, completeness,
 │   work_mode, employment_type, expected_salary(+period), contract_rate,
 │   availability_status, notice_period, work_authorization,
 │   preferred_locations[], willing_to_relocate, profile_visibility
 ├─ Resume (ULID, file, parsed_at, version history)
 ├─ Skill (name, is_synonym, synonyms[])
 ├─ Experience / Education / Certification
 ├─ JobAlert (filters JSON, frequency, weekly_days[], status)
 ├─ Notification (type, icon, tag_label, subject_id, read_at)
 └─ MessageThread → Message (attachments)

Company (ULID, slug, description, logo) — public profile at /cmp/{ulid}
Job (numeric id + ULID job_key, company_id, title, description_html,
     location, is_remote, is_paused, is_inactive, inactive_status, deadline,
     skills[], tags[], urgent flag)
Application (job_key, candidate, resume choice/upload, cover_letter, source,
             match_score, match_type, status enum)
```

**Application status enum:** `applied`, `viewed`, `shortlisted`, `interview_scheduled`, `interviewed`, `offer_sent`, `offer_accepted`, `offer_declined`, `selected`, `rejected`, `withdrawn`.

---

## 8. Client-side JavaScript reference (`/jobs` inline bundle)

| Function | Purpose |
|---|---|
| `fetchJobs()` | Load/filter job list, preserve query state |
| `loadJobDetails(slug, score)` | AJAX job panel; desktop panel or mobile modal |
| `openApplyModal(key, title, company, match, salary)` | Populate quick-apply modal, compute match label |
| `toggleSaveJob(jobId, el)` | POST save/unsave, swaps bookmark icon |
| `openApplyModal` / `closeModal` | Modal lifecycle (also used by saved/ai-matches pages) |
| `toggleResumeUpload` / `handleNewResumeUpload` / `updateResumeOption` | Resume radio ↔ upload switch |
| `toggleFilters()` | Mobile filter drawer |
| `setSalaryTab(tab, on)` | Salary vs contract-rate filter |
| `applyQuickTag(field, value)` / `highlightActiveTags()` | One-tap filter chips |
| `syncExperienceRangeCheckbox()` | Keep range + checkbox in sync |
| `renderChips()` / `formatSkillName()` | Skills multi-select rendering |
| `pollGlobalNotifications()` | 30 s(?) notification badge poll |
| `showToast(msg, type)` | Global toast |
| `cleanUrlOnLoad()` | Strip empty params from URL |
| `scrollToJobList()` | Anchor scroll helper |

---

## 9. Findings & risks

Verified 2026-11-16 with Lighthouse, header inspection, and DOM/network probing.

### 9.1 Functional / user-visible bugs

| # | Severity | Finding | Evidence / repro |
|---|---|---|---|
| 1 | ~~High~~ **RETRACTED** | ~~Company profile page prints its own JavaScript as visible page text.~~ **False positive.** The JS strings only appear in `textContent` because they live inside real `<script>` tags; removing `script`/`style` elements removes them, and live rendered `innerText` on `/cmp/*` does not contain them. | Verified 2026-11-17: strip `<script>` from the parsed DOM → no `mainMenuToggle`; live page `innerText` → clean |
| 1a | **Critical** | **Laravel debug mode is enabled on staging.** `/employer/job-postings/1` returns a 1.2 MB Ignition error page exposing framework version, PHP version, full vendor trace, and internal namespaces. | `500` — `BadMethodCallException … App\Http\Controllers\Employer\JobPostingController::show does not exist`, `LARAVEL 12.62.0`, `PHP 8.3.36`, `app/Http/Middleware/StaffPermissionMiddleware` |
| 1b | **High** | **`GET /employer/job-postings/{id}` throws 500** — the route points at a controller method that was never implemented. The wildcard also swallows `/employer/job-postings/import` and `/employer/staff/create`, which then masquerade as hidden features. | same trace as 1a (route is not linked from the UI, which opens details in a panel instead) |
| 1c | **High** | **Employer candidate search times out on cold start.** First query took > 60 s and returned **504 Gateway Timeout**; the same query then answered in **387 ms**, so results are cached/memoised but the cold path is unusable. | `GET /employer/candidates/search?q=developer` → 504; retry `?q=java` → 200 in 387 ms |
| 1d | **Medium** | **Company logo is a hard 404** on the public profile (`/storage/logos/l_6a83f3e8ad12c3.15724532.png`), so the employer's logo never renders for candidates. | console 404 on `/cmp/01KGKX62SXX0RHJN60RAFZYE2K` |
| 1e | **Low** | `GET /employer/candidates/search` without an XHR/`q` redirects to `/cmp/{companyUlid}` (Laravel `back()` fallback) instead of a JSON 422, which makes API behaviour depend on headers. | probe → landed `/cmp/01KGKX62SXX0RHJN60RAFZYE2K` |
| 1f | **Medium** | **2FA is advertised as "Coming Soon" but is fully implemented.** Authenticator/SMS badges say Coming Soon while `POST /settings/2fa/{email,sms,authenticator}/*` exist and the buttons are enabled — candidates can be pushed away from a security feature that already works. | `/employer/change-password` DOM + endpoint probes (§5.15) |
| 1g | **Low** | **Bulk job actions are a stub:** hidden `#quickActionForm` posts to `/employer/job-postings/bulk` but its `action` `<select>` has no options, so the feature cannot be invoked. | `/employer/jobs-management` DOM |
| 1h | **Medium** | **"Match Score" on job cards is not the profile match.** The same job shows 50% under `sort=best`, 75% under `q=c%23`, and no badge at all on the default list — while `/jobs/{ulid}/details` returns `match_score: 0` for that job. The badge is a query-relevance number passed into `loadJobDetails(ulid, <score>)` and then into Quick Apply as `match_score`. | §6 `/jobs` search contract |
| 1i | **Low** | **Sorting by hourly rate silently drops a job:** `sort=rate_high` / `rate_low` return **32** of 33 postings, while `salary_high` / `salary_low` return 33. | `?sort=rate_high` → "32 jobs found" |
| 1j | **Low** | **Location search is a raw substring match:** `location=ON` returns **32 of 33** jobs (because "toronto"/"london" contain "on"), while `location=Toronto` returns 21 and `location=Toronto, ON` returns 1. | §6 `/jobs` search contract |
| 1k | **Medium** | **Salary/rate sorts make pagination lose a job.** `?sort=salary_high` page 1 ends with the same token that page 2 begins with ("IT Project Manager"), so the row repeats and another posting is never shown — a non-unique `ORDER BY` over a mostly-NULL salary column. | §6 Sorting variations |
| 1l | **Low** | **Salary is hidden on 32 of 33 job cards.** Only C# Developer renders `.jl-salary`; `/jobs/{ulid}/details` returns `salary: ""` for the rest, so the "Salary: High to Low" sort has nothing visible to sort by. | §6 Sorting variations |
| 1m | **Low** | **Typing a keyword silently changes the user's sort to "Best Match".** `#heroSearchForm` submit and `#searchBtn` set the sort dropdown to `best` before fetching, with no notice. | page JS |
| 1n | **Medium** | **The two experience controls get out of sync in both directions.** Clicking a checkbox clears the years box (so `min_exp` drops out), but the checkbox the years box auto-ticked stays ticked: type `10` (ticks *Lead*), then click *Junior* → both are checked → **12 jobs instead of 1**, with no indication that Lead is still on. Typing only sends both params, which agree except at 5 (JS ticks *Senior*, server filters *Mid* → 0). | §6 "Experience: `min_exp` and `exp[]`" |
| 1o | **Low** | `?sort[]=best` returns **500** ("Something went wrong…") instead of ignoring or 422-ing an array where a string is expected. | `GET /jobs?sort[]=best` |
| 1p | **Medium** | **Salary/Contract units are mismatched, and bad input silently disables the filter.** Contract compares hourly rates (board runs $50–$100/hr) but the placeholder says `e.g., 20 hrs`, so `20–30` returns nothing and typing the unit either coerces (`20 hrs`→20) or switches filtering off (`abc` → all 34). Salary compares *monthly* numbers ≤$500 while placeholders suggest annual `1K/50K`. Opening the Contract tab alone also drops the 2 postings without a rate. | §6 "Salary vs Contract tab" |
| 1q | **High** | **Keyword search is a contiguous-phrase match, not a word search.** `selenium kafka` → **0** although one posting carries both skills; `qa automation` → 0 but `automation qa` → 1; `manager project` → 0 while `project manager` → 4; `developer frontend` → 0 while `frontend developer` → 2. Anyone typing skills in their own order gets "No jobs found". | §6 "How `q` is matched" |
| 1r | **Medium** | **"Semantic" search is a hard-coded, incomplete synonym table.** `tester` → Automation QA Engineer only because the table maps `tester` → `qa engineer`; there is no embedding model (no `semantic`/`vector`/`embedding` strings in the bundle). The table misses obvious cases: `testers` → 0 (no plural), `nodejs` → 0 while `node.js` → 1, `qa tester`/`manual tester`/`senior tester` → 0, `c++` → 0. | §6 "How `q` is matched" |
| 1s | **Low** | **Description text is not indexed.** `lending` and `fico` return 0 although both appear in the Automation QA Engineer description; only title, category and skill names are searched. Relevant experience described in the body of a posting is unfindable. | `?q=lending`, `?q=fico` |
| 1t | **Low** | **The query-expansion dictionary is returned to every visitor** in the hidden inputs `#targetSkillsData` / `#exactSkillsData` (unnamed, so not submitted). Harmless, but it exposes the synonym graph per query. | §6 "How `q` is matched" |
| 1u | **Low** | **The search placeholder names three fields but four are searched — and the one it omits is the only precise one.** The box says "job title, category, company…"; skill names are also matched (exactly), which is the only field that gives clean results. Company is matched as a substring, so `Group` or `Inc` return **33 of 34** jobs (every posting is "J&M Group Inc" except one), swamping the list with noise. | `?q=Group`, `?q=Inc` → 33; `?q=Chuwel` → 1 |
| 2 | **Medium** | **Login role selector has no visible effect.** Choosing **Employer** still lands on `/candidate/dashboard`. Either `role_choice` is ignored server-side or routing is account-driven while the UI implies a choice. | Set `#role_emp`, submit `POST /login` → `302 /candidate/dashboard` |
| 3 | **Medium** | **`/jobs?page=999` returns `200`** with a rendered list instead of 404/redirect — soft-404 duplicate content. | `GET /jobs?page=999` → 200, 154 KB |
| 4 | **Medium** | **`/admin/login` redirects to `/`** instead of rendering a login, while `/admin/*` sub-routes exist. Confusing and hard to diagnose for admins. | `GET /admin/login` → 302 → `/` |
| 5 | **Low** | `/employer/applications/{id}` 404s — there is no bare record route; the real detail routes are `/employer/applications/{id}/profile` and `/details`, which are undiscoverable (§5.15). | probe matrix |
| 6 | **Low** | No deep links for saved jobs / previews (`/candidate/saved-jobs/{id}`, `/jobs/preview` → 404); everything is driven by the JS panel, so results can't be linked or shared. | probe matrix |
| 7 | **Low** | Case-sensitive paths: `/JOBS` → 404. Fine on Linux, but user-typed URLs break. | `GET /JOBS` → 404 |

### 9.2 SEO / crawlability

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 8 | **High** | **`robots.txt` returns Apache 403**, so there are no crawl rules at all while `sitemap.xml` publicly lists 52 URLs. Staging is indexable under a production-looking domain. | `GET /robots.txt` → 403; `GET /sitemap.xml` → 200, 52 URLs |
| 9 | **Medium** | **Sitemap lists `/auth` (login + signup) URLs** and staging hosts — both should be excluded. | sitemap entries `/auth`, `/auth?tab=signup&role=candidate|employer` |
| 10 | **Medium** | **Duplicate company URLs with self-referencing canonicals**: `/cmp/{ulid}` and `/cmp/{slug}` both return 200 with different canonicals, so they compete as duplicates. | both 200; canonical = own URL in each |
| 11 | **Medium** | **`/jobs` has no `<h1>`** and Lighthouse SEO = 0.80. Company page has no `<h1>` and **no meta description**. | HTML audit |
| 12 | **Low** | "View All →" / "Browse All →" style controls render as anchors without `href` (Lighthouse `crawlable-anchors`). | Lighthouse /jobs |
| 13 | **Low** | Company page: 4 of 5 images have no `alt` attribute. | HTML audit |

### 9.3 Accessibility

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 14 | **Medium** | Lighthouse **Accessibility 0.88 on `/jobs`** and **0.75 on `/auth`**. Failing audits: `label`, `select-name`, `aria-input-field-name`, `color-contrast`, `link-in-text-block`, `landmark-one-main`, `autocomplete-valid`. | Lighthouse |
| 15 | **Medium** | The **anti-autofill decoy inputs** (`fake_email`, `fake_password`) have no labels and invalid `autocomplete`, which is exactly why `/auth` fails `label` + `autocomplete-valid`. | Lighthouse + `#quickApplyForm`/auth DOM |

### 9.4 Configuration / hygiene

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 16 | **Medium** | **GA4 `G-HYNR4L5K1Z` fires on staging**, polluting production analytics. | gtag on every page |
| 17 | **Medium** | **Footer links to production** (`https://www.itriders.ai/contact-us`) from staging. | homepage anchors |
| 18 | **Medium** | **Absolute staging URLs hardcoded** in nav/footer instead of relative paths — the whole site breaks on domain change or on the production host if copied. | 20+ `https://staging.itriders.ai/...` hrefs on `/` |
| 19 | **Low** | **Duplicate HSTS header** concatenated into one malformed value (`max-age=31536000; … preload\nmax-age=15768000`). | response headers |
| 20 | **Low** | **Inconsistent dependency versions across pages**: Select2 `4.0.13` (home) vs `4.1.0-rc.0` (jobs, loaded twice); Font Awesome `6.5.1` vs `6.5.2`. | script/link audit |
| 21 | **Low** | Heavy inline JS: **86 KB inline on `/jobs`** (199 KB HTML), 27 KB on `/`. Blocks caching and bloats TTFB. | HTML audit |
| 22 | **Low** | CSP is present but includes `'unsafe-inline'` and `'unsafe-eval'` in `script-src`, which removes most XSS benefit. | CSP header |
| 23 | **Info** | `managed_categories[]` filters are transported as Laravel-encrypted blobs → long, unshareable filter URLs. | category chip `href` |
| 24 | **Info** | Employer and admin surfaces are only partially built (see §4.3/§4.4); many plausible routes 404. | probe matrix |

### 9.5 Security to review (not exploitable as tested)

| # | Severity | Finding |
|---|---|---|
| 25 | **Medium** | `match_score` / `match_type` are client-supplied hidden fields on Quick Apply. If the server trusts them, candidates can forge their own AI match score — re-derive server-side. |
| 26 | **Medium** | `/candidate/resume/{ulid}/download` was not tested for ownership checks (**possible IDOR**) — verify it validates the resume belongs to the session user. |
| 27 | **Low** | Login requires an emailed OTP on every sign-in with no visible rate-limit feedback; combined with `POST /login` this is worth a brute-force/throttle review. |
| 28 | **Low** | **The `managed_categories[]` encryption is cosmetic.** The filter accepts plain integer ids (`?managed_categories[]=12` → `"Infrastructure & Virtualization"`), so the whole 98-entry category taxonomy enumerates without credentials, and the name of any id is echoed back in the result label. Invalid/tampered blobs are silently ignored (fail-open) rather than rejected. |

### 9.6 What already looks good

- `itriders_session` cookie is `HttpOnly` + `Secure` + `SameSite=Lax`.
- `X-Frame-Options: SAMEORIGIN`, `nosniff`, `X-XSS-Protection`, HSTS present, and HTTP → HTTPS redirect works.
- A CSP exists and is reasonably scoped (CDNs, GA, CKEditor, maps).
- 404s return a real 404 status with a custom page; ULIDs are used for public identifiers.

---

## 10. What is still unknown ❓

Employer area is now documented in §5.14. Remaining unknowns need an **admin** account or source access:

1. Admin moderation workflow for job-postings / categories / employers / candidates (`/admin/dashboard`, `/admin/job-postings`, `/admin/categories`, `/admin/employers`, `/admin/candidates`).
2. How taxonomy requests (employer → admin) are approved/merged/rejected.
3. Whether notifications/alerts are queued or cron-driven (weekly alert digests) and which mail provider is used.
4. Rate limiting and brute-force protection on `POST /login` and `/verify/otp`.
5. Whether `/candidate/resume/{ulid}/download` validates ownership (**possible IDOR** — untested).
6. Server-side validation of `match_score` / `match_type` on apply and save.
7. Whether the 14 staff permission flags (`job_can_*`, `application_can_*`, `company_can_*`, `candidate_can_view`, `message_can_view`) are enforced on every route or only in navigation — §5.15 shows the flags exist, and `StaffPermissionMiddleware` appears in a stack trace, but enforcement was not tested.

---

## 11. How to reproduce

```powershell
# 1. Route status matrix
#    existing-but-wrong-role  -> 200, lands on /candidate/dashboard
#    missing                  -> 404, "404 NOT FOUND"
curl.exe -s -o NUL -w "%{http_code} %{url_effective}\n" https://staging.itriders.ai/employer/job-postings
curl.exe -s -o NUL -w "%{http_code} %{url_effective}\n" https://staging.itriders.ai/employer/settings

# 2. Sitemap inventory
curl.exe -s https://staging.itriders.ai/sitemap.xml

# 3. JSON endpoints (authenticated session required)
curl.exe -s "https://staging.itriders.ai/search/suggest?q=dev"
curl.exe -s "https://staging.itriders.ai/jobs/01M0X4DGV75G2WN6A31Z95MHFA/details"
```

Browser console helpers (signed-in):

```js
// Enumerate inline app functions
[...document.querySelectorAll('script:not([src])')]
  .flatMap(s => (s.textContent.match(/function\s+([A-Za-z0-9_$]+)/g) || []))
  .filter((v, i, a) => a.indexOf(v) === i)

// Feed the notification badge
await (await fetch('/candidate/notifications/poll', { headers: { Accept: 'application/json' } })).json()
```

---

## 12. Quick reference — sample identifiers seen

| Entity | Value |
|---|---|
| Company (J&M Group Inc) | `01KGKX62SXX0RHJN60RAFZYE2K` |
| Job "Full-Stack Developer" (id 526) | `01M0X4DGV75G2WN6A31Z95MHFA` |
| Candidate resume | `01M7HGHGF2NHSMY7D132JMDS41` |
| Notification sample id | `6498` (`profile_improvement`) |

---

*Notes: the documentation session used Microsoft Edge because the browse extension was paired there; Chrome was not paired at the time of writing. No applications, messages, or destructive actions were submitted during exploration.*
