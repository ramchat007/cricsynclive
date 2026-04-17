"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldAlert, Loader2, UserPlus } from "lucide-react";

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [status, setStatus] = useState<
    "loading" | "valid" | "invalid" | "success" | "must-login"
  >("loading");
  const [inviteData, setInviteData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    // 1. Fetch the invitation details using the token
    const { data: invite, error } = await supabase
      .from("tournament_invitations")
      .select("*, tournaments(name)")
      .eq("token", token)
      .eq("is_accepted", false)
      .single();

    if (error || !invite) {
      setStatus("invalid");
      setErrorMsg("This invitation link is invalid or has already been used.");
      return;
    }

    setInviteData(invite);

    // 2. Check if the user is already logged in
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("must-login");
    } else {
      setStatus("valid");
      // Optional: Auto-claim if logged in with the matching email
      // if (session.user.email === invite.email) handleClaim(session.user.id, invite);
    }
  };

  const handleClaim = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return setStatus("must-login");

    setStatus("loading");

    // 3. Create the role in tournament_roles
    const { error: roleError } = await supabase
      .from("tournament_roles")
      .insert({
        tournament_id: inviteData.tournament_id,
        user_id: session.user.id,
        role: inviteData.role,
      });

    if (roleError) {
      if (roleError.code === "23505") {
        // User already has a role, just close the invite
      } else {
        setStatus("invalid");
        setErrorMsg("Failed to link account: " + roleError.message);
        return;
      }
    }

    // 4. Mark invite as accepted
    await supabase
      .from("tournament_invitations")
      .update({ is_accepted: true })
      .eq("id", inviteData.id);

    setStatus("success");

    // Redirect after 2 seconds
    setTimeout(() => {
      router.push(`/t/${inviteData.tournament_id}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
        {status === "loading" && (
          <div className="py-10 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
            <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">
              Validating Invite...
            </p>
          </div>
        )}

        {status === "invalid" && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
              Invite Error
            </h1>
            <p className="text-slate-500 font-bold text-sm mb-8">{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-xl uppercase tracking-widest text-xs">
              Go Home
            </button>
          </div>
        )}

        {status === "must-login" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-full flex items-center justify-center mb-6 text-2xl">
              👋
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
              Join Tournament
            </h1>
            <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
              You've been invited to be a{" "}
              <span className="text-teal-500">{inviteData.role}</span> for{" "}
              <br />
              <span className="text-slate-900 dark:text-white font-black text-lg">
                {inviteData.tournaments?.name}
              </span>
            </p>
            <div className="space-y-3 w-full">
              <button
                onClick={() => router.push(`/login?returnTo=/invite/${token}`)}
                className="w-full bg-teal-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg shadow-teal-500/20 transition-transform active:scale-95">
                Log In to Accept
              </button>
              <button
                onClick={() => router.push(`/signup?returnTo=/invite/${token}`)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest text-xs">
                Create Account
              </button>
            </div>
          </div>
        )}

        {status === "valid" && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-full flex items-center justify-center mb-6">
              <UserPlus size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
              Accept Invitation
            </h1>
            <p className="text-slate-500 font-bold text-sm mb-8">
              Link this account to{" "}
              <span className="text-slate-900 dark:text-white">
                {inviteData.tournaments?.name}
              </span>{" "}
              as a{" "}
              <span className="text-teal-500 capitalize">
                {inviteData.role}
              </span>
              ?
            </p>
            <button
              onClick={handleClaim}
              className="w-full bg-teal-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg shadow-teal-500/20 transition-transform active:scale-95">
              Claim Access
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-teal-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-teal-500/40">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
              Access Granted
            </h1>
            <p className="text-slate-500 font-bold text-sm">
              Welcome to the team! Redirecting to tournament...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
