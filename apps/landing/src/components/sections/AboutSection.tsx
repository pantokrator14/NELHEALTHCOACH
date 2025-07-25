import React from 'react';

const AboutSection: React.FC = () => {
  return (
    <section className="bg-gray-100 py-20">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold mb-6">About Us</h2>
        <p className="text-lg text-gray-700">
          We are a team of dedicated professionals committed to providing the best
          services to our clients.
        </p>
      </div>
    </section>
  );
};

export default AboutSection;
