'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type AgeGroup = '5–7' | '8–10' | '11–13';
type Subject = 'science' | 'math' | 'english';
type Screen = 'welcome' | 'character' | 'intro' | 'map' | 'region' | 'game' | 'rewards' | 'backpack' | 'progress' | 'settings' | 'parent';

type Question = {
  subject: Subject;
  prompt: string;
  choices: string[];
  answer: string;
  hint: string;
  explanation: string;
  token: string;
  activity?: string;
};

type QuestVariant = { id: string; title: string; activity: string; intro: string };

type Profile = {
  age: AgeGroup | null;
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
  speechRate: number;
  reducedMotion: boolean;
  largeText: boolean;
  easyRead: boolean;
  playMinutes: number;
  worldPosition: { x: number; y: number };
  questHistory: Record<string, string[]>;
  questionHistory: Record<string, string[]>;
};

const STORE_KEY = 'kworld-adventure-v1';
const ageGroups: { range: AgeGroup; label: string; note: string; color: string }[] = [
  { range: '5–7', label: 'Little Explorer', note: 'Big pictures & gentle puzzles', color: 'coral' },
  { range: '8–10', label: 'Brave Adventurer', note: 'Stories, riddles & discoveries', color: 'gold' },
  { range: '11–13', label: 'Master Pathfinder', note: 'Deeper quests & challenges', color: 'violet' },
];

const regions = [
  { id: 'science', name: 'Science Jungle', short: 'Science', icon: '✿', color: '#2ea875', subject: 'science' as Subject, level: 1, guide: 'Professor Pip', guideIcon: '●', description: 'A living laboratory where every leaf hides a discovery.', position: { x: 17, y: 25 } },
  { id: 'math', name: 'Number Kingdom', short: 'Math', icon: '∑', color: '#f39a45', subject: 'math' as Subject, level: 1, guide: 'Sir Sum-a-Lot', guideIcon: '◆', description: 'Repair the royal starship with patterns and number power.', position: { x: 48, y: 47 } },
  { id: 'english', name: 'Storybook Forest', short: 'English', icon: 'Aa', color: '#7457d9', subject: 'english' as Subject, level: 1, guide: 'Willa Wordwing', guideIcon: '✦', description: 'Words grow on trees and every path begins a new tale.', position: { x: 80, y: 24 } },
  { id: 'puzzle', name: 'Puzzle Peaks', short: 'Mixed quest', icon: '◈', color: '#4b8fd6', subject: 'mixed' as const, level: 2, guide: 'Yeti Yara', guideIcon: '▲', description: 'A mountaintop trial that mixes every explorer skill.', position: { x: 25, y: 76 } },
  { id: 'inventor', name: "Inventor's Island", short: 'STEM', icon: '⚙', color: '#dc6270', subject: 'mixed' as const, level: 3, guide: 'Tinker Tavi', guideIcon: '■', description: 'Build, test, improve—then make something brilliant.', position: { x: 76, y: 76 } },
];

const facts: Record<AgeGroup, Record<string, string>> = {
  '5–7': {
    science: 'A butterfly tastes with its feet!', math: 'A triangle always has three sides and three corners.', english: 'Every sentence begins with a capital letter.',
    puzzle: 'Your brain grows stronger when you try a new kind of puzzle.', inventor: 'Inventors test ideas, learn what happened, and try again.',
  },
  '8–10': {
    science: 'A teaspoon of healthy soil can hold more living things than there are people on Earth.', math: 'A fraction describes equal parts of one whole.', english: 'A synonym is a word with the same or a very similar meaning.',
    puzzle: 'Breaking a hard problem into smaller parts is a powerful strategy.', inventor: 'A prototype is an early model used to test an idea.',
  },
  '11–13': {
    science: 'Plants transform light energy into chemical energy during photosynthesis.', math: 'A percentage is a ratio measured out of one hundred.', english: 'A metaphor compares unlike things without using “like” or “as.”',
    puzzle: 'Logic puzzles use rules and deduction to eliminate impossible answers.', inventor: 'Engineers improve designs by testing, measuring, and iterating.',
  },
};

const questions: Record<AgeGroup, Record<Subject, Question[]>> = {
  '5–7': {
    science: [
      { subject: 'science', token: '≈', prompt: 'Pip found a frog. Where will it feel most at home?', choices: ['A pond', 'A dry desert', 'A snowy peak'], answer: 'A pond', hint: 'Frogs need water to keep their skin moist.', explanation: 'Frogs are amphibians. Most frogs live near fresh water such as ponds.', },
      { subject: 'science', token: '✿', prompt: 'Which part of a plant drinks up water from the soil?', choices: ['Roots', 'Flowers', 'Fruit'], answer: 'Roots', hint: 'Look below the ground.', explanation: 'Roots hold a plant in place and absorb water from the soil.', },
      { subject: 'science', token: '☾', prompt: 'Which animal is usually awake at night?', choices: ['Owl', 'Butterfly', 'Chicken'], answer: 'Owl', hint: 'It has large eyes and says “hoot.”', explanation: 'Many owls are nocturnal, which means they are active at night.', },
    ],
    math: [
      { subject: 'math', token: '4+3', prompt: 'Four moon-mice meet three more. How many are there altogether?', choices: ['6', '7', '8'], answer: '7', hint: 'Start at 4 and count forward 3 steps.', explanation: '4 + 3 = 7.', },
      { subject: 'math', token: '10−2', prompt: 'Ten glow-gems are in the chest. Two roll away. How many remain?', choices: ['7', '8', '12'], answer: '8', hint: 'Count backward twice from 10.', explanation: '10 − 2 = 8.', },
      { subject: 'math', token: '2 4 6', prompt: 'The stepping stones say 2, 4, 6... Which number comes next?', choices: ['7', '8', '10'], answer: '8', hint: 'The pattern adds 2 each time.', explanation: 'Adding 2 after 6 gives 8.', },
    ],
    english: [
      { subject: 'english', token: 'Aa', prompt: 'Choose the word that completes the story: “The fox ___ fast.”', choices: ['runs', 'blue', 'under'], answer: 'runs', hint: 'Which word tells what the fox does?', explanation: '“Runs” is the action word, so it completes the sentence.', },
      { subject: 'english', token: '•••', prompt: 'Which word is spelled correctly?', choices: ['frog', 'froh', 'farg'], answer: 'frog', hint: 'Listen for the sounds: f–r–o–g.', explanation: 'Frog is spelled F-R-O-G.', },
      { subject: 'english', token: '?', prompt: 'Which mark belongs at the end? “Where is the treasure__”', choices: ['?', '.', '!'], answer: '?', hint: 'The sentence asks something.', explanation: 'A question mark goes at the end of a question.', },
    ],
  },
  '8–10': {
    science: [
      { subject: 'science', token: '≈', prompt: 'A newly hatched frog is swimming with a tail. What is it called?', choices: ['Tadpole', 'Larva', 'Fledgling'], answer: 'Tadpole', hint: 'It begins with the letter T.', explanation: 'A young frog begins life as a tadpole and changes through metamorphosis.', },
      { subject: 'science', token: '☀', prompt: 'What do green plants use to make their own food?', choices: ['Sunlight', 'Moonlight', 'Soil alone'], answer: 'Sunlight', hint: 'It gives Earth light and warmth.', explanation: 'Plants use sunlight, water, and carbon dioxide during photosynthesis.', },
      { subject: 'science', token: '◎', prompt: 'Which body part pumps blood around your body?', choices: ['Heart', 'Lungs', 'Stomach'], answer: 'Heart', hint: 'You can feel it beating in your chest.', explanation: 'The heart is a muscle that pumps blood through blood vessels.', },
    ],
    math: [
      { subject: 'math', token: '8×4', prompt: 'Eight dragon hatchlings each need four glow-berries. How many berries do they need?', choices: ['24', '32', '36'], answer: '32', hint: 'Add 8 four times, or multiply 8 by 4.', explanation: '8 × 4 = 32 glow-berries.', },
      { subject: 'math', token: '¾', prompt: 'The crew found ¾ of 20 star-coins. How many coins is that?', choices: ['5', '15', '16'], answer: '15', hint: 'One quarter of 20 is 5. Now take three groups.', explanation: '¾ of 20 is 3 × 5, which equals 15.', },
      { subject: 'math', token: '6×5', prompt: 'A garden is 6 steps long and 5 steps wide. What is its area?', choices: ['11', '22', '30'], answer: '30', hint: 'Area of a rectangle is length × width.', explanation: '6 × 5 = 30 square steps.', },
    ],
    english: [
      { subject: 'english', token: '≈', prompt: 'Choose a synonym for “enormous.”', choices: ['Huge', 'Tiny', 'Quiet'], answer: 'Huge', hint: 'A synonym has a similar meaning.', explanation: 'Huge and enormous both mean very large.', },
      { subject: 'english', token: 'Aa', prompt: 'Which sentence uses capitals correctly?', choices: ['Mira visited london.', 'mira visited London.', 'Mira visited London.'], answer: 'Mira visited London.', hint: 'Names of people and cities need capitals.', explanation: 'Mira and London are proper nouns, so both begin with capital letters.', },
      { subject: 'english', token: '☁', prompt: '“The path was slick, so Jo walked carefully.” What does slick mean?', choices: ['Slippery', 'Bright', 'Narrow'], answer: 'Slippery', hint: 'Why would Jo need to walk carefully?', explanation: 'The context clue “walked carefully” tells us slick means slippery.', },
    ],
  },
  '11–13': {
    science: [
      { subject: 'science', token: 'CO₂', prompt: 'Which gas do plants absorb during photosynthesis?', choices: ['Carbon dioxide', 'Oxygen', 'Nitrogen only'], answer: 'Carbon dioxide', hint: 'Humans breathe this gas out.', explanation: 'Plants use carbon dioxide and water to make glucose, releasing oxygen.', },
      { subject: 'science', token: 'G', prompt: 'Which force keeps planets in orbit around the Sun?', choices: ['Gravity', 'Friction', 'Magnetism'], answer: 'Gravity', hint: 'It also pulls objects toward Earth.', explanation: 'The Sun’s gravity continually bends each planet’s path into an orbit.', },
      { subject: 'science', token: '↻', prompt: 'What role do fungi often play in an ecosystem?', choices: ['Decomposer', 'Producer', 'Pollinator only'], answer: 'Decomposer', hint: 'They break down dead material.', explanation: 'Many fungi recycle nutrients by decomposing dead organisms.', },
    ],
    math: [
      { subject: 'math', token: '25%', prompt: 'A shield has 80 energy units. It uses 25%. How many units were used?', choices: ['20', '25', '60'], answer: '20', hint: '25% is the same as one quarter.', explanation: 'One quarter of 80 is 20.', },
      { subject: 'math', token: '⅓+⅓', prompt: 'What is ⅓ + ⅓?', choices: ['⅔', '⅙', '1'], answer: '⅔', hint: 'The denominators match, so add the numerators.', explanation: 'One third plus one third equals two thirds.', },
      { subject: 'math', token: 'd÷t', prompt: 'A skyship travels 150 km in 3 hours. What is its average speed?', choices: ['45 km/h', '50 km/h', '75 km/h'], answer: '50 km/h', hint: 'Divide distance by time.', explanation: '150 ÷ 3 = 50 kilometers per hour.', },
    ],
    english: [
      { subject: 'english', token: '≈', prompt: 'Which sentence contains a metaphor?', choices: ['The moon was a silver coin.', 'The moon shone brightly.', 'The moon looked like a coin.'], answer: 'The moon was a silver coin.', hint: 'A metaphor compares without “like” or “as.”', explanation: 'The sentence directly describes the moon as a silver coin.', },
      { subject: 'english', token: '→', prompt: 'Which sentence uses active voice?', choices: ['Nia solved the riddle.', 'The riddle was solved by Nia.', 'The riddle had been solved.'], answer: 'Nia solved the riddle.', hint: 'In active voice, the subject performs the action.', explanation: 'Nia is the subject, and she performs the action “solved.”', },
      { subject: 'english', token: ';', prompt: 'Choose the best punctuation: “The storm passed__ the explorers continued.”', choices: [';', ',', ':'], answer: ';', hint: 'Both sides could stand as complete sentences.', explanation: 'A semicolon can join two closely related independent clauses.', },
    ],
  },
};

