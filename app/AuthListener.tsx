"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      
      // When the user successfully signs in (like returning from Google)
      if (event === "SIGNED_IN") {
        
        // If there is an ugly hash in the URL, silently strip it away
        if (window.location.hash.includes("access_token")) {
          // This cleans the URL without causing a page reload
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          
          // Force Next.js router to refresh the current page state to recognize the new user
          router.refresh(); 
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return null; // This component doesn't render any UI
}