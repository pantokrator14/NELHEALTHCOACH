import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4 text-center">
        © {new Date().getFullYear()} Nel Health Coach
      </div>
    </footer>
  );
};

export default Footer;