const extraQuestions: Record<AgeGroup, Record<Subject, Question[]>> = {
  '5–7': {
    science: [
      { subject: 'science', activity: 'Weather Watch', token: '☀', prompt: 'Which object gives Earth light during the day?', choices: ['The Sun', 'The Moon', 'A cloud'], answer: 'The Sun', hint: 'It looks bright in the daytime sky.', explanation: 'The Sun is a star that gives Earth light and warmth.' },
      { subject: 'science', activity: 'Animal Detective', token: '羽', prompt: 'Which covering helps a bird fly and stay warm?', choices: ['Feathers', 'Scales', 'Shells'], answer: 'Feathers', hint: 'Birds have many light, soft ones.', explanation: 'Feathers help birds fly, stay warm, and keep dry.' },
      { subject: 'science', activity: 'Water Lab', token: '❄', prompt: 'What happens to water when it gets very cold?', choices: ['It freezes', 'It grows', 'It glows'], answer: 'It freezes', hint: 'Think about an ice cube.', explanation: 'Water freezes and becomes solid ice when it gets cold enough.' },
    ],
    math: [
      { subject: 'math', activity: 'Shape Builder', token: '□', prompt: 'Which shape has four equal sides?', choices: ['Square', 'Triangle', 'Circle'], answer: 'Square', hint: 'It looks like a box face.', explanation: 'A square has four straight sides that are all the same length.' },
      { subject: 'math', activity: 'Berry Counter', token: '5+5', prompt: 'Five red berries and five blue berries fill a basket. How many berries are there?', choices: ['8', '10', '12'], answer: '10', hint: 'Count on five more from 5.', explanation: '5 + 5 = 10 berries.' },
      { subject: 'math', activity: 'Number Gate', token: '9>6', prompt: 'Which number is greater?', choices: ['9', '6', 'They match'], answer: '9', hint: 'The greater number is farther along when you count.', explanation: 'Nine is greater than six.' },
    ],
    english: [
      { subject: 'english', activity: 'Rhyme Catch', token: '♫', prompt: 'Which word rhymes with cat?', choices: ['Hat', 'Cup', 'Dog'], answer: 'Hat', hint: 'Rhyming words have the same ending sound.', explanation: 'Cat and hat both end with the “at” sound.' },
      { subject: 'english', activity: 'Sound Search', token: 'B', prompt: 'Which word begins with the same sound as ball?', choices: ['Boat', 'Moon', 'Sun'], answer: 'Boat', hint: 'Listen for the “b” sound.', explanation: 'Ball and boat both begin with the letter B sound.' },
      { subject: 'english', activity: 'Word Garden', token: '+s', prompt: 'There is one star. Now there are two ___.', choices: ['stars', 'star', 'starred'], answer: 'stars', hint: 'We often add S when there is more than one.', explanation: 'Stars is the plural word for more than one star.' },
    ],
  },
  '8–10': {
    science: [
      { subject: 'science', activity: 'Matter Mixer', token: 'H₂O', prompt: 'Ice melts into liquid water. What caused this change?', choices: ['Heat energy', 'Gravity alone', 'A shadow'], answer: 'Heat energy', hint: 'Melting happens when a solid gets warmer.', explanation: 'Ice absorbs heat energy and changes from a solid into a liquid.' },
      { subject: 'science', activity: 'Food-Chain Rescue', token: '→', prompt: 'In grass → rabbit → fox, which organism is the producer?', choices: ['Grass', 'Rabbit', 'Fox'], answer: 'Grass', hint: 'A producer makes its own food using sunlight.', explanation: 'Grass is a plant, so it makes food through photosynthesis.' },
      { subject: 'science', activity: 'Space Signal', token: '♁', prompt: 'Which planet is known for its large rings?', choices: ['Saturn', 'Mercury', 'Mars'], answer: 'Saturn', hint: 'Its rings are made mostly of ice and rock.', explanation: 'Saturn has the most visible ring system in our solar system.' },
    ],
    math: [
      { subject: 'math', activity: 'Castle Perimeter', token: 'P', prompt: 'A square garden has sides of 7 metres. What is its perimeter?', choices: ['14 m', '28 m', '49 m'], answer: '28 m', hint: 'Add all four equal sides.', explanation: '7 + 7 + 7 + 7 = 28 metres.' },
      { subject: 'math', activity: 'Fair Share', token: '24÷6', prompt: 'Twenty-four moon cakes are shared equally among six crews. How many does each crew get?', choices: ['4', '6', '18'], answer: '4', hint: 'Find the number that makes 6 × something equal 24.', explanation: '24 ÷ 6 = 4 moon cakes per crew.' },
      { subject: 'math', activity: 'Fraction Forge', token: '½', prompt: 'Which fraction is equal to one half?', choices: ['2/4', '1/3', '3/4'], answer: '2/4', hint: 'Two of four equal parts is half of all four.', explanation: 'Dividing the top and bottom of 2/4 by 2 gives 1/2.' },
    ],
    english: [
      { subject: 'english', activity: 'Verb Vine', token: 'RUN', prompt: 'Which word is the verb in “The silver bird sings softly”?', choices: ['sings', 'silver', 'softly'], answer: 'sings', hint: 'A verb shows an action or state.', explanation: 'Sings tells what the bird is doing.' },
      { subject: 'english', activity: 'Prefix Portal', token: 're-', prompt: 'What does the prefix re- mean in rebuild?', choices: ['Again', 'Before', 'Not'], answer: 'Again', hint: 'To replay is to play one more time.', explanation: 'The prefix re- often means again, so rebuild means build again.' },
      { subject: 'english', activity: 'Clue Finder', token: '⌕', prompt: '“Lena packed boots and a raincoat. Dark clouds filled the sky.” What will probably happen?', choices: ['It will rain', 'It will snow indoors', 'The sun will disappear forever'], answer: 'It will rain', hint: 'Use the clothing and clouds as clues.', explanation: 'The raincoat and dark clouds support the inference that rain is coming.' },
    ],
  },
  '11–13': {
    science: [
      { subject: 'science', activity: 'Cell Scanner', token: 'DNA', prompt: 'Which cell structure contains most of a eukaryotic cell’s DNA?', choices: ['Nucleus', 'Cell membrane', 'Cytoplasm'], answer: 'Nucleus', hint: 'It acts like the cell’s information centre.', explanation: 'In eukaryotic cells, most genetic material is stored in the nucleus.' },
      { subject: 'science', activity: 'Energy Lab', token: '→', prompt: 'A solar panel changes light energy mainly into which form?', choices: ['Electrical energy', 'Sound energy', 'Nuclear energy'], answer: 'Electrical energy', hint: 'It can power lights and devices.', explanation: 'Photovoltaic cells convert light energy into electrical energy.' },
      { subject: 'science', activity: 'Atom Forge', token: 'p⁺', prompt: 'Which particle has a positive electric charge?', choices: ['Proton', 'Electron', 'Neutron'], answer: 'Proton', hint: 'Electrons are negative and neutrons are neutral.', explanation: 'Protons have positive charge, electrons negative charge, and neutrons no charge.' },
    ],
    math: [
      { subject: 'math', activity: 'Equation Gate', token: '3x=21', prompt: 'Solve 3x = 21. What is x?', choices: ['7', '18', '63'], answer: '7', hint: 'Divide both sides by 3.', explanation: '21 ÷ 3 = 7, so x = 7.' },
      { subject: 'math', activity: 'Ratio Reactor', token: '2:5', prompt: 'Blue and gold crystals are in a 2:5 ratio. If there are 10 blue crystals, how many are gold?', choices: ['20', '25', '50'], answer: '25', hint: 'The blue amount was multiplied by 5.', explanation: 'Multiplying both parts of 2:5 by 5 gives 10:25.' },
      { subject: 'math', activity: 'Chance Chamber', token: 'P', prompt: 'A bag has 3 red and 7 blue gems. What is the probability of choosing a red gem?', choices: ['3/10', '7/10', '1/3'], answer: '3/10', hint: 'There are 10 gems altogether and 3 favourable outcomes.', explanation: 'Probability is favourable outcomes over total outcomes, so it is 3/10.' },
    ],
    english: [
      { subject: 'english', activity: 'Inference Trail', token: '⌕', prompt: '“Kai checked the clock twice and drummed his fingers.” What can you reasonably infer?', choices: ['Kai is impatient', 'Kai is asleep', 'Kai cannot see the clock'], answer: 'Kai is impatient', hint: 'Look at the repeated checking and restless movement.', explanation: 'Those details suggest Kai is waiting and becoming impatient.' },
      { subject: 'english', activity: 'Figurative Forge', token: '☁', prompt: 'Which sentence uses personification?', choices: ['The wind whispered through the pines.', 'The wind was cold.', 'The wind moved at 20 km/h.'], answer: 'The wind whispered through the pines.', hint: 'Personification gives a nonhuman thing a human action.', explanation: 'Whispering is a human action given to the wind.' },
      { subject: 'english', activity: 'Clause Builder', token: '+', prompt: 'Which group of words is an independent clause?', choices: ['The explorers reached camp.', 'Because the storm ended', 'While crossing the bridge'], answer: 'The explorers reached camp.', hint: 'It must express a complete thought on its own.', explanation: '“The explorers reached camp” has a subject, verb, and complete meaning.' },
    ],
  },
};

