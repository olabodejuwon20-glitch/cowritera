import { formatGroupName, buildSubmissionLine, memberValue, normalizeColumns } from "@/lib/export-types";
import type { ProjectDetails } from "@/components/project-details-form";

/**
 * The cover page, rendered exactly as it appears in the exported document
 * (same order, same wording, same members table). Used for the on-screen
 * document canvas and for the "check & confirm" step after project creation.
 */
export function CoverPreview({
  topic,
  details,
  extra,
}: {
  topic: string;
  details: ProjectDetails;
  extra?: string;
}) {
  const columns = normalizeColumns(details.columns);
  const members = details.members.filter(
    (m) => m.name || m.matric || m.phone || m.role || Object.values(m.extra ?? {}).some(Boolean),
  );
  const group = formatGroupName(details.group_name);
  const terms = buildSubmissionLine({
    courseCode: details.course_code,
    courseTitle: details.course_title,
    lecturer: details.lecturer_name,
    department: details.department,
    institution: details.institution,
  });
  const line = (v: string, cls = "") => (v ? <div className={cls}>{v}</div> : null);

  return (
    <div className="text-center leading-relaxed">
      {line(details.institution.toUpperCase(), "font-bold uppercase")}
      {line(details.faculty.toUpperCase(), "uppercase")}
      {line(details.department ? `DEPARTMENT OF ${details.department.toUpperCase()}` : "", "uppercase")}

      <div className="mt-8 font-bold uppercase">A TERM PAPER REPORT</div>
      <div>ON</div>
      {line(topic.toUpperCase(), "mt-2 font-bold uppercase")}
      {line([details.course_code, details.course_title].filter(Boolean).join(" — "), "mt-3")}

      {line(group ? `SUBMITTED BY: ${group}` : "", "mt-6 font-semibold uppercase")}

      {members.length > 0 && (
        /* Isolated horizontal scroll so a wide members table never widens the page */
        <div className="-mx-2 mt-4 overflow-x-auto overscroll-x-contain px-2 [scrollbar-width:thin]">
          <table className="mx-auto w-full min-w-[520px] border-collapse text-left text-[0.8em]">
            <thead>
              <tr>
                {["S/N", ...columns.map((c) => c.label.toUpperCase())].map((h) => (
                  <th key={h} className="whitespace-nowrap border px-1.5 py-1 text-center font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i}>
                  <td className="border px-1.5 py-1 text-center">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="border px-1.5 py-1 align-top">
                      {memberValue({ ...m, extra: m.extra }, c.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {line(details.lecturer_name ? `SUBMITTED TO: ${details.lecturer_name}` : "", "mt-6")}
      {terms && (
        <>
          <div className="mt-4 font-semibold uppercase">TERMS OF REFERENCE</div>
          <div className="italic">{terms}</div>
        </>
      )}
      {line(details.session, "mt-4")}
      {line(details.submission_date, "mt-1 font-semibold")}
      {extra ? <div className="mt-8 whitespace-pre-wrap text-left">{extra}</div> : null}
    </div>
  );
}
