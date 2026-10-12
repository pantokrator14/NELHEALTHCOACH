import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import HeroCarousel from '@/components/sections/HeroCarousel';
import MethodSection from '@/components/sections/MethodSection';
import AboutSection from '@/components/sections/AboutSection';
import BlogPreviewSection from '@/components/sections/BlogPreviewSection';
import BookSection from '@/components/sections/BookSection';
// import TestimonialsSection from '@/components/sections/TestimonialsSection';
import ContactFormSection from '@/components/sections/ContactFormSection';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nelhealthcoach.com';

const schemaData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['Organization', 'Brand'],
      '@id': 'https://www.nelhealthcoach.com/#metodo',
      name: 'NelHealthCoach',
      legalName: 'NelHealthCoach',
      alternateName: [
        'NELHEALTHCOACH',
        'Nel Health Coach',
        'NelHealth',
        'nelhealthcoach',
      ],
      url: 'https://www.nelhealthcoach.com',
      logo: 'https://www.nelhealthcoach.com/images/logo.png',
      description: 'Plataforma de coaching de salud integral y longevidad basada en hábitos ancestrales, ritmos circadianos, luz solar, grounding y nutrición evolutiva.',
      sameAs: [
        'https://www.instagram.com/nelhealthcoach',
        'https://www.tiktok.com/@nelhealthcoachoficial',
      ],
      founder: {
        '@id': 'https://www.nelhealthcoach.com/#sobre-mi',
      },
    },
    {
      '@type': 'Person',
      '@id': 'https://www.nelhealthcoach.com/#sobre-mi',
      name: 'Manuel Martínez',
      jobTitle: 'Health Coach & Fundador',
      worksFor: {
        '@id': 'https://www.nelhealthcoach.com/#metodo',
      },
      sameAs: [
        'https://www.instagram.com/nelhealthcoach',
      ],
      knowsAbout: [
        'Alimentación ancestral y evolutiva',
        'Ritmos circadianos y cronobiología',
        'Exposición a la luz solar y salud mitocondrial',
        'Grounding y conexión con la naturaleza',
        'Entrenamiento funcional y movimiento natural',
        'Longevidad y flexibilidad metabólica',
      ],
    },
  ],
};

export default function Home() {
  const router = useRouter();
  const title = 'NelHealthCoach | Salud Ancestral, Ritmos Circadianos y Longevidad';
  const description = 'Plataforma de coaching de salud integral y longevidad basada en hábitos ancestrales, ritmos circadianos, luz solar, grounding y nutrición evolutiva con Manuel Martínez.';
  const shareImage = `${SITE_URL}/images/hero/hero4.jpg`;
  const canonicalUrl = `${SITE_URL}${router.asPath ? router.asPath.split('?')[0] : ''}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="application-name" content="NelHealthCoach" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph (Facebook, WhatsApp, LinkedIn) */}
        <meta property="og:site_name" content="NelHealthCoach" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={shareImage} />
        <meta property="og:locale" content="es_ES" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={shareImage} />

        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaData).replace(/</g, '\\u003c'),
          }}
        />
      </Head>
      <Layout>
        <HeroCarousel />
        <MethodSection />
        <AboutSection />
        <BlogPreviewSection />
        <BookSection />
        {/* <TestimonialsSection /> */}
        <ContactFormSection />
      </Layout>
    </>
  );
}
