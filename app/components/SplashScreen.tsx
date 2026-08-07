"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function SplashScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Controls how long the splash screen stays visible (e.g., 2.5 seconds)
    // In a real app, you could replace this timeout with your actual data-fetching state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* AnimatePresence allows components to animate out when they are removed from the DOM */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="splash-screen"
            // The background fades in instantly, then fades out smoothly on exit
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--background)]"
          >
            {/* 1. THE LOGO ANIMATION */}
            <motion.div
              // Starts scaled down and slightly rotated
              initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
              // Pops into place using physics-based spring animation
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
                duration: 0.5,
                ease: "easeOut",
              }}
              className="relative w-24 h-24 sm:w-32 sm:h-32"
            >
              <Image
                src="/cricsync-logo.png"
                alt="CricSyncLive"
                width={80}
                height={51}
                priority
                className="object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* 2. THE BRAND NAME ANIMATION */}
            <motion.h1
              // Slides up from the bottom slightly after the logo pops in
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: -20 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="mt-6 text-2xl font-black italic uppercase tracking-tighter text-[var(--foreground)]"
            >
              CricSync<span className="text-[var(--accent)]">Live</span>
            </motion.h1>

            {/* 3. OPTIONAL LOADING INDICATOR */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute bottom-12 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[var(--accent)]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Initializing Environment
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The rest of your application renders perfectly behind the splash screen */}
      {children}
    </>
  );
}
