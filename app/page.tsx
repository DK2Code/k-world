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
};

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

const defaultProfile: Profile = {
  age: null, nickname: 'Nova', skin: 1, hair: 0, outfit: 0, explorerClass: 'Scientist', companion: 'Fox',
  xp: 0, stars: 0, badges: [], facts: [], items: [], completed: [],
  progress: { science: { correct: 0, attempts: 0 }, math: { correct: 0, attempts: 0 }, english: { correct: 0, attempts: 0 } },
  sound: true, narration: false, narrationAuto: false, speechRate: 0.9, reducedMotion: false, largeText: false, easyRead: false, playMinutes: 0,
  worldPosition: { x: 48, y: 20 },
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
  const currentQuestions = useMemo(() => {
    const age = profile.age ?? '8–10';
    if (activeRegion.subject !== 'mixed') return questions[age][activeRegion.subject];
    return [questions[age].science[0], questions[age].math[1], questions[age].english[2]];
  }, [activeRegion, profile.age]);
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
    if (screen === 'region') return `Welcome to ${activeRegion.name}. ${activeRegion.description} ${activeRegion.guide} has a quest made especially for you.`;
    if (screen === 'game' && currentQuestion) return `${currentQuestion.prompt} Your choices are ${currentQuestion.choices.join(', ')}.`;
    if (screen === 'rewards') return `Quest complete! Your curiosity lit the way. You earned ${reward.stars} stars and ${reward.xp} explorer points.`;
    if (screen === 'backpack') return `Explorer backpack. You have ${profile.facts.length} wonder facts, ${profile.items.length} quest treasures, and ${profile.badges.length} badges.`;
    if (screen === 'progress') return `${profile.nickname}'s progress. Level ${level}. ${profile.xp} explorer points and ${profile.stars} stars.`;
    if (screen === 'settings') return 'Sound and accessibility settings. You can turn on read aloud, automatic narration, slower or faster speech, reduced motion, larger words, and easy-read type.';
    return 'Grown-up corner. This private summary shows learning activity saved on this device.';
  }, [activeRegion, currentQuestion, level, profile, reward, screen]);

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

  const enterRegion = useCallback((id: string) => {
    const region = regions.find((item) => item.id === id);
    if (!region || region.level > level) return;
    stopSpeech();
    setActiveRegionId(id); setFactOpen(false); setScreen('region');
  }, [level, stopSpeech]);

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
              <button className="primary-action" onClick={() => setScreen('intro')}>Meet my hero <span>→</span></button>
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
            <div className="dialogue-card"><div className="dialogue-name">{activeRegion.guide}</div><h2>Welcome to {activeRegion.name}!</h2><p>{activeRegion.description} I have a quest made especially for an explorer aged {profile.age}.</p><ReadButton label="Read this message aloud" onRead={() => speak(screenNarration, true)} /><div className="dialogue-actions"><button className="secondary-action" onClick={discoverFact}>✦ Hear a fact</button><button className="primary-action" onClick={startGame}>Start the quest <span>→</span></button></div></div>
          </div>
          {factOpen && <div className="fact-popover" role="dialog" aria-label="Discovered fact"><button onClick={() => setFactOpen(false)} aria-label="Close fact">×</button><span className="fact-icon">✦</span><small>New fact in your backpack</small><strong>{facts[profile.age ?? '8–10'][activeRegion.id]}</strong><ReadButton label="Read fact aloud" onRead={() => speak(facts[profile.age ?? '8–10'][activeRegion.id], true)} /></div>}
        </section>
      )}

      {screen === 'game' && currentQuestion && (
        <section className={`game-screen game-${currentQuestion.subject}`}>
          <header className="game-topbar"><button onClick={() => setScreen('region')} aria-label="Leave quest">×</button><div><span>Quest {questionIndex + 1} of {currentQuestions.length}</span><div className="quest-progress"><i style={{ width: `${((questionIndex + (correctAnswer ? 1 : 0)) / currentQuestions.length) * 100}%` }} /></div></div><span className="game-score">★ {score}</span></header>
          <div className="mini-game-layout">
            <aside className="game-visual">
              <div className="visual-label">{currentQuestion.subject === 'science' ? 'Habitat lab' : currentQuestion.subject === 'math' ? 'Starship repair' : 'Story spell'}</div>
              <div className="challenge-token">{currentQuestion.token}</div>
              <div className="visual-machine"><i /><i /><i /></div>
              <div className="guide-mini"><span>{activeRegion.guideIcon}</span><p>{currentQuestion.subject === 'science' ? 'Observe closely!' : currentQuestion.subject === 'math' ? 'Power the next cell!' : 'Choose the strongest word!'}</p></div>
            </aside>
            <div className="question-card">
              <span className="question-kicker">{activeRegion.name} · Challenge {questionIndex + 1}</span><div className="question-with-audio"><h2>{currentQuestion.prompt}</h2><ReadButton label="Read question and answers aloud" onRead={() => speak(screenNarration, true)} /></div>
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
          <div className="reward-rays" aria-hidden="true" /><div className="reward-card"><span className="reward-kicker">Quest complete!</span><div className="reward-emblem">★<span>✦</span></div><h2>Your curiosity lit the way!</h2><p>{activeRegion.guide} is impressed, {profile.nickname}. You kept thinking, used your hints, and made the realm brighter.</p><div className="reward-grid"><div><span>+{reward.stars}</span><small>Stars</small></div><div><span>+{reward.xp}</span><small>Explorer XP</small></div><div><span>{reward.badge ? '✓' : '✦'}</span><small>{reward.badge || 'Quest token'}</small></div></div><div className="level-progress"><span>Level {level}</span><div><i style={{ width: `${profile.xp % 80 / 80 * 100}%` }} /></div><span>{80 - profile.xp % 80} XP to next</span></div><div className="reward-actions"><button className="secondary-action" onClick={() => setScreen('backpack')}>See backpack</button><button className="primary-action" onClick={() => setScreen('map')}>Keep exploring <span>→</span></button></div></div>
        </section>
      )}

      {screen === 'backpack' && (
        <section className="content-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Your collection</span><h2>Explorer backpack</h2><p>Every discovery you make is saved right here.</p></div><button className="secondary-action" onClick={() => setScreen('map')}>← Back to map</button></div><div className="collection-grid"><article className="collection-card facts-card"><div className="collection-title"><span>✦</span><div><h3>Wonder facts</h3><small>{profile.facts.length} discovered</small></div></div>{profile.facts.length ? <ul>{profile.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <EmptyCollection text="Tap a Wonder Spot in any realm to collect your first fact." />}</article><article className="collection-card"><div className="collection-title"><span>◇</span><div><h3>Quest treasures</h3><small>{profile.items.length} collected</small></div></div>{profile.items.length ? <div className="item-grid">{profile.items.map((item) => <div key={item}><span>{item.includes('star') ? '★' : '◆'}</span><small>{item}</small></div>)}</div> : <EmptyCollection text="Secret stars and quest tokens will appear here." />}</article><article className="collection-card badge-card"><div className="collection-title"><span>★</span><div><h3>Achievement badges</h3><small>{profile.badges.length} earned</small></div></div>{profile.badges.length ? <div className="badge-list">{profile.badges.map((badge) => <div key={badge}><span>★</span><strong>{badge}</strong></div>)}</div> : <EmptyCollection text="Solve every challenge in a quest to earn a Trailblazer badge." />}</article></div></section>
      )}

      {screen === 'progress' && (
        <section className="content-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Growing every quest</span><h2>{profile.nickname}’s progress</h2><p>There are no grades here—just skills getting stronger.</p></div><button className="secondary-action" onClick={() => setScreen('map')}>← Back to map</button></div><div className="progress-overview"><div className="level-medallion"><span>{level}</span><small>Explorer level</small></div><div><strong>{profile.xp} XP earned</strong><p>{profile.completed.length} quests played · {profile.facts.length} facts found · {profile.stars} stars</p><div className="level-progress"><div><i style={{ width: `${profile.xp % 80 / 80 * 100}%` }} /></div><span>{80 - profile.xp % 80} XP until level {level + 1}</span></div></div></div><div className="subject-progress-grid">{(['science', 'math', 'english'] as Subject[]).map((subject) => { const data = profile.progress[subject]; const percent = data.attempts ? Math.round(data.correct / data.attempts * 100) : 0; return <article key={subject} className={`subject-card subject-${subject}`}><span className="subject-icon">{subject === 'science' ? '✿' : subject === 'math' ? '∑' : 'Aa'}</span><h3>{subject[0].toUpperCase() + subject.slice(1)}</h3><strong>{mastery(data.correct, data.attempts)}</strong><div><i style={{ width: `${percent}%` }} /></div><small>{data.correct} discoveries from {data.attempts} tries</small><p>{subject === 'science' ? 'Observe, classify, and explain the living world.' : subject === 'math' ? 'Use numbers, shapes, patterns, and logic.' : 'Read closely, choose words, and build stories.'}</p></article>; })}</div></section>
      )}

      {screen === 'settings' && (
        <section className="content-screen settings-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Make K World yours</span><h2>Sound & accessibility</h2><p>Choose what makes exploring feel best.</p></div><button className="secondary-action" onClick={() => setScreen(profile.age ? 'map' : 'welcome')}>← Back</button></div><div className="settings-grid"><SettingToggle title="Sound effects" text="Play gentle sounds for answers and rewards." enabled={profile.sound} onToggle={() => updateProfile({ sound: !profile.sound })} icon="♫" /><SettingToggle title="Read aloud" text="Show narration controls and hear any text you choose." enabled={profile.narration} onToggle={() => { if (profile.narration) stopSpeech(); updateProfile({ narration: !profile.narration }); }} icon="▶" /><SettingToggle title="Read screens automatically" text="Begin reading each new screen. Helpful for early readers." enabled={profile.narrationAuto} onToggle={() => updateProfile({ narrationAuto: !profile.narrationAuto, narration: true })} icon="◉" /><article className="setting-card speech-speed"><span>▶</span><div><h3>Narration speed</h3><p>{profile.speechRate < .85 ? 'Slow and steady' : profile.speechRate > 1.05 ? 'A little faster' : 'Comfortable pace'}</p><input type="range" min="0.65" max="1.2" step="0.05" value={profile.speechRate} aria-label="Narration speed" onChange={(event) => updateProfile({ speechRate: Number(event.target.value) })} /></div><strong>{profile.speechRate.toFixed(2)}×</strong></article><SettingToggle title="Reduce motion" text="Quiet the floating and celebration animations." enabled={profile.reducedMotion} onToggle={() => updateProfile({ reducedMotion: !profile.reducedMotion })} icon="∼" /><SettingToggle title="Larger words" text="Make important text a little bigger." enabled={profile.largeText} onToggle={() => updateProfile({ largeText: !profile.largeText })} icon="A+" /><SettingToggle title="Easy-read type" text="Use simpler letter shapes and more spacing." enabled={profile.easyRead} onToggle={() => updateProfile({ easyRead: !profile.easyRead })} icon="Aa" /><article className="setting-card age-setting"><span>{profile.age || '—'}</span><div><h3>Adventure age</h3><p>Change the level of stories and challenges.</p><select value={profile.age ?? ''} onChange={(event) => { const age = event.target.value as AgeGroup; setSelectedAge(age); updateProfile({ age }); }}><option value="" disabled>Choose age</option>{ageGroups.map((group) => <option key={group.range}>{group.range}</option>)}</select></div></article></div></section>
      )}

      {screen === 'parent' && (
        <section className="content-screen parent-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Grown-up corner</span><h2>Learning overview</h2><p>A simple, private view of this explorer’s activity.</p></div><button className="secondary-action" onClick={() => setScreen(profile.age ? 'map' : 'welcome')}>← Back</button></div>{!parentUnlocked ? <div className="parent-gate"><span className="gate-icon">7 + 5</span><h3>Quick grown-up check</h3><p>What is seven plus five?</p><div><input inputMode="numeric" value={parentAnswer} onChange={(event) => setParentAnswer(event.target.value)} aria-label="Answer to grown-up check" /><button className="primary-action" onClick={() => { if (parentAnswer.trim() === '12') setParentUnlocked(true); }}>Unlock</button></div><small>This keeps little explorers inside the game.</small></div> : <div className="parent-dashboard"><div className="parent-summary"><div><span>{profile.playMinutes}</span><small>Approx. play minutes</small></div><div><span>{profile.completed.length}</span><small>Quests played</small></div><div><span>{profile.facts.length}</span><small>Facts collected</small></div></div><article className="parent-report"><h3>Concepts practiced</h3>{(['science', 'math', 'english'] as Subject[]).map((subject) => <div key={subject}><strong>{subject[0].toUpperCase() + subject.slice(1)}</strong><span>{mastery(profile.progress[subject].correct, profile.progress[subject].attempts)}</span><small>{profile.progress[subject].attempts} challenge attempts</small></div>)}</article><article className="next-adventure"><span>✦</span><div><h3>Suggested next adventure</h3><p>{profile.progress.science.attempts <= profile.progress.math.attempts ? 'Visit Science Jungle to practice observing habitats and living things.' : 'Return to Number Kingdom for a fresh pattern and problem-solving quest.'}</p></div></article><div className="parent-actions"><button className="secondary-action" onClick={() => setScreen('settings')}>Accessibility settings</button><button className="danger-link" onClick={resetAdventure}>Reset local adventure</button></div></div>}</section>
      )}
      <ReadAloudDock text={screenNarration} spokenText={spokenText} spokenWordIndex={spokenWordIndex} state={speechState} enabled={profile.narration} onRead={() => speak(screenNarration, true)} onToggle={toggleSpeech} onStop={stopSpeech} />
    </main>
  );
}

