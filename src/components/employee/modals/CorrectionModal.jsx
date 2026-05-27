import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { checkIsDateLocked, createCorrectionRequest } from "../../../utils/supabaseCorrections";
import { todayKey } from "../../../utils/supabaseAttendance";
import { Modal } from "../employeeComponents";

export default function CorrectionModal({ employee, onClose, onSaved }) {
  const { workspace } = useAuth();
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: todayKey(),
    requestType: "Time In correction",
    requestedValue: "",
    reason: "",
  });

  const submit = async (event) => {
    event.preventDefault();
    if (!workspace?.id) {
      addToast("Workspace is not configured properly.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const locked = await checkIsDateLocked(form.date, workspace.id);
      if (locked) {
        addToast("Cannot submit correction: this date falls in a locked/released payroll period.", "error");
        setSubmitting(false);
        return;
      }

      await createCorrectionRequest({
        workspaceId: workspace.id,
        employeeId: employee.id,
        date: form.date,
        requestType: form.requestType,
        currentValue: "",
        requestedValue: form.requestedValue,
        reason: form.reason,
      });

      addToast("Correction request submitted successfully!", "success");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to submit correction request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Request Correction" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <input
          className="h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-cyan-300/50"
          type="date"
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />

        <select
          className="h-12 rounded-xl border border-white/10 bg-[#0B1424] px-4 text-sm text-white outline-none focus:border-cyan-300/50"
          value={form.requestType}
          onChange={(event) => setForm({ ...form, requestType: event.target.value })}
        >
          {["Time In correction", "Break In correction", "Break Out correction", "Time Out correction", "Status correction"].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>

        <input
          className="h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-cyan-300/50"
          placeholder="Requested value (e.g. 08:05 AM)"
          required
          value={form.requestedValue}
          onChange={(event) => setForm({ ...form, requestedValue: event.target.value })}
        />

        <textarea
          className="min-h-24 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none focus:border-cyan-300/50"
          placeholder="Reason for correction"
          required
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
        />

        <button
          className="glow-button h-12 rounded-xl text-sm font-black text-white disabled:opacity-50"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </Modal>
  );
}
