/**
 * Skills Loader — Obsidian-skills pattern for platform prompt knowledge.
 *
 * Features:
 * - Few-shot examples with category tags for smart selection
 * - Negative examples (mistakes) to teach what NOT to do
 * - Platform-specific scoring criteria for quality gates
 * - Smart example selection: picks the 3 most relevant based on user's concept
 */

// Image platform skills
import { skill as midjourney } from './image/midjourney';
import { skill as dalle } from './image/dalle';
import { skill as flux } from './image/flux';
import { skill as stableDiffusion } from './image/stable-diffusion';
import { skill as imagen } from './image/imagen';
import { skill as geminiImage } from './image/gemini-image';
import { skill as imageGeneral } from './image/general';

// Video platform skills
import { skill as runway } from './video/runway';
import { skill as kling } from './video/kling';
import { skill as sora } from './video/sora';
import { skill as veo } from './video/veo';
import { skill as higgsfield } from './video/higgsfield';
import { skill as minimax } from './video/minimax';
import { skill as videoGeneral } from './video/general';

// Text mode skills (standard/research/agent)
import { skill as standardSkill } from './text/standard';
import { skill as researchSkill } from './text/research';
import { skill as agentSkill } from './text/agent';

// ── Types ──

export type ExampleCategory =
  // Visual categories (image/video)
  | 'portrait' | 'landscape' | 'product' | 'food' | 'architecture'
  | 'abstract' | 'action' | 'emotion' | 'nature' | 'sci-fi'
  | 'fantasy' | 'editorial' | 'street' | 'fashion' | 'commercial'
  | 'documentary' | 'narrative' | 'macro' | 'music-video' | 'interior'
  // Text mode categories (standard)
  | 'marketing' | 'email' | 'technical' | 'creative' | 'strategy'
  | 'sales' | 'educational' | 'social-media' | 'business'
  // Research categories
  | 'research-market' | 'research-academic' | 'research-technical'
  | 'research-competitive' | 'research-legal' | 'research-healthcare'
  | 'research-historical' | 'research-financial' | 'research-policy'
  | 'research-trends'
  // Agent categories
  | 'agent-customer-service' | 'agent-tutor' | 'agent-coach'
  | 'agent-writer' | 'agent-analyst' | 'agent-advisor'
  | 'agent-therapist' | 'agent-recruiter' | 'agent-legal' | 'agent-creative';

export interface SkillExample {
  concept: string;
  output: string;
  category?: ExampleCategory;
}

export interface SkillMistake {
  bad: string;
  good: string;
  why: string;
}

export interface ChainOfThoughtExample {
  concept: string;
  reasoning: string;
  output: string;
}

export interface RefinementExample {
  iteration: number;
  beforePrompt: string;
  afterPrompt: string;
  changes: string[];
}

export interface PlatformSkill {
  platform: string;
  name: string;
  examples: SkillExample[];
  mistakes?: SkillMistake[];
  scoringCriteria?: string[];
  chainOfThoughtExamples?: ChainOfThoughtExample[];
  refinementExamples?: RefinementExample[];
}

// ── Skill Registry ──

const IMAGE_SKILLS: Record<string, PlatformSkill> = {
  midjourney,
  dalle,
  flux,
  'stable-diffusion': stableDiffusion,
  imagen,
  nanobanana: geminiImage,
  general: imageGeneral,
};

const VIDEO_SKILLS: Record<string, PlatformSkill> = {
  runway,
  kling,
  sora,
  veo,
  higgsfield,
  minimax,
  general: videoGeneral,
};

const TEXT_SKILLS: Record<string, PlatformSkill> = {
  standard: standardSkill,
  research: researchSkill,
  agent: agentSkill,
};

// ── Category Detection ──

