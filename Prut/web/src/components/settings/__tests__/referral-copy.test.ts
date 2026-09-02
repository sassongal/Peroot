/**
 * The referral loop may not promise credits the ceiling takes back.
 *
 * `redeem_referral_code` adds 5 credits to both accounts, and
 * `trg_clamp_credits_to_ceiling` then clamps a free account to its daily
 * allowance, so for almost every user the grant is a no-op. Every referral
 * surface said "5 קרדיטים" anyway, including the toast a brand new user reads
 * seconds after signing up. Until the reward is redesigned, the copy states
 * what actually happens: the invite is recorded.
 *
 * The share message must also carry the full ?ref= link. The proxy captures it
 * into a cookie and the auth callback redeems it, so a link needs no further
 * action from the recipient; a bare code needs four.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "src/components/settings/SettingsReferralSection.tsx",
  "src/components/features/referral/ReferralBanner.tsx",
  "src/components/features/referral/ReferralShareCTA.tsx",
  "src/app/HomeClient.tsx",
];

describe("referral copy", () => {
  for (const file of FILES) {
    it(`${file} promises no credit reward`, () => {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      // Strip comments: the explanation of why the promise is gone naturally
      // mentions credits.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(code).not.toMatch(/קרדיטים בונוס/);
      expect(code).not.toMatch(/5 קרדיטים/);
    });
  }

  it("the share message carries the full referral link", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/settings/SettingsReferralSection.tsx"),
      "utf8",
    );
    expect(src).toMatch(/\/\?ref=\$\{code\}/);
  });
});

describe("the invitation follows the inviter's language (spec C.10)", () => {
  it("is Hebrew by default with the plain referral link", async () => {
    const { shareMessage } = await import("../SettingsReferralSection");
    const msg = shareMessage("ABC123");
    expect(msg).toContain("/?ref=ABC123");
    expect(msg).not.toContain("lang=");
    expect(msg).toMatch(/[֐-׿]/);
  });

  it("carries the language in the link so the friend starts in it too", async () => {
    const { shareMessage } = await import("../SettingsReferralSection");
    const ru = shareMessage("ABC123", "russian");
    expect(ru).toContain("/?ref=ABC123&lang=ru");
    expect(ru).toMatch(/[Ѐ-ӿ]/);
    expect(ru).not.toMatch(/[֐-׿]/);
    const ar = shareMessage("ABC123", "arabic");
    expect(ar).toContain("&lang=ar");
    expect(ar).toMatch(/[؀-ۿ]/);
    const en = shareMessage("ABC123", "english");
    expect(en).toContain("&lang=en");
    for (const m of [ru, ar, en]) expect(m).not.toMatch(/[–—]/);
  });
});
