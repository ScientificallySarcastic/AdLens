"use client";
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export default function Counter({ value, prefix = "", suffix = "", decimals = 0 }:
  { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 26, stiffness: 140 });
  const inView = useInView(ref, { once: true });
  useEffect(() => { if (inView) mv.set(value); }, [inView, value, mv]);
  useEffect(() => spring.on("change", (v) => {
    if (ref.current) ref.current.textContent = prefix + v.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) + suffix;
  }), [spring, prefix, suffix, decimals]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}
