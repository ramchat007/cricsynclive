"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: boolean;
  className?: string;
}

export default function AdBanner({
  dataAdSlot,
  dataAdFormat = "auto",
  dataFullWidthResponsive = true,
  className = "my-6 w-full text-center overflow-hidden",
}: AdBannerProps) {
  const pathname = usePathname();
  const adPushed = useRef(false);

  useEffect(() => {
    // Prevent double-pushing during React StrictMode or rapid navigation
    if (adPushed.current) return;

    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      adPushed.current = true;
    } catch (err) {
      console.error("AdSense Push Error:", err);
    }
  }, [pathname]); // Re-evaluates when the URL changes

  return (
    <div className={className}>
      <span className="text-[9px] font-black tracking-widest text-[var(--text-muted)] uppercase block mb-1">
        Advertisement
      </span>
      <ins
        className="adsbygoogle block bg-slate-900/40 rounded-xl min-h-[100px]"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4257726751596254"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
    </div>
  );
}