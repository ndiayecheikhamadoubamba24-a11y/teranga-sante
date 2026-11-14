import { QUIZ, type QuizQuestion } from '../data/content';
import type { Lang } from './i18n';
import { supabase, withTimeout } from './supabase';

type Row = { id: string; statement: Record<string, string>; answer: boolean; explanation: Record<string, string> };

// Questions publiées dans Supabase (éditables par les infirmières, A6), sinon contenus hors ligne.
export async function loadQuiz(lang: Lang, count = 5): Promise<QuizQuestion[]> {
  let pool: QuizQuestion[] = QUIZ;
  try {
    const { data, error } = await withTimeout(supabase.from('quiz_questions').select('id, statement, answer, explanation').eq('published', true));
    if (!error && data && data.length >= count) {
      pool = (data as Row[]).map((r) => ({
        id: r.id,
        statement: r.statement[lang] ?? r.statement.fr,
        answer: r.answer,
        explanation: r.explanation[lang] ?? r.explanation.fr,
      }));
    }
  } catch {
    // hors ligne
  }
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
