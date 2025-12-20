
import { ExpressionItem } from './types';

export const DEFAULT_EXPRESSIONS: ExpressionItem[] = [
  { id: '1', name: '開心', en: 'happy and smiling', checked: true },
  { id: '2', name: '尷尬', en: 'embarrassed and awkward smile', checked: true },
  { id: '3', name: '生氣', en: 'angry and frowning', checked: true },
  { id: '4', name: '驚訝', en: 'surprised with open mouth', checked: false },
  { id: '5', name: '害羞', en: 'shy and blushing', checked: false },
  { id: '6', name: '大笑', en: 'laughing loudly', checked: false },
  { id: '7', name: '害怕', en: 'scared and trembling', checked: false },
  { id: '8', name: '哭泣', en: 'crying with tears', checked: false },
];

export const SYSTEM_INSTRUCTION = `
You are an image variation model that only modifies facial expression and posture.
Do not change character identity, hairstyle, outfit, accessories, or art style.
Preserve line quality and rendering style perfectly.
CRITICAL: Use a solid bright green background (#00FF00 / RGB 0, 255, 0) for the entire background area. No gradients, noise, or shadows in the background.
`;

export const USER_PROMPT_TEMPLATE = (expression_en: string, isCuteAnime: boolean, isSituational: boolean, stickerText?: string, autoText: boolean = false) => {
  let textInstruction = '';
  // 要求深色系文字：深藍、深灰、黑色，根據模型判斷專業、輕鬆或可愛風格
  const colorStyle = "Use a DARK color palette for the text (e.g., deep charcoal, navy blue, or dark chocolate) to ensure visibility. The font style should match the tone (Professional, Relaxed, or Playful) of the expression.";
  
  if (stickerText) {
    textInstruction = `- Interaction Text: Add the exact text "${stickerText}" as a stylized graphic overlay. ${colorStyle}`;
  } else if (autoText) {
    textInstruction = `- Interaction Text: Automatically add a short, appropriate English onomatopoeia or emotional word (e.g., "Yay!", "Zzz", "Ops!", "No!") that fits "${expression_en}". ${colorStyle}`;
  } else {
    textInstruction = '- Requirement: NO text overlays.';
  }

  const situationalPrompt = isSituational 
    ? `- Situational Scene: Generate a rich mini-scene or context around the character. Add relevant props, dynamic postures, and symbolic elements that enhance the situation of "${expression_en}". Ensure the scene stays within the 1:1 frame on the solid green background.`
    : '- Focus: Focus mainly on the character portrait and facial expression.';

  return `
- Task: Create a variation of the provided character image changing the facial expression to: ${expression_en}.
${isCuteAnime ? '- Style Adjustment: Apply a "Cute Anime" aesthetic. Enhance eyes, make lines softer and expressions more vivid.' : ''}
${situationalPrompt}
${textInstruction}
- Background: MUST be solid bright green (#00FF00).
- Keep identity, face proportions, hair, and clothing consistent.
- Output: clean 320x320 PNG style image.
`;
};
