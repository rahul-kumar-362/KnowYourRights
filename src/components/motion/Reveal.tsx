"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/motion";

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  variant?: Variants;
  once?: boolean;
}

/** Fade-up a block as it scrolls into view. Honors prefers-reduced-motion. */
export function Reveal({ children, delay = 0, variant = fadeUp, once = true, ...props }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div {...props}>{children}</div>;
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      variants={variant}
      transition={{ delay }}
      {...(props as object)}
    >
      {children}
    </motion.div>
  );
}

/** Stagger children that each use the `fadeUp` variant. */
export function RevealGroup({
  children,
  stagger = 0.07,
  once = true,
  ...props
}: RevealProps & { stagger?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div {...props}>{children}</div>;
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      variants={staggerContainer(stagger)}
      {...(props as object)}
    >
      {children}
    </motion.div>
  );
}
