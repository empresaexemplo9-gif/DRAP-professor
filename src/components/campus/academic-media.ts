/** Imagens editoriais ilustrativas; não representam instalações ou docentes da instituição. */
export function academicImage(segment: string) {
  if (segment === "agronegocio") return "/images/agriculture.jpg";
  if (segment === "arquitetura") return "/images/architecture.jpg";
  if (segment === "financas") return "/images/library.jpg";
  return "/images/classroom.jpg";
}
