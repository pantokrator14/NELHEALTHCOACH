import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
    }`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="#inicio" className="text-xl font-bold text-blue-600">NEL HEALTH COACH</Link>
        
        {/* Navegación para escritorio */}
        <nav className="hidden md:flex space-x-6">
          {navItems.map((item) => (
            <Link 
              key={item.id} 
              href={`#${item.id}`}
              className="font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        {/* Botón de menú móvil */}
        <button 
          className="md:hidden text-2xl"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      
      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white py-4 px-4">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link 
                key={item.id} 
                href={`#${item.id}`}
                className="font-medium text-gray-700 hover:text-blue-600 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;