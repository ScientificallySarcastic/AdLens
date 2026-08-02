"use client";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const platforms = [
  { name: "Meta Ads", icon: "🔵", gradient: "from-blue-600 to-blue-400" },
  { name: "Google Ads", icon: "🔴", gradient: "from-red-600 to-blue-500" },
  { name: "LinkedIn Ads", icon: "💼", gradient: "from-blue-700 to-blue-500" },
  { name: "Snapchat Ads", icon: "👻", gradient: "from-yellow-300 to-yellow-100" },
  { name: "Pinterest Ads", icon: "📌", gradient: "from-red-600 to-red-400" },
  { name: "TikTok Ads", icon: "🎵", gradient: "from-black to-gray-800" },
];

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  hover: { y: -8, transition: { duration: 0.2 } },
};

export default function Onboard() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const togglePlatform = (name: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const handleContinue = () => {
    if (selectedPlatforms.length > 0) {
      router.push("/check");
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-surface overflow-hidden">
      {/* Animated background gradient shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),0.08) 0%, transparent 70%)" }}
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),0.05) 0%, transparent 70%)" }}
          animate={{ y: [0, -40, 0], x: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full"
             style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),0.03) 0%, transparent 70%)" }} />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <div className="w-full max-w-2xl mb-12 flex items-center justify-between">
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 grid place-items-center text-white text-sm font-bold">
              AD
            </div>
            <span className="text-sm font-semibold text-ink">AdLens</span>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <span className="text-xs font-semibold text-accent">Step 1 of 1</span>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <motion.div variants={itemVariants} className="w-full max-w-2xl text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight mb-6 text-ink leading-tight">
            Find What's Failing.
            <br />
            <span className="bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent">
              Scale What's Winning.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-mut font-medium leading-relaxed mb-2">
            Connect your advertising platforms and let AdLens automatically analyze campaign performance,
            surface winning opportunities, and identify what's hurting your results.
          </p>
        </motion.div>

        {/* Platform Cards */}
        <motion.div
          variants={itemVariants}
          className="w-full max-w-2xl mb-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {platforms.map((platform, idx) => (
              <motion.button
                key={platform.name}
                variants={cardVariants}
                whileHover="hover"
                onClick={() => togglePlatform(platform.name)}
                className={`group relative p-6 rounded-2xl transition-all duration-300 ${
                  selectedPlatforms.includes(platform.name)
                    ? "bg-accent/10 border-2 border-accent ring-2 ring-accent/20"
                    : "bg-white/40 border-2 border-transparent hover:bg-white/60"
                } backdrop-blur-sm`}
                style={{ transitionDelay: `${idx * 50}ms` }}
              >
                {/* Selection indicator */}
                {selectedPlatforms.includes(platform.name) && (
                  <motion.div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent grid place-items-center"
                    layoutId="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <span className="text-white text-xs font-bold">✓</span>
                  </motion.div>
                )}

                {/* Icon */}
                <div className={`text-4xl mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  {platform.icon}
                </div>

                {/* Name */}
                <p className="text-sm font-semibold text-ink">{platform.name}</p>
              </motion.button>
            ))}
          </div>

          <p className="text-center text-sm text-mut mt-6">
            Select platforms to connect, or proceed with demo data
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div variants={itemVariants} className="w-full max-w-2xl flex gap-3 justify-center">
          <button
            onClick={handleSkip}
            className="px-8 py-3 rounded-xl font-semibold text-mut hover:text-ink transition-colors duration-300 hover:bg-raised"
          >
            Skip for now
          </button>

          <button
            onClick={handleContinue}
            disabled={selectedPlatforms.length === 0}
            className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-accent to-accent/80 text-white shadow-lg hover:shadow-xl hover:from-accent/90 hover:to-accent/70 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 group"
          >
            Continue
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Footer text */}
        <motion.p
          variants={itemVariants}
          className="text-xs text-mut mt-12 text-center max-w-2xl"
        >
          Your data is encrypted and never shared. We support enterprise security standards.
        </motion.p>
      </motion.div>
    </div>
  );
}
