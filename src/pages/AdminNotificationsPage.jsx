/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/dashboard/DashboardShell";
import PageTransition from "../components/PageTransition";
import {
  buildDailyAttendanceRows,
  fetchWorkspaceAttendance,
  fetchWorkspaceEmployees,
  todayKey,
} from "../utils/supabaseAttendance";
import { useAuth } from "../contexts/AuthContext";
import { workspaceToView } from "../utils/supabaseMappers";

function AdminNotificationsPage() {
  const { profile, workspace: authWorkspace } = useAuth();
  const [read, setRead] = useState({});
  const [deleted, setDeleted] = useState({});
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);

  const workspace = workspaceToView(authWorkspace, profile);
  const today = todayKey();

  const loadData = useCallback(async () => {
    if (!authWorkspace?.id) return;

    const [workspaceEmployees, workspaceRecords] = await Promise.all([
      fetchWorkspaceEmployees(authWorkspace.id),
      fetchWorkspaceAttendance(authWorkspace.id),
    ]);

    setEmployees(workspaceEmployees);
    setRecords(workspaceRecords);
  }, [authWorkspace?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generatedNotifications = useMemo(() => {
    const dailyRows = buildDailyAttendanceRows(records, employees, today, workspace);
    const lateCount = dailyRows.filter(
      (record) => record.lateMinutes > 0 || record.status === "Late",
    ).length;
    const todayActivity = records.filter((record) => record.date === today).length;

    return [
      lateCount > 0 && {
        id: `late-${today}`,
        icon: Clock3,
        text: `${lateCount} employees are late today.`,
        time: "Today",
        tone: "text-amber-300 bg-amber-400/10",
      },
      employees.length > 0 && {
        id: "employees",
        icon: UserPlus,
        text: `${employees.length} employees are currently listed in this workspace.`,
        time: "Now",
        tone: "text-emerald-300 bg-emerald-400/10",
      },
      todayActivity > 0 && {
        id: `attendance-${today}`,
        icon: Clock3,
        text: `${todayActivity} real attendance events recorded today.`,
        time: "Today",
        tone: "text-sky-300 bg-sky-400/10",
      },
    ].filter(Boolean);
  }, [employees, records, today, workspace]);

  const notifications = useMemo(
    () => generatedNotifications.filter((notification) => !deleted[notification.id]),
    [generatedNotifications, deleted],
  );

  const unreadCount = notifications.filter((notification) => !read[notification.id]).length;

  const markAsRead = (notificationId) => {
    setRead((current) => ({ ...current, [notificationId]: true }));
  };

  const deleteNotification = (notificationId) => {
    setDeleted((current) => ({ ...current, [notificationId]: true }));
    setRead((current) => {
      const next = { ...current };
      delete next[notificationId];
      return next;
    });
  };

  const markAllAsRead = () => {
    setRead((current) => {
      const next = { ...current };
      notifications.forEach((notification) => {
        next[notification.id] = true;
      });
      return next;
    });
  };

  return (
    <PageTransition>
      <DashboardShell workspace={workspace}>
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="px-4 py-6 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">
              Notifications
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white">
                  Workspace <span className="gradient-text">Notifications</span>
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                  Review workspace alerts, attendance notices, correction activity, and admin announcements.
                </p>
              </div>

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-cyan-300/25 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/10"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <section className="glass-panel mt-8 rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-300">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
                </p>
              </div>

              <div className="grid gap-3">
                {notifications.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-sm leading-6 text-slate-400">
                    No notifications yet. This page will fill up when employees, attendance records, correction requests, or announcements exist.
                  </div>
                )}

                {notifications.map(({ icon: Icon, id, text, time, tone }) => {
                  const isRead = Boolean(read[id]);

                  return (
                    <div
                      key={id}
                      className={`flex flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-center ${
                        isRead
                          ? "border-white/5 bg-white/[0.02] opacity-70"
                          : "border-white/10 bg-white/[0.045]"
                      }`}
                    >
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
                        <Icon size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold ${isRead ? "text-slate-500" : "text-white"}`}>
                          {text}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{time}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                          >
                            <CheckCircle2 size={15} />
                            Mark as read
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteNotification(id)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-300/15 px-4 text-xs font-black text-rose-200 transition hover:border-rose-300/35 hover:bg-rose-400/10"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </motion.main>
      </DashboardShell>
    </PageTransition>
  );
}

export default AdminNotificationsPage;