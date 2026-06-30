import type { Variants } from "framer-motion";

/** Shared motion variants. Easing is a calm custom cubic-bezier (no bounce). */
const ease = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

export const staggerContainer = (stagger = 0.07): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});
