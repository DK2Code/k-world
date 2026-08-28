import { gradeContexts, gradeLevels, gradeNumber } from './grades.ts';
import { questionBank } from './question-bank.ts';
import type { GradeLevel, QuestVariant, Region, RegionId, WonderFact } from './types.ts';

export { gradeLevels } from './grades.ts';

export const regions: Region[] = [
  { id: 'science', name: 'Science Jungle', short: 'Science', icon: '✿', color: '#2ea875', subject: 'science', level: 1, guide: 'Professor Pip', guideIcon: '●', description: 'A living laboratory where every leaf hides a discovery.', position: { x: 17, y: 25 } },
  { id: 'math', name: 'Number Kingdom', short: 'Math', icon: '∑', color: '#f39a45', subject: 'math', level: 1, guide: 'Sir Sum-a-Lot', guideIcon: '◆', description: 'Repair the royal starship with patterns and number power.', position: { x: 48, y: 47 } },
  { id: 'english', name: 'Storybook Forest', short: 'English', icon: 'Aa', color: '#7457d9', subject: 'english', level: 1, guide: 'Willa Wordwing', guideIcon: '✦', description: 'Words grow on trees and every path begins a new tale.', position: { x: 80, y: 24 } },
  { id: 'puzzle', name: 'Puzzle Peaks', short: 'Mixed quest', icon: '◈', color: '#4b8fd6', subject: 'mixed', level: 2, guide: 'Yeti Yara', guideIcon: '▲', description: 'A mountaintop trial that mixes every explorer skill.', position: { x: 25, y: 76 } },
  { id: 'inventor', name: "Inventor's Island", short: 'STEM', icon: '⚙', color: '#dc6270', subject: 'mixed', level: 3, guide: 'Tinker Tavi', guideIcon: '■', description: 'Build, test, improve—then make something brilliant.', position: { x: 76, y: 76 } },
];

const q = (region: RegionId, id: string, title: string, activity: string, intro: string, purpose: string): QuestVariant => ({ region, id: `${region}-${id}`, title, activity, intro, purpose });