const questVariants: Record<string, QuestVariant[]> = {
  science: [
    { id: 'habitat-rescue', title: 'Habitat Rescue', activity: 'Animal sorting expedition', intro: 'A windstorm mixed up the jungle trail signs. Use science clues to guide every creature home.' },
    { id: 'plant-power', title: 'Plant Power Lab', activity: 'Living-world investigation', intro: 'The glow-vines are fading. Observe plants, energy, and ecosystems to help them shine again.' },
    { id: 'body-detective', title: 'Body Detective', activity: 'Life-science mystery', intro: 'Professor Pip found a book of missing body clues. Solve the mystery one discovery at a time.' },
    { id: 'space-signal', title: 'Signal from the Stars', activity: 'Space and physics mission', intro: 'A friendly satellite is sending scrambled science signals. Decode them before it passes overhead.' },
  ],
  math: [
    { id: 'pattern-bridge', title: 'The Pattern Bridge', activity: 'Number-pattern crossing', intro: 'The royal bridge changes with every step. Continue its patterns to make a safe path.' },
    { id: 'dragon-delivery', title: 'Dragon Berry Delivery', activity: 'Story problem adventure', intro: 'Hungry hatchlings are waiting. Count and calculate the perfect number of glow-berries.' },
    { id: 'shape-castle', title: 'Castle of Shapes', activity: 'Geometry building challenge', intro: 'The castle towers lost their blueprints. Use shape and measurement clues to rebuild them.' },
    { id: 'skyship-repair', title: 'Royal Skyship Repair', activity: 'Arithmetic repair mission', intro: 'The royal skyship needs number power. Solve each problem to charge another engine cell.' },
  ],
  english: [
    { id: 'spelling-sprint', title: 'The Spelling Sprint', activity: 'Word-catching quest', intro: 'Runaway letters are hiding among the trees. Catch the right words and return them to the library.' },
    { id: 'sentence-repair', title: 'Sentence Repair Shop', activity: 'Grammar fixing mission', intro: 'A word storm jumbled the forest signs. Repair each sentence so travellers can find their way.' },
    { id: 'story-clues', title: 'The Story Clue Trail', activity: 'Reading mystery', intro: 'Willa left clues inside tiny tales. Read closely and uncover the path to the secret ending.' },
    { id: 'vocabulary-garden', title: 'Vocabulary Garden', activity: 'Meaning and word-choice quest', intro: 'The word-flowers bloom when the strongest word is chosen. Help the whole garden grow.' },
  ],
  puzzle: [
    { id: 'yeti-logic', title: 'Yeti Yara’s Logic Trail', activity: 'Mixed-subject logic quest', intro: 'Yara marked a safe trail with science, number, and word clues. Follow them to the summit.' },
    { id: 'crystal-sequence', title: 'Crystal Sequence', activity: 'Pattern and clue hunt', intro: 'Mountain crystals are flashing in a secret order. Combine every explorer skill to decode them.' },
    { id: 'mystery-doors', title: 'The Three Mystery Doors', activity: 'Choice and deduction challenge', intro: 'Each door asks a different kind of question. Solve all three to open the peak observatory.' },
    { id: 'summit-mix', title: 'Summit Skill Mix', activity: 'Mixed-subject boss challenge', intro: 'A playful snowstorm mixed every lesson together. Sort out the clues and calm the mountain.' },
  ],
  inventor: [
    { id: 'blueprint-builder', title: 'Blueprint Builder', activity: 'Creative STEM planning', intro: 'Tinker Tavi has an idea but the blueprint is incomplete. Add the right science, number, and word clues.' },
    { id: 'prototype-test', title: 'Prototype Test Run', activity: 'Test-and-improve mission', intro: 'A new island machine almost works. Investigate each problem and improve the design.' },
    { id: 'energy-machine', title: 'The Clean Energy Machine', activity: 'Energy and calculation quest', intro: 'Power the workshop with a smart new machine by solving its mixed STEM controls.' },
    { id: 'invention-fair', title: 'Island Invention Fair', activity: 'Mixed-subject showcase', intro: 'The invention fair opens soon. Complete every challenge to prepare Tavi’s surprising creation.' },
  ],
};

const defaultProfile: Profile = {
  age: null, nickname: 'Nova', skin: 1, hair: 0, outfit: 0, explorerClass: 'Scientist', companion: 'Fox',
  xp: 0, stars: 0, badges: [], facts: [], items: [], completed: [],
  progress: { science: { correct: 0, attempts: 0 }, math: { correct: 0, attempts: 0 }, english: { correct: 0, attempts: 0 } },
  sound: true, narration: false, narrationAuto: false, speechRate: 0.9, reducedMotion: false, largeText: false, easyRead: false, playMinutes: 0,
  worldPosition: { x: 48, y: 20 },
  questHistory: {}, questionHistory: {},
};

const nicknames = ['Nova', 'Sunny Star', 'Clever Fox', 'Mighty Maple'];
const classes = [
  { name: 'Scientist', mark: '⚗', perk: 'Extra science hints' },
  { name: 'Number Wizard', mark: '∑', perk: 'Pattern power' },
  { name: 'Word Ranger', mark: 'Aa', perk: 'Vocabulary boost' },
  { name: 'Inventor', mark: '⚙', perk: 'Build bonus' },
];
const companions = [{ name: 'Fox', mark: '◇' }, { name: 'Owl', mark: '◉' }, { name: 'Cat', mark: '⌃' }];