const CATEGORY_KEYWORDS: Record<ExampleCategory, string[]> = {
  // ── Visual: Portrait (30+ synonyms) ──
  portrait: ['פורטרט', 'דיוקן', 'פנים', 'אדם', 'אישה', 'גבר', 'ילד', 'ילדה', 'זקן', 'זקנה', 'תינוק', 'נערה', 'נער', 'צעיר', 'צעירה', 'קשיש', 'גברת', 'אדון', 'ראש', 'חיוך', 'עיניים', 'הבעה', 'דוגמנית', 'אמן', 'סטודנט', 'portrait', 'face', 'headshot', 'person', 'people', 'woman', 'man', 'boy', 'girl', 'child', 'kid', 'elderly', 'old', 'young', 'teenager', 'adult', 'human', 'individual', 'selfie', 'close-up face', 'bust', 'self-portrait'],

  // ── Visual: Landscape (30+ synonyms) ──
  landscape: ['נוף', 'הרים', 'הר', 'ים', 'אוקיינוס', 'שקיעה', 'זריחה', 'שמיים', 'יער', 'מדבר', 'חוף', 'אגם', 'נהר', 'מפל', 'עמק', 'גבעה', 'שדה', 'מרחב', 'פנורמה', 'נופי', 'ערבה', 'טבע פראי', 'קרחון', 'landscape', 'mountain', 'mountains', 'sea', 'ocean', 'sunset', 'sunrise', 'sky', 'clouds', 'forest', 'woods', 'desert', 'dunes', 'beach', 'shore', 'coast', 'lake', 'river', 'waterfall', 'valley', 'hill', 'field', 'meadow', 'panorama', 'vista', 'horizon', 'wilderness', 'glacier', 'canyon', 'prairie'],

  // ── Visual: Product (30+ synonyms) ──
  product: ['מוצר', 'שעון', 'בקבוק', 'נעל', 'טלפון', 'תיק', 'אריזה', 'גאדג׳ט', 'מכשיר', 'לוגו', 'מותג', 'יוקרה', 'פרימיום', 'בקבוקים', 'קופסה', 'משקפיים', 'עט', 'תכשיט', 'אוזניות', 'מחשב נייד', 'סמארטפון', 'קטלוג', 'קטנטן', 'product', 'products', 'watch', 'bottle', 'bottles', 'shoe', 'shoes', 'phone', 'smartphone', 'packaging', 'package', 'box', 'brand', 'luxury', 'premium', 'high-end', 'gadget', 'device', 'electronics', 'logo', 'glasses', 'sunglasses', 'pen', 'bag', 'jewelry', 'earrings', 'ring', 'headphones', 'laptop', 'catalog', 'e-commerce', 'merchandise'],

  // ── Visual: Food (30+ synonyms) ──
  food: ['אוכל', 'מאכל', 'בישול', 'שף', 'מסעדה', 'עוגה', 'עוגיות', 'לחם', 'פיצה', 'המבורגר', 'סלט', 'ארוחה', 'ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'קינוח', 'מנה', 'צלחת', 'קפה', 'תה', 'קוקטייל', 'משקה', 'יין', 'פירות', 'ירקות', 'בשר', 'דג', 'פסטה', 'סושי', 'המלצה', 'food', 'foods', 'cuisine', 'cooking', 'cook', 'chef', 'restaurant', 'bistro', 'cafe', 'cake', 'cookies', 'bread', 'pizza', 'burger', 'salad', 'meal', 'breakfast', 'lunch', 'dinner', 'dessert', 'dish', 'plate', 'coffee', 'tea', 'cocktail', 'drink', 'wine', 'fruit', 'vegetable', 'meat', 'fish', 'pasta', 'sushi', 'ramen', 'noodle', 'soup'],

  // ── Visual: Architecture (30+ synonyms) ──
  architecture: ['בניין', 'בניינים', 'אדריכלות', 'מבנה', 'בית', 'גשר', 'מגדל', 'מקדש', 'כנסייה', 'מסגד', 'טירה', 'מוזיאון', 'חלונות', 'דלתות', 'קשתות', 'עמודים', 'שוק מקורה', 'מנהרה', 'גלריה', 'תערוכה', 'פנים', 'architecture', 'architectural', 'building', 'buildings', 'structure', 'house', 'home', 'bridge', 'tower', 'skyscraper', 'temple', 'church', 'mosque', 'cathedral', 'castle', 'palace', 'museum', 'library', 'stadium', 'arena', 'arch', 'column', 'pillar', 'facade', 'window', 'door', 'staircase', 'courtyard', 'plaza', 'gallery', 'exhibition', 'monument', 'tunnel'],

  // ── Visual: Abstract (30+ synonyms) ──
  abstract: ['מופשט', 'גיאומטרי', 'צורות', 'קווים', 'דוגמה', 'טקסטורה', 'מינימליסטי', 'צבעוני', 'הפשטה', 'ויזואלי', 'ארטי', 'נוזלי', 'שבר', 'אקראי', 'אור', 'השתקפות', 'abstract', 'abstraction', 'geometric', 'shapes', 'lines', 'pattern', 'texture', 'minimalist', 'minimalism', 'colorful', 'visual', 'artsy', 'fluid', 'generative', 'fractal', 'glitch', 'surreal', 'surrealism', 'conceptual', 'gradient', 'noise', 'psychedelic', 'kaleidoscope', 'reflection', 'mirror', 'light art', 'holographic', 'iridescent', 'liquid', 'organic'],

  // ── Visual: Action (30+ synonyms) ──
  action: ['פעולה', 'ריצה', 'קפיצה', 'ספורט', 'מרדף', 'תנועה', 'מהירות', 'דינמי', 'קרב', 'מערכה', 'אקשן', 'אגרוף', 'רכיבה', 'סקי', 'גלישה', 'הצלה', 'מלחמה', 'קונג פו', 'לחימה', 'action', 'running', 'sprint', 'jumping', 'jump', 'sports', 'sport', 'chase', 'explosion', 'fight', 'fighting', 'battle', 'war', 'parkour', 'dynamic', 'motion', 'speed', 'fast', 'athlete', 'athletics', 'boxing', 'martial arts', 'biking', 'skating', 'snowboarding', 'surfing', 'skiing', 'diving', 'rescue', 'stunt'],

  // ── Visual: Emotion (30+ synonyms) ──
  emotion: ['רגש', 'רגשות', 'שמחה', 'עצב', 'הפתעה', 'פחד', 'כעס', 'אהבה', 'געגוע', 'חרדה', 'נוסטלגיה', 'דמעות', 'חיוך', 'צחוק', 'הלם', 'תדהמה', 'התלהבות', 'יאוש', 'בושה', 'גאווה', 'תגובה', 'מבט', 'רגשי', 'emotion', 'emotional', 'joy', 'joyful', 'happy', 'happiness', 'sad', 'sadness', 'surprise', 'surprised', 'shocked', 'fear', 'scared', 'anger', 'angry', 'love', 'longing', 'anxiety', 'nostalgia', 'tears', 'crying', 'smile', 'laugh', 'laughter', 'excitement', 'despair', 'shame', 'pride', 'proud', 'reaction', 'expressive', 'stare', 'gaze'],

  // ── Visual: Nature (30+ synonyms) ──
  nature: ['טבע', 'חיה', 'חיות', 'פרח', 'פרחים', 'ציפור', 'ציפורים', 'עץ', 'עצים', 'עלים', 'דבורה', 'פרפר', 'זאב', 'אריה', 'נמר', 'דוב', 'שועל', 'סנאי', 'צבי', 'שפן', 'צב', 'דג', 'כלב', 'חתול', 'סוס', 'פרה', 'nature', 'natural', 'animal', 'animals', 'wildlife', 'flower', 'flowers', 'bird', 'birds', 'tree', 'trees', 'leaf', 'leaves', 'insect', 'bee', 'butterfly', 'wolf', 'lion', 'tiger', 'bear', 'fox', 'squirrel', 'deer', 'rabbit', 'turtle', 'fish', 'dog', 'cat', 'horse', 'cow', 'eagle', 'owl', 'reptile', 'mammal'],

  // ── Visual: Sci-Fi (30+ synonyms) ──
  'sci-fi': ['עתידני', 'עתידנות', 'חלל', 'ספייס', 'רובוט', 'רובוטי', 'סייבר', 'סייברפאנק', 'ניאון', 'הולוגרמה', 'חייזר', 'חייזרים', 'חללית', 'ירח', 'מאדים', 'גלקסיה', 'דיסטופיה', 'מטריקס', 'אנדרואיד', 'ביוניקה', 'טכנולוגיה עתידית', 'מכונה', 'sci-fi', 'science fiction', 'scifi', 'futuristic', 'future', 'space', 'outer space', 'robot', 'robots', 'robotic', 'cyber', 'cyberpunk', 'neon', 'hologram', 'holographic', 'alien', 'aliens', 'spaceship', 'spacecraft', 'moon', 'mars', 'galaxy', 'universe', 'dystopia', 'dystopian', 'matrix', 'android', 'bionic', 'mech', 'mecha', 'ai', 'artificial'],

  // ── Visual: Fantasy (30+ synonyms) ──
  fantasy: ['פנטזיה', 'דרקון', 'דרקונים', 'קסם', 'קסמים', 'שריון', 'חרב', 'אביר', 'טירה', 'טירות', 'אלף', 'גמד', 'מכשף', 'מכשפה', 'יער קסום', 'יצור מיתי', 'ענק', 'פיה', 'חד קרן', 'מיתוס', 'fantasy', 'fantastical', 'dragon', 'dragons', 'magic', 'magical', 'armor', 'sword', 'knight', 'wizard', 'witch', 'sorcerer', 'castle', 'castles', 'kingdom', 'elf', 'dwarf', 'orc', 'troll', 'giant', 'fairy', 'unicorn', 'phoenix', 'griffin', 'mythical', 'enchanted', 'spell', 'rune', 'potion', 'mystical', 'legend', 'myth'],

  // ── Visual: Editorial (30+ synonyms) ──
  editorial: ['עריכה', 'מגזין', 'אופנה', 'סטודיו', 'פרסום', 'שער מגזין', 'קולנועי', 'מקצועי', 'מסחרי', 'גלוסי', 'איכותי', 'פרימיום', 'editorial', 'magazine', 'cover', 'vogue', 'elle', 'harper', 'gq', 'studio', 'professional', 'commercial', 'advertising', 'ad campaign', 'print', 'glossy', 'publishing', 'high fashion', 'high-end', 'luxury editorial', 'cinematic', 'polished', 'refined', 'glamour', 'glam', 'spread', 'feature', 'lookbook'],

  // ── Visual: Street (30+ synonyms) ──
  street: ['רחוב', 'עירוני', 'שוק', 'סמטה', 'גרפיטי', 'חיי לילה', 'בית קפה', 'כיכר', 'מרכז עיר', 'תחנה', 'מטרו', 'אוטובוס', 'פיגום', 'מכירה', 'מדרחוב', 'פינת רחוב', 'street', 'streets', 'urban', 'city', 'downtown', 'metropolis', 'market', 'bazaar', 'alley', 'alleyway', 'graffiti', 'mural', 'nightlife', 'night scene', 'cafe', 'coffee shop', 'plaza', 'square', 'station', 'subway', 'metro', 'bus', 'corner', 'crossroad', 'sidewalk', 'pavement', 'tram', 'streetlight', 'vendor', 'buskers'],

  // ── Visual: Fashion (30+ synonyms) ──
  fashion: ['אופנה', 'בגד', 'בגדים', 'שמלה', 'שמלת ערב', 'דוגמן', 'דוגמנית', 'מסלול', 'אקססוריז', 'תכשיטים', 'סטייל', 'יוקרה', 'הום קוטור', 'בוטיק', 'קולקציה', 'רטרו', 'וינטאג', 'עיצוב אופנה', 'fashion', 'fashionable', 'dress', 'gown', 'model', 'models', 'outfit', 'clothing', 'clothes', 'apparel', 'haute couture', 'couture', 'runway', 'catwalk', 'style', 'stylish', 'chic', 'elegant', 'boutique', 'collection', 'vintage', 'retro', 'streetwear', 'avant-garde', 'designer', 'accessories', 'jewelry'],

  // ── Visual: Commercial (30+ synonyms) ──
  commercial: ['פרסומת', 'מותג', 'שיווק', 'מוצר מסחרי', 'תדמית', 'קמפיין פרסומי', 'שיווק דיגיטלי', 'תדמית מותג', 'פרזנטציה', 'באנר', 'commercial', 'ad', 'advertisement', 'advert', 'brand', 'branding', 'marketing', 'promo', 'promotion', 'campaign', 'banner', 'billboard', 'spokesperson', 'testimonial', 'endorsement', 'sponsored', 'promotional', 'tv ad', 'print ad', 'digital ad', 'rebrand', 'tagline', 'slogan'],

  // ── Visual: Documentary (30+ synonyms) ──
  documentary: ['תיעודי', 'דוקו', 'ריאליסטי', 'אותנטי', 'חדשות', 'כתבה', 'גולמי', 'מציאותי', 'אמיתי', 'עיתונאי', 'דוקומנטרי', 'documentary', 'doc', 'docu', 'realistic', 'realism', 'authentic', 'raw', 'real', 'journalism', 'journalistic', 'candid', 'unposed', 'verité', 'cinema verité', 'observational', 'newsroom', 'press', 'reportage', 'photojournalism', 'street photography', 'life moment', 'everyday', 'slice of life'],

  // ── Visual: Narrative (30+ synonyms) ──
  narrative: ['סיפור', 'סצנה', 'דרמה', 'קולנוע', 'סרט', 'תסריט', 'סיפורי', 'עלילה', 'דמות ראשית', 'קונפליקט', 'נרטיב', 'נקודת מפנה', 'דרמטי', 'narrative', 'story', 'storytelling', 'scene', 'drama', 'dramatic', 'cinematic', 'movie', 'film', 'filmic', 'plot', 'protagonist', 'character', 'conflict', 'twist', 'arc', 'storyboard', 'screenplay', 'script', 'theatrical', 'saga', 'tale', 'epic', 'mood piece'],

  // ── Visual: Macro (30+ synonyms) ──
  macro: ['מאקרו', 'קרוב', 'קרוב מאוד', 'פרט', 'תקריב', 'מיקרו', 'טיפה', 'אבק', 'בועה', 'נמלה', 'כנף', 'מרקם', 'סיבים', 'זעיר', 'עדין', 'macro', 'macro photography', 'close-up', 'closeup', 'super close', 'detail', 'details', 'texture', 'fiber', 'fibers', 'micro', 'droplet', 'drop', 'bubble', 'dust', 'tiny', 'miniature', 'minute', 'ant', 'insect wing', 'pollen', 'petals', 'minute details', 'granular', 'extreme close-up', 'magnified'],

  // ── Visual: Music Video (30+ synonyms) ──
  'music-video': ['קליפ', 'מוזיקה', 'להקה', 'זמר', 'זמרת', 'הופעה', 'קונצרט', 'רוק', 'פופ', 'היפ הופ', 'ג׳אז', 'במה', 'גיטרה', 'דיג׳יי', 'סטודיו הקלטות', 'כוריאוגרפיה', 'music video', 'clip', 'band', 'singer', 'vocalist', 'concert', 'live', 'performance', 'show', 'stage', 'rock', 'pop', 'hip hop', 'rap', 'jazz', 'classical', 'edm', 'dj', 'guitar', 'drums', 'piano', 'studio recording', 'album', 'tour', 'choreography', 'dance routine', 'lyrics', 'mv', 'beats'],

  // ── Visual: Interior (30+ synonyms) ──
  interior: ['פנים', 'חדר', 'סלון', 'מטבח', 'חדר שינה', 'אמבטיה', 'משרד', 'חלל פתוח', 'ריהוט', 'עיצוב פנים', 'לופט', 'דירה', 'בית', 'תאורה ביתית', 'שטיח', 'ספה', 'שולחן', 'ארון', 'interior', 'interiors', 'room', 'rooms', 'living room', 'lounge', 'kitchen', 'bedroom', 'bathroom', 'office', 'workspace', 'loft', 'apartment', 'flat', 'house', 'home', 'decor', 'decoration', 'furniture', 'furnishings', 'sofa', 'couch', 'table', 'cabinet', 'shelf', 'lamp', 'rug', 'carpet', 'minimalist interior', 'scandinavian', 'modern interior', 'rustic'],

  // ══════ TEXT MODE CATEGORIES (30+ synonyms each) ══════

  // ── Text: Marketing ──
  marketing: ['שיווק', 'פרסום', 'קמפיין', 'מותג', 'פוסט', 'מייל שיווקי', 'ניוזלטר', 'לנדינג פייג׳', 'דף נחיתה', 'מודעה', 'פרומו', 'מבצע', 'קופירייטינג', 'קופי', 'פנייה ללקוחות', 'הנעה לפעולה', 'CTA', 'פאנל', 'marketing', 'marketer', 'ad', 'ads', 'campaign', 'brand', 'branding', 'promo', 'promotion', 'copy', 'copywriting', 'copywriter', 'landing page', 'email marketing', 'newsletter', 'digital marketing', 'content marketing', 'inbound', 'outbound', 'cta', 'call to action', 'funnel', 'conversion', 'lead generation', 'roas', 'ctr'],

  // ── Text: Email ──
  email: ['מייל', 'אימייל', 'הודעה', 'הודעת אימייל', 'ניוזלטר', 'הזמנה', 'פנייה', 'גיוס משקיעים', 'התראה', 'מכתב', 'השבה', 'מייל מכירה', 'מייל קר', 'email', 'emails', 'mail', 'letter', 'message', 'newsletter', 'invite', 'invitation', 'outreach', 'cold email', 'sales email', 'drip email', 'follow-up', 'reply', 'response', 'thank you email', 'welcome email', 'confirmation', 'notification', 'reminder', 'announcement', 'digest', 'subject line', 'inbox'],

  // ── Text: Technical ──
  technical: ['טכני', 'קוד', 'API', 'תיעוד', 'מפתח', 'מתכנת', 'הנדסה', 'אלגוריתם', 'בדיקה', 'דיבאג', 'ארכיטקטורה', 'עיצוב מערכות', 'פרונטאנד', 'בקאנד', 'פולסטאק', 'מסד נתונים', 'דאטה', 'REST', 'GraphQL', 'SDK', 'ספריה', 'פריימוורק', 'technical', 'tech', 'code', 'coding', 'programming', 'program', 'api', 'sdk', 'library', 'framework', 'documentation', 'docs', 'developer', 'engineer', 'engineering', 'software', 'algorithm', 'testing', 'debug', 'debugging', 'architecture', 'system design', 'frontend', 'backend', 'fullstack', 'database', 'sql', 'rest', 'graphql', 'microservice', 'deployment', 'devops'],

  // ── Text: Creative ──
  creative: ['יצירתי', 'סיפור', 'סיפורת', 'שיר', 'שירה', 'תסריט', 'יצירה', 'פרוזה', 'ספר', 'רומן', 'נובלה', 'פואטי', 'קריאטיב', 'ספרותי', 'מטאפורה', 'דמיון', 'פנטזיה יצירתית', 'creative', 'creativity', 'story', 'fiction', 'poem', 'poetry', 'screenplay', 'script', 'novel', 'novella', 'prose', 'literary', 'writing', 'writer', 'author', 'book', 'chapter', 'narrative', 'metaphor', 'imagination', 'imaginative', 'lyrical', 'artistic', 'creative writing', 'short story', 'flash fiction', 'verse', 'stanza'],

  // ── Text: Strategy ──
  strategy: ['אסטרטגיה', 'תכנון', 'ניתוח', 'SWOT', 'מפת דרכים', 'חזון', 'יעדים', 'OKR', 'KPI', 'ניתוח תחרותי', 'מודל עסקי', 'קנבס', 'אסטרטגיית שוק', 'גו טו מרקט', 'צמיחה', 'strategy', 'strategic', 'planning', 'plan', 'analysis', 'analyze', 'business plan', 'business strategy', 'roadmap', 'vision', 'mission', 'goals', 'objectives', 'okr', 'kpi', 'swot', 'competitive analysis', 'business model', 'canvas', 'go-to-market', 'gtm', 'growth', 'scaling', 'pivot', 'positioning', 'framework', 'playbook'],

  // ── Text: Sales ──
  sales: ['מכירות', 'עסקה', 'לקוח', 'הצעה', 'הצעת מחיר', 'סקריפט מכירות', 'פיץ׳', 'דמו', 'שיחת מכירה', 'סגירה', 'פולואפ', 'SDR', 'AE', 'אאוטבאונד', 'לידים', 'פייפליין', 'אובג׳קשנים', 'טיפול בהתנגדויות', 'sales', 'selling', 'sell', 'deal', 'deals', 'customer', 'client', 'prospect', 'lead', 'leads', 'pipeline', 'pitch', 'demo', 'discovery call', 'sales call', 'close', 'closing', 'follow-up', 'proposal', 'quote', 'b2b', 'b2c', 'crm', 'sdr', 'bdr', 'ae', 'outbound', 'inbound sales', 'objections', 'qbr', 'upsell', 'cross-sell'],

  // ── Text: Educational ──
  educational: ['חינוך', 'הוראה', 'הסבר', 'שיעור', 'מצגת לימוד', 'קורס', 'הדרכה', 'טיוטוריאל', 'מבוא', 'תלמיד', 'סטודנט', 'מורה', 'מרצה', 'אקדמיה', 'הכשרה', 'ויזואליזציה של מושגים', 'חומר לימוד', 'educational', 'education', 'learning', 'learn', 'teaching', 'teach', 'teacher', 'instructor', 'explain', 'explanation', 'lesson', 'course', 'curriculum', 'syllabus', 'tutorial', 'guide', 'walkthrough', 'primer', 'intro', 'introduction', 'lecture', 'workshop', 'training', 'onboarding', 'student', 'pupil', 'learner', 'academy', 'academic', 'edtech', 'pedagogy'],

  // ── Text: Social Media ──
  'social-media': ['סושיאל', 'אינסטגרם', 'פייסבוק', 'טיקטוק', 'טוויטר', 'לינקדאין', 'יוטיוב', 'סנאפצ׳אט', 'ת׳רדס', 'פוסט', 'סטורי', 'ריל', 'האשטג', 'אלגוריתם', 'פיד', 'כיתוב', 'social', 'social media', 'socials', 'instagram', 'ig', 'insta', 'facebook', 'fb', 'tiktok', 'twitter', 'x.com', 'linkedin', 'youtube', 'yt', 'snapchat', 'threads', 'reddit', 'pinterest', 'post', 'posts', 'story', 'stories', 'reel', 'reels', 'hashtag', 'feed', 'algorithm', 'caption', 'dm', 'direct message', 'influencer', 'creator', 'virality', 'engagement'],

  // ── Text: Business ──
  business: ['עסקים', 'מצגת', 'דוח', 'ישיבה', 'ישיבת דירקטוריון', 'ניתוח פיננסי', 'חברה', 'סטארטאפ', 'תאגיד', 'יזמות', 'מנכ״ל', 'סמנכ״ל', 'כוח אדם', 'משאבי אנוש', 'תפעול', 'לוגיסטיקה', 'business', 'corporate', 'enterprise', 'company', 'startup', 'firm', 'corporation', 'presentation', 'deck', 'slide', 'slides', 'report', 'quarterly', 'annual', 'meeting', 'board meeting', 'board', 'ceo', 'cto', 'cfo', 'executive', 'management', 'hr', 'human resources', 'operations', 'logistics', 'supply chain', 'procurement', 'finance', 'accounting', 'budget', 'p&l', 'revenue'],

  // ══════ RESEARCH CATEGORIES (30+ synonyms each) ══════

  'research-market': ['שוק', 'מתחרים', 'צרכנים', 'ניתוח שוק', 'גודל שוק', 'נתח שוק', 'TAM', 'SAM', 'SOM', 'מחקר צרכנים', 'סקר', 'פוקוס גרופ', 'מותגים מובילים', 'מגמות שוק', 'דמוגרפיה', 'פלח שוק', 'מחירים', 'מוצרים מתחרים', 'market', 'market research', 'market analysis', 'market size', 'market share', 'tam', 'sam', 'som', 'consumers', 'consumer research', 'survey', 'focus group', 'competitors', 'competitor analysis', 'competitive landscape', 'market trends', 'demographics', 'segmentation', 'pricing research', 'product research', 'brand research', 'market intelligence', 'market sizing'],

  'research-academic': ['אקדמי', 'מחקר אקדמי', 'ספרות', 'סקירת ספרות', 'תזה', 'דיסרטציה', 'מאמר מדעי', 'ביבליוגרפיה', 'ציטוטים', 'פיר ריוויו', 'מתודולוגיה', 'השערה', 'ניסוי', 'סטטיסטיקה', 'academic', 'academia', 'research', 'literature review', 'lit review', 'thesis', 'dissertation', 'paper', 'academic paper', 'scholarly', 'journal', 'publication', 'citation', 'citations', 'bibliography', 'references', 'peer review', 'peer-reviewed', 'methodology', 'hypothesis', 'experiment', 'study', 'scholar', 'scholarly article', 'meta-analysis', 'systematic review', 'doctoral', 'phd', 'postgraduate'],

  'research-technical': ['מחקר טכני', 'ביצועים', 'ארכיטקטורה', 'בנצ׳מרק', 'השוואת טכנולוגיות', 'מחקר הנדסי', 'ניסויים טכניים', 'אופטימיזציה', 'מחקר ביצועים', 'תשתית', 'technical research', 'tech research', 'benchmark', 'benchmarks', 'benchmarking', 'performance', 'performance analysis', 'architecture', 'engineering research', 'feasibility study', 'technical feasibility', 'prototype', 'proof of concept', 'poc', 'white paper', 'infrastructure', 'stack comparison', 'framework comparison', 'technology evaluation', 'tech stack', 'scalability', 'throughput', 'latency', 'load testing'],

  'research-competitive': ['מתחרים', 'השוואה', 'SWOT', 'ניתוח תחרותי', 'מחקר מתחרים', 'בנצ׳מרק תחרותי', 'פיצ׳רים', 'השוואת מחירים', 'מיצוב', 'חוזקות וחולשות', 'הזדמנויות', 'איומים', 'competitive', 'competitors', 'competitor', 'competition', 'competitive analysis', 'competitive research', 'swot', 'comparison', 'feature comparison', 'vs', 'versus', 'competitive landscape', 'competitive intelligence', 'positioning', 'differentiation', 'strengths', 'weaknesses', 'opportunities', 'threats', 'compete', 'benchmarking', 'market positioning', 'moat', 'battlecard', 'alternatives'],

  'research-legal': ['משפטי', 'חוק', 'תקנה', 'רגולציה', 'תקדים', 'חוות דעת משפטית', 'חוזה', 'מחקר משפטי', 'פסיקה', 'חקיקה', 'משפט מסחרי', 'משפט מנהלי', 'ציות', 'legal', 'legal research', 'law', 'laws', 'regulation', 'regulations', 'regulatory', 'compliance', 'gdpr', 'hipaa', 'precedent', 'case law', 'statute', 'legislation', 'legal opinion', 'contract', 'contracts', 'legal analysis', 'jurisdiction', 'litigation', 'liability', 'intellectual property', 'ip', 'patent', 'trademark', 'copyright', 'terms of service', 'privacy policy'],

  'research-healthcare': ['רפואי', 'בריאות', 'תרופה', 'תרופות', 'טיפול', 'מחקר קליני', 'מטופל', 'מחלה', 'אבחון', 'בטיחות תרופתית', 'FDA', 'ניסוי קליני', 'פסיכולוגיה', 'פסיכיאטריה', 'רפואה מונעת', 'medical', 'medical research', 'healthcare', 'health', 'clinical', 'clinical research', 'clinical trial', 'drug', 'drugs', 'medication', 'pharmaceutical', 'pharma', 'therapy', 'therapeutic', 'treatment', 'patient', 'disease', 'diagnosis', 'diagnostic', 'fda', 'ema', 'public health', 'epidemiology', 'oncology', 'cardiology', 'mental health', 'psychology research', 'medical device'],

  'research-historical': ['היסטורי', 'עבר', 'ציר זמן', 'תקופה היסטורית', 'מחקר היסטורי', 'ארכיון', 'מסמכים היסטוריים', 'ההיסטוריה של', 'תיעוד עבר', 'עתיקות', 'ארכיאולוגיה', 'historical', 'history', 'history of', 'historical research', 'past', 'era', 'period', 'timeline', 'chronology', 'archive', 'archives', 'archival', 'ancient', 'medieval', 'renaissance', 'victorian', 'modern era', 'pre-war', 'post-war', 'primary source', 'historiography', 'archaeology', 'archaeological', 'artifact', 'excavation', 'genealogy', 'ancestry'],

  'research-financial': ['פיננסי', 'כלכלי', 'השקעות', 'שוק הון', 'בורסה', 'מניות', 'אג״ח', 'קריפטו', 'ניתוח פיננסי', 'דוחות כספיים', 'מאקרו', 'מיקרו', 'שערי ריבית', 'אינפלציה', 'תשואה', 'תיק השקעות', 'מכפיל', 'financial', 'finance', 'financial research', 'economic', 'economics', 'investment', 'investments', 'stock market', 'stocks', 'equity', 'bonds', 'treasury', 'crypto', 'cryptocurrency', 'defi', 'macro', 'macroeconomics', 'microeconomics', 'interest rates', 'inflation', 'yield', 'portfolio', 'valuation', 'p/e ratio', 'multiple', 'earnings', 'quarterly report', '10-k', 'balance sheet', 'cash flow'],

  'research-policy': ['מדיניות', 'ממשל', 'חקיקה', 'תקנות', 'רפורמה', 'ניתוח מדיניות', 'מחקר מדיניות', 'מכון מחקר', 'ראש הממשלה', 'כנסת', 'חוק', 'ועדה', 'policy', 'public policy', 'policy research', 'policy analysis', 'government', 'governance', 'legislation', 'legislative', 'regulation', 'regulatory', 'reform', 'think tank', 'white paper', 'position paper', 'political analysis', 'parliament', 'congress', 'senate', 'administration', 'executive order', 'bill', 'committee', 'lobbying', 'advocacy', 'civic', 'public sector'],

  'research-trends': ['מגמות', 'עתיד', 'תחזית', 'טרנדים', 'עתידנות', 'חיזוי', 'מגמות שוק', 'חידושים', 'טכנולוגיות מתפתחות', 'מחקר חזון', 'tipping point', 'trends', 'trending', 'trend analysis', 'future', 'future research', 'futurism', 'futurist', 'forecast', 'forecasting', 'prediction', 'outlook', 'foresight', 'emerging trends', 'emerging tech', 'megatrends', 'macrotrends', 'innovation', 'disruption', 'disruptive', 'early signal', 'weak signal', 'scenario planning', 'horizon scanning', 'what next', 'next big thing'],

  // ══════ AGENT CATEGORIES (30+ synonyms each) ══════

  'agent-customer-service': ['שירות', 'שירות לקוחות', 'תמיכה', 'תמיכה טכנית', 'לקוחות', 'help desk', 'service desk', 'טיקטים', 'פניות', 'מענה ראשוני', 'צ׳אט לייב', 'FAQ', 'שאלות נפוצות', 'customer service', 'customer support', 'cs', 'support', 'help desk', 'helpdesk', 'service desk', 'customer care', 'customer experience', 'cx', 'tickets', 'ticket system', 'live chat', 'chatbot support', 'faq', 'faqs', 'knowledge base', 'kb', 'first response', 'resolution', 'customer success', 'csm', 'customer retention', 'escalation', 'sla', 'nps'],

  'agent-tutor': ['מורה', 'לימוד', 'שיעור פרטי', 'תלמיד', 'סטודנט', 'הכנה למבחן', 'שיעורי בית', 'עזר לימודי', 'חיזוק לימודי', 'בגרות', 'פסיכומטרי', 'tutor', 'tutoring', 'teacher', 'teaching assistant', 'private lesson', 'lesson', 'student', 'pupil', 'homework help', 'homework', 'exam prep', 'test prep', 'sat prep', 'act prep', 'study help', 'study partner', 'learning assistant', 'educational', 'education agent', 'school help', 'coaching academic', 'grade improvement', 'skill building', 'remedial', 'enrichment'],

  'agent-coach': ['מאמן', 'כושר', 'אימון', 'ספורט', 'אימון אישי', 'תזונה', 'דיאטה', 'חדר כושר', 'רצועת ריצה', 'קרוספיט', 'יוגה', 'מדיטציה', 'מיינדפולנס', 'coach', 'coaching', 'fitness', 'fitness coach', 'personal trainer', 'pt', 'training', 'workout', 'gym', 'crossfit', 'yoga', 'pilates', 'nutrition', 'nutritionist', 'diet', 'dietitian', 'wellness', 'life coach', 'mental coach', 'mindfulness', 'meditation', 'running coach', 'strength coach', 'bodybuilding', 'athlete', 'athletic performance'],

  'agent-writer': ['כתיבה', 'עריכה', 'בלוג', 'עוזר כתיבה', 'קופירייטר', 'עורך תוכן', 'סיפור', 'מאמרים', 'תוכן שיווקי', 'טקסט', 'סטייל גייד', 'writer', 'writing', 'writing assistant', 'copywriter', 'copywriting', 'editor', 'editing', 'ghostwriter', 'blog', 'blogger', 'content', 'content writer', 'content creator', 'articles', 'storytelling', 'author', 'novelist', 'screenwriter', 'journalist', 'freelance writer', 'seo writer', 'technical writer', 'proofreader', 'style guide', 'grammar', 'prose'],

  'agent-analyst': ['אנליסט', 'ניתוח נתונים', 'דאטה', 'ביג דאטה', 'ויזואליזציה', 'BI', 'ניתוח עסקי', 'דוחות', 'KPI', 'מדדים', 'אקסל', 'SQL', 'Power BI', 'Tableau', 'analyst', 'analysis', 'data analyst', 'data', 'big data', 'data science', 'data scientist', 'analytics', 'business analyst', 'ba', 'business intelligence', 'bi', 'dashboards', 'visualization', 'reports', 'reporting', 'kpis', 'metrics', 'excel', 'sql', 'tableau', 'power bi', 'looker', 'data mining', 'statistical analysis', 'forecasting', 'predictive analytics'],

  'agent-advisor': ['יועץ', 'קריירה', 'ייעוץ', 'הכוונה', 'תכנון קריירה', 'חיפוש עבודה', 'קורות חיים', 'ראיון עבודה', 'לינקדאין', 'פרופיל מקצועי', 'advisor', 'advising', 'consultant', 'consulting', 'guidance', 'mentor', 'mentoring', 'career', 'career advisor', 'career coach', 'career planning', 'job search', 'job seeker', 'resume', 'cv', 'curriculum vitae', 'interview prep', 'interview coaching', 'linkedin profile', 'professional brand', 'networking', 'career change', 'job transition', 'salary negotiation', 'life advisor', 'personal advisor'],

  'agent-therapist': ['טיפולי', 'רגשי', 'תמיכה נפשית', 'פסיכולוג', 'מטפל', 'בריאות הנפש', 'חרדה', 'דיכאון', 'מצב רוח', 'מיינדפולנס', 'שלוות נפש', 'CBT', 'DBT', 'therapist', 'therapy', 'emotional', 'emotional support', 'mental health', 'mental wellness', 'wellness', 'psychologist', 'psychology', 'psychiatry', 'counselor', 'counseling', 'therapy bot', 'companion', 'anxiety', 'depression', 'mood', 'stress', 'stress management', 'mindfulness', 'self-help', 'self care', 'cbt', 'dbt', 'cognitive behavioral', 'grief', 'trauma', 'burnout'],

  'agent-recruiter': ['גיוס', 'גיוס עובדים', 'משאבי אנוש', 'HR', 'ראיונות', 'צילום מועמדים', 'מיון מועמדים', 'תפקידים פתוחים', 'גיוס טכני', 'headhunter', 'recruiter', 'recruiting', 'recruitment', 'hr', 'human resources', 'talent acquisition', 'ta', 'talent', 'headhunter', 'headhunting', 'sourcer', 'sourcing', 'screening', 'interviews', 'interview process', 'candidates', 'candidate screening', 'open roles', 'job posting', 'job description', 'tech recruiter', 'technical recruiter', 'executive search', 'placement', 'hiring manager', 'offer negotiation'],

  'agent-legal': ['עוזר משפטי', 'פארלגל', 'חוזה', 'ניסוח חוזה', 'בדיקת חוזים', 'ייעוץ משפטי ראשוני', 'תקנון', 'מסמכים משפטיים', 'legal assistant', 'paralegal', 'paralegal bot', 'legal bot', 'contract', 'contracts', 'contract review', 'contract drafting', 'terms of service', 'tos', 'privacy policy', 'nda', 'non-disclosure', 'legal documents', 'legal forms', 'legal research assistant', 'compliance assistant', 'case preparation', 'legal summaries', 'legal admin', 'document review', 'e-discovery', 'redlining', 'legal intake'],

  'agent-creative': ['רעיונות', 'יצירתיות', 'מוח', 'שותף יצירה', 'סיעור מוחות', 'ברנד מחשבות', 'קריאטיב', 'רעיון מרכזי', 'קונספט', 'אידיאציה', 'creative partner', 'creativity', 'creative assistant', 'brainstorming', 'brainstorm', 'ideation', 'ideas', 'idea generation', 'concept', 'concepts', 'creative brief', 'inspiration', 'muse', 'creative companion', 'imagination', 'innovate', 'innovation', 'think partner', 'thought partner', 'creative director', 'cd', 'lateral thinking', 'divergent thinking', 'blue sky', 'moonshot', 'disrupt', 'reimagine'],
};

/**
 * Detect relevant categories from a concept string.
 */
function detectCategories(concept: string): ExampleCategory[] {
  const lower = concept.toLowerCase();
  const matches: { category: ExampleCategory; score: number }[] = [];

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) matches.push({ category: cat as ExampleCategory, score });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .map(m => m.category);
}

