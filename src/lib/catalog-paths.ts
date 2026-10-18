export function levelPath(levelSlug: string, segmentSlug?: string, moduleSlug?: string, topicSlug?: string) {
  return "/" + [levelSlug, segmentSlug, moduleSlug, topicSlug].filter(Boolean).join("/");
}
