"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MotionSlideProps {
  children: ReactNode;
  className?: string;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
}

const offsets = {
  left: { x: -30, y: 0 },
  right: { x: 30, y: 0 },
  up: { x: 0, y: -30 },
  down: { x: 0, y: 30 },
};

export default function MotionSlide({
  children,
  className,
  direction = "up",
  delay = 0,
}: MotionSlideProps) {
  const offset = offsets[direction];
  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...offset }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
