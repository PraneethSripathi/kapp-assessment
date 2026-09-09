import { z } from "zod";

export const candidateRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid mobile number"),
  role: z.string().min(1, "Role is required").max(100),
});

export const saveAnswerSchema = z.object({
  attemptId: z.string().cuid(),
  questionId: z.string().cuid(),
  selectedOptionId: z.string().cuid(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const practicalScoreSchema = z.object({
  attemptId: z.string().cuid(),
  score: z.number().min(0).max(20),
  notes: z.string().max(2000).optional(),
});

export const assessmentConfigSchema = z.object({
  mcqPassingScore: z.number().min(0).optional(),
  practicalPassingScore: z.number().min(0).optional(),
  overallPassingScore: z.number().min(0).optional(),
  durationMins: z.number().min(5).max(300).optional(),
});
