import { buildAssessmentReport, calculateMastery, createAssessmentSession, getActivity, submitAssessmentAnswer } from '../content/assessment.ts';
import { correctResponseFor, isActivityCorrect } from '../content/evaluation.ts';
import { gradeLevels } from '../content/grades.ts';
import { narrationDelivery, prepareNarrationText, rankNarratorVoices, resolveNarratorVoice, splitNarration } from '../content/narration.ts';
import { migrateProfile } from '../content/profile.ts';
import { allActivities, questionBank } from '../content/question-bank.ts';
import { selectQuestActivities, selectQuestVariant } from '../content/rotation.ts';
import { questVariants, regions, wonderFacts } from '../content/world.ts';
import type { GradeLevel, GradedActivity, RegionId, Subject } from '../content/types.ts';

const errors: string[] = [];
const grades = gradeLevels.map((item) => item.grade);
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

for (const grade of grades) {
  for (const subject of subjects) {
    const pool = questionBank[grade][subject];
    if (pool.length < 24) fail(`${grade} ${subject} has ${pool.length} activities; at least 24 are required.`);
    const formats = new Set(pool.map((activity) => activity.activityType));
    if (formats.size < 3) fail(`${grade} ${subject} has only ${formats.size} activity formats; at least 3 are required.`);
    const assessmentPool = pool.filter((activity) => activity.assessmentEligible);
    if (assessmentPool.length < 6) fail(`${grade} ${subject} has fewer than 6 assessment-eligible activities.`);
    if (new Set(assessmentPool.map((activity) => activity.skillId)).size < 3) fail(`${grade} ${subject} assessment pool covers fewer than 3 skills.`);
    for (let left = 0; left < pool.length; left += 1) {
      for (let right = left + 1; right < pool.length; right += 1) {
        if (similarity(pool[left].prompt, pool[right].prompt) >= 0.92) fail(`${grade} ${subject} prompts appear near-duplicate: ${pool[left].id} and ${pool[right].id}.`);
      }
    }
  }
}

if (allActivities.length < 936) fail(`Question bank has ${allActivities.length} activities; expected at least 936 for 13 grades.`);
if (!unique(allActivities.map((activity) => activity.id))) fail('Activity IDs must be globally unique.');
if (!unique(allActivities.map((activity) => normalize(activity.prompt)))) fail('Activity prompts must be globally unique after normalization.');

for (const activity of allActivities) {
  const required = [activity.id, activity.grade, activity.subject, activity.topic, activity.skillId, activity.skillDescription, activity.activityType, activity.activity, activity.prompt, activity.hint, activity.explanation, activity.token];
  if (required.some((value) => String(value).trim() === '')) fail(`${activity.id || '(missing id)'} has an empty required field.`);
  if (!/^[a-z0-9-]+$/.test(activity.id)) fail(`${activity.id} is not a stable lowercase ID.`);
  if (!activity.assessmentEligible && ['9', '10', '11', '12'].includes(activity.grade) && activity.id.includes('extension')) fail(`${activity.id} should be assessment eligible.`);
  if (!isActivityCorrect(activity, correctResponseFor(activity))) fail(`${activity.id} could not be completed with its stored correct response.`);
  if (activity.activityType === 'multiple-choice') {
    if (!activity.choices.includes(activity.answer)) fail(`${activity.id} answer is absent from its choices.`);
    if (activity.choices.length < 3 || !unique(activity.choices.map(exactKey))) fail(`${activity.id} has malformed or duplicate choices.`);
  }
  if (activity.activityType === 'ordering') {
    if (activity.items.length < 3 || activity.items.length !== activity.correctOrder.length || !unique(activity.items) || !unique(activity.correctOrder)) fail(`${activity.id} has malformed ordering data.`);
    if ([...activity.items].sort().join('|') !== [...activity.correctOrder].sort().join('|')) fail(`${activity.id} ordering items do not match its correct order.`);
  }
  if (activity.activityType === 'matching' && (activity.pairs.length < 3 || !unique(activity.pairs.map((pair) => exactKey(pair.left))) || !unique(activity.pairs.map((pair) => exactKey(pair.right))))) fail(`${activity.id} has malformed matching pairs.`);
  if (activity.activityType === 'numeric' && (!Number.isFinite(activity.answer) || (activity.tolerance !== undefined && (!Number.isFinite(activity.tolerance) || activity.tolerance < 0)))) fail(`${activity.id} has an invalid numeric answer.`);
}

