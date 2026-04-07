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

// Register Noto Sans Hebrew (regular + bold). Google Fonts serves these as
// static .ttf files under the /s/notosanshebrew/ CDN path.
let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  Font.register({
    family: 'NotoHebrew',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sqk3xXGiXd4qtoiJltutR2g.ttf',
        fontWeight: 'normal',
      },
      {
        src: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sqk3xXGiXd4qtoiJltk5T2g.ttf',
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

export interface PromptPdfDocumentProps {
  title: string;
  original: string;
  enhanced: string;
  score?: { before: number | null; after: number } | null;
  createdAt?: string;
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
