import { useEffect } from 'react';
import { ColoringPage } from '../types';

interface SEOHeaderProps {
  page?: ColoringPage;
  isLanding?: boolean;
}

export default function SEOHeader({ page, isLanding }: SEOHeaderProps) {
  useEffect(() => {
    // Determine title & meta description
    const siteName = "ぬりぬり！ぬりえ！ | 無料子供向けぬりえ広場";
    let title = siteName;
    let desc = "無料のぬりえをダウンロード！子供たちに大人気のかわいいぬりえ（動物・海の生き物・おやつ・乗り物など）がすべて無料でダウンロード・高画質印刷できます！スマホやタブレットで直接色塗りして遊ぶこともできます。";
    let keywords = ["ぬりえ 無料", "子供 ぬりえ", "知育 ぬりえ", "簡単 ぬりえ", "印刷 ぬりえ"];

    if (!isLanding && page) {
      title = `${page.seo.h1 ? page.seo.h1 : page.title} | ${siteName}`;
      desc = page.seo.metaDescription || page.description;
      keywords = page.seo.keywords || page.tags;
    }

    // Force "無料のぬりえをダウンロード" to be present in standard description
    if (!desc.includes("無料のぬりえをダウンロード")) {
      desc = "無料のぬりえをダウンロード！ " + desc;
    }

    // 1. Update Document Title
    document.title = title;

    // 2. Head Description Metatag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', desc);

    // 3. Head Keywords Metatag
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords.join(', '));

    // 4. Schema.org JSON-LD Structured Data for Advanced Google SEO Indexing
    const existingSchema = document.getElementById('seo-structured-data');
    if (existingSchema) {
      existingSchema.remove();
    }

    const schemaData = isLanding || !page ? {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "ぬりぬり！ぬりえ！",
      "alternateName": "Nurinuri Nurie",
      "url": window.location.origin,
      "description": desc,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${window.location.origin}/?search={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    } : {
      "@context": "https://schema.org",
      "@graph": [
         {
          "@type": "Article",
          "@id": `${window.location.href}#article`,
          "isPartOf": {
            "@type": "WebPage",
            "@id": window.location.href,
            "url": window.location.href,
            "name": page.title
          },
          "headline": page.seo.h1 || page.title,
          "description": desc,
          "image": page.image.startsWith('http') ? page.image : `${window.location.origin}${page.image}`,
          "datePublished": page.createdAt,
          "dateModified": page.createdAt,
          "author": {
            "@type": "Organization",
            "name": "ぬりぬり！ぬりえ！編集部"
          },
          "publisher": {
            "@type": "Organization",
            "name": "ぬりぬり！ぬりえ！"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": window.location.href
          }
        },
        {
          "@type": "ImageObject",
          "@id": `${window.location.href}#primaryimage`,
          "url": page.image.startsWith('http') ? page.image : `${window.location.origin}${page.image}`,
          "caption": page.title,
          "description": page.description
        }
      ]
    };

    const script = document.createElement('script');
    script.id = 'seo-structured-data';
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      // clean up schema on unmount
      const element = document.getElementById('seo-structured-data');
      if (element) {
        element.remove();
      }
    };
  }, [page, isLanding]);

  return null; // Side-effect only component
}
