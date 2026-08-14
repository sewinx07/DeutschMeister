import { WritingAnalysis, WritingAnalysisSchema } from './schemas';

interface Issue {
  category: string;
  original: string;
  corrected: string;
  explanation: string;
}

const CONNECTORS = ['und', 'aber', 'oder', 'weil', 'deshalb', 'trotzdem', 'außerdem', 'dann', 'jedoch'];

export function analyzeWriting(text: string): WritingAnalysis {
  const issues: Issue[] = [];
  const sentences = splitSentences(text);

  // 1. Missing sentence-ending punctuation
  sentences.forEach((sentence) => {
    if (sentence.trim() && !/[.!?…]$/.test(sentence.trim())) {
      issues.push({
        category: 'punctuation',
        original: sentence.trim(),
        corrected: sentence.trim() + '.',
        explanation: 'Add a full stop at the end of the sentence.',
      });
    }
  });

  // 2. Lowercase at start of sentence
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    const m = trimmed.match(/^([a-zäöüß])/);
    if (m) {
      const fixed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      issues.push({
        category: 'capitalization',
        original: trimmed,
        corrected: fixed,
        explanation: 'Sentences begin with a capital letter in German.',
      });
    }
  });

  // 3. "ich" must be lowercase mid-sentence (informal); but at start it's capital
  const ichMid = text.match(/(?<=[,;:])\s+Ich\b/g);
  if (ichMid) {
    issues.push({
      category: 'capitalization',
      original: ichMid[0].trim(),
      corrected: ichMid[0].trim().toLowerCase(),
      explanation: '"ich" is written in lowercase inside a sentence.',
    });
  }

  // 4. Nouns after articles should be capitalized
  const nounCheck = text.match(/\b(der|die|das|ein|eine|einen|einem|mein|meine|dein|deine|ihr|ihre)\s+([a-zäöüß][a-zäöüß-]*)\b/g);
  if (nounCheck) {
    const seen = new Set<string>();
    for (const pair of nounCheck) {
      const [, noun] = pair.split(' ');
      if (!noun) continue;
      const lower = noun.toLowerCase();
      if (knownFunctionWord(lower)) continue;
      const key = pair;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        category: 'capitalization',
        original: pair,
        corrected: pair.replace(noun, noun.charAt(0).toUpperCase() + noun.slice(1)),
        explanation: `Nouns are capitalized in German ("${pair}").`,
      });
    }
  }

  // 5. Missing comma before subordinating conjunction
  const commaCheck = text.match(/([^,.])\s+(weil|dass|wenn|obwohl|ob)\b/g);
  if (commaCheck) {
    issues.push({
      category: 'punctuation',
      original: commaCheck[0].trim(),
      corrected: commaCheck[0].replace(/\s+(weil|dass|wenn|obwohl|ob)\b/, ', $1'),
      explanation: 'Use a comma before "weil/dass/wenn/obwohl".',
    });
  }

  // 6. Verb position in subordinate clauses (high confidence heuristic)
  const subClauses = text.match(/[^.!?]*\b(weil|dass|wenn|obwohl|ob)\b[^.!?]*[.!?]?/g);
  if (subClauses) {
    const auxVerbs = /\b(haben|habe|hat|sein|bin|ist|sind|können|kann|kannst|wollen|will|willst|müssen|muss|musst|sollen|soll|sollst|dürfen|darf|werden|wird|würde|würden|möchte|möchten)\b/i;
    for (const clause of subClauses) {
      const words = clause.trim().replace(/[.!?]$/, '').split(/\s+/);
      const last = words[words.length - 1];
      const hasAux = auxVerbs.test(clause);
      if (hasAux && last && !/en$|t$|e$|et$|st$|en|gegangen|gekommen|gemacht/g.test(last)) {
        issues.push({
          category: 'word-order',
          original: clause.trim(),
          corrected: clause.trim(),
          explanation: 'In subordinate clauses (weil/dass/wenn) the conjugated verb goes to the END of the clause.',
        });
      }
    }
  }

  // 7. Double negation
  const doubleNeg = text.match(/\bkeine?\s+\w+\s+nicht\b/i);
  if (doubleNeg) {
    issues.push({
      category: 'grammar',
      original: doubleNeg[0],
      corrected: doubleNeg[0].replace(/\s+nicht\b/i, ''),
      explanation: 'Avoid double negation: "kein X nicht".',
    });
  }

  // 8. Common misspellings
  const simpleMisspellings: [RegExp, string, string][] = [
    [/\bunde\b/g, 'und', 'Spelling: "und"'],
    [/\bmit\s+einander\b/g, 'miteinander', 'Spelling: "miteinander"'],
    [/\bnocheinmal\b/g, 'noch einmal', 'Spelling: "noch einmal"'],
    [/\bkurt\b/gi, 'kurz', 'Spelling: "kurz"'],
    [/\bvieleicht\b/gi, 'vielleicht', 'Spelling: "vielleicht"'],
  ];
  for (const [re, fixed, reason] of simpleMisspellings) {
    const m = text.match(re);
    if (m) {
      issues.push({
        category: 'spelling',
        original: m[0],
        corrected: fixed,
        explanation: reason,
      });
    }
  }

  // 9. Informal abbreviations
  const slang: [RegExp, string, string][] = [
    [/\b\w+(?<!u)&\b/g, '', ''],
    [/\bug\b/g, 'und', 'Use "und" in writing.'],
    [/\bgr8\b/g, 'gut', 'Use proper German.'],
  ];
  for (const [re, fixed, reason] of slang) {
    if (!reason) continue;
    const m = text.match(re);
    if (m) {
      issues.push({
        category: 'register',
        original: m[0],
        corrected: fixed,
        explanation: reason,
      });
    }
  }

  // Vocabulary suggestions
  const betterVocabulary: WritingAnalysis['betterVocabulary'] = [];
  const vocabMap: [RegExp, string, string][] = [
    [/\bsehr\s+gut\b/g, 'hervorragend', 'a stronger adjective than "sehr gut"'],
    [/\bgut\b/g, 'positiv / überzeugend', 'more precise word in a professional context'],
    [/\bmachen\b/g, 'durchführen / erledigen', 'more formal verb'],
    [/\bgehen\b/g, 'verlaufen', 'more precise for situations'],
    [/\bviel\b/g, 'umfangreich / zahlreich', 'more precise'],
    [/\bwichtig\b/g, 'entscheidend / wesentlich', 'a stronger word'],
  ];
  for (const [re, suggestion, context] of vocabMap) {
    const m = text.match(re);
    if (m) {
      betterVocabulary.push({
        word: m[0],
        suggestion,
        context,
      });
      if (betterVocabulary.length >= 3) break;
    }
  }

  // Strengths
  const strengths: string[] = [];
  const connectorCount = CONNECTORS.filter((c) => new RegExp(`\\b${c}\\b`).test(text)).length;
  const uniqueWords = new Set(text.toLowerCase().match(/[a-zäöüß]+/g)).size;
  const totalWords = (text.match(/[a-zäöüß]+/gi) || []).length;
  const wordVariety = totalWords > 0 ? uniqueWords / totalWords : 0;
  if (connectorCount >= 2) strengths.push('Good use of connectors for coherence.');
  if (wordVariety > 0.6) strengths.push('Rich and varied vocabulary.');
  if (sentences.length >= 3) strengths.push('The text is structured in multiple sentences.');
  if (text.split(/\s+/).length >= 30) strengths.push('Good length for a short writing task.');
  if (strengths.length === 0) strengths.push('You attempted the task and used complete sentences.');

  // Score
  let score = 100;
  score -= issues.length * 6;
  score -= Math.max(0, Math.min(20, 50 - text.split(/\s+/).length));
  if (wordVariety < 0.5) score -= 5;
  score = Math.max(10, Math.min(100, score));

  const deduped = dedupeIssues(issues);
  const correctedText = applyCorrections(text, deduped);

  const grammarTopics = topicRecommendations(deduped);
  const recommendations = deduped.slice(0, 4).map((i) => i.explanation);
  if (recommendations.length === 0) {
    recommendations.push('Focus on extending your sentences with subordinate clauses (weil, dass, wenn).');
  }

  const result: WritingAnalysis = {
    score: Math.round(score),
    wordCount: totalWords,
    mistakes: deduped.slice(0, 8).map((i) => ({
      category: i.category,
      original: i.original,
      corrected: i.corrected,
      explanation: i.explanation,
    })),
    correctedText,
    strengths,
    recommendations,
    grammarTopics,
    betterVocabulary,
  };

  return WritingAnalysisSchema.parse(result);
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = i.category + '|' + i.original;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function knownFunctionWord(word: string): boolean {
  const functionWords = new Set([
    'und', 'oder', 'aber', 'nicht', 'auch', 'ist', 'sind', 'war', 'wird', 'werden',
    'hat', 'habe', 'hast', 'haben', 'bin', 'bist', 'sehr', 'gern', 'gerne', 'noch',
    'immer', 'oft', 'man', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'zu', 'in',
    'mit', 'auf', 'für', 'an', 'nach', 'bei', 'von', 'um', 'aus', 'über', 'unter',
    'mein', 'meine', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'kein', 'keine',
    'sich', 'denn', 'dann', 'also', 'mal', 'jetzt', 'heute', 'morgen', 'gestern',
  ]);
  return functionWords.has(word);
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
}

function applyCorrections(text: string, issues: Issue[]): string {
  let result = text;
  for (const issue of issues) {
    if (issue.original === issue.corrected) continue;
    if (issue.corrected) {
      try {
        result = result.split(issue.original).join(issue.corrected);
      } catch {
        /* skip */
      }
    }
  }
  return result.trim();
}

function topicRecommendations(issues: Issue[]): string[] {
  const topics = new Set<string>();
  for (const issue of issues) {
    switch (issue.category) {
      case 'word-order':
        topics.add('Word order — subordinate clauses');
        topics.add('Main clauses & V2 rule');
        break;
      case 'capitalization':
        topics.add('Nouns & articles');
        break;
      case 'punctuation':
        topics.add('Main clauses & V2 rule');
        break;
      case 'grammar':
        topics.add('Verb conjugation');
        break;
      case 'spelling':
        topics.add('Vocabulary — common spelling');
        break;
      default:
        break;
    }
  }
  return Array.from(topics).slice(0, 3);
}
