'use client';

import { motion } from 'framer-motion';

export default function Sponsors() {
  return (
    <section id="sponsors" className="py-24 border-y border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           className="text-center mb-16"
        >
          <h2 className="font-ui text-primary text-sm tracking-widest mb-2">
            // POWERED_BY
          </h2>
          <h3 className="font-ui text-4xl md:text-5xl font-bold text-white">
            SPONSORS
          </h3>
        </motion.div>

        <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
          <ul className="flex items-center justify-center md:justify-start [&_li]:mx-12 [&_img]:max-w-none animate-scroll">
            {/* Original List */}
            {['GOOGLE', 'MICROSOFT', 'NETFLIX', 'META', 'AMAZON', 'APPLE', 'UBER', 'TWITTER'].map((sponsor, i) => (
              <li key={`original-${i}`}>
                <motion.div 
                  whileHover={{ scale: 1.1, opacity: 1 }}
                  className="text-2xl md:text-5xl font-black text-white/20 hover:text-white tracking-tighter cursor-pointer whitespace-nowrap"
                >
                  {sponsor}
                </motion.div>
              </li>
            ))}
            {/* Duplicate List for Infinite Scroll */}
            {['GOOGLE', 'MICROSOFT', 'NETFLIX', 'META', 'AMAZON', 'APPLE', 'UBER', 'TWITTER'].map((sponsor, i) => (
              <li key={`duplicate-${i}`}>
                <motion.div 
                  whileHover={{ scale: 1.1, opacity: 1 }}
                  className="text-2xl md:text-5xl font-black text-white/20 hover:text-white tracking-tighter cursor-pointer whitespace-nowrap"
                >
                  {sponsor}
                </motion.div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
