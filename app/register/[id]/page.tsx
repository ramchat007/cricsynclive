"use client";
import { useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import {
  User,
  Phone,
  ChevronRight,
  CheckCircle2,
  Camera,
  Search,
  Edit3,
  Loader2,
} from "lucide-react";

export default function PublicPlayerRegistration({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = use(params);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lookupMode, setLookupMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    mobile_number: "",
    batting_hand: "Right Hand",
    bowling_hand: "Right Arm",
    bowling_style: "Fast",
    player_role: "All-Rounder",
    tshirt_size: "M",
    photo_url: "",
    payment_url: "",
  });

  const handleLookup = async () => {
    if (!formData.mobile_number) return;
    setLoading(true);
    const cleanMobile = formData.mobile_number.trim().replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      setLoading(false);
      return;
    }
    const sanitizedNumber = cleanMobile.slice(-10);

    const { data: existingPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("mobile_number", sanitizedNumber)
      .maybeSingle();

    setLoading(false);

    if (existingPlayer) {
      setFormData(existingPlayer);
      setIsEditing(true);
      setStep(2);
    } else {
      alert(
        "No registration found with this number. Please register as a new player.",
      );
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const cleanMobile = formData.mobile_number.trim().replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      setLoading(false);
      return;
    }
    const sanitizedNumber = cleanMobile.slice(-10);

    if (!isEditing) {
      const { data: duplicate } = await supabase
        .from("players")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("mobile_number", sanitizedNumber)
        .maybeSingle();

      if (duplicate) {
        alert(
          "This number is already registered! Please use the 'Edit Existing' option.",
        );
        setLoading(false);
        return;
      }
    }

    const { id, ...insertData } = formData;

    let error;
    if (isEditing) {
      const { error: updateError } = await supabase
        .from("players")
        .update(insertData)
        .eq("id", formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("players")
        .insert({ tournament_id: tournamentId, ...insertData });
      error = insertError;
    }

    if (error) {
      alert("Submission failed: " + error.message);
      setLoading(false);
    } else {
      setStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-[var(--surface-1)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--border-1)] transition-colors">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-[var(--foreground)]">
                {lookupMode ? "Edit Profile" : "Player Entry"}
              </h1>
              <button
                onClick={() => {
                  setLookupMode(!lookupMode);
                  setIsEditing(false);
                  setFormData({ ...formData, id: "", full_name: "" });
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-full transition-all hover:opacity-80 flex items-center gap-1">
                {lookupMode ? (
                  "New Entry"
                ) : (
                  <>
                    <Edit3 size={12} /> Edit Existing
                  </>
                )}
              </button>
            </div>

            <p className="text-[var(--text-muted)] text-sm mb-8 font-medium">
              {lookupMode
                ? "Enter your registered mobile number to update your details."
                : "Join the tournament. Fill in your details."}
            </p>

            <div className="space-y-4">
              {!lookupMode && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative mt-1">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      size={18}
                    />
                    <input
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      placeholder="Enter your name"
                      className="w-full bg-[var(--surface-2)] border-0 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--foreground)] placeholder-[var(--text-muted)] transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                  Mobile Number
                </label>
                <div className="relative mt-1">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    size={18}
                  />
                  <input
                    value={formData.mobile_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mobile_number: e.target.value,
                      })
                    }
                    placeholder="WhatsApp Number"
                    className="w-full bg-[var(--surface-2)] border-0 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--foreground)] placeholder-[var(--text-muted)] transition-all"
                  />
                </div>
              </div>

              {lookupMode ? (
                <button
                  onClick={handleLookup}
                  disabled={loading || !formData.mobile_number}
                  className="w-full bg-[var(--foreground)] text-[var(--background)] font-bold py-5 rounded-2xl mt-6 flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50 active:scale-95">
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Search size={18} /> Find Profile
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.full_name || !formData.mobile_number}
                  className="w-full bg-[var(--accent)] text-[var(--background)] font-bold py-5 rounded-2xl mt-6 flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  Next Step <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--foreground)] mb-6">
              {isEditing ? "Update Profile" : "Pro Profile"}
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {isEditing && (
                <div className="bg-[var(--accent)]/10 text-[var(--accent)] p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Editing profile for{" "}
                  {formData.full_name}
                </div>
              )}

              <CldUploadWidget
                uploadPreset={String(
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                )}
                options={{
                  cropping: true,
                  showSkipCropButton: false,
                  showCompletedButton: true,
                  multiple: false,
                  publicId: `player_${formData.mobile_number}`,
                  tags: [tournamentId, "player_registration"],
                }}
                onSuccess={(result: any) => {
                  let url = result.info.secure_url;
                  if (
                    result.info.coordinates &&
                    result.info.coordinates.custom
                  ) {
                    url = url.replace("/upload/", "/upload/c_crop,g_custom/");
                  }
                  setFormData({
                    ...formData,
                    photo_url: url,
                  });
                }}>
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="w-full h-32 border-2 border-dashed border-[var(--border-1)] rounded-3xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--accent)] transition-all overflow-hidden shrink-0">
                    {formData.photo_url ? (
                      <img
                        src={formData.photo_url}
                        className="w-full h-full object-cover"
                        alt="Profile"
                      />
                    ) : (
                      <>
                        <Camera size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Upload Profile Photo
                        </span>
                      </>
                    )}
                  </button>
                )}
              </CldUploadWidget>

              <div className="pt-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-2 block">
                  Entry Fee Payment Proof
                </label>
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  options={{
                    cropping: true,
                    showSkipCropButton: false,
                    showCompletedButton: true,
                    multiple: false,
                    publicId: `payment_${tournamentId}_${formData.mobile_number}`,
                    tags: [tournamentId, "payment_proof"],
                  }}
                  onSuccess={(result: any) => {
                    let url = result.info.secure_url;
                    if (
                      result.info.coordinates &&
                      result.info.coordinates.custom
                    ) {
                      url = url.replace("/upload/", "/upload/c_crop,g_custom/");
                    }
                    setFormData({
                      ...formData,
                      payment_url: url,
                    });
                  }}>
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="w-full h-20 border-2 border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/5 rounded-2xl flex items-center justify-center gap-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all overflow-hidden">
                      {formData.payment_url ? (
                        <span className="font-bold text-sm">
                          ✅ Payment Uploaded
                        </span>
                      ) : (
                        <>
                          <Camera size={18} />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            Upload Screenshot
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </CldUploadWidget>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    Batting Hand
                  </label>
                  <select
                    value={formData.batting_hand}
                    onChange={(e) =>
                      setFormData({ ...formData, batting_hand: e.target.value })
                    }
                    className="w-full mt-1 bg-[var(--surface-2)] border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--foreground)] appearance-none">
                    <option className="bg-[var(--surface-1)]">
                      Right Hand
                    </option>
                    <option className="bg-[var(--surface-1)]">Left Hand</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    Bowling Hand
                  </label>
                  <select
                    value={formData.bowling_hand}
                    onChange={(e) =>
                      setFormData({ ...formData, bowling_hand: e.target.value })
                    }
                    className="w-full mt-1 bg-[var(--surface-2)] border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--foreground)] appearance-none">
                    <option className="bg-[var(--surface-1)]">Right Arm</option>
                    <option className="bg-[var(--surface-1)]">Left Arm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    Player Role
                  </label>
                  <select
                    value={formData.player_role}
                    onChange={(e) =>
                      setFormData({ ...formData, player_role: e.target.value })
                    }
                    className="w-full mt-1 bg-[var(--surface-2)] border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--foreground)] appearance-none">
                    <option className="bg-[var(--surface-1)]">Batsman</option>
                    <option className="bg-[var(--surface-1)]">Bowler</option>
                    <option className="bg-[var(--surface-1)]">
                      All-Rounder
                    </option>
                    <option className="bg-[var(--surface-1)]">
                      Wicket-Keeper
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    Jersey Size
                  </label>
                  <select
                    value={formData.tshirt_size}
                    onChange={(e) =>
                      setFormData({ ...formData, tshirt_size: e.target.value })
                    }
                    className="w-full mt-1 bg-[var(--surface-2)] border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--foreground)] appearance-none">
                    <option className="bg-[var(--surface-1)]">S</option>
                    <option className="bg-[var(--surface-1)]">M</option>
                    <option className="bg(--surface-1)">L</option>
                    <option className="bg(--surface-1)">XL</option>
                    <option className="bg(--surface-1)">XXL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                  Bowling Style
                </label>
                <select
                  value={formData.bowling_style}
                  onChange={(e) =>
                    setFormData({ ...formData, bowling_style: e.target.value })
                  }
                  className="w-full mt-1 bg-[var(--surface-2)] border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--foreground)] appearance-none">
                  <option className="bg-[var(--surface-1)]">Fast</option>
                  <option className="bg-[var(--surface-1)]">Medium Fast</option>
                  <option className="bg-[var(--surface-1)]">Off Spin</option>
                  <option className="bg-[var(--surface-1)]">Leg Spin</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4 shrink-0">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-[var(--surface-2)] text-[var(--text-muted)] font-bold py-4 rounded-2xl transition-all hover:bg-[var(--border-1)]">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-[var(--foreground)] text-[var(--background)] font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50">
                  {loading ? (
                    <Loader2 className="animate-spin mx-auto" size={18} />
                  ) : isEditing ? (
                    "Save Changes"
                  ) : (
                    "Register"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-10 animate-in zoom-in-95">
            <CheckCircle2
              size={80}
              className="text-[var(--accent)] mx-auto mb-6"
            />
            <h2 className="text-3xl font-black text-[var(--foreground)] uppercase tracking-tighter">
              {isEditing ? "Profile Updated!" : "You're In!"}
            </h2>
            <p className="text-[var(--text-muted)] mt-2 font-medium">
              {isEditing
                ? "Your details have been successfully saved."
                : "Registration successful. The organizers will review your profile shortly."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 text-[var(--accent)] font-bold text-sm uppercase tracking-widest hover:underline transition-all">
              Back to Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
