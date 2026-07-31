import { dayKey } from './garden';

/**
 * Curated fallback questions for the "pergunta do dia" — used when the couple
 * is offline or unpaired (paired + online, the day's question comes from the
 * AI and is shared via the server so both sides see the same one).
 */
const QUESTIONS = [
  'Qual foi o momento exato em que você percebeu que era amor?',
  'O que você mais admira em mim que eu nem percebo que faço?',
  'Se a gente pudesse repetir um dia inteiro nosso, qual seria?',
  'Qual cheiro te lembra a gente?',
  'O que você sonha pra nós daqui a cinco anos?',
  'Qual mania minha você acha secretamente fofa?',
  'Que música te faz pensar em mim quando toca?',
  'Qual foi a última vez que eu te fiz rir de verdade?',
  'Se pudéssemos viajar amanhã pra qualquer lugar, pra onde iríamos?',
  'O que você sentiu no nosso primeiro beijo?',
  'Qual pequeno gesto meu te faz sentir mais amada(o)?',
  'O que você gostaria que a gente fizesse mais vezes?',
  'Qual segredo bobo você nunca me contou?',
  'Como você me descreveria pra alguém que nunca me viu?',
  'Qual foi o presente mais especial que já recebeu de mim — mesmo sem ser coisa?',
  'Em que momento da semana você mais sentiu minha falta?',
  'Qual comida tem gosto de nós dois?',
  'O que te dá paz quando estamos juntos?',
  'Que medo você perdeu depois que a gente se encontrou?',
  'Qual é o seu lugar favorito no meu corpo pra descansar?',
  'Se nosso amor fosse uma estação do ano, qual seria e por quê?',
  'Qual conversa nossa você guarda até hoje?',
  'O que você quer que a gente nunca deixe de fazer?',
  'Qual foi a coisa mais corajosa que você fez por nós?',
  'O que te faz escolher a gente de novo, todos os dias?',
  'Qual defeito meu você aprendeu a amar?',
  'Que tradição só nossa você quer inventar?',
  'Qual foi o dia mais bonito que passamos juntos até agora?',
  'O que você pensa quando eu demoro a responder?',
  'Se você pudesse guardar um som meu pra sempre, qual seria?',
  'Qual sonho seu você quer que eu ajude a realizar?',
  'O que a gente tem que ninguém mais entende?',
  'Qual filme parece a nossa história?',
  'Quando foi que você se sentiu mais orgulhosa(o) de mim?',
  'O que você faria num sábado perfeito comigo?',
  'Que promessa você quer me fazer hoje, pequena que seja?',
] as const;

/** The fallback question for a given day (deterministic on both devices). */
export function questionForDay(diaMs: number): string {
  const key = dayKey(diaMs);
  return QUESTIONS[key % QUESTIONS.length];
}
