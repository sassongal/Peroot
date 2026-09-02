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
  return text
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/(\d)\s*\u2013\s*(\d)/g, "$1-$2")
    .replace(/\s*\u2013\s*/g, ", ")
    .replace(/, ,/g, ",");
}

/**
 * The same scrub for a text stream, chunk by chunk.
 *
 * A chunk may end in the whitespace that precedes a dash in the next chunk,
 * so a run of trailing whitespace is held back and prepended to the next
 * chunk before scrubbing; the held text is flushed at the end.
 */
export function createDashScrubStream(): TransformStream<string, string> {
  let held = "";
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const text = held + chunk;
      const m = /\s+$/.exec(text);
      if (m && m.index > 0) {
        held = m[0];
        controller.enqueue(stripAiDashes(text.slice(0, m.index)));
      } else if (m) {
        held = text;
      } else {
        held = "";
        controller.enqueue(stripAiDashes(text));
      }
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
