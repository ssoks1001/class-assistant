
import { Student, ObservationRecord, CurriculumDoc, Lesson, LessonReport } from './types';

// 초기 데이터를 비워 사용자가 직접 추가하도록 함
export const INITIAL_STUDENTS: Student[] = [];

export const TIMETABLE: Lesson[] = [];

export const MOCK_LESSON_REPORTS: LessonReport[] = [];

export const INITIAL_DOCS: CurriculumDoc[] = [];

export const MOCK_OBSERVATION: ObservationRecord = {
  questionLevel: {
    tag: '-',
    score: '-',
    description: '관찰 데이터가 없습니다.'
  },
  growthPoint: {
    title: '-',
    description: '-'
  },
  voiceAnalysis: {
    title: '-',
    description: '-',
    levels: [0, 0, 0, 0]
  },
  draft: ''
};
