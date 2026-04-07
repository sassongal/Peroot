import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";
import { getImageSkill, getVideoSkill } from "@/lib/engines/skills";
import type { PlatformSkill } from "@/lib/engines/skills";
import { logger } from "@/lib/logger";

// Text skills imported directly (not exported from index)
import { skill as standardSkill } from "@/lib/engines/skills/text/standard";
import { skill as researchSkill } from "@/lib/engines/skills/text/research";
import { skill as agentSkill } from "@/lib/engines/skills/text/agent";

const IMAGE_PLATFORMS = [
  'midjourney', 'dalle', 'flux', 'stable-diffusion', 'imagen', 'nanobanana', 'general'
];

const VIDEO_PLATFORMS = [
  'runway', 'kling', 'sora', 'veo', 'higgsfield', 'minimax', 'general'
];

interface SkillSummary {
  type: 'image' | 'video' | 'text';
  platform: string;
  name: string;
  exampleCount: number;
  mistakeCount: number;
  scoringCount: number;
  skill: PlatformSkill;
}

/**
 * GET /api/admin/skills
 *
 * Returns all skill files for read-only viewing in the admin panel.
 * Skills are source-controlled (git), not DB-backed — this endpoint reflects
 * the current state of compiled skill files on the server.
 */
export async function GET() {
  try {
    const { error } = await validateAdminSession();
    if (error) {
      logger.warn("[admin/skills] Unauthorized access attempt");
      return NextResponse.json(
        { error: error || "Forbidden" },
        { status: error === "Unauthorized" ? 401 : 403 }
      );
    }

    const skills: SkillSummary[] = [];

    // Load image skills
    for (const platform of IMAGE_PLATFORMS) {
      const skill = getImageSkill(platform);
      if (skill) {
        skills.push({
          type: 'image',
          platform,
          name: skill.name,
          exampleCount: skill.examples.length,
          mistakeCount: skill.mistakes?.length || 0,
          scoringCount: skill.scoringCriteria?.length || 0,
          skill,
        });
      }
    }

    // Load video skills
    for (const platform of VIDEO_PLATFORMS) {
      const skill = getVideoSkill(platform);
      if (skill) {
        skills.push({
          type: 'video',
          platform,
          name: skill.name,
          exampleCount: skill.examples.length,
          mistakeCount: skill.mistakes?.length || 0,
          scoringCount: skill.scoringCriteria?.length || 0,
          skill,
        });
      }
    }

    // Load text skills
    const textSkillsList: Array<[string, PlatformSkill]> = [
      ['standard', standardSkill],
      ['research', researchSkill],
      ['agent', agentSkill],
    ];
    for (const [platform, skill] of textSkillsList) {
      skills.push({
        type: 'text',
        platform,
        name: skill.name,
        exampleCount: skill.examples.length,
        mistakeCount: skill.mistakes?.length || 0,
        scoringCount: skill.scoringCriteria?.length || 0,
        skill,
      });
    }

    // Aggregate stats
    const stats = {
      totalSkills: skills.length,
      totalExamples: skills.reduce((sum, s) => sum + s.exampleCount, 0),
      totalMistakes: skills.reduce((sum, s) => sum + s.mistakeCount, 0),
      totalScoring: skills.reduce((sum, s) => sum + s.scoringCount, 0),
      byType: {
        image: skills.filter(s => s.type === 'image').length,
        video: skills.filter(s => s.type === 'video').length,
        text: skills.filter(s => s.type === 'text').length,
      },
    };

    return NextResponse.json({ skills, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[admin/skills] Failed to load skills:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