for (const regionId of regionIds) {
  if (questVariants[regionId].length < 6) fail(`${regionId} has fewer than 6 quest variants.`);
  if (!unique(questVariants[regionId].map((quest) => quest.id))) fail(`${regionId} has duplicate quest IDs.`);
  for (const grade of grades) {
    const factCount = wonderFacts.filter((fact) => fact.grade === grade && fact.region === regionId).length;
    if (factCount < 5) fail(`${grade} ${regionId} has only ${factCount} Wonder Facts; at least 5 are required.`);
  }
}

let seed = 123456789;
const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
for (const grade of grades) {
  for (const regionId of regionIds as RegionId[]) {
    let questionHistory: string[] = ['legacy:prompt-that-no-longer-exists'];
    let questHistory: string[] = ['legacy-quest-id'];
    let previousIds: string[] = [];
    for (let visit = 0; visit < 10; visit += 1) {
      const selected = selectQuestActivities(grade, regionId, questionHistory, random);
      const quest = selectQuestVariant(regionId, questHistory, random);
      if (selected.activities.length !== 3 || !unique(selected.activities.map((activity) => activity.id))) fail(`${grade} ${regionId} did not select 3 unique activities on visit ${visit + 1}.`);
      if (visit > 0 && selected.activities.some((activity) => previousIds.includes(activity.id))) fail(`${grade} ${regionId} repeated an activity from the immediately preceding quest.`);
      const region = regions.find((item) => item.id === regionId);
      if (region?.subject === 'mixed' && new Set(selected.activities.map((activity) => activity.subject)).size !== 3) fail(`${grade} ${regionId} did not produce a balanced mixed-subject quest.`);
      if (!quest.quest || !quest.history.length) fail(`${regionId} quest rotation failed.`);
      previousIds = selected.activities.map((activity) => activity.id);
      questionHistory = selected.history;
      questHistory = quest.history;
    }
  }
}

for (const grade of grades) {
  for (const subject of subjects) {
    let session = createAssessmentSession({ grade, kind: 'subject', subject, recentQuestIds: ['legacy-id'], now: '2026-01-01T00:00:00.000Z', random });
    const seen = new Set<string>();
    while (!session.completedAt) {
      const activity = getActivity(session.currentActivityId);
      if (!activity) { fail(`${grade} ${subject} assessment could not find its next activity.`); break; }
      if (seen.has(activity.id)) fail(`${grade} ${subject} assessment repeated ${activity.id}.`);
      seen.add(activity.id);
      session = submitAssessmentAnswer(session, activity, true, false, '2026-01-01T00:08:00.000Z', random).session;
    }
    if (session.attempts.length !== session.targetCount) fail(`${grade} ${subject} assessment completed with the wrong number of attempts.`);
    const report = buildAssessmentReport(session);
    if (report.attempts !== session.targetCount || !report.skills.length) fail(`${grade} ${subject} report generation failed.`);
  }
}

const oneAttempt = calculateMastery([{ id: 'a', activityId: 'one', grade: '5', subject: 'math', skillId: 'skill', skillDescription: 'Skill', correct: true, hintUsed: false, difficulty: 3, mode: 'assessment', occurredAt: '2026-01-01T00:00:00.000Z' }]);
if (oneAttempt.label !== 'Not enough evidence') fail('Mastery was claimed from only one activity.');
const secureAttempts = [1, 2, 3, 4].map((index) => ({ id: `s${index}`, activityId: `secure-${index}`, grade: '5' as GradeLevel, subject: 'math' as Subject, skillId: 'skill', skillDescription: 'Skill', correct: true, hintUsed: false, difficulty: 2 as const, mode: 'assessment' as const, occurredAt: `2026-01-01T00:0${index}:00.000Z` }));
if (!['Secure', 'Advanced'].includes(calculateMastery(secureAttempts).label)) fail('Mastery did not recognize repeated successful evidence.');

