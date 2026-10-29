import type { FinancialMentorship } from "@/lib/mentorships";

/** Apostilas fornecidas pelo cliente para as mentorias financeiras (content/courses/mentoria-financeira-*). */
export type MentorshipDownload = {
  id: "pdf" | "docx" | "md";
  label: string;
  file: string;
  fileName: string;
  contentType: string;
  /** "docente": contém gabaritos de uso restrito à equipe pedagógica. */
  audience: "participantes" | "docente";
};

export type MentorshipContent = {
  dir: string;
  source: string;
  hours: number;
  downloads: MentorshipDownload[];
};

const PDF = "application/pdf";

export const MENTORSHIP_CONTENT: Partial<Record<FinancialMentorship["key"], MentorshipContent>> = {
  pequenas: {
    dir: "content/courses/mentoria-financeira-pequenas",
    source: "drap-mentoria-financeira-pequenas-v1",
    hours: 56,
    downloads: [
      { id: "pdf", label: "Apostila (PDF)", file: "source.pdf", fileName: "Apostila - Mentoria financeira para pequenas empresas.pdf", contentType: PDF, audience: "participantes" },
      {
        id: "docx",
        label: "Apostila editável (DOCX)",
        file: "source.docx",
        fileName: "Apostila editável - Mentoria financeira para pequenas empresas.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        audience: "participantes",
      },
    ],
  },
  medias: {
    dir: "content/courses/mentoria-financeira-medias",
    source: "drap-mentoria-financeira-medias-v1",
    hours: 80,
    // O Apêndice A (gabaritos) está nos arquivos originais e é restrito à equipe docente.
    downloads: [
      { id: "pdf", label: "Apostila completa com Apêndice A (PDF)", file: "source.pdf", fileName: "Apostila - Mentoria financeira para médias empresas.pdf", contentType: PDF, audience: "docente" },
      { id: "md", label: "Apostila completa com Apêndice A (Markdown)", file: "source.md", fileName: "Apostila - Mentoria financeira para médias empresas.md", contentType: "text/markdown; charset=utf-8", audience: "docente" },
    ],
  },
};

export const mentorshipDownloadPath = (m: Pick<FinancialMentorship, "key">, id: MentorshipDownload["id"]) => `/api/courses/mentorias/${m.key}/${id}`;

export function mentorshipDownloads(m: Pick<FinancialMentorship, "key">, isStaff: boolean) {
  return (MENTORSHIP_CONTENT[m.key]?.downloads ?? []).filter((d) => isStaff || d.audience === "participantes");
}
