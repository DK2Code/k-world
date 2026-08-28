import type { GradeLevel, Subject } from './types.ts';

export type SchoolStage = 'Elementary' | 'Middle School' | 'High School';
export type LegacyAgeBand = '5–7' | '8–10' | '11–13';

export const gradeLevels: { grade: GradeLevel; label: string; stage: SchoolStage }[] = [
  { grade: 'K', label: 'Kindergarten', stage: 'Elementary' },
  ...(['1', '2', '3', '4', '5'] as GradeLevel[]).map((grade) => ({ grade, label: `Grade ${grade}`, stage: 'Elementary' as const })),
  ...(['6', '7', '8'] as GradeLevel[]).map((grade) => ({ grade, label: `Grade ${grade}`, stage: 'Middle School' as const })),
  ...(['9', '10', '11', '12'] as GradeLevel[]).map((grade) => ({ grade, label: `Grade ${grade}`, stage: 'High School' as const })),
];

export const gradeLabel = (grade: GradeLevel) => grade === 'K' ? 'Kindergarten' : `Grade ${grade}`;
export const gradeNumber = (grade: GradeLevel) => grade === 'K' ? 0 : Number(grade);
export const stageForGrade = (grade: GradeLevel): SchoolStage => gradeNumber(grade) <= 5 ? 'Elementary' : gradeNumber(grade) <= 8 ? 'Middle School' : 'High School';
export const legacyBandForGrade = (grade: GradeLevel): LegacyAgeBand => gradeNumber(grade) <= 2 ? '5–7' : gradeNumber(grade) <= 5 ? '8–10' : '11–13';

export const gradeContexts: Record<GradeLevel, string> = {
  K: 'Sunbeam Meadow', '1': 'Acorn Trail', '2': 'Moonstone Path', '3': 'Compass Camp', '4': 'Skybridge Outpost', '5': 'Starfall Academy',
  '6': 'Crystal Observatory', '7': 'Rune Research Hall', '8': 'Expedition Command', '9': 'Scholar Citadel', '10': 'Discovery Institute', '11': 'Pathfinder Guild', '12': 'Summit Research Council',
};

export const curriculumMap: Record<GradeLevel, Record<Subject, string[]>> = {
  K: { science: ['Living things and their needs', 'Weather, senses, and observation', 'Materials, light, and motion'], math: ['Counting and comparing to 10', 'Shapes and position', 'Joining, separating, and patterns'], english: ['Letters and beginning sounds', 'Rhymes and spoken words', 'Story sequence and simple sentences'] },
  '1': { science: ['Plant and animal structures', 'Seasonal sky and weather patterns', 'Sound, light, and materials'], math: ['Addition and subtraction within 20', 'Place value to 100', 'Shapes, measurement, and data'], english: ['Phonics and word families', 'Sentence conventions', 'Key details and story sequence'] },
  '2': { science: ['Habitats and life cycles', 'Earth materials and water', 'Forces and changes to matter'], math: ['Place value to 1,000', 'Fluent addition and subtraction', 'Measurement, time, money, and equal shares'], english: ['Vowel teams and spelling patterns', 'Parts of speech and sentence expansion', 'Main topic, details, and point of view'] },
  '3': { science: ['Inheritance and life cycles', 'Weather, climate, and Earth processes', 'Forces, motion, and simple experiments'], math: ['Multiplication and division', 'Fractions as numbers', 'Area, perimeter, and data'], english: ['Multisyllable decoding and vocabulary', 'Paragraph structure and grammar', 'Main idea, inference, and text features'] },
  '4': { science: ['Energy and waves', 'Structures and information in organisms', 'Weathering, erosion, and Earth systems'], math: ['Multi-digit operations', 'Fraction equivalence and decimals', 'Angles, geometry, and measurement'], english: ['Morphology and context clues', 'Theme, summary, and evidence', 'Opinion and explanatory writing'] },
  '5': { science: ['Matter and chemical changes', 'Ecosystems and energy flow', 'Space systems and scientific models'], math: ['Fraction operations', 'Decimals and volume', 'Coordinate graphs and numerical patterns'], english: ['Academic vocabulary and word roots', 'Text structure and multiple sources', 'Claims, evidence, and revision'] },
  '6': { science: ['Cells and body systems', 'Earth systems and climate evidence', 'Energy transfer and experimental variables'], math: ['Ratios, rates, and percentages', 'Rational numbers and expressions', 'Area, surface area, statistics, and probability'], english: ['Sentence structure and clauses', 'Central idea and textual evidence', 'Argument, purpose, and source comparison'] },
  '7': { science: ['Ecosystem interactions and change', 'Atoms, molecules, and reactions', 'Forces, energy, and engineering design'], math: ['Proportional relationships', 'Equations and inequalities', 'Geometry, sampling, and probability'], english: ['Word roots and nuanced vocabulary', 'Inference, structure, and point of view', 'Argument analysis and sentence revision'] },
  '8': { science: ['Genetics and natural selection', 'Matter, energy, and chemical processes', 'Earth history, space, and scientific reasoning'], math: ['Linear equations and functions', 'Transformations and coordinate geometry', 'Exponents, data, and multi-step modeling'], english: ['Rhetoric and figurative language', 'Evidence across multiple texts', 'Research, synthesis, and precise revision'] },
  '9': { science: ['Cell biology and heredity', 'Ecology and environmental change', 'Scientific modeling and evidence'], math: ['Linear equations and systems', 'Functions and coordinate models', 'Exponents, statistics, and algebraic reasoning'], english: ['Argument and textual evidence', 'Narrative structure and literary analysis', 'Research credibility and sentence craft'] },
  '10': { science: ['Atomic structure and bonding', 'Chemical reactions and conservation', 'Climate systems and quantitative evidence'], math: ['Geometry and similarity', 'Quadratic relationships', 'Trigonometry foundations and statistical models'], english: ['Rhetorical analysis', 'Comparing themes and perspectives', 'Research synthesis and explanatory composition'] },
  '11': { science: ['Forces, motion, and energy', 'Electricity, waves, and fields', 'Quantitative experimental analysis'], math: ['Polynomial and exponential functions', 'Trigonometric relationships', 'Probability, modeling, and algebraic proof'], english: ['Complex literary analysis', 'Rhetoric and argument design', 'Source synthesis and sustained revision'] },
  '12': { science: ['Environmental systems and sustainability', 'Astronomy and gravitational models', 'Experimental design and data interpretation'], math: ['Advanced functions and modeling', 'Trigonometric applications', 'Statistics, probability, and multi-step problem solving'], english: ['Advanced composition and style', 'Comparative analysis and rhetoric', 'Research evaluation and evidence-based synthesis'] },
};

export function gradePresentation(grade: GradeLevel) {
  const value = gradeNumber(grade);
  if (value <= 2) return { density: 'early', questLength: 3, assessmentLength: 6, narrationDefault: true, descriptor: 'Big controls, short clues, and audio-friendly adventures' } as const;
  if (value <= 5) return { density: 'elementary', questLength: 3, assessmentLength: 8, narrationDefault: false, descriptor: 'Story missions, multi-step puzzles, and richer vocabulary' } as const;
  if (value <= 8) return { density: 'middle', questLength: 3, assessmentLength: 9, narrationDefault: false, descriptor: 'Strategy, evidence, and deeper explanations' } as const;
  return { density: 'high', questLength: 3, assessmentLength: 9, narrationDefault: false, descriptor: 'Advanced analysis, simulations, and real-world problems' } as const;
}
