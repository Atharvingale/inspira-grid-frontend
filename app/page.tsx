"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Users,
  FolderOpen,
  MessageSquare,
  Github,
  Zap,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import ParticleField from "@/components/effects/ParticleField";

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = (delay: number) => ({
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, delay } },
});

const FEATURES = [
  {
    icon: <FolderOpen className="w-5 h-5" />,
    title: "Project Discovery",
    body: "Browse open projects filtered by category, skills required, and team size. Apply to join in one step.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Team Matching",
    body: "Find collaborators whose skills complement yours. Build balanced teams around real project needs.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Built-in Messaging",
    body: "Private and group conversations, file sharing, and typing indicators — no external tools needed.",
  },
  {
    icon: <Github className="w-5 h-5" />,
    title: "GitHub Integration",
    body: "Link your repositories to projects and surface commits, issues, and contributors directly in the workspace.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Real-time Notifications",
    body: "Stay updated on applications, team changes, and messages via live push notifications.",
  },
  {
    icon: <ArrowRight className="w-5 h-5" />,
    title: "Application Lifecycle",
    body: "Apply, wait for review, get accepted or declined — with full visibility at every step.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your profile",
    body: "Add your skills, interests, and GitHub. A complete profile gets more responses.",
  },
  {
    step: "02",
    title: "Browse or post a project",
    body: "Find an open project that needs your skills, or start one and define the roles you need.",
  },
  {
    step: "03",
    title: "Apply and collaborate",
    body: "Submit a one-step application. Once accepted, get access to the team workspace and messaging.",
  },
];

export default function HomePage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!loadingAuth && user) {
      router.replace("/dashboard");
    }
  }, [user, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ig-bg)" }}
      >
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--ig-accent)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--ig-bg)", color: "var(--ig-text)" }}
    >
      {/* ─── Header ─── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(2, 6, 23, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderColor: "var(--ig-border)",
        }}
      >
        <div className="ig-container">
          <nav className="h-14 flex items-center justify-between">
            {/* Wordmark */}
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: "var(--ig-text)" }}
            >
              Inspira<span style={{ color: "var(--ig-accent)" }}>Grid</span>
            </span>

            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm px-4 py-2 rounded-lg transition-colors"
                style={{ color: "var(--ig-text-secondary)" }}
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ background: "var(--ig-accent)", color: "var(--ig-bg)" }}
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden" style={{ minHeight: "90vh" }}>
        {/* Particle field atmosphere */}
        <ParticleField
          className="absolute inset-0"
          density={40}
          interactive={!shouldReduceMotion}
        />

        <div className="ig-container relative z-10 flex flex-col items-center justify-center text-center pt-32 pb-24">
          <motion.div
            variants={FADE_UP}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border"
            style={{
              background: "var(--ig-accent-dim)",
              borderColor: "rgba(129,140,248,0.25)",
              color: "var(--ig-accent)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Open to everyone — free forever
          </motion.div>

          <motion.h1
            variants={stagger(0.1)}
            initial="hidden"
            animate="show"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight ig-display mb-6 text-balance"
          >
            Build projects.
            <br />
            <span style={{ color: "var(--ig-accent)" }}>Find your team.</span>
          </motion.h1>

          <motion.p
            variants={stagger(0.2)}
            initial="hidden"
            animate="show"
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "var(--ig-text-secondary)" }}
          >
            Inspira Grid connects developers, designers, and creators with open
            collaborative projects. Apply to join a team or post your own idea
            and find the right people to build it with.
          </motion.p>

          <motion.div
            variants={stagger(0.3)}
            initial="hidden"
            animate="show"
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: "var(--ig-accent)", color: "var(--ig-bg)" }}
            >
              Start building
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm border transition-colors"
              style={{
                borderColor: "var(--ig-border-strong)",
                color: "var(--ig-text-secondary)",
              }}
            >
              Sign in
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section
        className="py-24 border-t"
        style={{ borderColor: "var(--ig-border)" }}
      >
        <div className="ig-container">
          <motion.div
            variants={FADE_UP}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--ig-accent)" }}
            >
              How it works
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: "var(--ig-text)" }}
            >
              From idea to team in three steps
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                variants={stagger(i * 0.1)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                className="relative"
              >
                <div
                  className="text-5xl font-bold leading-none mb-4 ig-display select-none"
                  style={{ color: "var(--ig-border-strong)" }}
                >
                  {step.step}
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--ig-text)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ig-text-secondary)" }}>
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section
        className="py-24 border-t"
        style={{ borderColor: "var(--ig-border)", background: "var(--ig-surface)" }}
      >
        <div className="ig-container">
          <motion.div
            variants={FADE_UP}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--ig-accent)" }}
            >
              Features
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: "var(--ig-text)" }}
            >
              Everything you need to collaborate
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={stagger(i * 0.07)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className="p-6 rounded-xl border"
                style={{
                  background: "var(--ig-bg)",
                  borderColor: "var(--ig-border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    background: "var(--ig-accent-dim)",
                    color: "var(--ig-accent)",
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ color: "var(--ig-text)" }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ig-text-secondary)" }}>
                  {feature.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-28">
        <div className="ig-container">
          <motion.div
            variants={FADE_UP}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2
              className="text-4xl sm:text-5xl font-bold tracking-tight ig-display mb-6"
              style={{ color: "var(--ig-text)" }}
            >
              Ready to start building?
            </h2>
            <p
              className="text-lg mb-10"
              style={{ color: "var(--ig-text-secondary)" }}
            >
              Join Inspira Grid and find your next collaborative project today.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--ig-accent)", color: "var(--ig-bg)" }}
            >
              Create a free account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        className="border-t py-10"
        style={{ borderColor: "var(--ig-border)" }}
      >
        <div className="ig-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--ig-text-muted)" }}
          >
            Inspira<span style={{ color: "var(--ig-accent)" }}>Grid</span>
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="text-sm transition-colors"
              style={{ color: "var(--ig-text-muted)" }}
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="text-sm transition-colors"
              style={{ color: "var(--ig-text-muted)" }}
            >
              Register
            </Link>
          </div>
          <p className="text-xs" style={{ color: "var(--ig-text-muted)" }}>
            © {new Date().getFullYear()} Inspira Grid
          </p>
        </div>
      </footer>
    </div>
  );
}
