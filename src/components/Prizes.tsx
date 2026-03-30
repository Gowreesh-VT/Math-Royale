'use client';

import { motion } from 'framer-motion';
import { Trophy, Gift, Star } from 'lucide-react';

const prizes = [
  {
    icon: <Trophy className="w-12 h-12 text-yellow-400" />,
    title: "1ST PLACE",
    reward: "Rs. 100000",
    color: "from-yellow-400/20 to-transparent",
    border: "border-yellow-400/50"
  },
  {
    icon: <Gift className="w-12 h-12 text-gray-300" />,
    title: "2ND PLACE",
    reward: "Rs. 50000",
    color: "from-gray-300/20 to-transparent",
    border: "border-gray-300/50"
  },
  {
    icon: <Star className="w-12 h-12 text-orange-400" />,
    title: "3RD PLACE",
    reward: "Rs. 10000",
    color: "from-orange-400/20 to-transparent",
    border: "border-orange-400/50"
  }
];

export default function Prizes() {
  return (
    <section id="prizes" className="py-24 relative bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           transition={{ duration: 0.8 }}
           className="text-center mb-16"
        >
          <h2 className="font-ui text-primary text-sm tracking-widest mb-2">
            // BOUNTY_ALLOCATION
          </h2>
          <h3 className="font-ui text-4xl md:text-5xl font-bold text-white">
            PRIZE POOL
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {prizes.map((prize, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -10 }}
              className={`relative p-8 border ${prize.border} bg-gradient-to-b ${prize.color} backdrop-blur-sm rounded-none group`}
            >
              <div className="absolute top-0 right-0 p-2 font-ui text-xs text-white/30 group-hover:text-white transition-colors">
                [0{index + 1}]
              </div>
              <div className="mb-6 bg-black/50 w-20 h-20 flex items-center justify-center rounded-full mx-auto border border-white/10 group-hover:scale-110 transition-transform duration-300">
                {prize.icon}
              </div>
              <h4 className="font-ui text-xl font-bold text-white text-center mb-2">
                {prize.title}
              </h4>
              <p className="font-ui text-gray-400 text-center">
                {prize.reward}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
