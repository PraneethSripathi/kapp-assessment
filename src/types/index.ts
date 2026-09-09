import { AttemptStatus } from "@prisma/client";

export type { AttemptStatus };

export interface CandidateRegistration {
  name: string;
  email: string;
  mobile: string;
  role: string;
}

export interface McqQuestion {
  id: string;
  questionText: string;
  category: string;
  difficulty: string;
  orderIndex: number;
  marks: number;
  options: McqOption[];
}

export interface McqOption {
  id: string;
  label: string;
  optionText: string;
}

export interface AttemptInfo {
  id: string;
  status: AttemptStatus;
  startedAt: string | null;
  expiresAt: string | null;
  assignedSetCode: string | null;
  mcqSubmittedAt: string | null;
  practicalSubmittedAt: string | null;
  mcqScore: number | null;
  practicalScore: number | null;
  totalScore: number | null;
  result: string | null;
}

export interface AdminCandidateRow {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  attemptId: string;
  status: AttemptStatus;
  setCode: string | null;
  startedAt: string | null;
  mcqSubmittedAt: string | null;
  practicalSubmittedAt: string | null;
  mcqScore: number | null;
  practicalScore: number | null;
  totalScore: number | null;
  result: string | null;
}
