"use client";
import React, { useState, useEffect, useRef } from "react";
import { CldUploadWidget } from "next-cloudinary";
import {
  Download,
  Share2,
  Trophy,
  Star,
  Camera,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AssetProps {
  type: "MATCH" | "PLAYER" | "TEAM" | "AWARD";
  title: string;
  description: string;
  shareText: string;
  fileName: string;
  data: any;
}

export default function DigitalAssetHub({
  type,
  title,
  description,
  shareText,
  fileName,
  data,
}: AssetProps) {
  const [downloading, setDownloading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Custom Award States
  const [awardTitle, setAwardTitle] = useState("PLAYER OF THE TOURNAMENT");
  const [achievementText, setAchievementText] = useState(
    "240 RUNS & 8 WICKETS",
  );

  // 🔥 Local state to manage the active image (allows on-the-fly updates)
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync local image state when a new item is selected from the sidebar
  useEffect(() => {
    if (type === "PLAYER" || type === "AWARD") {
      setCurrentImage(data.playerImage || null);
    } else if (type === "TEAM") {
      setCurrentImage(data.teamLogo || null);
    }
  }, [data, type]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Montserrat:wght@800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    document.fonts.ready.then(() => {
      generateCanvasImage();
    });

    return () => {
      document.head.removeChild(link);
    };
  }, [data, type, awardTitle, achievementText, currentImage]);

  const generateCanvasImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    // BACKGROUND GRADIENT
    const bgGrad = ctx.createRadialGradient(960, 540, 100, 960, 540, 1200);
    bgGrad.addColorStop(0, "#1e1b4b");
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 1920; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - 400, 1080);
      ctx.stroke();
    }

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    const drawAngledRibbon = (
      x: number,
      y: number,
      width: number,
      height: number,
      color: string,
    ) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - 40, y + height);
      ctx.lineTo(x - 40, y + height);
      ctx.closePath();
      ctx.fill();
    };

    const setNeonGlow = (color: string, blur: number) => {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
    };
    const clearShadow = () => {
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    };

    try {
      if (type === "MATCH") {
        const teamA = (data.teamAName || "TEAM A").toUpperCase();
        const teamB = (data.teamBName || "TEAM B").toUpperCase();

        drawAngledRibbon(160, 680, 600, 120, "#0f172a");
        drawAngledRibbon(1160, 680, 600, 120, "#0f172a");

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.font = "80px 'Oswald', sans-serif";
        ctx.fillText(teamA, 460, 740);
        ctx.fillText(teamB, 1460, 740);

        setNeonGlow("rgba(6, 182, 212, 0.4)", 50);
        if (data.teamALogo) {
          const img = await loadImage(data.teamALogo);
          ctx.drawImage(img, 260, 200, 400, 400);
        }
        setNeonGlow("rgba(244, 63, 94, 0.4)", 50);
        if (data.teamBLogo) {
          const img = await loadImage(data.teamBLogo);
          ctx.drawImage(img, 1260, 200, 400, 400);
        }
        clearShadow();

        ctx.fillStyle = "#020617";
        ctx.beginPath();
        ctx.arc(960, 400, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.fillStyle = "#fbbf24";
        ctx.font = "100px 'Montserrat', sans-serif";
        ctx.fillText("VS", 960, 410);

        if (data.status === "completed" || data.status === "abandoned") {
          drawAngledRibbon(660, 850, 600, 100, "#10b981");
          ctx.fillStyle = "#ffffff";
          ctx.font = "60px 'Oswald', sans-serif";
          ctx.fillText(
            (data.resultText || "MATCH CONCLUDED").toUpperCase(),
            960,
            905,
          );
        } else {
          const dateObj = new Date(data.matchDate);
          const dateStr = isNaN(dateObj.getTime())
            ? "TBD"
            : dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
          const details =
            `${dateStr}  ///  ${data.venue || "TBD"}`.toUpperCase();

          drawAngledRibbon(560, 850, 800, 80, "#334155");
          ctx.fillStyle = "#fbbf24";
          ctx.font = "40px 'Montserrat', sans-serif";
          ctx.fillText(details, 960, 895);
        }
      } else if (type === "PLAYER" || type === "AWARD") {
        const pName = (data.playerName || "UNKNOWN PLAYER").toUpperCase();
        const pRole = (data.role || "PLAYER").toUpperCase();
        const tName = (data.teamName || "INDEPENDENT").toUpperCase();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (type === "AWARD") {
          setNeonGlow("rgba(251, 191, 36, 0.6)", 40);
          ctx.fillStyle = "#fbbf24";
          ctx.font = "120px 'Oswald', sans-serif";
          ctx.fillText(awardTitle.toUpperCase(), 960, 130);
          clearShadow();
        }

        drawAngledRibbon(
          560,
          type === "AWARD" ? 720 : 640,
          800,
          140,
          "#0f172a",
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "110px 'Oswald', sans-serif";
        ctx.fillText(pName, 960, type === "AWARD" ? 795 : 720);

        if (type === "PLAYER") {
          drawAngledRibbon(760, 800, 400, 80, "#fbbf24");
          ctx.fillStyle = "#000000";
          ctx.font = "50px 'Montserrat', sans-serif";
          ctx.fillText(pRole, 960, 845);
        }

        ctx.fillStyle = "#94a3b8";
        ctx.font = "40px 'Montserrat', sans-serif";
        ctx.fillText(tName, 960, type === "AWARD" ? 890 : 920);

        if (type === "AWARD" && achievementText) {
          drawAngledRibbon(460, 950, 1000, 80, "#38bdf8");
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 45px 'Montserrat', sans-serif";
          ctx.fillText(achievementText.toUpperCase(), 960, 995);
        }

        // 🔥 Uses currentImage instead of data.playerImage
        if (currentImage) {
          const avatarY = type === "AWARD" ? 440 : 380;
          setNeonGlow("rgba(56, 189, 248, 0.5)", 60);
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(960, avatarY, 260, 0, Math.PI * 2, true);
          ctx.fill();
          clearShadow();

          const img = await loadImage(currentImage);
          ctx.save();
          ctx.beginPath();
          ctx.arc(960, avatarY, 250, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 710, avatarY - 250, 500, 500);
          ctx.restore();

          ctx.strokeStyle = type === "AWARD" ? "#fbbf24" : "#38bdf8";
          ctx.lineWidth = 10;
          ctx.stroke();
        }
      } else if (type === "TEAM") {
        const tName = (data.teamName || "UNKNOWN TEAM").toUpperCase();
        const tShort = (data.shortName || "TBD").toUpperCase();

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 120px Arial";
        ctx.fillText(tName, 960, 740);

        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 60px Arial";
        ctx.fillText(tShort, 960, 860);

        if (currentImage) {
          const img = await loadImage(currentImage);
          ctx.drawImage(img, 710, 140, 500, 500);
        }
      }

      setImageUrl(canvas.toDataURL("image/jpeg", 0.95));
    } catch (err) {
      console.error("Canvas rendering error:", err);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    setDownloading(true);
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${fileName.replace(/\s+/g, "_").toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloading(false);
  };

  // Optional: Saves the newly uploaded image permanently to the database
  const saveImagePermanently = async (newUrl: string) => {
    if (!data.id) return;
    setIsUpdatingDb(true);
    try {
      const table = type === "PLAYER" || type === "AWARD" ? "players" : "teams";
      const field =
        type === "PLAYER" || type === "AWARD" ? "profile_url" : "logo_url";

      await supabase
        .from(table)
        .update({ [field]: newUrl })
        .eq("id", data.id);
    } catch (err) {
      console.error("Database update failed:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  return (
    <div className="bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-3xl p-8 max-w-4xl mx-auto shadow-sm">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="flex flex-col md:flex-row items-start gap-8">
        <div className="w-full md:w-3/5 aspect-[16/9] bg-[#020617] rounded-2xl border border-[var(--border)] overflow-hidden relative shadow-2xl group flex items-center justify-center shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Asset Preview"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          ) : (
            <div className="text-[var(--primary)] font-bold uppercase tracking-widest text-xs animate-pulse">
              Rendering Premium Asset...
            </div>
          )}
        </div>

        <div className="w-full md:w-2/5 flex flex-col space-y-6">
          <div>
            <span className="text-[var(--primary)] text-[10px] font-black uppercase tracking-[0.3em] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">
              Media Core Engine V2
            </span>
            <h2 className="text-[var(--foreground)] font-black text-2xl uppercase tracking-tight mt-3">
              {title}
            </h2>
            <p className="text-[var(--muted-foreground)] text-xs mt-2 leading-relaxed">
              {description}
            </p>
          </div>

          {/* DYNAMIC IMAGE UPLOADER HOOK */}
          {(type === "PLAYER" || type === "AWARD" || type === "TEAM") && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest flex items-center gap-1">
                <Camera size={12} /> Poster Profile Image
              </label>

              <CldUploadWidget
                uploadPreset={String(
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                )}
                options={{
                  multiple: false,
                  cropping: true,
                  croppingAspectRatio: 1,
                }}
                onSuccess={(result: any) => {
                  const uploadedUrl = result.info.secure_url;
                  setCurrentImage(uploadedUrl); // Instantly updates banner preview
                  saveImagePermanently(uploadedUrl); // Syncs back to Supabase
                }}
              >
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-colors shadow-sm"
                  >
                    {isUpdatingDb ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                    {currentImage ? "Change / Replace Photo" : "Upload Photo"}
                  </button>
                )}
              </CldUploadWidget>
            </div>
          )}

          {/* DYNAMIC INPUTS FOR AWARDS */}
          {type === "AWARD" && (
            <div className="space-y-4 bg-[var(--muted)] p-4 rounded-xl border border-[var(--border)]">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest flex items-center gap-1">
                  <Trophy size={12} /> Custom Award Title
                </label>
                <input
                  type="text"
                  value={awardTitle}
                  onChange={(e) => setAwardTitle(e.target.value)}
                  placeholder="e.g. BEST FIELDER"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-bold uppercase outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest flex items-center gap-1">
                  <Star size={12} /> Achievement / Stats
                </label>
                <input
                  type="text"
                  value={achievementText}
                  onChange={(e) => setAchievementText(e.target.value)}
                  placeholder="e.g. 10 CATCHES & 2 RUN OUTS"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-bold uppercase outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownload}
              disabled={!imageUrl || downloading}
              className="w-full bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-[var(--primary-foreground)] font-black uppercase text-xs tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-md"
            >
              {downloading ? (
                "Packing High-Res..."
              ) : (
                <>
                  <Download size={16} /> Download 1920x1080
                </>
              )}
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
                  "_blank",
                )
              }
              className="w-full bg-[#128c7e] hover:bg-[#075e54] text-white font-black uppercase text-xs tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-md"
            >
              <Share2 size={16} /> Share to WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
