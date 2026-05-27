import { X } from "lucide-react";

/**
 * Standard reusable container wrapper for Admin Portal modals.
 * Features a glassmorphism theme, scrolling limits, and a header bar with X close controls.
 */
export default function AdminBaseModal({ children, onClose, title, maxWidth = "max-w-6xl" }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-3 backdrop-blur-sm sm:p-4">
      <div className={`glass-panel max-h-[calc(100dvh-1.5rem)] w-full ${maxWidth} overflow-y-auto rounded-2xl p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6 bg-slate-950/95 border border-white/10`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">{title}</h2>
          <button 
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400 hover:text-white transition cursor-pointer" 
            onClick={onClose} 
            type="button" 
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
