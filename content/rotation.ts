import { questionBank } from './question-bank.ts';
import { questVariants, regions } from './world.ts';
import type { GradeLevel, GradedActivity, QuestVariant, RegionId, Subject } from './types.ts';

const shuffle = <T,>(items: T[], random: () => number = Math.random) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
  }
  return copy;
};

export const poolForRegion = (grade: GradeLevel, regionId: RegionId): GradedActivity[] => {
  const subject = regions.find((region) => region.id === regionId)?.subject;
  if (subject && subject !== 'mixed') return questionBank[grade][subject];
  return (['science', 'math', 'english'] as Subject[]).flatMap((item) => questionBank[grade][item]);
};

const pickDistinct = (pool: GradedActivity[], count: number, random: () => number, existing: GradedActivity[] = []) => {
  const chosen = [...existing];
  const unused = () => pool.filter((activity) => !chosen.some((item) => item.id === activity.id));
  for (const candidate of shuffle(unused(), random)) {
    if (chosen.length >= count) break;
    if (!chosen.some((item) => item.topic === candidate.topic) && !chosen.some((item) => item.activityType === candidate.activityType)) chosen.push(candidate);
  }
  for (const candidate of shuffle(unused(), random)) {
    if (chosen.length >= count) break;
    if (!chosen.some((item) => item.topic === candidate.topic)) chosen.push(candidate);
  }
  for (const candidate of shuffle(unused(), random)) {
    if (chosen.length >= count) break;
    chosen.push(candidate);
  }
  return chosen.slice(0, count);
};

export function selectQuestActivities(grade: GradeLevel, regionId: RegionId, savedHistory: string[] = [], random: () => number = Math.random) {
  const fullPool = poolForRegion(grade, regionId);
  const validIds = new Set(fullPool.map((activity) => activity.id));
  const validHistory = savedHistory.filter((id, index) => validIds.has(id) && savedHistory.indexOf(id) === index);
  const previousIds = validHistory.slice(-3);
  const unvisited = fullPool.filter((activity) => !validHistory.includes(activity.id));
  const startingNewCycle = unvisited.length < 3;
  const eligible = startingNewCycle ? fullPool.filter((activity) => !previousIds.includes(activity.id)) : unvisited;
  const region = regions.find((item) => item.id === regionId);
  let selected: GradedActivity[] = [];

  if (region?.subject === 'mixed') {
    for (const subject of ['science', 'math', 'english'] as Subject[]) {
      const candidates = eligible.filter((activity) => activity.subject === subject);
      const formatFresh = candidates.filter((activity) => !selected.some((item) => item.activityType === activity.activityType));
      selected = pickDistinct(formatFresh.length ? formatFresh : candidates, selected.length + 1, random, selected);
    }
  } else {
    selected = pickDistinct(eligible, 3, random);
  }

  if (selected.length < 3) selected = pickDistinct(fullPool.filter((activity) => !previousIds.includes(activity.id)), 3, random, selected);
  const selectedIds = selected.map((activity) => activity.id);
  return { activities: shuffle(selected, random), history: startingNewCycle ? selectedIds : [...validHistory, ...selectedIds] };
}

export function selectQuestVariant(regionId: RegionId, savedHistory: string[] = [], random: () => number = Math.random): { quest: QuestVariant; history: string[] } {
  const variants = questVariants[regionId];
  const validIds = new Set(variants.map((variant) => variant.id));
  const validHistory = savedHistory.filter((id, index) => validIds.has(id) && savedHistory.indexOf(id) === index);
  let eligible = variants.filter((variant) => !validHistory.includes(variant.id));
  const startingNewCycle = eligible.length === 0;
  if (startingNewCycle) eligible = variants.filter((variant) => variant.id !== validHistory.at(-1));
  const quest = shuffle(eligible, random)[0] ?? variants[0];
  return { quest, history: startingNewCycle ? [quest.id] : [...validHistory, quest.id] };
}
