'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isActivityCorrect } from '@/content/evaluation.ts';
import { selectQuestActivities, selectQuestVariant } from '@/content/rotation.ts';
import { ageGroups, factsFor, learningResources, questVariants, regions } from '@/content/world.ts';
import type { Activity, AgeGroup, QuestVariant, RegionId, Subject, WonderFact } from '@/content/types.ts';

type Screen = 'welcome' | 'character' | 'intro' | 'map' | 'region' | 'game' | 'rewards' | 'backpack' | 'progress' | 'settings' | 'parent';

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
  factHistory: Record<string, string[]>;
};

const STORE_KEY = 'kworld-adventure-v1';
const defaultProfile: Profile = {
  age: null, nickname: 'Nova', skin: 1, hair: 0, outfit: 0, explorerClass: 'Scientist', companion: 'Fox',
  xp: 0, stars: 0, badges: [], facts: [], items: [], completed: [],
  progress: { science: { correct: 0, attempts: 0 }, math: { correct: 0, attempts: 0 }, english: { correct: 0, attempts: 0 } },
  sound: true, narration: false, narrationAuto: false, speechRate: 0.9, reducedMotion: false, largeText: false, easyRead: false, playMinutes: 0,
  worldPosition: { x: 48, y: 20 },
  questHistory: {}, questionHistory: {}, factHistory: {},
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

function activityNarration(activity?: Activity) {
  if (!activity) return '';
  if (activity.activityType === 'multiple-choice') return `${activity.prompt} Choose from ${activity.choices.join(', ')}.`;
  if (activity.activityType === 'true-false') return `${activity.prompt} Choose true or false.`;
  if (activity.activityType === 'ordering') return `${activity.prompt} Put these items in order using the move up and move down buttons: ${activity.items.join(', ')}.`;
  if (activity.activityType === 'matching') return `${activity.prompt} Match each item on the left with one choice on the right. Left items: ${activity.pairs.map((pair) => pair.left).join(', ')}. Choices: ${activity.pairs.map((pair) => pair.right).join(', ')}.`;
  return `${activity.prompt} Enter a number${activity.suffix ? ` in ${activity.suffix.trim()}` : ''}.`;
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
  const [activeRegionId, setActiveRegionId] = useState<RegionId>('science');
  const [activeQuest, setActiveQuest] = useState<QuestVariant>(questVariants.science[0]);
  const [questQuestions, setQuestQuestions] = useState<Activity[]>([]);
  const [factOpen, setFactOpen] = useState(false);
  const [activeFact, setActiveFact] = useState<WonderFact | null>(null);
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
  const [orderItems, setOrderItems] = useState<string[]>([]);
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [matchingOptions, setMatchingOptions] = useState<string[]>([]);
  const [activeMatchLeft, setActiveMatchLeft] = useState<string | null>(null);
  const [numericAnswer, setNumericAnswer] = useState('');
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
  const currentQuestions = questQuestions;
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
    if (screen === 'game' && currentQuestion) return activityNarration(currentQuestion);
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

  const prepareQuest = useCallback((id: RegionId) => {
    const age = profile.age ?? '8–10';
    const questSelection = selectQuestVariant(id, profile.questHistory[id] ?? []);
    const activitySelection = selectQuestActivities(age, id, profile.questionHistory[id] ?? []);
    setActiveQuest(questSelection.quest);
    setQuestQuestions(activitySelection.activities);
    setQuestionIndex(0); setSelectedAnswer(null); setCorrectAnswer(false); setShowHint(false); setScore(0);
    setProfile((current) => ({
      ...current,
      questHistory: { ...current.questHistory, [id]: questSelection.history },
      questionHistory: { ...current.questionHistory, [id]: activitySelection.history },
    }));
  }, [profile.age, profile.questionHistory, profile.questHistory]);

  const enterRegion = useCallback((id: RegionId) => {
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
    const age = profile.age ?? '8–10';
    const pool = factsFor(age, activeRegion.id);
    const historyKey = `${age}:${activeRegion.id}`;
    const validIds = new Set(pool.map((fact) => fact.id));
    const validHistory = (profile.factHistory[historyKey] ?? []).filter((id) => validIds.has(id));
    let available = pool.filter((fact) => !validHistory.includes(fact.id));
    const newCycle = available.length === 0;
    if (newCycle) available = pool.filter((fact) => fact.id !== validHistory.at(-1));
    const fact = shuffled(available)[0] ?? pool[0];
    if (!fact) return;
    setActiveFact(fact);
    setProfile((current) => ({
      ...current,
      facts: current.facts.includes(fact.text) ? current.facts : [...current.facts, fact.text],
      factHistory: { ...current.factHistory, [historyKey]: newCycle ? [fact.id] : [...validHistory, fact.id] },
    }));
    setFactOpen(true); playTone(); speak(fact.text);
  };

  const collectSecret = () => {
    const item = `${activeRegion.name} secret star`;
    if (profile.items.includes(item)) return;
    updateProfile({ items: [...profile.items, item], stars: profile.stars + 1 }); playTone();
  };

  const resetActivityInteraction = (activity?: Activity) => {
    setSelectedAnswer(null); setCorrectAnswer(false); setShowHint(false); setMatchingAnswers({}); setActiveMatchLeft(null); setNumericAnswer('');
    if (activity?.activityType === 'ordering') {
      let nextOrder = shuffled(activity.items);
      if (nextOrder.join('|') === activity.correctOrder.join('|')) nextOrder = [...nextOrder.slice(1), nextOrder[0]];
      setOrderItems(nextOrder);
    } else setOrderItems([]);
    setMatchingOptions(activity?.activityType === 'matching' ? shuffled(activity.pairs.map((pair) => pair.right)) : []);
  };

  const startGame = () => {
    if (!currentQuestions.length) return;
    setQuestionIndex(0); resetActivityInteraction(currentQuestions[0]); setScore(0); setScreen('game');
    speak(activityNarration(currentQuestions[0]));
  };

  const restartQuest = () => {
    stopSpeech();
    setQuestionIndex(0); resetActivityInteraction(currentQuestions[0]); setScore(0);
    speak(`Restarting ${activeQuest.title}. ${activityNarration(currentQuestions[0])}`);
  };

  const chooseNewQuest = () => {
    stopSpeech();
    prepareQuest(activeRegion.id);
    setFactOpen(false);
    setScreen('region');
  };

  const completeAttempt = (isCorrect: boolean, answerLabel: string) => {
    if (correctAnswer) return;
    setSelectedAnswer(answerLabel);
    const subject = currentQuestion.subject;
    setProfile((current) => {
      const subjectProgress = current.progress[subject];
      return { ...current, progress: { ...current.progress, [subject]: { attempts: subjectProgress.attempts + 1, correct: subjectProgress.correct + (isCorrect ? 1 : 0) } } };
    });
    if (isCorrect) { setCorrectAnswer(true); setScore((value) => value + 1); playTone(); speak(`Correct! ${currentQuestion.explanation}`); }
    else { playTone(false); speak(`Good thinking. Try once more. ${currentQuestion.hint}`); }
  };

  const answerChoice = (choice: string | boolean) => {
    if (currentQuestion.activityType === 'multiple-choice' || currentQuestion.activityType === 'true-false') completeAttempt(isActivityCorrect(currentQuestion, choice), String(choice));
  };

  const moveOrderItem = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= orderItems.length) return;
    setOrderItems((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    setSelectedAnswer(null);
  };

  const chooseMatch = (right: string) => {
    if (!activeMatchLeft || correctAnswer) return;
    setMatchingAnswers((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([, value]) => value !== right));
      next[activeMatchLeft] = right;
      return next;
    });
    setActiveMatchLeft(null); setSelectedAnswer(null);
  };

  const submitStructuredAnswer = () => {
    if (currentQuestion.activityType === 'ordering') completeAttempt(isActivityCorrect(currentQuestion, orderItems), 'ordered');
    if (currentQuestion.activityType === 'matching') completeAttempt(isActivityCorrect(currentQuestion, matchingAnswers), 'matched');
    if (currentQuestion.activityType === 'numeric') completeAttempt(isActivityCorrect(currentQuestion, numericAnswer), numericAnswer);
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
    const next = questionIndex + 1; setQuestionIndex(next); resetActivityInteraction(currentQuestions[next]); speak(activityNarration(currentQuestions[next]));
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
          {factOpen && activeFact && <div className="fact-popover" role="dialog" aria-label="Discovered fact"><button onClick={() => setFactOpen(false)} aria-label="Close fact">×</button><span className="fact-icon">✦</span><small>Wonder Fact · saved in your backpack</small><strong>{activeFact.text}</strong><ReadButton label="Read fact aloud" onRead={() => speak(activeFact.text, true)} /></div>}
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
              <ActivityResponse activity={currentQuestion} correct={correctAnswer} selectedAnswer={selectedAnswer} orderItems={orderItems} matchingAnswers={matchingAnswers} matchingOptions={matchingOptions} activeMatchLeft={activeMatchLeft} numericAnswer={numericAnswer} onChoice={answerChoice} onMoveOrder={moveOrderItem} onSelectMatchLeft={(value) => { setActiveMatchLeft(value); setSelectedAnswer(null); }} onChooseMatch={chooseMatch} onNumericChange={(value) => { setNumericAnswer(value); setSelectedAnswer(null); }} onSubmit={submitStructuredAnswer} onRead={(text) => speak(text, true)} />
              {!correctAnswer && !selectedAnswer && <button className="hint-button" onClick={() => setShowHint(true)}>◇ Need a hint?</button>}
              {showHint && !correctAnswer && <div className="hint-panel"><strong>Try this:</strong> {currentQuestion.hint}<ReadButton label="Read hint aloud" onRead={() => speak(currentQuestion.hint, true)} /></div>}
              {selectedAnswer && !correctAnswer && <div className="feedback-panel try-again"><strong>Good thinking—let’s look once more.</strong><span>{currentQuestion.hint}</span></div>}
              {correctAnswer && <div className="feedback-panel correct"><div><strong>Brilliant discovery!</strong><span>{currentQuestion.explanation}</span><ReadButton label="Read explanation aloud" onRead={() => speak(currentQuestion.explanation, true)} /></div><button onClick={nextQuestion}>{questionIndex === currentQuestions.length - 1 ? 'See rewards' : 'Next challenge'} →</button></div>}
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
        <section className="content-screen parent-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Grown-up corner</span><h2>Learning overview</h2><p>A simple, private view of this explorer’s activity.</p></div><button className="secondary-action" onClick={() => setScreen(profile.age ? 'map' : 'welcome')}>← Back</button></div>{!parentUnlocked ? <div className="parent-gate"><span className="gate-icon">7 + 5</span><h3>Quick grown-up check</h3><p>What is seven plus five?</p><div><input inputMode="numeric" value={parentAnswer} onChange={(event) => setParentAnswer(event.target.value)} aria-label="Answer to grown-up check" /><button className="primary-action" onClick={() => { if (parentAnswer.trim() === '12') setParentUnlocked(true); }}>Unlock</button></div><small>This keeps little explorers inside the game.</small></div> : <div className="parent-dashboard"><div className="parent-summary"><div><span>{profile.playMinutes}</span><small>Approx. play minutes</small></div><div><span>{profile.completed.length}</span><small>Quests played</small></div><div><span>{profile.facts.length}</span><small>Facts collected</small></div></div><article className="parent-report"><h3>Concepts practiced</h3>{(['science', 'math', 'english'] as Subject[]).map((subject) => <div key={subject}><strong>{subject[0].toUpperCase() + subject.slice(1)}</strong><span>{mastery(profile.progress[subject].correct, profile.progress[subject].attempts)}</span><small>{profile.progress[subject].attempts} challenge attempts</small></div>)}</article><article className="next-adventure"><span>✦</span><div><h3>Suggested next adventure</h3><p>{profile.progress.science.attempts <= profile.progress.math.attempts ? 'Visit Science Jungle to practice observing habitats and living things.' : 'Return to Number Kingdom for a fresh pattern and problem-solving quest.'}</p></div></article><article className="learning-resources"><h3>Learning resources</h3><p>These independent educational organizations informed K World’s curriculum coverage and age progression. All K World questions, passages, hints, and stories are original; no third-party lessons or assets are reproduced, and no affiliation or endorsement is implied.</p><div>{learningResources.map((resource) => <a key={resource.name} href={resource.url} target="_blank" rel="noreferrer">{resource.name}<span aria-hidden="true">↗</span></a>)}</div></article><div className="parent-actions"><button className="secondary-action" onClick={() => setScreen('settings')}>Accessibility settings</button><button className="danger-link" onClick={resetAdventure}>Reset local adventure</button></div></div>}</section>
      )}
      <ReadAloudDock text={screenNarration} spokenText={spokenText} spokenWordIndex={spokenWordIndex} state={speechState} enabled={profile.narration} onRead={() => speak(screenNarration, true)} onToggle={toggleSpeech} onStop={stopSpeech} />
    </main>
  );
}

