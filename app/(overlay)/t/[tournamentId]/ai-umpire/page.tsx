"use client";

import React, { useEffect, useRef, useState, useCallback, use } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import FeatureGate from "@/app/components/FeatureGate";
import Link from "next/link";

// --- TYPES ---
type MatchState = "IDLE" | "LIVE";
type CalibrationKey =
  | "bowlerCrease"
  | "batterCrease"
  | "pitchNoBall"
  | "leftPitch"
  | "rightPitch"
  | "leftWide"
  | "rightWide"
  | "stumpsLine"
  | "waistY";

type CalibrationData = Record<CalibrationKey, number | null>;

const DEFAULT_CALIBRATION: CalibrationData = {
  bowlerCrease: null,
  batterCrease: null,
  pitchNoBall: null,
  leftPitch: null,
  rightPitch: null,
  leftWide: null,
  rightWide: null,
  stumpsLine: null,
  waistY: null,
};

// --- CORE LOGIC COMPONENT ---
function AIUmpireControlPanelContent({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const [matchState, setMatchState] = useState<MatchState>("IDLE");
  const [camStatus, setCamStatus] = useState<"LOADING" | "ACTIVE" | "ERROR">(
    "LOADING",
  );
  const [calibration, setCalibration] =
    useState<CalibrationData>(DEFAULT_CALIBRATION);
  const [activeCalibTool, setActiveCalibTool] = useState<CalibrationKey | null>(
    null,
  );

  const [pendingCheck, setPendingCheck] = useState<string | null>(null);

  // NEW STATES FOR AUTO-DETECT & CONFIRMATION
  const [autoDetect, setAutoDetect] = useState<boolean>(false);
  const [unconfirmedAlert, setUnconfirmedAlert] = useState<string | null>(null);

  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const latestPoseRef = useRef<poseDetection.Pose | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  // Initialize offline storage & Broadcast Channel
  useEffect(() => {
    const savedState = localStorage.getItem(
      "cricsync_match_state",
    ) as MatchState;
    if (savedState) setMatchState(savedState);

    const savedCalib = localStorage.getItem("cricsync_calibration");
    if (savedCalib) setCalibration(JSON.parse(savedCalib));

    channelRef.current = new BroadcastChannel("cricsync-ai-channel");

    return () => {
      channelRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const getCameras = async () => {
      try {
        // Prompt for permission first, otherwise devices are hidden/unnamed
        await navigator.mediaDevices.getUserMedia({ video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
          (device) => device.kind === "videoinput",
        );

        setVideoDevices(cameras);

        // Select the first camera by default, or prefer OBS Virtual Camera if found
        const obsCam = cameras.find((c) =>
          c.label.toLowerCase().includes("obs"),
        );
        if (obsCam) {
          setSelectedDeviceId(obsCam.deviceId);
        } else if (cameras.length > 0) {
          setSelectedDeviceId(cameras[0].deviceId);
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };
    getCameras();
  }, []);

  // 2. UPDATED EFFECT: Start Camera (re-runs when selectedDeviceId changes)
  useEffect(() => {
    if (!selectedDeviceId) return; // Wait until we have a device selected

    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      setCamStatus("LOADING");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDeviceId },
            width: 1280,
            height: 720,
            frameRate: { ideal: 30 },
          },
        });

        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCamStatus("ACTIVE");
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCamStatus("ERROR");
      }
    };

    startCamera();

    // Cleanup: Stop the previous camera stream when switching cameras
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId]);

  // Initialize TensorFlow & MoveNet
  useEffect(() => {
    const initTF = async () => {
      await tf.ready();

      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        // modelUrl: '/model/model.json' // <-- UNCOMMENT FOR FULL OFFLINE SUPPORT
      };

      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig,
      );
    };
    initTF();
  }, []);

  // Render Loop & AI Inference Loop
  useEffect(() => {
    let animationId: number;
    let inferenceInterval: NodeJS.Timeout;

    const renderCanvas = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";

          Object.entries(calibration).forEach(([key, val]) => {
            if (val === null) return;
            ctx.beginPath();
            if (
              [
                "leftPitch",
                "rightPitch",
                "leftWide",
                "rightWide",
                "stumpsLine",
              ].includes(key)
            ) {
              ctx.moveTo(val, 0);
              ctx.lineTo(val, canvas.height);
            } else {
              ctx.moveTo(0, val);
              ctx.lineTo(canvas.width, val);
            }
            ctx.stroke();
            ctx.fillStyle = "white";
            ctx.fillText(
              key,
              [
                "leftPitch",
                "rightPitch",
                "leftWide",
                "rightWide",
                "stumpsLine",
              ].includes(key)
                ? val + 5
                : 5,
              val - 5,
            );
          });
        }
      }
      animationId = requestAnimationFrame(renderCanvas);
    };

    const runInference = async () => {
      const video = videoRef.current;

      // If idle, unconfirmed alert is waiting, or video not ready -> skip inference
      if (
        matchState !== "LIVE" ||
        unconfirmedAlert !== null ||
        !detectorRef.current ||
        !video ||
        video.readyState < 2 ||
        video.videoWidth === 0
      )
        return;

      try {
        const poses = await detectorRef.current.estimatePoses(video);
        if (poses.length > 0) {
          const pose = poses[0];
          latestPoseRef.current = pose;

          // --- AUTO DETECT LOGIC ---
          if (autoDetect && !pendingCheck) {
            // 1. Auto-check Foot Fault
            if (calibration.bowlerCrease) {
              const ankles = pose.keypoints.filter(
                (k) => k.name === "left_ankle" || k.name === "right_ankle",
              );
              if (
                ankles.some(
                  (a) =>
                    (a.score ?? 0) > 0.6 && a.y > calibration.bowlerCrease!,
                )
              ) {
                setUnconfirmedAlert("FOOT FAULT");
                return; // Stop checking other things if we found an infraction
              }
            }
            // 2. Auto-check WK No Ball
            if (calibration.stumpsLine) {
              const wrists = pose.keypoints.filter(
                (k) => k.name === "left_wrist" || k.name === "right_wrist",
              );
              if (
                wrists.some(
                  (w) => (w.score ?? 0) > 0.6 && w.x < calibration.stumpsLine!,
                )
              ) {
                setUnconfirmedAlert("WK NO BALL");
                return;
              }
            }
          }
        }
      } catch (e) {
        console.error("Inference Error:", e);
      }
    };

    animationId = requestAnimationFrame(renderCanvas);
    inferenceInterval = setInterval(runInference, 100);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(inferenceInterval);
    };
  }, [calibration, matchState, autoDetect, unconfirmedAlert, pendingCheck]);

  // Alert Dispatcher with 3-second cooldown
  const triggerAlert = useCallback((type: string) => {
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 3000) return;

    lastAlertTimeRef.current = now;
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "ALERT", payload: type });
    }
    setPendingCheck(null);
    setUnconfirmedAlert(null); // Clear confirmation if it was used
  }, []);

  // Keyboard Shortcuts & Confirmation Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchState !== "LIVE") return;
      const key = e.key.toUpperCase();

      // --- Handle Confirmation Dialog ---
      if (unconfirmedAlert) {
        if (key === "ENTER") {
          e.preventDefault();
          triggerAlert(unconfirmedAlert);
        } else if (key === "ESCAPE") {
          e.preventDefault();
          setUnconfirmedAlert(null);
          // Small cooldown to prevent immediate re-triggering of the same false positive
          lastAlertTimeRef.current = Date.now();
        }
        return; // Block other hotkeys while confirmation is open
      }

      // --- Manual Hotkeys ---
      const pose = latestPoseRef.current;
      switch (key) {
        case " ":
          e.preventDefault();
          if (!pose || !calibration.bowlerCrease) return;
          const ankles = pose.keypoints.filter(
            (k) => k.name === "left_ankle" || k.name === "right_ankle",
          );
          if (
            ankles.some(
              (a) => (a.score ?? 0) > 0.4 && a.y > calibration.bowlerCrease!,
            )
          ) {
            triggerAlert("FOOT FAULT");
          }
          break;
        case "K":
          if (!pose || !calibration.stumpsLine) return;
          const wrists = pose.keypoints.filter(
            (k) => k.name === "left_wrist" || k.name === "right_wrist",
          );
          if (
            wrists.some(
              (w) => (w.score ?? 0) > 0.4 && w.x < calibration.stumpsLine!,
            )
          ) {
            triggerAlert("WK NO BALL");
          }
          break;
        case "P":
          setPendingCheck("PITCH_NO_BALL");
          break;
        case "O":
          setPendingCheck("PITCH_OUTSIDE");
          break;
        case "H":
          setPendingCheck("HEIGHT_NO_BALL");
          break;
        case "W":
          setPendingCheck("WIDE");
          break;
        case "ESCAPE":
          setPendingCheck(null);
          break; // Ability to cancel a pending click
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchState, calibration, triggerAlert, unconfirmedAlert]);

  // Handle Canvas Clicks
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || unconfirmedAlert) return; // Disable clicks if confirming

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (activeCalibTool) {
      const newCalib = {
        ...calibration,
        [activeCalibTool]: [
          "waistY",
          "bowlerCrease",
          "batterCrease",
          "pitchNoBall",
        ].includes(activeCalibTool)
          ? y
          : x,
      };
      setCalibration(newCalib);
      localStorage.setItem("cricsync_calibration", JSON.stringify(newCalib));
      setActiveCalibTool(null);
      return;
    }

    if (matchState === "LIVE" && pendingCheck) {
      switch (pendingCheck) {
        case "PITCH_NO_BALL":
          if (calibration.pitchNoBall && y < calibration.pitchNoBall)
            setUnconfirmedAlert("PITCH NO BALL");
          break;
        case "PITCH_OUTSIDE":
          if (
            calibration.leftPitch &&
            calibration.rightPitch &&
            (x < calibration.leftPitch || x > calibration.rightPitch)
          )
            setUnconfirmedAlert("PITCH OUTSIDE");
          break;
        case "HEIGHT_NO_BALL":
          if (calibration.waistY && y < calibration.waistY)
            setUnconfirmedAlert("HEIGHT NO BALL");
          break;
        case "WIDE":
          if (
            calibration.leftWide &&
            calibration.rightWide &&
            (x < calibration.leftWide || x > calibration.rightWide)
          )
            setUnconfirmedAlert("WIDE");
          break;
        case "R":
          e.preventDefault();
          setUnconfirmedAlert("RUN OUT");
          break;
        case "S":
          e.preventDefault();
          setUnconfirmedAlert("STUMPING");
          break;
      }
      setPendingCheck(null);
    }
  };

  const toggleMatchState = () => {
    const newState = matchState === "IDLE" ? "LIVE" : "IDLE";
    setMatchState(newState);
    localStorage.setItem("cricsync_match_state", newState);
    setPendingCheck(null);
    setUnconfirmedAlert(null);
  };

  // --- NEW: Reset Calibration Function ---
  const handleResetCalibration = () => {
    if (confirm("Are you sure you want to clear all calibration lines?")) {
      setCalibration(DEFAULT_CALIBRATION);
      localStorage.removeItem("cricsync_calibration");
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <header className="flex items-center bg-neutral-800 p-4 rounded-lg text-white gap-10">
        <Link
          href={`/t/${tournamentId}/teams`}
          className={`px-4 py-2 rounded-lg font-bold transition-colors border bg-neutral-700 border-neutral-600 text-neutral-300}`}
        >
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">AI Umpire</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-neutral-400">Status: {camStatus}</p>

            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-xs rounded px-2 py-1 text-neutral-300 outline-none focus:border-emerald-500 max-w-[200px]"
            >
              {videoDevices.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camera ${cam.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">AI Umpire</h1>
          <p className="text-sm text-neutral-400">Camera Status: {camStatus}</p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/t/${tournamentId}/ai-umpire/overlay`}
            target="_blank"
            className={`px-4 py-2 rounded-lg font-bold transition-colors border bg-neutral-700 border-neutral-600 text-neutral-300}`}
          >
            Overlay
          </Link>
          <button
            onClick={() => setAutoDetect(!autoDetect)}
            className={`px-4 py-2 rounded-lg font-bold transition-colors border ${autoDetect ? "bg-blue-600 border-blue-500 text-white" : "bg-neutral-700 border-neutral-600 text-neutral-300"}`}
          >
            {autoDetect ? "🤖 Auto-Detect ON" : "🤖 Auto-Detect OFF"}
          </button>
          <button
            onClick={toggleMatchState}
            className={`px-6 py-3 rounded-lg font-bold text-lg transition-colors ${matchState === "LIVE" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
          >
            {matchState === "LIVE" ? "🔴 LIVE ACTIVE" : "⚪ IDLE"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-6 flex-1 text-white">
        <div className="col-span-3 relative bg-black rounded-lg overflow-hidden flex items-center justify-center border border-neutral-700 ">
          {camStatus === "ERROR" && (
            <p className="text-red-500 absolute z-10">
              Camera Error. Please check USB connection.
            </p>
          )}

          {/* Instructions for Manual Clicks */}
          {pendingCheck && !unconfirmedAlert && (
            <div className="absolute top-4 left-4 z-10 bg-yellow-500 text-black px-4 py-2 rounded-md font-bold animate-pulse">
              Click on the ball pitch/spot to check:{" "}
              {pendingCheck.replace(/_/g, " ")} (Esc to cancel)
            </div>
          )}

          {/* NEW: Confirmation Overlay */}
          {unconfirmedAlert && (
            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
              <h2 className="text-5xl font-black text-red-500 mb-6 uppercase animate-bounce">
                ⚠️ {unconfirmedAlert} DETECTED
              </h2>
              <div className="flex gap-6 mt-4">
                <button
                  onClick={() => triggerAlert(unconfirmedAlert)}
                  className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  Confirm [ENTER]
                </button>
                <button
                  onClick={() => {
                    setUnconfirmedAlert(null);
                    lastAlertTimeRef.current = Date.now(); // trigger cooldown to avoid immediate repeat
                  }}
                  className="bg-neutral-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-neutral-500 transition-all"
                >
                  Dismiss [ESC]
                </button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none -z-10"
            autoPlay
            playsInline
            muted
          />

          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onClick={handleCanvasClick}
            className={`w-full h-auto max-h-[80vh] object-contain ${activeCalibTool ? "cursor-crosshair opacity-80" : "opacity-100"}`}
          />
        </div>

        <div className="col-span-1 bg-neutral-800 p-4 rounded-lg flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-end border-b border-neutral-700 pb-2">
            <h2 className="text-xl font-semibold">Calibration</h2>
            <button
              onClick={handleResetCalibration}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              Reset Lines
            </button>
          </div>
          <p className="text-xs text-neutral-400 mb-2">
            Click a button, then click on the video feed to draw the line.
          </p>

          {(Object.keys(DEFAULT_CALIBRATION) as CalibrationKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveCalibTool(key)}
              className={`p-2 text-sm text-left rounded border transition-colors ${
                activeCalibTool === key
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-neutral-600 bg-neutral-700 hover:bg-neutral-600"
              }`}
            >
              Set {key.replace(/([A-Z])/g, " $1").trim()}
              {calibration[key] !== null && " ✓"}
            </button>
          ))}

          <h2 className="text-xl font-semibold border-b border-neutral-700 pb-2 mt-4">
            Shortcuts (LIVE)
          </h2>
          <ul className="text-sm space-y-2 text-neutral-300">
            <li>
              <kbd className="bg-neutral-700 px-1 rounded">Space</kbd> : Manual
              Foot Fault
            </li>
            <li>
              <kbd className="bg-neutral-700 px-1 rounded">K</kbd> : Manual WK
              No Ball
            </li>
            <li>
              <kbd className="bg-neutral-700 px-1 rounded">P</kbd> + Click :
              Pitch No Ball
            </li>
            <li>
              <kbd className="bg-neutral-700 px-1 rounded">O</kbd> + Click :
              Pitch Outside
            </li>
            <li>
              <kbd className="bg-neutral-700 px-1 rounded">H</kbd> + Click :
              Height No Ball
            </li>
            <li>
              <kbd className="bg-neutral-700 px-1 rounded">W</kbd> + Click :
              Wide
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- PAGE COMPONENT WRAPPED IN FEATURE GATE ---
export default function AIUmpirePage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = React.use(params);

  return (
    <FeatureGate
      tournamentId={tournamentId}
      requiredTier="broadcast"
      featureKey="ai_umpire_enabled"
      featureName="AI Umpire"
    >
      <div className="h-[100vh] bg-neutral-900 p-6">
        <AIUmpireControlPanelContent tournamentId={tournamentId} />
      </div>
    </FeatureGate>
  );
}
