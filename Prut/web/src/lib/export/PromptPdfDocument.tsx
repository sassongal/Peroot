/**
 * PromptPdfDocument — React-PDF document for exporting a single prompt.
 *
 * Hebrew/RTL handling: @react-pdf/renderer does not ship with Hebrew-capable
 * fonts. We register Noto Sans Hebrew from Google Fonts' open-font CDN at
 * module load time. The Document enforces `direction: 'rtl'` on the body
 * Text nodes via fontFamily + text align.
 *
 * This file is client-only (dynamic imported from the browser) and must not
 * be bundled into any server bundle.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register Noto Sans Hebrew (regular + bold).
//
// Self-hosted under /public/fonts/ so the PDF export is immune to Google
// Fonts CDN hash rotations — the previous version pointed at v46 URLs
// that 404'd when Google bumped to v50, which silently broke every bold
// text in the generated PDF. Bundling locally adds ~92KB to the repo but
// guarantees forever-working export.
let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  // Absolute URL resolved against the current origin so @react-pdf's
  // internal fetch has a fully-qualified URL regardless of base path.
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
  // Disable hyphenation — breaks Hebrew words.
  Font.registerHyphenationCallback((word) => [word]);
  fontRegistered = true;
}

const PAGE_PADDING = 48;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoHebrew',
    padding: PAGE_PADDING,
    fontSize: 11,
    lineHeight: 1.6,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 14,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d97706', // amber-600 — matches peroot brand
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  meta: {
    fontSize: 9,
    color: '#888',
    textAlign: 'left',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  scoreText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 9,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'right',
  },
  beforeBox: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    opacity: 0.7,
  },
  beforeText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  afterBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 6,
    padding: 14,
    marginBottom: 20,
  },
  afterText: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'right',
    lineHeight: 1.7,
  },
  breakdownBox: {
    marginTop: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    padding: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 10,
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  breakdownBar: {
    width: 110,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#f1f1f1',
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: 5,
    borderRadius: 3,
  },
  breakdownScore: {
    fontSize: 9,
    color: '#666',
    width: 38,
    textAlign: 'left',
  },
  strengthsBox: {
    marginBottom: 10,
  },
  chipLine: {
    fontSize: 9,
    color: '#555',
    textAlign: 'right',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#999',
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
  /** Optional per-dimension breakdown — mirrors the in-app ScoreBreakdownDrawer. */
  breakdown?: PromptPdfBreakdownDimension[];
  strengths?: string[];
  weaknesses?: string[];
}

function barColor(pct: number): string {
  if (pct >= 70) return '#10b981'; // emerald
  if (pct >= 40) return '#f59e0b'; // amber
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
  const scoreLabel = score
    ? score.before != null
      ? `ציון: ${score.after}/100  (היה ${score.before})`
      : `ציון: ${score.after}/100`
    : null;

  return (
    <Document
      title={title || 'Peroot Prompt'}
      author="Peroot"
      subject="AI Prompt Export"
      creator="peroot.space"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>peroot</Text>
            <Text style={styles.brandSub}>AI Prompt Platform</Text>
          </View>
          <Text style={styles.meta}>{formatHeDate(createdAt)}</Text>
        </View>

        {title ? <Text style={styles.title}>{title}</Text> : null}

        {scoreLabel ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{scoreLabel}</Text>
          </View>
        ) : null}

        {/* Per-dimension breakdown — mirrors the in-app ScoreBreakdownDrawer
            so the printed export matches what the user sees on screen. */}
        {breakdown && breakdown.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>פירוק הציון</Text>
            <View style={styles.breakdownBox}>
              {(strengths && strengths.length > 0) || (weaknesses && weaknesses.length > 0) ? (
                <View style={styles.strengthsBox}>
                  {strengths && strengths.length > 0 ? (
                    <Text style={styles.chipLine}>
                      ✓ מה עובד: {strengths.slice(0, 3).join(' · ')}
                    </Text>
                  ) : null}
                  {weaknesses && weaknesses.length > 0 ? (
                    <Text style={styles.chipLine}>
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
                          { width: `${pct}%`, backgroundColor: barColor(pct) },
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
          <Text>peroot.space</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
