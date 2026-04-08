/**
 * PromptPdfDocument — React-PDF document for exporting a single prompt.
 *
 * Hebrew/RTL handling: @react-pdf/renderer does not ship with Hebrew-capable
 * fonts. We self-host Noto Sans Hebrew under /public/fonts/ and register it
 * at module load time. Hyphenation is disabled because it breaks Hebrew words.
 *
 * Branding: the header uses the Peroot amber palette and logo so the
 * downloaded PDF looks like an on-brand artefact the user would be happy
 * to forward. The logo is loaded from /Peroot-hero.png which is an 86KB
 * transparent PNG already in /public — the larger Peroot.svg is 640KB and
 * too heavy for an export blob.
 *
 * This file is client-only (dynamic imported from the browser) and must not
 * be bundled into any server bundle.
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register Noto Sans Hebrew (regular + bold). Self-hosted so the export is
// immune to Google Fonts CDN hash rotations.
let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  Font.register({
    family: 'NotoHebrew',
    fonts: [
      {
        src: `${origin}/fonts/NotoSansHebrew-Regular.ttf`,
        fontWeight: 'normal',
      },
      {
        src: `${origin}/fonts/NotoSansHebrew-Bold.ttf`,
        fontWeight: 'bold',
      },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontRegistered = true;
}

// Brand palette — mirrors the amber accent used in the web UI.
const BRAND = {
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber900: '#78350f',
  ink: '#0f172a',
  inkSoft: '#334155',
  muted: '#64748b',
  line: '#e5e7eb',
  offWhite: '#fafafa',
};

const PAGE_PADDING = 44;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoHebrew',
    paddingTop: 0,
    paddingBottom: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
    fontSize: 11,
    lineHeight: 1.6,
    color: BRAND.ink,
    backgroundColor: '#ffffff',
  },
  // --- Header band ---
  headerBand: {
    marginHorizontal: -PAGE_PADDING, // bleed to page edges
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 28,
    paddingBottom: 22,
    backgroundColor: BRAND.amber50,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.amber400,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  brandText: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: BRAND.amber700,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 9,
    color: BRAND.amber900,
    marginTop: 1,
    opacity: 0.75,
  },
  metaCol: {
    alignItems: 'flex-end',
  },
  metaDate: {
    fontSize: 10,
    color: BRAND.amber900,
    fontWeight: 'bold',
  },
  metaUrl: {
    fontSize: 9,
    color: BRAND.amber700,
    marginTop: 2,
    opacity: 0.8,
  },
  // --- Title + score hero ---
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'right',
    lineHeight: 1.3,
    color: BRAND.ink,
  },
  scorePill: {
    backgroundColor: BRAND.amber100,
    borderWidth: 1.5,
    borderColor: BRAND.amber400,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreBig: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.amber700,
  },
  scoreSlash: {
    fontSize: 11,
    color: BRAND.amber600,
    opacity: 0.75,
  },
  scoreMax: {
    fontSize: 11,
    color: BRAND.amber600,
    opacity: 0.75,
  },
  scoreDelta: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
    backgroundColor: '#d1fae5',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 4,
  },
  // --- Section labels ---
  sectionLabel: {
    fontSize: 9,
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  // --- Before / After ---
  beforeBox: {
    backgroundColor: BRAND.offWhite,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  beforeText: {
    fontSize: 10,
    color: BRAND.muted,
    textAlign: 'right',
  },
  afterBox: {
    backgroundColor: BRAND.amber50,
    borderWidth: 1.5,
    borderColor: BRAND.amber400,
    borderRadius: 8,
    padding: 14,
    marginBottom: 22,
  },
  afterText: {
    fontSize: 12,
    color: BRAND.ink,
    textAlign: 'right',
    lineHeight: 1.7,
  },
  // --- Breakdown ---
  breakdownBox: {
    marginTop: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#fcfcfd',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3.5,
  },
  breakdownLabel: {
    fontSize: 10,
    color: BRAND.inkSoft,
    textAlign: 'right',
    flex: 1,
  },
  breakdownBar: {
    width: 120,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.line,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownScore: {
    fontSize: 9,
    color: BRAND.muted,
    width: 40,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  strengthsBox: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    paddingBottom: 8,
    marginBottom: 8,
  },
  chipLine: {
    fontSize: 9.5,
    color: BRAND.inkSoft,
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 1.5,
  },
  chipLineGood: {
    color: '#065f46',
  },
  chipLineWarn: {
    color: BRAND.amber900,
  },
  // --- Footer ---
  footer: {
    position: 'absolute',
    bottom: 22,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: BRAND.muted,
  },
  footerBrand: {
    fontSize: 8,
    color: BRAND.amber700,
    fontWeight: 'bold',
  },
});

export interface PromptPdfBreakdownDimension {
  label: string;
  score: number;
  maxScore: number;
}

export interface PromptPdfDocumentProps {
  title: string;
  original: string;
  enhanced: string;
  score?: { before: number | null; after: number } | null;
  createdAt?: string;
  breakdown?: PromptPdfBreakdownDimension[];
  strengths?: string[];
  weaknesses?: string[];
}

function barColor(pct: number): string {
  if (pct >= 70) return '#10b981'; // emerald
  if (pct >= 40) return BRAND.amber500;
  return '#ef4444'; // rose
}

function formatHeDate(iso?: string): string {
  if (!iso) return new Date().toLocaleDateString('he-IL');
  try {
    return new Date(iso).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return new Date().toLocaleDateString('he-IL');
  }
}

export function PromptPdfDocument({
  title,
  original,
  enhanced,
  score,
  createdAt,
  breakdown,
  strengths,
  weaknesses,
}: PromptPdfDocumentProps) {
  ensureFontRegistered();

  const hasBefore = original.trim().length > 0;
  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/Peroot-hero.png`
      : '/Peroot-hero.png';
  const delta =
    score && score.before != null ? score.after - score.before : null;

  return (
    <Document
      title={title || 'Peroot Prompt'}
      author="Peroot"
      subject="AI Prompt Export"
      creator="peroot.space"
    >
      <Page size="A4" style={styles.page}>
        {/* Branded header band */}
        <View style={styles.headerBand} fixed>
          <View style={styles.brandRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={styles.brandLogo} />
            <View style={styles.brandText}>
              <Text style={styles.brandName}>peroot</Text>
              <Text style={styles.brandSub}>AI Prompt Platform</Text>
            </View>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaDate}>{formatHeDate(createdAt)}</Text>
            <Text style={styles.metaUrl}>peroot.space</Text>
          </View>
        </View>

        {/* Title + score hero */}
        <View style={styles.titleRow}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          {score ? (
            <View style={styles.scorePill}>
              <Text style={styles.scoreBig}>{score.after}</Text>
              <Text style={styles.scoreSlash}>/</Text>
              <Text style={styles.scoreMax}>100</Text>
              {delta != null && delta > 0 ? (
                <Text style={styles.scoreDelta}>+{delta}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Per-dimension breakdown */}
        {breakdown && breakdown.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>פירוק הציון</Text>
            <View style={styles.breakdownBox}>
              {(strengths && strengths.length > 0) ||
              (weaknesses && weaknesses.length > 0) ? (
                <View style={styles.strengthsBox}>
                  {strengths && strengths.length > 0 ? (
                    <Text style={[styles.chipLine, styles.chipLineGood]}>
                      ✓ מה עובד: {strengths.slice(0, 3).join(' · ')}
                    </Text>
                  ) : null}
                  {weaknesses && weaknesses.length > 0 ? (
                    <Text style={[styles.chipLine, styles.chipLineWarn]}>
                      ! איך לשפר: {weaknesses.slice(0, 3).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {breakdown.map((dim, i) => {
                const pct = Math.round((dim.score / dim.maxScore) * 100);
                return (
                  <View key={i} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{dim.label}</Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: barColor(pct),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownScore}>
                      {dim.score}/{dim.maxScore}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {hasBefore ? (
          <>
            <Text style={styles.sectionLabel}>לפני</Text>
            <View style={styles.beforeBox}>
              <Text style={styles.beforeText}>{original}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>אחרי</Text>
        <View style={styles.afterBox}>
          <Text style={styles.afterText}>{enhanced}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            נוצר עם <Text style={styles.footerBrand}>Peroot</Text> ·
            peroot.space
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
