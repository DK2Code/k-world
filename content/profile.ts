import type { AssessmentReport, AssessmentSession, LearningAttempt } from './assessment.ts';
import type { GradeLevel, Subject } from './types.ts';

export type ProfileData = {
  saveVersion: 2;
  grade: GradeLevel | null;
  legacyAgeGroup: string | null;
  nickname: string;
  skin: number;
  hair: number;
  outfit: number;
  explorerClass: string;
  companion: string;
  xp: number;
  stars: number;
  badges: string[];
  facts: string[];
  items: string[];
  completed: string[];
  progress: Record<Subject, { correct: number; attempts: number }>;
  sound: boolean;
  narration: boolean;
  narrationAuto: boolean;
  narratorVoiceURI: string;
  speechRate: number;
  speechPitch: number;
  reducedMotion: boolean;
  largeText: boolean;
  easyRead: boolean;
  playMinutes: number;
  worldPosition: { x: number; y: number };
  questHistory: Record<string, string[]>;
  questionHistory: Record<string, string[]>;
  factHistory: Record<string, string[]>;
  practiceAttempts: LearningAttempt[];
  assessmentAttempts: LearningAttempt[];
  assessmentHistory: AssessmentReport[];
  activeAssessment: AssessmentSession | null;
};

export const defaultProfile: ProfileData = {
  saveVersion: 2, grade: null, legacyAgeGroup: null, nickname: 'Nova', skin: 1, hair: 0, outfit: 0, explorerClass: 'Scientist', companion: 'Fox',
  xp: 0, stars: 0, badges: [], facts: [], items: [], completed: [],
  progress: { science: { correct: 0, attempts: 0 }, math: { correct: 0, attempts: 0 }, english: { correct: 0, attempts: 0 } },
  sound: true, narration: false, narrationAuto: false, narratorVoiceURI: '', speechRate: 0.9, speechPitch: 1, reducedMotion: false, largeText: false, easyRead: false, playMinutes: 0,
  worldPosition: { x: 48, y: 20 }, questHistory: {}, questionHistory: {}, factHistory: {}, practiceAttempts: [], assessmentAttempts: [], assessmentHistory: [], activeAssessment: null,
};

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const history = (value: unknown) => Object.fromEntries(Object.entries(object(value)).map(([key, item]) => [key, stringArray(item)]));

export function migrateProfile(raw: unknown): ProfileData {
  const saved = object(raw);
  const savedProgress = object(saved.progress);
  const progress = Object.fromEntries((['science', 'math', 'english'] as Subject[]).map((subject) => {
    const entry = object(savedProgress[subject]);
    return [subject, { correct: Number(entry.correct) || 0, attempts: Number(entry.attempts) || 0 }];
  })) as ProfileData['progress'];
  const grade = typeof saved.grade === 'string' && ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].includes(saved.grade) ? saved.grade as GradeLevel : null;
  const migrated = {
    ...defaultProfile,
    ...saved,
    saveVersion: 2,
    grade,
    legacyAgeGroup: typeof saved.legacyAgeGroup === 'string' ? saved.legacyAgeGroup : typeof saved.age === 'string' ? saved.age : null,
    narratorVoiceURI: typeof saved.narratorVoiceURI === 'string' ? saved.narratorVoiceURI : '',
    speechRate: typeof saved.speechRate === 'number' && Number.isFinite(saved.speechRate) ? Math.min(1.2, Math.max(.65, saved.speechRate)) : defaultProfile.speechRate,
    speechPitch: typeof saved.speechPitch === 'number' && Number.isFinite(saved.speechPitch) ? Math.min(1.1, Math.max(.9, saved.speechPitch)) : defaultProfile.speechPitch,
    progress,
    badges: stringArray(saved.badges), facts: stringArray(saved.facts), items: stringArray(saved.items), completed: stringArray(saved.completed),
    questHistory: history(saved.questHistory), questionHistory: history(saved.questionHistory), factHistory: history(saved.factHistory),
    practiceAttempts: Array.isArray(saved.practiceAttempts) ? saved.practiceAttempts as LearningAttempt[] : [],
    assessmentAttempts: Array.isArray(saved.assessmentAttempts) ? saved.assessmentAttempts as LearningAttempt[] : [],
    assessmentHistory: Array.isArray(saved.assessmentHistory) ? saved.assessmentHistory as AssessmentReport[] : [],
    activeAssessment: saved.activeAssessment && typeof saved.activeAssessment === 'object' ? saved.activeAssessment as AssessmentSession : null,
    worldPosition: { ...defaultProfile.worldPosition, ...object(saved.worldPosition) },
  } as ProfileData & { age?: unknown };
  delete migrated.age;
  return migrated;
}
