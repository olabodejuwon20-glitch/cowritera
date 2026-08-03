import { formatGroupName, buildSubmissionLine, splitMemberName } from "@/lib/export-types";
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
  const members = details.members.filter((m) => m.name || m.matric || m.phone || m.role);
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
        <table className="mx-auto mt-4 w-full border-collapse text-left text-[0.9em]">
          <thead>
            <tr>
              {["S/N", "SURNAME", "OTHER NAMES", "MATRIC NO", "ROLE"].map((h) => (
                <th key={h} className="border px-2 py-1 text-center font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const { surname, other } = splitMemberName(m.name);
              return (
                <tr key={i}>
                  <td className="border px-2 py-1 text-center">{i + 1}</td>
                  <td className="border px-2 py-1 uppercase">{surname}</td>
                  <td className="border px-2 py-1">{other}</td>
                  <td className="border px-2 py-1">{m.matric}</td>
                  <td className="border px-2 py-1">{m.role}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
