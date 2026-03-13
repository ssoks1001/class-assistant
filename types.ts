
export interface Student {
  id: string;
  name: string;
  studentNumber: number; // 번호
  grade: string;
  classNumber: string;
  imageUrl: string;
  interactionCount: number;
  status: 'active' | 'inactive';
  lessonIds?: string[]; // 🆕 이 학생이 속한 수업들
  history: Array<{
    date: string;
    lessonId?: string; // 🆕 어떤 수업의 기록인지
    lessonTitle?: string;
    note?: string;
    observation?: string;
    questionQuality?: string;
  }>;
}

export interface Lesson {
  id: string;
  title: string;
  grade: string;
  classNumber?: string; // 🆕 명확한 반 정보 (예: "지혜")
  room: string;
  achievementCriteria: string;
  day: number; // 0: Mon, 1: Tue, ... 4: Fri
  period: number; // 1, 2, 3, 4, 5, 6, 7
  color: string;
  studentIds?: string[]; // 🆕 이 수업에 속한 학생들
  referenceDocIds?: string[]; // 🆕 이 수업 분석에 참고할 AI 맞춤형 교육과정/단지계 문서 ID 목록
  history?: LessonReport[];
}

export interface LessonReport {
  date: string; // Analysis date
  achievementAlignment: {
    score: number;
    feedback: string;
  };
  contentAccuracy: {
    score: number;
    feedback: string;
  };
  interactionQuality: {
    score: number;
    feedback: string;
  };
  inDepthAnalysis: string;
}

export interface ObservationRecord {
  questionLevel: {
    tag: string;
    score: string;
    description: string;
  };
  growthPoint: {
    title: string;
    description: string;
  };
  voiceAnalysis: {
    title: string;
    description: string;
    levels: number[];
  };
  draft: string;
}

export type AppView = 'home' | 'analysis' | 'records' | 'settings' | 'batch_report';

export type DocCategory = 'curriculum' | 'plan' | 'roster' | 'schedule';

export interface CurriculumDoc {
  id: string;
  name: string;
  category: DocCategory;
  uploadDate: string;
  aiSummary?: string;
  fileData?: string; // Base64 content for roster PDFs (immediate extraction needed)
  geminiFileUri?: string; // Gemini File API URI for curriculum docs
  uploadStatus?: 'uploading' | 'completed' | 'failed'; // Upload status for UI feedback
  mimeType?: string;
}

export interface PendingAnalysis {
  id: string;
  timestamp: string;
  lessonId: string;
  lessonTitle: string;
  transcript: string;
  audioData?: string; // 🆕 오디오 분석용 Base64 데이터
  audioMimeType?: string; // 🆕 오디오 마임타입 (audio/webm 등)
  achievementCriteria: string;
  referenceDocUris: string[];
  studentNames: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retryCount?: number;
}

