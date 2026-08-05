import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, FileText, Download, GraduationCap, ArrowRight } from "lucide-react";
import { markOnboarded } from "@/lib/onboarding";
import { haptic } from "@/lib/native";
import { AppButton } from "@/components/mobile-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome — Co-Research AI" },
      { name: "description", content: "A quick tour of Co-Research AI: describe your paper, let AI write it, export a submission-ready document." },
      { property: "og:title", content: "Welcome — Co-Research AI" },
      { property: "og:description", content: "A quick tour of Co-Research AI before you write your first term paper." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Welcome,
});

const SLIDES = [
  {
    icon: GraduationCap,
    eyebrow: "Built for students",
    title: "Your academic co-pilot",
    body: "Co-Research AI turns your topic, lecturer instructions and group details into a properly structured term paper.",
  },
  {
    icon: Sparkles,
    eyebrow: "Write with AI",
    title: "From topic to full draft",
    body: "Outline, chapters, citations and references — generated in minutes, then edited by you in a distraction-free workspace.",
  },
  {
    icon: FileText,
    eyebrow: "Lecturer-compliant",
    title: "Formatted the right way",
    body: "Times New Roman 12pt, 1.5 spacing, 1-inch margins and a cover page that follows your department's template exactly.",
  },
  {
    icon: Download,
    eyebrow: "Ready to submit",
    title: "Export as PDF or Word",
    body: "One project pass unlocks unlimited edits and exports. Install the app to your home screen and work offline.",
  },
];

function Welcome() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const last = i === SLIDES.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((v) => Math.min(v + 1, SLIDES.length - 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function finish() {
    markOnboarded();
    void haptic("success");
    navigate({ to: "/login" });
  }

  function next() {
    void haptic("light");
    if (last) finish();
    else setI((v) => v + 1);
  }

  function skip() {
    markOnboarded();
    navigate({ to: "/" });
  }

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden hero-bg pt-[env(safe-area-inset-top)]"
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) < 50) return;
        void haptic("light");
        setI((v) => Math.min(Math.max(v + (dx < 0 ? 1 : -1), 0), SLIDES.length - 1));
      }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          Co-Research <span className="gradient-text">AI</span>
        </span>
        <button onClick={skip} className="min-h-11 px-2 text-sm text-muted-foreground">
          Skip
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translate3d(-${i * 100}%,0,0)` }}
        >
          {SLIDES.map((s) => (
            <section
              key={s.title}
              className="flex h-full w-full shrink-0 flex-col items-center justify-center px-8 text-center"
            >
              <span className="grid h-24 w-24 place-items-center rounded-[2rem] bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]">
                <s.icon className="h-11 w-11" strokeWidth={1.6} />
              </span>
              <div className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {s.eyebrow}
              </div>
              <h2 className="mt-2 max-w-sm text-[28px] font-semibold leading-tight">{s.title}</h2>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </div>

      <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-6 flex justify-center gap-2">
          {SLIDES.map((s, idx) => (
            <button
              key={s.title}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === i ? "w-7 bg-primary" : "w-2 bg-primary/25",
              )}
            />
          ))}
        </div>
        <AppButton block size="lg" icon={last ? undefined : ArrowRight} onClick={next}>
          {last ? "Get started" : "Continue"}
        </AppButton>
        {last && (
          <button onClick={skip} className="mt-2 min-h-11 w-full text-sm text-muted-foreground">
            Explore the website first
          </button>
        )}
      </div>
    </div>
  );
}
