# Co Research Ai new

# Co-Research AI — Product Build Prompt (MVP)

## Project Overview

Build a modern SaaS web application called **Co-Research AI**.

Co-Research AI is an AI-powered academic research assistant designed to help university students generate professionally structured, lecturer-compliant term papers. The first release focuses exclusively on **GNS 102 Term Papers**, but the architecture must be scalable to support additional academic documents in future versions.

The product should feel premium, clean, trustworthy, and student-friendly rather than like a generic AI chatbot.

---

# Design Language

## Theme

* Modern SaaS

* Premium UI

* Minimalist

* Clean spacing

* Soft rounded corners

* Elegant animations

* Mobile-first

* Responsive

## Brand Colors

Primary:

* Purple (#7C3AED or similar)

Secondary:

* White

Accent:

* Light Purple

* Soft Gray backgrounds

Use subtle gradients, glassmorphism where appropriate, and smooth transitions. Avoid a cluttered interface.

---

# Navigation

* Landing Page

* Interactive Demo

* Pricing

* FAQ

* Login

* Register

After login:

* Dashboard

* Current Project

* Profile

* Billing

* Settings

* Help & Support

---

# Product Philosophy

This platform is **project-based**, not token-based.

Students purchase access to create an academic project, not AI generations.

Once a project has been created, the student should have complete freedom to improve it without worrying about AI limits.

The platform should encourage iteration, refinement, and academic quality.

---

# Pricing Model

## Interactive Demo (Free)

Instead of allowing free AI generations, every visitor should have access to a fully interactive demonstration project.

The demo contains:

* Example topic

* Example group members

* Example cover page

* Example introduction

* Example literature review

* Example methodology

* Example results

* Example discussion

* Example references

* Example Word preview

* Example PDF preview

Everything in the demo is pre-generated.

No AI processing should occur.

The purpose is to let students experience the platform before purchasing.

Whenever a visitor attempts to create their own project, display a purchase prompt.

---

## Project Pass

Price:

**₦3,500**

Includes:

* Create one academic project

* Unlimited AI generation within that project

* Unlimited section regeneration

* Unlimited edits

* Unlimited formatting improvements

* Unlimited reference updates

* Unlimited lecturer guide enforcement

* Unlimited AI suggestions

* Word (.docx) export

* PDF export

* Project storage throughout the semester

There should never be visible AI token limits.

---

## Project Restriction

Each account can own only **one active academic project**.

Once a project has been created:

Students may:

* Edit

* Rewrite

* Improve

* Regenerate

* Reformat

* Change group members

* Update lecturer instructions

without restriction.

However, they cannot create another project.

If they attempt to create a different project or research topic, display:

"You have already used your Project Pass.

Unlock a new project to continue."

Display:

**Unlock New Project**

---

# Dashboard

The dashboard should immediately communicate progress.

Display:

* Current Project

* Project Status

* Completion Progress

* AI Generation Status

* Lecturer Compliance Status

* Export Buttons

Also include:

Recent Activity

Examples:

* Introduction regenerated

* References updated

* Formatting completed

* PDF exported

---

# Interactive Demo

The demo should be fully functional visually.

Use an example project with realistic academic content.

Sidebar navigation:

* Project Information

* Lecturer Guide

* AI Analysis

* Cover Page

* Outline

* Introduction

* Literature Review

* Methodology

* Results

* Discussion

* Conclusion

* References

* Export

The visitor should feel like they are using the actual product.

Downloads in the demo should instead encourage purchasing a Project Pass.

---

# Project Creation

Creating a project should be a guided experience.

Collect:

* Research Topic

* Lecturer Name

* Group Name

* Group Members

* Institution

* Department

* Faculty

* Course Code

* Lecturer Guide

Once submitted:

The AI begins processing.

Display a beautiful loading experience showing:

Topic Analysis

↓

Research Planning

↓

Lecturer Guide Analysis

↓

Academic Structure Generation

↓

Writing

↓

Formatting

↓

Quality Assurance

↓

Final Review

↓

Completed

---

# AI Workspace

The workspace should feel like Notion mixed with Google Docs.

Left Sidebar:

Project Navigation

Center:

Document Editor

Right Sidebar:

AI Assistant

AI Suggestions

Formatting

References

Lecturer Compliance

Users should be able to regenerate only a selected section instead of the entire document.

---

# AI Generation Engine

The AI must:

* Analyze the research topic

* Apply lecturer instructions

* Follow institutional requirements

* Produce a professional academic structure

* Maintain formatting consistency

* Generate coherent academic writing

* Produce export-ready documents

The AI engine specifications already exist and should be respected.

---

# Lecturer Guide Engine

Every uploaded lecturer guide becomes a mandatory rule set.

The AI should automatically enforce:

* Formatting

* Required sections

* Required wording

* Cover page structure

* Page limits

* Citation requirements

The lecturer's requirements always override default behaviour.

---

# Export

Support:

* Microsoft Word (.docx)

* PDF

The exported document must preserve:

* Tables

* Formatting

* Margins

* Headings

* Fonts

* Numbering

* References

The document should look professionally prepared and ready for submission.

---

# Future-Ready Architecture

Although Version 1 focuses solely on GNS 102 Term Papers, the platform architecture should be modular and extensible.

Future document types include:

* Assignments

* Seminar Papers

* Research Reports

* Laboratory Reports

* Final Year Projects

* SIWES Reports

* Business Plans

* Grant Proposals

* Thesis & Dissertations

Future AI capabilities include:

* Deep Research

* Citation Validation

* Plagiarism Analysis

* AI Writing Coach

* AI Reviewer

* AI Proofreader

* Collaboration

* Supervisor Feedback

* Version History

* Institution Templates

These features should **not** appear in the MVP UI but the codebase should be designed to support them later without major restructuring.

---

# Overall Experience

The application should not feel like "another ChatGPT wrapper."

Instead, it should feel like a dedicated academic productivity platform that guides students from project creation to a polished, lecturer-compliant final document.

Every screen should communicate professionalism, trust, simplicity, and academic excellence while maintaining the polished feel of a modern premium SaaS product.

FOR THE TERM PAPER DO THE FOOLOWING , CREATE A COVER PAGE COMPARISING TOPIC, GROUP MEMBERS IN THE TABLE AND THESE WORDS : A Term Paper Submitted in Partial Fulfilment of GNS 102 Completion 

Must not be more than 8 pages plus cover page and references.

use Times New Romans, Size 12 

Margin: 1 inch all round

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cowritera.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/47919cef-8f81-4e83-8b98-bcc51f45f7df).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


## Environment variables (any host, including Vercel)

The app has no hard dependency on Lovable Cloud env names. Set these in your host
(Vercel → Settings → Environment Variables) for **Production, Preview and Development**:

| Variable | Scope | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | build + server | `VITE_SUPABASE_URL` also accepted |
| `SUPABASE_PUBLISHABLE_KEY` | build + server | `VITE_SUPABASE_PUBLISHABLE_KEY` / `*_ANON_KEY` also accepted |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | privileged server functions |
| `PAYSTACK_SECRET_KEY` | server only | payment verification |
| `PAYSTACK_PUBLIC_KEY` | server only | checkout init |
| `LOVABLE_API_KEY` | server only | AI generation gateway |

`vite.config.ts` inlines the browser-visible Supabase URL/key at build time from either
naming convention, and host env vars always take precedence over the committed `.env`.
Server code resolves the same values at runtime via `src/integrations/supabase/env.ts`.
