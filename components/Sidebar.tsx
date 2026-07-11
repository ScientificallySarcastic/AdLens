"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, LayoutGrid, FileText, BookOpen, Bell, Search } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import clsx from "clsx";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/overview", label: "Campaign overview", icon: LayoutGrid },
  { href: "/check", label: "Account check", icon: Search },
  { href: "/reporting", label: "Reporting", icon: FileText },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-[210px] shrink-0 bg-surface border-r border-line flex flex-col">
      <div className="p-4 border-b border-line flex items-center gap-2.5">
        <motion.div whileHover={{ rotate: -8, scale: 1.06 }} className="w-8 h-8 rounded-lg bg-ink text-bg grid place-items-center font-bold text-[13px] shadow-card">AL</motion.div>
        <div>
          <div className="font-display text-[17px] leading-tight">AdLens</div>
          <div className="text-[10px] text-mut">Ad Intelligence</div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={clsx(
              "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors",
              active ? "text-accent" : "text-mut hover:text-ink hover:bg-raised")}>
              {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-accent/10" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <Icon size={15} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-line flex items-center justify-between">
        <span className="text-[10px] text-mut">Synced 12 min ago</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
