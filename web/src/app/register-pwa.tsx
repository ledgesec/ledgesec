"use client";

import { useEffect } from "react";
import { keepsPwa } from "@/shared/lib/pwa";

export function RegisterPwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!keepsPwa(window.location.host)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
