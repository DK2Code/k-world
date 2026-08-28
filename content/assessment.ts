import { gradeLabel, gradePresentation } from './grades.ts';
import { allActivities, questionBank } from './question-bank.ts';
import type { Difficulty, GradeLevel, GradedActivity, RegionId, Subject } from './types.ts';

export type AssessmentKind = 'general' | 'subject' | 'skill';
export type MasteryLabel = 'Not enough evidence' | 'Beginning' | 'Developing' | 'Secure' | 'Advanced';
export type LearningMode = 'practice' | 'assessment';

export type LearningAttempt = {
  id: string;
  activityId: string;
  grade: GradeLevel;
  subject: Subject;
  skillId: string;
  skillDescription: string;
  correct: boolean;
  hintUsed: boolean;
  difficulty: Difficulty;
  mode: LearningMode;
  occurredAt: string;
};

export type AssessmentSession = {
  id: string;
  kind: AssessmentKind;
  grade: GradeLevel;
  subject?: Subject;
  skillId?: string;
  title: string;
  targetCount: number;
  activityIds: string[];
  currentActivityId: string | null;
  attempts: LearningAttempt[];
  recentQuestIds: string[];
  startedAt: string;
  updatedAt: string;
  paused: boolean;
  completedAt?: string;
};

export type SkillMastery = {
  skillId: string;
  skillDescription: string;
  subject: Subject;
  label: MasteryLabel;
  score: number;
  attempts: number;
  uniqueActivities: number;
  correct: number;
  hints: number;
  evidence: string;
};

export type AssessmentReport = {
  id: string;
  sessionId: string;
  kind: AssessmentKind;
  grade: GradeLevel;
  subject?: Subject;
  title: string;
  completedAt: string;
  minutes: number;
  correct: number;
  attempts: number;
  hints: number;
  skills: SkillMastery[];
  strongest: string[];
  focusAreas: string[];
  recommendedRegions: RegionId[];
};

const activityById = new Map(allActivities.map((activity) => [activity.id, activity]));
const shuffled = <T,>(items: T[], random: () => number) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
};
const assessmentPool = (grade: GradeLevel, kind: AssessmentKind, subject?: Subject, skillId?: string) => {
  const subjects: Subject[] = subject ? [subject] : ['science', 'math', 'english'];
  return subjects.flatMap((item) => questionBank[grade][item]).filter((activity) => activity.assessmentEligible && (!skillId || activity.skillId === skillId));
};

export function getActivity(activityId: string | null | undefined) {
  return activityId ? activityById.get(activityId) : undefined;
}

export function chooseNextAssessmentActivity(session: AssessmentSession, random: () => number = Math.random): GradedActivity | undefined {
  const pool = assessmentPool(session.grade, session.kind, session.subject, session.skillId);
  const used = new Set(session.activityIds);
  const recent = new Set(session.recentQuestIds.slice(-9));
  let available = pool.filter((activity) => !used.has(activity.id) && !recent.has(activity.id));
  if (!available.length) available = pool.filter((activity) => !used.has(activity.id));
  if (!available.length) return undefined;

  const lastTwo = session.attempts.slice(-2);
  const correctStreak = lastTwo.length === 2 && lastTwo.every((attempt) => attempt.correct);
  const needsSupport = lastTwo.length === 2 && lastTwo.every((attempt) => !attempt.correct);
  const lastActivity = getActivity(session.attempts.at(-1)?.activityId);
  if (needsSupport && lastActivity?.prerequisiteSkillIds?.length) {
    const prerequisite = available.filter((activity) => lastActivity.prerequisiteSkillIds?.includes(activity.skillId));
    if (prerequisite.length) available = prerequisite;
  }

  if (session.kind === 'general') {
    const subjectCounts = Object.fromEntries((['science', 'math', 'english'] as Subject[]).map((subject) => [subject, session.attempts.filter((attempt) => attempt.subject === subject).length])) as Record<Subject, number>;
    const minimum = Math.min(...Object.values(subjectCounts));
    const balanced = available.filter((activity) => subjectCounts[activity.subject] === minimum);
    if (balanced.length) available = balanced;
  }

  const skillCounts = new Map<string, number>();
  for (const attempt of session.attempts) skillCounts.set(attempt.skillId, (skillCounts.get(attempt.skillId) ?? 0) + 1);
  const minimumSkillCount = Math.min(...available.map((activity) => skillCounts.get(activity.skillId) ?? 0));
  const skillBalanced = available.filter((activity) => (skillCounts.get(activity.skillId) ?? 0) === minimumSkillCount);
  if (skillBalanced.length) available = skillBalanced;

  const targetDifficulty: Difficulty = correctStreak ? 3 : needsSupport ? 1 : 2;
  const bestDistance = Math.min(...available.map((activity) => Math.abs((activity.difficulty ?? 2) - targetDifficulty)));
  const difficultyBalanced = available.filter((activity) => Math.abs((activity.difficulty ?? 2) - targetDifficulty) === bestDistance);
  return shuffled(difficultyBalanced, random)[0];
}

