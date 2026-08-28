'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { availableSkills, buildAssessmentReport, createAssessmentSession, getActivity, masteryBySkill, practiceAttempt, submitAssessmentAnswer } from '@/content/assessment.ts';
import { isActivityCorrect } from '@/content/evaluation.ts';
import { curriculumMap, gradeLabel, gradeLevels, gradeNumber, gradePresentation } from '@/content/grades.ts';
import { narrationDelivery, rankNarratorVoices, resolveNarratorVoice, splitNarration } from '@/content/narration.ts';
import { defaultProfile, migrateProfile } from '@/content/profile.ts';
import { selectQuestActivities, selectQuestVariant } from '@/content/rotation.ts';
import { factsFor, learningResources, questVariants, regions } from '@/content/world.ts';
import type { AssessmentKind, AssessmentReport } from '@/content/assessment.ts';
import type { RankedNarratorVoice } from '@/content/narration.ts';
import type { ProfileData } from '@/content/profile.ts';
import type { Activity, GradeLevel, GradedActivity, QuestVariant, RegionId, Subject, WonderFact } from '@/content/types.ts';

type Screen = 'welcome' | 'character' | 'intro' | 'map' | 'region' | 'game' | 'rewards' | 'backpack' | 'progress' | 'settings' | 'parent' | 'assessment-center' | 'assessment-intro' | 'assessment' | 'assessment-paused' | 'assessment-result' | 'assessment-report' | 'mastery';
type Profile = ProfileData;

const STORE_KEY = 'kworld-adventure-v1';
const NARRATOR_PREVIEW = 'Welcome, explorer! Your next K World adventure is waiting. Let’s discover something amazing together.';

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

