import { useEffect, useState, useCallback } from "react";
import { demoProject, sections as defaultSections } from "./demo-content";

const STORAGE_KEY = "coresearch.demo.draft.v1";

export type PaperDraft = {
  topic: string;
  mainTopic: string;
  submissionLine: string;
  introduction: string[];
  literature: string[];
  methodology: string[];
  results: string[];
  discussion: string[];
  conclusion: string[];
  appendices: string[];
  references: string[];
};

export function defaultDraft(): PaperDraft {
  return {
    topic: demoProject.topic,
    mainTopic: demoProject.mainTopic,
    submissionLine: demoProject.submissionLine,
    introduction: [...defaultSections.introduction],
    literature: [...defaultSections.literature],
    methodology: [...defaultSections.methodology],
    results: [...defaultSections.results],
    discussion: [...defaultSections.discussion],
    conclusion: [...defaultSections.conclusion],
    appendices: [...defaultSections.appendices],
    references: [...defaultSections.references],
  };
}

export function usePaperDraft() {
  const [draft, setDraft] = useState<PaperDraft>(defaultDraft);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PaperDraft>;
        setDraft({ ...defaultDraft(), ...parsed });
      }
    } catch { /* noop */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* noop */ }
  }, [draft, hydrated]);

  const updateField = useCallback(<K extends keyof PaperDraft>(key: K, value: PaperDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateParagraph = useCallback(
    (key: ArrayKey, index: number, value: string) => {
      setDraft((prev) => {
        const arr = [...(prev[key] as string[])];
        arr[index] = value;
        return { ...prev, [key]: arr };
      });
    },
    []
  );

  const addParagraph = useCallback((key: ArrayKey) => {
    setDraft((prev) => ({ ...prev, [key]: [...(prev[key] as string[]), ""] }));
  }, []);

  const removeParagraph = useCallback((key: ArrayKey, index: number) => {
    setDraft((prev) => {
      const arr = [...(prev[key] as string[])];
      arr.splice(index, 1);
      return { ...prev, [key]: arr };
    });
  }, []);

  const reset = useCallback(() => setDraft(defaultDraft()), []);

  return { draft, hydrated, updateField, updateParagraph, addParagraph, removeParagraph, reset };
}

export type ArrayKey =
  | "introduction" | "literature" | "methodology" | "results"
  | "discussion" | "conclusion" | "appendices" | "references";

// ---------- Validator ----------

export type CheckStatus = "pass" | "warn" | "fail";
export type Check = { id: string; label: string; status: CheckStatus; detail: string };

// Rough words-per-page for TNR 12, 1.5 line spacing, 1" margins on Letter.
const WORDS_PER_PAGE = 320;
export const PAGE_LIMIT = 8;

function wordCount(paragraphs: string[]): number {
  return paragraphs.reduce((n, p) => n + (p.trim() ? p.trim().split(/\s+/).length : 0), 0);
}

export function estimateBodyPages(draft: PaperDraft): { words: number; pages: number } {
  const words =
    wordCount(draft.introduction) +
    wordCount(draft.literature) +
    wordCount(draft.methodology) +
    wordCount(draft.results) +
    wordCount(draft.discussion) +
    wordCount(draft.conclusion) +
    wordCount(draft.appendices);
  const pages = Math.max(1, Math.ceil(words / WORDS_PER_PAGE));
  return { words, pages };
}

export function validateDraft(draft: PaperDraft): Check[] {
  const checks: Check[] = [];

  // Template-locked rules (always green because the export template enforces them).
  checks.push({
    id: "font",
    label: "Times New Roman, size 12",
    status: "pass",
    detail: "Font is fixed by the export template.",
  });
  checks.push({
    id: "margins",
    label: "1-inch margins on all sides",
    status: "pass",
    detail: "Page margins are fixed by the export template.",
  });

  const { words, pages } = estimateBodyPages(draft);
  checks.push({
    id: "page-limit",
    label: `Body ≤ ${PAGE_LIMIT} pages (cover & references excluded)`,
    status: pages <= PAGE_LIMIT ? "pass" : pages <= PAGE_LIMIT + 1 ? "warn" : "fail",
    detail: `≈ ${words} words, projected ${pages} page${pages === 1 ? "" : "s"} of body.`,
  });

  checks.push({
    id: "aim",
    label: "Introduction contains 1.1 Aim of the Study",
    status: draft.introduction.some((p) => /aim of the study/i.test(p)) ? "pass" : "fail",
    detail: "Add the '1.1 AIM OF THE STUDY' marker line in the introduction.",
  });

  const bodyKeys: (keyof PaperDraft)[] = [
    "introduction", "literature", "methodology", "results", "discussion", "conclusion",
  ];
  const empty = bodyKeys.filter((k) => (draft[k] as string[]).every((p) => !p.trim()));
  checks.push({
    id: "sections",
    label: "All body sections have content",
    status: empty.length === 0 ? "pass" : "fail",
    detail: empty.length === 0 ? "Every section has at least one paragraph." : `Empty: ${empty.join(", ")}`,
  });

  checks.push({
    id: "refs",
    label: "At least 3 references cited",
    status: draft.references.filter((r) => r.trim()).length >= 3 ? "pass" : "fail",
    detail: `${draft.references.filter((r) => r.trim()).length} reference(s) provided.`,
  });

  checks.push({
    id: "terms",
    label: "Terms of reference filled in",
    status: draft.submissionLine.trim().length > 40 ? "pass" : "warn",
    detail: "Cover page terms of reference should be a full sentence.",
  });

  return checks;
}
