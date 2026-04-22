import React from 'react';
import TestimonialCard from '../ui/TestimonialCard';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation();
  const testimonials = [
    {
      id: 1,
      nameKey: 'landing.testimonials.name1',
      roleKey: 'landing.testimonials.role1',
      contentKey: 'landing.testimonials.content1',
      image: "/images/testimonials/testimonial1.jpg"
    },
    {
      id: 2,
      nameKey: 'landing.testimonials.name2',
      roleKey: 'landing.testimonials.role2',
      contentKey: 'landing.testimonials.content2',
      image: "/images/testimonials/testimonial2.jpg"
    },
    {
      id: 3,
      nameKey: 'landing.testimonials.name3',
      roleKey: 'landing.testimonials.role3',
      contentKey: 'landing.testimonials.content3',
      image: "/images/testimonials/testimonial3.jpg"
    }
  ];

  return (
    <section 
      id="testimonios" 
      className="min-h-screen py-16 px-4 bg-gray-50 flex items-center"
    >
      <div className="container mx-auto max-w-6xl w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-500 text-center mb-4">{t('landing.features.testimonials.title')}</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          {t('landing.features.testimonials.subtitle')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              name={t(testimonial.nameKey)}
              role={t(testimonial.roleKey)}
              content={t(testimonial.contentKey)}
              image={testimonial.image}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;