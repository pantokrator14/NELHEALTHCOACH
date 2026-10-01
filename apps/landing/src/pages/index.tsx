import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import HeroCarousel from '@/components/sections/HeroCarousel';
import MethodSection from '@/components/sections/MethodSection';
import AboutSection from '@/components/sections/AboutSection';
import BlogPreviewSection from '@/components/sections/BlogPreviewSection';
import BookSection from '@/components/sections/BookSection';
// import TestimonialsSection from '@/components/sections/TestimonialsSection';
import ContactFormSection from '@/components/sections/ContactFormSection';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nelhealthcoach.com';

const schemaData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'HealthAndBeautyBusiness',
      '@id': `${SITE_URL}/#business`,
      name: 'NELHEALTHCOACH',
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
      image: `${SITE_URL}/images/hero/hero4.jpg`,
      description: 'Programa y consultas de coaching en salud integral, nutrición consciente y hábitos saludables con enfoque personalizado.',
      telephone: '+1-442-342-5050',
      email: 'contact@nelhealthcoach.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '33450 Shifting Sands Trail',
        addressLocality: 'Cathedral City',
        addressRegion: 'CA',
        postalCode: '92234',
        addressCountry: 'US',
      },
      sameAs: [
        'https://facebook.com/NELHEALTHCOACH',
        'https://instagram.com/NELHEALTHCOACH',
        'https://youtube.com/NELHEALTHCOACH',
      ],
      priceRange: '$$',
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#coach`,
      name: 'Manuel Martínez',
      jobTitle: 'Health Coach Integral',
      worksFor: {
        '@id': `${SITE_URL}/#business`,
      },
      image: `${SITE_URL}/images/about/nelhealthcoach.jpeg`,
      description: 'Coach en salud integral y nutrición consciente enfocado en bienestar y transformación de hábitos de vida.',
    },
  ],
};

export default function Home() {
  const title = 'NELHEALTHCOACH | Coaching de Salud Integral y Nutrición Consciente';
  const description = 'Transforma tu vida a través de la salud integral, nutrición consciente y hábitos saludables con Manuel Martínez, Health Coach certificado.';
  const shareImage = `${SITE_URL}/images/hero/hero4.jpg`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={SITE_URL} />

        {/* Open Graph (Facebook, WhatsApp, LinkedIn) */}
        <meta property="og:site_name" content="NELHEALTHCOACH" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
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
