import type { GrammarTopic } from '@/types';
import { slugify } from '../storage';

interface GrammarSeed {
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: string;
  explanation: string;
  examples: { de: string; en: string }[];
  exercises: { prompt: string; options: string[]; answer: string; hint?: string; explanation: string; type: 'mcq' | 'fill' | 'order' }[];
  order: number;
}

const topics: GrammarSeed[] = [
  {
    title: 'Personal Pronouns',
    level: 'A1',
    category: 'Basics',
    explanation: 'Personal pronouns replace nouns. ich (I), du (you, informal), er/sie/es (he/she/it), wir (we), ihr (you plural), sie/Sie (they/you formal). They change by case: mich/dich/ihn (accusative), mir/dir/ihm (dative).',
    examples: [
      { de: 'Ich bin Azubi bei einer IT-Firma.', en: 'I am a trainee at an IT company.' },
      { de: 'Kannst du mir helfen?', en: 'Can you help me?' },
      { de: 'Wir lernen jeden Tag Deutsch.', en: 'We learn German every day.' },
    ],
    exercises: [
      { prompt: '____ bin neu hier. (I am new here)', options: ['Ich', 'Du', 'Er', 'Wir'], answer: 'Ich', explanation: 'The subject "I" is "ich".', type: 'mcq' },
      { prompt: 'Kannst du ____ helfen? (Can you help me?)', options: ['ich', 'mich', 'mir', 'mein'], answer: 'mir', explanation: 'After "helfen" we use the dative: "mir".', type: 'mcq' },
      { prompt: 'Woher kommst ____? (Where are you from?)', options: ['ich', 'er', 'du', 'wir'], answer: 'du', explanation: 'Informal "you" is "du".', type: 'mcq' },
      { prompt: '____ heißt Anna.', options: ['Ich', 'Sie', 'Du', 'Wir'], answer: 'Sie', explanation: 'Formal address uses capitalised "Sie".', type: 'mcq' },
    ],
    order: 1,
  },
  {
    title: 'Definite Articles & Gender',
    level: 'A1',
    category: 'Basics',
    explanation: 'Every German noun has a gender: der (masculine), die (feminine), das (neuter). Learn the article together with the noun — it is part of the word. Plural is always "die".',
    examples: [
      { de: 'der Computer, die Maus, das Programm', en: 'the computer, the mouse, the program' },
      { de: 'Die Datenbank ist schnell.', en: 'The database is fast.' },
      { de: 'Das Netzwerk ist stabil.', en: 'The network is stable.' },
    ],
    exercises: [
      { prompt: '… Bewerbung (application)', options: ['der', 'die', 'das'], answer: 'die', explanation: 'Bewerbung is feminine: die Bewerbung.', type: 'mcq' },
      { prompt: '… Beruf (profession)', options: ['der', 'die', 'das'], answer: 'der', explanation: 'Beruf is masculine: der Beruf.', type: 'mcq' },
      { prompt: '… Unternehmen (company)', options: ['der', 'die', 'das'], answer: 'das', explanation: 'Unternehmen is neuter: das Unternehmen.', type: 'mcq' },
      { prompt: '… Gehalt (salary)', options: ['der', 'die', 'das'], answer: 'das', explanation: 'Gehalt is neuter: das Gehalt.', type: 'mcq' },
    ],
    order: 2,
  },
  {
    title: 'Nominative & Accusative',
    level: 'A1',
    category: 'Cases',
    explanation: 'The nominative is the subject (who does the action). The accusative is the direct object (what/who is affected). Articles change: der → den (masculine), die → die, das → das.',
    examples: [
      { de: 'Der Entwickler schreibt den Code.', en: 'The developer writes the code.' },
      { de: 'Ich sehe den Server.', en: 'I see the server.' },
      { de: 'Die Software hat einen Fehler.', en: 'The software has a bug.' },
    ],
    exercises: [
      { prompt: 'Ich sehe ____ Computer. (I see the computer.)', options: ['der', 'den', 'das', 'dem'], answer: 'den', explanation: 'Computer is masculine; after "sehen" it is accusative: den.', type: 'mcq' },
      { prompt: '____ Kaffee ist kalt. (The coffee is cold.)', options: ['Der', 'Den', 'Dem', 'Die'], answer: 'Der', explanation: 'Subject is nominative: der.', type: 'mcq' },
      { prompt: 'Er kauft ____ Laptop. (He buys the laptop.)', options: ['das', 'der', 'den', 'die'], answer: 'den', explanation: 'Laptop is masculine; direct object → accusative "den".', type: 'mcq' },
      { prompt: 'Ich lese ____ Buch.', options: ['das', 'der', 'den', 'dem'], answer: 'das', explanation: 'Buch is neuter; accusative stays "das".', type: 'mcq' },
    ],
    order: 3,
  },
  {
    title: 'Dative & Genitive',
    level: 'A2',
    category: 'Cases',
    explanation: 'The dative marks the indirect object (to/for whom): dem, der, dem. The genitive shows possession (whose): des, der, des. Prepositions like "mit" (with), "nach" (to), "bei" (at) take the dative.',
    examples: [
      { de: 'Ich gebe dem Chef den Bericht.', en: 'I give the boss the report.' },
      { de: 'Er arbeitet bei einer großen Firma.', en: 'He works at a big company.' },
      { de: 'Das ist das Büro des Azubis.', en: 'That is the trainee\'s office.' },
    ],
    exercises: [
      { prompt: 'Ich helfe ____ Kollegen. (I help the colleague.)', options: ['der', 'den', 'dem', 'das'], answer: 'dem', explanation: 'helfen takes the dative: dem Kollegen.', type: 'mcq' },
      { prompt: 'Wir fahren mit ____ Auto. (We drive with the car.)', options: ['das', 'den', 'der', 'dem'], answer: 'dem', explanation: '"mit" takes the dative: dem Auto.', type: 'mcq' },
      { prompt: 'Das ist das Buch ____ Lehrers. (the teacher\'s book)', options: ['dem', 'den', 'des', 'der'], answer: 'des', explanation: 'Genitive masculine: des Lehrers.', type: 'mcq' },
      { prompt: 'Sie spricht mit ____ Freundin. (with the girlfriend)', options: ['der', 'die', 'dem', 'den'], answer: 'der', explanation: '"mit" + feminine dative = der.', type: 'mcq' },
    ],
    order: 4,
  },
  {
    title: 'Verb Conjugation — Present',
    level: 'A1',
    category: 'Verbs',
    explanation: 'German verbs change by person: ich lerne, du lernst, er/sie/es lernt, wir lernen, ihr lernt, sie/Sie lernen. Irregular verbs change the stem: du fährst, er fährt (fahren).',
    examples: [
      { de: 'Ich lerne Deutsch.', en: 'I learn German.' },
      { de: 'Er arbeitet in Berlin.', en: 'He works in Berlin.' },
      { de: 'Wir studieren Informatik.', en: 'We study computer science.' },
    ],
    exercises: [
      { prompt: 'Ich ____ Deutsch. (learn)', options: ['lernst', 'lerne', 'lernt', 'lernen'], answer: 'lerne', explanation: 'ich → lerne.', type: 'mcq' },
      { prompt: 'Er ____ bei Siemens. (works)', options: ['arbeite', 'arbeitest', 'arbeitet', 'arbeiten'], answer: 'arbeitet', explanation: 'er → arbeitet.', type: 'mcq' },
      { prompt: 'Du ____ gut. (speak)', options: ['sprechst', 'sprichst', 'sprecht', 'spricht'], answer: 'sprichst', explanation: 'du → sprichst (stem change e→i).', type: 'mcq' },
      { prompt: 'Wir ____ viel. (learn)', options: ['lernt', 'lerne', 'lernen', 'lernst'], answer: 'lernen', explanation: 'wir → lernen.', type: 'mcq' },
    ],
    order: 5,
  },
  {
    title: 'Modal Verbs',
    level: 'A2',
    category: 'Verbs',
    explanation: 'Modal verbs change the meaning of the main verb: können (can), müssen (must), wollen (want), sollen (should), dürfen (may), mögen (like). They are conjugated and the main verb goes to the end in the infinitive.',
    examples: [
      { de: 'Ich kann gut programmieren.', en: 'I can program well.' },
      { de: 'Du musst die Prüfung machen.', en: 'You have to take the exam.' },
      { de: 'Wir wollen eine Firma gründen.', en: 'We want to found a company.' },
    ],
    exercises: [
      { prompt: 'Ich ____ Deutsch sprechen. (can)', options: ['muss', 'kann', 'will', 'soll'], answer: 'kann', explanation: 'können expresses ability: kann.', type: 'mcq' },
      { prompt: 'Du ____ mehr üben. (should)', options: ['sollst', 'willst', 'kannst', 'musst'], answer: 'sollst', explanation: 'sollen = should: du sollst.', type: 'mcq' },
      { prompt: 'Wir ____ morgen die Prüfung schreiben. (must)', options: ['können', 'müssen', 'wollen', 'dürfen'], answer: 'müssen', explanation: 'müssen = have to: wir müssen.', type: 'mcq' },
      { prompt: 'Er ____ Programmierer werden. (wants to)', options: ['kann', 'soll', 'will', 'darf'], answer: 'will', explanation: 'wollen = want to: er will.', type: 'mcq' },
    ],
    order: 6,
  },
  {
    title: 'Separable Verbs',
    level: 'A2',
    category: 'Verbs',
    explanation: 'Separable verbs have a prefix that moves to the end of the sentence in the present tense: ankommen (to arrive) → Ich komme morgen an. In subordinate clauses and with modal verbs the whole verb stays together.',
    examples: [
      { de: 'Ich stehe um 6 Uhr auf.', en: 'I get up at 6 o\'clock.' },
      { de: 'Der Zug kommt um 9 Uhr an.', en: 'The train arrives at 9.' },
      { de: 'Ich rufe dich nachher an.', en: 'I will call you later.' },
    ],
    exercises: [
      { prompt: 'Ich rufe dich morgen ____. (call up)', options: ['an', 'auf', 'aus', 'ab'], answer: 'an', explanation: 'anrufen: prefix "an" goes to the end.', type: 'mcq' },
      { prompt: 'Sie steht früh ____. (gets up)', options: ['an', 'auf', 'ab', 'ein'], answer: 'auf', explanation: 'aufstehen → "auf" goes to the end.', type: 'mcq' },
      { prompt: 'Der Kurs fängt im September ____. (starts)', options: ['an', 'auf', 'ein', 'aus'], answer: 'an', explanation: 'anfangen → prefix "an".', type: 'mcq' },
    ],
    order: 7,
  },
  {
    title: 'Word Order — Main Clauses',
    level: 'A2',
    category: 'Syntax',
    explanation: 'In main clauses the conjugated verb is always the second idea (V2). The subject can be first, but if something else comes first, the subject moves behind the verb: Heute lerne ich Deutsch.',
    examples: [
      { de: 'Ich lerne heute Deutsch.', en: 'I learn German today.' },
      { de: 'Heute lerne ich Deutsch.', en: 'Today I learn German.' },
      { de: 'Am Wochenende gehe ich ins Kino.', en: 'At the weekend I go to the cinema.' },
    ],
    exercises: [
      { prompt: 'Heute ____ ich Deutsch. (learn)', options: ['lerne', 'lernen', 'lernt', 'lernst'], answer: 'lerne', explanation: 'V2 rule: after "Heute" the verb comes, then the subject.', type: 'mcq' },
      { prompt: 'Morgen ____ wir einen Termin. (have)', options: ['haben', 'habe', 'habt', 'hat'], answer: 'haben', explanation: 'Verb second: "Morgen haben wir…".', type: 'mcq' },
      { prompt: '____ du morgen Zeit?', options: ['Hast', 'Habt', 'Habe', 'Haben'], answer: 'Hast', explanation: 'Question: verb first, "du" → hast.', type: 'mcq' },
    ],
    order: 8,
  },
  {
    title: 'Subordinate Clauses',
    level: 'B1',
    category: 'Syntax',
    explanation: 'Subordinate clauses are introduced by conjunctions like weil (because), dass (that), wenn (when/if), obwohl (although). The conjugated verb goes to the very end: Ich lerne, weil ich die Prüfung bestehen will.',
    examples: [
      { de: 'Ich lerne, weil ich die Prüfung bestehen will.', en: 'I learn because I want to pass the exam.' },
      { de: 'Ich weiß, dass du fleißig bist.', en: 'I know that you are diligent.' },
      { de: 'Wenn ich Zeit habe, übe ich.', en: 'When I have time, I practise.' },
    ],
    exercises: [
      { prompt: 'Ich lerne, weil ich die Prüfung bestehen ____. (want to)', options: ['will', 'wollen', 'wollt', 'wolle'], answer: 'will', explanation: 'Verb goes to the end; ich → will.', type: 'mcq' },
      { prompt: 'Er sagt, dass er morgen ____. (comes)', options: ['kommt', 'kommen', 'kommst', 'komme'], answer: 'kommt', explanation: 'Verb at the end: er kommt.', type: 'mcq' },
      { prompt: '____ du Zeit hast, ruf mich an.', options: ['Weil', 'Wenn', 'Dass', 'Obwohl'], answer: 'Wenn', explanation: 'Conditional "when" → wenn.', type: 'mcq' },
      { prompt: 'Ich bleibe zu Hause, ____ es regnet.', options: ['dass', 'wenn', 'weil', 'ob'], answer: 'weil', explanation: 'Reason → weil.', type: 'mcq' },
    ],
    order: 9,
  },
  {
    title: 'Perfekt (Past Tense)',
    level: 'A2',
    category: 'Verbs',
    explanation: 'The Perfekt is the spoken past tense: haben/sein + Partizip II at the end. Ich habe gelernt. Ich bin gegangen. Common irregular participles: gegangen (gehen), gesehen (sehen), geschrieben (schreiben).',
    examples: [
      { de: 'Ich habe gestern Deutsch gelernt.', en: 'I learnt German yesterday.' },
      { de: 'Er ist nach Berlin gefahren.', en: 'He drove to Berlin.' },
      { de: 'Wir haben den Test geschrieben.', en: 'We wrote the test.' },
    ],
    exercises: [
      { prompt: 'Ich ____ gestern lange gearbeitet.', options: ['bin', 'habe', 'hat', 'haben'], answer: 'habe', explanation: 'arbeiten uses "haben".', type: 'mcq' },
      { prompt: 'Er ____ nach Hause gegangen.', options: ['hat', 'haben', 'ist', 'sein'], answer: 'ist', explanation: 'gehen (movement) uses "sein".', type: 'mcq' },
      { prompt: 'Wir haben den Test ____. (written)', options: ['geschrieben', 'schreiben', 'geschriebt', 'schreibt'], answer: 'geschrieben', explanation: 'schreiben → geschrieben.', type: 'mcq' },
      { prompt: 'Sie ist spät ____. (arrived)', options: ['gekommen', 'kommt', 'gekommt', 'gekomen'], answer: 'gekommen', explanation: 'kommen → gekommen.', type: 'mcq' },
    ],
    order: 10,
  },
  {
    title: 'Präteritum (Narrative Past)',
    level: 'B1',
    category: 'Verbs',
    explanation: 'The Präteritum is used in writing and for modal verbs in speech. Key irregulars: war (sein), hatte (haben), ging, kam, machte, lernte. Er lernte Deutsch in der Schule. Ich hatte einen Termin.',
    examples: [
      { de: 'Er war gestern nicht im Büro.', en: 'He was not in the office yesterday.' },
      { de: 'Ich hatte viele Fragen.', en: 'I had many questions.' },
      { de: 'Sie lernte drei Jahre Deutsch.', en: 'She learnt German for three years.' },
    ],
    exercises: [
      { prompt: 'Ich ____ gestern krank. (was)', options: ['war', 'hatte', 'wurde', 'bin'], answer: 'war', explanation: 'sein in Präteritum: ich war.', type: 'mcq' },
      { prompt: 'Er ____ ein neues Handy. (had)', options: ['hat', 'hatte', 'hätte', 'habte'], answer: 'hatte', explanation: 'haben in Präteritum: hatte.', type: 'mcq' },
      { prompt: 'Wir ____ zusammen gegessen. (ate)', options: ['aßen', 'essen', 'essen', 'gegessen'], answer: 'aßen', explanation: 'essen → aßen.', type: 'mcq' },
    ],
    order: 11,
  },
  {
    title: 'Future & Plans (werden)',
    level: 'B1',
    category: 'Verbs',
    explanation: 'Futur I = werden + infinitive at the end: Ich werde morgen lernen. Germans often use the present + time word instead: Ich lerne morgen. The future expresses intention or prediction.',
    examples: [
      { de: 'Ich werde im September die Prüfung machen.', en: 'I will take the exam in September.' },
      { de: 'Es wird morgen regnen.', en: 'It will rain tomorrow.' },
      { de: 'Nächstes Jahr werde ich anfangen.', en: 'Next year I will start.' },
    ],
    exercises: [
      { prompt: 'Ich ____ die Prüfung machen.', options: ['werde', 'wirst', 'wird', 'werden'], answer: 'werde', explanation: 'ich → werde.', type: 'mcq' },
      { prompt: 'Du ____ viel lernen müssen.', options: ['werde', 'wirst', 'wird', 'werden'], answer: 'wirst', explanation: 'du → wirst.', type: 'mcq' },
      { prompt: 'Wir ____ nach Deutschland fliegen.', options: ['werdet', 'wird', 'werden', 'wirst'], answer: 'werden', explanation: 'wir → werden.', type: 'mcq' },
    ],
    order: 12,
  },
  {
    title: 'Adjective Endings',
    level: 'B1',
    category: 'Adjectives',
    explanation: 'Adjectives take endings depending on the article. With the definite article: der gute Mann, die gute Frau, das gute Buch. With "ein": ein guter Mann, eine gute Frau, ein gutes Buch. In the plural after definite articles: die guten Männer.',
    examples: [
      { de: 'Das ist ein interessanter Beruf.', en: 'That is an interesting profession.' },
      { de: 'Die neue Software ist schnell.', en: 'The new software is fast.' },
      { de: 'Ich trinke einen heißen Kaffee.', en: 'I drink a hot coffee.' },
    ],
    exercises: [
      { prompt: 'Das ist ein ____ Beruf. (interesting)', options: ['interessante', 'interessanter', 'interessantes', 'interessanten'], answer: 'interessanter', explanation: 'After "ein" (masculine nominative): -er.', type: 'mcq' },
      { prompt: 'Die ____ Software läuft gut. (new)', options: ['neuer', 'neues', 'neue', 'neuen'], answer: 'neue', explanation: 'With definite article die: -e.', type: 'mcq' },
      { prompt: 'Ich sehe den ____ Server. (big)', options: ['große', 'großen', 'großer', 'großes'], answer: 'großen', explanation: 'den + masculine accusative: -en.', type: 'mcq' },
      { prompt: 'Ein ____ Tag heute! (beautiful)', options: ['schöner', 'schöne', 'schönes', 'schönen'], answer: 'schöner', explanation: 'ein + masculine nominative: -er.', type: 'mcq' },
    ],
    order: 13,
  },
  {
    title: 'Prepositions of Time & Place',
    level: 'A2',
    category: 'Prepositions',
    explanation: 'Time: am Montag, im September, um 9 Uhr, seit einem Jahr. Place: in (in), an (at/on), auf (on), unter (under), neben (next to), zwischen (between). Two-way prepositions take dative (position) or accusative (direction).',
    examples: [
      { de: 'Ich habe am Montag einen Termin.', en: 'I have an appointment on Monday.' },
      { de: 'Das Buch liegt auf dem Tisch.', en: 'The book is lying on the table.' },
      { de: 'Ich lege das Buch auf den Tisch.', en: 'I put the book on the table.' },
    ],
    exercises: [
      { prompt: 'Der Kurs beginnt ____ 9 Uhr.', options: ['am', 'um', 'im', 'an'], answer: 'um', explanation: 'Clock times use "um".', type: 'mcq' },
      { prompt: 'Ich arbeite ____ einer Firma.', options: ['bei', 'auf', 'neben', 'um'], answer: 'bei', explanation: '"bei" = at (a company).', type: 'mcq' },
      { prompt: 'Er sitzt ____ dem Computer. (at/near)', options: ['an', 'in', 'auf', 'über'], answer: 'an', explanation: '"an dem" → position, dative.', type: 'mcq' },
      { prompt: 'Die Prüfung ist ____ September.', options: ['an', 'um', 'im', 'am'], answer: 'im', explanation: 'Months use "im".', type: 'mcq' },
    ],
    order: 14,
  },
  {
    title: 'Relative Clauses',
    level: 'B1',
    category: 'Syntax',
    explanation: 'Relative clauses give extra information: Das ist die Firma, die mich eingeladen hat. The relative pronoun agrees in gender and case: der/die/das, den, dem, deren. The verb goes to the end.',
    examples: [
      { de: 'Das ist der Mann, der mir hilft.', en: 'That is the man who helps me.' },
      { de: 'Die Firma, die mich eingeladen hat, ist groß.', en: 'The company that invited me is big.' },
      { de: 'Das Buch, das ich lese, ist gut.', en: 'The book that I am reading is good.' },
    ],
    exercises: [
      { prompt: 'Das ist der Azubi, ____ fleißig ist.', options: ['das', 'den', 'der', 'dem'], answer: 'der', explanation: 'Masculine subject → der.', type: 'mcq' },
      { prompt: 'Die Frau, ____ du kennst, ist meine Lehrerin.', options: ['die', 'der', 'den', 'das'], answer: 'die', explanation: 'Feminine accusative → die.', type: 'mcq' },
      { prompt: 'Das Projekt, ____ wir arbeiten, ist spannend.', options: ['das', 'dem', 'den', 'der'], answer: 'dem', explanation: 'arbeiten an → dative: dem.', type: 'mcq' },
    ],
    order: 15,
  },
  {
    title: 'Konjunktiv II (Polite & Hypothetical)',
    level: 'B1',
    category: 'Verbs',
    explanation: 'Konjunktiv II is used for polite requests, wishes and hypotheticals: würde + infinitive, or the verb forms: wäre (were), hätte (had), könnte (could). Ich würde gern mehr verdienen.',
    examples: [
      { de: 'Ich würde gern Informatik studieren.', en: 'I would like to study computer science.' },
      { de: 'Wenn ich Zeit hätte, würde ich mehr üben.', en: 'If I had time, I would practise more.' },
      { de: 'Könnten Sie mir helfen?', en: 'Could you help me?' },
    ],
    exercises: [
      { prompt: 'Ich ____ gern nach Deutschland gehen.', options: ['würde', 'will', 'werde', 'wäre'], answer: 'würde', explanation: 'polite wish: würde + infinitive.', type: 'mcq' },
      { prompt: 'Wenn ich mehr Zeit ____, würde ich mehr lernen.', options: ['habe', 'hätte', 'hat', 'habet'], answer: 'hätte', explanation: 'hypothetical: hätte.', type: 'mcq' },
      { prompt: '____ Sie mir bitte helfen?', options: ['Könnten', 'Können', 'Konnten', 'Kannst'], answer: 'Könnten', explanation: 'polite request: Könnten Sie…', type: 'mcq' },
    ],
    order: 16,
  },
];

export function buildGrammar(): GrammarTopic[] {
  return topics.map((t) => ({
    id: `gram-${slugify(t.title)}`,
    title: t.title,
    level: t.level,
    category: t.category,
    explanation: t.explanation,
    examples: t.examples,
    exercises: t.exercises.map((e, i) => ({
      id: `gx-${slugify(t.title)}-${i}`,
      prompt: e.prompt,
      options: e.options,
      answer: e.answer,
      hint: e.hint,
      explanation: e.explanation,
      type: e.type,
    })),
    order: t.order,
  }));
}
