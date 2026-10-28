/** Imagens editoriais ilustrativas; não representam instalações ou docentes da instituição. */
export function academicImage(segment: string) {
  if (segment === "arquitetura") return "/images/architecture.jpg";
  if (segment === "financas" || segment === "gestao-empresarial") return "/images/library.jpg";
  if (segment === "gestao-de-pessoas-e-rh" || segment === "lideranca-e-comportamento") return "/images/campus-students.jpg";
  return "/images/classroom.jpg";
}
