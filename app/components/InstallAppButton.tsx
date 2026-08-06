"use client";
import React, { useEffect, useState } from "react";
import { Download, Share, PlusSquare } from "lucide-react";

export default function InstallAppButton({
  className,
}: {
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Detect if the user is on an iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

    // Check if the app is ALREADY installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isIOSDevice && !isStandalone) {
      setIsIOS(true);
      setIsInstallable(true); // Force the button to show on iOS
    }

    // 2. Standard Android/Desktop prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsIOS(false);
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
    // If it's an iOS device, show our custom instructions instead
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    // Standard Android/Chrome installation
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  if (!isInstallable) return null;

  const defaultClasses =
    "flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--background)] px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95 w-full sm:w-auto";

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={className || defaultClasses}
      >
        <Download
          size={className ? 20 : 16}
          className={className ? "animate-bounce" : ""}
        />
        <span>Install App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col gap-4 text-center">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-xl flex items-center justify-center mx-auto mb-2 border border-[var(--border-1)]">
              <Download size={32} className="text-[var(--accent)]" />
            </div>
            <h3 className="text-xl font-black text-[var(--foreground)] leading-tight">
              Install CricSync on iOS
            </h3>
            <p className="text-sm font-bold text-[var(--text-muted)]">
              Apple doesn't support automatic installations yet, but you can add
              it manually in two taps!
            </p>

            <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border-1)] text-left flex flex-col gap-3 my-2">
              <div className="flex items-center gap-3 text-sm font-bold text-[var(--foreground)]">
                <span className="w-6 h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0">
                  1
                </span>
                Tap the <Share size={16} className="mx-1 text-blue-500" /> Share
                button in your Safari menu bar.
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-[var(--foreground)]">
                <span className="w-6 h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0">
                  2
                </span>
                Scroll down and tap{" "}
                <strong className="flex items-center gap-1 mx-1 text-sm">
                  <PlusSquare size={16} /> Add to Home Screen
                </strong>
                .
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full bg-[var(--surface-2)] text-[var(--foreground)] font-black uppercase tracking-widest text-sm py-4 rounded-xl border border-[var(--border-1)] hover:bg-[var(--border-1)] transition-colors mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
