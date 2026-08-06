"use client";
import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

// --- WE SEPARATE THE CONTENT SO WE CAN WRAP IT IN SUSPENSE ---
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🔥 GRAB THE 'next' PARAMETER FROM THE URL
  const nextParam = searchParams.get("next");
  // Security check: ensure it's a relative path (starts with /) to prevent malicious redirects, otherwise default to /dashboard
  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // --- EMAIL & PASSWORD AUTH ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            phone: phone,
          },
        },
      });
      if (error) alert(error.message);
      else alert("Check your email for the confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
      // 🔥 REDIRECT TO DYNAMIC PATH
      else router.push(nextPath); 
    }
    setLoading(false);
  };

  // --- GOOGLE AUTH ---
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // 🔥 REDIRECT TO DYNAMIC PATH
        redirectTo: `${window.location.origin}${nextPath}`,
      },
    });

    if (error) {
      alert("Error logging in: " + error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {isSignUp ? "CREATE ACCOUNT" : "WELCOME BACK"}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {isSignUp
              ? "Launch your tournament ecosystem."
              : "Access your command center."}
          </p>
        </div>

        {/* --- GOOGLE BUTTON --- */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="flex items-center justify-center gap-3 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50">
          {googleLoading ? "Connecting to Google..." : (
            <>
              {/* SVG Icon Omitted for brevity, keep yours here! */}
              Continue with Google
            </>
          )}
        </button>

        {/* --- OR DIVIDER --- */}
        <div className="relative flex py-6 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            Or continue with email
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        {/* --- EMAIL FORM --- */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-teal-500 outline-none"
                    required={isSignUp}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-teal-500 outline-none"
                    required={isSignUp}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-teal-500 outline-none"
                  required={isSignUp}
                />
              </div>
            </>
          )}

          {/* ALWAYS SHOW EMAIL & PASSWORD */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-teal-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-teal-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl mt-4 transition-all">
            {loading ? "Authenticating..." : isSignUp ? "Create Account" : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            type="button"
            className="text-sm font-bold text-slate-500 hover:text-teal-500 transition-colors">
            {isSignUp ? "Already have an account? Log in." : "Need an account? Sign up."}
          </button>
        </div>
      </div>
    </div>
  );
}

// 🔥 THIS IS REQUIRED BY NEXT.JS WHEN USING useSearchParams()
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}