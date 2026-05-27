import { useState, useMemo } from "react";
import { Plus, Trash2, Search } from "lucide-react";

/**
 * Deduction manager dashboard sub-panel.
 * Allows administrators to define dynamic custom deductions (SSS loans, health care, cash advances)
 * with targeted assignment checklists, search filtering, and bulk selection.
 */
export default function GlobalDeductionsManager({
  customDeductions = [],
  newDedName,
  setNewDedName,
  newDedType,
  setNewDedType,
  newDedValue,
  setNewDedValue,
  newDedCap,
  setNewDedCap,
  onAddDeduction,
  onDeleteDeduction,
  employees = [],
}) {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() =>
    employees ? employees.map((emp) => emp.id) : []
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Synchronously update selected employee IDs when the employees prop changes to prevent cascading renders
  const [prevEmployees, setPrevEmployees] = useState(employees);
  if (employees !== prevEmployees) {
    setPrevEmployees(employees);
    setSelectedEmployeeIds(employees ? employees.map((emp) => emp.id) : []);
  }

  // Filter employees for targeting checklist based on search input
  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(emp => 
      (emp.fullName || emp.full_name || "").toLowerCase().includes(query) ||
      (emp.email || "").toLowerCase().includes(query)
    );
  }, [employees, searchTerm]);

  const handleAddClick = () => {
    if (typeof onAddDeduction === "function") {
      onAddDeduction(selectedEmployeeIds);
      // Reset selected list to all employees as default
      setSelectedEmployeeIds(employees.map(emp => emp.id));
      setSearchTerm("");
    }
  };

  return (
    <div className="mt-8 border-t border-white/10 pt-6 text-left">
      <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        Custom Workspace Deductions
      </h3>
      <p className="mt-1 text-xs text-slate-400">
        Configure custom employee deductions (SSS loans, HMO, advances, etc.) and assign them globally or to targeted workers.
      </p>

      {/* Active Deductions */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {customDeductions.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-4 text-center text-xs text-slate-500">
            No custom deductions configured. (Govt contributions SSS, PhilHealth, Pag-IBIG are managed by defaults).
          </div>
        ) : (
          customDeductions.map((ded) => (
            <div
              key={ded.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/5 shadow-sm"
            >
              <div className="min-w-0 pr-2">
                <p className="text-sm font-bold text-white truncate">{ded.name}</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {ded.type === "percentage" ? `${ded.value}%` : `₱${Number(ded.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  {ded.cap ? ` • Cap: ₱${Number(ded.cap).toLocaleString()}` : ""}
                </p>
                {/* Targeted Employees Badge */}
                <p className="text-[10px] font-black text-slate-500 mt-1.5 uppercase tracking-wider flex items-center gap-1">
                  Scope: {ded.targetIds && ded.targetIds.length > 0 && ded.targetIds.length < employees.length ? (
                    <span className="rounded bg-violet-500/10 border border-violet-400/20 px-1.5 py-0.5 text-violet-300">
                      🎯 {ded.targetIds.length} Targeted Employee(s)
                    </span>
                  ) : (
                    <span className="rounded bg-cyan-500/10 border border-cyan-400/20 px-1.5 py-0.5 text-cyan-300">
                      🌍 Global (All Employees)
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteDeduction(ded.id)}
                className="p-1.5 rounded-lg border border-white/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-400/20 transition shrink-0 cursor-pointer"
                aria-label={`Delete ${ded.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Inline Creator Form */}
      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.01] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Add Custom Deduction</h4>
        
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <label className="grid gap-1.5 col-span-1 lg:col-span-2 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Deduction Name</span>
            <input
              type="text"
              className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-xs font-semibold text-white outline-none focus:border-cyan-300/50"
              placeholder="e.g. SSS Salary Loan"
              value={newDedName}
              onChange={(e) => setNewDedName(e.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</span>
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 px-2 text-xs font-semibold text-white outline-none focus:border-cyan-300/50 transition cursor-pointer"
              value={newDedType}
              onChange={(e) => setNewDedType(e.target.value)}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₱)</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {newDedType === "percentage" ? "Percentage (%)" : "Amount (₱)"}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-xs font-semibold text-white outline-none focus:border-cyan-300/50"
              placeholder={newDedType === "percentage" ? "e.g. 1.5" : "e.g. 500"}
              value={newDedValue}
              onChange={(e) => setNewDedValue(e.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max Cap (Optional)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-xs font-semibold text-white outline-none focus:border-cyan-300/50"
              placeholder="e.g. 1000"
              value={newDedCap}
              onChange={(e) => setNewDedCap(e.target.value)}
            />
          </label>
        </div>

        {/* Employee Assignment Checklist Area */}
        {employees.length > 0 && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Assignment Checklist</span>
              
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.length === employees.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployeeIds(employees.map(emp => emp.id));
                      } else {
                        setSelectedEmployeeIds([]);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-cyan-500 outline-none cursor-pointer"
                  />
                  Target All
                </label>
              </div>
            </div>

            <div className="mt-2.5 relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-600" size={13} />
              <input
                type="text"
                className="h-8 w-full rounded-lg border border-white/5 bg-slate-950/40 pl-8 pr-3 text-[11px] font-semibold text-white outline-none focus:border-cyan-300/35 placeholder:text-slate-600"
                placeholder="Search employees to target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredEmployees.length === 0 ? (
              <p className="mt-2 text-center text-[10px] text-slate-600 font-semibold py-3">No matching employees found.</p>
            ) : (
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 max-h-28 overflow-y-auto border border-white/5 bg-slate-950/20 p-2.5 rounded-xl custom-scrollbar mt-2.5">
                {filteredEmployees.map((emp) => {
                  const isChecked = selectedEmployeeIds.includes(emp.id);
                  return (
                    <label key={emp.id} className="flex items-center gap-2 text-[11px] text-slate-300 font-semibold cursor-pointer py-1 px-1.5 rounded hover:bg-white/5 transition-all select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                          } else {
                            setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.id));
                          }
                        }}
                        className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-cyan-500 outline-none cursor-pointer"
                      />
                      <span className="truncate">{emp.fullName || emp.full_name || "Employee"}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end border-t border-white/5 pt-3">
          <button
            type="button"
            onClick={handleAddClick}
            disabled={!newDedName.trim() || !newDedValue || selectedEmployeeIds.length === 0}
            className="h-9 rounded-lg bg-cyan-400 hover:bg-cyan-500 text-slate-950 px-4 text-xs font-black transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus size={14} /> Add Deduction
          </button>
        </div>
      </div>
    </div>
  );
}
