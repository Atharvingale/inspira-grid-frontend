"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Users,
  MessageSquare,
  Bell,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/lib/api";
import { useMessagingSafe } from "@/lib/contexts/MessagingContext";
import { useNotifications } from "@/lib/NotificationContext";
import { calculateProfileCompletion } from "@/lib/utils/profileCompletion";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  teamMembers?: unknown[];
  maxTeamSize?: number;
  skillsRequired?: string[];
  ownerId: string;
}

interface Application {
  id: string;
  projectId: string;
  projectTitle?: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: unknown;
}

interface DashboardData {
  myProjects: Project[];
  teamProjects: Project[];
  applications: Application[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "rgba(129,140,248,0.12)", text: "#818cf8" },
  "in-progress": { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  completed: { bg: "rgba(52,211,153,0.12)", text: "#34d399" },
  closed: { bg: "rgba(71,85,105,0.15)", text: "#94a3b8" },
};

const APP_STATUS: Record<Application["status"], { label: string; color: string }> = {
  pending: { label: "Pending", color: "#fbbf24" },
  accepted: { label: "Accepted", color: "#34d399" },
  rejected: { label: "Declined", color: "#f87171" },
  withdrawn: { label: "Withdrawn", color: "#94a3b8" },
};

function StatCard({
  label,
  value,
  icon,
  href,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl p-5 border transition-colors"
      style={{
        background: "var(--ig-surface)",
        borderColor: "var(--ig-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--ig-accent-dim)", color: "var(--ig-accent)" }}
        >
          {icon}
        </div>
        <ChevronRight
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--ig-text-muted)" }}
        />
      </div>
      {loading ? (
        <div
          className="h-8 w-12 rounded ig-skeleton"
          aria-label="Loading"
        />
      ) : (
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: "var(--ig-text)" }}
        >
          {value}
        </p>
      )}
      <p className="text-sm mt-1" style={{ color: "var(--ig-text-muted)" }}>
        {label}
      </p>
    </Link>
  );
}

