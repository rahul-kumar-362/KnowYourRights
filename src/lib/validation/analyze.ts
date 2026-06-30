import { z } from "zod";

export const SUPPORTED_LANGUAGES = [
  "en", // English
  "hi", // Hindi
  "mr", // Marathi
  "ta", // Tamil
  "te", // Telugu
  "bn", // Bengali
  "gu", // Gujarati
  "pa", // Punjabi
  "ml", // Malayalam
  "kn", // Kannada
  "ur", // Urdu
] as const;

export const AnalyzeRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(5, "Please describe your situation in a bit more detail.")
    .max(8000, "Description is too long."),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
