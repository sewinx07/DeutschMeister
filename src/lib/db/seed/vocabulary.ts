import type { VocabularyWord } from '@/types';
import { addDays } from '../storage';

interface VocabSeed {
  german: string;
  article: string;
  plural?: string;
  english: string;
  ipa?: string;
  example: string;
  exampleEnglish?: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

const words: VocabSeed[] = [
  // Ausbildung & Work
  { german: 'Bewerbung', article: 'die', plural: '-en', english: 'application (job)', example: 'Ich schicke meine Bewerbung an die Firma.', exampleEnglish: 'I am sending my application to the company.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Lebenslauf', article: 'der', plural: '-läufe', english: 'CV / résumé', example: 'Mein Lebenslauf ist auf Deutsch geschrieben.', exampleEnglish: 'My CV is written in German.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Anschreiben', article: 'das', plural: '-', english: 'cover letter', example: 'Das Anschreiben sollte kurz und höflich sein.', exampleEnglish: 'The cover letter should be short and polite.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Ausbildung', article: 'die', plural: '-en', english: 'vocational training', example: 'Ich mache eine Ausbildung zum Fachinformatiker.', exampleEnglish: 'I am doing vocational training to become an IT specialist.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Vorstellungsgespräch', article: 'das', plural: '-e', english: 'job interview', example: 'Morgen habe ich ein Vorstellungsgespräch.', exampleEnglish: 'Tomorrow I have a job interview.', category: 'Ausbildung / Work', difficulty: 3 },
  { german: 'Betrieb', article: 'der', plural: '-e', english: 'company / firm', example: 'Ich mache meine Ausbildung in einem IT-Betrieb.', exampleEnglish: 'I am doing my training at an IT company.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Arbeitgeber', article: 'der', plural: '-', english: 'employer', example: 'Der Arbeitgeber sucht neue Azubis.', exampleEnglish: 'The employer is looking for new trainees.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Arbeitnehmer', article: 'der', plural: '-', english: 'employee', example: 'Der Arbeitnehmer hat Anspruch auf Urlaub.', exampleEnglish: 'The employee is entitled to holiday.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Gehalt', article: 'das', plural: 'Gehälter', english: 'salary', example: 'Das Gehalt in der Ausbildung ist nicht hoch.', exampleEnglish: 'The salary during training is not high.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Beruf', article: 'der', plural: '-e', english: 'profession / job', example: 'Welcher Beruf passt zu mir?', exampleEnglish: 'Which profession suits me?', category: 'Ausbildung / Work', difficulty: 1 },
  { german: 'Praxis', article: 'die', plural: 'Praxen', english: 'practical work / practice', example: 'In der Ausbildung lerne ich viel Praxis.', exampleEnglish: 'During training I learn a lot of practical work.', category: 'Ausbildung / Work', difficulty: 2 },
  { german: 'Prüfung', article: 'die', plural: '-en', english: 'exam / test', example: 'Die Prüfung ist am 24. September.', exampleEnglish: 'The exam is on 24 September.', category: 'Ausbildung / Work', difficulty: 1 },
  { german: 'Vertrag', article: 'der', plural: 'Verträge', english: 'contract', example: 'Ich unterschreibe den Ausbildungsvertrag.', exampleEnglish: 'I sign the training contract.', category: 'Ausbildung / Work', difficulty: 2 },

  // IT
  { german: 'Software', article: 'die', plural: '-n', english: 'software', example: 'Die Software hat einen Fehler.', exampleEnglish: 'The software has a bug.', category: 'IT', difficulty: 1 },
  { german: 'Programmieren', article: 'das', plural: '-', english: 'programming', example: 'Programmieren macht mir Spaß.', exampleEnglish: 'Programming is fun for me.', category: 'IT', difficulty: 1 },
  { german: 'Programmierer', article: 'der', plural: '-', english: 'programmer', example: 'Der Programmierer schreibt Code.', exampleEnglish: 'The programmer writes code.', category: 'IT', difficulty: 2 },
  { german: 'Datenbank', article: 'die', plural: '-en', english: 'database', example: 'Wir speichern die Daten in einer Datenbank.', exampleEnglish: 'We store the data in a database.', category: 'IT', difficulty: 2 },
  { german: 'Server', article: 'der', plural: '-', english: 'server', example: 'Der Server läuft mit Linux.', exampleEnglish: 'The server runs on Linux.', category: 'IT', difficulty: 2 },
  { german: 'Netzwerk', article: 'das', plural: '-e', english: 'network', example: 'Das Netzwerk ist heute sehr langsam.', exampleEnglish: 'The network is very slow today.', category: 'IT', difficulty: 2 },
  { german: 'Fehler', article: 'der', plural: '-', english: 'bug / error', example: 'Ich habe einen Fehler im Code gefunden.', exampleEnglish: 'I found a bug in the code.', category: 'IT', difficulty: 1 },
  { german: 'Sicherheit', article: 'die', plural: '-en', english: 'security', example: 'Die Sicherheit der Daten ist wichtig.', exampleEnglish: 'The security of the data is important.', category: 'IT', difficulty: 2 },
  { german: 'Anwendung', article: 'die', plural: '-en', english: 'application (software)', example: 'Diese Anwendung hilft beim Lernen.', exampleEnglish: 'This application helps with learning.', category: 'IT', difficulty: 2 },
  { german: 'Benutzer', article: 'der', plural: '-', english: 'user', example: 'Der Benutzer meldet sich an.', exampleEnglish: 'The user logs in.', category: 'IT', difficulty: 2 },
  { german: 'Entwickler', article: 'der', plural: '-', english: 'developer', example: 'Als Entwickler baue ich Apps.', exampleEnglish: 'As a developer I build apps.', category: 'IT', difficulty: 2 },

  // Everyday
  { german: 'Zeit', article: 'die', plural: '-en', english: 'time', example: 'Ich habe heute keine Zeit.', exampleEnglish: 'I have no time today.', category: 'Everyday', difficulty: 1 },
  { german: 'Hausaufgaben', article: 'die', plural: '-', english: 'homework', example: 'Ich mache meine Hausaufgaben am Abend.', exampleEnglish: 'I do my homework in the evening.', category: 'Everyday', difficulty: 1 },
  { german: 'Wochenende', article: 'das', plural: '-e', english: 'weekend', example: 'Am Wochenende lerne ich Deutsch.', exampleEnglish: 'At the weekend I study German.', category: 'Everyday', difficulty: 1 },
  { german: 'Familie', article: 'die', plural: '-n', english: 'family', example: 'Meine Familie lebt in meiner Heimat.', exampleEnglish: 'My family lives in my home country.', category: 'Everyday', difficulty: 1 },
  { german: 'Freund', article: 'der', plural: '-e', english: 'friend', example: 'Mein Freund hilft mir beim Lernen.', exampleEnglish: 'My friend helps me study.', category: 'Everyday', difficulty: 1 },
  { german: 'Wohnung', article: 'die', plural: '-en', english: 'apartment', example: 'Ich suche eine neue Wohnung in Berlin.', exampleEnglish: 'I am looking for a new apartment in Berlin.', category: 'Everyday', difficulty: 1 },
  { german: 'Nachbar', article: 'der', plural: '-n', english: 'neighbour', example: 'Mein Nachbar ist sehr nett.', exampleEnglish: 'My neighbour is very nice.', category: 'Everyday', difficulty: 2 },
  { german: 'Termin', article: 'der', plural: '-e', english: 'appointment', example: 'Ich habe einen Termin beim Arzt.', exampleEnglish: 'I have a doctor\'s appointment.', category: 'Everyday', difficulty: 1 },
  { german: 'Erfahrung', article: 'die', plural: '-en', english: 'experience', example: 'Ich habe Erfahrung mit JavaScript.', exampleEnglish: 'I have experience with JavaScript.', category: 'Everyday', difficulty: 2 },
  { german: 'Ziel', article: 'das', plural: '-e', english: 'goal', example: 'Mein Ziel ist die Prüfung zu bestehen.', exampleEnglish: 'My goal is to pass the exam.', category: 'Everyday', difficulty: 2 },

  // Study & school
  { german: 'Kurs', article: 'der', plural: '-e', english: 'course', example: 'Ich besuche einen Deutschkurs.', exampleEnglish: 'I attend a German course.', category: 'Study', difficulty: 1 },
  { german: 'Übung', article: 'die', plural: '-en', english: 'exercise', example: 'Diese Übung ist sehr gut.', exampleEnglish: 'This exercise is very good.', category: 'Study', difficulty: 1 },
  { german: 'Wortschatz', article: 'der', plural: '-', english: 'vocabulary', example: 'Ich lerne jeden Tag zehn neue Wörter.', exampleEnglish: 'I learn ten new words every day.', category: 'Study', difficulty: 2 },
  { german: 'Satz', article: 'der', plural: 'Sätze', english: 'sentence', example: 'Bitte schreib einen Satz mit dem Wort.', exampleEnglish: 'Please write a sentence with the word.', category: 'Study', difficulty: 1 },
  { german: 'Bedeutung', article: 'die', plural: '-en', english: 'meaning', example: 'Was ist die Bedeutung von "Azubi"?', exampleEnglish: 'What is the meaning of "Azubi"?', category: 'Study', difficulty: 2 },
  { german: 'Fehler machen', article: '-', english: 'to make mistakes', example: 'Fehler zu machen ist normal.', exampleEnglish: 'Making mistakes is normal.', category: 'Study', difficulty: 2 },
  { german: 'Verbessern', article: '-', english: 'to improve', example: 'Ich möchte mein Deutsch verbessern.', exampleEnglish: 'I want to improve my German.', category: 'Study', difficulty: 2 },
  { german: 'Wiederholen', article: '-', english: 'to repeat / revise', example: 'Ich muss die Grammatik wiederholen.', exampleEnglish: 'I have to revise the grammar.', category: 'Study', difficulty: 2 },

  // Communication
  { german: 'Frage', article: 'die', plural: '-n', english: 'question', example: 'Ich habe eine Frage zur Grammatik.', exampleEnglish: 'I have a question about the grammar.', category: 'Communication', difficulty: 1 },
  { german: 'Antwort', article: 'die', plural: '-en', english: 'answer', example: 'Deine Antwort ist richtig.', exampleEnglish: 'Your answer is correct.', category: 'Communication', difficulty: 1 },
  { german: 'Meinung', article: 'die', plural: '-en', english: 'opinion', example: 'Meiner Meinung nach ist das wichtig.', exampleEnglish: 'In my opinion that is important.', category: 'Communication', difficulty: 2 },
  { german: 'Empfehlung', article: 'die', plural: '-en', english: 'recommendation', example: 'Hast du eine Empfehlung für einen Kurs?', exampleEnglish: 'Do you have a recommendation for a course?', category: 'Communication', difficulty: 2 },
  { german: 'Erklären', article: '-', english: 'to explain', example: 'Kannst du das nochmal erklären?', exampleEnglish: 'Can you explain that again?', category: 'Communication', difficulty: 2 },
  { german: 'Vergessen', article: '-', english: 'to forget', example: 'Ich vergesse oft die Artikel.', exampleEnglish: 'I often forget the articles.', category: 'Communication', difficulty: 1 },
  { german: 'Überlegen', article: '-', english: 'to think about / consider', example: 'Ich überlege, mich zu bewerben.', exampleEnglish: 'I am considering applying.', category: 'Communication', difficulty: 2 },
  { german: 'Zusammenfassen', article: '-', english: 'to summarize', example: 'Bitte fassen Sie den Text zusammen.', exampleEnglish: 'Please summarize the text.', category: 'Communication', difficulty: 3 },

  // Feelings & abstract
  { german: 'Hoffnung', article: 'die', plural: '-en', english: 'hope', example: 'Ich habe die Hoffnung, den Job zu bekommen.', exampleEnglish: 'I hope to get the job.', category: 'Abstract', difficulty: 2 },
  { german: 'Erfolg', article: 'der', plural: '-e', english: 'success', example: 'Viel Erfolg bei der Prüfung!', exampleEnglish: 'Good luck with the exam!', category: 'Abstract', difficulty: 1 },
  { german: 'Möglichkeit', article: 'die', plural: '-en', english: 'possibility', example: 'Es gibt viele Möglichkeiten in Deutschland.', exampleEnglish: 'There are many possibilities in Germany.', category: 'Abstract', difficulty: 2 },
  { german: 'Vorteil', article: 'der', plural: '-e', english: 'advantage', example: 'Ein Vorteil von IT ist das hohe Gehalt.', exampleEnglish: 'An advantage of IT is the high salary.', category: 'Abstract', difficulty: 2 },
  { german: 'Nachteil', article: 'der', plural: '-e', english: 'disadvantage', example: 'Ein Nachteil ist die lange Anfahrt.', exampleEnglish: 'A disadvantage is the long commute.', category: 'Abstract', difficulty: 2 },
  { german: 'Verantwortung', article: 'die', plural: '-en', english: 'responsibility', example: 'Ich übernehme Verantwortung für mein Lernen.', exampleEnglish: 'I take responsibility for my learning.', category: 'Abstract', difficulty: 3 },
  { german: 'Fähigkeit', article: 'die', plural: '-en', english: 'ability / skill', example: 'Meine Fähigkeiten im Programmieren wachsen.', exampleEnglish: 'My programming skills are growing.', category: 'Abstract', difficulty: 2 },
  { german: 'Zukunft', article: 'die', plural: '-', english: 'future', example: 'Meine Zukunft in Deutschland beginnt hier.', exampleEnglish: 'My future in Germany starts here.', category: 'Abstract', difficulty: 1 },
];

/** Deterministic id per word so SRS progress is stable across devices. */
function wordId(german: string): string {
  const slug = german
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `voc-${slug || 'word'}`;
}

export function buildVocabulary(): VocabularyWord[] {
  const now = new Date();
  return words.map((w, i) => {
    const familiarity = Math.min(0.9, 0.2 + (i % 5) * 0.08);
    const mastered = i % 9 === 0;
    return {
      id: wordId(w.german),
      german: w.german,
      article: w.article,
      plural: w.plural,
      english: w.english,
      ipa: w.ipa,
      example: w.example,
      exampleEnglish: w.exampleEnglish,
      category: w.category,
      difficulty: w.difficulty,
      familiarity: mastered ? 0.9 : familiarity,
      ease: 2.5,
      interval: mastered ? 4 : 0,
      reviews: mastered ? 3 : 0,
      dueAt: addDays(now, mastered ? 3 : Math.max(0, i % 3)).toISOString(),
      lastReviewedAt: mastered ? addDays(now, -4).toISOString() : undefined,
      createdAt: addDays(now, -12 - (i % 10)).toISOString(),
      mastered,
    };
  });
}

export function vocabularyCategories(): string[] {
  return Array.from(new Set(words.map((w) => w.category)));
}