function ProfileBanner({
  userProfile,
}: {
  userProfile: ReturnType<typeof useAuth>["userProfile"];
}) {
  if (!userProfile) return null;
  const result = calculateProfileCompletion(userProfile);
  if (result.isComplete) return null;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: "var(--ig-surface)",
        borderColor: "var(--ig-border)",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ig-accent-dim)", color: "var(--ig-accent)" }}
        >
          <UserCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: "var(--ig-text)" }}>
              Complete your profile
            </p>
            <span className="text-sm font-semibold" style={{ color: "var(--ig-accent)" }}>
              {result.percentage}%
            </span>
          </div>
          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--ig-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${result.percentage}%`,
                background: "var(--ig-accent)",
              }}
            />
          </div>
          {result.missingFields.length > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--ig-text-muted)" }}>
              Missing: {result.missingFields.slice(0, 3).join(", ")}
              {result.missingFields.length > 3 ? ` +${result.missingFields.length - 3} more` : ""}
            </p>
          )}
        </div>
        <Link
          href="/dashboard/profile"
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: "var(--ig-accent-dim)", color: "var(--ig-accent)" }}
        >
          Complete
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const messaging = useMessagingSafe();
  const { unreadCount: notifUnreadCount } = useNotifications();

  const [data, setData] = useState<DashboardData>({
    myProjects: [],
    teamProjects: [],
    applications: [],
  });
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadMessages = messaging?.state.unreadCount ?? 0;
  const unreadNotifications = notifUnreadCount ?? 0;

  useEffect(() => {
    if (!currentUser) return;

    const load = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const [myProjectsRes, teamProjectsRes, applicationsRes] =
          await Promise.allSettled([
            apiClient.get("/projects/user/my-projects"),
            apiClient.get("/projects/user/team-projects"),
            apiClient.get("/applications/my-applications"),
          ]);

        const myProjects =
          myProjectsRes.status === "fulfilled"
            ? ((myProjectsRes.value as { projects?: Project[] })?.projects ?? [])
            : [];
        const teamProjects =
          teamProjectsRes.status === "fulfilled"
            ? ((teamProjectsRes.value as { projects?: Project[] })?.projects ?? [])
            : [];
        const applications =
          applicationsRes.status === "fulfilled"
            ? ((applicationsRes.value as { applications?: Application[] })
                ?.applications ?? [])
            : [];

        setData({ myProjects, teamProjects, applications });
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("Some data failed to load. Refresh to retry.");
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [currentUser]);

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ig-bg)" }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--ig-accent)" }}
        />
      </div>
    );
  }

  const firstName =
    userProfile?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "there";

  const pendingApps = data.applications.filter(
    (a) => a.status === "pending"
  );
  const recentApps = data.applications.slice(0, 5);
  const recentOwnedProjects = data.myProjects.slice(0, 3);
  const recentTeamProjects = data.teamProjects.slice(0, 3);

  const isNewUser =
    data.myProjects.length === 0 &&
    data.teamProjects.length === 0 &&
    data.applications.length === 0;

  return (
    <div
      className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto"
      style={{ background: "var(--ig-bg)" }}
    >
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--ig-text)" }}>
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 17
            ? "afternoon"
            : "evening"}
          , {firstName}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ig-text-muted)" }}>
          {isNewUser
            ? "Welcome to Inspira Grid — let's get you started."
            : "Here's what's happening with your projects."}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-6 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.2)",
            color: "var(--ig-danger)",
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Profile completion banner */}
      <div className="mb-6">
        <ProfileBanner userProfile={userProfile} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="My Projects"
          value={data.myProjects.length}
          icon={<FolderOpen className="w-5 h-5" />}
          href="/dashboard/projects"
          loading={loadingData}
        />
        <StatCard
          label="Team Projects"
          value={data.teamProjects.length}
          icon={<Users className="w-5 h-5" />}
          href="/dashboard/teams"
          loading={loadingData}
        />
        <StatCard
          label="Applications"
          value={data.applications.length}
          icon={<Clock className="w-5 h-5" />}
          href="/dashboard/applications"
          loading={loadingData}
        />
        <StatCard
          label="Unread Messages"
          value={unreadMessages}
          icon={<MessageSquare className="w-5 h-5" />}
          href="/dashboard/messages"
          loading={false}
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column — Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* New user CTA */}
          {isNewUser && !loadingData && (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "var(--ig-surface)",
                borderColor: "var(--ig-border)",
              }}
            >
              <h2
                className="text-lg font-semibold mb-1"
                style={{ color: "var(--ig-text)" }}
              >
                Get started
              </h2>
              <p
                className="text-sm mb-5"
                style={{ color: "var(--ig-text-muted)" }}
              >
                Create your first project or browse existing ones to join a
                team.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/projects/create"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "var(--ig-accent)", color: "var(--ig-bg)" }}
                >
                  <Plus className="w-4 h-4" />
                  Create a project
                </Link>
                <Link
                  href="/dashboard/projects"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                  style={{
                    borderColor: "var(--ig-border-strong)",
                    color: "var(--ig-text-secondary)",
                  }}
                >
                  Browse projects
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* My Projects */}
          {(recentOwnedProjects.length > 0 || loadingData) && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-base font-semibold"
                  style={{ color: "var(--ig-text)" }}
                >
                  My Projects
                </h2>
                <Link
                  href="/dashboard/projects"
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: "var(--ig-accent)" }}
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {loadingData ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl ig-skeleton"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOwnedProjects.map((project) => {
                    const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.closed;
                    return (
                      <Link
                        key={project.id}
                        href={`/dashboard/projects/${project.id}`}
                        className="group flex items-center gap-4 p-4 rounded-xl border transition-colors"
                        style={{
                          background: "var(--ig-surface)",
                          borderColor: "var(--ig-border)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate group-hover:underline"
                            style={{ color: "var(--ig-text)" }}
                          >
                            {project.title}
                          </p>
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: "var(--ig-text-muted)" }}
                          >
                            {project.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {project.status}
                          </span>
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--ig-text-muted)" }}
                          >
                            <Users className="w-3.5 h-3.5" />
                            {Array.isArray(project.teamMembers)
                              ? project.teamMembers.length
                              : 0}
                            {project.maxTeamSize ? `/${project.maxTeamSize}` : ""}
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {data.myProjects.length === 0 && !isNewUser && (
                    <div
                      className="text-center py-10 rounded-xl border"
                      style={{
                        background: "var(--ig-surface)",
                        borderColor: "var(--ig-border)",
                      }}
                    >
                      <FolderOpen
                        className="w-8 h-8 mx-auto mb-3"
                        style={{ color: "var(--ig-text-muted)" }}
                      />
                      <p
                        className="text-sm"
                        style={{ color: "var(--ig-text-muted)" }}
                      >
                        No projects yet.{" "}
                        <Link
                          href="/dashboard/projects/create"
                          className="underline"
                          style={{ color: "var(--ig-accent)" }}
                        >
                          Create one
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Team Projects */}
          {(recentTeamProjects.length > 0 || loadingData) && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-base font-semibold"
                  style={{ color: "var(--ig-text)" }}
                >
                  Team Projects
                </h2>
                <Link
                  href="/dashboard/teams"
                  className="text-xs flex items-center gap-1"
                  style={{ color: "var(--ig-accent)" }}
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {loadingData ? (
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-20 rounded-xl ig-skeleton" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTeamProjects.map((project) => {
                    const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.closed;
                    return (
                      <Link
                        key={project.id}
                        href={`/dashboard/projects/${project.id}`}
                        className="group flex items-center gap-4 p-4 rounded-xl border transition-colors"
                        style={{
                          background: "var(--ig-surface)",
                          borderColor: "var(--ig-border)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate group-hover:underline"
                            style={{ color: "var(--ig-text)" }}
                          >
                            {project.title}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "var(--ig-text-muted)" }}
                          >
                            {project.category}
                          </p>
                        </div>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          {project.status}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right column — Activity */}
        <div className="space-y-6">
          {/* Quick actions */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--ig-surface)",
              borderColor: "var(--ig-border)",
            }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: "var(--ig-text)" }}
            >
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                {
                  label: "Create project",
                  href: "/dashboard/projects/create",
                  icon: <Plus className="w-4 h-4" />,
                },
                {
                  label: "Browse projects",
                  href: "/dashboard/projects",
                  icon: <FolderOpen className="w-4 h-4" />,
                },
                {
                  label: "Messages",
                  href: "/dashboard/messages",
                  icon: <MessageSquare className="w-4 h-4" />,
                  badge: unreadMessages > 0 ? unreadMessages : undefined,
                },
                {
                  label: "Notifications",
                  href: "/dashboard/notifications",
                  icon: <Bell className="w-4 h-4" />,
                  badge:
                    unreadNotifications > 0 ? unreadNotifications : undefined,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                  style={{ color: "var(--ig-text-secondary)" }}
                >
                  <span style={{ color: "var(--ig-accent)" }}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "var(--ig-accent-dim)",
                        color: "var(--ig-accent)",
                      }}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* Applications */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--ig-surface)",
              borderColor: "var(--ig-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--ig-text)" }}
              >
                My Applications
              </h2>
              {pendingApps.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(251,191,36,0.12)",
                    color: "#fbbf24",
                  }}
                >
                  {pendingApps.length} pending
                </span>
              )}
            </div>

            {loadingData ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-lg ig-skeleton" />
                ))}
              </div>
            ) : recentApps.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2
                  className="w-7 h-7 mx-auto mb-2"
                  style={{ color: "var(--ig-text-muted)" }}
                />
                <p
                  className="text-xs"
                  style={{ color: "var(--ig-text-muted)" }}
                >
                  No applications yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentApps.map((app) => {
                  const s = APP_STATUS[app.status];
                  return (
                    <Link
                      key={app.id}
                      href="/dashboard/applications"
                      className="flex items-center justify-between py-2 text-sm group"
                    >
                      <span
                        className="truncate max-w-[150px] group-hover:underline"
                        style={{ color: "var(--ig-text-secondary)" }}
                      >
                        {app.projectTitle ?? "Project"}
                      </span>
                      <span
                        className="text-xs font-medium flex-shrink-0"
                        style={{ color: s.color }}
                      >
                        {s.label}
                      </span>
                    </Link>
                  );
                })}
                {data.applications.length > 5 && (
                  <Link
                    href="/dashboard/applications"
                    className="block text-xs mt-2 text-center"
                    style={{ color: "var(--ig-accent)" }}
                  >
                    View all {data.applications.length} applications
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
