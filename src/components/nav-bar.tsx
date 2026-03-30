'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Terminal, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'Prizes', href: '#prizes' },
    { name: 'Sponsors', href: '#sponsors' },
    { name: 'Organizers', href: '#organizers' },
  ];

  return (
    <motion.nav
      className={`fixed top-0 w-full z-40 transition-all duration-300 ${
        scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center gap-2">
            <Terminal className="text-primary w-6 h-6" />
            <span className="font-ui font-bold text-xl tracking-tighter text-white">
              CP_EVENT<span className="text-primary">_BINGO</span>
            </span>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="font-ui text-sm hover:text-primary transition-colors duration-200 text-gray-300"
                >
                  {`// ${link.name}`}
                </Link>
              ))}
              <Link
                href="/login"
                className="font-ui px-4 py-2 text-black bg-primary hover:bg-white transition-all duration-300 font-bold text-sm border border-primary hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]"
              >
                LOGIN_
              </Link>
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <motion.div
          className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="font-ui block px-3 py-2 text-base font-medium text-gray-300 hover:text-primary hover:bg-white/5"
                onClick={() => setIsOpen(false)}
              >
                {`> ${link.name}`}
              </a>
            ))}
            <Link
              href="/login"
              className="font-ui block px-3 py-2 text-base font-medium text-primary hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              [ LOGIN_SYSTEM ]
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