function levelFromXp(xp: number) { return 1 + Math.floor(xp / 80); }
function mastery(correct: number, attempts: number) {
  if (!attempts) return 'Ready to grow';
  const ratio = correct / attempts;
  if (correct >= 6 && ratio >= .8) return 'Quest Master';
  if (correct >= 3 && ratio >= .6) return 'Confident';
  return 'Growing';
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
  }
  return copy;
}

function questionKey(question: Question) { return `${question.subject}:${question.prompt}`; }

function poolForRegion(age: AgeGroup, regionId: string) {
  const subject = regions.find((region) => region.id === regionId)?.subject;
  if (subject && subject !== 'mixed') return [...questions[age][subject], ...extraQuestions[age][subject]];
  return (['science', 'math', 'english'] as Subject[]).flatMap((item) => [...questions[age][item], ...extraQuestions[age][item]]);
}

function Avatar({ profile, small = false }: { profile: Profile; small?: boolean }) {
  return (
    <div className={`avatar ${small ? 'avatar-small' : ''}`} style={{ '--skin': ['#f1bf95', '#b97852', '#75442f'][profile.skin], '--outfit': ['#6d4ce8', '#ef7b55', '#278b75'][profile.outfit] } as React.CSSProperties} aria-label={`${profile.nickname}, ${profile.explorerClass}`}>
      <span className={`avatar-hair hair-${profile.hair}`} />
      <span className="avatar-head"><i /><i /><b /></span>
      <span className="avatar-neck" />
      <span className="avatar-shirt"><i>{classes.find((item) => item.name === profile.explorerClass)?.mark}</i></span>
      <span className="avatar-pack" />
      <span className="avatar-leg leg-left" /><span className="avatar-leg leg-right" />
    </div>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [hydrated, setHydrated] = useState(false);
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [activeRegionId, setActiveRegionId] = useState('science');
  const [activeQuest, setActiveQuest] = useState<QuestVariant>(questVariants.science[0]);
  const [questQuestions, setQuestQuestions] = useState<Question[]>([]);
  const [factOpen, setFactOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [reward, setReward] = useState({ xp: 0, stars: 0, badge: '' });
  const [customNickname, setCustomNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [parentAnswer, setParentAnswer] = useState('');
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const [spokenText, setSpokenText] = useState('');
  const [spokenWordIndex, setSpokenWordIndex] = useState(0);
  const [heroFacing, setHeroFacing] = useState<'left' | 'right'>('right');
  const [heroJumping, setHeroJumping] = useState(false);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Profile;
        // Restoring a local-only adventure is the intended one-time hydration step.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile({ ...defaultProfile, ...parsed, progress: { ...defaultProfile.progress, ...parsed.progress } });
        setSelectedAge(parsed.age);
        if (parsed.age) setScreen('map');
      }
    } catch { /* A fresh local adventure is always safe to start. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && profile.age) localStorage.setItem(STORE_KEY, JSON.stringify(profile));
  }, [profile, hydrated]);

  const level = levelFromXp(profile.xp);
  const activeRegion = regions.find((region) => region.id === activeRegionId) ?? regions[0];
  const currentQuestions = questQuestions.length ? questQuestions : poolForRegion(profile.age ?? '8–10', activeRegionId).slice(0, 3);
  const currentQuestion = currentQuestions[questionIndex];
  const nearbyRegion = useMemo(() => regions.find((region) => {
    const dx = region.position.x - profile.worldPosition.x;
    const dy = region.position.y - profile.worldPosition.y;
    return Math.sqrt(dx * dx + dy * dy) < 11;
  }), [profile.worldPosition]);

  const updateProfile = useCallback((patch: Partial<Profile>) => setProfile((current) => ({ ...current, ...patch })), []);
  const playTone = useCallback((happy = true) => {
    if (!profile.sound || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new AudioCtx(); const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.frequency.value = happy ? 620 : 220; gain.gain.setValueAtTime(.05, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .18);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .18);
    } catch { /* Sound is optional. */ }
  }, [profile.sound]);
  const speak = useCallback((text: string, force = false) => {
    if ((!profile.narration && !force) || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = profile.speechRate;
    utterance.pitch = 1.08;
    utterance.onstart = () => { setSpeechState('speaking'); setSpokenText(text); setSpokenWordIndex(0); };
    utterance.onboundary = (event) => {
      const before = text.slice(0, event.charIndex).trim();
      setSpokenWordIndex(before ? before.split(/\s+/).length : 0);
    };
    utterance.onend = () => setSpeechState('idle');
    utterance.onerror = () => setSpeechState('idle');
    window.speechSynthesis.speak(utterance);
  }, [profile.narration, profile.speechRate]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeechState('idle');
  }, []);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speechState === 'speaking') { window.speechSynthesis.pause(); setSpeechState('paused'); }
    else if (speechState === 'paused') { window.speechSynthesis.resume(); setSpeechState('speaking'); }
  };

  const screenNarration = useMemo(() => {
    if (screen === 'welcome') return 'Welcome to K World! Choose your age group so every adventure is just right for you. Ages five to seven. Ages eight to ten. Or ages eleven to thirteen.';
    if (screen === 'character') return 'Create your hero. Choose a skin tone, hair, outfit, explorer class, adventure nickname, and animal companion.';
    if (screen === 'intro') return `Explorer ${profile.nickname}! The Compass of Curiosity is glowing. Five realms need your questions, ideas, and courage.`;
    if (screen === 'map') return `World Explorer. Move ${profile.nickname} with the arrow keys, W A S D, or the big direction buttons. Walk close to a realm, then choose enter realm. ${regions.map((region) => `${region.name}, level ${region.level}.`).join(' ')}`;
    if (screen === 'region') return `Welcome to ${activeRegion.name}. Your new quest is ${activeQuest.title}. ${activeQuest.intro}`;
    if (screen === 'game' && currentQuestion) return `${currentQuestion.prompt} Your choices are ${currentQuestion.choices.join(', ')}.`;
    if (screen === 'rewards') return `Quest complete! Your curiosity lit the way. You earned ${reward.stars} stars and ${reward.xp} explorer points.`;
    if (screen === 'backpack') return `Explorer backpack. You have ${profile.facts.length} wonder facts, ${profile.items.length} quest treasures, and ${profile.badges.length} badges.`;
    if (screen === 'progress') return `${profile.nickname}'s progress. Level ${level}. ${profile.xp} explorer points and ${profile.stars} stars.`;
    if (screen === 'settings') return 'Sound and accessibility settings. You can turn on read aloud, automatic narration, slower or faster speech, reduced motion, larger words, and easy-read type.';
    return 'Grown-up corner. This private summary shows learning activity saved on this device.';
  }, [activeQuest, activeRegion, currentQuestion, level, profile, reward, screen]);

  useEffect(() => {
    if (profile.narration && profile.narrationAuto) speak(screenNarration, true);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [profile.narration, profile.narrationAuto, questionIndex, screen, screenNarration, speak]);

  const beginAdventure = () => {
    if (!selectedAge) return;
    updateProfile({ age: selectedAge, narration: selectedAge === '5–7', narrationAuto: selectedAge === '5–7' });
    setScreen('character');
  };

  const useCustomNickname = () => {
    const clean = customNickname.replace(/[^a-zA-Z0-9 \-]/g, '').trim().slice(0, 16);
    const blocked = ['hate', 'stupid', 'idiot', 'kill'];
    if (clean.length < 2 || blocked.some((word) => clean.toLowerCase().includes(word))) {
      setNicknameError('Try another friendly adventure nickname.'); return;
    }
    updateProfile({ nickname: clean }); setCustomNickname(clean); setNicknameError('');
  };

  const prepareQuest = useCallback((id: string) => {
    const age = profile.age ?? '8–10';
    const variants = questVariants[id] ?? questVariants.science;
    const usedQuestIds = profile.questHistory[id] ?? [];
    let availableVariants = variants.filter((variant) => !usedQuestIds.includes(variant.id));
    const questCycleComplete = availableVariants.length === 0;
    if (questCycleComplete) {
      const lastQuestId = usedQuestIds.at(-1);
      availableVariants = variants.filter((variant) => variant.id !== lastQuestId);
    }
    const nextQuest = shuffled(availableVariants)[0] ?? variants[0];

    const fullPool = poolForRegion(age, id);
    const usedQuestionIds = profile.questionHistory[id] ?? [];
    const previousQuestionIds = usedQuestionIds.slice(-3);
    const unusedQuestions = fullPool.filter((question) => !usedQuestionIds.includes(questionKey(question)));
    const questionCycleComplete = unusedQuestions.length < 3;
    const eligibleQuestions = questionCycleComplete
      ? fullPool.filter((question) => !previousQuestionIds.includes(questionKey(question)))
      : unusedQuestions;
    const region = regions.find((item) => item.id === id);
    const nextQuestions = region?.subject === 'mixed'
      ? (['science', 'math', 'english'] as Subject[]).map((subject) => shuffled(eligibleQuestions.filter((question) => question.subject === subject))[0]).filter((question): question is Question => Boolean(question))
      : shuffled(eligibleQuestions).slice(0, 3);
    const finalQuestions = nextQuestions.length === 3 ? shuffled(nextQuestions) : shuffled(fullPool).slice(0, 3);
    const selectedQuestionIds = finalQuestions.map(questionKey);

    setActiveQuest(nextQuest);
    setQuestQuestions(finalQuestions);
    setQuestionIndex(0); setSelectedAnswer(null); setCorrectAnswer(false); setShowHint(false); setScore(0);
    setProfile((current) => ({
      ...current,
      questHistory: { ...current.questHistory, [id]: questCycleComplete ? [nextQuest.id] : [...usedQuestIds, nextQuest.id] },
      questionHistory: { ...current.questionHistory, [id]: questionCycleComplete ? selectedQuestionIds : [...usedQuestionIds, ...selectedQuestionIds] },
    }));
  }, [profile.age, profile.questionHistory, profile.questHistory]);

  const enterRegion = useCallback((id: string) => {
    const region = regions.find((item) => item.id === id);
    if (!region || region.level > level) return;
    stopSpeech();
    prepareQuest(id);
    setActiveRegionId(id); setFactOpen(false); setScreen('region');
  }, [level, prepareQuest, stopSpeech]);

  const moveHero = useCallback((dx: number, dy: number) => {
    if (dx) setHeroFacing(dx < 0 ? 'left' : 'right');
    setProfile((current) => ({
      ...current,
      worldPosition: {
        x: Math.max(5, Math.min(94, current.worldPosition.x + dx)),
        y: Math.max(8, Math.min(88, current.worldPosition.y + dy)),
      },
    }));
  }, []);

  const jumpHero = useCallback(() => {
    setHeroJumping(true);
    if (jumpTimer.current) clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => setHeroJumping(false), profile.reducedMotion ? 80 : 520);
    playTone();
  }, [playTone, profile.reducedMotion]);

  const travelToRegion = (id: string) => {
    const destination = regions.find((region) => region.id === id);
    if (!destination) return;
    setProfile((current) => ({ ...current, worldPosition: { ...destination.position } }));
    playTone();
  };

  useEffect(() => {
    if (screen !== 'map') return;
    const step = profile.age === '5–7' ? 6 : 4;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, select, textarea')) return;
      const key = event.key.toLowerCase();
      const moves: Record<string, [number, number]> = {
        arrowleft: [-step, 0], a: [-step, 0], arrowright: [step, 0], d: [step, 0],
        arrowup: [0, -step], w: [0, -step], arrowdown: [0, step], s: [0, step],
      };
      if (moves[key]) { event.preventDefault(); moveHero(...moves[key]); }
      if (key === ' ') { event.preventDefault(); jumpHero(); }
      if (key === 'enter' && nearbyRegion && level >= nearbyRegion.level) { event.preventDefault(); enterRegion(nearbyRegion.id); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enterRegion, jumpHero, level, moveHero, nearbyRegion, profile.age, screen]);

  const discoverFact = () => {
    const fact = facts[profile.age ?? '8–10'][activeRegion.id];
    if (!profile.facts.includes(fact)) updateProfile({ facts: [...profile.facts, fact] });
    setFactOpen(true); playTone(); speak(fact);
  };

  const collectSecret = () => {
    const item = `${activeRegion.name} secret star`;
    if (profile.items.includes(item)) return;
    updateProfile({ items: [...profile.items, item], stars: profile.stars + 1 }); playTone();
  };

  const startGame = () => {
    setQuestionIndex(0); setSelectedAnswer(null); setCorrectAnswer(false); setShowHint(false); setScore(0); setScreen('game');
    speak(currentQuestions[0].prompt);
  };

  const restartQuest = () => {
    stopSpeech();
    setQuestionIndex(0); setSelectedAnswer(null); setCorrectAnswer(false); setShowHint(false); setScore(0);
    speak(`Restarting ${activeQuest.title}. ${currentQuestions[0].prompt}`);
  };

  const chooseNewQuest = () => {
    stopSpeech();
    prepareQuest(activeRegion.id);
    setFactOpen(false);
    setScreen('region');
  };

  const answerQuestion = (choice: string) => {
    if (correctAnswer) return;
    setSelectedAnswer(choice);
    const isCorrect = choice === currentQuestion.answer;
    const subject = currentQuestion.subject;
    const subjectProgress = profile.progress[subject];
    updateProfile({ progress: { ...profile.progress, [subject]: { attempts: subjectProgress.attempts + 1, correct: subjectProgress.correct + (isCorrect ? 1 : 0) } } });
    if (isCorrect) { setCorrectAnswer(true); setScore((value) => value + 1); playTone(); speak(`Correct! ${currentQuestion.explanation}`); }
    else { playTone(false); }
  };

  const finishGame = () => {
    const earnedXp = 25 + score * 10;
    const earnedStars = 1 + score;
    const badge = score === currentQuestions.length ? `${activeRegion.short} Trailblazer` : '';
    const badges = badge && !profile.badges.includes(badge) ? [...profile.badges, badge] : profile.badges;
    const item = `${activeRegion.short} quest token`;
    updateProfile({ xp: profile.xp + earnedXp, stars: profile.stars + earnedStars, badges, items: profile.items.includes(item) ? profile.items : [...profile.items, item], completed: [...profile.completed, activeRegion.id], playMinutes: profile.playMinutes + 4 });
    setReward({ xp: earnedXp, stars: earnedStars, badge }); setScreen('rewards');
  };

  const nextQuestion = () => {
    if (questionIndex === currentQuestions.length - 1) { finishGame(); return; }
    const next = questionIndex + 1; setQuestionIndex(next); setSelectedAnswer(null); setCorrectAnswer(false); setShowHint(false); speak(currentQuestions[next].prompt);
  };

  const resetAdventure = () => {
    localStorage.removeItem(STORE_KEY); setProfile(defaultProfile); setSelectedAge(null); setScreen('welcome'); setParentUnlocked(false);
  };

  const accessibilityClasses = [profile.reducedMotion ? 'reduce-motion' : '', profile.largeText ? 'large-text' : '', profile.easyRead ? 'easy-read' : ''].join(' ');

  return (
    <main className={`game-app screen-${screen} ${accessibilityClasses}`}>
      {screen === 'welcome' && (
        <section className="welcome-shell">
          <header className="welcome-nav">
            <div className="brand" aria-label="K World home"><span className="brand-mark" aria-hidden="true">K</span><span>K WORLD</span></div>
            <button className="sound-button" type="button" onClick={() => updateProfile({ sound: !profile.sound })} aria-pressed={profile.sound}><span aria-hidden="true">{profile.sound ? '♫' : '×'}</span> {profile.sound ? 'Sound on' : 'Sound off'}</button>
          </header>
          <div className="cloud cloud-one" /><div className="cloud cloud-two" /><span className="sky-star star-one">✦</span><span className="sky-star star-two">✦</span>
          <div className="welcome-content">
            <div className="onboarding-panel">
              <div className="eyebrow"><span>✦</span> Your adventure starts here</div>
              <h1>How old is our<br /><em>new explorer?</em></h1>
              <p className="intro">We’ll shape every story, puzzle, and discovery to be just right for you.</p>
              <ReadButton label="Read welcome aloud" onRead={() => speak(screenNarration, true)} />
              <div className="age-grid" role="radiogroup" aria-label="Choose your age range">
                {ageGroups.map((group) => (
                  <button key={group.range} type="button" role="radio" aria-checked={selectedAge === group.range} className={`age-card ${group.color} ${selectedAge === group.range ? 'selected' : ''}`} onClick={() => setSelectedAge(group.range)}>
                    <span className="age-number">{group.range}</span><span className="age-label">{group.label}</span><span className="age-note">{group.note}</span><span className="card-check" aria-hidden="true">✓</span>
                  </button>
                ))}
              </div>
              <button className="begin-button" type="button" disabled={!selectedAge} onClick={beginAdventure}>Begin my quest <span aria-hidden="true">→</span></button>
              <p className="privacy-note"><span aria-hidden="true">♡</span> No real name or personal details needed. Your adventure stays on this device.</p>
            </div>
            <div className="world-preview" aria-hidden="true">
              <div className="sun-orb"><span className="orbit orbit-one" /><span className="orbit orbit-two" /></div>
              <div className="floating-island island-back"><div className="mountain mountain-one" /><div className="mountain mountain-two" /><span className="tiny-flag">K</span></div>
              <div className="floating-island island-front"><div className="tree tree-one"><i /><b /></div><div className="tree tree-two"><i /><b /></div><div className="castle"><i /><i /><span /></div><div className="waterfall" /></div>
              <div className="guide-character"><span className="guide-hair" /><span className="guide-face"><i /><i /><b /></span><span className="guide-body"><i /></span><span className="guide-pack" /></div>
              <div className="speech-bubble"><span className="speech-spark">✦</span><strong>Oh, hello!</strong><span>I’ve been waiting for you.</span></div>
            </div>
          </div>
          <footer className="welcome-footer"><span>Made for curious minds</span><button onClick={() => setScreen('parent')}>Grown-up corner</button><button onClick={() => setScreen('settings')}>Accessibility</button></footer>
        </section>
      )}

      {screen === 'character' && (
        <section className="creator-screen">
          <header className="simple-header"><div className="brand"><span className="brand-mark">K</span><span>K WORLD</span></div><span className="step-pill">Step 2 of 2 · Create your hero</span></header>
          <div className="creator-layout">
            <aside className="hero-preview-card">
              <span className="tiny-label">Your explorer</span><Avatar profile={profile} />
              <div className="hero-nameplate"><strong>{profile.nickname}</strong><span>{profile.explorerClass} · with {profile.companion}</span></div>
              <div className="companion-orb" aria-hidden="true">{companions.find((item) => item.name === profile.companion)?.mark}<small>{profile.companion}</small></div>
            </aside>
            <div className="creator-controls">
              <div><span className="eyebrow"><span>✦</span> Make them yours</span><h2>Create your hero</h2><p>Choose a look, a special explorer class, and a trusty sidekick.</p></div>
              <div className="custom-row"><div className="control-group"><h3>Skin tone</h3><div className="swatch-row">{['#f1bf95', '#b97852', '#75442f'].map((color, index) => <button key={color} aria-label={`Skin tone ${index + 1}`} className={`round-swatch ${profile.skin === index ? 'active' : ''}`} style={{ background: color }} onClick={() => updateProfile({ skin: index })} />)}</div></div>
              <div className="control-group"><h3>Hair</h3><div className="segmented">{['Swoop', 'Curls', 'Spikes'].map((label, index) => <button key={label} className={profile.hair === index ? 'active' : ''} onClick={() => updateProfile({ hair: index })}>{label}</button>)}</div></div>
              <div className="control-group"><h3>Outfit</h3><div className="swatch-row">{['#6d4ce8', '#ef7b55', '#278b75'].map((color, index) => <button key={color} aria-label={`Outfit ${index + 1}`} className={`square-swatch ${profile.outfit === index ? 'active' : ''}`} style={{ background: color }} onClick={() => updateProfile({ outfit: index })} />)}</div></div></div>
              <div className="control-group"><h3>Choose your explorer class</h3><div className="class-grid">{classes.map((item) => <button key={item.name} className={profile.explorerClass === item.name ? 'active' : ''} onClick={() => updateProfile({ explorerClass: item.name })}><span>{item.mark}</span><strong>{item.name}</strong><small>{item.perk}</small></button>)}</div></div>
              <div className="creator-bottom-grid">
                <div className="control-group"><h3>Adventure nickname</h3><div className="nickname-row">{nicknames.map((name) => <button key={name} className={profile.nickname === name ? 'active' : ''} onClick={() => updateProfile({ nickname: name })}>{name}</button>)}</div><div className="custom-name"><input value={customNickname} maxLength={16} placeholder="Or make a friendly nickname" aria-label="Custom adventure nickname" onChange={(event) => setCustomNickname(event.target.value)} /><button onClick={useCustomNickname}>Use</button></div>{nicknameError && <small className="field-error">{nicknameError}</small>}</div>
                <div className="control-group"><h3>Animal companion</h3><div className="companion-row">{companions.map((item) => <button key={item.name} className={profile.companion === item.name ? 'active' : ''} onClick={() => updateProfile({ companion: item.name })}><span>{item.mark}</span>{item.name}</button>)}</div></div>
              </div>
              <button className="primary-action" onClick={() => setScreen(profile.completed.length ? 'map' : 'intro')}>{profile.completed.length ? 'Save hero & return' : 'Meet my hero'} <span>→</span></button>
            </div>
          </div>
        </section>
      )}

      {screen === 'intro' && (
        <section className="intro-screen">
          <div className="intro-stars" aria-hidden="true">✦ &nbsp; · &nbsp; ✦ &nbsp; · &nbsp; ✦</div>
          <div className="intro-card"><div className="intro-avatar"><Avatar profile={profile} /><span className="companion-intro">{companions.find((item) => item.name === profile.companion)?.mark}</span></div><div className="intro-copy"><span className="eyebrow"><span>✦</span> A new legend arrives</span><h2>Explorer {profile.nickname}!</h2><p>The Compass of Curiosity is glowing. That only happens when a brave new thinker enters K World.</p><blockquote>“Five realms need your questions, your ideas, and your courage. Ready to discover what’s out there?”</blockquote><ReadButton label="Read introduction aloud" onRead={() => speak(screenNarration, true)} /><button className="primary-action" onClick={() => setScreen('map')}>Open the world map <span>→</span></button></div></div>
        </section>
      )}

      {['map', 'region', 'backpack', 'progress', 'settings', 'parent'].includes(screen) && screen !== 'welcome' && <GameHeader profile={profile} level={level} screen={screen} onNavigate={setScreen} onSound={() => updateProfile({ sound: !profile.sound })} />}

      {screen === 'map' && (
        <section className="map-screen">
          <div className="map-heading"><div><span className="eyebrow"><span>✦</span> Playable world explorer</span><h2>Adventure is this way, {profile.nickname}!</h2><p>Walk to a realm with arrow keys, W A S D, or the touch controls.</p></div><div className="daily-card"><span>✦</span><div><small>Explorer streak</small><strong>{Math.max(1, new Set(profile.completed).size)} bright day{new Set(profile.completed).size === 1 ? '' : 's'}</strong></div></div></div>
          <div className="world-map" tabIndex={0} aria-label="Playable K World map. Move with arrow keys or W A S D.">
            <div className="map-water-lines" /><div className="map-cloud mc-one" /><div className="map-cloud mc-two" />
            <div className="trail trail-one" /><div className="trail trail-two" /><div className="trail trail-three" /><div className="trail trail-four" />
            <span className="map-collectible collectible-one">✦</span><span className="map-collectible collectible-two">◆</span><span className="map-collectible collectible-three">★</span>
            {regions.map((region) => {
              const locked = level < region.level;
              const done = profile.completed.includes(region.id);
              const isNear = nearbyRegion?.id === region.id;
              return <button key={region.id} style={{ left: `${region.position.x}%`, top: `${region.position.y}%`, '--region': region.color } as React.CSSProperties} className={`region-node region-${region.id} ${locked ? 'locked' : ''} ${done ? 'done' : ''} ${isNear ? 'near' : ''}`} onClick={() => travelToRegion(region.id)} aria-label={`Travel to ${region.name}${locked ? `, unlocks at level ${region.level}` : ''}`}>
                <span className="region-art"><i>{locked ? '•' : region.icon}</i><b /></span><span className="region-label"><small>{locked ? `Level ${region.level} needed` : done ? 'Quest replay' : region.short}</small><strong>{region.name}</strong></span>{done && <span className="done-star">★</span>}
              </button>;
            })}
            <div className={`map-avatar facing-${heroFacing} ${heroJumping ? 'jumping' : ''}`} style={{ left: `${profile.worldPosition.x}%`, top: `${profile.worldPosition.y}%` }}><Avatar profile={profile} small /><span>{heroJumping ? 'Boing!' : 'You are here'}</span></div>
            {nearbyRegion && <div className={`realm-gate ${level < nearbyRegion.level ? 'gate-locked' : ''}`}>
              <span>{level < nearbyRegion.level ? '◆' : '✦'}</span><div><small>{level < nearbyRegion.level ? 'Path locked' : 'You found a realm!'}</small><strong>{nearbyRegion.name}</strong></div>{level >= nearbyRegion.level ? <button onClick={() => enterRegion(nearbyRegion.id)}>Enter realm →</button> : <em>Reach level {nearbyRegion.level}</em>}
            </div>}
            <div className="compass" aria-hidden="true"><b>N</b><i /></div>
          </div>
          <div className="map-controls" aria-label="World movement controls"><div className="control-help"><strong>Move your hero</strong><span>Arrow keys / W A S D · Space to jump · Enter a nearby realm</span></div><div className="d-pad"><button aria-label="Move up" onClick={() => moveHero(0, profile.age === '5–7' ? -6 : -4)}>▲</button><button aria-label="Move left" onClick={() => moveHero(profile.age === '5–7' ? -6 : -4, 0)}>◀</button><button className="jump-control" aria-label="Jump" onClick={jumpHero}>JUMP</button><button aria-label="Move right" onClick={() => moveHero(profile.age === '5–7' ? 6 : 4, 0)}>▶</button><button aria-label="Move down" onClick={() => moveHero(0, profile.age === '5–7' ? 6 : 4)}>▼</button></div></div>
          <p className="map-tip"><span>✦</span> Walk near a realm to enter. Mistakes never cost lives or progress.</p>
        </section>
      )}

      {screen === 'region' && (
        <section className={`region-screen theme-${activeRegion.id}`}>
          <div className="region-scene">
            <button className="back-map" onClick={() => setScreen('map')}>← World map</button>
            <div className="scene-sky"><span className="scene-orb" /><span className="scene-cloud cloud-a" /><span className="scene-cloud cloud-b" /></div>
            <div className="scene-land land-back" /><div className="scene-land land-front" />
            <div className="scene-landmark"><span>{activeRegion.icon}</span><i /><b /></div>
            <button className={`scene-hotspot fact-hotspot ${factOpen ? 'found' : ''}`} onClick={discoverFact}><span>✦</span><strong>Wonder spot</strong><small>Discover a fact</small></button>
            <button className={`scene-hotspot secret-hotspot ${profile.items.includes(`${activeRegion.name} secret star`) ? 'found' : ''}`} onClick={collectSecret}><span>★</span><strong>Hidden star</strong><small>{profile.items.includes(`${activeRegion.name} secret star`) ? 'Found!' : 'Tap to collect'}</small></button>
            <div className="region-hero"><Avatar profile={profile} /><span className="hero-shadow" /></div>
            <div className="region-guide"><span>{activeRegion.guideIcon}</span></div>
            <div className="dialogue-card"><div className="dialogue-name">{activeRegion.guide}</div><span className="quest-type">{activeQuest.activity}</span><h2>{activeQuest.title}</h2><p>{activeQuest.intro}</p><small className="fresh-quest-note">✦ Fresh activities chosen for this visit</small><ReadButton label="Read this quest aloud" onRead={() => speak(screenNarration, true)} /><div className="dialogue-actions"><button className="secondary-action" onClick={discoverFact}>✦ Hear a fact</button><button className="primary-action" onClick={startGame}>Start the quest <span>→</span></button></div></div>
          </div>
          {factOpen && <div className="fact-popover" role="dialog" aria-label="Discovered fact"><button onClick={() => setFactOpen(false)} aria-label="Close fact">×</button><span className="fact-icon">✦</span><small>New fact in your backpack</small><strong>{facts[profile.age ?? '8–10'][activeRegion.id]}</strong><ReadButton label="Read fact aloud" onRead={() => speak(facts[profile.age ?? '8–10'][activeRegion.id], true)} /></div>}
        </section>
      )}

      {screen === 'game' && currentQuestion && (
        <section className={`game-screen game-${currentQuestion.subject}`}>
          <header className="game-topbar"><button onClick={() => setScreen('region')} aria-label="Leave quest">×</button><button className="restart-game" onClick={restartQuest} aria-label="Restart this quest from the beginning">↻ <span>Restart</span></button><div><span>{activeQuest.title} · {questionIndex + 1} of {currentQuestions.length}</span><div className="quest-progress"><i style={{ width: `${((questionIndex + (correctAnswer ? 1 : 0)) / currentQuestions.length) * 100}%` }} /></div></div><span className="game-score">★ {score}</span></header>
          <div className="mini-game-layout">
            <aside className="game-visual">
              <div className="visual-label">{currentQuestion.activity ?? activeQuest.activity}</div>
              <div className="challenge-token">{currentQuestion.token}</div>
              <div className="visual-machine"><i /><i /><i /></div>
              <div className="guide-mini"><span>{activeRegion.guideIcon}</span><p>{currentQuestion.subject === 'science' ? 'Observe closely!' : currentQuestion.subject === 'math' ? 'Power the next cell!' : 'Choose the strongest word!'}</p></div>
            </aside>
            <div className="question-card">
              <span className="question-kicker">{activeRegion.name} · {activeQuest.title} · Challenge {questionIndex + 1}</span><div className="question-with-audio"><h2>{currentQuestion.prompt}</h2><ReadButton label="Read question and answers aloud" onRead={() => speak(screenNarration, true)} /></div>
              <div className="answer-grid">{currentQuestion.choices.map((choice, index) => {
                const isRight = correctAnswer && choice === currentQuestion.answer; const isWrong = selectedAnswer === choice && choice !== currentQuestion.answer;
                return <div className="answer-row" key={choice}><button className={`${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`} disabled={correctAnswer || isWrong} onClick={() => answerQuestion(choice)}><span>{String.fromCharCode(65 + index)}</span>{choice}<i>{isRight ? '✓' : isWrong ? '×' : ''}</i></button><ReadButton label={`Read answer ${choice} aloud`} onRead={() => speak(choice, true)} /></div>;
              })}</div>
              {!correctAnswer && !selectedAnswer && <button className="hint-button" onClick={() => setShowHint(true)}>◇ Need a hint?</button>}
              {showHint && !correctAnswer && <div className="hint-panel"><strong>Try this:</strong> {currentQuestion.hint}</div>}
              {selectedAnswer && !correctAnswer && <div className="feedback-panel try-again"><strong>Good thinking—let’s look once more.</strong><span>{currentQuestion.hint}</span></div>}
              {correctAnswer && <div className="feedback-panel correct"><div><strong>Brilliant discovery!</strong><span>{currentQuestion.explanation}</span></div><button onClick={nextQuestion}>{questionIndex === currentQuestions.length - 1 ? 'See rewards' : 'Next challenge'} →</button></div>}
            </div>
          </div>
        </section>
      )}

      {screen === 'rewards' && (
        <section className="reward-screen">
          <div className="reward-rays" aria-hidden="true" /><div className="reward-card"><span className="reward-kicker">{activeQuest.title} complete!</span><div className="reward-emblem">★<span>✦</span></div><h2>Your curiosity lit the way!</h2><p>{activeRegion.guide} is impressed, {profile.nickname}. A different quest and fresh activities are ready whenever you return.</p><div className="reward-grid"><div><span>+{reward.stars}</span><small>Stars</small></div><div><span>+{reward.xp}</span><small>Explorer XP</small></div><div><span>{reward.badge ? '✓' : '✦'}</span><small>{reward.badge || 'Quest token'}</small></div></div><div className="level-progress"><span>Level {level}</span><div><i style={{ width: `${profile.xp % 80 / 80 * 100}%` }} /></div><span>{80 - profile.xp % 80} XP to next</span></div><div className="reward-actions"><button className="secondary-action" onClick={() => setScreen('backpack')}>Backpack</button><button className="secondary-action" onClick={chooseNewQuest}>New quest here</button><button className="primary-action" onClick={() => setScreen('map')}>World map <span>→</span></button></div></div>
        </section>
      )}

      {screen === 'backpack' && (
        <section className="content-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Your collection</span><h2>Explorer backpack</h2><p>Every discovery you make is saved right here.</p></div><button className="secondary-action" onClick={() => setScreen('map')}>← Back to map</button></div><div className="collection-grid"><article className="collection-card facts-card"><div className="collection-title"><span>✦</span><div><h3>Wonder facts</h3><small>{profile.facts.length} discovered</small></div></div>{profile.facts.length ? <ul>{profile.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <EmptyCollection text="Tap a Wonder Spot in any realm to collect your first fact." />}</article><article className="collection-card"><div className="collection-title"><span>◇</span><div><h3>Quest treasures</h3><small>{profile.items.length} collected</small></div></div>{profile.items.length ? <div className="item-grid">{profile.items.map((item) => <div key={item}><span>{item.includes('star') ? '★' : '◆'}</span><small>{item}</small></div>)}</div> : <EmptyCollection text="Secret stars and quest tokens will appear here." />}</article><article className="collection-card badge-card"><div className="collection-title"><span>★</span><div><h3>Achievement badges</h3><small>{profile.badges.length} earned</small></div></div>{profile.badges.length ? <div className="badge-list">{profile.badges.map((badge) => <div key={badge}><span>★</span><strong>{badge}</strong></div>)}</div> : <EmptyCollection text="Solve every challenge in a quest to earn a Trailblazer badge." />}</article></div></section>
      )}

      {screen === 'progress' && (
        <section className="content-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Growing every quest</span><h2>{profile.nickname}’s progress</h2><p>There are no grades here—just skills getting stronger.</p></div><button className="secondary-action" onClick={() => setScreen('map')}>← Back to map</button></div><div className="progress-overview"><div className="level-medallion"><span>{level}</span><small>Explorer level</small></div><div><strong>{profile.xp} XP earned</strong><p>{profile.completed.length} quests played · {profile.facts.length} facts found · {profile.stars} stars</p><div className="level-progress"><div><i style={{ width: `${profile.xp % 80 / 80 * 100}%` }} /></div><span>{80 - profile.xp % 80} XP until level {level + 1}</span></div></div></div><div className="subject-progress-grid">{(['science', 'math', 'english'] as Subject[]).map((subject) => { const data = profile.progress[subject]; const percent = data.attempts ? Math.round(data.correct / data.attempts * 100) : 0; return <article key={subject} className={`subject-card subject-${subject}`}><span className="subject-icon">{subject === 'science' ? '✿' : subject === 'math' ? '∑' : 'Aa'}</span><h3>{subject[0].toUpperCase() + subject.slice(1)}</h3><strong>{mastery(data.correct, data.attempts)}</strong><div><i style={{ width: `${percent}%` }} /></div><small>{data.correct} discoveries from {data.attempts} tries</small><p>{subject === 'science' ? 'Observe, classify, and explain the living world.' : subject === 'math' ? 'Use numbers, shapes, patterns, and logic.' : 'Read closely, choose words, and build stories.'}</p></article>; })}</div></section>
      )}

      {screen === 'settings' && (
        <section className="content-screen settings-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Make K World yours</span><h2>Sound & accessibility</h2><p>Choose what makes exploring feel best.</p></div><button className="secondary-action" onClick={() => setScreen(profile.age ? 'map' : 'welcome')}>← Back</button></div><div className="settings-grid"><SettingToggle title="Sound effects" text="Play gentle sounds for answers and rewards." enabled={profile.sound} onToggle={() => updateProfile({ sound: !profile.sound })} icon="♫" /><SettingToggle title="Read aloud" text="Show narration controls and hear any text you choose." enabled={profile.narration} onToggle={() => { if (profile.narration) stopSpeech(); updateProfile({ narration: !profile.narration }); }} icon="▶" /><SettingToggle title="Read screens automatically" text="Begin reading each new screen. Helpful for early readers." enabled={profile.narrationAuto} onToggle={() => updateProfile({ narrationAuto: !profile.narrationAuto, narration: true })} icon="◉" /><article className="setting-card speech-speed"><span>▶</span><div><h3>Narration speed</h3><p>{profile.speechRate < .85 ? 'Slow and steady' : profile.speechRate > 1.05 ? 'A little faster' : 'Comfortable pace'}</p><input type="range" min="0.65" max="1.2" step="0.05" value={profile.speechRate} aria-label="Narration speed" onChange={(event) => updateProfile({ speechRate: Number(event.target.value) })} /></div><strong>{profile.speechRate.toFixed(2)}×</strong></article><SettingToggle title="Reduce motion" text="Quiet the floating and celebration animations." enabled={profile.reducedMotion} onToggle={() => updateProfile({ reducedMotion: !profile.reducedMotion })} icon="∼" /><SettingToggle title="Larger words" text="Make important text a little bigger." enabled={profile.largeText} onToggle={() => updateProfile({ largeText: !profile.largeText })} icon="A+" /><SettingToggle title="Easy-read type" text="Use simpler letter shapes and more spacing." enabled={profile.easyRead} onToggle={() => updateProfile({ easyRead: !profile.easyRead })} icon="Aa" /><article className="setting-card age-setting"><span>{profile.age || '—'}</span><div><h3>Adventure age</h3><p>Change the level of stories and challenges.</p><select value={profile.age ?? ''} onChange={(event) => { const age = event.target.value as AgeGroup; setSelectedAge(age); updateProfile({ age }); }}><option value="" disabled>Choose age</option>{ageGroups.map((group) => <option key={group.range}>{group.range}</option>)}</select></div></article><article className="setting-card character-setting"><span>☺</span><div><h3>Character selection</h3><p>Change your hero, class, nickname, outfit, or companion without losing progress.</p></div><button onClick={() => setScreen('character')}>Change hero</button></article></div></section>
      )}

      {screen === 'parent' && (
        <section className="content-screen parent-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Grown-up corner</span><h2>Learning overview</h2><p>A simple, private view of this explorer’s activity.</p></div><button className="secondary-action" onClick={() => setScreen(profile.age ? 'map' : 'welcome')}>← Back</button></div>{!parentUnlocked ? <div className="parent-gate"><span className="gate-icon">7 + 5</span><h3>Quick grown-up check</h3><p>What is seven plus five?</p><div><input inputMode="numeric" value={parentAnswer} onChange={(event) => setParentAnswer(event.target.value)} aria-label="Answer to grown-up check" /><button className="primary-action" onClick={() => { if (parentAnswer.trim() === '12') setParentUnlocked(true); }}>Unlock</button></div><small>This keeps little explorers inside the game.</small></div> : <div className="parent-dashboard"><div className="parent-summary"><div><span>{profile.playMinutes}</span><small>Approx. play minutes</small></div><div><span>{profile.completed.length}</span><small>Quests played</small></div><div><span>{profile.facts.length}</span><small>Facts collected</small></div></div><article className="parent-report"><h3>Concepts practiced</h3>{(['science', 'math', 'english'] as Subject[]).map((subject) => <div key={subject}><strong>{subject[0].toUpperCase() + subject.slice(1)}</strong><span>{mastery(profile.progress[subject].correct, profile.progress[subject].attempts)}</span><small>{profile.progress[subject].attempts} challenge attempts</small></div>)}</article><article className="next-adventure"><span>✦</span><div><h3>Suggested next adventure</h3><p>{profile.progress.science.attempts <= profile.progress.math.attempts ? 'Visit Science Jungle to practice observing habitats and living things.' : 'Return to Number Kingdom for a fresh pattern and problem-solving quest.'}</p></div></article><div className="parent-actions"><button className="secondary-action" onClick={() => setScreen('settings')}>Accessibility settings</button><button className="danger-link" onClick={resetAdventure}>Reset local adventure</button></div></div>}</section>
      )}
      <ReadAloudDock text={screenNarration} spokenText={spokenText} spokenWordIndex={spokenWordIndex} state={speechState} enabled={profile.narration} onRead={() => speak(screenNarration, true)} onToggle={toggleSpeech} onStop={stopSpeech} />
    </main>
  );
}