function assessmentTrend(report: AssessmentReport, history: AssessmentReport[]) {
  const earlier = history
    .filter((item) => item.id !== report.id && item.grade === report.grade && item.kind === report.kind && item.subject === report.subject && (report.kind !== 'skill' || item.title === report.title) && item.completedAt < report.completedAt)
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
    .at(-1);
  if (!earlier) return { label: 'First check', detail: 'This result creates a starting point for future comparisons.' };
  const currentRate = report.attempts ? report.correct / report.attempts : 0;
  const earlierRate = earlier.attempts ? earlier.correct / earlier.attempts : 0;
  const change = Math.round((currentRate - earlierRate) * 100);
  if (change >= 5) return { label: 'Growing', detail: `${change} percentage points higher than the previous comparable Skill Check.` };
  if (change <= -5) return { label: 'Needs a revisit', detail: `${Math.abs(change)} percentage points lower than the previous comparable Skill Check; try the suggested practice quests.` };
  return { label: 'Holding steady', detail: 'Similar to the previous comparable Skill Check. More varied evidence will make the trend clearer.' };
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
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [activeRegionId, setActiveRegionId] = useState<RegionId>('science');
  const [activeQuest, setActiveQuest] = useState<QuestVariant>(questVariants.science[0]);
  const [questQuestions, setQuestQuestions] = useState<GradedActivity[]>([]);
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
  const [assessmentAnswerLocked, setAssessmentAnswerLocked] = useState(false);
  const [assessmentWasCorrect, setAssessmentWasCorrect] = useState(false);
  const [assessmentHintUsed, setAssessmentHintUsed] = useState(false);
  const [selectedAssessmentSubject, setSelectedAssessmentSubject] = useState<Subject>('math');
  const [selectedAssessmentSkill, setSelectedAssessmentSkill] = useState('');
  const [activeReport, setActiveReport] = useState<AssessmentReport | null>(null);
  const [narratorVoices, setNarratorVoices] = useState<RankedNarratorVoice[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<'loading' | 'ready' | 'fallback' | 'unavailable'>('loading');
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const speechRunRef = useRef(0);
  const speechPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechNextSegmentRef = useRef<(() => void) | null>(null);
  const speechPausedRef = useRef(false);
  const speakRef = useRef<(text: string, force?: boolean) => void>(() => undefined);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = migrateProfile(JSON.parse(saved));
        // Restoring a local-only adventure is the intended one-time hydration step.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile(parsed);
        setSelectedGrade(parsed.grade);
        if (parsed.grade) setScreen('map');
      }
    } catch { /* A fresh local adventure is always safe to start. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      // Speech remains optional when a browser does not expose the Web Speech API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceStatus('unavailable');
      return;
    }
    const loadVoices = () => {
      const nativeVoices = window.speechSynthesis.getVoices();
      if (!nativeVoices.length) return false;
      nativeVoicesRef.current = nativeVoices;
      const ranked = rankNarratorVoices(nativeVoices.map((voice) => ({ voiceURI: voice.voiceURI, name: voice.name, lang: voice.lang, localService: voice.localService, default: voice.default })));
      setNarratorVoices(ranked);
      setVoiceStatus(ranked.length ? 'ready' : 'fallback');
      return true;
    };
    loadVoices();
    const loadTimeout = setTimeout(() => { if (!loadVoices()) setVoiceStatus('fallback'); }, 900);
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      clearTimeout(loadTimeout);
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORE_KEY, JSON.stringify(profile));
  }, [profile, hydrated]);

  const level = levelFromXp(profile.xp);
  const activeRegion = regions.find((region) => region.id === activeRegionId) ?? regions[0];
  const currentQuestions = questQuestions;
  const currentQuestion = currentQuestions[questionIndex];
  const activeAssessment = profile.activeAssessment;
  const assessmentActivity = getActivity(activeAssessment?.currentActivityId);
  const gradeMastery = useMemo(() => masteryBySkill([...profile.practiceAttempts, ...profile.assessmentAttempts].filter((attempt) => attempt.grade === profile.grade)), [profile.assessmentAttempts, profile.grade, profile.practiceAttempts]);
  const activeReportAttempts = useMemo(() => activeReport ? profile.assessmentAttempts.filter((attempt) => attempt.id.startsWith(`${activeReport.sessionId}-attempt-`)) : [], [activeReport, profile.assessmentAttempts]);
  const activeReportTrend = useMemo(() => activeReport ? assessmentTrend(activeReport, profile.assessmentHistory) : null, [activeReport, profile.assessmentHistory]);
  const assessmentSkills = useMemo(() => profile.grade ? availableSkills(profile.grade, selectedAssessmentSubject) : [], [profile.grade, selectedAssessmentSubject]);
  const assessmentSkillId = assessmentSkills.some((skill) => skill.id === selectedAssessmentSkill) ? selectedAssessmentSkill : assessmentSkills[0]?.id ?? '';
  const selectedNarratorVoice = useMemo(() => resolveNarratorVoice(narratorVoices, profile.narratorVoiceURI), [narratorVoices, profile.narratorVoiceURI]);
  const narratorStyle = narrationDelivery(profile.grade, profile.speechRate, profile.speechPitch);
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
  const stopSpeech = useCallback(() => {
    speechRunRef.current += 1;
    speechPausedRef.current = false;
    speechNextSegmentRef.current = null;
    if (speechPauseTimerRef.current) clearTimeout(speechPauseTimerRef.current);
    speechPauseTimerRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }
    setSpeechState('idle');
  }, []);

  const speak = useCallback((text: string, force = false) => {
    if ((!profile.narration && !force) || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
    const segments = splitNarration(text);
    if (!segments.length) return;
    stopSpeech();
    const runId = speechRunRef.current;
    const preparedText = segments.join(' ');
    const delivery = narrationDelivery(profile.grade, profile.speechRate, profile.speechPitch);
    const selectedVoiceURI = selectedNarratorVoice?.voiceURI ?? '';
    const fallbackVoiceURI = narratorVoices[0]?.voiceURI ?? '';
    let fallbackTried = false;
    setSpokenText(preparedText);
    setSpokenWordIndex(0);
    setSpeechState('speaking');

    const playSegment = (segmentIndex: number, useFallback = false) => {
      if (speechRunRef.current !== runId || segmentIndex >= segments.length) return;
      const segment = segments[segmentIndex];
      const voiceURI = useFallback ? fallbackVoiceURI : selectedVoiceURI;
      const nativeVoice = nativeVoicesRef.current.find((voice) => voice.voiceURI === voiceURI);
      const utterance = new SpeechSynthesisUtterance(segment);
      if (nativeVoice) { utterance.voice = nativeVoice; utterance.lang = nativeVoice.lang; }
      else utterance.lang = 'en-US';
      utterance.rate = delivery.rate;
      utterance.pitch = delivery.pitch;
      const previousWordCount = segments.slice(0, segmentIndex).join(' ').split(/\s+/).filter(Boolean).length;
      utterance.onstart = () => { if (speechRunRef.current === runId) setSpeechState(speechPausedRef.current ? 'paused' : 'speaking'); };
      utterance.onboundary = (event) => {
        if (speechRunRef.current !== runId) return;
        const segmentWords = segment.slice(0, event.charIndex).trim().split(/\s+/).filter(Boolean).length;
        setSpokenWordIndex(previousWordCount + segmentWords);
      };
      utterance.onend = () => {
        if (speechRunRef.current !== runId) return;
        if (segmentIndex === segments.length - 1) { speechNextSegmentRef.current = null; setSpeechState('idle'); return; }
        const continueNarration = () => { speechNextSegmentRef.current = null; playSegment(segmentIndex + 1, useFallback); };
        speechNextSegmentRef.current = continueNarration;
        if (!speechPausedRef.current) speechPauseTimerRef.current = setTimeout(continueNarration, delivery.pauseMs);
      };
      utterance.onerror = (event) => {
        if (speechRunRef.current !== runId || event.error === 'canceled' || event.error === 'interrupted') return;
        if (!fallbackTried && selectedVoiceURI && fallbackVoiceURI && selectedVoiceURI !== fallbackVoiceURI) {
          fallbackTried = true;
          setTimeout(() => playSegment(segmentIndex, true), 60);
        } else setSpeechState('idle');
      };
      window.speechSynthesis.speak(utterance);
    };
    playSegment(0);
  }, [narratorVoices, profile.grade, profile.narration, profile.speechPitch, profile.speechRate, selectedNarratorVoice, stopSpeech]);

  useEffect(() => { speakRef.current = speak; }, [speak]);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speechState === 'speaking') {
      speechPausedRef.current = true;
      if (speechPauseTimerRef.current) clearTimeout(speechPauseTimerRef.current);
      speechPauseTimerRef.current = null;
      window.speechSynthesis.pause();
      setSpeechState('paused');
    } else if (speechState === 'paused') {
      speechPausedRef.current = false;
      window.speechSynthesis.resume();
      const continueNarration = speechNextSegmentRef.current;
      if (continueNarration) speechPauseTimerRef.current = setTimeout(continueNarration, 40);
      setSpeechState('speaking');
    }
  };

  const screenNarration = useMemo(() => {
    if (screen === 'welcome') return 'Welcome to K World! Choose Kindergarten or a grade from one through twelve so every adventure matches what you are learning.';
    if (screen === 'character') return 'Create your hero. Choose a skin tone, hair, outfit, explorer class, adventure nickname, and animal companion.';
    if (screen === 'intro') return `Explorer ${profile.nickname}! The Compass of Curiosity is glowing. Five realms need your questions, ideas, and courage.`;
    if (screen === 'map') return `World Explorer. Move ${profile.nickname} with the arrow keys, W A S D, or the big direction buttons. Walk close to a realm, then choose enter realm. ${regions.map((region) => `${region.name}, level ${region.level}.`).join(' ')}`;
    if (screen === 'region') return `Welcome to ${activeRegion.name}. Your new quest is ${activeQuest.title}. ${activeQuest.intro}`;
    if (screen === 'game' && currentQuestion) return activityNarration(currentQuestion);
    if (screen === 'rewards') return `Quest complete! Your curiosity lit the way. You earned ${reward.stars} stars and ${reward.xp} explorer points.`;
    if (screen === 'backpack') return `Explorer backpack. You have ${profile.facts.length} wonder facts, ${profile.items.length} quest treasures, and ${profile.badges.length} badges.`;
    if (screen === 'progress') return `${profile.nickname}'s progress. Level ${level}. ${profile.xp} explorer points and ${profile.stars} stars.`;
    if (screen === 'settings') return 'Sound and accessibility settings. Choose a warm narrator voice, preview it, adjust its pace, or turn automatic reading on and off.';
    if (screen === 'assessment-center') return `Explorer Skill Check. Choose a short, untimed assessment for ${profile.grade ? gradeLabel(profile.grade) : 'your grade'}.`;
    if (screen === 'assessment-intro' && activeAssessment) return `${activeAssessment.title}. This untimed check has about ${activeAssessment.targetCount} clues. You can pause whenever you need.`;
    if (screen === 'assessment' && assessmentActivity) return activityNarration(assessmentActivity);
    if (screen === 'assessment-paused') return 'Your Compass Assessment is paused and safely saved on this device.';
    if (screen === 'assessment-result' && activeReport) return `Skill Check complete. You explored ${activeReport.skills.length} learning areas. Your next quests are ready.`;
    if (screen === 'assessment-report') return 'Detailed learning report. This report shows K World activity only and is not an official school or diagnostic assessment.';
    if (screen === 'mastery') return 'Skill mastery dashboard. Review adventure strengths, growing skills, and recommended next quests.';
    return 'Grown-up corner. This private summary shows learning activity saved on this device.';
  }, [activeAssessment, activeQuest, activeRegion, activeReport, assessmentActivity, currentQuestion, level, profile, reward, screen]);

  useEffect(() => {
    if (!profile.narration || !profile.narrationAuto) return;
    const startTimer = setTimeout(() => speakRef.current(screenNarration, true), 100);
    return () => clearTimeout(startTimer);
  }, [profile.narration, profile.narrationAuto, screenNarration]);

  useEffect(() => () => {
    speechRunRef.current += 1;
    if (speechPauseTimerRef.current) clearTimeout(speechPauseTimerRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const beginAdventure = () => {
    if (!selectedGrade) return;
    const presentation = gradePresentation(selectedGrade);
    updateProfile({ grade: selectedGrade, narration: presentation.narrationDefault, narrationAuto: presentation.narrationDefault });
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
    const grade = profile.grade ?? '3';
    const historyKey = `${grade}:${id}`;
    const questSelection = selectQuestVariant(id, profile.questHistory[id] ?? []);
    const activitySelection = selectQuestActivities(grade, id, profile.questionHistory[historyKey] ?? []);
    setActiveQuest(questSelection.quest);
    setQuestQuestions(activitySelection.activities);
    setQuestionIndex(0); setSelectedAnswer(null); setCorrectAnswer(false); setShowHint(false); setScore(0);
    setProfile((current) => ({
      ...current,
      questHistory: { ...current.questHistory, [id]: questSelection.history },
      questionHistory: { ...current.questionHistory, [historyKey]: activitySelection.history },
    }));
  }, [profile.grade, profile.questionHistory, profile.questHistory]);

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
    const step = profile.grade && gradeNumber(profile.grade) <= 2 ? 6 : 4;
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
  }, [enterRegion, jumpHero, level, moveHero, nearbyRegion, profile.grade, screen]);

  const discoverFact = () => {
    const grade = profile.grade ?? '3';
    const pool = factsFor(grade, activeRegion.id);
    const historyKey = `${grade}:${activeRegion.id}`;
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
    const learningAttempt = practiceAttempt(currentQuestion, isCorrect, showHint);
    setProfile((current) => {
      const subjectProgress = current.progress[subject];
      return { ...current, practiceAttempts: [...current.practiceAttempts, learningAttempt], progress: { ...current.progress, [subject]: { attempts: subjectProgress.attempts + 1, correct: subjectProgress.correct + (isCorrect ? 1 : 0) } } };
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

  const resetAssessmentInteraction = (activity?: GradedActivity) => {
    resetActivityInteraction(activity);
    setAssessmentAnswerLocked(false); setAssessmentWasCorrect(false); setAssessmentHintUsed(false);
  };

  const openAssessment = (kind: AssessmentKind, subject?: Subject, skillId?: string) => {
    if (!profile.grade) { setScreen('welcome'); return; }
    const recentQuestIds = Object.entries(profile.questionHistory).filter(([key]) => key.startsWith(`${profile.grade}:`)).flatMap(([, ids]) => ids).slice(-18);
    const session = createAssessmentSession({ grade: profile.grade, kind, subject, skillId, recentQuestIds });
    updateProfile({ activeAssessment: session });
    setActiveReport(null); resetAssessmentInteraction(getActivity(session.currentActivityId)); setScreen('assessment-intro');
  };

  const chooseAssessmentSubject = (subject: Subject) => {
    setSelectedAssessmentSubject(subject);
    setSelectedAssessmentSkill(profile.grade ? availableSkills(profile.grade, subject)[0]?.id ?? '' : '');
  };

  const beginAssessment = () => {
    if (!activeAssessment || !assessmentActivity) return;
    const resumed = { ...activeAssessment, paused: false, updatedAt: new Date().toISOString() };
    updateProfile({ activeAssessment: resumed }); resetAssessmentInteraction(assessmentActivity); setScreen('assessment');
  };

  const pauseAssessment = () => {
    if (!activeAssessment || assessmentAnswerLocked) return;
    updateProfile({ activeAssessment: { ...activeAssessment, paused: true, updatedAt: new Date().toISOString() } });
    stopSpeech(); setScreen('assessment-paused');
  };

  const assessmentResponse = (response: string | boolean | string[] | Record<string, string>) => {
    if (!assessmentActivity || assessmentAnswerLocked) return;
    setSelectedAnswer(typeof response === 'string' ? response : 'response recorded');
    setAssessmentWasCorrect(isActivityCorrect(assessmentActivity, response));
    setAssessmentAnswerLocked(true); stopSpeech();
  };

  const assessmentChoice = (choice: string | boolean) => assessmentResponse(choice);
  const submitAssessmentStructured = () => {
    if (!assessmentActivity) return;
    if (assessmentActivity.activityType === 'ordering') assessmentResponse(orderItems);
    if (assessmentActivity.activityType === 'matching') assessmentResponse(matchingAnswers);
    if (assessmentActivity.activityType === 'numeric') assessmentResponse(numericAnswer);
  };

  const continueAssessment = () => {
    if (!activeAssessment || !assessmentActivity || !assessmentAnswerLocked) return;
    const result = submitAssessmentAnswer(activeAssessment, assessmentActivity, assessmentWasCorrect, assessmentHintUsed);
    if (result.complete) {
      const report = buildAssessmentReport(result.session);
      setProfile((current) => ({ ...current, activeAssessment: null, assessmentAttempts: [...current.assessmentAttempts, result.attempt], assessmentHistory: [...current.assessmentHistory, report], playMinutes: current.playMinutes + report.minutes }));
      setActiveReport(report); resetAssessmentInteraction(); setScreen('assessment-result');
    } else {
      setProfile((current) => ({ ...current, activeAssessment: result.session, assessmentAttempts: [...current.assessmentAttempts, result.attempt] }));
      resetAssessmentInteraction(getActivity(result.session.currentActivityId));
    }
  };

  const restartAssessment = () => {
    if (!activeAssessment) return;
    openAssessment(activeAssessment.kind, activeAssessment.subject, activeAssessment.skillId);
  };

  const viewReport = (report: AssessmentReport) => { setActiveReport(report); setScreen('assessment-report'); };

  const resetAdventure = () => {
    localStorage.removeItem(STORE_KEY); setProfile(defaultProfile); setSelectedGrade(null); setScreen('welcome'); setParentUnlocked(false);
  };

  const accessibilityClasses = [profile.reducedMotion ? 'reduce-motion' : '', profile.largeText ? 'large-text' : '', profile.easyRead ? 'easy-read' : ''].join(' ');

  return (
    <main className={`game-app screen-${screen} grade-${profile.grade ? gradePresentation(profile.grade).density : 'early'} ${accessibilityClasses}`}>
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
              <h1>Choose your<br /><em>adventure grade.</em></h1>
              <p className="intro">Every quest will match what you’re learning—from Kindergarten through Grade 12.</p>
              {profile.legacyAgeGroup && !profile.grade && <p className="migration-note"><strong>Your explorer is safe.</strong> Choose a grade once to continue with all existing stars, XP, character items, and settings.</p>}
              <ReadButton label="Read welcome aloud" onRead={() => speak(screenNarration, true)} />
              <div className="grade-grid" role="radiogroup" aria-label="Choose your school grade">
                {gradeLevels.map((option) => (
                  <button key={option.grade} type="button" role="radio" aria-checked={selectedGrade === option.grade} className={`grade-card ${selectedGrade === option.grade ? 'selected' : ''}`} onClick={() => setSelectedGrade(option.grade)}>
                    <span className="grade-number">{option.grade}</span><span><strong>{option.label}</strong><small>{option.stage}</small></span><span className="card-check" aria-hidden="true">✓</span>
                  </button>
                ))}
              </div>
              <button className="begin-button" type="button" disabled={!selectedGrade} onClick={beginAdventure}>Begin my quest <span aria-hidden="true">→</span></button>
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

      {['map', 'region', 'backpack', 'progress', 'settings', 'parent', 'assessment-center', 'mastery', 'assessment-report'].includes(screen) && <GameHeader profile={profile} level={level} screen={screen} onNavigate={setScreen} onSound={() => updateProfile({ sound: !profile.sound })} />}

      {screen === 'map' && (
        <section className="map-screen">
          <div className="map-heading"><div><span className="eyebrow"><span>✦</span> {profile.grade ? gradeLabel(profile.grade) : 'World'} explorer</span><h2>Adventure is this way, {profile.nickname}!</h2><p>Walk to a realm, or visit the Compass Assessment for a short learning check.</p></div><div className="map-heading-actions"><button className="assessment-map-button" onClick={() => setScreen('assessment-center')}><span>⌁</span><strong>Explorer Skill Check</strong><small>Untimed · saved locally</small></button><div className="daily-card"><span>✦</span><div><small>Explorer streak</small><strong>{Math.max(1, new Set(profile.completed).size)} bright day{new Set(profile.completed).size === 1 ? '' : 's'}</strong></div></div></div></div>
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
          <div className="map-controls" aria-label="World movement controls"><div className="control-help"><strong>Move your hero</strong><span>Arrow keys / W A S D · Space to jump · Enter a nearby realm</span></div><div className="d-pad"><button aria-label="Move up" onClick={() => moveHero(0, profile.grade && gradeNumber(profile.grade) <= 2 ? -6 : -4)}>▲</button><button aria-label="Move left" onClick={() => moveHero(profile.grade && gradeNumber(profile.grade) <= 2 ? -6 : -4, 0)}>◀</button><button className="jump-control" aria-label="Jump" onClick={jumpHero}>JUMP</button><button aria-label="Move right" onClick={() => moveHero(profile.grade && gradeNumber(profile.grade) <= 2 ? 6 : 4, 0)}>▶</button><button aria-label="Move down" onClick={() => moveHero(0, profile.grade && gradeNumber(profile.grade) <= 2 ? 6 : 4)}>▼</button></div></div>
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
              <ActivityResponse activity={currentQuestion} correct={correctAnswer} locked={correctAnswer} selectedAnswer={selectedAnswer} orderItems={orderItems} matchingAnswers={matchingAnswers} matchingOptions={matchingOptions} activeMatchLeft={activeMatchLeft} numericAnswer={numericAnswer} onChoice={answerChoice} onMoveOrder={moveOrderItem} onSelectMatchLeft={(value) => { setActiveMatchLeft(value); setSelectedAnswer(null); }} onChooseMatch={chooseMatch} onNumericChange={(value) => { setNumericAnswer(value); setSelectedAnswer(null); }} onSubmit={submitStructuredAnswer} onRead={(text) => speak(text, true)} />
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
        <section className="content-screen"><div className="content-heading"><div><span className="eyebrow"><span>✦</span> Growing every quest</span><h2>{profile.nickname}’s progress</h2><p>No report-card scores or rankings—just skills getting stronger.</p></div><button className="secondary-action" onClick={() => setScreen('map')}>← Back to map</button></div><div className="progress-overview"><div className="level-medallion"><span>{level}</span><small>Explorer level</small></div><div><strong>{profile.xp} XP earned</strong><p>{profile.completed.length} quests played · {profile.facts.length} facts found · {profile.stars} stars</p><div className="level-progress"><div><i style={{ width: `${profile.xp % 80 / 80 * 100}%` }} /></div><span>{80 - profile.xp % 80} XP until level {level + 1}</span></div></div></div><div className="subject-progress-grid">{(['science', 'math', 'english'] as Subject[]).map((subject) => { const data = profile.progress[subject]; const percent = data.attempts ? Math.round(data.correct / data.attempts * 100) : 0; return <article key={subject} className={`subject-card subject-${subject}`}><span className="subject-icon">{subject === 'science' ? '✿' : subject === 'math' ? '∑' : 'Aa'}</span><h3>{subject[0].toUpperCase() + subject.slice(1)}</h3><strong>{mastery(data.correct, data.attempts)}</strong><div><i style={{ width: `${percent}%` }} /></div><small>{data.correct} discoveries from {data.attempts} tries</small><p>{subject === 'science' ? 'Observe, classify, and explain the living world.' : subject === 'math' ? 'Use numbers, shapes, patterns, and logic.' : 'Read closely, choose words, and build stories.'}</p></article>; })}</div></section>
      )}

      {screen === 'settings' && (
        <section className="content-screen settings-screen">
          <div className="content-heading"><div><span className="eyebrow"><span>✦</span> Make K World yours</span><h2>Sound & accessibility</h2><p>Choose what makes exploring feel best.</p></div><button className="secondary-action" onClick={() => setScreen(profile.grade ? 'map' : 'welcome')}>← Back</button></div>
          <div className="settings-grid">
            <SettingToggle title="Sound effects" text="Play gentle sounds for answers and rewards." enabled={profile.sound} onToggle={() => updateProfile({ sound: !profile.sound })} icon="♫" />
            <SettingToggle title="Read aloud" text="Show narration controls and hear any text you choose." enabled={profile.narration} onToggle={() => { if (profile.narration) stopSpeech(); updateProfile({ narration: !profile.narration }); }} icon="▶" />
            <SettingToggle title="Read screens automatically" text="Begin reading each new screen. Helpful for early readers." enabled={profile.narrationAuto} onToggle={() => updateProfile({ narrationAuto: !profile.narrationAuto, narration: true })} icon="◉" />
            <article className="narrator-settings" aria-labelledby="narrator-settings-title">
              <div className="narrator-heading"><span aria-hidden="true">◖</span><div><small>Adventure guide</small><h3 id="narrator-settings-title">Narrator Voice</h3><p>A warm English voice from this device. Nothing is recorded or sent anywhere.</p></div><button type="button" onClick={() => speak(NARRATOR_PREVIEW, true)} disabled={voiceStatus === 'unavailable'}><span aria-hidden="true">▶</span> Preview voice</button></div>
              <div className="voice-picker"><label htmlFor="narrator-voice">Choose a voice</label>{selectedNarratorVoice?.recommended && <span>Recommended</span>}<select id="narrator-voice" value={selectedNarratorVoice?.voiceURI ?? ''} disabled={!narratorVoices.length} onChange={(event) => updateProfile({ narratorVoiceURI: event.target.value })}>{narratorVoices.length ? narratorVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.recommended ? 'Recommended — ' : ''}{voice.name} ({voice.lang}){voice.localService ? ' · On device' : ''}</option>) : <option value="">{voiceStatus === 'loading' ? 'Finding voices…' : voiceStatus === 'unavailable' ? 'Read-aloud unavailable' : 'Browser’s English voice'}</option>}</select><p>{voiceStatus === 'ready' ? `${selectedNarratorVoice?.name ?? 'The recommended voice'} will guide the next narration.` : voiceStatus === 'loading' ? 'K World is checking the voices installed on this device.' : voiceStatus === 'fallback' ? 'No named English voices were reported, so K World will use the browser’s English fallback.' : 'This browser does not provide speech synthesis. All written instructions remain available.'}</p></div>
              <div className="narrator-tuning"><label><span><strong>Speaking speed</strong><small>{narratorStyle.style}</small></span><input type="range" min="0.65" max="1.2" step="0.05" value={profile.speechRate} aria-label="Narration speed" onChange={(event) => updateProfile({ speechRate: Number(event.target.value) })} /><output>{profile.speechRate.toFixed(2)}×</output></label><label><span><strong>Voice tone</strong><small>Natural, with a safe pitch range</small></span><input type="range" min="0.9" max="1.1" step="0.02" value={profile.speechPitch} aria-label="Narration pitch" onChange={(event) => updateProfile({ speechPitch: Number(event.target.value) })} /><output>{profile.speechPitch.toFixed(2)}</output></label></div>
              <p className="voice-note"><span aria-hidden="true">✓</span> Uses the browser Speech Synthesis API only. No microphone, account, recording, or paid speech service is needed.</p>
            </article>
            <SettingToggle title="Reduce motion" text="Quiet the floating and celebration animations." enabled={profile.reducedMotion} onToggle={() => updateProfile({ reducedMotion: !profile.reducedMotion })} icon="∼" />
            <SettingToggle title="Larger words" text="Make important text a little bigger." enabled={profile.largeText} onToggle={() => updateProfile({ largeText: !profile.largeText })} icon="A+" />
            <SettingToggle title="Easy-read type" text="Use simpler letter shapes and more spacing." enabled={profile.easyRead} onToggle={() => updateProfile({ easyRead: !profile.easyRead })} icon="Aa" />
            <article className="setting-card grade-summary-setting"><span>{profile.grade ?? '—'}</span><div><h3>{profile.grade ? gradeLabel(profile.grade) : 'Grade not selected'}</h3><p>A grown-up can change the curriculum grade from the protected Grown-up Corner.</p></div></article>
            <article className="setting-card character-setting"><span>☺</span><div><h3>Character selection</h3><p>Change your hero, class, nickname, outfit, or companion without losing progress.</p></div><button onClick={() => setScreen('character')}>Change hero</button></article>
          </div>
        </section>
      )}

      {screen === 'assessment-center' && profile.grade && (
        <section className="content-screen assessment-center-screen">
          <div className="content-heading"><div><span className="eyebrow"><span>⌁</span> Compass Assessment</span><h2>Explorer Skill Check</h2><p>Short, untimed learning checks for {gradeLabel(profile.grade)}. Pause whenever you need.</p></div><button className="secondary-action" onClick={() => setScreen('map')}>← World map</button></div>
          {activeAssessment && !activeAssessment.completedAt && <article className="resume-assessment"><span>⌁</span><div><small>Saved on this device</small><h3>{activeAssessment.title}</h3><p>{activeAssessment.attempts.length} of {activeAssessment.targetCount} clues completed.</p></div><button onClick={() => { setActiveReport(null); resetAssessmentInteraction(assessmentActivity); setScreen(activeAssessment.paused ? 'assessment-paused' : 'assessment-intro'); }}>Resume</button></article>}
          <div className="assessment-option-grid">
            <article className="assessment-option featured"><span>⌁</span><small>All three subjects · about {gradePresentation(profile.grade).assessmentLength} clues</small><h3>Grade-level Compass Check</h3><p>Explore a balanced mix of mathematics, science, and English skills.</p><button onClick={() => openAssessment('general')}>Start general assessment</button></article>
            {(['science', 'math', 'english'] as Subject[]).map((subject) => <article className={`assessment-option subject-${subject}`} key={subject}><span>{subject === 'science' ? '✿' : subject === 'math' ? '∑' : 'Aa'}</span><small>Focused subject check</small><h3>{subject[0].toUpperCase() + subject.slice(1)}</h3><p>{curriculumMap[profile.grade!][subject].join(' · ')}</p><button onClick={() => openAssessment('subject', subject)}>Check {subject}</button></article>)}
          </div>
          <article className="skill-check-picker"><div><span className="eyebrow"><span>◇</span> Short topic check</span><h3>Focus on one skill</h3><p>Choose a subject and one curriculum area for a three-clue check.</p></div><div><label>Subject<select value={selectedAssessmentSubject} onChange={(event) => chooseAssessmentSubject(event.target.value as Subject)}>{(['science', 'math', 'english'] as Subject[]).map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Skill<select value={assessmentSkillId} onChange={(event) => setSelectedAssessmentSkill(event.target.value)}>{assessmentSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.topic}</option>)}</select></label><button disabled={!assessmentSkillId} onClick={() => openAssessment('skill', selectedAssessmentSubject, assessmentSkillId)}>Start skill check</button></div></article>
          <p className="assessment-disclaimer">Results describe K World activity only. They are not an official school, medical, psychological, or diagnostic assessment.</p>
        </section>
      )}

      {screen === 'assessment-intro' && activeAssessment && (
        <section className="assessment-shell assessment-intro-screen"><div className="assessment-constellation" aria-hidden="true">⌁ · ✦ · ◇</div><article><span className="assessment-compass">⌁</span><small>{gradeLabel(activeAssessment.grade)} · {activeAssessment.kind === 'general' ? 'Balanced subjects' : activeAssessment.subject ?? 'Focused skill'}</small><h1>{activeAssessment.title}</h1><p>This is a friendly learning snapshot—not a race. You’ll see about {activeAssessment.targetCount} clues, and you can pause at any time.</p><ul><li>Untimed</li><li>Hints are welcome</li><li>Read-aloud available</li><li>Saved only on this device</li></ul><ReadButton label="Read assessment introduction aloud" onRead={() => speak(screenNarration, true)} /><div><button className="secondary-action" onClick={() => { updateProfile({ activeAssessment: null }); setScreen('assessment-center'); }}>Choose another check</button><button className="primary-action" onClick={beginAssessment}>{activeAssessment.attempts.length ? 'Continue check' : 'Begin Skill Check'} <span>→</span></button></div></article></section>
      )}

      {screen === 'assessment' && activeAssessment && assessmentActivity && (
        <section className={`game-screen assessment-game game-${assessmentActivity.subject}`}>
          <header className="assessment-topbar"><button onClick={pauseAssessment} disabled={assessmentAnswerLocked}>Pause & save</button><div><span>{activeAssessment.title}</span><strong>Clue {activeAssessment.attempts.length + 1} of {activeAssessment.targetCount}</strong><div><i style={{ width: `${activeAssessment.attempts.length / activeAssessment.targetCount * 100}%` }} /></div></div><em>Untimed</em></header>
          <div className="assessment-layout"><aside><span>{assessmentActivity.token}</span><small>{assessmentActivity.subject}</small><strong>{assessmentActivity.topic}</strong><p>Take your time. Curiosity matters more than speed.</p></aside><div className="question-card assessment-question-card"><span className="question-kicker">Compass clue · Difficulty {assessmentActivity.difficulty ?? 2}</span><div className="question-with-audio"><h2>{assessmentActivity.prompt}</h2><ReadButton label="Read assessment clue aloud" onRead={() => speak(screenNarration, true)} /></div>
            <ActivityResponse activity={assessmentActivity} correct={assessmentWasCorrect} locked={assessmentAnswerLocked} selectedAnswer={selectedAnswer} orderItems={orderItems} matchingAnswers={matchingAnswers} matchingOptions={matchingOptions} activeMatchLeft={activeMatchLeft} numericAnswer={numericAnswer} onChoice={assessmentChoice} onMoveOrder={moveOrderItem} onSelectMatchLeft={(value) => { setActiveMatchLeft(value); setSelectedAnswer(null); }} onChooseMatch={chooseMatch} onNumericChange={(value) => { setNumericAnswer(value); setSelectedAnswer(null); }} onSubmit={submitAssessmentStructured} onRead={(text) => speak(text, true)} />
            {!assessmentAnswerLocked && !showHint && <button className="hint-button" onClick={() => { setShowHint(true); setAssessmentHintUsed(true); }}>◇ Show a hint</button>}
            {showHint && !assessmentAnswerLocked && <div className="hint-panel"><strong>Helpful clue:</strong> {assessmentActivity.hint}<ReadButton label="Read hint aloud" onRead={() => speak(assessmentActivity.hint, true)} /></div>}
            {assessmentAnswerLocked && <div className="feedback-panel assessment-recorded" aria-live="polite"><div><strong>Clue recorded.</strong><span>Thanks—let’s try the next clue. You can review learning areas when the check is complete.</span></div><button onClick={continueAssessment}>{activeAssessment.attempts.length + 1 >= activeAssessment.targetCount ? 'Finish Skill Check' : 'Next clue'} →</button></div>}
          </div></div>
        </section>
      )}

      {screen === 'assessment-paused' && activeAssessment && (
        <section className="assessment-shell assessment-paused-screen"><article><span className="assessment-compass">Ⅱ</span><small>Saved safely on this device</small><h1>Compass paused</h1><p>You completed {activeAssessment.attempts.length} of {activeAssessment.targetCount} clues. There is no timer and no penalty for taking a break.</p><div><button className="secondary-action" onClick={() => setScreen('map')}>Return to world</button><button className="secondary-action" onClick={restartAssessment}>Restart this check</button><button className="primary-action" onClick={beginAssessment}>Resume <span>→</span></button></div></article></section>
      )}

      {screen === 'assessment-result' && activeReport && (
        <section className="assessment-result-screen"><div className="result-stars" aria-hidden="true">✦ ◇ ✦</div><article><span className="assessment-compass">⌁</span><small>{activeReport.title} complete</small><h1>Your learning compass is glowing!</h1><p>You explored {activeReport.skills.length} learning area{activeReport.skills.length === 1 ? '' : 's'} and completed {activeReport.attempts} thoughtful clues.</p><div className="child-result-grid"><div><span>★</span><strong>Adventure Strength</strong><p>{activeReport.strongest[0] ?? 'Your willingness to investigate every clue'}</p></div><div><span>↗</span><strong>Growing Skill</strong><p>{activeReport.focusAreas[0] ?? 'Keep mixing familiar ideas with new challenges'}</p></div><div><span>⌁</span><strong>Next Quest</strong><p>Visit {regions.find((region) => region.id === activeReport.recommendedRegions[0])?.name ?? 'Puzzle Peaks'} for another useful adventure.</p></div></div><p className="effort-note">Skill Checks celebrate effort and help choose useful adventures. They never rank you against anyone else.</p><div><button className="secondary-action" onClick={() => setScreen('parent')}>Grown-up report</button><button className="secondary-action" onClick={() => setScreen('mastery')}>My skill compass</button><button className="primary-action" onClick={() => setScreen('map')}>Next adventure <span>→</span></button></div></article></section>
      )}

      {screen === 'mastery' && (
        <section className="content-screen mastery-screen"><div className="content-heading"><div><span className="eyebrow"><span>⌁</span> Learning compass</span><h2>{profile.nickname}’s skill map</h2><p>Adventure strengths, growing skills, and useful next quests—never grades or rankings.</p></div><button className="secondary-action" onClick={() => setScreen('progress')}>← Progress</button></div>{gradeMastery.length ? <div className="mastery-grid">{gradeMastery.map((skill) => <article key={skill.skillId} className={`mastery-card mastery-${skill.label.toLowerCase().replaceAll(' ', '-')}`}><span>{skill.subject === 'science' ? '✿' : skill.subject === 'math' ? '∑' : 'Aa'}</span><small>{skill.subject}</small><h3>{skill.skillDescription}</h3><strong>{skill.label === 'Advanced' || skill.label === 'Secure' ? 'Adventure Strength' : skill.label === 'Not enough evidence' ? 'More clues needed' : 'Growing Skill'}</strong><p>{skill.evidence}</p></article>)}</div> : <EmptyCollection text="Complete quests or a Skill Check to begin drawing your skill map." />}<div className="mastery-actions"><button className="secondary-action" onClick={() => setScreen('assessment-center')}>Start Skill Check</button><button className="primary-action" onClick={() => setScreen('map')}>Recommended adventures <span>→</span></button></div></section>
      )}

      {screen === 'assessment-report' && activeReport && (
        <section className="content-screen assessment-report-screen">
          <div className="content-heading"><div><span className="eyebrow"><span>⌁</span> Grown-up report</span><h2>{activeReport.title}</h2><p>{gradeLabel(activeReport.grade)} · completed {new Date(activeReport.completedAt).toLocaleDateString()}</p></div><button className="secondary-action" onClick={() => setScreen('parent')}>← Grown-up Corner</button></div>
          <div className="report-summary"><div><strong>{activeReport.correct}/{activeReport.attempts}</strong><small>Correct responses</small></div><div><strong>{activeReport.hints}</strong><small>Hints used</small></div><div><strong>{activeReport.minutes} min</strong><small>Approximate time</small></div><div><strong>{activeReport.skills.length}</strong><small>Skills observed</small></div></div>
          <div className="report-layout">
            <article className="report-skill-table"><h3>Skill evidence</h3>{activeReport.skills.map((skill) => <div key={skill.skillId}><span className={`mastery-pill mastery-${skill.label.toLowerCase().replaceAll(' ', '-')}`}>{skill.label}</span><div><strong>{skill.skillDescription}</strong><small>{skill.correct}/{skill.attempts} correct · {skill.hints} hints · {skill.evidence}</small></div></div>)}</article>
            <aside><article><h3>Recent learning trend</h3><strong>{activeReportTrend?.label}</strong><p>{activeReportTrend?.detail}</p></article><article><h3>Strongest areas</h3>{activeReport.strongest.length ? <ul>{activeReport.strongest.map((item) => <li key={item}>{item}</li>)}</ul> : <p>More evidence is needed before naming a secure area.</p>}</article><article><h3>Recommended focus</h3>{activeReport.focusAreas.length ? <ul>{activeReport.focusAreas.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Continue varied practice to strengthen the evidence.</p>}</article><article><h3>Suggested next adventures</h3><ul>{activeReport.recommendedRegions.map((id) => <li key={id}>{regions.find((region) => region.id === id)?.name}</li>)}</ul></article></aside>
          </div>
          <article className="assessment-review"><h3>Answer review</h3><p>Explanations appear here after the Skill Check so the activity stays neutral while it is in progress.</p>{activeReportAttempts.length ? <div>{activeReportAttempts.map((attempt) => { const activity = getActivity(attempt.activityId); return <section key={attempt.id}><span className={attempt.correct ? 'review-correct' : 'review-revisit'}>{attempt.correct ? 'Understood' : 'Revisit'}</span><div><strong>{activity?.prompt}</strong><p>{activity?.explanation}</p><small>{attempt.skillDescription}{attempt.hintUsed ? ' · Hint used' : ''}</small></div></section>; })}</div> : <p>Detailed answer evidence is unavailable for this older saved report.</p>}</article>
          <p className="assessment-disclaimer">This report reflects performance within K World only. It is not a medical, psychological, diagnostic, or official school assessment. Conclusions are limited by the number and variety of completed activities.</p>
        </section>
      )}

      {screen === 'parent' && (
        <section className="content-screen parent-screen">
          <div className="content-heading"><div><span className="eyebrow"><span>✦</span> Grown-up corner</span><h2>Learning overview</h2><p>A private view of practice and assessments saved on this device.</p></div><button className="secondary-action" onClick={() => setScreen(profile.grade ? 'map' : 'welcome')}>← Back</button></div>
          {!parentUnlocked ? <div className="parent-gate"><span className="gate-icon">7 + 5</span><h3>Quick grown-up check</h3><p>What is seven plus five?</p><div><input inputMode="numeric" value={parentAnswer} onChange={(event) => setParentAnswer(event.target.value)} aria-label="Answer to grown-up check" /><button className="primary-action" onClick={() => { if (parentAnswer.trim() === '12') setParentUnlocked(true); }}>Unlock</button></div><small>This keeps little explorers inside the game.</small></div> : <div className="parent-dashboard">
            <div className="parent-summary"><div><span>{profile.playMinutes}</span><small>Approx. play minutes</small></div><div><span>{profile.completed.length}</span><small>Quests played</small></div><div><span>{profile.assessmentHistory.length}</span><small>Skill checks completed</small></div></div>
            <article className="parent-report"><h3>Concepts practiced</h3>{(['science', 'math', 'english'] as Subject[]).map((subject) => <div key={subject}><strong>{subject[0].toUpperCase() + subject.slice(1)}</strong><span>{mastery(profile.progress[subject].correct, profile.progress[subject].attempts)}</span><small>{profile.progress[subject].attempts} quest attempts</small></div>)}</article>
            <article className="next-adventure"><span>⌁</span><div><h3>Assessment snapshot</h3><p>{profile.assessmentHistory.length ? `${profile.assessmentHistory.at(-1)?.title} is ready to review.` : 'No Skill Check yet. Start with a short, untimed Compass Assessment.'}</p><button onClick={() => profile.assessmentHistory.length ? viewReport(profile.assessmentHistory.at(-1)!) : setScreen('assessment-center')}>{profile.assessmentHistory.length ? 'Open latest report' : 'Open Assessment Center'}</button></div></article>
            <article className="grade-parent-card"><div><span>Grade</span><strong>{profile.grade ? gradeLabel(profile.grade) : 'Choose a grade'}</strong><p>Changing grade updates future quests and assessments without removing progress.</p></div><select value={profile.grade ?? ''} aria-label="Change curriculum grade" onChange={(event) => { const grade = event.target.value as GradeLevel; setSelectedGrade(grade); updateProfile({ grade }); }}><option value="" disabled>Choose grade</option>{gradeLevels.map((option) => <option key={option.grade} value={option.grade}>{option.label}</option>)}</select></article>
            <article className="assessment-history-card"><div className="history-title"><div><h3>Assessment history</h3><p>Assessment results are separate from ordinary quest practice.</p></div><button onClick={() => setScreen('assessment-center')}>Start new check</button></div>{profile.assessmentHistory.length ? <div className="history-list">{[...profile.assessmentHistory].reverse().map((report) => { const trend = assessmentTrend(report, profile.assessmentHistory); return <button key={report.id} onClick={() => viewReport(report)}><span><strong>{report.title}</strong><small>{new Date(report.completedAt).toLocaleDateString()} · {report.attempts} clues · {report.minutes} min · {trend.label}</small></span><em>{report.correct}/{report.attempts}</em></button>; })}</div> : <EmptyCollection text="Completed Compass Assessments will appear here." />}</article>
            <article className="learning-resources"><h3>Learning resources</h3><p>These independent educational organizations informed K World’s curriculum coverage and grade progression. All K World questions, passages, hints, and stories are original; no third-party lessons or assets are reproduced, and no affiliation or endorsement is implied.</p><div>{learningResources.map((resource) => <a key={resource.name} href={resource.url} target="_blank" rel="noreferrer">{resource.name}<span aria-hidden="true">↗</span></a>)}</div></article>
            <p className="assessment-disclaimer">K World reports describe activity inside this game. They are not medical, psychological, diagnostic, or official school assessments.</p>
            <div className="parent-actions"><button className="secondary-action" onClick={() => setScreen('settings')}>Accessibility settings</button><button className="danger-link" onClick={resetAdventure}>Reset local adventure</button></div>
          </div>}
        </section>
      )}
      <ReadAloudDock text={screenNarration} spokenText={spokenText} spokenWordIndex={spokenWordIndex} state={speechState} enabled={profile.narration} onRead={() => speak(screenNarration, true)} onToggle={toggleSpeech} onStop={stopSpeech} />
    </main>
  );
}

function ActivityResponse({ activity, correct, locked, selectedAnswer, orderItems, matchingAnswers, matchingOptions, activeMatchLeft, numericAnswer, onChoice, onMoveOrder, onSelectMatchLeft, onChooseMatch, onNumericChange, onSubmit, onRead }: {
  activity: Activity;
  correct: boolean;
  locked: boolean;
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
    return <div className="answer-row" key={choice}><button className={`${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`} disabled={locked} onClick={() => onChoice(choice)}><span>{String.fromCharCode(65 + index)}</span>{choice}<i>{isRight ? '✓' : isWrong ? '×' : ''}</i></button><ReadButton label={`Read answer ${choice} aloud`} onRead={() => onRead(choice)} /></div>;
  })}</div>;

  if (activity.activityType === 'true-false') return <div className="answer-grid true-false-grid">{[true, false].map((choice, index) => {
    const label = choice ? 'True' : 'False'; const isRight = correct && choice === activity.answer; const isWrong = selectedAnswer === String(choice) && choice !== activity.answer;
    return <div className="answer-row" key={label}><button className={`${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`} disabled={locked} onClick={() => onChoice(choice)}><span>{index ? 'F' : 'T'}</span>{label}<i>{isRight ? '✓' : isWrong ? '×' : ''}</i></button><ReadButton label={`Read ${label} aloud`} onRead={() => onRead(label)} /></div>;
  })}</div>;

  if (activity.activityType === 'ordering') return <div className="structured-activity"><p className="activity-instruction">Move each card until the order feels right.</p><ol className="order-list">{orderItems.map((item, index) => <li key={item}><span>{index + 1}</span><strong>{item}</strong><div><button onClick={() => onMoveOrder(index, -1)} disabled={locked || index === 0} aria-label={`Move ${item} up`}>↑</button><button onClick={() => onMoveOrder(index, 1)} disabled={locked || index === orderItems.length - 1} aria-label={`Move ${item} down`}>↓</button><ReadButton label={`Read ${item} aloud`} onRead={() => onRead(item)} /></div></li>)}</ol><button className="submit-activity" onClick={onSubmit} disabled={locked}>Check my order</button></div>;

  if (activity.activityType === 'matching') return <div className="structured-activity"><p className="activity-instruction">Choose a card on the left, then choose its match on the right.</p><div className="matching-board"><div>{activity.pairs.map((pair) => <button key={pair.left} className={activeMatchLeft === pair.left ? 'active' : matchingAnswers[pair.left] ? 'paired' : ''} onClick={() => onSelectMatchLeft(pair.left)} disabled={locked}><strong>{pair.left}</strong><small>{matchingAnswers[pair.left] ? `Matched with: ${matchingAnswers[pair.left]}` : 'Choose this card'}</small></button>)}</div><div>{matchingOptions.map((option) => <button key={option} className={Object.values(matchingAnswers).includes(option) ? 'paired' : ''} onClick={() => onChooseMatch(option)} disabled={locked || !activeMatchLeft}><strong>{option}</strong><small>{Object.values(matchingAnswers).includes(option) ? 'Matched' : activeMatchLeft ? `Match with ${activeMatchLeft}` : 'Choose a left card first'}</small></button>)}</div></div><div className="matching-actions"><ReadButton label="Read all matching choices aloud" onRead={() => onRead(activityNarration(activity))} /><button className="submit-activity" onClick={onSubmit} disabled={locked || Object.keys(matchingAnswers).length !== activity.pairs.length}>Check my matches</button></div></div>;

  return <form className="structured-activity numeric-activity" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><label htmlFor={`numeric-${activity.id}`}>Your number</label><div><input id={`numeric-${activity.id}`} type="number" step="any" inputMode="decimal" value={numericAnswer} onChange={(event) => onNumericChange(event.target.value)} disabled={locked} aria-describedby={`numeric-help-${activity.id}`} /><span>{activity.suffix}</span><ReadButton label="Read numeric instructions aloud" onRead={() => onRead(activityNarration(activity))} /></div><small id={`numeric-help-${activity.id}`}>Numbers only. Decimals such as 2.5 are welcome.</small><button className="submit-activity" type="submit" disabled={locked || numericAnswer.trim() === ''}>Check my number</button></form>;
}

function GameHeader({ profile, level, screen, onNavigate, onSound }: { profile: Profile; level: number; screen: Screen; onNavigate: (screen: Screen) => void; onSound: () => void }) {
  return <header className="game-header"><button className="brand brand-button" onClick={() => onNavigate('map')}><span className="brand-mark">K</span><span>K WORLD</span></button><nav aria-label="Explorer menu"><button onClick={() => onNavigate('character')}><span>☺</span>Hero</button><button className={screen === 'backpack' ? 'active' : ''} onClick={() => onNavigate('backpack')}><span>◇</span>Backpack</button><button className={screen === 'progress' || screen === 'mastery' ? 'active' : ''} onClick={() => onNavigate('progress')}><span>↗</span>Progress</button><button className={screen === 'assessment-center' ? 'active' : ''} onClick={() => onNavigate('assessment-center')}><span>⌁</span>Assess</button><button className={screen === 'parent' || screen === 'assessment-report' ? 'active' : ''} onClick={() => onNavigate('parent')}><span>○</span>Grown-ups</button></nav><div className="player-hud"><button className="header-icon" onClick={onSound} aria-label={profile.sound ? 'Turn sound off' : 'Turn sound on'}>{profile.sound ? '♫' : '×'}</button><button className="header-icon" onClick={() => onNavigate('settings')} aria-label="Settings">⚙</button><div className="hud-stars"><span>★</span><strong>{profile.stars}</strong></div><div className="hud-grade" aria-label={profile.grade ? gradeLabel(profile.grade) : 'Grade not selected'}>{profile.grade ?? '—'}</div><div className="hud-profile"><Avatar profile={profile} small /><div><strong>{profile.nickname}</strong><span>Level {level} · {profile.explorerClass}</span></div></div></div></header>;
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
