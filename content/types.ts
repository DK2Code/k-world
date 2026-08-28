export type AgeGroup = '5–7' | '8–10' | '11–13';
export type Subject = 'science' | 'math' | 'english';
export type RegionId = 'science' | 'math' | 'english' | 'puzzle' | 'inventor';
export type Difficulty = 1 | 2 | 3;
export type ActivityType = 'multiple-choice' | 'true-false' | 'ordering' | 'matching' | 'numeric';

type ActivityBase = {
  id: string;
  age: AgeGroup;
  subject: Subject;
  topic: string;
  activityType: ActivityType;
  activity: string;
  prompt: string;
  hint: string;
  explanation: string;
  token: string;
  difficulty?: Difficulty;
};

export type MultipleChoiceActivity = ActivityBase & {
  activityType: 'multiple-choice';
  choices: string[];
  answer: string;
};

export type TrueFalseActivity = ActivityBase & {
  activityType: 'true-false';
  answer: boolean;
};

export type OrderingActivity = ActivityBase & {
  activityType: 'ordering';
  items: string[];
  correctOrder: string[];
};

export type MatchingActivity = ActivityBase & {
  activityType: 'matching';
  pairs: { left: string; right: string }[];
};

export type NumericActivity = ActivityBase & {
  activityType: 'numeric';
  answer: number;
  tolerance?: number;
  suffix?: string;
};

export type Activity = MultipleChoiceActivity | TrueFalseActivity | OrderingActivity | MatchingActivity | NumericActivity;

export type QuestVariant = {
  id: string;
  region: RegionId;
  title: string;
  activity: string;
  intro: string;
  purpose: string;
};

export type WonderFact = {
  id: string;
  age: AgeGroup;
  region: RegionId;
  text: string;
};

export type Region = {
  id: RegionId;
  name: string;
  short: string;
  icon: string;
  color: string;
  subject: Subject | 'mixed';
  level: number;
  guide: string;
  guideIcon: string;
  description: string;
  position: { x: number; y: number };
};
