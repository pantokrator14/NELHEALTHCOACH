import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">NEL HEALTH COACH</h3>
            <p className="text-gray-400">
              Transformando vidas a través de la salud integral y la nutrición consciente.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Enlaces rápidos</h4>
            <ul className="space-y-2">
              {['Inicio', 'Método', 'Sobre Mí', 'Testimonios', 'Contacto'].map((item) => (
                <li key={item}>
                  <Link 
                    href={`#${item.toLowerCase().replace(' ', '-')}`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/politica-privacidad" className="text-gray-400 hover:text-white transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terminos-condiciones" className="text-gray-400 hover:text-white transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/aviso-legal" className="text-gray-400 hover:text-white transition-colors">
                  Aviso Legal
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contacto</h4>
            <address className="not-italic text-gray-400">
              <p className="mb-2">contacto@nelhealthcoach.com</p>
              <p className="mb-2">+34 123 456 789</p>
              <p>Barcelona, España</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 mb-4 md:mb-0">
            © {new Date().getFullYear()} Nel Health Coach. Todos los derechos reservados.
          </p>
          <div className="flex space-x-4">
            {['instagram', 'youtube', 'TikTok'].map((social) => (
              <a 
                key={social}
                href={`https://${social}.com/nelhealthcoach`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={`Síguenos en ${social}`}
              >
                <span className="sr-only">{social}</span>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                  {social.charAt(0).toUpperCase()}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;