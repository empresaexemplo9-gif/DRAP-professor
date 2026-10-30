"use client";
import { useEffect } from "react";
import { trackTimeAction } from "@/app/(site)/cpa/actions";

/** Registra o tempo de leitura (só com a aba visível), em blocos de até 1 minuto. */
export function TimeTracker({ lessonCode }: { lessonCode: string }) {
  useEffect(() => {
    let last = Date.now();
    const flush = () => {
      const s = Math.round((Date.now() - last) / 1000);
      last = Date.now();
      if (s >= 5 && document.visibilityState === "visible") void trackTimeAction({ lessonCode, seconds: s }).catch(() => undefined);
    };
    const t = setInterval(flush, 60_000);
    const onVis = () => (document.visibilityState === "hidden" ? flush() : (last = Date.now()));
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [lessonCode]);
  return null;
}
