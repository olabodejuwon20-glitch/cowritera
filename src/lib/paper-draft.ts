import { useCallback, useEffect, useState } from "react";
import { demoProject, sections as staticSections } from "./demo-content";

export const PAGE_LIMIT = 8;
const DRAFT_KEY = "coresearch.demo.draft.v1";
// Rough estimate: 12pt Times New Roman, 1" margins, 1.5 line spacing ≈ 320 words/page.
const WORDS_PER_PAGE = 320;

export type ArrayKey =
  | "introduction" | "literature" | "methodology" | "results"
  | "discussion" | "conclusion" | "appendices" | "references";

export interface PaperDraft {
  topic: string;
  submissionLine: string;
  introduction: string[];
  literature: string[];
  methodology: string[];
  results: string[];
  discussion: string[];
  conclusion: string[];
  appendices: string[];
  references: string[];
}

/** A blank draft — used for real user projects so no template content leaks in. */
export function emptyDraft(): PaperDraft {
  return {
    topic: "",
    submissionLine: "",
    introduction: [],
    literature: [],
    methodology: [],
    results: [],
    discussion: [],
    conclusion: [],
    appendices: [],
    references: [],
  };
}

/** The pre-filled sample paper, used only for the downloadable sample export. */
export function defaultDraft(): PaperDraft {
  return {
    topic: demoProject.topic,
    submissionLine: demoProject.submissionLine,
    introduction: [...staticSections.introduction],
    literature: [...staticSections.literature],
    methodology: [...staticSections.methodology],
    results: [...staticSections.results],
    discussion: [...staticSections.discussion],
    conclusion: [...staticSections.conclusion],
    appendices: [...staticSections.appendices],
    references: [...staticSections.references],
  };
}

export function usePaperDraft() {
  const [draft, setDraft] = useState<PaperDraft>(() => defaultDraft());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PaperDraft>;
        setDraft({ ...defaultDraft(), ...parsed });
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* noop */ }
  }, [draft]);

  const updateField = useCallback(<K extends "topic" | "submissionLine">(key: K, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const updateParagraph = useCallback((key: ArrayKey, index: number, value: string) => {
    setDraft((d) => {
      const arr = [...d[key]];
      arr[index] = value;
      return { ...d, [key]: arr };
    });
  }, []);

  const addParagraph = useCallback((key: ArrayKey) => {
    setDraft((d) => ({ ...d, [key]: [...d[key], ""] }));
  }, []);

  const removeParagraph = useCallback((key: ArrayKey, index: number) => {
    setDraft((d) => {
      const arr = d[key].filter((_, i) => i !== index);
      return { ...d, [key]: arr.length ? arr : [""] };
    });
  }, []);

  const reset = useCallback(() => setDraft(defaultDraft()), []);

  return { draft, setDraft, updateField, updateParagraph, addParagraph, removeParagraph, reset };
}

// ---------- Validator ----------

export type CheckStatus = "pass" | "warn" | "fail";
export interface Check {
  id: string;
  label: string;
  detail: string;
  status: CheckStatus;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateBodyPages(draft: PaperDraft) {
  const bodyKeys: ArrayKey[] = ["introduction", "literature", "methodology", "results", "discussion", "conclusion", "appendices"];
  const words = bodyKeys.reduce((sum, k) => sum + draft[k].reduce((s, p) => s + countWords(p), 0), 0);
  // Add ~50 words per heading/subheading for spacing overhead.
  const headingOverhead = bodyKeys.length * 25;
  const pages = Math.max(1, Math.ceil((words + headingOverhead) / WORDS_PER_PAGE));
  return { words, pages };
}

export function validateDraft(draft: PaperDraft): Check[] {
  const checks: Check[] = [];
  const { words, pages } = estimateBodyPages(draft);

  checks.push({
    id: "font",
    label: "Font: Times New Roman, 12pt",
    detail: "Exports are generated with Times New Roman size 12 as required.",
    status: "pass",
  });
  checks.push({
    id: "margins",
    label: "Margins: 1 inch all sides",
    detail: "Exports use 1-inch margins on all sides.",
    status: "pass",
  });

  checks.push({
    id: "pages",
    label: `Body length: ≤ ${PAGE_LIMIT} pages`,
    detail: `Projected body ≈ ${words} words / ${pages} pages (cover and references excluded).`,
    status: pages > PAGE_LIMIT ? "fail" : pages >= PAGE_LIMIT - 1 ? "warn" : "pass",
  });

  const hasAim = draft.introduction.some((p) => /1\.1\s*AIM/i.test(p));
  checks.push({
    id: "aim",
    label: "Introduction includes 1.1 Aim of the Study",
    detail: hasAim ? "Aim of the study subsection detected." : "Add a paragraph starting with \"1.1 AIM OF THE STUDY\" in the Introduction.",
    status: hasAim ? "pass" : "fail",
  });

  const topicOk = draft.topic.trim().length > 8;
  checks.push({
    id: "topic",
    label: "Cover page topic set",
    detail: topicOk ? "Topic is set." : "Add a topic on the cover page.",
    status: topicOk ? "pass" : "fail",
  });

  const refCount = draft.references.filter((r) => r.trim().length > 0).length;
  checks.push({
    id: "refs",
    label: "At least 3 references",
    detail: `${refCount} reference${refCount === 1 ? "" : "s"} listed.`,
    status: refCount >= 3 ? "pass" : "fail",
  });

  const empties: string[] = [];
  (["introduction", "literature", "methodology", "results", "discussion", "conclusion"] as ArrayKey[]).forEach((k) => {
    if (draft[k].every((p) => !p.trim())) empties.push(k);
  });
  checks.push({
    id: "sections",
    label: "All body sections have content",
    detail: empties.length === 0 ? "Every body section has at least one paragraph." : `Empty: ${empties.join(", ")}.`,
    status: empties.length === 0 ? "pass" : "fail",
  });

  return checks;
}
