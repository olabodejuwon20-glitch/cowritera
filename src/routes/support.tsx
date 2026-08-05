import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Co-Research AI" },
      { name: "description", content: "Get help from Co-Research AI support. Contact the team on WhatsApp or browse common support topics." },
      { property: "og:title", content: "Support — Co-Research AI" },
      { property: "og:description", content: "Contact Co-Research AI support on WhatsApp or read quick help topics." },
    ],
  }),
  component: SupportPage,
});

const supportFaqs = [
  {
    q: "I can't log in / forgot my password",
    a: "Visit the login page and use the password reset option. If that fails, contact support on WhatsApp and provide your account email.",
  },
  {
    q: "How do I buy a Project Pass?",
    a: "Open the Pricing page and follow the checkout flow. For payment issues, send a screenshot and transaction reference to support on WhatsApp.",
  },
  {
    q: "My export (.docx/.pdf) looks wrong",
    a: "Try regenerating the affected section and re-export. If formatting still breaks, contact support with the paper ID and a brief description.",
  },
  {
    q: "Can I change my lecturer instructions after creating a project?",
    a: "Yes — within your active project you can update lecturer instructions. If you need help migrating content, reach out to support.",
  },
];

function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="hero-bg">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-semibold">Support</h1>
            <p className="mt-4 text-lg text-muted-foreground">Need help? Contact our support team on WhatsApp or read quick answers below.</p>
            <div className="mt-6">
              <a
                href="https://wa.link/vg9fhh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-xl bg-emerald-500 px-6 py-3 text-white font-medium shadow-[var(--shadow-elegant)] hover:brightness-105 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M20.52 3.48A11.83 11.83 0 0 0 12 .5C6.84.5 2.5 4.84 2.5 10c0 1.74.46 3.37 1.26 4.8L2 22l6.44-1.66A11.78 11.78 0 0 0 12 20.5c5.16 0 9.5-4.34 9.5-9.5 0-1.98-.59-3.82-1.48-5.52zM12 18c-.94 0-1.86-.25-2.66-.72l-.19-.11-3.83.99.98-3.73-.12-.2A7.5 7.5 0 1 1 19.5 10 7.48 7.48 0 0 1 12 18z" />
                  <path d="M16.14 13.31c-.27-.14-1.59-.79-1.83-.88-.24-.09-.42-.14-.6.14s-.69.88-.86 1.06c-.16.19-.33.21-.6.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.31.41-.46.14-.15.19-.25.3-.41.1-.16.05-.31-.02-.45-.07-.14-.6-1.44-.82-1.98-.22-.52-.44-.45-.6-.46-.16-.01-.34-.01-.52-.01-.18 0-.45.07-.68.31-.24.24-.92.9-.92 2.2 0 1.29.94 2.54 1.07 2.72.12.18 1.84 2.95 4.46 4.17 2.62 1.22 2.62.81 3.09.76.47-.05 1.53-.62 1.75-1.22.22-.6.22-1.11.15-1.22-.07-.11-.27-.17-.57-.31z" />
                </svg>
                Contact support on WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
          <h2 className="text-2xl font-semibold mb-4">Quick help</h2>
          <div className="space-y-3">
            {supportFaqs.map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} />
            ))}
          </div>

          <div className="mt-12 rounded-2xl border bg-surface/60 p-6">
            <h3 className="font-medium">Still need help?</h3>
            <p className="mt-2 text-muted-foreground">
              Send us a message on WhatsApp with a short description of your issue and any relevant screenshots or references (paper ID, email).
            </p>
            <div className="mt-4">
              <a
                href="https://wa.link/vg9fhh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-primary-soft"
              >
                Open WhatsApp chat
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left rounded-2xl border bg-card p-5 hover:bg-primary-soft/40 transition"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium">{q}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </button>
  );
}