const legacy = migrateProfile({ age: '8–10', nickname: 'Legacy Nova', xp: 145, stars: 22, badges: ['Trailblazer'], sound: false, questHistory: { science: ['old-question'] }, progress: { science: { correct: 7, attempts: 9 } } });
if (legacy.grade !== null || legacy.legacyAgeGroup !== '8–10' || legacy.nickname !== 'Legacy Nova' || legacy.xp !== 145 || legacy.stars !== 22 || legacy.sound !== false || legacy.progress.science.correct !== 7 || legacy.questHistory.science[0] !== 'old-question') fail('Legacy-save migration did not preserve progress and settings.');
if (legacy.saveVersion !== 2 || legacy.assessmentHistory.length !== 0) fail('Legacy-save migration did not add the versioned assessment fields.');

const rankedVoices = rankNarratorVoices([
  { voiceURI: 'robot', name: 'Robot eSpeak', lang: 'en-US', localService: true, default: true },
  { voiceURI: 'natural', name: 'Microsoft Aria Online (Natural)', lang: 'en-US', localService: false, default: false },
  { voiceURI: 'spanish', name: 'Natural Spanish', lang: 'es-MX', localService: true, default: false },
]);
if (rankedVoices.length !== 2 || rankedVoices[0].voiceURI !== 'natural' || !rankedVoices[0].recommended || rankedVoices[0].quality !== 'enhanced') fail('Narrator voice ranking did not prefer and identify the suitable natural English voice.');
if (resolveNarratorVoice(rankedVoices, 'missing')?.voiceURI !== 'natural' || resolveNarratorVoice([], 'missing') !== undefined) fail('Narrator voice fallback selection failed.');
const speechFriendly = prepareNarrationText('✦ Solve 8 × 4 = 32. Earn 5 XP.');
if (!speechFriendly.includes('8 times 4 equals 32') || !speechFriendly.includes('explorer points') || speechFriendly.includes('✦')) fail('Narration text preparation did not translate educational symbols and decorative text.');
if (splitNarration('First, notice the clues. Next, compare the evidence. Finally, choose the strongest explanation.', 35).length < 2) fail('Narration did not split longer text into natural segments.');
const earlyDelivery = narrationDelivery('K', .9, 1);
const highDelivery = narrationDelivery('12', .9, 1.1);
if (earlyDelivery.rate >= highDelivery.rate || earlyDelivery.pauseMs <= highDelivery.pauseMs || highDelivery.pitch > 1.01) fail('Grade-aware narrator delivery is not sufficiently distinct or mature.');
const storytellerDelivery = narrationDelivery('5', .9, 1, 'storyteller', 1, 'Notice the clues before you choose.');
const coachDelivery = narrationDelivery('5', .9, 1, 'coach', 2, 'Choose the strongest answer?');
if (storytellerDelivery.pauseMs <= coachDelivery.pauseMs || storytellerDelivery.style === coachDelivery.style) fail('Narrator styles did not produce distinct pacing and labels.');
const narrationProfile = migrateProfile({ narratorVoiceURI: 'saved-voice', narratorStyle: 'storyteller', speechRate: 9, speechPitch: .2, readDockPlacement: 'top-left', readDockCollapsed: true, grade: '5', progress: { math: { correct: 4, attempts: 6 } }, gradeProgress: { '3': { science: { correct: 2, attempts: 3 } } } });
if (narrationProfile.narratorVoiceURI !== 'saved-voice' || narrationProfile.narratorStyle !== 'storyteller' || narrationProfile.speechRate !== 1.2 || narrationProfile.speechPitch !== .9) fail('Narrator preference migration or safe limits failed.');
if (narrationProfile.readDockPlacement !== 'top-left' || !narrationProfile.readDockCollapsed || narrationProfile.gradeProgress['3']?.science.correct !== 2 || narrationProfile.gradeProgress['5']?.math.correct !== 4) fail('Movable narration controls or per-grade progress did not migrate safely.');

if (errors.length) {
  console.error(`Content validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const formats = [...new Set(allActivities.map((activity: GradedActivity) => activity.activityType))].join(', ');
  console.log(`Content validation passed: ${allActivities.length} activities across ${grades.length} grades, ${Object.values(questVariants).flat().length} quests, ${wonderFacts.length} facts.`);
  console.log(`Assessment, migration, mastery, narration, report, rotation, and answer checks passed. Formats: ${formats}.`);
}
