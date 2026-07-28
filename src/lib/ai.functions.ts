import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SECTION_PROMPTS: Record<string, string> = {
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
      .select("id, topic, course_code, paid")
      .eq("id", data.paper_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!paper) throw new Error("Paper not found");
    if (!paper.paid) throw new Error("This project needs a Project Pass before AI generation.");

    const brief = SECTION_PROMPTS[data.section_key] ?? "Write this section of the paper in formal academic prose.";
    const system =
      "You are Co-Research AI, an academic writing co-pilot for Nigerian undergraduates producing GNS 102 term papers. Output clean prose — no markdown headings, no bullet symbols — just paragraphs separated by blank lines. Never invent enrollment data or fabricate first-person interviews.";
    const user = `Topic: ${paper.topic}\nCourse: ${paper.course_code}\n\nTask: ${brief}${data.extra ? `\n\nExtra guidance from student: ${data.extra}` : ""}`;

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