export const questVariants: Record<RegionId, QuestVariant[]> = {
  science: [
    q('science', 'habitat-rescue', 'Habitat Rescue', 'Animal sorting expedition', 'A windstorm mixed up the jungle trail signs. Use science clues to guide every creature home.', 'Classify living things and connect adaptations to habitats.'),
    q('science', 'plant-power', 'Plant Power Lab', 'Living-world investigation', 'The glow-vines are fading. Observe plants, energy, and ecosystems to help them shine again.', 'Explain plant structures, needs, and energy flow.'),
    q('science', 'body-detective', 'Body Detective', 'Life-science mystery', 'Professor Pip found a book of missing body clues. Solve the mystery one discovery at a time.', 'Connect body structures with their functions.'),
    q('science', 'space-signal', 'Signal from the Stars', 'Space and physics mission', 'A friendly satellite is sending scrambled science signals. Decode them before it passes overhead.', 'Reason about Earth, space, forces, light, and motion.'),
    q('science', 'weather-watch', 'Jungle Weather Watch', 'Earth-systems field study', 'The weather station needs careful observers. Gather clues from clouds, water, rocks, and seasons.', 'Observe patterns in weather and Earth systems.'),
    q('science', 'fair-test', 'The Fair-Test Expedition', 'Experiment design challenge', 'Pip has three curious ideas and needs a careful test. Choose evidence, variables, and fair comparisons.', 'Practice observation, evidence, and experimental reasoning.'),
  ],
  math: [
    q('math', 'pattern-bridge', 'The Pattern Bridge', 'Number-pattern crossing', 'The royal bridge changes with every step. Continue its patterns to make a safe path.', 'Recognize, describe, and extend patterns.'),
    q('math', 'dragon-delivery', 'Dragon Berry Delivery', 'Story problem adventure', 'Hungry hatchlings are waiting. Count and calculate the perfect number of glow-berries.', 'Apply operations to meaningful quantities.'),
    q('math', 'shape-castle', 'Castle of Shapes', 'Geometry building challenge', 'The castle towers lost their blueprints. Use shape and measurement clues to rebuild them.', 'Reason with shape, angle, area, and measurement.'),
    q('math', 'skyship-repair', 'Royal Skyship Repair', 'Arithmetic repair mission', 'The royal skyship needs number power. Solve each problem to charge another engine cell.', 'Build flexible and accurate calculation strategies.'),
    q('math', 'market-mystery', 'Moon-Market Mystery', 'Money, data, and fraction quest', 'The market stalls have mixed-up signs. Use fractions, money, and graphs to put things right.', 'Interpret rational numbers, money, and data.'),
    q('math', 'logic-labyrinth', 'The Logic Labyrinth', 'Multi-step reasoning trial', 'Each gate opens only when your reasoning is clear. Plan more than one step and test your answer.', 'Develop mathematical reasoning and problem-solving stamina.'),
  ],
  english: [
    q('english', 'spelling-sprint', 'The Spelling Sprint', 'Word-catching quest', 'Runaway letters are hiding among the trees. Catch the right words and return them to the library.', 'Strengthen phonics, spelling, and word patterns.'),
    q('english', 'sentence-repair', 'Sentence Repair Shop', 'Grammar fixing mission', 'A word storm jumbled the forest signs. Repair each sentence so travellers can find their way.', 'Apply grammar, agreement, capitalization, and punctuation.'),
    q('english', 'story-clues', 'The Story Clue Trail', 'Reading mystery', 'Willa left clues inside tiny tales. Read closely and uncover the path to the secret ending.', 'Use details for comprehension, sequence, and inference.'),
    q('english', 'vocabulary-garden', 'Vocabulary Garden', 'Meaning and word-choice quest', 'The word-flowers bloom when the strongest word is chosen. Help the whole garden grow.', 'Grow vocabulary through context, roots, and word relationships.'),
    q('english', 'authors-lantern', "The Author's Lantern", 'Purpose and point-of-view search', 'A lantern reveals why each message was written and who is telling the story.', 'Analyze purpose, perspective, and text structure.'),
    q('english', 'story-workshop', 'Story Workshop', 'Revision and storytelling challenge', 'The forest theatre needs clear, lively lines. Arrange, revise, and polish its newest story.', 'Improve sentence fluency, organization, and expression.'),
  ],
  puzzle: [
    q('puzzle', 'yeti-logic', 'Yeti Yara’s Logic Trail', 'Balanced mixed-subject quest', 'Yara marked a safe trail with science, number, and word clues. Follow them to the summit.', 'Connect science, math, and English reasoning.'),
    q('puzzle', 'crystal-sequence', 'Crystal Sequence', 'Pattern and clue hunt', 'Mountain crystals are flashing in a secret order. Combine every explorer skill to decode them.', 'Recognize patterns and justify choices across subjects.'),
    q('puzzle', 'mystery-doors', 'The Three Mystery Doors', 'Choice and deduction challenge', 'Each door asks a different kind of question. Solve all three to open the peak observatory.', 'Switch flexibly among different kinds of evidence.'),
    q('puzzle', 'summit-mix', 'Summit Skill Mix', 'Mixed-subject boss challenge', 'A playful snowstorm mixed every lesson together. Sort out the clues and calm the mountain.', 'Retrieve and apply learning in a varied sequence.'),
    q('puzzle', 'evidence-expedition', 'Evidence Expedition', 'Explain-and-check adventure', 'Footprints, number marks, and story scraps cross the snow. Decide which evidence fits each mystery.', 'Evaluate evidence and eliminate unsupported answers.'),
    q('puzzle', 'aurora-code', 'The Aurora Code', 'Multi-format puzzle mission', 'The northern lights are painting a code in facts, quantities, and words. Decode each glowing band.', 'Combine classification, calculation, and language skills.'),
  ],
  inventor: [
    q('inventor', 'blueprint-builder', 'Blueprint Builder', 'Creative STEM planning', 'Tinker Tavi has an idea but the blueprint is incomplete. Add the right science, number, and word clues.', 'Plan designs using evidence, measurement, and clear labels.'),
    q('inventor', 'prototype-test', 'Prototype Test Run', 'Test-and-improve mission', 'A new island machine almost works. Investigate each problem and improve the design.', 'Use fair tests and learn from results.'),
    q('inventor', 'energy-machine', 'The Clean Energy Machine', 'Energy and calculation quest', 'Power the workshop with a smart new machine by solving its mixed STEM controls.', 'Connect energy ideas with measurement and calculation.'),
    q('inventor', 'invention-fair', 'Island Invention Fair', 'Mixed-subject showcase', 'The invention fair opens soon. Complete every challenge to prepare Tavi’s surprising creation.', 'Communicate design choices and solve mixed problems.'),
    q('inventor', 'measure-twice', 'Measure Twice, Build Once', 'Precision engineering challenge', 'The bridge parts must fit on the first try. Measure, calculate, and check every instruction.', 'Apply measurement, geometry, and precise communication.'),
    q('inventor', 'design-review', 'The Great Design Review', 'Evidence and revision workshop', 'Friendly inventors have shared early models. Study the evidence and suggest the most useful improvement.', 'Compare prototypes and justify test-based improvements.'),
  ],
};