function GameHeader({ profile, level, screen, onNavigate, onSound }: { profile: Profile; level: number; screen: Screen; onNavigate: (screen: Screen) => void; onSound: () => void }) {
  return <header className="game-header"><button className="brand brand-button" onClick={() => onNavigate('map')}><span className="brand-mark">K</span><span>K WORLD</span></button><nav aria-label="Explorer menu"><button onClick={() => onNavigate('character')}><span>☺</span>Hero</button><button className={screen === 'backpack' ? 'active' : ''} onClick={() => onNavigate('backpack')}><span>◇</span>Backpack</button><button className={screen === 'progress' ? 'active' : ''} onClick={() => onNavigate('progress')}><span>↗</span>Progress</button><button className={screen === 'parent' ? 'active' : ''} onClick={() => onNavigate('parent')}><span>○</span>Grown-ups</button></nav><div className="player-hud"><button className="header-icon" onClick={onSound} aria-label={profile.sound ? 'Turn sound off' : 'Turn sound on'}>{profile.sound ? '♫' : '×'}</button><button className="header-icon" onClick={() => onNavigate('settings')} aria-label="Settings">⚙</button><div className="hud-stars"><span>★</span><strong>{profile.stars}</strong></div><div className="hud-profile"><Avatar profile={profile} small /><div><strong>{profile.nickname}</strong><span>Level {level} · {profile.explorerClass}</span></div></div></div></header>;
}

