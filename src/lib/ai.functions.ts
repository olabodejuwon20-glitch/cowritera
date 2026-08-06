import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SECTION_PROMPTS: Record<string, string> = {
  cover:
    "Draft the cover page block for this term paper: topic in title case, course code, institution/faculty/department placeholders, group name, and a submission line (\"Submitted in partial fulfilment...\"). Output plain lines, no markdown.",
  outline:
    "Produce a numbered chapter outline for this term paper (1.0 Introduction through References), each with 2-4 sub-headings. Output plain numbered lines, no markdown symbols.",
  ai_analysis:
    "Analyse the topic and the lecturer's instructions. Return: (a) what the lecturer is really asking for, (b) the compliance rules detected (length, font, citation style, deadline), (c) the recommended chapter structure, and (d) 3 risks that commonly lose marks. Plain prose with short labelled paragraphs.",
  introduction:
    "Write the '1.0 Introduction' section of an undergraduate GNS 102 term paper. Cover background, statement of problem, aims/objectives, scope, and significance. Use formal academic prose with 4–6 clearly separated paragraphs.",
  literature:
    "Write the '2.0 Literature Review' for the paper. Synthesize 5–8 credible sources (real, plausible authors and years, APA in-text citations). Group themes, contrast findings, and end with the identified gap.",
  methodology:
    "Write the '3.0 Methodology' section: research design, population/sample, instruments, procedure, and method of data analysis. Keep it appropriate for an undergraduate desk/library or mixed-methods study.",
  results:
    "Write the '4.0 Results' section presenting findings clearly, referencing figures/tables where useful (describe them in words). Avoid interpretation — that goes in Discussion.",
  discussion:
    "Write the '5.0 Discussion' section: interpret the results, compare with the literature you cited, note implications and limitations.",
  conclusion:
    "Write the '6.0 Conclusion' section: restate the study aim, summarize key findings, and give 3–5 concrete recommendations.",
  appendices:
    "Draft an appendix section (e.g. sample questionnaire items, glossary, or supplementary tables) appropriate to the topic.",
  references:
    "Produce a References list in APA 7th edition, 8–12 plausible entries relevant to the topic. Use hanging-indent friendly line breaks — one reference per paragraph.",
};

