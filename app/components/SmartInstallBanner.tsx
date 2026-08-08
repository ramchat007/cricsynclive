"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import Image from "next/image";

export default function SmartInstallBanner() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if user already dismissed the banner or is already in the app
    const isDismissed = localStorage.getItem("cricsync_install_dismissed");
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    if (isDismissed === "true" || isStandalone) {
      return;
    }

    // 2. Android / Chrome Logic (Intercept the native prompt)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. iOS Logic (Detect Apple mobile devices)
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setIsIOS(true);
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show manual instructions for Apple users
      setShowIOSInstructions(true);
    } else if (deferredPrompt) {
      // Trigger native Android install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsInstallable(false);
    localStorage.setItem("cricsync_install_dismissed", "true"); // Remember they closed it!
  };

  if (!isInstallable) return null;

  return (
    <>
      {/* 📱 THE STICKY BOTTOM BANNER */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+10px)] left-2 right-2 md:left-auto md:right-4 md:w-96 md:bottom-4 z-[90] animate-in slide-in-from-bottom-5 fade-in duration-500">
        <div className="bg-[var(--surface-1)] border border-[var(--border-1)] shadow-2xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xl">
          <button
            onClick={handleDismiss}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-full transition-colors shrink-0"
          >
            <X size={14} />
          </button>

          <Image
            src="/cricsync-logo.png" // Make sure this path points to your app icon
            alt="CricSync Logo"
            width={40}
            height={40}
            className="rounded-lg shrink-0 object-contain"
          />

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black uppercase text-[var(--foreground)] truncate">
              Install CricSyncApp
            </p>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">
              Faster. Fullscreen. Live.
            </p>
          </div>

          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] text-[11px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-95 transition-all shrink-0"
          >
            Install
          </button>
        </div>
      </div>

      {/* 🍎 iOS INSTRUCTION MODAL */}
      {showIOSInstructions && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="bg-[var(--surface-1)] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[var(--border-1)] animate-in slide-in-from-bottom-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[var(--surface-2)] rounded-2xl mx-auto mb-4 flex items-center justify-center border border-[var(--border-1)]">
                <Image
                  src="/cricsync-logo.png"
                  alt="App Icon"
                  width={40}
                  height={40}
                />
              </div>
              <h3 className="text-lg font-black uppercase text-[var(--foreground)]">
                Install on iPhone
              </h3>
              <p className="text-[13px] text-[var(--text-muted)] mt-2 font-medium">
                Apple restricts automatic installs. Follow these 2 quick steps:
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4 bg-[var(--surface-2)] p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">
                  1
                </div>
                <p className="text-[13px] font-bold flex-1 text-[var(--foreground)]">
                  Tap the <strong className="text-blue-500">Share</strong>{" "}
                  button at the bottom of Safari.
                </p>
                <Share size={20} className="text-blue-500" />
              </div>
              <div className="flex items-center gap-4 bg-[var(--surface-2)] p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center font-black">
                  2
                </div>
                <p className="text-[13px] font-bold flex-1 text-[var(--foreground)]">
                  Scroll down and tap{" "}
                  <strong className="text-[var(--foreground)]">
                    Add to Home Screen
                  </strong>
                  .
                </p>
                <div className="w-6 h-6 border-2 border-[var(--foreground)] rounded-md flex items-center justify-center shrink-0">
                  <span className="text-[14px] font-black leading-none">+</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-4 bg-[var(--surface-2)] hover:bg-[var(--border-1)] text-[var(--foreground)] rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
