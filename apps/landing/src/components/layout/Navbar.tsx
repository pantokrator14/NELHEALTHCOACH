import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
    }`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="text-xl font-bold text-blue-600">NEL HEALTH COACH</div>
        
        <nav className="hidden md:flex space-x-8">
          {['Inicio', 'Método', 'Sobre Mí', 'Testimonios', 'Contacto'].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="font-medium hover:text-blue-600 transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>
        
        <button className="md:hidden text-xl">☰</button>
      </div>
    </header>
  );
};

export default Navbar;