export function createAssessmentSession(args: { grade: GradeLevel; kind: AssessmentKind; subject?: Subject; skillId?: string; recentQuestIds?: string[]; now?: string; random?: () => number }): AssessmentSession {
  const { grade, kind, subject, skillId, recentQuestIds = [], now = new Date().toISOString(), random = Math.random } = args;
  const pool = assessmentPool(grade, kind, subject, skillId);
  const preferredLength = kind === 'skill' ? 3 : gradePresentation(grade).assessmentLength;
  const title = kind === 'general' ? `${gradeLabel(grade)} Compass Assessment` : kind === 'subject' ? `${subject?.[0].toUpperCase()}${subject?.slice(1)} Skill Check` : `${pool[0]?.topic ?? 'Focused'} Skill Check`;
  const session: AssessmentSession = {
    id: `assessment-${grade}-${kind}-${Date.parse(now) || now.replace(/\D/g, '')}`,
    kind, grade, subject, skillId, title, targetCount: Math.min(preferredLength, pool.length), activityIds: [], currentActivityId: null, attempts: [], recentQuestIds,
    startedAt: now, updatedAt: now, paused: false,
  };
  const first = chooseNextAssessmentActivity(session, random);
  return { ...session, currentActivityId: first?.id ?? null };
}

export function submitAssessmentAnswer(session: AssessmentSession, activity: GradedActivity, correct: boolean, hintUsed: boolean, now = new Date().toISOString(), random: () => number = Math.random) {
  const attempt: LearningAttempt = {
    id: `${session.id}-attempt-${session.attempts.length + 1}`,
    activityId: activity.id, grade: session.grade, subject: activity.subject, skillId: activity.skillId, skillDescription: activity.skillDescription,
    correct, hintUsed, difficulty: activity.difficulty ?? 2, mode: 'assessment', occurredAt: now,
  };
  let updated: AssessmentSession = { ...session, activityIds: [...session.activityIds, activity.id], attempts: [...session.attempts, attempt], updatedAt: now };
  const complete = updated.attempts.length >= updated.targetCount;
  if (complete) updated = { ...updated, currentActivityId: null, paused: false, completedAt: now };
  else updated = { ...updated, currentActivityId: chooseNextAssessmentActivity(updated, random)?.id ?? null };
  return { session: updated, attempt, complete: Boolean(updated.completedAt) };
}

export function practiceAttempt(activity: GradedActivity, correct: boolean, hintUsed: boolean, now = new Date().toISOString()): LearningAttempt {
  return { id: `practice-${activity.id}-${Date.parse(now) || now.replace(/\D/g, '')}`, activityId: activity.id, grade: activity.grade, subject: activity.subject, skillId: activity.skillId, skillDescription: activity.skillDescription, correct, hintUsed, difficulty: activity.difficulty ?? 2, mode: 'practice', occurredAt: now };
}