/**
 * Select the most relevant examples based on the user's concept.
 * Falls back to diverse sampling if no category match.
 */
function selectRelevantExamples(
  examples: SkillExample[],
  concept: string,
  maxExamples: number = 3
): SkillExample[] {
  if (examples.length <= maxExamples) return examples;

  const detectedCats = detectCategories(concept);
  if (detectedCats.length === 0) {
    // No match — return evenly spaced diverse sample
    const step = Math.floor(examples.length / maxExamples);
    return Array.from({ length: maxExamples }, (_, i) => examples[i * step]);
  }

  // Score each example by category match
  const scored = examples.map(ex => {
    const catIndex = ex.category ? detectedCats.indexOf(ex.category) : -1;
    const score = catIndex >= 0 ? detectedCats.length - catIndex : 0;
    return { ex, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top matches, but ensure at least one non-matching for diversity
  const selected = scored.slice(0, maxExamples).map(s => s.ex);

  // If all selected have score 0, just return first N
  if (selected.every((_, i) => scored[i].score === 0)) {
    return examples.slice(0, maxExamples);
  }

  return selected;
}

// ── Selection Tracking (in-memory analytics) ──

export interface SkillSelection {
  type: string;
  platform: string;
  concept: string;
  selectedCategories: string[];
  timestamp: number;
}

const recentSelections: SkillSelection[] = [];
const MAX_SELECTIONS = 1000;

/**
 * Record a skill example selection event in the in-memory ring buffer.
 * Uses LRU-style eviction: when full, the oldest entry is dropped.
 *
 * Also persists to the `skill_selections` Postgres table (T5 — analytics
 * persistence). The DB write is fire-and-forget and runs ONLY on the
 * server (gated on `typeof window === 'undefined'`) so client bundles
 * never pull in the service Supabase client.
 */
export function recordSelection(
  type: string,
  platform: string,
  concept: string,
  categories: string[]
): void {
  // 1. In-memory ring buffer (fast-path; survives the current process only).
  recentSelections.push({
    type,
    platform,
    concept,
    selectedCategories: categories,
    timestamp: Date.now(),
  });
  if (recentSelections.length > MAX_SELECTIONS) {
    recentSelections.shift();
  }

  // 2. Persist to Postgres. Server-side only (engines run on Vercel
  // Functions). Dynamic import keeps the service client out of any
  // client bundle that imports from this file. Errors are swallowed —
  // the in-memory copy is still recorded above.
  if (typeof window !== 'undefined') return;
  void import('@/lib/supabase/service')
    .then(({ createServiceClient }) => {
      try {
        const client = createServiceClient();
        return client.from('skill_selections').insert({
          type,
          platform,
          concept: concept.slice(0, 500),
          categories,
        });
      } catch {
        return null;
      }
    })
    .then((result) => {
      if (result && 'error' in result && result.error) {
        console.warn('[skills] persist failed:', result.error.message);
      }
    })
    .catch(() => { /* swallow */ });
}

/**
 * Get the most recent skill selections (newest first).
 */
export function getRecentSelections(limit?: number): SkillSelection[] {
  const reversed = [...recentSelections].reverse();
  return typeof limit === 'number' ? reversed.slice(0, limit) : reversed;
}

/**
 * Aggregate stats over the in-memory selection buffer.
 */
export function getSelectionStats(): {
  totalSelections: number;
  topCategories: Array<{ category: string; count: number }>;
  topPlatforms: Array<{ platform: string; count: number }>;
  byType: Record<string, number>;
} {
  const categoryCounts: Record<string, number> = {};
  const platformCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};

  for (const sel of recentSelections) {
    typeCounts[sel.type] = (typeCounts[sel.type] || 0) + 1;
    platformCounts[sel.platform] = (platformCounts[sel.platform] || 0) + 1;
    for (const cat of sel.selectedCategories) {
      if (!cat) continue;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const topPlatforms = Object.entries(platformCounts)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSelections: recentSelections.length,
    topCategories,
    topPlatforms,
    byType: typeCounts,
  };
}

// ── Public API ──

/**
 * Get few-shot examples formatted for injection into a system prompt.
 * When concept is provided, selects the most relevant examples.
 *
 * Side effect: records the selection in the in-memory analytics buffer
 * so the admin dashboard can display which examples are being used.
 */
export function getExamplesBlock(
  type: 'image' | 'video' | 'text',
  platform: string,
  concept?: string,
  maxExamples: number = 3
): string {
  const skills = type === 'image' ? IMAGE_SKILLS : type === 'video' ? VIDEO_SKILLS : TEXT_SKILLS;
  const skill = skills[platform];
  if (!skill || skill.examples.length === 0) return '';

  const selected = concept
    ? selectRelevantExamples(skill.examples, concept, maxExamples)
    : skill.examples.slice(0, maxExamples);

  // Record selection for analytics (fire-and-forget, in-memory only)
  try {
    const categories = selected
      .map(ex => ex.category)
      .filter((c): c is ExampleCategory => Boolean(c));
    recordSelection(type, platform, concept || '', categories);
  } catch {
    // Never let analytics break prompt building.
  }

  const lines = selected.map((ex, i) =>
    `Example ${i + 1}:\nConcept: "${ex.concept}"\nOutput: ${ex.output}`
  ).join('\n\n');

  return `\nADDITIONAL EXAMPLES (study these for quality and style):\n${lines}\n`;
}

/**
 * Get common mistakes block for injection into system prompt.
 */
export function getMistakesBlock(type: 'image' | 'video' | 'text', platform: string): string {
  const skills = type === 'image' ? IMAGE_SKILLS : type === 'video' ? VIDEO_SKILLS : TEXT_SKILLS;
  const skill = skills[platform];
  if (!skill?.mistakes || skill.mistakes.length === 0) return '';

  const lines = skill.mistakes.map((m, i) =>
    `${i + 1}. BAD: ${m.bad}\n   GOOD: ${m.good}\n   WHY: ${m.why}`
  ).join('\n');

  return `\nCOMMON MISTAKES TO AVOID:\n${lines}\n`;
}

/**
 * Get platform-specific scoring criteria for injection into quality check.
 */
export function getScoringBlock(type: 'image' | 'video' | 'text', platform: string): string {
  const skills = type === 'image' ? IMAGE_SKILLS : type === 'video' ? VIDEO_SKILLS : TEXT_SKILLS;
  const skill = skills[platform];
  if (!skill?.scoringCriteria || skill.scoringCriteria.length === 0) return '';

  const lines = skill.scoringCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `\nPLATFORM-SPECIFIC QUALITY CHECKLIST:\n${lines}\n`;
}

/**
 * Get a specific platform skill.
 */
export function getImageSkill(platform: string): PlatformSkill | undefined {
  return IMAGE_SKILLS[platform];
}

export function getVideoSkill(platform: string): PlatformSkill | undefined {
  return VIDEO_SKILLS[platform];
}

/**
 * Get a chain-of-thought reasoning block for injection into a system prompt.
 *
 * Picks up to 2 examples — preferring an exact concept match when provided,
 * otherwise the first available examples on the skill. Returns an empty string
 * if the platform has no chainOfThoughtExamples defined.
 */
export function getChainOfThoughtBlock(
  type: 'text',
  platform: string,
  concept?: string
): string {
  const skills = type === 'text' ? TEXT_SKILLS : null;
  const skill = skills?.[platform];
  if (!skill?.chainOfThoughtExamples || skill.chainOfThoughtExamples.length === 0) {
    return '';
  }

  // Score by simple keyword overlap with the concept (if provided).
  const all = skill.chainOfThoughtExamples;
  let selected = all.slice(0, 2);
  if (concept && concept.trim()) {
    const lower = concept.toLowerCase();
    const tokens = lower.split(/\s+/).filter(t => t.length >= 3);
    const scored = all.map(ex => {
      const exLower = ex.concept.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (exLower.includes(tok)) score++;
      }
      return { ex, score };
    });
    scored.sort((a, b) => b.score - a.score);
    selected = scored.slice(0, 2).map(s => s.ex);
  }

  const lines = selected.map((ex, i) =>
    `Example ${i + 1}:\nConcept: "${ex.concept}"\nReasoning chain: ${ex.reasoning}\nResulting prompt: ${ex.output}`
  ).join('\n\n');

  return `\nCHAIN-OF-THOUGHT REASONING EXAMPLES (study HOW to think through the problem before writing the prompt):\n${lines}\n`;
}

/**
 * Get a refinement examples block for injection into a refinement system prompt.
 *
 * Selects examples whose iteration matches the requested round. Falls back to
 * any available examples if no exact match is found. Returns an empty string
 * if the platform has no refinementExamples defined.
 */
export function getRefinementExamplesBlock(
  type: 'text',
  platform: string,
  iteration: number
): string {
  const skills = type === 'text' ? TEXT_SKILLS : null;
  const skill = skills?.[platform];
  if (!skill?.refinementExamples || skill.refinementExamples.length === 0) {
    return '';
  }

  const all = skill.refinementExamples;
  const exact = all.filter(ex => ex.iteration === iteration);
  const selected = exact.length > 0 ? exact : all.slice(0, 1);

  const lines = selected.map((ex, i) => {
    const changesList = ex.changes.map(c => `- ${c}`).join('\n');
    return `Example ${i + 1} (iteration ${ex.iteration}):\nBEFORE:\n${ex.beforePrompt}\n\nAFTER:\n${ex.afterPrompt}\n\nKey changes:\n${changesList}`;
  }).join('\n\n---\n\n');

  return `\nREFINEMENT EXAMPLES FOR ROUND ${iteration} (study HOW prompts are upgraded between rounds):\n${lines}\n`;
}
