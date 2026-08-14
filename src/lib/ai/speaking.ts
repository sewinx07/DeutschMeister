import { SpeakingAnalysis, SpeakingAnalysisSchema } from './schemas';
import { analyzeWriting } from './writing';

export interface SpeakingInput {
  answers: { question: string; answer: string }[];
  durationMinutes: number;
}

export function analyzeSpeaking(input: SpeakingInput): SpeakingAnalysis {
  const transcript = input.answers.map((a) => a.answer).join(' ');
  const words = transcript.match(/[a-zäöüß]+/gi) || [];
  const totalWords = words.length;
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const wordVariety = totalWords > 0 ? uniqueWords / totalWords : 0;

  const writingAnalysis = analyzeWriting(transcript);

  const attempted = input.answers.filter((a) => a.answer.trim().length > 0).length;
  const completion = input.answers.length > 0 ? attempted / input.answers.length : 0;

  // Vocabulary score: variety + length of answers
  const vocabulary = Math.round(
    Math.min(100, 30 + wordVariety * 50 + Math.min(20, totalWords / 8))
  );

  // Grammar: derived from writing analysis
  const grammar = Math.round(Math.max(15, writingAnalysis.score));

  // Fluency: based on how fully questions were answered
  const fluency = Math.round(
    Math.min(100, 20 + completion * 40 + Math.min(20, totalWords / 30) + (input.durationMinutes >= 3 ? 10 : 0))
  );

  // Pronunciation: not measurable without audio.
  const pronunciation = 60;

  const mistakes = writingAnalysis.mistakes.slice(0, 6).map((m) => ({
    original: m.original,
    corrected: m.corrected,
    reason: m.explanation,
    category: m.category,
  }));

  const strengths: string[] = [];
  if (completion >= 0.8) strengths.push('You answered most of the questions fully.');
  if (wordVariety > 0.6) strengths.push('You used a varied vocabulary.');
  if (totalWords >= 40) strengths.push('Your answers were detailed enough for this level.');
  if (strengths.length === 0) strengths.push('You attempted the conversation — keep practising!');

  const recommendedPhrases = [
    'Meiner Meinung nach …',
    'Ich finde, dass …',
    'Zum Beispiel …',
    'Das hängt davon ab.',
    'Könnten Sie das bitte wiederholen?',
  ];

  const result: SpeakingAnalysis = {
    fluency,
    vocabulary,
    grammar,
    pronunciation,
    mistakes,
    strengths,
    recommendedPhrases,
  };

  return SpeakingAnalysisSchema.parse(result);
}
