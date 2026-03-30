'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Terminal, Code2, Cpu, Network, Lock, Globe } from 'lucide-react';
import { signIn } from 'next-auth/react';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function Login_Page() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-[#050505] relative overflow-hidden">
      {/* Left Side - Visuals */}
      <div className="relative hidden lg:flex flex-col justify-center items-center p-12 overflow-hidden bg-black/20">
        {/* Animated Background Grid */}
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        <div className="max-w-xl w-full grid grid-cols-2 gap-4 z-10">
          {/* Visual Block 1 - Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-2 bg-black/50 border border-white/10 p-6 rounded-sm backdrop-blur-sm group hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3 text-primary">
              <Terminal size={20} />
              <span className="font-ui text-xs font-bold tracking-widest">
                SYSTEM_STATUS
              </span>
            </div>
            <div className="font-ui text-xs text-gray-400 space-y-1">
              <p>Initializing connection...</p>
              <p>
                Loading modules: <span className="text-green-400">OK</span>
              </p>
              <p>
                Verifying integrity:{" "}
                <span className="text-green-400">100%</span>
              </p>
              <p className="animate-pulse">_Waiting for user input</p>
            </div>
          </motion.div>

          {/* Visual Block 2 - Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black/50 border border-white/10 p-6 rounded-sm backdrop-blur-sm relative overflow-hidden group hover:border-primary/50 transition-colors"
          >
            <div className="absolute top-0 right-0 p-2 opacity-50">
              <Cpu size={40} strokeWidth={1} />
            </div>
            <h3 className="font-ui text-4xl font-bold text-white mb-1">10K+</h3>
            <p className="font-ui text-xs text-gray-500">ACTIVE NODES</p>
          </motion.div>

          {/* Visual Block 3 - Globe */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-black/50 border border-white/10 p-6 rounded-sm backdrop-blur-sm relative overflow-hidden group hover:border-primary/50 transition-colors"
          >
            <div className="absolute top-0 right-0 p-2 opacity-50">
              <Globe size={40} strokeWidth={1} />
            </div>
            <h3 className="font-ui text-4xl font-bold text-white mb-1">24/7</h3>
            <p className="font-ui text-xs text-gray-500">GLOBAL ACCESS</p>
          </motion.div>

          {/* Visual Block 4 - Algorithm */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-2 bg-gradient-to-r from-primary/10 to-transparent border border-white/10 p-6 rounded-sm backdrop-blur-sm group hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3 text-primary">
              <Network size={20} />
              <span className="font-ui text-xs font-bold tracking-widest">
                ALGORITHM_OPTIMIZED
              </span>
            </div>
            <div className="h-16 flex items-end gap-1">
              {[40, 70, 45, 90, 60, 80, 50, 95, 30, 60].map((h, i) => (
                <div
                  key={i}
                  className="bg-primary/50 w-full"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-col items-center justify-center p-4 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
            <div className="inline-block p-3 rounded-full bg-primary/10 mb-4 border border-primary/20">
              <Lock className="text-primary w-6 h-6" />
            </div>
            <h1 className="font-ui text-4xl font-bold text-white mb-2">
              WELCOME BACK
            </h1>
            <p className="font-ui text-sm text-gray-400">
              Authenticate via Google to access the mainframe.
            </p>
          </div>

          <div className="space-y-4">
            <button onClick={()=>{signIn("google",{callbackUrl:"/round1"})}} className="w-full bg-white hover:bg-gray-100 text-black font-ui font-bold py-4 px-6 rounded-none flex items-center justify-center gap-3 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]">
              <GoogleIcon />
              <span>SIGN IN WITH GOOGLE</span>
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#050505] px-2 text-gray-600 font-ui uppercase">
                  System Access Only
                </span>
              </div>
            </div>

            <div className="text-center font-ui text-xs text-gray-600">
              By accessing the system, you agree to the{" "}
              <a
                href="#"
                className="text-gray-400 hover:text-primary underline"
              >
                Protocol Terms
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-gray-400 hover:text-primary underline"
              >
                Data Policy
              </a>
              .
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}