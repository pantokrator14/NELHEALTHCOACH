import React, { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * Barra de navegación responsive con:
 * - Logo a la izquierda
 * - Menú de navegación a la derecha (oculto en móviles)
 * - Menú hamburguesa para dispositivos móviles
 * - Cambio de estilo al hacer scroll
 */
const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Efecto para detectar scroll y cambiar estilo
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Elementos del menú de navegación
  const navItems = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'metodo', label: 'Método' },
    { id: 'sobre-mi', label: 'Sobre Mí' },
    { id: 'testimonios', label: 'Testimonios' },
    { id: 'contacto', label: 'Contacto' },
  ];
  // Función para scroll suave con animación
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Calcular posición con offset para el navbar
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      // Animación de scroll
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className={`fixed w-full h-auto z-50 transition-all duration-300 bg-white shadow-md py-2`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div 
          onClick={() => scrollToSection('inicio')}
          className="cursor-pointer relative"
        >
          <div className="relative h-17 w-60 pt-5">
            <Image
              src="/images/logo.png"
              alt="NELHEALTHCOACH"
              fill
              className="object-contain"
            />
          </div>
        </div>
        
        <nav className="hidden md:flex space-x-8">
          {navItems.map((item) => (
            <a 
              key={item.id} 
              onClick={() => scrollToSection(item.id)}
              className={`font-medium text-gray-700 hover:text-blue-600 transition-colors cursor-pointer`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        
        {/* Botón de menú móvil */}
        <button 
          className="md:hidden text-2xl"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >40
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      
      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white py-4 px-4">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <a 
                key={item.id} 
                onClick={() => scrollToSection(item.id)}
                className="font-medium text-gray-700 hover:text-blue-600 transition-colors py-2 cursor-pointer"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;