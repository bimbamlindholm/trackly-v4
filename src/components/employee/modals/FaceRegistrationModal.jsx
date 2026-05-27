/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Camera, X, RefreshCw } from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";
import { Modal } from "../employeeComponents";
import { compressCapturedFace } from "../../../utils/faceMatcher";

export default function FaceRegistrationModal({ onRegister, onClose }) {
  const { addToast } = useToast();
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const [flash, setFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize Camera Stream
  const initCamera = () => {
    setCameraError(false);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        setStream(s);
        streamRef.current = s;
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        setCameraError(true);
      });
  };

  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Safe video stream binding after render
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCapture = async () => {
    if (!videoRef.current || !stream) {
      addToast("Active camera stream is required.", "warning");
      return;
    }

    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    setSaving(true);
    try {
      // Compress frame using our visual face matcher helper
      const base64Photo = await compressCapturedFace(videoRef.current);
      if (!base64Photo) {
        throw new Error("Unable to capture clear image data from video.");
      }

      // Stop camera tracks immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStream(null);

      // Call parent action
      await onRegister(base64Photo);
      setSuccess(true);
      addToast("Profile face registered successfully!", "success");
      setTimeout(() => onClose(), 2200);
    } catch (e) {
      console.error(e);
      setSaving(false);
      addToast("Failed to register face: " + e.message, "error");
      initCamera(); // Restart camera
    }
  };

  return (
    <Modal title="AI Face Profile Registration" onClose={onClose}>
      <div className="text-slate-200">
        {!success ? (
          <div className="grid gap-5">
            <div className="text-center">
              <h3 className="text-sm font-black text-cyan-200 uppercase tracking-widest">
                I-rehistro ang Iyong Larawan
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Titiyakin ng system na ang iyong mukha ay tumutugma kapag nag-ti-Time In/Out upang maiwasan ang buddy punching.
              </p>
            </div>

            {/* Circular HUD Scanner Area */}
            <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-full border-2 border-dashed border-cyan-400/40 bg-slate-950/80 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover rounded-full"
                />
              ) : cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <X size={32} className="text-red-400" />
                  <p className="mt-2 text-xs font-black text-slate-300">Camera Access Denied</p>
                  <p className="mt-1 text-[10px] text-slate-500 leading-normal">
                    Paki-enable ang camera permissions sa iyong browser at subukan muli.
                  </p>
                  <button
                    onClick={initCamera}
                    type="button"
                    className="mt-3 flex items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black text-cyan-200 transition hover:bg-cyan-300/20"
                  >
                    <RefreshCw size={10} /> Retry Camera
                  </button>
                </div>
              ) : saving ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07111F]/90 p-6 text-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
                  <p className="mt-4 text-xs font-black text-cyan-300 animate-pulse uppercase tracking-wider">
                    Saving face pattern...
                  </p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                  <p className="mt-2 text-xs text-slate-500">Starting video feed...</p>
                </div>
              )}

              {/* Futuristic scan grid overlay */}
              {stream && !saving && (
                <>
                  {/* Neon laser line */}
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-cyan-300 biometric-laser shadow-[0_0_12px_rgba(6,182,212,1)] rounded-full" />
                  
                  {/* Targeting corner overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-52 w-52 rounded-full border border-dashed border-cyan-300/25 animate-spin" />
                  </div>
                  
                  {/* Face placement HUD mask */}
                  <div className="absolute inset-0 rounded-full border border-cyan-300/30 pointer-events-none shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]" />
                </>
              )}
              {flash && <div className="absolute inset-0 z-20 bg-white" />}
            </div>

            <div className="text-center bg-white/[0.02] border border-white/5 rounded-xl p-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">💡 Gabay sa Pag-Capture:</span>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Iwasan ang madilim na lugar. Tanggalin ang sumbrero o salamin upang makuha ang pinakatamang face template.
              </p>
            </div>

            {stream && !saving && (
              <button
                type="button"
                className="glow-button flex items-center justify-center gap-2 h-12 w-full rounded-xl text-sm font-black text-white cursor-pointer active:scale-95 transition"
                onClick={handleCapture}
              >
                <Camera size={16} /> Capture Reference Selfie
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-bounce">
            <CheckCircle2 size={56} className="text-emerald-400" />
            <h3 className="mt-4 text-xl font-black text-white">Mukha ay Narehistro Na!</h3>
            <p className="mt-2 text-sm text-slate-400">Handa na ang iyong profile para sa secure face-match check-ins.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
