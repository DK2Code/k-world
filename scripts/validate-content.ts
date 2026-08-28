import { allActivities, questionBank } from '../content/question-bank.ts';
import { correctResponseFor, isActivityCorrect } from '../content/evaluation.ts';
import { selectQuestActivities, selectQuestVariant } from '../content/rotation.ts';
import { questVariants, regions, wonderFacts } from '../content/world.ts';
import type { Activity, AgeGroup, RegionId, Subject } from '../content/types.ts';

const errors: string[] = [];
const ages: AgeGroup[] = ['5–7', '8–10', '11–13'];
const subjects: Subject[] = ['science', 'math', 'english'];
const regionIds = regions.map((region) => region.id);
const fail = (message: string) => errors.push(message);
const normalize = (value: string) => value.toLowerCase().replace(/[“”'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value: string) => new Set(normalize(value).split(' ').filter(Boolean));
const similarity = (left: string, right: string) => {
  const a = words(left); const b = words(right);
  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
};
const unique = (values: string[]) => new Set(values).size === values.length;
const exactKey = (value: string) => value.toLowerCase().trim();

for (const age of ages) {
  for (const subject of subjects) {
    const pool = questionBank[age][subject];
    if (pool.length < 24) fail(`${age} ${subject} has ${pool.length} activities; at least 24 are required.`);
    const formats = new Set(pool.map((activity) => activity.activityType));
    if (formats.size < 3) fail(`${age} ${subject} has only ${formats.size} activity formats; at least 3 are required.`);
  }
}

if (allActivities.length < 216) fail(`Question bank has ${allActivities.length} activities; at least 216 are required.`);
const ids = allActivities.map((activity) => activity.id);
if (!unique(ids)) fail('Activity IDs must be globally unique.');
const normalizedPrompts = allActivities.map((activity) => normalize(activity.prompt));
if (!unique(normalizedPrompts)) fail('Activity prompts must be unique after normalization.');

for (let left = 0; left < allActivities.length; left += 1) {
  for (let right = left + 1; right < allActivities.length; right += 1) {
    const first = allActivities[left]; const second = allActivities[right];
    if (first.subject === second.subject && first.age === second.age && similarity(first.prompt, second.prompt) >= 0.92) fail(`Prompts appear to be near-duplicates: ${first.id} and ${second.id}.`);
  }
}

for (const activity of allActivities) {
  const required = [activity.id, activity.age, activity.subject, activity.topic, activity.activityType, activity.activity, activity.prompt, activity.hint, activity.explanation, activity.token];
  if (required.some((value) => String(value).trim() === '')) fail(`${activity.id || '(missing id)'} has an empty required field.`);
  if (!/^[a-z0-9-]+$/.test(activity.id)) fail(`${activity.id} is not a stable lowercase ID.`);
  if (activity.activityType === 'multiple-choice') {
    if (!activity.choices.includes(activity.answer)) fail(`${activity.id} answer is absent from its choices.`);
    if (activity.choices.length < 3 || !unique(activity.choices.map(exactKey))) fail(`${activity.id} has malformed or duplicate choices.`);
  }
  if (activity.activityType === 'ordering') {
    if (activity.items.length < 3 || activity.items.length !== activity.correctOrder.length || !unique(activity.items) || !unique(activity.correctOrder)) fail(`${activity.id} has malformed ordering data.`);
    if ([...activity.items].sort().join('|') !== [...activity.correctOrder].sort().join('|')) fail(`${activity.id} ordering items do not match its correct order.`);
  }
  if (activity.activityType === 'matching') {
    if (activity.pairs.length < 3 || !unique(activity.pairs.map((pair) => exactKey(pair.left))) || !unique(activity.pairs.map((pair) => exactKey(pair.right)))) fail(`${activity.id} has malformed matching pairs.`);
  }
  if (activity.activityType === 'numeric' && (!Number.isFinite(activity.answer) || (activity.tolerance !== undefined && (!Number.isFinite(activity.tolerance) || activity.tolerance < 0)))) fail(`${activity.id} has an invalid numeric answer.`);
}

for (const regionId of regionIds) {
  if (questVariants[regionId].length < 6) fail(`${regionId} has fewer than 6 quest variants.`);
  if (!unique(questVariants[regionId].map((quest) => quest.id))) fail(`${regionId} has duplicate quest IDs.`);
  for (const age of ages) {
    const factCount = wonderFacts.filter((fact) => fact.age === age && fact.region === regionId).length;
    if (factCount < 5) fail(`${age} ${regionId} has only ${factCount} Wonder Facts; at least 5 are required.`);
  }
}

let seed = 123456789;
const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
for (const age of ages) {
  for (const regionId of regionIds as RegionId[]) {
    let questionHistory: string[] = ['legacy:prompt-that-no-longer-exists'];
    let questHistory: string[] = ['legacy-quest-id'];
    let previousIds: string[] = [];
    for (let visit = 0; visit < 12; visit += 1) {
      const selected = selectQuestActivities(age, regionId, questionHistory, random);
      const quest = selectQuestVariant(regionId, questHistory, random);
      if (selected.activities.length !== 3 || !unique(selected.activities.map((activity) => activity.id))) fail(`${age} ${regionId} did not select 3 unique activities on visit ${visit + 1}.`);
      for (const activity of selected.activities) {
        if (!isActivityCorrect(activity, correctResponseFor(activity))) fail(`${activity.id} could not be completed with its stored correct response.`);
      }
      if (visit > 0 && selected.activities.some((activity) => previousIds.includes(activity.id))) fail(`${age} ${regionId} repeated an activity from the immediately preceding quest.`);
      const region = regions.find((item) => item.id === regionId);
      if (region?.subject === 'mixed' && new Set(selected.activities.map((activity) => activity.subject)).size !== 3) fail(`${age} ${regionId} did not produce a balanced mixed-subject quest.`);
      if (!quest.quest || !quest.history.length) fail(`${regionId} quest rotation failed.`);
      previousIds = selected.activities.map((activity) => activity.id);
      questionHistory = selected.history;
      questHistory = quest.history;
    }
  }
}

if (errors.length) {
  console.error(`Content validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const formats = [...new Set(allActivities.map((activity: Activity) => activity.activityType))].join(', ');
  console.log(`Content validation passed: ${allActivities.length} activities, ${Object.values(questVariants).flat().length} quests, ${wonderFacts.length} facts.`);
  console.log(`Activity formats: ${formats}.`);
}