async function callGateway(system: string, user: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured (LOVABLE_API_KEY missing).");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("AI is rate-limited. Please retry in a minute.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok) throw new Error(`AI error (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

const GenInput = z.object({
  paper_id: z.string().uuid(),
  section_key: z.string().min(1),
  extra: z.string().max(2000).optional(),
});

export const generateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: paper, error } = await supabase
      .from("papers")
      .select("id, topic, course_code, paid, project")
      .eq("id", data.paper_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!paper) throw new Error("Paper not found");
    if (!paper.paid) throw new Error("This project needs a Project Pass before AI generation.");

    const guide = ((paper.project as Record<string, unknown> | null)?.lecturer_guide as string | undefined)?.slice(0, 4000) ?? "";
    const brief = SECTION_PROMPTS[data.section_key] ?? "Write this section of the paper in formal academic prose.";
    const system = [
      "You are Co-Research AI, an academic writing co-pilot for Nigerian undergraduates producing term papers.",
      "AUTHORITY ORDER: the lecturer's instructions outrank every other rule here. If the lecturer specifies a length, structure, citation style, tone, chapter names or anything else, follow the lecturer exactly and ignore any conflicting default below. Only when no lecturer instruction covers a point do you fall back to the built-in format.",
      "BUILT-IN FORMAT (defaults only): Times New Roman 12pt, 1.5 line spacing, 1-inch margins; the whole paper must not exceed 2000 words in total, so budget roughly 200-300 words for this single section unless the lecturer asked for more. Never exceed the lecturer's stated length.",
      "REFERENCES: every source you cite must be directly about this topic and must actually support the sentence it is attached to. No padding, no off-topic classics, no citations that are not used in the text. Keep in-text citations and the reference list perfectly consistent.",
      "STYLE: write like a careful human student, not an AI. Vary sentence length and rhythm, use concrete examples, avoid stock AI phrasing (\"in today's fast-paced world\", \"delve\", \"moreover, it is important to note\"), avoid mechanical parallel lists, and never pad.",
      "Output clean prose — no markdown headings, no bullet symbols — just paragraphs separated by blank lines. Never invent enrollment data or fabricate first-person interviews.",
    ].join("\n");
    const user = `Topic: ${paper.topic}\nCourse: ${paper.course_code}${guide ? `\nLECTURER INSTRUCTIONS (highest priority — follow these exactly):\n${guide}` : "\nLecturer instructions: none supplied — use the built-in format."}\n\nTask: ${brief}${data.extra ? `\n\nExtra guidance from student: ${data.extra}` : ""}`;

    const output = await callGateway(system, user);
    await supabase.from("ai_generations").insert({
      user_id: userId,
      paper_id: paper.id,
      kind: `section:${data.section_key}`,
      prompt: user,
      output,
      model: MODEL,
    });
    return { content: output };
  });

const ResearchInput = z.object({
  paper_id: z.string().uuid(),
  section_key: z.string().min(1),
});

export const researchNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResearchInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: paper, error } = await supabase
      .from("papers")
      .select("id, topic, paid")
      .eq("id", data.paper_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!paper) throw new Error("Paper not found");
    if (!paper.paid) throw new Error("This project needs a Project Pass before AI research.");

    const system =
      "You are Co-Research AI's research assistant. Produce concise, structured research notes a student can quickly weave into their draft. Cite plausible, real-sounding APA in-text sources. Be honest about what is well-established vs contested. Output as short bullets grouped under 3–5 sub-headings.";
    const user = `Topic: ${paper.topic}\nProduce research notes to help draft the "${data.section_key}" section.`;
    const output = await callGateway(system, user);
    await supabase.from("ai_generations").insert({
      user_id: userId,
      paper_id: paper.id,
      kind: `research:${data.section_key}`,
      prompt: user,
      output,
      model: MODEL,
    });
    return { notes: output };
  });

/* ------------------------------------------------------------------ */
/* Humanizer                                                           */
/* ------------------------------------------------------------------ */

const HumanizeInput = z.object({
  paper_id: z.string().uuid(),
  section_key: z.string().min(1),
  content: z.string().min(1).max(40000),
});

export const humanizeSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => HumanizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: paper, error } = await supabase
      .from("papers")
      .select("id, topic, course_code, paid, project")
      .eq("id", data.paper_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!paper) throw new Error("Paper not found");
    if (!paper.paid) throw new Error("This project needs a Project Pass before AI editing.");

    const guide =
      ((paper.project as Record<string, unknown> | null)?.lecturer_guide as string | undefined)?.slice(0, 4000) ?? "";

    const system = [
      "You are a human academic editor. You rewrite AI-sounding student writing so it reads naturally, like a thoughtful undergraduate wrote it in one sitting.",
      "Rules: keep every fact, citation, heading number and reference exactly as given — do not add or drop sources. Preserve meaning and length (±10%).",
      "Vary sentence length and structure. Break robotic parallelism. Remove filler and stock AI phrases. Use plain, specific, confident academic English with occasional natural connectives.",
      "Do not use markdown, bullets or emoji. Return only the rewritten prose, paragraphs separated by blank lines.",
      guide ? `The lecturer's instructions override any stylistic default:\n${guide}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const output = await callGateway(system, `Topic: ${paper.topic}\n\nRewrite this section so it reads human and natural:\n\n${data.content}`);

    await supabase.from("ai_generations").insert({
      user_id: userId,
      paper_id: paper.id,
      kind: `humanize:${data.section_key}`,
      prompt: data.content.slice(0, 4000),
      output,
      model: MODEL,
    });

    return { content: output };
  });
