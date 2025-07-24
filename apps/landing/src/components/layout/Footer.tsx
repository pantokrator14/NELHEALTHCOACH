import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto container-padding">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-white">NEL HEALTH COACH</h3>
            <p className="text-gray-400 mb-4">
              Transformando vidas a través de la salud integral y la nutrición consciente.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Enlaces rápidos</h4>
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
            <h4 className="text-lg font-semibold mb-4 text-white">Legal</h4>
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
            <h4 className="text-lg font-semibold mb-4 text-white">Contacto</h4>
            <address className="not-italic text-gray-400">
              <p className="mb-2">contacto@nelhealthcoach.com</p>
              <p className="mb-2">+34 123 456 789</p>
              <p>Barcelona, España</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 mb-4 md:mb-0 text-center md:text-left">
            © {new Date().getFullYear()} Nel Health Coach. Todos los derechos reservados.
          </p>
          <div className="flex space-x-4">
            {[
              { name: 'instagram', icon: 'I' },
              { name: 'youtube', icon: 'Y' },
              { name: 'tiktok', icon: 'T' }
            ].map((social) => (
              <a 
                key={social.name}
                href={`https://${social.name}.com/nelhealthcoach`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={`Síguenos en ${social.name}`}
              >
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-lg">
                  {social.icon}
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