import type { MockExamTemplate } from '@/types';
import { slugify, uid } from '../storage';

export function buildMockExams(): MockExamTemplate[] {
  const items: MockExamTemplate[] = [
    {
      id: uid('me'),
      name: 'B1 TELC — General Deutsch',
      examType: 'telc Deutsch',
      level: 'B1',
      durationMinutes: 90,
      description: 'Kombinierte Prüfung mit den Teilen Hören, Lesen, Schreiben und Sprechen. Basiert auf typischen telc B1 Aufgaben.',
      sections: [
        {
          id: uid('sec'),
          name: 'Hören',
          skill: 'listening',
          durationMinutes: 20,
          items: [
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'durchsage', prompt: 'Sie hören eine Durchsage im Zug: "Meine Damen und Herren, der Zug nach Berlin hat 15 Minuten Verspätung und fährt heute von Gleis 7 ab." Wohin fährt der Zug?', options: ['Nach Hamburg', 'Nach Berlin', 'Nach München'], answer: 'Nach Berlin' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'gespraech', prompt: 'Sie hören ein Gespräch: "Hast du schon die Bewerbung geschickt?" – "Ja, gestern Abend per E-Mail." Was hat die Person gestern gemacht?', options: ['Eine Bewerbung geschrieben', 'Eine Bewerbung geschickt', 'Ein E-Mail gelesen'], answer: 'Eine Bewerbung geschickt' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'nachricht', prompt: 'Sie hören eine Ansage: "Die Prüfung beginnt um neun Uhr. Bitte kommen Sie 30 Minuten vorher an." Wann soll man kommen?', options: ['Um 9:00 Uhr', 'Um 8:30 Uhr', 'Um 9:30 Uhr'], answer: 'Um 8:30 Uhr' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'tipp', prompt: 'Sie hören einen Tipp: "Um eine Sprache zu lernen, ist es wichtig, jeden Tag ein bisschen zu üben." Was ist wichtig?', options: ['Viel an einem Tag', 'Jeden Tag ein bisschen', 'Nur am Wochenende'], answer: 'Jeden Tag ein bisschen' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'frage', prompt: 'Sie hören: "Könnten Sie mir bitte sagen, wo die nächste U-Bahn-Station ist?" Was will die Person?', options: ['Den Weg wissen', 'Eine Fahrkarte kaufen', 'Essen bestellen'], answer: 'Den Weg wissen' },
          ],
        },
        {
          id: uid('sec'),
          name: 'Lesen',
          skill: 'reading',
          durationMinutes: 25,
          items: [
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Aushang: "Der Sprachkurs findet am Dienstag nicht statt. Er wird auf Donnerstag verschoben." Wann findet der Kurs statt?', prompt: 'Wann findet der Kurs jetzt statt?', options: ['Am Dienstag', 'Am Donnerstag', 'Am Freitag'], answer: 'Am Donnerstag' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Anzeige: "Junges IT-Unternehmen sucht einen Praktikanten (m/w/d) für 3 Monate. Kenntnisse in JavaScript von Vorteil. Bewerbung per E-Mail." Was wird gesucht?', prompt: 'Was wird gesucht?', options: ['Einen neuen Chef', 'Einen Praktikanten', 'Einen Kunden'], answer: 'Einen Praktikanten' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Email: "Liebe Anna, ich kann leider nicht kommen. Ich muss Überstunden machen. Können wir uns am Samstag treffen? Liebe Grüße, Tom" Warum kommt Tom nicht?', prompt: 'Warum kann Tom nicht kommen?', options: ['Er ist krank', 'Er muss Überstunden machen', 'Er hat keine Zeit am Samstag'], answer: 'Er muss Überstunden machen' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Wetterbericht: "Morgen wird es wärmer. Am Nachmittag gibt es viel Sonne, am Abend kann es regnen." Wie wird das Wetter am Nachmittag?', prompt: 'Wie wird das Wetter am Nachmittag?', options: ['Es regnet', 'Es ist sonnig', 'Es schneit'], answer: 'Es ist sonnig' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Info: "Azubis haben in der Berufsschule zwei Tage pro Woche Unterricht. Die anderen Tage arbeiten sie im Betrieb." Wo sind die Azubis an den anderen Tagen?', prompt: 'Wo sind die Azubis an den anderen Tagen?', options: ['In der Schule', 'Im Betrieb', 'Zu Hause'], answer: 'Im Betrieb' },
          ],
        },
        {
          id: uid('sec'),
          name: 'Schreiben',
          skill: 'writing',
          durationMinutes: 25,
          items: [
            { id: uid('it'), kind: 'writing', maxPoints: 10, text: 'Schreiben Sie eine E-Mail an Ihre Kollegin Frau Bauer. Sie müssen morgen zum Arzt. Entschuldigen Sie sich und schlagen Sie einen neuen Termin vor (mindestens 40 Wörter).', prompt: 'E-Mail an Frau Bauer schreiben' },
            { id: uid('it'), kind: 'writing', maxPoints: 10, text: 'Sie haben eine Zusage für ein Vorstellungsgespräch bekommen. Schreiben Sie eine kurze Antwort: Bestätigen Sie den Termin und bedanken Sie sich (mindestens 40 Wörter).', prompt: 'Antwort auf die Einladung schreiben' },
          ],
        },
        {
          id: uid('sec'),
          name: 'Sprechen',
          skill: 'speaking',
          durationMinutes: 15,
          items: [
            { id: uid('it'), kind: 'speaking', maxPoints: 5, text: 'Stellen Sie sich vor: Name, Herkunft, Beruf, Hobbys.', prompt: 'Sich vorstellen' },
            { id: uid('it'), kind: 'speaking', maxPoints: 5, text: 'Erzählen Sie über Ihre Pläne für die nächsten 2 Jahre.', prompt: 'Über Pläne sprechen' },
          ],
        },
      ],
    },
    {
      id: uid('me'),
      name: 'Goethe B1 — Exam Simulation',
      examType: 'Goethe-Zertifikat',
      level: 'B1',
      durationMinutes: 65,
      description: 'Simuliert den Goethe-Zertifikat B1 Test mit Hören, Lesen, Schreiben und Sprechen.',
      sections: [
        {
          id: uid('sec'),
          name: 'Hören',
          skill: 'listening',
          durationMinutes: 20,
          items: [
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'nachricht', prompt: 'Sie hören: "Herr Schmidt kommt heute später. Bitte sagen Sie es dem Team." Was sollen Sie tun?', options: ['Herr Schmidt anrufen', 'Das Team informieren', 'Ein Dokument schicken'], answer: 'Das Team informieren' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'radio', prompt: 'Sie hören im Radio: "Der neue Sprachkurs beginnt nächste Woche. Anmeldung im Bürgerbüro." Wo meldet man sich an?', options: ['Im Bürgerbüro', 'In der Schule', 'Online nur'], answer: 'Im Bürgerbüro' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'rezeption', prompt: 'An der Rezeption: "Ihr Zimmer ist Nummer 12, im dritten Stock. Der Aufzug ist links." Wo ist der Aufzug?', options: ['Rechts', 'Links', 'Im Zimmer'], answer: 'Links' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'ansage', prompt: 'Ansage: "Der Deutschkurs für Fortgeschrittene ist leider ausgebucht." Was bedeutet das?', options: ['Es gibt freie Plätze', 'Es gibt keine Plätze mehr', 'Der Kurs ist kostenlos'], answer: 'Es gibt keine Plätze mehr' },
          ],
        },
        {
          id: uid('sec'),
          name: 'Lesen',
          skill: 'reading',
          durationMinutes: 25,
          items: [
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'E-Mail: "Lieber Herr Osei, vielen Dank für Ihre Bewerbung. Wir möchten Sie gern zu einem Gespräch am 12. August um 10 Uhr einladen. Mit freundlichen Grüßen, S. Krüger" Was bekommt Herr Osei?', prompt: 'Was bekommt Herr Osei?', options: ['Eine Absage', 'Eine Einladung zum Gespräch', 'Einen Vertrag'], answer: 'Eine Einladung zum Gespräch' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Produktinfo: "Diese Tastatur ist kabellos und sehr leicht. Sie funktioniert mit allen Betriebssystemen." Was stimmt?', prompt: 'Was stimmt über die Tastatur?', options: ['Sie ist schwer', 'Sie ist kabellos', 'Sie funktioniert nur mit Windows'], answer: 'Sie ist kabellos' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Hinweis im Büro: "Bitte verlassen Sie den Raum, wenn das Alarmsignal ertönt. Versammlungspunkt ist der Parkplatz." Was sollen Mitarbeiter bei Alarm tun?', prompt: 'Was soll man bei Alarm tun?', options: ['Im Raum bleiben', 'Zum Parkplatz gehen', 'Das Licht ausschalten'], answer: 'Zum Parkplatz gehen' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Kursbeschreibung: "In diesem Kurs verbessern Sie Ihr mündliches Deutsch. Sie üben Gespräche, Präsentationen und Diskussionen." Worum geht es im Kurs?', prompt: 'Worum geht es im Kurs?', options: ['Um Grammatik', 'Um mündliches Deutsch', 'Um Lesen'], answer: 'Um mündliches Deutsch' },
          ],
        },
        {
          id: uid('sec'),
          name: 'Schreiben',
          skill: 'writing',
          durationMinutes: 20,
          items: [
            { id: uid('it'), kind: 'writing', maxPoints: 10, text: 'Sie möchten einen Deutschkurs in Ihrer Stadt buchen. Schreiben Sie eine formelle E-Mail an die Sprachschule: Fragen Sie nach Termin, Preis und Niveau (mindestens 50 Wörter).', prompt: 'E-Mail an die Sprachschule' },
          ],
        },
      ],
    },
    {
      id: uid('me'),
      name: 'Schnelltest A2 — Basis',
      examType: 'telc Deutsch',
      level: 'A2',
      durationMinutes: 30,
      description: 'Kurzer Einstiegstest für das Niveau A2: Hören, Lesen und ein kleiner Schreibtel.',
      sections: [
        {
          id: uid('sec'),
          name: 'Hören',
          skill: 'listening',
          durationMinutes: 10,
          items: [
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'treffen', prompt: 'Sie hören: "Treffen wir uns um drei am Bahnhof?" – "Gut, aber ich komme zehn Minuten später." Wann kommt die Person?', options: ['Um 3:00', 'Um 3:10', 'Um 2:50'], answer: 'Um 3:10' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, audio: 'essen', prompt: 'Sie hören: "Ich möchte bitte einen Apfelsaft und ein Brötchen." Was bestellt die Person?', options: ['Kaffee und Kuchen', 'Apfelsaft und ein Brötchen', 'Bier und Pizza'], answer: 'Apfelsaft und ein Brötchen' },
          ],
        },
        {
          id: uid('sec'),
          name: 'Lesen',
          skill: 'reading',
          durationMinutes: 10,
          items: [
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Schild: "Öffnungszeiten: Montag bis Freitag 9–18 Uhr, Samstag 9–14 Uhr." Wann ist der Laden am Samstag offen?', prompt: 'Wann ist der Laden am Samstag offen?', options: ['9–18 Uhr', '9–14 Uhr', 'Geschlossen'], answer: '9–14 Uhr' },
            { id: uid('it'), kind: 'mcq', maxPoints: 2, text: 'Notiz: "Anna, das Essen ist im Kühlschrank. Sei um 8 zurück. – Mama" Was soll Anna tun?', prompt: 'Was soll Anna tun?', options: ['Essen kaufen', 'Um 8 zurück sein', 'Den Kühlschrank putzen'], answer: 'Um 8 zurück sein' },
          ],
        },
        {
          id: uid('sec'),
          name: 'Schreiben',
          skill: 'writing',
          durationMinutes: 10,
          items: [
            { id: uid('it'), kind: 'writing', maxPoints: 5, text: 'Schreiben Sie eine kurze Nachricht an Ihre Freundin: Sagen Sie, was Sie am Wochenende gemacht haben (mindestens 3 Sätze).', prompt: 'Kurze Nachricht schreiben' },
          ],
        },
      ],
    },
  ];
  return items.map((template) => ({ ...template, id: `mock-${slugify(template.name)}` }));
}
