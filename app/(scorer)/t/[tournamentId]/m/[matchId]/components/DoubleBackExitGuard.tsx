"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
// import toast from "react-hot-toast"; // Uncomment if you use react-hot-toast or similar

export default function DoubleBackExitGuard() {
  const pathname = usePathname();
  const exitPromptedRef = useRef(false);

  useEffect(() => {
    // 1. Only run this logic on the home/dashboard page.
    // If you want it on other root pages (like /matches), add them here:
    // if (pathname !== "/" && pathname !== "/matches") return;
    if (pathname !== "/") return;

    // 2. Push a dummy state to trap the first back-button press
    window.history.pushState({ isExitGuard: true }, "");

    const handlePopState = () => {
      if (!exitPromptedRef.current) {
        // --- FIRST BACK PRESS ---
        exitPromptedRef.current = true;

        // Re-push the dummy state so they don't actually leave the app yet
        window.history.pushState({ isExitGuard: true }, "");

        // Show your toast message! (Replace alert with your UI toast library)
        alert("Press back again to exit");
        // toast.error("Press back again to exit", { duration: 2000, icon: "🚪" });

        // Reset the prompt window after 2 seconds
        setTimeout(() => {
          exitPromptedRef.current = false;
        }, 2000);
      } else {
        // --- SECOND BACK PRESS (Within 2 seconds) ---
        // Force the browser to step back, which minimizes/exits the PWA on Android
        window.history.go(-1);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname]);

  return null; // This component is invisible!
}
