"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const sandboxId =
  process.env.NEXT_PUBLIC_LIVEKIT_SANDBOX_ID ??
  process.env.NEXT_PUBLIC_SANDBOX_ID ??
  "livehotel";

export default function LiveKitConciergeEmbed() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <Script
      id="livekit-embed"
      src="/embed-popup.js"
      data-lk-sandbox-id={sandboxId}
      strategy="afterInteractive"
    />
  );
}
