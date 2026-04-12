interface TextExtractionResult {
  text: string;
  metadata: {
    format: 'txt';
    characters: number;
  };
}

export async function extractText(buffer: Buffer): Promise<TextExtractionResult> {
  const text = buffer.toString('utf-8');
  return { text, metadata: { format: 'txt', characters: text.length } };
}