function GameHeader({ profile, level, screen, onNavigate, onSound }: { profile: Profile; level: number; screen: Screen; onNavigate: (screen: Screen) => void; onSound: () => void }) {
  return <header className="game-header"><button className="brand brand-button" onClick={() => onNavigate('map')}><span className="brand-mark">K</span><span>K WORLD</span></button><nav aria-label="Explorer menu"><button className={screen === 'backpack' ? 'active' : ''} onClick={() => onNavigate('backpack')}><span>◇</span>Backpack</button><button className={screen === 'progress' ? 'active' : ''} onClick={() => onNavigate('progress')}><span>↗</span>Progress</button><button className={screen === 'parent' ? 'active' : ''} onClick={() => onNavigate('parent')}><span>○</span>Grown-ups</button></nav><div className="player-hud"><button className="header-icon" onClick={onSound} aria-label={profile.sound ? 'Turn sound off' : 'Turn sound on'}>{profile.sound ? '♫' : '×'}</button><button className="header-icon" onClick={() => onNavigate('settings')} aria-label="Settings">⚙</button><div className="hud-stars"><span>★</span><strong>{profile.stars}</strong></div><div className="hud-profile"><Avatar profile={profile} small /><div><strong>{profile.nickname}</strong><span>Level {level} · {profile.explorerClass}</span></div></div></div></header>;
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
