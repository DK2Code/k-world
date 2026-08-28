import type { AgeGroup, QuestVariant, Region, RegionId, WonderFact } from './types.ts';

export const ageGroups: { range: AgeGroup; label: string; note: string; color: string }[] = [
  { range: '5–7', label: 'Little Explorer', note: 'Big pictures & gentle puzzles', color: 'coral' },
  { range: '8–10', label: 'Brave Adventurer', note: 'Stories, riddles & discoveries', color: 'gold' },
  { range: '11–13', label: 'Master Pathfinder', note: 'Deeper quests & challenges', color: 'violet' },
];

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

const factTexts: Record<AgeGroup, Record<RegionId, string[]>> = {
  '5–7': {
    science: ['A butterfly tastes with its feet!', 'Some frogs can breathe through their skin.', 'Sunflowers turn toward bright light as they grow.', 'Water can be a liquid, solid ice, or invisible water vapour.', 'Your heart is a strong muscle that pumps blood around your body.'],
    math: ['A triangle always has three sides and three corners.', 'Zero is a number that means none.', 'An even number can be shared into two equal groups.', 'A cube has six square faces.', 'Two halves fit together to make one whole.'],
    english: ['Every sentence begins with a capital letter.', 'Rhyming words end with the same sound.', 'A verb can tell what someone or something does.', 'A question mark shows that a sentence asks something.', 'Adding s often makes a word mean more than one.'],
    puzzle: ['Your brain grows stronger when you try a new kind of puzzle.', 'Looking for a pattern can make a hard puzzle easier.', 'Crossing out answers that cannot work is a useful clue strategy.', 'You can solve a big problem one small step at a time.', 'Explaining your idea can help you check it.'],
    inventor: ['Inventors test ideas, learn what happened, and try again.', 'A model is a small or simple version of an idea.', 'Measuring helps parts fit together.', 'A strong bridge spreads weight across its parts.', 'Inventors use pictures and words to share how a design works.'],
  },
  '8–10': {
    science: ['A teaspoon of healthy soil can contain billions of microorganisms.', 'Sound travels as vibrations through matter.', 'Saturn’s rings are made mostly of ice particles and rock.', 'Plants release oxygen while making sugar through photosynthesis.', 'The water cycle moves water through evaporation, condensation, and precipitation.'],
    math: ['A fraction describes equal parts of one whole.', 'The perimeter is the distance all the way around a shape.', 'A right angle measures 90 degrees.', 'Equivalent fractions name the same amount in different ways.', 'Probability compares favourable outcomes with all possible outcomes.'],
    english: ['A synonym is a word with the same or a very similar meaning.', 'A prefix is added to the beginning of a word to change its meaning.', 'Readers make inferences by combining text clues with what they know.', 'The main idea is the most important point a text communicates.', 'A narrator’s point of view affects which details a reader receives.'],
    puzzle: ['Breaking a hard problem into smaller parts is a powerful strategy.', 'A table can organize clues so patterns are easier to see.', 'Checking an answer in a different way can reveal mistakes.', 'A useful clue must fit every rule in the puzzle.', 'Mixed puzzles train your brain to switch strategies.'],
    inventor: ['A prototype is an early model used to test an idea.', 'A fair test changes one variable while keeping others the same.', 'Engineers record measurements so tests can be compared.', 'Clear labels help another person build from a blueprint.', 'A design constraint is a limit that an invention must work within.'],
  },
  '11–13': {
    science: ['Plants transform light energy into chemical energy during photosynthesis.', 'DNA carries hereditary information in living organisms.', 'Electric current is the movement of electric charge.', 'Greenhouse gases absorb and re-emit infrared energy in the atmosphere.', 'A controlled experiment compares results while changing one independent variable.'],
    math: ['A percentage is a ratio measured out of one hundred.', 'The slope of a line describes its rate of change.', 'The mean can be affected strongly by an extreme value.', 'A prism’s volume equals the area of its base multiplied by its height.', 'Equivalent ratios describe the same proportional relationship.'],
    english: ['A metaphor compares unlike things without using “like” or “as.”', 'An independent clause can stand alone as a complete sentence.', 'Authors choose text structures to organize ideas for a purpose.', 'Strong textual evidence directly supports an inference or claim.', 'Revision improves meaning and flow; editing corrects conventions.'],
    puzzle: ['Logic puzzles use rules and deduction to eliminate impossible answers.', 'A counterexample can prove that a general claim is false.', 'Useful evidence is relevant, accurate, and sufficient for the conclusion.', 'Representing a problem with a diagram can reveal hidden relationships.', 'Flexible thinkers change strategies when new evidence appears.'],
    inventor: ['Engineers improve designs by testing, measuring, and iterating.', 'Trade-offs occur when improving one feature makes another harder to achieve.', 'A design review uses evidence to decide what should change next.', 'Precision describes how closely repeated measurements agree.', 'Technical communication should be clear enough for someone else to reproduce a result.'],
  },
};

export const wonderFacts: WonderFact[] = (Object.entries(factTexts) as [AgeGroup, Record<RegionId, string[]>][]).flatMap(([age, byRegion]) =>
  (Object.entries(byRegion) as [RegionId, string[]][]).flatMap(([region, texts]) => texts.map((text, index) => ({ id: `${age.replace('–', '-')}-${region}-fact-${index + 1}`, age, region, text }))),
);

export const factsFor = (age: AgeGroup, region: RegionId) => wonderFacts.filter((fact) => fact.age === age && fact.region === region);

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
