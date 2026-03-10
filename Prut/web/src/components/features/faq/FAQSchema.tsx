import { FAQ_ITEMS } from "@/lib/faq-data";

// Google typically shows max 2-3 FAQ rich results; keep schema focused on top items
const FAQ_SCHEMA_LIMIT = 10;

export function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.slice(0, FAQ_SCHEMA_LIMIT).map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
