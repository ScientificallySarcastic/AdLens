"use client";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const platforms = [
  { name: "Meta Ads", icon: "🔵", color: "from-blue-600 to-blue-500", lightColor: "bg-blue-500/10 border-blue-500/20" },
  { name: "Google Ads", icon: "🔴", color: "from-red-600 to-red-500", lightColor: "bg-red-500/10 border-red-500/20" },
  { name: "LinkedIn Ads", icon: "💼", color: "from-blue-700 to-blue-600", lightColor: "bg-blue-700/10 border-blue-700/20" },
  { name: "Snapchat Ads", icon: "👻", color: "from-yellow-400 to-yellow-300", lightColor: "bg-yellow-400/10 border-yellow-400/20" },
  { name: "Pinterest Ads", icon: "📌", color: "from-red-500 to-red-400", lightColor: "bg-red-500/10 border-red-500/20" },
  { name: "TikTok Ads", icon: "🎵", color: "from-black to-gray-900", lightColor: "bg-gray-900/10 border-gray-900/20" },
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
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-raised overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),0.4) 0%, transparent 70%)" }}
          animate={{ y: [0, 50, 0], x: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),0.3) 0%, transparent 70%)" }}
          animate={{ y: [0, -60, 0], x: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 opacity-30" style={{
            background: "radial-gradient(circle at 50% 50%, rgba(var(--accent-rgb),0.1) 0%, transparent 50%)"
          }} />
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 min-h-screen flex flex-col px-4 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Header with logo and progress */}
        <div className="pt-8 pb-16 flex items-center justify-between">
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent via-accent/80 to-accent/60 grid place-items-center text-white font-bold text-lg shadow-lg">
              ✨
            </div>
            <div>
              <div className="text-sm font-bold text-ink">AdLens</div>
              <div className="text-xs text-mut">Ad Intelligence</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur">
            <span className="text-xs font-semibold bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent">Step 1 of 1</span>
          </motion.div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          {/* Heading section */}
          <motion.div variants={itemVariants} className="w-full max-w-3xl text-center mb-20">
            <h1 className="text-6xl sm:text-7xl md:text-7xl font-display font-bold tracking-tight mb-8 leading-tight">
              <span className="text-ink">Find What's Failing.</span>
              <br />
              <span className="bg-gradient-to-r from-accent via-accent to-accent/70 bg-clip-text text-transparent animate-pulse">Scale What's Winning.</span>
            </h1>

            <p className="text-lg sm:text-xl text-mut/80 font-medium leading-relaxed max-w-2xl mx-auto">
              Connect your advertising platforms and let AdLens automatically analyze campaign performance, surface winning opportunities, and identify what's hurting your results.
            </p>
          </motion.div>

          {/* Platform Cards Grid */}
          <motion.div variants={itemVariants} className="w-full max-w-4xl mb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {platforms.map((platform, idx) => (
                <motion.button
                  key={platform.name}
                  onClick={() => togglePlatform(platform.name)}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  className={`relative group p-6 sm:p-8 rounded-2xl backdrop-blur-md transition-all duration-300 border-2 ${
                    selectedPlatforms.includes(platform.name)
                      ? `${platform.lightColor} bg-white/20 border-current shadow-lg shadow-current/20`
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10 ${
                    selectedPlatforms.includes(platform.name) ? `bg-gradient-to-r ${platform.color}` : ""
                  }`} />

                  {/* Selection checkmark */}
                  {selectedPlatforms.includes(platform.name) && (
                    <motion.div
                      className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-r from-accent to-accent/80 grid place-items-center shadow-lg"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <span className="text-white text-sm font-bold">✓</span>
                    </motion.div>
                  )}

                  {/* Icon */}
                  <div className="text-5xl sm:text-6xl mb-4 group-hover:scale-125 transition-transform duration-300">
                    {platform.icon}
                  </div>

                  {/* Name */}
                  <p className={`text-sm sm:text-base font-bold transition-colors ${
                    selectedPlatforms.includes(platform.name) ? "text-ink" : "text-ink/70"
                  }`}>
                    {platform.name}
                  </p>
                </motion.button>
              ))}
            </div>

            <motion.p
              variants={itemVariants}
              className="text-center text-sm text-mut/60 mt-8"
            >
              Select platforms to connect, or proceed with demo data
            </motion.p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md"
          >
            <button
              onClick={handleSkip}
              className="px-8 py-3.5 rounded-xl font-semibold text-mut hover:text-ink transition-all duration-300 hover:bg-white/10 border border-transparent hover:border-white/10 backdrop-blur"
            >
              Skip for now
            </button>

            <button
              onClick={handleContinue}
              disabled={selectedPlatforms.length === 0}
              className="px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-accent to-accent/80 text-white shadow-2xl hover:shadow-2xl hover:from-accent/90 hover:to-accent/70 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 group hover:scale-105 disabled:scale-100 disabled:hover:scale-100"
            >
              Continue
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          variants={itemVariants}
          className="py-8 text-center border-t border-white/5"
        >
          <p className="text-xs text-mut/50 flex items-center justify-center gap-2">
            <Sparkles size={12} className="text-accent/40" />
            Your data is encrypted and never shared. We support enterprise security standards.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
