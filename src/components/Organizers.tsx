'use client';

import { motion } from 'framer-motion';

const organizers = [
  { name: 'CodeChef VIT Chennai Chapter', role: 'Event Organizer', image: 'https://github.com/CodeChefVIT.png' },
  { name: 'Microsoft Innovation Club', role: 'Event Organizer', image: 'https://github.com/MIC-VIT.png' },
];

export default function Organizers() {
  return (
    <section id="organizers" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           className="text-center mb-16"
        >
          <h2 className="font-ui text-primary text-sm tracking-widest mb-2">
            // THE_TEAM
          </h2>
          <h3 className="font-ui text-4xl md:text-5xl font-bold text-white">
            ORGANIZERS
          </h3>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-10">
          {organizers.map((org, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 p-8 text-center group hover:bg-white/10 transition-colors rounded-xl w-full max-w-xs"
            >
              <div className="w-32 h-32 mx-auto mb-6 relative group-hover:scale-105 transition-transform duration-300">
                 <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                 <img 
                    src={org.image} 
                    alt={org.name}
                    className="w-full h-full object-cover rounded-full border-2 border-white/20 group-hover:border-primary transition-colors relative z-10 bg-black"
                 />
              </div>
              <h4 className="font-ui font-bold text-white text-xl mb-1">{org.name}</h4>
              <p className="font-ui text-primary text-sm font-medium tracking-wide">{org.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
