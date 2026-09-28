import Layout from '@/components/layout/Layout';
import HeroCarousel from '@/components/sections/HeroCarousel';
import MethodSection from '@/components/sections/MethodSection';
import AboutSection from '@/components/sections/AboutSection';
import BlogPreviewSection from '@/components/sections/BlogPreviewSection';
import BookSection from '@/components/sections/BookSection';
// import TestimonialsSection from '@/components/sections/TestimonialsSection';
import ContactFormSection from '@/components/sections/ContactFormSection';

export default function Home() {
  return (
    <Layout>
      <HeroCarousel />
      <MethodSection />
      <AboutSection />
      <BlogPreviewSection />
      <BookSection />
      {/* <TestimonialsSection /> */}
      <ContactFormSection />
    </Layout>
  );
}