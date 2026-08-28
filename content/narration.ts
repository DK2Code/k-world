import { gradeNumber } from './grades.ts';
import type { GradeLevel } from './types.ts';

export type NarratorVoice = {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
};

export type RankedNarratorVoice<T extends NarratorVoice = NarratorVoice> = T & {
  score: number;
  recommended: boolean;
  quality: 'enhanced' | 'standard';
};

export type NarratorStyle = 'adventure' | 'storyteller' | 'coach';

export const narratorStyles: { id: NarratorStyle; name: string; description: string }[] = [
  { id: 'adventure', name: 'Warm Adventure Guide', description: 'Friendly energy with lively, natural pauses.' },
  { id: 'storyteller', name: 'Calm Storyteller', description: 'Gentle pacing with longer pauses between ideas.' },
  { id: 'coach', name: 'Clear Learning Coach', description: 'Crisp instructions and extra clarity for questions.' },
];

const qualityPattern = /natural|neural|enhanced|premium|high quality|studio/i;
const trustedPattern = /aria|ava|jenny|guy|sonia|ryan|samantha|zira|alex|daniel|karen|moira|tessa|google (us|uk|australia|canada)|microsoft .* online/i;
const syntheticPattern = /espeak|festival|robot|whisper|novelty/i;

export function voiceQualityScore(voice: NarratorVoice) {
  let score = 0;
  if (/^en(?:[-_]|$)/i.test(voice.lang)) score += 100;
  if (/^en-(US|GB|CA|AU|IE|NZ)$/i.test(voice.lang)) score += 10;
  if (qualityPattern.test(voice.name)) score += 80;
  if (trustedPattern.test(voice.name)) score += 45;
  if (voice.localService) score += 18;
  if (voice.default) score += 8;
  if (syntheticPattern.test(voice.name)) score -= 100;
  return score;
}

export function rankNarratorVoices<T extends NarratorVoice>(voices: T[]): RankedNarratorVoice<T>[] {
  const unique = [...new Map(voices.map((voice) => [voice.voiceURI || `${voice.name}-${voice.lang}`, voice])).values()];
  const english = unique.filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
  return english
    .map((voice) => ({ ...voice, score: voiceQualityScore(voice), recommended: false, quality: qualityPattern.test(voice.name) ? 'enhanced' as const : 'standard' as const }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .map((voice, index) => ({ ...voice, recommended: index === 0 }));
}

export function resolveNarratorVoice<T extends NarratorVoice>(voices: T[], preferredVoiceURI: string) {
  const ranked = rankNarratorVoices(voices);
  return ranked.find((voice) => voice.voiceURI === preferredVoiceURI) ?? ranked[0];
}

const numberWords: Record<string, string> = {
  '½': 'one half', '⅓': 'one third', '⅔': 'two thirds', '¼': 'one quarter', '¾': 'three quarters',
};

export function prepareNarrationText(value: string) {
  let text = value;
  for (const [symbol, words] of Object.entries(numberWords)) text = text.replaceAll(symbol, words);
  return text.normalize('NFKC')
    .replace(/\bGrade\s+K\b/gi, 'Kindergarten')
    .replace(/\bXP\b/g, 'explorer points')
    .replace(/\bSTEM\b/g, 'science, technology, engineering, and math')
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/f\s*\(\s*x\s*\)/gi, 'f of x')
    .replace(/(\d)²/g, '$1 squared')
    .replace(/(\d)³/g, '$1 cubed')
    .replace(/√/g, ' square root of ')
    .replace(/π/g, ' pi ')
    .replace(/∑/g, ' sum ')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/≤/g, ' is less than or equal to ')
    .replace(/≥/g, ' is greater than or equal to ')
    .replace(/≠/g, ' is not equal to ')
    .replace(/=/g, ' equals ')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1 over $2')
    .replace(/%/g, ' percent ')
    .replace(/°/g, ' degrees ')
    .replace(/&/g, ' and ')
    .replace(/[→⇒]/g, ', then ')
    .replace(/[★✦◆◇⌁⚗⚙♫☺◉▶Ⅱ■↻]/g, ' ')
    .replace(/[•·]/g, '. ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([,.;!?])(?=\S)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitNarration(value: string, maxLength = 170) {
  const text = prepareNarrationText(value);
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
  const segments: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxLength) { segments.push(sentence); continue; }
    const clauses = sentence.split(/(?<=[,;:])\s+/);
    let segment = '';
    for (const clause of clauses) {
      if (!segment || `${segment} ${clause}`.length <= maxLength) segment = `${segment} ${clause}`.trim();
      else { segments.push(segment); segment = clause; }
    }
    if (segment) {
      if (segment.length <= maxLength) segments.push(segment);
      else {
        const words = segment.split(/\s+/);
        let phrase = '';
        for (const word of words) {
          if (!phrase || `${phrase} ${word}`.length <= maxLength) phrase = `${phrase} ${word}`.trim();
          else { segments.push(phrase); phrase = word; }
        }
        if (phrase) segments.push(phrase);
      }
    }
  }
  return segments;
}

export function narrationDelivery(grade: GradeLevel | null, chosenRate: number, chosenPitch: number, narratorStyle: NarratorStyle = 'adventure', segmentIndex = 0, segment = '') {
  const gradeValue = grade ? gradeNumber(grade) : 5;
  const safeRate = Math.min(1.2, Math.max(0.65, chosenRate));
  const safePitch = Math.min(1.1, Math.max(0.9, chosenPitch));
  const styleSettings = narratorStyle === 'storyteller'
    ? { rate: .94, pitch: -.015, pause: 1.35 }
    : narratorStyle === 'coach'
      ? { rate: 1.01, pitch: -.025, pause: .9 }
      : { rate: .98, pitch: 0, pause: 1.08 };
  const cadence = [1, .965, 1.018, .985][segmentIndex % 4];
  const emphasis = /\?|choose|remember|important|clue|carefully/i.test(segment) ? .95 : segment.length < 38 ? .98 : 1;
  const gradeSettings = gradeValue <= 2
    ? { rate: .9, pitch: .01, pause: 230, label: 'Gentle early-reader pace' }
    : gradeValue <= 5
      ? { rate: .98, pitch: 0, pause: 150, label: 'Friendly conversational pace' }
      : gradeValue <= 8
        ? { rate: 1.02, pitch: -.01, pause: 110, label: 'Natural, confident pace' }
        : { rate: 1.04, pitch: -.025, pause: 90, label: 'Calm, mature pace' };
  return {
    rate: Math.min(1.2, Math.max(.62, safeRate * styleSettings.rate * gradeSettings.rate * cadence * emphasis)),
    pitch: Math.min(gradeValue >= 9 ? 1 : 1.05, Math.max(.86, safePitch + styleSettings.pitch + gradeSettings.pitch)),
    pauseMs: Math.round(gradeSettings.pause * styleSettings.pause),
    style: `${narratorStyles.find((item) => item.id === narratorStyle)?.name ?? 'Warm Adventure Guide'} · ${gradeSettings.label}`,
  };
}
