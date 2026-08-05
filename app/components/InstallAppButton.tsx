"use client";
import React, { useEffect, useState } from "react";
import { Download } from "lucide-react"; // Assuming you use lucide-react for icons

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // 1. Listen for the browser announcing that the app is installable
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome from automatically showing its default mini-infobar
      e.preventDefault();

      // Save the event so we can trigger it later
      setDeferredPrompt(e);

      // Show our custom button
      setIsInstallable(true);
    };

    // 2. Listen for a successful installation
    const handleAppInstalled = () => {
      // Hide the button once the app is installed
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // 3. Trigger the native installation prompt
    deferredPrompt.prompt();

    // 4. Wait to see what the user chose
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // 5. The prompt can only be used once, so we must clear it
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // If the app is already installed, or on iOS (which doesn't support this), hide the button
  if (!isInstallable) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 bg-[var(--accent)] text-[var(--background)] px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95"
    >
      <Download size={16} />
      <span>Install App</span>
    </button>
  );
}
