import HeroSection from '@/components/Hero';
import Prizes from '@/components/Prizes';
import Sponsors from '@/components/Sponsors';
import Organizers from '@/components/Organizers';
import Navbar from "@/components/nav-bar";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-black">
      <Navbar/>
      <HeroSection />
      <Prizes />
      <Sponsors />
      <Organizers />
      
      <footer className="py-8 text-center border-t border-white/10">
        <p className="font-ui text-xs text-gray-500">
          © {new Date().getFullYear()} CP_EVENT // TERMINAL_V.2.0
        </p>
      </footer>
    </main>
  );
}