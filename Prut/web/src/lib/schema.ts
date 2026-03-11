const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://peroot.space";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JoyaTech",
    url: "https://joya-tech.net",
    founder: {
      "@type": "Person",
      name: "Gal Sasson",
      jobTitle: "Founder & Developer",
      sameAs: [
        "https://github.com/sassongal",
      ],
    },
    brand: {
      "@type": "Brand",
      name: "Peroot",
      url: SITE_URL,
    },
  };
}

export function articleSchema(post: {
  title: string;
  excerpt?: string | null;
  published_at?: string | null;
  author?: string | null;
  thumbnail_url?: string | null;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    datePublished: post.published_at || undefined,
    author: {
      "@type": "Person",
      name: post.author || "Gal Sasson",
      url: "https://joya-tech.net",
    },
    publisher: {
      "@type": "Organization",
      name: "JoyaTech",
      url: "https://joya-tech.net",
    },
    image: post.thumbnail_url || undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    inLanguage: "he",
    isPartOf: {
      "@type": "WebSite",
      name: "Peroot",
      url: SITE_URL,
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function softwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Peroot",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    description:
      "מחולל פרומפטים מקצועי בעברית - שדרג כל פרומפט באמצעות AI מתקדם",
    url: SITE_URL,
    inLanguage: "he",
    author: {
      "@type": "Organization",
      name: "JoyaTech",
      url: "https://joya-tech.net",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ILS",
    },
  };
}

export function faqSchema(
  items: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
