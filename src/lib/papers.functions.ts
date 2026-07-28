import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateInput = z.object({
  topic: z.string().min(4).max(400),
  course_code: z.string().min(1).max(40),
});

const IdInput = z.object({ id: z.string().uuid() });

const UpdateSectionInput = z.object({
  id: z.string().uuid(),
  section_key: z.string().min(1).max(40),
  content: z.string().max(200000),
});

export const createPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("papers")
      .insert({
        user_id: userId,
        topic: data.topic,
        course_code: data.course_code,
        project: { topic: data.topic, course_code: data.course_code },
        sections: {},
        status: "draft",
        paid: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listPapers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("papers")
      .select("id, topic, course_code, paid, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("papers")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Paper not found");
    return row;
  });

export const updateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSectionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // fetch existing sections
    const { data: row, error: readErr } = await supabase
      .from("papers")
      .select("sections")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Paper not found");
    const sections = { ...((row.sections as Record<string, string>) ?? {}) };
    sections[data.section_key] = data.content;
    const { error } = await supabase
      .from("papers")
      .update({ sections: sections as never })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
