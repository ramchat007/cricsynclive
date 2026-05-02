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
  Lock,
  Crown,
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
  const [activeInviteLink, setActiveInviteLink] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: myRoleData } = await supabase
        .from("tournament_roles")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (myRoleData) {
        setCurrentUserRole(myRoleData.role);
      }
    }

    const { data: roleData, error } = await supabase
      .from("tournament_roles")
      .select(
        `
        id, 
        role, 
        user_id,
        profiles (
          full_name,
          email
        )
      `,
      )
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (!error && roleData) {
      setMembers(roleData);
    }

    setIsLoading(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActiveInviteLink("");

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
      setInviteEmail("");
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

      if (!error) fetchData();
      else alert("Failed to remove user.");
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse text-xl">
        LOADING ACCESS CONTROL...
      </div>
    );

  const canManageAccess = ["owner", "admin", "super_admin"].includes(
    currentUserRole || "",
  );

  // --- GROUP THE MEMBERS FOR BETTER DISPLAY ---
  const owners = members.filter((m) => m.role === "owner");
  const admins = members.filter(
    (m) => m.role === "admin" || m.role === "super_admin",
  );
  const scorers = members.filter((m) => m.role === "scorer");

  // Helper function to render a user card
  const renderUserCard = (member: any) => {
    // Smart name fallback: Full Name -> Email Prefix -> "Unknown User"
    const displayName =
      member.profiles?.full_name ||
      member.profiles?.email?.split("@")[0] ||
      "Unknown User";

    return (
      <div
        key={member.id}
        className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg 
            ${
              member.role === "owner"
                ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20"
                : member.role === "admin" || member.role === "super_admin"
                  ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {member.role === "owner" ? (
              <Crown size={20} />
            ) : member.role === "admin" || member.role === "super_admin" ? (
              <ShieldAlert size={20} />
            ) : (
              <Edit3 size={20} />
            )}
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base capitalize">
              {displayName}
            </h4>
            <p className="text-xs font-bold text-slate-500">
              {member.profiles?.email}
            </p>

            <span
              className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full 
              ${
                member.role === "owner"
                  ? "bg-yellow-500 text-white shadow-md shadow-yellow-500/20"
                  : member.role === "admin" || member.role === "super_admin"
                    ? "bg-purple-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {member.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {canManageAccess && member.role !== "owner" && (
          <button
            onClick={() => handleRemoveMember(member.id, member.role)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            title="Revoke Access"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/t/${tournamentId}`}
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform"
          >
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
          {/* LEFT: GRANT ACCESS */}
          <div className="md:col-span-5">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-6">
              {canManageAccess ? (
                <>
                  <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-full flex items-center justify-center mb-6">
                    <UserPlus size={28} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight mb-2">
                    Grant Access
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                    Invite users to help manage or score your tournament.
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
                        className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500 transition-colors"
                      >
                        <option value="scorer">
                          Scorer (Can only score matches)
                        </option>

                        {/* Let anyone who has access to this form invite an Admin */}
                        <option value="admin">
                          Admin (Can edit settings & invite others)
                        </option>
                      </select>
                    </div>

                    {message.text && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}
                      >
                        {message.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !inviteEmail}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
                    >
                      {isSubmitting ? "Inviting..." : "Send Invite"}
                    </button>

                    {activeInviteLink && (
                      <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl animate-in zoom-in-95">
                        <p className="text-[10px] font-black text-teal-600 uppercase mb-2">
                          Share this link:
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
                              alert("Copied!");
                            }}
                            type="button"
                            className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </>
              ) : (
                <div className="text-center py-8 opacity-50">
                  <Lock size={48} className="mx-auto mb-4 text-slate-400" />
                  <h2 className="text-lg font-black uppercase">
                    Restricted Area
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-2">
                    Only Admins and Owners can invite new members.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: STRUCTURED MEMBERS LIST */}
          <div className="md:col-span-7 space-y-8">
            {/* OWNER SECTION */}
            {owners.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Crown size={14} /> Tournament Owner
                </h3>
                <div className="space-y-3">{owners.map(renderUserCard)}</div>
              </section>
            )}

            {/* ADMINS SECTION */}
            {admins.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ShieldAlert size={14} /> Administrators ({admins.length})
                </h3>
                <div className="space-y-3">{admins.map(renderUserCard)}</div>
              </section>
            )}

            {/* SCORERS SECTION */}
            {scorers.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Edit3 size={14} /> Match Scorers ({scorers.length})
                </h3>
                <div className="space-y-3">{scorers.map(renderUserCard)}</div>
              </section>
            )}

            {members.length === 0 && (
              <div className="text-center p-8 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-500">
                  No authorized users found.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
