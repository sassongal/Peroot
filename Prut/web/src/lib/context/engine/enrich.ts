import { generateText, Output } from 'ai';
import type { ModelMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { selectEnrichPrompt } from './prompts';
import type { ContextBlockDisplay, DocumentType } from './types';

const enrichSchema = z.object({
  title: z.string().min(1).max(200),
  documentType: z.string().min(1),
  summary: z.string().min(20).max(2000),
  keyFacts: z.array(z.string()).min(0).max(10),
  entities: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(['person', 'org', 'date', 'amount', 'location', 'other']),
      }),
    )
    .max(20),
});

export interface EnrichInput {
  text: string;
  detectedType: DocumentType;
  sourceType: 'file' | 'url' | 'image';
  title: string;
  imageBase64?: string;
  imageMimeType?: string;
}

type EnrichOutput = Pick<
  ContextBlockDisplay,
  'title' | 'documentType' | 'summary' | 'keyFacts' | 'entities'
>;

const ENRICH_MODEL = 'gemini-2.5-flash-lite';

export async function enrichContent(input: EnrichInput): Promise<EnrichOutput> {
  const system = selectEnrichPrompt(input.detectedType, input.sourceType === 'image');

  const messages: ModelMessage[] = [
    {
      role: 'user',
      content:
        input.sourceType === 'image' && input.imageBase64
          ? [
              { type: 'text', text: `כותרת: ${input.title}\nנתח את התמונה:` },
              { type: 'image', image: `data:${input.imageMimeType};base64,${input.imageBase64}` },
            ]
          : [{ type: 'text', text: `כותרת: ${input.title}\n\n<USER_DOCUMENT>\n${input.text}\n</USER_DOCUMENT>` }],
    },
  ];

  const result = await generateText({
    model: google(ENRICH_MODEL),
    output: Output.object({ schema: enrichSchema }),
    system,
    messages,
    temperature: 0.2,
  });

  const output = result.output as z.infer<typeof enrichSchema> | null;
  if (!output) throw new Error('Enrichment returned empty output');
  return {
    title: output.title,
    documentType: output.documentType as DocumentType,
    summary: output.summary,
    keyFacts: output.keyFacts,
    entities: output.entities,
  };
}
