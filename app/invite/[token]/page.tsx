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
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminManagementPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [members, setMembers] = useState<any[]>([]);
  const [tournamentName, setTournamentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("scorer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [activeInviteLink, setActiveInviteLink] = useState("");
  const [lastInvitedEmail, setLastInvitedEmail] = useState("");

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

    // Fetch tournament name for the email template
    const { data: tData } = await supabase
      .from("tournaments")
      .select("name")
      .eq("id", tournamentId)
      .single();
    if (tData) setTournamentName(tData.name);

    const { data: roleData, error } = await supabase
      .from("tournament_roles")
      .select(
        `
        id, 
        role, 
        user_id,
        profiles (full_name, email, role)
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
    const targetEmail = inviteEmail.trim().toLowerCase();

    // Validations
    if (members.some((m) => m.profiles?.email?.toLowerCase() === targetEmail)) {
      setMessage({ text: "User is already a member.", type: "error" });
      setIsSubmitting(false);
      return;
    }

    const { data: existingInvite } = await supabase
      .from("tournament_invitations")
      .select("token")
      .eq("tournament_id", tournamentId)
      .eq("email", targetEmail)
      .maybeSingle();

    if (existingInvite) {
      setActiveInviteLink(
        `${window.location.origin}/invite/${existingInvite.token}`,
      );
      setLastInvitedEmail(targetEmail);
      setMessage({ text: "Using existing invitation link:", type: "success" });
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
      setActiveInviteLink(`${window.location.origin}/invite/${data.token}`);
      setLastInvitedEmail(targetEmail);
      setMessage({ text: "New invitation created!", type: "success" });
      setInviteEmail("");
    } else {
      setMessage({
        text: error?.message || "Error creating invite",
        type: "error",
      });
    }
    setIsSubmitting(false);
  };

  const handleMailInvite = () => {
    const subject = encodeURIComponent(`Invitation to join ${tournamentName}`);
    const body = encodeURIComponent(
      `Hi,\n\nYou have been invited to join the tournament "${tournamentName}" as a ${inviteRole}.\n\nPlease click the link below to accept the invitation and set up your account:\n\n${activeInviteLink}\n\nSee you on the field!`,
    );
    window.location.href = `mailto:${lastInvitedEmail}?subject=${subject}&body=${body}`;
  };

  const handleRemoveMember = async (roleId: string, roleType: string) => {
    if (roleType === "owner") return;
    if (window.confirm("Revoke access?")) {
      const { error } = await supabase
        .from("tournament_roles")
        .delete()
        .eq("id", roleId);
      if (!error) fetchData();
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-black text-[var(--text-muted)] bg-[var(--background)]">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={32}
        />
        <p className="uppercase tracking-widest text-xs">Loading Access...</p>
      </div>
    );

  const canManageAccess = ["owner", "admin", "super_admin"].includes(
    currentUserRole || "",
  );
  const owners = members.filter((m) => m.role === "owner");
  const admins = members.filter(
    (m) => m.role === "admin" && m.profiles?.role !== "super_admin",
  );
  const scorers = members.filter(
    (m) => m.role === "scorer" && m.profiles?.role !== "super_admin",
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 pb-20 transition-colors">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/t/${tournamentId}`}
            className="w-12 h-12 bg-[var(--surface-1)] rounded-full flex items-center justify-center border border-[var(--border-1)] hover:bg-[var(--surface-2)] transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldAlert size={28} className="text-[var(--accent)]" />{" "}
              Management
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <div className="bg-[var(--surface-1)] rounded-[2rem] p-8 border border-[var(--border-1)] sticky top-6">
              {canManageAccess ? (
                <>
                  <h2 className="text-xl font-black uppercase mb-6">
                    Grant Access
                  </h2>
                  <form onSubmit={handleAddMember} className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                        User Email
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none"
                      >
                        <option value="scorer">Scorer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {message.text && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold ${message.type === "error" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}
                      >
                        {message.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !inviteEmail}
                      className="w-full bg-[var(--accent)] text-[var(--background)] font-black uppercase py-4 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? "Generating..." : "Generate Invite"}
                    </button>

                    {activeInviteLink && (
                      <div className="mt-6 space-y-3 animate-in zoom-in-95">
                        <p className="text-[10px] font-black text-[var(--accent)] uppercase">
                          Share Invite via:
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeInviteLink);
                              alert("Link Copied!");
                            }}
                            type="button"
                            className="flex-1 flex items-center justify-center gap-2 bg-[var(--surface-2)] border border-[var(--border-1)] p-3 rounded-xl text-xs font-bold hover:bg-[var(--border-1)] transition-colors"
                          >
                            <Copy size={16} /> Copy Link
                          </button>
                          <button
                            onClick={handleMailInvite}
                            type="button"
                            className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 p-3 rounded-xl text-xs font-bold hover:bg-[var(--accent)]/20 transition-colors"
                          >
                            <Mail size={16} /> Email
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
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    Admins only.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-7 space-y-8">
            <section>
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Crown size={14} /> Owner
              </h3>
              <div className="space-y-3">
                {owners.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[var(--surface-1)] p-5 rounded-3xl border border-[var(--border-1)] flex items-center justify-between shadow-sm"
                  >
                    <div className="min-w-0">
                      <h4 className="font-black text-sm capitalize truncate">
                        {m.profiles?.full_name ||
                          m.profiles?.email?.split("@")[0]}
                      </h4>
                      <p className="text-xs font-bold text-[var(--text-muted)] truncate">
                        {m.profiles?.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {(admins.length > 0 || scorers.length > 0) && (
              <section>
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
                  Members
                </h3>
                <div className="space-y-3">
                  {[...admins, ...scorers].map((m) => (
                    <div
                      key={m.id}
                      className="bg-[var(--surface-1)] p-5 rounded-3xl border border-[var(--border-1)] flex items-center justify-between shadow-sm"
                    >
                      <div className="min-w-0">
                        <h4 className="font-black text-sm capitalize truncate">
                          {m.profiles?.full_name ||
                            m.profiles?.email?.split("@")[0]}
                        </h4>
                        <p className="text-xs font-bold text-[var(--text-muted)] truncate">
                          {m.profiles?.email} •{" "}
                          <span className="text-[var(--accent)] uppercase">
                            {m.role}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(m.id, m.role)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
