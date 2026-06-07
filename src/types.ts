export interface SEOMetadata {
  h1: string;
  metaDescription: string;
  keywords: string[];
}

export interface ColoringPage {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  image: string;
  imageType: 'svg' | 'jpg' | 'png';
  prompt: string;
  createdAt: string;
  article: string;
  seo: SEOMetadata;
}
