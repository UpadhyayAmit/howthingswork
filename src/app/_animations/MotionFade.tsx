"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MotionFadeProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function MotionFade({
  children,
  className,
  delay = 0,
}: MotionFadeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