export function calculateMastery(attempts: LearningAttempt[]): Omit<SkillMastery, 'skillId' | 'skillDescription' | 'subject'> {
  const uniqueActivities = new Set(attempts.map((attempt) => attempt.activityId)).size;
  const weightedTotal = attempts.reduce((sum, attempt) => sum + (attempt.mode === 'assessment' ? 2 : 1) * (0.8 + attempt.difficulty * 0.1), 0);
  const weightedCorrect = attempts.reduce((sum, attempt) => sum + (attempt.correct ? (attempt.mode === 'assessment' ? 2 : 1) * (0.8 + attempt.difficulty * 0.1) * (attempt.hintUsed ? 0.8 : 1) : 0), 0);
  const score = weightedTotal ? Math.round(weightedCorrect / weightedTotal * 100) : 0;
  let label: MasteryLabel = 'Not enough evidence';
  if (uniqueActivities >= 2 && weightedTotal >= 3) label = score < 45 ? 'Beginning' : score < 65 ? 'Developing' : score < 85 ? 'Secure' : uniqueActivities >= 4 ? 'Advanced' : 'Secure';
  return {
    label, score, attempts: attempts.length, uniqueActivities, correct: attempts.filter((attempt) => attempt.correct).length, hints: attempts.filter((attempt) => attempt.hintUsed).length,
    evidence: uniqueActivities < 2 ? 'More activities needed' : `${uniqueActivities} different activities · ${attempts.length} total attempts`,
  };
}

export function masteryBySkill(attempts: LearningAttempt[]): SkillMastery[] {
  const groups = new Map<string, LearningAttempt[]>();
  for (const attempt of attempts) groups.set(attempt.skillId, [...(groups.get(attempt.skillId) ?? []), attempt]);
  return [...groups.entries()].map(([skillId, skillAttempts]) => ({
    skillId, skillDescription: skillAttempts[0].skillDescription, subject: skillAttempts[0].subject, ...calculateMastery(skillAttempts),
  })).sort((left, right) => right.score - left.score);
}

export function buildAssessmentReport(session: AssessmentSession): AssessmentReport {
  const skills = masteryBySkill(session.attempts);
  const subjectScores = (['science', 'math', 'english'] as Subject[]).map((subject) => ({ subject, attempts: session.attempts.filter((attempt) => attempt.subject === subject) }))
    .filter((item) => item.attempts.length).map((item) => ({ subject: item.subject, score: calculateMastery(item.attempts).score }));
  const regionForSubject: Record<Subject, RegionId> = { science: 'science', math: 'math', english: 'english' };
  const recommendedRegions = subjectScores.sort((left, right) => left.score - right.score).slice(0, 2).map((item) => regionForSubject[item.subject]);
  const completedAt = session.completedAt ?? session.updatedAt;
  const duration = Math.max(1, Math.round((Date.parse(completedAt) - Date.parse(session.startedAt)) / 60000));
  return {
    id: `report-${session.id}`, sessionId: session.id, kind: session.kind, grade: session.grade, subject: session.subject, title: session.title, completedAt, minutes: duration,
    correct: session.attempts.filter((attempt) => attempt.correct).length, attempts: session.attempts.length, hints: session.attempts.filter((attempt) => attempt.hintUsed).length, skills,
    strongest: skills.filter((skill) => skill.label === 'Secure' || skill.label === 'Advanced').map((skill) => skill.skillDescription).slice(0, 3),
    focusAreas: skills.filter((skill) => skill.label === 'Beginning' || skill.label === 'Developing' || skill.label === 'Not enough evidence').sort((left, right) => left.score - right.score).map((skill) => skill.skillDescription).slice(0, 3),
    recommendedRegions: recommendedRegions.length ? recommendedRegions : ['puzzle'],
  };
}

export function availableSkills(grade: GradeLevel, subject: Subject) {
  return [...new Map(questionBank[grade][subject].filter((activity) => activity.assessmentEligible).map((activity) => [activity.skillId, { id: activity.skillId, topic: activity.topic, description: activity.skillDescription }])).values()];
}
