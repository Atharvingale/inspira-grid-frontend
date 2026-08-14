"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  updateProfile 
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Github, ArrowLeft, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface FirebaseError extends Error {
  code?: string;
  message: string;
}

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export default function RegisterPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      // Redirect happens automatically via useEffect
    } catch (error: unknown) {
      console.error("Registration error:", error);
      let errorMessage = "Registration failed. Please try again.";
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as FirebaseError;
        if (firebaseError.code === "auth/email-already-in-use") {
          errorMessage = "An account with this email already exists.";
        } else if (firebaseError.code === "auth/weak-password") {
          errorMessage = "Password is too weak. Please choose a stronger password.";
        } else if (firebaseError.code === "auth/invalid-email") {
          errorMessage = "Invalid email address.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      console.error("Google registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Google registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubRegister = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signInWithPopup(auth, githubProvider);
    } catch (error: unknown) {
      console.error("GitHub registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "GitHub registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--ig-bg)' }}
      >
        <motion.div 
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col justify-between text-[#f1f5f9] selection:bg-indigo-500/30 selection:text-white"
      style={{ background: 'var(--ig-bg)' }}
    >
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 -left-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px]" />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{ 
            backgroundImage: `radial-gradient(#818cf8 1px, transparent 1px)`, 
            backgroundSize: '24px 24px' 
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link 
          href="/" 
          className="group inline-flex items-center gap-2 text-sm font-medium text-[#94a3b8] hover:text-[#f1f5f9] bg-[#0f172a]/60 hover:bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] rounded-full px-4 py-2 backdrop-blur-md transition-all duration-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>

        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <span className="text-lg leading-none font-black">⬢</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#f1f5f9]">
            Inspira<span className="text-[#818cf8]">-Grid</span>
          </span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Side: Product Features (No fake stats) */}
          <motion.div 
            className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-4"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-[#818cf8] mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Join the Platform
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-[#f1f5f9] leading-[1.15]">
                Start building with <span className="bg-gradient-to-r from-[#818cf8] to-indigo-400 bg-clip-text text-transparent">Inspira-Grid</span>
              </h1>
              <p className="mt-4 text-base xl:text-lg text-[#94a3b8] leading-relaxed">
                Create an account to join projects, collaborate seamlessly, and organize work with intuitive grid tools.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {[
                { title: "Real-time Workspace Messaging", desc: "Direct messaging, team channels, and asset sharing." },
                { title: "Project & Task Management", desc: "Track progress across your organization effortlessly." },
                { title: "Granular Member Roles", desc: "Manage permissions and collaborator access easily." },
                { title: "Cloud Integration & Analytics", desc: "Sync project files and view workspace activity." }
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#0f172a]/50 border border-[#1e293b] backdrop-blur-md">
                  <div className="p-1 rounded-full bg-indigo-500/10 text-[#818cf8] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#f1f5f9]">{item.title}</h3>
                    <p className="text-xs text-[#94a3b8] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Side: Register Glass Card */}
          <motion.div 
            className="col-span-1 lg:col-span-6 w-full max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-[#1e293b] shadow-2xl rounded-3xl p-7 sm:p-9">
              {/* Top Accent Line */}
              <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#f1f5f9] tracking-tight">
                  Create an Account
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1.5">
                  Get started with your free Inspira-Grid workspace
                </p>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    className="mb-5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs sm:text-sm flex items-start gap-2.5"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span className="leading-snug">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    name="name"
                    leftIcon={<User className="w-4 h-4 text-[#94a3b8]" />}
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                    disabled={isLoading}
                    className="bg-[#020617]/60 border-[#1e293b] focus:border-[#818cf8] text-[#f1f5f9] placeholder:text-[#475569] rounded-xl h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    name="email"
                    leftIcon={<Mail className="w-4 h-4 text-[#94a3b8]" />}
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    required
                    disabled={isLoading}
                    className="bg-[#020617]/60 border-[#1e293b] focus:border-[#818cf8] text-[#f1f5f9] placeholder:text-[#475569] rounded-xl h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <Input
                    type="password"
                    name="password"
                    leftIcon={<Lock className="w-4 h-4 text-[#94a3b8]" />}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create password"
                    required
                    disabled={isLoading}
                    showPasswordToggle={true}
                    className="bg-[#020617]/60 border-[#1e293b] focus:border-[#818cf8] text-[#f1f5f9] placeholder:text-[#475569] rounded-xl h-11"
                  />

                  {/* Password Strength Bar */}
                  {formData.password && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              lvl <= passwordStrength
                                ? passwordStrength <= 2
                                  ? "bg-red-500"
                                  : passwordStrength <= 3
                                  ? "bg-amber-500"
                                  : "bg-emerald-400"
                                : "bg-[#1e293b]"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-[#94a3b8]">
                        {passwordStrength <= 2 && "Weak password"}
                        {passwordStrength === 3 && "Good password"}
                        {passwordStrength >= 4 && "Strong password"}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    leftIcon={<Lock className="w-4 h-4 text-[#94a3b8]" />}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
                    required
                    disabled={isLoading}
                    showPasswordToggle={true}
                    error={
                      formData.confirmPassword && formData.password !== formData.confirmPassword 
                        ? "Passwords don't match" 
                        : undefined
                    }
                    className="bg-[#020617]/60 border-[#1e293b] focus:border-[#818cf8] text-[#f1f5f9] placeholder:text-[#475569] rounded-xl h-11"
                  />
                </div>

                <Button 
                  type="submit" 
                  loading={isLoading} 
                  className="w-full bg-[#6366f1] hover:bg-[#818cf8] text-white font-semibold h-11 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all duration-200 border-0 mt-3"
                >
                  Create Account
                </Button>
              </form>

              {/* Social Logins */}
              <div className="mt-6">
                <div className="relative flex items-center justify-center my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#1e293b]" />
                  </div>
                  <span className="relative px-3 bg-[#0f172a] text-xs font-medium text-[#475569] uppercase tracking-wider">
                    Or sign up with
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleRegister}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#020617]/60 hover:bg-[#1e293b] border border-[#1e293b] hover:border-[#334155] text-xs font-medium text-[#f1f5f9] transition-all duration-200 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.7 7.3 9.1 5 12 5z"/>
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6.5c-.3 1.4-1.1 2.5-2.3 3.3l3.6 2.8c2.1-1.9 3.7-4.8 3.7-8.1z"/>
                      <path fill="#FBBC05" d="M5.9 14.8c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L2.2 7.6C1.4 9.1 1 10.8 1 12.6s.4 3.5 1.2 5l3.7-2.8z"/>
                      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-2.3-6.1-4.9L2.2 16.5C4 20.3 7.7 23 12 23z"/>
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGithubRegister}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#020617]/60 hover:bg-[#1e293b] border border-[#1e293b] hover:border-[#334155] text-xs font-medium text-[#f1f5f9] transition-all duration-200 disabled:opacity-50"
                  >
                    <Github className="w-4 h-4 text-[#f1f5f9] shrink-0" />
                    <span>GitHub</span>
                  </button>
                </div>
              </div>

              {/* Terms Note */}
              <div className="mt-5 text-center">
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  By registering, you agree to Inspira-Grid&apos;s{" "}
                  <Link href="/terms" className="text-[#94a3b8] hover:text-[#f1f5f9] underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#94a3b8] hover:text-[#f1f5f9] underline">
                    Privacy Policy
                  </Link>.
                </p>
              </div>

              {/* Bottom signin link */}
              <div className="mt-6 text-center pt-2 border-t border-[#1e293b]/60">
                <p className="text-xs text-[#94a3b8]">
                  Already have an account?{" "}
                  <Link 
                    href="/auth/login" 
                    className="text-[#818cf8] hover:text-[#6366f1] font-semibold transition-colors ml-1"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>

            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-[#475569]">
        <p>© {new Date().getFullYear()} Inspira-Grid. All rights reserved.</p>
      </footer>
    </div>
  );
}