const mixedFacts = (grade: GradeLevel, region: 'puzzle' | 'inventor') => {
  const advanced = gradeNumber(grade) >= 9;
  if (region === 'puzzle') return advanced
    ? ['A counterexample can disprove a general claim.', 'Organizing evidence in a table can reveal relationships.', 'A strong conclusion must fit every relevant clue.', 'Uncertainty should be reported when evidence is incomplete.', 'Changing strategies is useful when new evidence contradicts a model.']
    : ['Breaking a hard problem into smaller parts is a powerful strategy.', 'A table can organize clues so patterns are easier to see.', 'Checking an answer in a different way can reveal mistakes.', 'A useful clue must fit every rule in the puzzle.', 'Explaining your idea can help you check it.'];
  return advanced
    ? ['Engineers evaluate trade-offs among performance, cost, safety, and environmental impact.', 'Replication helps show whether a test result is reliable.', 'A model is useful when its assumptions and limits are understood.', 'Design reviews connect measurements to specific improvements.', 'Technical communication should let another person reproduce a process.']
    : ['Inventors test ideas, learn what happened, and try again.', 'A prototype is an early model used to test an idea.', 'Measuring helps parts fit together.', 'A fair test changes one variable while keeping others controlled.', 'Clear labels help another person build from a blueprint.'];
};

export const wonderFacts: WonderFact[] = gradeLevels.flatMap(({ grade }) => regions.flatMap((region) => {
  const texts = region.subject === 'mixed'
    ? mixedFacts(grade, region.id as 'puzzle' | 'inventor')
    : questionBank[grade][region.subject].slice(0, 5).map((activity) => activity.explanation);
  return texts.map((text, index) => ({ id: `grade-${grade}-${region.id}-fact-${index + 1}`, grade, region: region.id, text: `${gradeContexts[grade]} discovery: ${text}` }));
}));

export const factsFor = (grade: GradeLevel, region: RegionId) => wonderFacts.filter((fact) => fact.grade === grade && fact.region === region);

export const learningResources = [
  { name: 'Khan Academy Kids', url: 'https://learn.khanacademy.org/khan-academy-kids/' },
  { name: 'Khan Academy', url: 'https://www.khanacademy.org/' },
  { name: 'ReadWorks', url: 'https://www.readworks.org/' },
  { name: 'CommonLit', url: 'https://www.commonlit.org/' },
  { name: 'CK-12', url: 'https://www.ck12.org/' },
  { name: 'NRICH Mathematics', url: 'https://nrich.maths.org/' },
  { name: 'Math at Home', url: 'https://mathathome.mathlearningcenter.org/' },
  { name: 'NASA Lessons and Activities', url: 'https://science.nasa.gov/learn/lessons-and-activities/' },
  { name: 'Core Knowledge Curriculum', url: 'https://www.coreknowledge.org/download-free-curriculum/' },
  { name: 'PBS LearningMedia', url: 'https://www.pbslearningmedia.org/' },
] as const;
