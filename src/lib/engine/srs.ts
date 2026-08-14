import type { VocabularyWord } from '@/types';
import { addDays } from '../db/storage';

export interface SrsReviewResult {
  word: VocabularyWord;
  familiar: boolean;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export function applySrsReview(word: VocabularyWord, rating: ReviewRating): VocabularyWord {
  const ease = word.ease || 2.5;
  const reviews = word.reviews || 0;

  let nextEase = ease;
  let interval: number;
  let familiarity: number;

  switch (rating) {
    case 'again':
      nextEase = Math.max(1.3, ease - 0.2);
      interval = 0;
      familiarity = Math.max(0, word.familiarity - 0.15);
      break;
    case 'hard':
      nextEase = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round((word.interval || 0) * 0.5));
      familiarity = Math.max(0, word.familiarity - 0.05);
      break;
    case 'good':
      nextEase = ease;
      interval =
        reviews === 0 ? 1 : Math.round((word.interval || 0) * nextEase);
      familiarity = Math.min(1, word.familiarity + 0.15);
      break;
    case 'easy':
      nextEase = Math.min(3.2, ease + 0.15);
      interval =
        reviews === 0
          ? 2
          : Math.round((word.interval || 0) * nextEase * 1.3);
      familiarity = Math.min(1, word.familiarity + 0.25);
      break;
  }

  return {
    ...word,
    ease: nextEase,
    interval: Math.min(365, interval),
    reviews: reviews + 1,
    familiarity: Math.round(familiarity * 100) / 100,
    dueAt: addDays(new Date(), interval).toISOString(),
    lastReviewedAt: new Date().toISOString(),
    mastered: familiarity >= 0.85,
  };
}

export function isDue(word: VocabularyWord, now = new Date()): boolean {
  return new Date(word.dueAt) <= now;
}

export function dueWords(
  words: VocabularyWord[],
  limit = 20,
  now = new Date()
): VocabularyWord[] {
  return words
    .filter((w) => !w.mastered && isDue(w, now))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit);
}

export function nextDueWords(
  words: VocabularyWord[],
  now = new Date()
): VocabularyWord[] {
  return words
    .filter((w) => !w.mastered && isDue(w, now))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export function getLearningQueue(
  words: VocabularyWord[],
  count = 10,
  now = new Date()
): VocabularyWord[] {
  return words
    .filter((w) => !w.mastered)
    .sort((a, b) => {
      const dueA = isDue(a, now) ? 0 : 1;
      const dueB = isDue(b, now) ? 0 : 1;
      if (dueA !== dueB) return dueA - dueB;
      const aScore = a.familiarity + a.difficulty * 0.1;
      const bScore = b.familiarity + b.difficulty * 0.1;
      return aScore - bScore;
    })
    .slice(0, count);
}
