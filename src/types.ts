export interface StudentInfo {
  studentId: string;
  studentName: string;
}

export interface FeedbackResponse {
  feedback: string;
  scores: {
    score1: number;
    score2: number;
    score3: number;
    score4: number;
    totalScore: number;
  };
  docType: string;
}

export interface HistoryItem {
  id: string;
  type: 'user' | 'ai';
  text: string;
  scores?: FeedbackResponse['scores'];
  timestamp: string;
}

export interface Criteria {
  name: string;
  description: string;
  maxScore: number;
}

export interface Assignment {
  id: string;
  name: string;
  isActive: boolean;
  criteria: Criteria[];
  specialInstruction?: string;
}

export interface GlobalSettings {
  commonInstruction: string;
}

export interface AdminData {
  timestamp: string;
  studentId: string;
  studentName: string;
  docType: string;
  score1: number;
  score2: number;
  score3: number;
  score4: number;
  totalScore: number;
  originalDoc?: string;
  feedback?: string;
}
