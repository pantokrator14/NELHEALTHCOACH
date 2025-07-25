import React from 'react';
import Layout from '@/components/layout/Layout';
import HeroCarousel from '@/components/sections/HeroCarousel';
import MethodSection from '@/components/sections/MethodSection';
import AboutSection from '@/components/sections/AboutSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import ContactFormSection from '@/components/sections/ContactFormSection';

const HomePage: React.FC = () => {
  return (
    <Layout>
      <HeroCarousel />
      <MethodSection />
      <AboutSection />
      <TestimonialsSection />
      <ContactFormSection />
    </Layout>
  );
};

export default HomePage;