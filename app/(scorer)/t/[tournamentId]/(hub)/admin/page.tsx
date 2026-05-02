"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  UserPlus,
  Trash2,
  Shield,
  Edit3,
  Mail,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminManagementPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("scorer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [currentUserRole, setCurrentUserRole] = useState("scorer"); // Safety fallback

  useEffect(() => {
    fetchMembers();
  }, [tournamentId]);

  const fetchMembers = async () => {
    setIsLoading(true);

    const { data: roleData, error } = await supabase
      .from("tournament_roles")
      .select(
        `
      id, 
      role, 
      user_id,
      profiles (
        full_name
      )
    `,
      )
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Scorecard fetch error:", error);
    } else {
      setMembers(roleData);
    }
    setIsLoading(false);
  };

  // Inside your Admin page component
  const [activeInviteLink, setActiveInviteLink] = useState("");

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActiveInviteLink(""); // Reset

    const { data, error } = await supabase
      .from("tournament_invitations")
      .insert({
        tournament_id: tournamentId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      })
      .select()
      .single();

    if (!error && data) {
      const link = `${window.location.origin}/invite/${data.token}`;
      setActiveInviteLink(link);
      setMessage({ text: "Invitation created!", type: "success" });
    } else {
      setMessage({
        text: error?.message || "Error creating invite",
        type: "error",
      });
    }
    setIsSubmitting(false);
  };

  const handleRemoveMember = async (roleId: string, roleType: string) => {
    if (roleType === "owner") {
      alert("You cannot remove the tournament owner.");
      return;
    }

    if (window.confirm("Are you sure you want to revoke this user's access?")) {
      const { error } = await supabase
        .from("tournament_roles")
        .delete()
        .eq("id", roleId);

      if (!error) fetchMembers();
      else alert("Failed to remove user.");
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse text-xl">
        LOADING ACCESS CONTROL...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/t/${tournamentId}`}
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldAlert size={28} className="text-red-500" /> Admin & Scorers
            </h1>
            <p className="text-sm font-bold text-red-500 uppercase tracking-widest">
              Access Control
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* LEFT: ADD NEW MEMBER FORM */}
          <div className="md:col-span-5">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-6">
              <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-full flex items-center justify-center mb-6">
                <UserPlus size={28} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight mb-2">
                Grant Access
              </h2>
              <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                Invite registered users to help manage or score your tournament.
              </p>

              <form onSubmit={handleAddMember} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    User Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="scorer@example.com"
                      className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500 transition-colors">
                    <option value="scorer">
                      Scorer (Can only score matches)
                    </option>
                    {(currentUserRole === "owner") && (
                      <option value="admin">
                        Admin (Can edit settings & teams)
                      </option>
                    )}
                  </select>
                </div>

                {message.text && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold ${message.type === "error" ? "bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/10 dark:border-red-900/30" : "bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-900/10 dark:border-teal-900/30"}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !inviteEmail}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50">
                  {isSubmitting ? "Inviting..." : "Send Invite"}
                </button>

                {activeInviteLink && (
                  <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl animate-in zoom-in-95">
                    <p className="text-[10px] font-black text-teal-600 uppercase mb-2">
                      Share this link with the scorer:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={activeInviteLink}
                        className="flex-1 bg-white dark:bg-black border border-teal-200 dark:border-teal-800 rounded-lg p-2 text-xs font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeInviteLink);
                          alert("Link copied to clipboard!");
                        }}
                        className="p-2 bg-teal-600 text-white rounded-lg">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* RIGHT: CURRENT MEMBERS LIST */}
          <div className="md:col-span-7">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">
              Authorized Users ({members.length})
            </h3>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${member.role === "owner" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" : member.role === "admin" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {member.role === "owner" ? (
                        <Shield size={20} />
                      ) : member.role === "admin" ? (
                        <ShieldAlert size={20} />
                      ) : (
                        <Edit3 size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                        {member.profiles?.full_name || "Unknown User"}
                      </h4>
                      <p className="text-xs font-bold text-slate-500">
                        {member.profiles?.email}
                      </p>

                      {/* Role Badge */}
                      <span
                        className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${member.role === "owner" ? "bg-yellow-500 text-white" : member.role === "admin" ? "bg-purple-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button (Only visible if you are an admin/owner, and you aren't trying to delete the owner) */}
                  {(currentUserRole === "owner" ||
                    currentUserRole === "admin") &&
                    member.role !== "owner" && (
                      <button
                        onClick={() =>
                          handleRemoveMember(member.id, member.role)
                        }
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        title="Revoke Access">
                        <Trash2 size={16} />
                      </button>
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
