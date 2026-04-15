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

  // The Clean Supabase Lookup
  const handleLookup = async () => {
    if (!formData.mobile_number) return;
    setLoading(true);
    const cleanMobile = formData.mobile_number.trim().replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    // Update formData with the clean number before querying
    const sanitizedNumber = cleanMobile.slice(-10); // Grabs last 10 digits

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
      return;
    }
    // Update formData with the clean number before querying
    const sanitizedNumber = cleanMobile.slice(-10); // Grabs last 10 digits

    if (!isEditing) {
      // Prevent Duplicate Check
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                {lookupMode ? "Edit Profile" : "Player Entry"}
              </h1>
              <button
                onClick={() => {
                  setLookupMode(!lookupMode);
                  setIsEditing(false);
                  setFormData({ ...formData, id: "", full_name: "" });
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-teal-600 hover:text-teal-500 bg-teal-50 dark:bg-teal-950/30 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                {lookupMode ? (
                  "New Entry"
                ) : (
                  <>
                    <Edit3 size={12} /> Edit Existing
                  </>
                )}
              </button>
            </div>

            <p className="text-slate-500 text-sm mb-8 font-medium">
              {lookupMode
                ? "Enter your registered mobile number to update your details."
                : "Join the tournament. Fill in your details."}
            </p>

            <div className="space-y-4">
              {!lookupMode && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative mt-1">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      placeholder="Enter your name"
                      className="w-full bg-slate-100 dark:bg-black border-0 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Mobile Number
                </label>
                <div className="relative mt-1">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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
                    className="w-full bg-slate-100 dark:bg-black border-0 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {lookupMode ? (
                <button
                  onClick={handleLookup}
                  disabled={loading || !formData.mobile_number}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-5 rounded-2xl mt-6 flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50">
                  {loading ? (
                    "Searching..."
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
                  className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold py-5 rounded-2xl mt-6 flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20">
                  Next Step <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">
              {isEditing ? "Update Profile" : "Pro Profile"}
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {isEditing && (
                <div className="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
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
                  croppingAspectRatio: 1,
                  showCompletedButton: true,
                  multiple: false,
                  publicId: `player_${formData.mobile_number}`,
                  tags: [tournamentId, "player_registration"],
                }}
                onSuccess={(result: any) =>
                  setFormData({
                    ...formData,
                    photo_url: result.info.secure_url,
                  })
                }>
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-teal-500 transition-colors overflow-hidden shrink-0">
                    {formData.photo_url ? (
                      <img
                        src={formData.photo_url}
                        className="w-full h-full object-cover"
                        alt="Profile"
                      />
                    ) : (
                      <>
                        <Camera size={24} />{" "}
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Upload Profile Photo
                        </span>
                      </>
                    )}
                  </button>
                )}
              </CldUploadWidget>
              <div className="pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Entry Fee Payment Proof
                </label>
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  options={{
                    multiple: false,
                    publicId: `payment_${tournamentId}_${formData.mobile_number}`,
                    tags: [tournamentId, "payment_proof"],
                  }}
                  onSuccess={(result: any) =>
                    setFormData({
                      ...formData,
                      payment_url: result.info.secure_url,
                    })
                  }>
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="w-full h-20 border-2 border-dashed border-teal-500/30 bg-teal-500/5 rounded-2xl flex items-center justify-center gap-2 text-teal-600 hover:bg-teal-500/10 transition-colors overflow-hidden">
                      {formData.payment_url ? (
                        <span className="font-bold text-sm">
                          ✅ Payment Uploaded (Click to change)
                        </span>
                      ) : (
                        <>
                          <Camera size={18} />{" "}
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Batting Hand
                  </label>
                  <select
                    value={formData.batting_hand}
                    onChange={(e) =>
                      setFormData({ ...formData, batting_hand: e.target.value })
                    }
                    className="w-full mt-1 bg-slate-100 dark:bg-black border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                    <option>Right Hand</option>
                    <option>Left Hand</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Bowling Hand
                  </label>
                  <select
                    value={formData.bowling_hand}
                    onChange={(e) =>
                      setFormData({ ...formData, bowling_hand: e.target.value })
                    }
                    className="w-full mt-1 bg-slate-100 dark:bg-black border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                    <option>Right Arm</option>
                    <option>Left Arm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Player Role
                  </label>
                  <select
                    value={formData.player_role}
                    onChange={(e) =>
                      setFormData({ ...formData, player_role: e.target.value })
                    }
                    className="w-full mt-1 bg-slate-100 dark:bg-black border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                    <option>Batsman</option>
                    <option>Bowler</option>
                    <option>All-Rounder</option>
                    <option>Wicket-Keeper</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Jersey Size
                  </label>
                  <select
                    value={formData.tshirt_size}
                    onChange={(e) =>
                      setFormData({ ...formData, tshirt_size: e.target.value })
                    }
                    className="w-full mt-1 bg-slate-100 dark:bg-black border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                    <option>S</option>
                    <option>M</option>
                    <option>L</option>
                    <option>XL</option>
                    <option>XXL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Bowling Style
                </label>
                <select
                  value={formData.bowling_style}
                  onChange={(e) =>
                    setFormData({ ...formData, bowling_style: e.target.value })
                  }
                  className="w-full mt-1 bg-slate-100 dark:bg-black border-0 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                  <option>Fast</option>
                  <option>Medium Fast</option>
                  <option>Off Spin</option>
                  <option>Leg Spin</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4 shrink-0">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold py-4 rounded-2xl">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95">
                  {loading
                    ? "Saving..."
                    : isEditing
                      ? "Save Changes"
                      : "Register"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-10 animate-in zoom-in-95">
            <CheckCircle2 size={80} className="text-teal-500 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {isEditing ? "Profile Updated!" : "You're In!"}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              {isEditing
                ? "Your details have been successfully saved."
                : "Registration successful. The organizers will review your profile shortly."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 text-teal-500 font-bold text-sm uppercase tracking-widest hover:underline">
              Back to Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
