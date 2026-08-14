import { z } from 'zod';

export const WritingAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  wordCount: z.number(),
  mistakes: z.array(
    z.object({
      category: z.string(),
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
    })
  ),
  correctedText: z.string(),
  strengths: z.array(z.string()),
  recommendations: z.array(z.string()),
  grammarTopics: z.array(z.string()),
  betterVocabulary: z.array(
    z.object({
      word: z.string(),
      suggestion: z.string(),
      context: z.string(),
    })
  ),
});

export type WritingAnalysis = z.infer<typeof WritingAnalysisSchema>;

export const SpeakingAnalysisSchema = z.object({
  fluency: z.number().min(0).max(100),
  vocabulary: z.number().min(0).max(100),
  grammar: z.number().min(0).max(100),
  pronunciation: z.number().min(0).max(100),
  mistakes: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      reason: z.string(),
      category: z.string(),
    })
  ),
  strengths: z.array(z.string()),
  recommendedPhrases: z.array(z.string()),
});

export type SpeakingAnalysis = z.infer<typeof SpeakingAnalysisSchema>;

export const CoachReplySchema = z.object({
  message: z.string(),
  tasks: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
});

export type CoachReply = z.infer<typeof CoachReplySchema>;
