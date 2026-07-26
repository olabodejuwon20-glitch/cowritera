# Co-Research AI — MVP Build Plan

This is a large product. To ship something great instead of a shallow shell of every screen, I'll build in phases and confirm scope with you before writing code.

## Phase 1 (this build) — Public site + Interactive Demo

Focus: everything a visitor sees before paying. No backend, no auth, no payments yet.

**Pages**
- Landing page (hero, product philosophy, how it works, pricing preview, FAQ, CTA)
- Pricing page (Free Demo vs ₦3,500 Project Pass, one active project rule)
- FAQ page
- Interactive Demo workspace at `/demo`:
  - Left sidebar: Project Info, Lecturer Guide, AI Analysis, Cover Page, Outline, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References, Export
  - Center: read-only academic document viewer with realistic GNS 102 content (pre-written, no AI calls)
  - Right sidebar: AI Assistant / Suggestions / Compliance panels (visual only)
  - Export buttons trigger "Unlock Project Pass" modal
- Login / Register pages (UI only, non-functional)

**Design system**
- Purple (#7C3AED) primary, white, light purple accent, soft gray surfaces
- Times New Roman inside the document viewer; Inter for app chrome
- Rounded corners, subtle gradients, tasteful glassmorphism, smooth transitions
- Mobile-first, fully responsive
- Semantic tokens in `src/styles.css` (oklch), no hardcoded colors in components

**Demo content**
- Pre-written example: topic "The Influence of Parental Support on Academic Success", 4 group members, GNS 102 cover page with the required submission line, 8-page-style body, references
- Cover page + document preview styled to match the Word export spec (Times New Roman 12, 1" margins, cover + body ≤ 8 pages + refs)

## Phase 2 (next build, after Phase 1 approved)
- Enable Lovable Cloud (auth, database, storage)
- Register/Login with email + Google
- Dashboard, Profile, Billing, Settings, Help
- Project creation wizard + guided loading experience
- One-active-project enforcement

## Phase 3
- Real AI generation via Lovable AI Gateway (gpt-5.5), section regeneration, lecturer guide enforcement
- .docx export (Times New Roman 12, 1" margins, cover page table, ≤8 pages + refs) and PDF export
- Paystack integration for ₦3,500 Project Pass (Nigerian payments — Stripe doesn't support NGN payouts here)

## Technical notes (for reference)
- Stack: TanStack Start + React 19 + Tailwind v4 (already scaffolded)
- Routing: file-based under `src/routes/`; `/` becomes the landing page (replaces placeholder)
- State: React Query already wired at root
- Phase 3 export uses `docx` npm package server-side via `createServerFn`
- Phase 3 payments: Paystack (NGN native); Stripe is not viable for ₦ collection to Nigerian accounts

## Questions before I start Phase 1
1. **Payment provider** for Phase 3: Paystack (recommended for ₦), Flutterwave, or something else?
2. **Brand name lockup** — "Co-Research AI" as text logo, or do you want me to design a simple mark?
3. Anything you want changed in this plan?

Reply "go" and I'll build Phase 1.