function EmptyCollection({ text }: { text: string }) { return <div className="empty-collection"><span>✦</span><p>{text}</p></div>; }

function SettingToggle({ title, text, enabled, onToggle, icon }: { title: string; text: string; enabled: boolean; onToggle: () => void; icon: string }) {
  return <article className="setting-card"><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div><button role="switch" aria-checked={enabled} className={`toggle ${enabled ? 'on' : ''}`} onClick={onToggle}><i /></button></article>;
}

function ReadButton({ label, onRead }: { label: string; onRead: () => void }) {
  return <button className="read-button" type="button" onClick={onRead} aria-label={label}><span aria-hidden="true">🔊</span><span>Read to me</span></button>;
}

function ReadAloudDock({ text, spokenText, spokenWordIndex, state, enabled, onRead, onToggle, onStop }: { text: string; spokenText: string; spokenWordIndex: number; state: 'idle' | 'speaking' | 'paused'; enabled: boolean; onRead: () => void; onToggle: () => void; onStop: () => void }) {
  const words = spokenText.split(/\s+/).filter(Boolean);
  return <aside className={`read-aloud-dock ${state !== 'idle' ? 'is-reading' : ''}`} aria-label="Read aloud controls">
    {state !== 'idle' && <div className="spoken-caption" aria-live="polite">{words.map((word, index) => <span className={index === spokenWordIndex ? 'spoken-now' : index < spokenWordIndex ? 'spoken-past' : ''} key={`${word}-${index}`}>{word} </span>)}</div>}
    <div className="read-controls"><button className="dock-main" onClick={state === 'idle' ? onRead : onToggle}><span aria-hidden="true">{state === 'speaking' ? 'Ⅱ' : '🔊'}</span>{state === 'speaking' ? 'Pause' : state === 'paused' ? 'Continue' : 'Read this screen'}</button>{state !== 'idle' && <><button onClick={() => { onStop(); setTimeout(onRead, 30); }} aria-label="Replay narration">↻</button><button onClick={onStop} aria-label="Stop narration">■</button></>}<span className="narration-status">{enabled ? 'Read-aloud on' : 'Tap anytime to listen'}</span></div>
    <span className="sr-only">Text ready to read: {text}</span>
  </aside>;
}
