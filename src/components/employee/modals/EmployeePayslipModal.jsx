import { Download, X } from "lucide-react";
import { formatPeso } from "../employeeConstants";
import { generatePayslipPdf as generatePremiumPayslip } from "../../../utils/payslipPdfGenerator";

function RecordFact({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-black text-white">{value}</p>
    </div>
  );
}

export default function EmployeePayslipModal({ payslip, profile, onClose }) {
  if (!payslip || !payslip.payroll_batches || payslip.payroll_batches.status !== "released") {
    return null;
  }

  const startDate = payslip.payroll_batches.start_date;
  const endDate = payslip.payroll_batches.end_date;

  const rows = [
    ["Completed Days", payslip.completed_days],
    ["Attendance Rows", payslip.rows_count],
    ["Total Hours", payslip.total_hours],
    ["Overtime", payslip.overtime_hours],
    ["Late Minutes", `${payslip.late_minutes || 0}m`],
    ["Undertime", payslip.undertime_hours],
  ];

  const earnings = [
    ["Regular Pay", formatPeso(payslip.regular_pay)],
    ["Overtime Pay", formatPeso(payslip.overtime_pay)],
  ];

  if (payslip.holiday_pay && Number(payslip.holiday_pay) > 0) {
    earnings.push(["Holiday Premium", formatPeso(payslip.holiday_pay)]);
  }

  if (payslip.night_diff_pay && Number(payslip.night_diff_pay) > 0) {
    earnings.push(["Night Differential (10%)", formatPeso(payslip.night_diff_pay)]);
  }

  earnings.push(["Gross Pay", formatPeso(payslip.gross_pay)]);

  const grossPayValue = Number(payslip.gross_pay || 0);
  const customDeductions = payslip.custom_deductions || [];

  const sssDeduction = payslip.sss_deduction !== undefined && payslip.sss_deduction !== null ? Number(payslip.sss_deduction) : Math.min(1350, grossPayValue * 0.045);
  const philhealthDeduction = payslip.philhealth_deduction !== undefined && payslip.philhealth_deduction !== null ? Number(payslip.philhealth_deduction) : Math.min(1000, grossPayValue * 0.025);
  const pagibigDeduction = payslip.pagibig_deduction !== undefined && payslip.pagibig_deduction !== null ? Number(payslip.pagibig_deduction) : Math.min(200, grossPayValue * 0.02);

  const deductions = [
    ["Late Deduction", formatPeso(payslip.late_deduction)],
    ["Undertime Deduction", formatPeso(payslip.undertime_deduction)],
  ];

  if (customDeductions.length > 0) {
    customDeductions.forEach((ded) => {
      const typeLabel = ded.type === "percentage" ? ` (${ded.value}%)` : "";
      deductions.push([`${ded.name}${typeLabel}`, formatPeso(ded.amount)]);
    });
  } else {
    // Fallback to legacy hardcoded Philippine statutory deductions
    deductions.push(["SSS Share (4.5%)", formatPeso(sssDeduction)]);
    deductions.push(["PhilHealth Share (2.5%)", formatPeso(philhealthDeduction)]);
    deductions.push(["Pag-IBIG Share (2.0%)", formatPeso(pagibigDeduction)]);
  }

  deductions.push(["Total Deduction", formatPeso(payslip.total_deductions)]);

  const generatePayslipPdf = () => {
    const payrollResult = {
      employee: {
        fullName: profile?.fullName || "Employee",
        email: profile?.email || "-",
        role: profile?.role || "employee",
        dailyRate: profile?.dailyRate || 0,
        hourlyRate: profile?.hourlyRate || 0,
        id: profile?.id || "N/A",
      },
      totalHours: payslip.total_hours,
      overtimeHours: payslip.overtime_hours,
      regularPay: Number(payslip.regular_pay || 0),
      overtimePay: Number(payslip.overtime_pay || 0),
      holidayPay: Number(payslip.holiday_pay || 0),
      nightDiffPay: Number(payslip.night_diff_pay || 0),
      grossPay: grossPayValue,
      lateDeduction: Number(payslip.late_deduction || 0),
      undertimeDeduction: Number(payslip.undertime_deduction || 0),
      sssDeduction,
      philhealthDeduction,
      pagibigDeduction,
      calculatedCustomDeductions: customDeductions,
      totalDeduction: Number(payslip.total_deductions || 0),
      netPay: Number(payslip.net_pay || 0),
    };
    generatePremiumPayslip(payrollResult, {}, `${startDate} to ${endDate}`);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-3 backdrop-blur-sm sm:p-4">
      <div className="glass-panel max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6 text-slate-200">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">My Payslip Details</p>
            <h2 className="mt-2 text-2xl font-black text-white">Cutoff: {startDate} to {endDate}</h2>
            <p className="mt-1 text-sm text-slate-400">Status: Released</p>
          </div>
          <button
            aria-label="Close payslip breakdown"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <RecordFact key={label} label={label} value={value} />
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-200">Earnings</h3>
            <div className="mt-4 grid gap-3">
              {earnings.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-right font-black text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.05] p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-rose-200">Deductions</h3>
            <div className="mt-4 grid gap-3">
              {deductions.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-right font-black text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Net Pay</p>
          <p className="mt-2 text-3xl font-black text-white">{formatPeso(payslip.net_pay)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Net Pay = Gross Pay minus total deductions (SSS, PhilHealth, Pag-IBIG, Late, Undertime).
          </p>
          <button
            className="glow-button mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white"
            onClick={generatePayslipPdf}
            type="button"
          >
            <Download size={17} /> Download Payslip PDF
          </button>
        </div>
      </div>
    </div>
  );
}
