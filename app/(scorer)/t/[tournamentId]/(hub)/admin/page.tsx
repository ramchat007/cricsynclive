"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  UserPlus,
  Trash2,
  Edit3,
  Mail,
  Copy,
  Lock,
  Crown,
  Activity,
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

  // --- SEARCH STATES ---
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  // --- LIVE SEARCH EFFECT ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Only search if they've typed at least 3 characters
      if (inviteEmail.length >= 3) {
        setIsSearchingUser(true);

        // Search profiles by email or name
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .ilike("email", `%${inviteEmail}%`) // Partial match search
          .limit(4);

        if (data && !error) {
          // Filter out users who are ALREADY members of this tournament
          const existingEmails = members.map((m) =>
            m.profiles?.email?.toLowerCase(),
          );
          const filteredResults = data.filter(
            (u) => !existingEmails.includes(u.email?.toLowerCase()),
          );
          setSearchResults(filteredResults);
        }
        setIsSearchingUser(false);
      } else {
        // Clear results if input is too short
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [inviteEmail, members]);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: globalProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const { data: myRoleData } = await supabase
        .from("tournament_roles")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (globalProfile?.role === "super_admin") {
        setCurrentUserRole("super_admin");
      } else if (myRoleData) {
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
    setMessage({ text: "", type: "" });

    const targetEmail = inviteEmail.trim().toLowerCase();

    const isAlreadyMember = members.some(
      (m) => m.profiles?.email?.toLowerCase() === targetEmail,
    );

    if (isAlreadyMember) {
      setMessage({
        text: "User is already in this tournament.",
        type: "error",
      });
      setIsSubmitting(false);
      return;
    }

    const { data: existingUser, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", targetEmail)
      .maybeSingle();

    if (existingUser) {
      const { data: newRole, error: roleError } = await supabase
        .from("tournament_roles")
        .insert({
          tournament_id: tournamentId,
          user_id: existingUser.id,
          role: inviteRole,
        })
        .select(
          `
          id, role, user_id, 
          profiles (full_name, email)
        `,
        )
        .single();

      if (!roleError && newRole) {
        setMembers((prev) => [...prev, newRole]);
        setMessage({
          text: `${existingUser.full_name || targetEmail} added directly!`,
          type: "success",
        });
        setInviteEmail("");

        fetch("/api/send-notification", {
          method: "POST",
          body: JSON.stringify({
            email: targetEmail,
            role: inviteRole,
            tournamentId,
            type: "direct_add",
          }),
        });
      } else {
        setMessage({ text: "Failed to assign role.", type: "error" });
      }
    } else {
      const { data: existingInvite } = await supabase
        .from("tournament_invitations")
        .select("token")
        .eq("tournament_id", tournamentId)
        .eq("email", targetEmail)
        .maybeSingle();

      if (existingInvite) {
        setMessage({
          text: "Invite already exists. Share this link:",
          type: "success",
        });
        setActiveInviteLink(
          `${window.location.origin}/invite/${existingInvite.token}`,
        );
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from("tournament_invitations")
        .insert({
          tournament_id: tournamentId,
          email: targetEmail,
          role: inviteRole,
        })
        .select()
        .single();

      if (!error && data) {
        const link = `${window.location.origin}/invite/${data.token}`;
        setActiveInviteLink(link);
        setMessage({
          text: "User not found. Invite link created!",
          type: "success",
        });
        setInviteEmail("");

        fetch("/api/send-notification", {
          method: "POST",
          body: JSON.stringify({
            email: targetEmail,
            role: inviteRole,
            link,
            type: "new_invite",
          }),
        });
      } else {
        setMessage({
          text: error?.message || "Error creating invite",
          type: "error",
        });
      }
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
      <div className="min-h-screen flex flex-col items-center justify-center font-black text-[var(--text-muted)] bg-[var(--background)] transition-colors duration-300">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={32}
        />
        <p className="uppercase tracking-widest text-xs">
          Loading Access Control...
        </p>
      </div>
    );

  const canManageAccess = ["owner", "admin", "super_admin"].includes(
    currentUserRole || "",
  );

  const owners = members.filter((m) => m.role === "owner");
  const admins = members.filter(
    (m) => m.role === "admin" || m.role === "super_admin",
  );
  const scorers = members.filter((m) => m.role === "scorer");

  const renderUserCard = (member: any) => {
    const displayName =
      member.profiles?.full_name ||
      member.profiles?.email?.split("@")[0] ||
      "Unknown User";

    return (
      <div
        key={member.id}
        className="bg-[var(--surface-1)] p-5 rounded-3xl border border-[var(--border-1)] flex items-center justify-between shadow-sm transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-lg transition-colors
            ${
              member.role === "owner"
                ? "bg-amber-500/10 text-amber-500"
                : member.role === "admin" || member.role === "super_admin"
                  ? "bg-purple-500/10 text-purple-500"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)]"
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

          <div className="min-w-0">
            <h4 className="font-black text-[var(--foreground)] text-sm sm:text-base capitalize truncate">
              {displayName}
            </h4>
            <p className="text-xs font-bold text-[var(--text-muted)] truncate">
              {member.profiles?.email}
            </p>

            <span
              className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-colors
              ${
                member.role === "owner"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : member.role === "admin" || member.role === "super_admin"
                    ? "bg-purple-500 text-white"
                    : "bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)]"
              }`}
            >
              {member.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {canManageAccess && member.role !== "owner" && (
          <button
            onClick={() => handleRemoveMember(member.id, member.role)}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-[var(--background)] transition-colors"
            title="Revoke Access"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 font-sans pb-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto animate-in fade-in">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/t/${tournamentId}`}
            className="w-12 h-12 bg-[var(--surface-1)] rounded-full flex items-center justify-center shadow-sm border border-[var(--border-1)] hover:bg-[var(--surface-2)] hover:scale-105 transition-all text-[var(--foreground)]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldAlert size={28} className="text-[var(--accent)]" /> Admin &
              Scorers
            </h1>
            <p className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest">
              Access Control
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* LEFT: GRANT ACCESS */}
          <div className="md:col-span-5">
            <div className="bg-[var(--surface-1)] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-[var(--border-1)] sticky top-6 transition-colors">
              {canManageAccess ? (
                <>
                  <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mb-6 transition-colors">
                    <UserPlus size={28} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-[var(--foreground)]">
                    Grant Access
                  </h2>
                  <p className="text-xs font-bold text-[var(--text-muted)] mb-6 leading-relaxed">
                    Invite users to help manage or score your tournament.
                  </p>

                  <form onSubmit={handleAddMember} className="space-y-5">
                    {/* CORRECT PLACEMENT OF SEARCH DROPDOWN */}
                    <div className="relative">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>User Email</span>
                        {isSearchingUser && (
                          <Activity
                            size={12}
                            className="animate-spin text-[var(--accent)]"
                          />
                        )}
                      </label>
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        />
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="scorer@example.com"
                          className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl py-3 pl-11 pr-4 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                          autoComplete="off"
                        />
                      </div>

                      {searchResults.length > 0 && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                          <p className="text-[9px] font-black uppercase text-[var(--text-muted)] px-4 py-2 border-b border-[var(--border-1)] bg-[var(--surface-2)]/50">
                            Existing Users Found
                          </p>
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setInviteEmail(user.email);
                                setSearchResults([]);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-[var(--surface-2)] border-b border-[var(--border-1)] last:border-0 flex items-center gap-3 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
                                {user.full_name?.charAt(0).toUpperCase() ||
                                  user.email?.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[var(--foreground)] truncate">
                                  {user.full_name || "Unknown User"}
                                </p>
                                <p className="text-xs text-[var(--text-muted)] truncate">
                                  {user.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                      >
                        <option
                          value="scorer"
                          className="bg-[var(--surface-1)]"
                        >
                          Scorer (Can only score matches)
                        </option>
                        <option value="admin" className="bg-[var(--surface-1)]">
                          Admin (Can edit settings & invite others)
                        </option>
                      </select>
                    </div>

                    {message.text && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold ${
                          message.type === "error"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {message.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !inviteEmail}
                      className="w-full bg-[var(--accent)] hover:opacity-90 text-[var(--background)] font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                      {isSubmitting ? "Inviting..." : "Send Invite"}
                    </button>

                    {activeInviteLink && (
                      <div className="mt-4 p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-2xl animate-in zoom-in-95">
                        <p className="text-[10px] font-black text-[var(--accent)] uppercase mb-2">
                          Share this link:
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={activeInviteLink}
                            className="flex-1 bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] rounded-lg p-2 text-xs font-mono outline-none"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeInviteLink);
                              alert("Copied!");
                            }}
                            type="button"
                            className="p-2 bg-[var(--accent)] text-[var(--background)] rounded-lg hover:opacity-90 transition-colors"
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
                  <Lock
                    size={48}
                    className="mx-auto mb-4 text-[var(--text-muted)]"
                  />
                  <h2 className="text-lg font-black uppercase text-[var(--foreground)]">
                    Restricted Area
                  </h2>
                  <p className="text-xs font-bold text-[var(--text-muted)] mt-2">
                    Only Admins and Owners can invite new members.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: STRUCTURED MEMBERS LIST */}
          <div className="md:col-span-7 space-y-8">
            {owners.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Crown size={14} /> Tournament Owner
                </h3>
                <div className="space-y-3">{owners.map(renderUserCard)}</div>
              </section>
            )}

            {admins.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ShieldAlert size={14} /> Administrators ({admins.length})
                </h3>
                <div className="space-y-3">{admins.map(renderUserCard)}</div>
              </section>
            )}

            {scorers.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Edit3 size={14} /> Match Scorers ({scorers.length})
                </h3>
                <div className="space-y-3">{scorers.map(renderUserCard)}</div>
              </section>
            )}

            {members.length === 0 && (
              <div className="text-center p-8 bg-[var(--surface-1)] rounded-3xl border border-dashed border-[var(--border-1)] transition-colors">
                <p className="text-sm font-bold text-[var(--text-muted)]">
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
