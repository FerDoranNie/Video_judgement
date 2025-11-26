import { GoogleGenAI } from "@google/genai";
import { VideoItem } from "../types";

const apiKey = process.env.API_KEY || '';

// Safely initialize GenAI only if key exists, otherwise we'll handle gracefully in UI
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateJudgeCommentary = async (
  winner: VideoItem,
  loser: VideoItem,
  round: number
): Promise<string> => {
  if (!ai) return "Clave de API de Gemini no configurada. No se pueden generar comentarios.";

  try {
    const prompt = `
      Eres un juez de concurso de videos ingenioso y crítico (como una mezcla de Simon Cowell con un crítico de cine moderno).
      
      Acabamos de terminar la Ronda ${round} de un torneo de videos.
      
      El Ganador: "${winner.title}"
      El Perdedor: "${loser.title}"
      
      Escribe un comentario corto y ágil de 1 o 2 frases explicando por qué el ganador triunfó o haciendo una broma suave sobre el perdedor.
      Responde únicamente en Español. Manténlo divertido.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No hay comentarios disponibles.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "El juez de IA está tomando un café.";
  }
};

export const generateTop10Summary = async (
  winners: VideoItem[],
  totalVotes: number
): Promise<string> => {
  if (!ai) return "Resumen de IA no disponible.";

  try {
    const titles = winners.map((w, i) => `${i + 1}. ${w.title}`).join('\n');
    const prompt = `
      Analiza estos videos mejor clasificados de nuestro torneo:
      ${titles}
      
      Total de votos emitidos: ${totalVotes}
      
      Proporciona un resumen sofisticado de la "vibra" o esencia de esta colección. ¿Qué dice esta lista sobre el gusto de los votantes?
      Responde únicamente en Español. Manténlo en menos de 100 palabras.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Resumen no disponible.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "No se pueden analizar los resultados en este momento.";
  }
};