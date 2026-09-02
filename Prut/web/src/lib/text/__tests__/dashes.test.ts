/**
 * The dash law, enforced (owner decision, 2026-08-31): no em or en dash
 * reaches a reader from generated text, whether it arrives whole or as a
 * stream that happens to split right before the dash.
 */
import { describe, it, expect } from "vitest";
import { stripAiDashes, createDashScrubStream, scrubDashesInResponse } from "../dashes";

const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

async function collect(res: Response): Promise<string> {
  return new TextDecoder().decode(new Uint8Array(await res.arrayBuffer()));
}

describe("stripAiDashes", () => {
  it("turns an em dash into a comma", () => {
    expect(stripAiDashes(`הפלט ${EM} רשימה`)).toBe("הפלט, רשימה");
    expect(stripAiDashes(`Цель поста ${EM} вызвать интерес`)).toBe("Цель поста, вызвать интерес");
  });

  it("drops the Russian copula dash after a pronoun instead of adding a comma", () => {
    expect(stripAiDashes(`Вы ${EM} старший стратег`)).toBe("Вы старший стратег");
    expect(stripAiDashes(`## Роль\nВы ${EM} эксперт. Это ${EM} важно.`)).toBe(
      "## Роль\nВы эксперт. Это важно.",
    );
  });

  it("keeps an en dash between digits as a plain hyphen range", () => {
    expect(stripAiDashes(`300 ${EN} 500 слов`)).toBe("300-500 слов");
    expect(stripAiDashes(`עד 2${EN}3 פסקאות`)).toBe("עד 2-3 פסקאות");
  });

  it("leaves text without dashes untouched", () => {
    const text = "## Задача\nНапишите пост, 150-200 слов.";
    expect(stripAiDashes(text)).toBe(text);
  });
});

describe("createDashScrubStream", () => {
  it("scrubs a dash even when the stream splits on the whitespace before it", async () => {
    const chunks = ["Вы ", `${EM} старший`, " стратег ", "по контенту"];
    const out: string[] = [];
    const stream = createDashScrubStream();
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const reading = (async () => {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        out.push(value);
      }
    })();
    for (const c of chunks) await writer.write(c);
    await writer.close();
    await reading;
    expect(out.join("")).toBe("Вы старший стратег по контенту");
  });
});

describe("scrubDashesInResponse", () => {
  it("scrubs a byte stream and keeps status and headers", async () => {
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(`## Роль\nВы ${EM} эксперт`));
        c.enqueue(enc.encode(`, 10${EN}12 лет`));
        c.close();
      },
    });
    const res = scrubDashesInResponse(
      new Response(body, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(await collect(res)).toBe("## Роль\nВы эксперт, 10-12 лет");
  });

  it("accepts string chunks too", async () => {
    const body = new ReadableStream<string>({
      start(c) {
        c.enqueue(`a ${EM} b`);
        c.close();
      },
    });
    expect(await collect(scrubDashesInResponse(new Response(body)))).toBe("a, b");
  });
});

describe("createDashScrubStream, chunk shapes", () => {
  async function run(chunks: string[]): Promise<string> {
    const out: string[] = [];
    const stream = createDashScrubStream();
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const reading = (async () => {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        out.push(value);
      }
    })();
    for (const c of chunks) await writer.write(c);
    await writer.close();
    await reading;
    return out.join("");
  }

  it("keeps the pronoun and the dash together however the split falls", async () => {
    expect(await run(["Вы", ` ${EM} эксперт`])).toBe("Вы эксперт");
    expect(await run([`Вы ${EM}`, " эксперт"])).toBe("Вы эксперт");
    expect(await run(["Вы ", EM, " эксперт"])).toBe("Вы эксперт");
  });

  it("does not stall a long unbroken run", async () => {
    const long = "x".repeat(500);
    expect(await run([long, " y"])).toBe(`${long} y`);
  });

  it("passes plain text through unchanged", async () => {
    expect(await run(["## Задача\n", "Напишите ", "пост, 150-200 слов."])).toBe(
      "## Задача\nНапишите пост, 150-200 слов.",
    );
  });
});