function ActivityResponse({ activity, correct, selectedAnswer, orderItems, matchingAnswers, matchingOptions, activeMatchLeft, numericAnswer, onChoice, onMoveOrder, onSelectMatchLeft, onChooseMatch, onNumericChange, onSubmit, onRead }: {
  activity: Activity;
  correct: boolean;
  selectedAnswer: string | null;
  orderItems: string[];
  matchingAnswers: Record<string, string>;
  matchingOptions: string[];
  activeMatchLeft: string | null;
  numericAnswer: string;
  onChoice: (choice: string | boolean) => void;
  onMoveOrder: (index: number, direction: -1 | 1) => void;
  onSelectMatchLeft: (value: string) => void;
  onChooseMatch: (value: string) => void;
  onNumericChange: (value: string) => void;
  onSubmit: () => void;
  onRead: (text: string) => void;
}) {
  const choiceOptions = useMemo(() => activity.activityType === 'multiple-choice' ? shuffled(activity.choices) : [], [activity]);
  if (activity.activityType === 'multiple-choice') return <div className="answer-grid">{choiceOptions.map((choice, index) => {
    const isRight = correct && choice === activity.answer; const isWrong = selectedAnswer === choice && choice !== activity.answer;
    return <div className="answer-row" key={choice}><button className={`${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`} disabled={correct} onClick={() => onChoice(choice)}><span>{String.fromCharCode(65 + index)}</span>{choice}<i>{isRight ? '✓' : isWrong ? '×' : ''}</i></button><ReadButton label={`Read answer ${choice} aloud`} onRead={() => onRead(choice)} /></div>;
  })}</div>;

  if (activity.activityType === 'true-false') return <div className="answer-grid true-false-grid">{[true, false].map((choice, index) => {
    const label = choice ? 'True' : 'False'; const isRight = correct && choice === activity.answer; const isWrong = selectedAnswer === String(choice) && choice !== activity.answer;
    return <div className="answer-row" key={label}><button className={`${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`} disabled={correct} onClick={() => onChoice(choice)}><span>{index ? 'F' : 'T'}</span>{label}<i>{isRight ? '✓' : isWrong ? '×' : ''}</i></button><ReadButton label={`Read ${label} aloud`} onRead={() => onRead(label)} /></div>;
  })}</div>;

  if (activity.activityType === 'ordering') return <div className="structured-activity"><p className="activity-instruction">Move each card until the order feels right.</p><ol className="order-list">{orderItems.map((item, index) => <li key={item}><span>{index + 1}</span><strong>{item}</strong><div><button onClick={() => onMoveOrder(index, -1)} disabled={correct || index === 0} aria-label={`Move ${item} up`}>↑</button><button onClick={() => onMoveOrder(index, 1)} disabled={correct || index === orderItems.length - 1} aria-label={`Move ${item} down`}>↓</button><ReadButton label={`Read ${item} aloud`} onRead={() => onRead(item)} /></div></li>)}</ol><button className="submit-activity" onClick={onSubmit} disabled={correct}>Check my order</button></div>;

  if (activity.activityType === 'matching') return <div className="structured-activity"><p className="activity-instruction">Choose a card on the left, then choose its match on the right.</p><div className="matching-board"><div>{activity.pairs.map((pair) => <button key={pair.left} className={activeMatchLeft === pair.left ? 'active' : matchingAnswers[pair.left] ? 'paired' : ''} onClick={() => onSelectMatchLeft(pair.left)} disabled={correct}><strong>{pair.left}</strong><small>{matchingAnswers[pair.left] ? `Matched with: ${matchingAnswers[pair.left]}` : 'Choose this card'}</small></button>)}</div><div>{matchingOptions.map((option) => <button key={option} className={Object.values(matchingAnswers).includes(option) ? 'paired' : ''} onClick={() => onChooseMatch(option)} disabled={correct || !activeMatchLeft}><strong>{option}</strong><small>{Object.values(matchingAnswers).includes(option) ? 'Matched' : activeMatchLeft ? `Match with ${activeMatchLeft}` : 'Choose a left card first'}</small></button>)}</div></div><div className="matching-actions"><ReadButton label="Read all matching choices aloud" onRead={() => onRead(activityNarration(activity))} /><button className="submit-activity" onClick={onSubmit} disabled={correct || Object.keys(matchingAnswers).length !== activity.pairs.length}>Check my matches</button></div></div>;

  return <form className="structured-activity numeric-activity" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><label htmlFor={`numeric-${activity.id}`}>Your number</label><div><input id={`numeric-${activity.id}`} type="number" step="any" inputMode="decimal" value={numericAnswer} onChange={(event) => onNumericChange(event.target.value)} disabled={correct} aria-describedby={`numeric-help-${activity.id}`} /><span>{activity.suffix}</span><ReadButton label="Read numeric instructions aloud" onRead={() => onRead(activityNarration(activity))} /></div><small id={`numeric-help-${activity.id}`}>Numbers only. Decimals such as 2.5 are welcome.</small><button className="submit-activity" type="submit" disabled={correct || numericAnswer.trim() === ''}>Check my number</button></form>;
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
