/**
 * Project law (owner decision, 2026-08-31): no em or en dashes in anything a
 * reader sees. Models lean on them and it reads machine-made, and Russian
 * models in particular use the em dash as a copula ("Вы — эксперт"). The
 * instruction is in every template; this is the enforcement, applied
 * deterministically to generated text so the law holds when a model
 * ignores the instruction.
 *
 * Rules: an em dash becomes a comma; an en dash between digits becomes a
 * plain hyphen (a range, "300-500"); any other en dash becomes a comma.
 */
export function stripAiDashes(text: string): string {
  return (
    text
      // Russian zero copula: "Вы — эксперт" reads naturally as "Вы эксперт",
      // where a comma would not. Pronoun subjects only; \b is ASCII-only, so
      // the boundary is spelled out.
      .replace(
        /(^|[\s(«"'])(Вы|вы|Ты|ты|Это|это|Он|он|Она|она|Они|они|Мы|мы|Я|я)\s*\u2014\s*/g,
        "$1$2 ",
      )
      .replace(/\s*\u2014\s*/g, ", ")
      .replace(/(\d)\s*\u2013\s*(\d)/g, "$1-$2")
      .replace(/\s*\u2013\s*/g, ", ")
      .replace(/, ,/g, ",")
  );
}

/**
 * The same scrub for a text stream, chunk by chunk.
 *
 * A dash pattern can straddle chunks ("Вы " then "— эксперт"), and the
 * Russian copula rule needs the word before the dash, so the last token of
 * every chunk, with any trailing spaces and dash, is held back and
 * prepended to the next chunk. The reader sees the stream one word late,
 * never a dash. A run with no whitespace at all is not held beyond 64
 * characters so a long unbroken string cannot stall the stream.
 */
export function createDashScrubStream(): TransformStream<string, string> {
  let held = "";
  const TAIL = /(\S+\s*[\u2013\u2014]?\s*)$/;
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const text = held + chunk;
      const m = TAIL.exec(text);
      let cut = m ? m.index : text.length;
      if (text.length - cut > 64) cut = text.length - 64;
      held = text.slice(cut);
      const out = text.slice(0, cut);
      if (out) controller.enqueue(stripAiDashes(out));
    },
    flush(controller) {
      if (held) controller.enqueue(stripAiDashes(held));
    },
  });
}

/**
 * Wrap a text-stream Response so its body is scrubbed on the way out.
 * Headers and status are kept; the caller may still add cookies.
 */
export function scrubDashesInResponse(res: Response): Response {
  if (!res.body) return res;
  // Bytes on the wire, but a body may also carry string chunks (tests, and
  // any Response built from a string stream), so decode only what is bytes.
  const decoder = new TextDecoder();
  const decode = new TransformStream<Uint8Array | string, string>({
    transform(chunk, controller) {
      controller.enqueue(
        typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true }),
      );
    },
    flush(controller) {
      const tail = decoder.decode();
      if (tail) controller.enqueue(tail);
    },
  });
  const body = res.body
    .pipeThrough(decode)
    .pipeThrough(createDashScrubStream())
    .pipeThrough(new TextEncoderStream());
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
