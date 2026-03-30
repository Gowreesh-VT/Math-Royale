'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Hero() {
  const [text, setText] = useState('');
  const fullText = "INITIALIZING_EVENT_PROTOCOL...";

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="font-ui text-primary mb-4 text-sm md:text-base tracking-widest">
            {text}<span className="animate-pulse">_</span>
          </div>
          
          <h1 className="font-ui text-6xl md:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600 mb-6 leading-tight">
            CODE<br className="md:hidden" />
            <span className="text-primary">BINGO</span>
          </h1>

          <p className="font-ui text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Competition is inevitable. Logic is your weapon. 
            <br />
            Complete the lines to dominate the leaderboard.
          </p>

          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="font-ui px-8 py-4 bg-primary text-black font-bold text-lg border border-primary hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all inline-block cursor-pointer"
              >
                LOGIN_NOW()
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-10 left-10 font-ui text-xs text-gray-600 hidden md:block">
        SYS.STATUS: ONLINE<br/>
        LATENCY: 12ms
      </div>
    </section>
  );
}
