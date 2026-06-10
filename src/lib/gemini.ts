import { GoogleGenAI } from '@google/genai';

export function createGeminiModelsClient(apiKey: string): GoogleGenAI['models'] {
  return new GoogleGenAI({ apiKey }).models;
}
