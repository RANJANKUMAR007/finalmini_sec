import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Moon, Sun, Github } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Toaster } from 'sonner';

export default function Layout({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check for saved preference or default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
      {/* Hero Glow Effect */}
      <div className="hero-glow" />
      
      {/* Noise Overlay */}
      <div className="noise-overlay" />

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Shield className="w-5 h-5 text-emerald-400" />
            </motion.div>
            <span className="font-unbounded font-bold text-xl text-slate-100">
              CipherShare
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              data-testid="theme-toggle"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-8 sm:py-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-600 text-sm">
            End-to-end encrypted secret sharing
          </p>
          <p className="text-slate-700 text-xs mt-2">
            Built with security in mind
          </p>
        </div>
      </footer>

      {/* Toast Container */}
      <Toaster 
        position="top-center" 
        theme={isDark ? 'dark' : 'light'}
        toastOptions={{
          style: {
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            color: isDark ? '#f1f5f9' : '#0f172a'
          }
        }}
      />
    </div>
  );
}
