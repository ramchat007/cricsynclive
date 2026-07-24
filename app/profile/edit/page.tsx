"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Camera,
  CheckCircle2,
  Trophy,
  Swords,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile Form States
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState("scorer");

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    // 🌟 Extract Google SSO data (if available)
    const googleAvatar =
      user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
    const googleName =
      user.user_metadata?.full_name || user.user_metadata?.name || "";

    console.log("🔍 ----- PROFILE IMAGE DEBUG ----- 🔍");
    console.log("Google Image URL:", googleAvatar || "None found");

    // Fetch existing profile data from your table
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      console.log(
        "Database Image URL (Cloudinary):",
        profile.avatar_url || "None found",
      );

      // The logic: Use the database image first. If it's empty, fall back to Google's image.
      const finalAvatar = profile.avatar_url || googleAvatar;
      console.log("✅ Final Image Selected:", finalAvatar);

      setFullName(profile.full_name || googleName);
      setAvatarUrl(finalAvatar);

      setPhone(profile.phone || "");
      setCity(profile.city || "");
      setRole(profile.role || "scorer");
    } else {
      console.log("Database Image URL (Cloudinary): No profile row exists yet");
      console.log("✅ Final Image Selected (Fallback):", googleAvatar);

      // If they don't have a profile row at all yet, pre-fill with Google data
      setFullName(googleName);
      setAvatarUrl(googleAvatar);
    }

    console.log("-----------------------------------");
    setLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    console.log("💾 --- SAVING PROFILE --- 💾");
    console.log("Saving Avatar URL:", avatarUrl);

    try {
      // 🚨 FIX: Removed `updated_at` to prevent schema errors if the column doesn't exist.
      // We also do a direct update first, which is safer than upsert for existing profiles.
      const payload = {
        full_name: fullName,
        phone: phone,
        city: city,
        avatar_url: avatarUrl,
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId)
        .select();

      if (error) {
        console.error("Supabase Save Error:", error);
        throw error;
      }

      // If update returned 0 rows, it means they don't have a profile row yet. We need to insert it.
      if (!data || data.length === 0) {
        console.log("No existing profile row found. Inserting new row...");
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, ...payload });

        if (insertError) {
          console.error("Supabase Insert Error:", insertError);
          throw insertError;
        }
      }

      console.log("✅ Successfully saved to database!");
      alert("✅ Profile updated successfully!");
    } catch (err: any) {
      alert("Error updating profile: " + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-sans">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="font-bold text-xs uppercase tracking-widest">
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans pb-24">
      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all">
          <Trophy size={15} /> Tournaments
        </Link>
        <Link
          href="/my-matches"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all">
          <Swords size={15} /> My Matches
        </Link>
        <Link
          href="/profile/edit"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition-all">
          <User size={15} className="text-blue-500" /> Edit Profile
        </Link>
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">
          Edit Profile
        </h1>
        <p className="text-slate-500 font-bold text-xs mt-1">
          Update your personal details, location, and avatar.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* AVATAR SECTION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div
              className="w-24 h-24 rounded-full bg-slate-100 bg-cover bg-center border-4 border-white shadow-md flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: avatarUrl ? `url('${avatarUrl}')` : "none", // <-- Single quotes added here!
              }}>
              {!avatarUrl && <User size={40} className="text-slate-300" />}
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg mb-1">
              Profile Photo
            </h3>
            <p className="text-xs font-bold text-slate-400 mb-4">
              JPG or PNG. Maximum 5MB.
            </p>

            <CldUploadWidget
              uploadPreset={String(
                process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
              )}
              options={{
                sources: ["local", "url", "camera"],
                multiple: false,
                cropping: true,
                showSkipCropButton: false,
              }}
              onSuccess={(result: any) => {
                let url = result.info.secure_url;
                if (result.info.coordinates && result.info.coordinates.custom) {
                  url = url.replace("/upload/", "/upload/c_crop,g_custom/");
                }
                console.log("📸 New Image Uploaded to Cloudinary:", url);
                setAvatarUrl(url);
              }}>
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] py-3 px-5 rounded-xl transition-all inline-flex items-center gap-2">
                  <Camera size={14} /> Change Avatar
                </button>
              )}
            </CldUploadWidget>
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs border-b border-slate-100 pb-3">
            Account Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, MH"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs py-4 px-8 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
