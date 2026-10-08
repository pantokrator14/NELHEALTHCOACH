/**
 * Contenido de las páginas legales de la landing (Política de Privacidad,
 * Términos y Condiciones y Aviso Legal) en los 6 idiomas de la plataforma.
 *
 * Estructura: legalContent[pageKey][lang]
 *   pageKey: 'privacy' | 'terms' | 'notice'
 *   lang: 'es' | 'en' | 'fr' | 'it' | 'pt' | 'de'
 */

export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  sections: LegalSection[];
}

export type LegalPageKey = 'privacy' | 'terms' | 'notice' | 'refunds' | 'cookies';

const es: Record<LegalPageKey, LegalDocument> = {
  /* ==================== POLÍTICA DE PRIVACIDAD (ES) ==================== */
  privacy: {
    title: 'Política de Privacidad',
    updated: 'Última actualización: 1 de agosto de 2026',
    sections: [
      {
        title: '1. Responsable del tratamiento',
        paragraphs: [
          'NELHEALTHCOACH LLC (en adelante, "NELHEALTHCOACH", "nosotros" o "la Plataforma"), con domicilio en 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos, es la responsable del tratamiento de los datos personales recogidos a través del sitio web https://nelhealthcoach.com y de los servicios asociados.',
          'Para cualquier cuestión relativa a esta Política de Privacidad o al tratamiento de tus datos, puedes contactarnos en contact@nelhealthcoach.com o llamando al +1 (442) 342-5050 (español) o +1 (760) 980-5880 (inglés).'
        ]
      },
      {
        title: '2. Datos que recogemos',
        paragraphs: [
          'Recogemos los siguientes tipos de datos personales:'
        ],
        bullets: [
          'Datos de contacto: nombre, dirección de correo electrónico y, en su caso, número de teléfono.',
          'Datos del formulario de salud: información sobre tu estado de salud, historial médico, hábitos alimenticios, medidas corporales, objetivos y estilo de vida que proporcionas voluntariamente al completar el formulario.',
          'Datos de pago: procesados de forma segura por nuestro proveedor de pagos Stripe. No almacenamos números de tarjeta de crédito ni datos bancarios completos en nuestros servidores.',
          'Datos de uso: información sobre cómo interactúas con la Plataforma (páginas visitadas, tiempo de uso, preferencias de idioma).',
          'Datos de comunicación: mensajes e información que nos envías a través del formulario de contacto o del correo electrónico.'
        ]
      },
      {
        title: '3. Finalidades del tratamiento',
        paragraphs: [
          'Tratamos tus datos personales con las siguientes finalidades:'
        ],
        bullets: [
          'Prestar el servicio de coaching y asesoramiento nutricional contratado, incluida la generación de recomendaciones personalizadas.',
          'Procesar pagos y gestionar las suscripciones a través de Stripe.',
          'Comunicarnos contigo sobre tu programa, sesiones y novedades del servicio.',
          'Analizar los datos del formulario de salud mediante herramientas de inteligencia artificial para generar recomendaciones personalizadas, siempre con tu consentimiento previo.',
          'Cumplir con nuestras obligaciones legales y contractuales.',
          'Mejorar la Plataforma, su seguridad y la experiencia de usuario.'
        ]
      },
      {
        title: '4. Base legal del tratamiento',
        paragraphs: [
          'Tratamos tus datos personales con las siguientes bases legales:',
          '· Ejecución del contrato: el tratamiento es necesario para prestar los servicios contratados.',
          '· Consentimiento: para el tratamiento de datos de salud y el uso de inteligencia artificial, así como para el envío de comunicaciones comerciales cuando corresponda.',
          '· Interés legítimo: para la mejora de la Plataforma, la prevención del fraude y la seguridad de los servicios.',
          '· Obligación legal: cuando la ley aplicable nos exija conservar o comunicar determinados datos.'
        ]
      },
      {
        title: '5. Tratamiento de datos de salud',
        paragraphs: [
          'Los datos relativos a tu salud son categorías especiales de datos. Solo los tratamos con tu consentimiento explícito, con la única finalidad de personalizar tu programa de coaching.',
          'Estos datos son accesibles únicamente para el asesor que presta el servicio, el personal autorizado de la Plataforma y los sistemas de inteligencia artificial que generan las recomendaciones. Nunca se utilizan para fines de publicidad ni se ceden a terceros sin tu consentimiento.',
          'El asesor está obligado contractualmente a tratar tus datos de salud con la máxima confidencialidad y a no utilizarlos para fines distintos de la prestación del servicio.'
        ]
      },
      {
        title: '6. Uso de inteligencia artificial y garantía de no entrenamiento',
        paragraphs: [
          'La Plataforma utiliza modelos de lenguaje e inteligencia artificial especializados (principalmente DeepSeek y Google Gemini como respaldo tecnológico, y Deepgram para transcripciones de sesiones autorizadas) para analizar de forma segura tu perfil de bienestar y generar borradores de recomendaciones nutricionales.',
          'Garantía contractual de no entrenamiento: Requerimos formalmente que estos proveedores traten los datos bajo cifrado seguro y PROHIBIMOS de forma estricta que tus datos de salud sean utilizados para el entrenamiento, ajuste o aprendizaje de modelos generales de IA.',
          'Supervisión humana obligatoria: Toda recomendación preliminar elaborada con asistencia de IA es revisada, validada y ajustada personalmente por tu asesor humano antes de ser entregada. No se toman decisiones automatizadas que produzcan efectos jurídicos o sanitarios vinculantes sobre ti.',
          'Puedes solicitar en cualquier momento información sobre el uso de estos sistemas en tu plan, así como oponerte o requerir una revisión humana integral.'
        ]
      },
      {
        title: '7. Destinatarios de los datos',
        paragraphs: [
          'Compartimos tus datos personales exclusivamente con:'
        ],
        bullets: [
          'Proveedores de pago (Stripe), únicamente para procesar las transacciones.',
          'Proveedores de videollamadas (Google Meet, Zoom), para la realización de las sesiones.',
          'Proveedores de servicios de hosting, correo electrónico, análisis y herramientas de inteligencia artificial, que actúan como encargados del tratamiento.',
          'Autoridades públicas y judiciales, cuando exista obligación legal.'
        ],
      },
      {
        title: '8. Transferencias internacionales y salvaguardas (RGPD y DPF)',
        paragraphs: [
          'La Plataforma opera principalmente desde Estados Unidos y tus datos son procesados y almacenados en infraestructuras seguras ubicadas en Estados Unidos u otros países donde nuestros encargados del tratamiento prestan servicios.',
          'Para transferencias desde el Espacio Económico Europeo (EEE), Suiza o el Reino Unido hacia Estados Unidos, NELHEALTHCOACH LLC implementa las Cláusulas Contractuales Tipo (SCCs) adoptadas por la Comisión Europea (Decisión de Ejecución (UE) 2021/914) y se alinea con los principios del Marco de Privacidad de Datos UE-EE. UU. (EU-U.S. Data Privacy Framework) para asegurar un nivel de protección equivalente al del RGPD.'
        ]
      },
      {
        title: '9. Conservación y plazos de retención de datos',
        paragraphs: [
          'Conservamos tus datos personales únicamente durante el tiempo estrictamente necesario para cumplir las finalidades pactadas y los periodos legalmente exigidos:',
          'Una vez transcurridos los plazos legales, los datos se suprimen de forma segura o se someten a anonimización irreversible para fines estadísticos agregados.'
        ],
        bullets: [
          'Datos de cuenta y perfil de salud: mientras tu cuenta y suscripción permanezcan activas y hasta 12 meses después de la última sesión para facilitar reanudaciones.',
          'Registros de facturación y transacciones: entre 5 y 7 años conforme a las obligaciones fiscales y tributarias del Servicio de Impuestos Internos de EE. UU. (IRS) y normativa mercantil.',
          'Registros y evidencias de consentimiento: durante 3 años tras la finalización de la relación contractual para la atención de posibles responsabilidades legales y regulatorias.'
        ],
      },
      {
        title: '10. Seguridad de los datos',
        paragraphs: [
          'Implementamos medidas técnicas y organizativas para proteger tus datos personales, incluyendo cifrado de datos en tránsito (TLS) y en reposo (AES-256), control de acceso autenticado y restringido por roles, monitorización de la actividad y copias de seguridad.',
          'No obstante, ningún sistema de transmisión o almacenamiento de datos es completamente seguro. Hacemos todos los esfuerzos razonables para proteger tu información.'
        ]
      },
      {
        title: '11. Tus derechos (RGPD y CCPA/CPRA de California)',
        paragraphs: [
          'De conformidad con el RGPD y las leyes de privacidad aplicables, dispones de los siguientes derechos:',
          'Aviso para Residentes de California (CCPA/CPRA & Shine the Light): Bajo la Ley de Privacidad del Consumidor de California y la ley "Shine the Light" (Cal. Civ. Code § 1798.83):',
        ],
        bullets: [
          'Acceso, Rectificación y Supresión de tus datos personales.',
          'Limitación del tratamiento y portabilidad de datos.',
          'Retirada del consentimiento en cualquier momento sin efectos retroactivos.',
          'Derecho a no ser discriminado: NELHEALTHCOACH no discrimina, altera precios ni niega servicios a ningún usuario por ejercer sus derechos de privacidad.',
          'NO VENTA NI COMPARTICIÓN: NELHEALTHCOACH LLC declara expresamente que NO vende tus datos personales ni tus datos sensibles de salud a terceros, ni los comparte para publicidad conductual entre contextos.',
          'Derecho a limitar el uso de datos sensibles únicamente a la prestación del servicio educativo y de bienestar solicitado.',
          'Presentar una reclamación ante la California Privacy Protection Agency (CPPA) o ante la autoridad de control de protección de datos de tu residencia en la UE.'
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'La Plataforma utiliza cookies técnicas imprescindibles para el funcionamiento del sitio y cookies de preferencias para recordar tu idioma y configuración.',
          'Puedes configurar tu navegador para rechazar o eliminar cookies en cualquier momento; sin embargo, algunas funcionalidades del sitio podrían verse afectadas.'
        ]
      },
      {
        title: '13. Menores de edad',
        paragraphs: [
          'Los servicios de la Plataforma están dirigidos a personas mayores de 18 años. Si el servicio se presta a un menor de edad, el formulario deberá ser completado y autorizado por su padre, madre o tutor legal, conforme a lo establecido en el contrato de servicios.'
        ]
      },
      {
        title: '14. Cambios en esta Política',
        paragraphs: [
          'Podemos actualizar esta Política de Privacidad en cualquier momento. La versión vigente se publicará siempre en esta página con su fecha de actualización.',
          'Si realizamos cambios significativos, te lo notificaremos a través de la Plataforma o por correo electrónico antes de que entren en vigor.'
        ]
      },
      {
        title: '15. Contacto',
        paragraphs: [
          'Si tienes preguntas sobre esta Política de Privacidad o deseas ejercer tus derechos, contáctanos en contact@nelhealthcoach.com, llamando al +1 (442) 342-5050 o +1 (760) 980-5880, o escribiendo a NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.'
        ]
      }
    ]
  },

  /* ==================== TÉRMINOS Y CONDICIONES (ES) ==================== */
  terms: {
    title: 'Términos y Condiciones',
    updated: 'Última actualización: 1 de agosto de 2026',
    sections: [
      {
        title: '1. Aceptación de los Términos',
        paragraphs: [
          'Estos Términos y Condiciones regulan el acceso y uso del sitio web https://nelhealthcoach.com y de la plataforma NELHEALTHCOACH (en adelante, "la Plataforma"), operada por NELHEALTHCOACH LLC, con domicilio en 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.',
          'Al acceder a la Plataforma o utilizar cualquiera de sus servicios, aceptas estos Términos y Condiciones en su versión vigente. Si no estás de acuerdo, no utilices la Plataforma.'
        ]
      },
      {
        title: '2. Descripción del servicio',
        paragraphs: [
          'La Plataforma conecta a clientes con asesores independientes de salud y nutrición (en adelante, "Asesores") para la prestación de servicios de coaching personalizado, que incluyen la elaboración de planes de alimentación, ejercicio y hábitos saludables.',
          'La Plataforma pone a disposición las herramientas tecnológicas necesarias: formulario de salud, generación de recomendaciones mediante inteligencia artificial, gestión de pagos y reserva de sesiones.',
          'Los Asesores son profesionales independientes y no empleados de NELHEALTHCOACH. Cada Asesor es responsable de los servicios que presta y del cumplimiento de las obligaciones de su contrato.'
        ]
      },
      {
        title: '3. Registro y cuentas',
        paragraphs: [
          'Para contratar los servicios, los clientes deben completar el formulario de salud y aceptar el contrato de servicios aplicable. Los Asesores deben registrarse como profesionales y aceptar su contrato de asesoría.',
          'Te comprometes a proporcionar información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades realizadas con tu cuenta.'
        ]
      },
      {
        title: '4. Uso aceptable',
        paragraphs: [
          'Al utilizar la Plataforma te comprometes a no:'
        ],
        bullets: [
          'Utilizarla para fines ilícitos, fraudulentos o contrarios a la buena fe.',
          'Intentar acceder sin autorización a sistemas, cuentas o datos de terceros.',
          'Reproducir, duplicar, copiar o explotar comercialmente cualquier parte de la Plataforma sin autorización.',
          'Introducir virus, malware o cualquier tecnología que pueda dañar la Plataforma o a otros usuarios.',
          'Suplantar la identidad de otras personas o proporcionar información falsa.'
        ]
      },
      {
        title: '5. Los servicios no constituyen consejo médico',
        paragraphs: [
          'Los servicios ofrecidos a través de la Plataforma son de coaching nutricional y de bienestar y NO constituyen diagnóstico, tratamiento, cura o prevención de ninguna enfermedad ni consejo médico profesional.',
          'Si padeces una condición médica, tomas medicación o estás embarazada, consulta siempre con tu médico o profesional de la salud antes de iniciar cualquier programa. En caso de emergencia médica, contacta con los servicios de emergencia de tu localidad.'
        ]
      },
      {
        title: '6. Pagos',
        paragraphs: [
          'Los precios de los servicios se muestran antes de confirmar el pago. Los pagos se procesan a través de la pasarela de pagos Stripe, sujeta a sus propios términos y condiciones.',
          'El precio aplicable será el publicado por el Asesor o, en su defecto, el precio estándar de la Plataforma. Al confirmar el pago autorizas el cargo del importe correspondiente a tu plan.',
          'Los reembolsos y cancelaciones se rigen por el contrato de servicios aplicable y por la ley vigente.'
        ]
      },
      {
        title: '7. Sesiones',
        paragraphs: [
          'Las sesiones de coaching tienen una duración de 60 minutos y se realizan mensualmente mediante videollamada (Google Meet o Zoom), salvo acuerdo distinto con el Asesor.',
          'Las sesiones pueden cancelarse o reagendarse con al menos 24 horas de antelación, sin cargo.'
        ]
      },
      {
        title: '8. Propiedad intelectual',
        paragraphs: [
          'Todos los contenidos de la Plataforma (textos, gráficos, logotipos, imágenes, software y materiales) son propiedad de NELHEALTHCOACH o de sus licenciantes y están protegidos por las leyes de propiedad intelectual aplicables.',
          'La información que proporcionas a través del formulario de salud es de tu propiedad. La Plataforma y el Asesor la utilizan únicamente para prestar el servicio, conforme a la Política de Privacidad.'
        ]
      },
      {
        title: '9. Limitación de responsabilidad y renuncia a daños',
        paragraphs: [
          'La Plataforma se ofrece "tal cual" (AS IS) y "según disponibilidad". NELHEALTHCOACH no garantiza que el servicio sea ininterrumpido o totalmente libre de errores.',
          'En la medida máxima permitida por la ley aplicable: (A) NELHEALTHCOACH no será responsable por daños indirectos, incidentales, punitivos, especiales o consecuentes ni por pérdida de beneficios o datos; y (B) la responsabilidad total acumulada frente a ti por cualquier reclamación se limita a la cantidad mayor entre cincuenta dólares estadounidenses (0 USD) o el importe efectivamente abonado por ti a la Plataforma en los seis (6) meses anteriores al hecho generador.',
          'Los servicios prestados por los Asesores independientes son responsabilidad profesional exclusiva de cada Asesor.'
        ]
      },
      {
        title: '10. Suspensión y terminación',
        paragraphs: [
          'NELHEALTHCOACH puede suspender o cancelar el acceso a la Plataforma por incumplimiento de estos Términos, fraude o conducta que ponga en riesgo a otros usuarios, sin perjuicio de las demás acciones legales que correspondan.',
          'Las cláusulas relativas a propiedad intelectual, limitación de responsabilidad, ley aplicable y resolución de controversias subsistirán tras la terminación.'
        ]
      },
      {
        title: '11. Ley aplicable, arbitraje vinculante individual y renuncia a acciones colectivas',
        paragraphs: [
          'Estos Términos se rigen e interpretan conforme a las leyes del Estado de California, Estados Unidos, sin dar efecto a sus principios sobre conflicto de leyes. Los consumidores residentes en el EEE conservan las protecciones obligatorias de sus legislaciones nacionales.',
          'Resolución informal previa: Las partes se comprometen a intentar resolver cualquier controversia de buena fe mediante notificación formal y reunión informal durante un plazo mínimo de cuarenta y cinco (45) días antes de iniciar cualquier procedimiento arbitral.',
          'Arbitraje vinculante individual: Toda controversia no resuelta se someterá a arbitraje individual vinculante administrado por JAMS bajo sus Reglas Aplicables, con sede en el Condado de Riverside, California. Las partes renuncian expresamente al derecho a juicio con jurado.',
          'RENUNCIA A DEMANDAS COLECTIVAS (CLASS ACTION WAIVER): Todas las disputas deben promoverse a título estrictamente individual. Ni tú ni NELHEALTHCOACH podrán actuar como demandantes o miembros de clase en ningún procedimiento colectivo, representativo o de acción grupal.',
          'Derecho de exclusión (Opt-Out): Puedes optar por no quedar vinculado por esta cláusula de arbitraje notificándolo por escrito a contact@nelhealthcoach.com dentro de los treinta (30) días siguientes a la aceptación inicial de estos Términos.',
          'Aviso a los Consumidores de California (Cal. Civ. Code § 1789.3): Conforme al Código Civil de California, los usuarios pueden comunicarse con la Complaint Assistance Unit de la Division of Consumer Services del California Department of Consumer Affairs en 1625 N. Market Blvd., Suite N112, Sacramento, CA 95834, o por teléfono al (800) 952-5210.'
        ]
      },
      {
        title: '12. Modificaciones',
        paragraphs: [
          'Podemos modificar estos Términos y Condiciones en cualquier momento. La versión vigente se publicará en esta página con su fecha de actualización.',
          'El uso continuado de la Plataforma tras la publicación de cambios implica la aceptación de los nuevos Términos.'
        ]
      },
      {
        title: '13. Contacto',
        paragraphs: [
          'Para cualquier consulta sobre estos Términos y Condiciones, contáctanos en contact@nelhealthcoach.com o en NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.'
        ]
      }
    ]
  },

  /* ==================== AVISO LEGAL (ES) ==================== */
  notice: {
    title: 'Aviso Legal',
    updated: 'Última actualización: 1 de agosto de 2026',
    sections: [
      {
        title: '1. Titular del sitio web',
        paragraphs: [
          'En cumplimiento de la legislación aplicable, se informa de que el sitio web https://nelhealthcoach.com es titularidad de NELHEALTHCOACH LLC, sociedad constituida en el Estado de California, Estados Unidos, con domicilio en 33450 Shifting Sands Trail, Cathedral City, CA 92234.',
          'Datos de contacto: contact@nelhealthcoach.com · +1 (442) 342-5050 · +1 (760) 980-5880.'
        ]
      },
      {
        title: '2. Objeto',
        paragraphs: [
          'El presente Aviso Legal regula el acceso y uso del sitio web, que tiene como finalidad presentar los servicios de coaching de salud y nutrición de la Plataforma y permitir la contratación de los mismos.'
        ]
      },
      {
        title: '3. Propiedad intelectual e industrial',
        paragraphs: [
          'El nombre "NELHEALTHCOACH", el logotipo, los textos, las imágenes, los gráficos, la estructura y todos los contenidos del sitio web están protegidos por derechos de propiedad intelectual e industrial, titularidad de NELHEALTHCOACH LLC.',
          'Queda prohibida la reproducción, distribución o transformación de los contenidos sin autorización expresa y por escrito de su titular.'
        ]
      },
      {
        title: '4. Exclusión de responsabilidad',
        paragraphs: [
          'NELHEALTHCOACH no se hace responsable del mal uso de los contenidos del sitio web ni de las consecuencias derivadas de la aplicación de los mismos, que tienen carácter informativo.',
          'Los contenidos del sitio web no constituyen consejo médico profesional. Ante cualquier problema de salud, consulta con un profesional sanitario.',
          'NELHEALTHCOACH no garantiza la disponibilidad continua del sitio web ni la ausencia de errores, virus o daños derivados del acceso al mismo.'
        ]
      },
      {
        title: '5. Enlaces externos',
        paragraphs: [
          'El sitio web puede contener enlaces a sitios de terceros (Stripe, Google Meet, Zoom, redes sociales). NELHEALTHCOACH no controla ni asume responsabilidad alguna por el contenido, políticas o prácticas de dichos sitios.'
        ]
      },
      {
        title: '6. Legislación aplicable',
        paragraphs: [
          'El presente Aviso Legal se rige por las leyes del Estado de California, Estados Unidos. Para la resolución de cualquier controversia, las partes se someten a la jurisdicción de los tribunales del Estado de California.'
        ]
      },
      {
        title: '7. Contacto',
        paragraphs: [
          'Si tienes dudas sobre este Aviso Legal, puedes escribirnos a contact@nelhealthcoach.com o a NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.'
        ]
      }
    ]
  }
,

  refunds: {
    title: 'Política de Reembolsos y Desistimiento',
    updated: 'Última actualización: 1 de octubre de 2026',
    sections: [
      {
        title: '1. Derecho Legal de Desistimiento (14 días)',
        paragraphs: [
          'De conformidad con la normativa de protección a los consumidores (Directiva 2011/83/UE y Real Decreto Legislativo 1/2007 en España), el usuario que ostente la condición de consumidor tiene derecho a desistir del contrato en un plazo de 14 días naturales a partir de la contratación sin necesidad de justificación.'
        ]
      },
      {
        title: '2. Excepción al Desistimiento en Servicios Digitales Personalizados',
        paragraphs: [
          'El derecho de desistimiento decae y no es aplicable una vez que el servicio ha comenzado a prestarse con el consentimiento expreso y previo del usuario (Art. 103 letras a y m del TRLGDCU).',
          'En consecuencia, una vez que se genera su plan nutricional o de suplementación personalizado, se emite el informe analítico asistido por IA o se realiza la primera videollamada 1 a 1 de coaching, se entiende que el servicio ha sido ejecutado o iniciado con su consentimiento, extinguiéndose el derecho de desistimiento.'
        ]
      },
      {
        title: '3. Suscripciones Recurrentes y Cancelación Transparente',
        paragraphs: [
          'Para los planes o membresías mensuales recurrentes, el usuario puede cancelar la renovación automática en cualquier momento antes del vencimiento del ciclo en curso, directamente desde su panel de control o enviando un correo a soporte@nelhealthcoach.com.',
          'La cancelación no conlleva penalización alguna y detiene cualquier cargo futuro. El usuario conservará el acceso a su portal hasta el término del ciclo mensual ya pagado.'
        ]
      },
      {
        title: '4. Supuestos de Reembolso Aprobados',
        paragraphs: [
          'Se emitirán reembolsos íntegros exclusivamente bajo supuestos de cobro duplicado verificado por error técnico o imposibilidad técnica de la plataforma imputable a NelHealthCoach.',
          'Los reembolsos se procesan a través de Stripe al mismo método de pago original en un plazo de 5 a 10 días hábiles.'
        ]
      },
      {
        title: '5. Atención y Solicitudes',
        paragraphs: [
          'Para cualquier gestión o consulta relativa a pagos o facturación, comuníquese con soporte@nelhealthcoach.com indicando su correo de registro y número de transacción.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Política de Cookies y Rastreo',
    updated: 'Última actualización: 1 de octubre de 2026',
    sections: [
      {
        title: '1. ¿Qué son las Cookies y Almacenamiento Local?',
        paragraphs: [
          'Este sitio web utiliza cookies y tecnologías de almacenamiento local del navegador (como localStorage y sessionStorage) para asegurar el funcionamiento de la plataforma, preservar sus preferencias de idioma y sesión, y ofrecer métricas analíticas agregadas.',
          'Cumplimos estrictamente con el Reglamento General de Protección de Datos (RGPD) y la Directiva ePrivacy (Directiva 2002/58/CE).'
        ]
      },
      {
        title: '2. Inventario de Cookies y Tecnologías Empleadas',
        paragraphs: [
          'A continuación se detallan las tecnologías de almacenamiento implementadas:'
        ],
        bullets: [
          'nhc_cookie_consent (Técnica / Propia): Registra su elección de consentimiento de cookies. Duración: 180 días.',
          'i18nextLng (Técnica / Propia): Almacena la preferencia del idioma seleccionado (es, en, fr, it, pt, de). Duración: 7 días.',
          'nel_ephemeral_visitor_id (Técnica / Sesión): Token aleatorio temporal en sessionStorage para rate limiting y mitigación de ciberataques. No rastrea entre sesiones. Duración: Sesión.',
          'nhc_consent_analytics (Técnica / Propia): Almacena si ha otorgado o denegado el permiso para métricas analíticas. Duración: 180 días.',
          'nel_fp_visitor_id (Analítica / Huella de Navegación): Solo se activa si presiona "Aceptar todas" en el banner. Permite métricas de uso y prevención de abusos reiterados. Duración: 180 días.'
        ]
      },
      {
        title: '3. Revocación y Configuración del Consentimiento',
        paragraphs: [
          'Usted tiene pleno control sobre sus datos. Puede modificar o revocar su consentimiento en cualquier momento eliminando los datos de navegación en las opciones de su navegador web, o a través del botón de configuración de privacidad disponible en el pie de página de la plataforma.'
        ]
      }
    ]
  }
};

const en: Record<LegalPageKey, LegalDocument> = {
  /* ==================== PRIVACY POLICY (EN) ==================== */
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: August 1, 2026',
    sections: [
      {
        title: '1. Data Controller',
        paragraphs: [
          'NELHEALTHCOACH LLC ("NELHEALTHCOACH", "we" or "the Platform"), with registered address at 33450 Shifting Sands Trail, Cathedral City, CA 92234, United States, is the controller of the personal data collected through the website https://nelhealthcoach.com and its associated services.',
          'For any question regarding this Privacy Policy or the processing of your data, you can contact us at contact@nelhealthcoach.com or call +1 (442) 342-5050 (Spanish) or +1 (760) 980-5880 (English).'
        ]
      },
      {
        title: '2. Data We Collect',
        paragraphs: [
          'We collect the following categories of personal data:'
        ],
        bullets: [
          'Contact data: name, email address and, where applicable, phone number.',
          'Health form data: information about your health status, medical history, eating habits, body measurements, goals and lifestyle that you voluntarily provide when completing the form.',
          'Payment data: processed securely by our payment provider Stripe. We do not store full credit card numbers or bank details on our servers.',
          'Usage data: information about how you interact with the Platform (pages visited, time of use, language preferences).',
          'Communication data: messages and information you send us through the contact form or by email.'
        ]
      },
      {
        title: '3. Purposes of Processing',
        paragraphs: [
          'We process your personal data for the following purposes:'
        ],
        bullets: [
          'Providing the coaching and nutritional advisory service you contracted, including the generation of personalized recommendations.',
          'Processing payments and managing subscriptions through Stripe.',
          'Communicating with you about your program, sessions and service updates.',
          'Analyzing health form data with artificial intelligence tools to generate personalized recommendations, always with your prior consent.',
          'Complying with our legal and contractual obligations.',
          'Improving the Platform, its security and the user experience.'
        ]
      },
      {
        title: '4. Legal Basis for Processing',
        paragraphs: [
          'We process your personal data on the following legal bases:',
          '· Contract performance: processing is necessary to provide the contracted services.',
          '· Consent: for the processing of health data and the use of artificial intelligence, as well as for sending commercial communications where applicable.',
          '· Legitimate interest: to improve the Platform, prevent fraud and ensure service security.',
          '· Legal obligation: when applicable law requires us to retain or disclose certain data.'
        ]
      },
      {
        title: '5. Health Data Processing',
        paragraphs: [
          'Data relating to your health constitutes special category data. We only process it with your explicit consent, solely for the purpose of personalizing your coaching program.',
          'This data is accessible only to the advisor providing the service, authorized Platform personnel and the artificial intelligence systems that generate recommendations. It is never used for advertising purposes nor shared with third parties without your consent.',
          'The advisor is contractually bound to process your health data with the highest confidentiality and not to use it for purposes other than providing the service.'
        ]
      },
      {
        title: '6. Use of Artificial Intelligence',
        paragraphs: [
          'The Platform uses artificial intelligence (AI) systems to analyze the information in your health form and generate personalized nutrition and wellness recommendations.',
          'These systems process data automatically under our supervision. Recommendations are reviewed by the advisor before delivery, and no automated decisions with significant legal effects are made about you without human intervention.',
          'You may request information about the use of AI in your process at any time, as well as object to it or request human review of decisions based on these systems.'
        ]
      },
      {
        title: '7. Data Recipients',
        paragraphs: [
          'We share your personal data exclusively with:'
        ],
        bullets: [
          'Payment providers (Stripe), solely to process transactions.',
          'Video call providers (Google Meet, Zoom), to hold sessions.',
          'Hosting, email, analytics and artificial intelligence service providers, acting as data processors.',
          'Public and judicial authorities, when required by law.'
        ],
      },
      {
        title: '8. International Transfers',
        paragraphs: [
          'The Platform primarily operates from the United States and your data may be stored and processed on servers located in the United States or other countries.',
          'When we transfer data to third parties outside your country of residence, we adopt the appropriate safeguards required by applicable law, including the EU Standard Contractual Clauses where applicable.'
        ]
      },
      {
        title: '9. Data Retention',
        paragraphs: [
          'We retain your personal data only for as long as necessary to fulfill the purposes described in this Policy, and for the periods required by applicable law.',
          'When the contractual relationship ends, health form data is deleted or anonymized, unless the law requires its retention or there is an ongoing legal proceeding.'
        ]
      },
      {
        title: '10. Data Security',
        paragraphs: [
          'We implement technical and organizational measures to protect your personal data, including encryption of data in transit (TLS) and at rest (AES-256), authenticated role-based access control, activity monitoring and backups.',
          'However, no data transmission or storage system is completely secure. We make all reasonable efforts to protect your information.'
        ]
      },
      {
        title: '11. Your Rights',
        paragraphs: [
          'You have the right to:'
        ],
        bullets: [
          'Access your personal data and obtain a copy of it.',
          'Rectify inaccurate or incomplete data.',
          'Request deletion of your data when it is no longer necessary.',
          'Object to processing or request its restriction.',
          'Request data portability.',
          'Withdraw your consent at any time, without affecting the lawfulness of prior processing.',
          'Lodge a complaint with the competent data protection authority (in California, the California Privacy Protection Agency; in the European Union, the authority of your country of residence).'
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'The Platform uses strictly necessary technical cookies for the site to function and preference cookies to remember your language and settings.',
          'You can configure your browser to reject or delete cookies at any time; however, some site features may be affected.'
        ]
      },
      {
        title: '13. Minors',
        paragraphs: [
          'The Platform services are directed at persons over 18 years of age. If the service is provided to a minor, the form must be completed and authorized by their parent or legal guardian, in accordance with the service contract.'
        ]
      },
      {
        title: '14. Changes to this Policy',
        paragraphs: [
          'We may update this Privacy Policy at any time. The current version will always be published on this page with its update date.',
          'If we make significant changes, we will notify you through the Platform or by email before they take effect.'
        ]
      },
      {
        title: '15. Contact',
        paragraphs: [
          'If you have questions about this Privacy Policy or wish to exercise your rights, contact us at contact@nelhealthcoach.com, call +1 (442) 342-5050 or +1 (760) 980-5880, or write to NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, United States.'
        ]
      }
    ]
  },

  /* ==================== TERMS AND CONDITIONS (EN) ==================== */
  terms: {
    title: 'Terms and Conditions',
    updated: 'Last updated: August 1, 2026',
    sections: [
      {
        title: '1. Acceptance of Terms',
        paragraphs: [
          'These Terms and Conditions govern access to and use of the website https://nelhealthcoach.com and the NELHEALTHCOACH platform (the "Platform"), operated by NELHEALTHCOACH LLC, with registered address at 33450 Shifting Sands Trail, Cathedral City, CA 92234, United States.',
          'By accessing the Platform or using any of its services, you accept these Terms and Conditions in their current version. If you do not agree, do not use the Platform.'
        ]
      },
      {
        title: '2. Description of Services',
        paragraphs: [
          'The Platform connects clients with independent health and nutrition advisors (the "Advisors") for the provision of personalized coaching services, including nutrition plans, exercise and healthy habits.',
          'The Platform provides the necessary technological tools: health form, AI-powered recommendations, payment management and session booking.',
          'Advisors are independent professionals, not NELHEALTHCOACH employees. Each Advisor is responsible for the services they provide and for complying with the obligations of their contract.'
        ]
      },
      {
        title: '3. Registration and Accounts',
        paragraphs: [
          'To contract services, clients must complete the health form and accept the applicable service contract. Advisors must register as professionals and accept their advisor agreement.',
          'You agree to provide truthful and up-to-date information. You are responsible for maintaining the confidentiality of your access credentials and for all activities carried out with your account.'
        ]
      },
      {
        title: '4. Acceptable Use',
        paragraphs: [
          'When using the Platform, you agree not to:'
        ],
        bullets: [
          'Use it for unlawful, fraudulent or bad-faith purposes.',
          'Attempt to access systems, accounts or third-party data without authorization.',
          'Reproduce, duplicate, copy or commercially exploit any part of the Platform without authorization.',
          'Introduce viruses, malware or any technology that could damage the Platform or other users.',
          'Impersonate other persons or provide false information.'
        ]
      },
      {
        title: '5. Services Are Not Medical Advice',
        paragraphs: [
          'The services offered through the Platform are nutritional and wellness coaching and do NOT constitute diagnosis, treatment, cure or prevention of any disease, nor professional medical advice.',
          'If you have a medical condition, take medication or are pregnant, always consult your physician or healthcare professional before starting any program. In case of a medical emergency, contact your local emergency services.'
        ]
      },
      {
        title: '6. Payments',
        paragraphs: [
          'Service prices are shown before confirming payment. Payments are processed through the Stripe payment gateway, subject to its own terms and conditions.',
          'The applicable price will be the price published by the Advisor or, failing that, the Platform standard price. By confirming the payment, you authorize the charge of the amount corresponding to your plan.',
          'Refunds and cancellations are governed by the applicable service contract and applicable law.'
        ]
      },
      {
        title: '7. Sessions',
        paragraphs: [
          'Coaching sessions last 60 minutes and are held monthly via video call (Google Meet or Zoom), unless otherwise agreed with the Advisor.',
          'Sessions may be cancelled or rescheduled with at least 24 hours\' notice, at no charge.'
        ]
      },
      {
        title: '8. Intellectual Property',
        paragraphs: [
          'All Platform content (texts, graphics, logos, images, software and materials) is the property of NELHEALTHCOACH or its licensors and is protected by applicable intellectual property laws.',
          'The information you provide through the health form is your property. The Platform and the Advisor use it solely to provide the service, in accordance with the Privacy Policy.'
        ]
      },
      {
        title: '9. Limitation of Liability',
        paragraphs: [
          'The Platform is provided "as is" and "as available". NELHEALTHCOACH does not guarantee that the service will be uninterrupted or error-free.',
          'To the maximum extent permitted by law, NELHEALTHCOACH shall not be liable for indirect, incidental or consequential damages arising from the use of the Platform or Advisor services, and its total liability is limited to the amount paid by the client in the three months prior to the event giving rise to it.',
          'Services provided by Advisors are the sole responsibility of each Advisor.'
        ]
      },
      {
        title: '10. Suspension and Termination',
        paragraphs: [
          'NELHEALTHCOACH may suspend or cancel access to the Platform for breach of these Terms, fraud or conduct that endangers other users, without prejudice to any other legal actions that may apply.',
          'Clauses regarding intellectual property, limitation of liability, applicable law and dispute resolution shall survive termination.'
        ]
      },
      {
        title: '11. Governing Law and Dispute Resolution',
        paragraphs: [
          'These Terms and Conditions are governed by the laws of the State of California, United States.',
          'The parties agree to attempt in good faith to resolve any dispute through mediation for a period of 30 days before resorting to courts. Disputes that cannot be resolved through mediation shall be submitted to the exclusive jurisdiction of the courts of the State of California.'
        ]
      },
      {
        title: '12. Modifications',
        paragraphs: [
          'We may modify these Terms and Conditions at any time. The current version will be published on this page with its update date.',
          'Continued use of the Platform after the publication of changes implies acceptance of the new Terms.'
        ]
      },
      {
        title: '13. Contact',
        paragraphs: [
          'For any question about these Terms and Conditions, contact us at contact@nelhealthcoach.com or at NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, United States.'
        ]
      }
    ]
  },

  /* ==================== LEGAL NOTICE (EN) ==================== */
  notice: {
    title: 'Legal Notice',
    updated: 'Last updated: August 1, 2026',
    sections: [
      {
        title: '1. Website Owner',
        paragraphs: [
          'In compliance with applicable law, the website https://nelhealthcoach.com is owned by NELHEALTHCOACH LLC, a company incorporated in the State of California, United States, with registered address at 33450 Shifting Sands Trail, Cathedral City, CA 92234.',
          'Contact details: contact@nelhealthcoach.com · +1 (442) 342-5050 · +1 (760) 980-5880.'
        ]
      },
      {
        title: '2. Purpose',
        paragraphs: [
          'This Legal Notice regulates access to and use of the website, whose purpose is to present the Platform\'s health and nutrition coaching services and allow their contracting.'
        ]
      },
      {
        title: '3. Intellectual and Industrial Property',
        paragraphs: [
          'The name "NELHEALTHCOACH", the logo, texts, images, graphics, structure and all website content are protected by intellectual and industrial property rights owned by NELHEALTHCOACH LLC.',
          'Reproduction, distribution or transformation of the content is prohibited without the express written authorization of its owner.'
        ]
      },
      {
        title: '4. Disclaimer of Liability',
        paragraphs: [
          'NELHEALTHCOACH is not liable for misuse of the website content or for the consequences of applying it, which is provided for informational purposes.',
          'The website content does not constitute professional medical advice. For any health issue, consult a healthcare professional.',
          'NELHEALTHCOACH does not guarantee the continuous availability of the website or the absence of errors, viruses or damages arising from accessing it.'
        ]
      },
      {
        title: '5. External Links',
        paragraphs: [
          'The website may contain links to third-party sites (Stripe, Google Meet, Zoom, social networks). NELHEALTHCOACH does not control and assumes no responsibility for the content, policies or practices of those sites.'
        ]
      },
      {
        title: '6. Applicable Law',
        paragraphs: [
          'This Legal Notice is governed by the laws of the State of California, United States. For the resolution of any dispute, the parties submit to the jurisdiction of the courts of the State of California.'
        ]
      },
      {
        title: '7. Contact',
        paragraphs: [
          'If you have questions about this Legal Notice, you can write to us at contact@nelhealthcoach.com or at NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, United States.'
        ]
      }
    ]
  }
,

  refunds: {
    title: 'Refund & Cancellation Policy',
    updated: 'Last updated: October 1, 2026',
    sections: [
      {
        title: '1. Right of Withdrawal (14-Day Cooling-off Period)',
        paragraphs: [
          'In accordance with consumer protection directives (EU Directive 2011/83/EU), consumers have the right to withdraw from distance contracts within 14 calendar days without stating a reason.'
        ]
      },
      {
        title: '2. Exception for Personalized Digital Services',
        paragraphs: [
          'The right of withdrawal ceases to apply once performance of the digital service has begun with your express prior consent.',
          'Consequently, once your individualized meal plan or supplementation guide has been generated, AI analysis performed, or 1-on-1 coaching call attended, the personalized service is considered fully or partially executed, extinguishing withdrawal rights.'
        ]
      },
      {
        title: '3. Subscriptions & Hassle-Free Cancellation',
        paragraphs: [
          'For recurring monthly coaching plans, you may cancel automatic renewal at any time before your next billing cycle via your dashboard or by emailing soporte@nelhealthcoach.com.',
          'Cancellation stops future charges without penalty. You maintain platform access until the end of the current paid billing cycle.'
        ]
      },
      {
        title: '4. Eligible Refund Cases',
        paragraphs: [
          'Full refunds are issued exclusively under verified scenarios such as technical duplicate charges or service non-delivery attributable to NelHealthCoach.',
          'Refunds are credited to the original Stripe payment method within 5 to 10 business days.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Cookie & Tracking Policy',
    updated: 'Last updated: October 1, 2026',
    sections: [
      {
        title: '1. What are Cookies and Local Storage?',
        paragraphs: [
          'We use technical cookies and local storage (localStorage and sessionStorage) to ensure platform security, maintain language preferences, and gather aggregate usage metrics under GDPR and the ePrivacy Directive.'
        ]
      },
      {
        title: '2. Cookie Inventory',
        paragraphs: ['We utilize the following storage technologies:'],
        bullets: [
          'nhc_cookie_consent (Essential): Stores user cookie preferences. Retention: 180 days.',
          'i18nextLng (Essential): Stores language selection. Retention: 7 days.',
          'nel_ephemeral_visitor_id (Essential): Ephemeral session token for rate limiting and fraud prevention. Retention: Browser session.',
          'nhc_consent_analytics (Essential): Records analytics consent state. Retention: 180 days.',
          'nel_fp_visitor_id (Analytics): Only loaded if you click "Accept all". Generates an aggregate visitor identifier. Retention: 180 days.'
        ]
      },
      {
        title: '3. Managing and Withdrawing Consent',
        paragraphs: [
          'You may withdraw or modify consent at any time through our footer consent preferences or by clearing cookies in your browser settings.'
        ]
      }
    ]
  }
};

const fr: Record<LegalPageKey, LegalDocument> = {
  /* ==================== POLITIQUE DE CONFIDENTIALITÉ (FR) ==================== */
  privacy: {
    title: 'Politique de Confidentialité',
    updated: 'Dernière mise à jour : 1er août 2026',
    sections: [
      {
        title: '1. Responsable du traitement',
        paragraphs: [
          'NELHEALTHCOACH LLC (ci-après « NELHEALTHCOACH », « nous » ou « la Plateforme »), dont le siège est situé au 33450 Shifting Sands Trail, Cathedral City, CA 92234, États-Unis, est le responsable du traitement des données personnelles collectées via le site web https://nelhealthcoach.com et ses services associés.',
          'Pour toute question relative à cette Politique de Confidentialité ou au traitement de vos données, vous pouvez nous contacter à contact@nelhealthcoach.com ou par téléphone au +1 (442) 342-5050 (espagnol) ou +1 (760) 980-5880 (anglais).'
        ]
      },
      {
        title: '2. Données collectées',
        paragraphs: [
          'Nous collectons les catégories de données personnelles suivantes :'
        ],
        bullets: [
          'Données de contact : nom, adresse e-mail et, le cas échéant, numéro de téléphone.',
          'Données du formulaire de santé : informations sur votre état de santé, vos antécédents médicaux, vos habitudes alimentaires, vos mensurations, vos objectifs et votre mode de vie, que vous fournissez volontairement lors du formulaire.',
          'Données de paiement : traitées de manière sécurisée par notre prestataire de paiement Stripe. Nous ne stockons pas de numéros de carte complets ni de coordonnées bancaires sur nos serveurs.',
          'Données d\'utilisation : informations sur la façon dont vous interagissez avec la Plateforme (pages visitées, durée d\'utilisation, préférences linguistiques).',
          'Données de communication : messages et informations que vous nous envoyez via le formulaire de contact ou par e-mail.'
        ]
      },
      {
        title: '3. Finalités du traitement',
        paragraphs: [
          'Nous traitons vos données personnelles aux fins suivantes :'
        ],
        bullets: [
          'Fournir le service de coaching et de conseil nutritionnel souscrit, y compris la génération de recommandations personnalisées.',
          'Traiter les paiements et gérer les abonnements via Stripe.',
          'Communiquer avec vous concernant votre programme, vos séances et les mises à jour du service.',
          'Analyser les données du formulaire de santé à l\'aide d\'outils d\'intelligence artificielle pour générer des recommandations personnalisées, toujours avec votre consentement préalable.',
          'Respecter nos obligations légales et contractuelles.',
          'Améliorer la Plateforme, sa sécurité et l\'expérience utilisateur.'
        ]
      },
      {
        title: '4. Base légale du traitement',
        paragraphs: [
          'Nous traitons vos données personnelles sur les bases légales suivantes :',
          '· Exécution du contrat : le traitement est nécessaire à la fourniture des services souscrits.',
          '· Consentement : pour le traitement des données de santé et l\'utilisation de l\'intelligence artificielle, ainsi que pour l\'envoi de communications commerciales le cas échéant.',
          '· Intérêt légitime : pour améliorer la Plateforme, prévenir la fraude et assurer la sécurité des services.',
          '· Obligation légale : lorsque la loi applicable nous oblige à conserver ou à communiquer certaines données.'
        ]
      },
      {
        title: '5. Traitement des données de santé',
        paragraphs: [
          'Les données relatives à votre santé constituent des données sensibles. Nous ne les traitons qu\'avec votre consentement explicite, uniquement dans le but de personnaliser votre programme de coaching.',
          'Ces données ne sont accessibles qu\'au conseiller fournissant le service, au personnel autorisé de la Plateforme et aux systèmes d\'intelligence artificielle qui génèrent les recommandations. Elles ne sont jamais utilisées à des fins publicitaires ni partagées avec des tiers sans votre consentement.',
          'Le conseiller est contractuellement tenu de traiter vos données de santé avec la plus stricte confidentialité et de ne pas les utiliser à d\'autres fins que la fourniture du service.'
        ]
      },
      {
        title: '6. Utilisation de l\'intelligence artificielle',
        paragraphs: [
          'La Plateforme utilise des systèmes d\'intelligence artificielle (IA) pour analyser les informations de votre formulaire de santé et générer des recommandations personnalisées en nutrition et bien-être.',
          'Ces systèmes traitent les données automatiquement sous notre supervision. Les recommandations sont examinées par le conseiller avant d\'être délivrées, et aucune décision automatisée ayant des effets juridiques significatifs n\'est prise à votre sujet sans intervention humaine.',
          'Vous pouvez demander à tout moment des informations sur l\'utilisation de l\'IA dans votre processus, vous y opposer ou demander qu\'une personne examine les décisions fondées sur ces systèmes.'
        ]
      },
      {
        title: '7. Destinataires des données',
        paragraphs: [
          'Nous partageons vos données personnelles exclusivement avec :'
        ],
        bullets: [
          'Les prestataires de paiement (Stripe), uniquement pour traiter les transactions.',
          'Les prestataires de visioconférence (Google Meet, Zoom), pour la tenue des séances.',
          'Les prestataires d\'hébergement, d\'e-mail, d\'analyse et d\'intelligence artificielle, agissant en qualité de sous-traitants.',
          'Les autorités publiques et judiciaires, lorsque la loi l\'exige.'
        ],
      },
      {
        title: '8. Transferts internationaux',
        paragraphs: [
          'La Plateforme opère principalement depuis les États-Unis et vos données peuvent être stockées et traitées sur des serveurs situés aux États-Unis ou dans d\'autres pays.',
          'Lorsque nous transférons des données à des tiers en dehors de votre pays de résidence, nous adoptons les garanties appropriées exigées par la législation applicable, y compris les clauses contractuelles types de l\'Union européenne le cas échéant.'
        ]
      },
      {
        title: '9. Conservation des données',
        paragraphs: [
          'Nous conservons vos données personnelles uniquement pendant la durée nécessaire à la réalisation des finalités décrites dans cette Politique, ainsi que pendant les délais exigés par la loi applicable.',
          'Lorsque la relation contractuelle prend fin, les données du formulaire de santé sont supprimées ou anonymisées, sauf si la loi exige leur conservation ou si une procédure judiciaire est en cours.'
        ]
      },
      {
        title: '10. Sécurité des données',
        paragraphs: [
          'Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données personnelles, notamment le chiffrement des données en transit (TLS) et au repos (AES-256), un contrôle d\'accès authentifié et restreint par rôles, la surveillance de l\'activité et des sauvegardes.',
          'Cependant, aucun système de transmission ou de stockage de données n\'est totalement sécurisé. Nous déployons tous les efforts raisonnables pour protéger vos informations.'
        ]
      },
      {
        title: '11. Vos droits',
        paragraphs: [
          'Vous avez le droit de :'
        ],
        bullets: [
          'Accéder à vos données personnelles et en obtenir une copie.',
          'Rectifier les données inexactes ou incomplètes.',
          'Demander la suppression de vos données lorsqu\'elles ne sont plus nécessaires.',
          'Vous opposer au traitement ou demander sa limitation.',
          'Demander la portabilité de vos données.',
          'Retirer votre consentement à tout moment, sans affecter la licéité du traitement antérieur.',
          'Introduire une réclamation auprès de l\'autorité de protection des données compétente (en Californie, la California Privacy Protection Agency ; dans l\'Union européenne, l\'autorité de votre pays de résidence).'
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'La Plateforme utilise des cookies techniques strictement nécessaires au fonctionnement du site et des cookies de préférences pour mémoriser votre langue et vos paramètres.',
          'Vous pouvez configurer votre navigateur pour refuser ou supprimer les cookies à tout moment ; toutefois, certaines fonctionnalités du site pourraient être affectées.'
        ]
      },
      {
        title: '13. Mineurs',
        paragraphs: [
          'Les services de la Plateforme s\'adressent aux personnes de plus de 18 ans. Si le service est fourni à un mineur, le formulaire doit être rempli et autorisé par son parent ou tuteur légal, conformément au contrat de services.'
        ]
      },
      {
        title: '14. Modifications de cette Politique',
        paragraphs: [
          'Nous pouvons mettre à jour cette Politique de Confidentialité à tout moment. La version en vigueur sera toujours publiée sur cette page avec sa date de mise à jour.',
          'Si nous apportons des modifications importantes, nous vous en informerons via la Plateforme ou par e-mail avant leur entrée en vigueur.'
        ]
      },
      {
        title: '15. Contact',
        paragraphs: [
          'Si vous avez des questions sur cette Politique de Confidentialité ou souhaitez exercer vos droits, contactez-nous à contact@nelhealthcoach.com, par téléphone au +1 (442) 342-5050 ou +1 (760) 980-5880, ou par courrier à NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, États-Unis.'
        ]
      }
    ]
  },

  /* ==================== CONDITIONS GÉNÉRALES (FR) ==================== */
  terms: {
    title: 'Conditions Générales d\'Utilisation',
    updated: 'Dernière mise à jour : 1er août 2026',
    sections: [
      {
        title: '1. Acceptation des Conditions',
        paragraphs: [
          'Les présentes Conditions Générales régissent l\'accès et l\'utilisation du site web https://nelhealthcoach.com et de la plateforme NELHEALTHCOACH (la « Plateforme »), exploitée par NELHEALTHCOACH LLC, dont le siège est situé au 33450 Shifting Sands Trail, Cathedral City, CA 92234, États-Unis.',
          'En accédant à la Plateforme ou en utilisant l\'un de ses services, vous acceptez les présentes Conditions Générales dans leur version en vigueur. Si vous n\'êtes pas d\'accord, n\'utilisez pas la Plateforme.'
        ]
      },
      {
        title: '2. Description des services',
        paragraphs: [
          'La Plateforme met en relation des clients avec des conseillers indépendants en santé et nutrition (les « Conseillers ») pour la fourniture de services de coaching personnalisés, incluant des plans d\'alimentation, d\'exercice et d\'habitudes saines.',
          'La Plateforme fournit les outils technologiques nécessaires : formulaire de santé, génération de recommandations par intelligence artificielle, gestion des paiements et réservation de séances.',
          'Les Conseillers sont des professionnels indépendants, non employés de NELHEALTHCOACH. Chaque Conseiller est responsable des services qu\'il fournit et du respect des obligations de son contrat.'
        ]
      },
      {
        title: '3. Inscription et comptes',
        paragraphs: [
          'Pour souscrire aux services, les clients doivent remplir le formulaire de santé et accepter le contrat de services applicable. Les Conseillers doivent s\'inscrire en tant que professionnels et accepter leur contrat de conseiller.',
          'Vous vous engagez à fournir des informations exactes et à jour. Vous êtes responsable du maintien de la confidentialité de vos identifiants d\'accès et de toutes les activités réalisées avec votre compte.'
        ]
      },
      {
        title: '4. Utilisation acceptable',
        paragraphs: [
          'En utilisant la Plateforme, vous vous engagez à ne pas :'
        ],
        bullets: [
          'L\'utiliser à des fins illicites, frauduleuses ou contraires à la bonne foi.',
          'Tenter d\'accéder sans autorisation à des systèmes, comptes ou données de tiers.',
          'Reproduire, dupliquer, copier ou exploiter commercialement toute partie de la Plateforme sans autorisation.',
          'Introduire des virus, logiciels malveillants ou toute technologie pouvant endommager la Plateforme ou d\'autres utilisateurs.',
          'Usurper l\'identité d\'autres personnes ou fournir des informations fausses.'
        ]
      },
      {
        title: '5. Les services ne constituent pas un avis médical',
        paragraphs: [
          'Les services proposés via la Plateforme sont du coaching nutritionnel et de bien-être et ne constituent PAS un diagnostic, un traitement, une guérison ou une prévention de maladie, ni un avis médical professionnel.',
          'Si vous souffrez d\'une condition médicale, prenez des médicaments ou êtes enceinte, consultez toujours votre médecin ou professionnel de santé avant de commencer tout programme. En cas d\'urgence médicale, contactez les services d\'urgence de votre localité.'
        ]
      },
      {
        title: '6. Paiements',
        paragraphs: [
          'Les prix des services sont affichés avant la confirmation du paiement. Les paiements sont traités via la passerelle de paiement Stripe, soumise à ses propres conditions.',
          'Le prix applicable sera le prix publié par le Conseiller ou, à défaut, le prix standard de la Plateforme. En confirmant le paiement, vous autorisez le prélèvement du montant correspondant à votre offre.',
          'Les remboursements et annulations sont régis par le contrat de services applicable et par la loi en vigueur.'
        ]
      },
      {
        title: '7. Séances',
        paragraphs: [
          'Les séances de coaching durent 60 minutes et ont lieu mensuellement par visioconférence (Google Meet ou Zoom), sauf accord différent avec le Conseiller.',
          'Les séances peuvent être annulées ou reportées avec un préavis d\'au moins 24 heures, sans frais.'
        ]
      },
      {
        title: '8. Propriété intellectuelle',
        paragraphs: [
          'Tous les contenus de la Plateforme (textes, graphiques, logos, images, logiciels et matériels) sont la propriété de NELHEALTHCOACH ou de ses concédants et sont protégés par les lois applicables en matière de propriété intellectuelle.',
          'Les informations que vous fournissez via le formulaire de santé vous appartiennent. La Plateforme et le Conseiller les utilisent uniquement pour fournir le service, conformément à la Politique de Confidentialité.'
        ]
      },
      {
        title: '9. Limitation de responsabilité',
        paragraphs: [
          'La Plateforme est fournie « en l\'état » et « selon disponibilité ». NELHEALTHCOACH ne garantit pas un service ininterrompu ou exempt d\'erreurs.',
          'Dans la mesure maximale permise par la loi, NELHEALTHCOACH ne sera pas responsable des dommages indirects, accessoires ou consécutifs découlant de l\'utilisation de la Plateforme ou des services des Conseillers, et sa responsabilité totale est limitée au montant payé par le client au cours des trois mois précédant le fait générateur.',
          'Les services fournis par les Conseillers relèvent de la responsabilité exclusive de chaque Conseiller.'
        ]
      },
      {
        title: '10. Suspension et résiliation',
        paragraphs: [
          'NELHEALTHCOACH peut suspendre ou annuler l\'accès à la Plateforme en cas de violation des présentes Conditions, de fraude ou de comportement mettant en danger d\'autres utilisateurs, sans préjudice des autres actions légales applicables.',
          'Les clauses relatives à la propriété intellectuelle, à la limitation de responsabilité, à la loi applicable et au règlement des litiges survivront à la résiliation.'
        ]
      },
      {
        title: '11. Loi applicable et règlement des litiges',
        paragraphs: [
          'Les présentes Conditions Générales sont régies par les lois de l\'État de Californie, États-Unis.',
          'Les parties conviennent de tenter de résoudre de bonne foi tout litige par médiation pendant une période de 30 jours avant de saisir les tribunaux. Les litiges non résolus par médiation seront soumis à la juridiction exclusive des tribunaux de l\'État de Californie.'
        ]
      },
      {
        title: '12. Modifications',
        paragraphs: [
          'Nous pouvons modifier les présentes Conditions Générales à tout moment. La version en vigueur sera publiée sur cette page avec sa date de mise à jour.',
          'L\'utilisation continue de la Plateforme après la publication des modifications implique l\'acceptation des nouvelles Conditions.'
        ]
      },
      {
        title: '13. Contact',
        paragraphs: [
          'Pour toute question sur les présentes Conditions Générales, contactez-nous à contact@nelhealthcoach.com ou à NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, États-Unis.'
        ]
      }
    ]
  },

  /* ==================== MENTIONS LÉGALES (FR) ==================== */
  notice: {
    title: 'Mentions Légales',
    updated: 'Dernière mise à jour : 1er août 2026',
    sections: [
      {
        title: '1. Titulaire du site web',
        paragraphs: [
          'Conformément à la législation applicable, le site web https://nelhealthcoach.com est la propriété de NELHEALTHCOACH LLC, société constituée dans l\'État de Californie, États-Unis, dont le siège est situé au 33450 Shifting Sands Trail, Cathedral City, CA 92234.',
          'Coordonnées : contact@nelhealthcoach.com · +1 (442) 342-5050 · +1 (760) 980-5880.'
        ]
      },
      {
        title: '2. Objet',
        paragraphs: [
          'Les présentes Mentions Légales régissent l\'accès et l\'utilisation du site web, dont la finalité est de présenter les services de coaching en santé et nutrition de la Plateforme et de permettre leur souscription.'
        ]
      },
      {
        title: '3. Propriété intellectuelle et industrielle',
        paragraphs: [
          'Le nom « NELHEALTHCOACH », le logo, les textes, les images, les graphiques, la structure et tous les contenus du site web sont protégés par des droits de propriété intellectuelle et industrielle appartenant à NELHEALTHCOACH LLC.',
          'La reproduction, la distribution ou la transformation des contenus est interdite sans autorisation expresse et écrite de son titulaire.'
        ]
      },
      {
        title: '4. Exclusion de responsabilité',
        paragraphs: [
          'NELHEALTHCOACH n\'est pas responsable de l\'utilisation abusive des contenus du site web ni des conséquences découlant de leur application, qui ont un caractère informatif.',
          'Les contenus du site web ne constituent pas un avis médical professionnel. En cas de problème de santé, consultez un professionnel de santé.',
          'NELHEALTHCOACH ne garantit pas la disponibilité continue du site web ni l\'absence d\'erreurs, de virus ou de dommages découlant de son accès.'
        ]
      },
      {
        title: '5. Liens externes',
        paragraphs: [
          'Le site web peut contenir des liens vers des sites tiers (Stripe, Google Meet, Zoom, réseaux sociaux). NELHEALTHCOACH ne contrôle pas et n\'assume aucune responsabilité quant au contenu, aux politiques ou aux pratiques de ces sites.'
        ]
      },
      {
        title: '6. Législation applicable',
        paragraphs: [
          'Les présentes Mentions Légales sont régies par les lois de l\'État de Californie, États-Unis. Pour la résolution de tout litige, les parties se soumettent à la juridiction des tribunaux de l\'État de Californie.'
        ]
      },
      {
        title: '7. Contact',
        paragraphs: [
          'Si vous avez des questions sur ces Mentions Légales, écrivez-nous à contact@nelhealthcoach.com ou à NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, États-Unis.'
        ]
      }
    ]
  },
  refunds: {
    title: 'Politique de Remboursement et Rétractation',
    updated: 'Octobre 2026',
    sections: [
      {
        title: '1. Droit de rétractation et services numériques personnalisés',
        paragraphs: [
          'Conformément à la directive 2011/83/UE, le client dispose d\'un délai de 14 jours pour exercer son droit de rétractation.',
          'Ce droit s\'éteint dès le commencement d\'exécution des plans personnalisés (nutrition, suppléments, analyse IA ou session de coaching 1 à 1) avec l\'accord préalable du client.',
          'Les abonnements récurrents peuvent être interrompus à tout moment avant le renouvellement sans frais depuis le compte client ou par email à soporte@nelhealthcoach.com.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Politique de Cookies et Traceurs',
    updated: 'Octobre 2026',
    sections: [
      {
        title: '1. Gestion des traceurs et respect du RGPD',
        paragraphs: [
          'Nous utilisons des cookies techniques nécessaires au fonctionnement et à la sécurité du site. Les cookies d\'analyse et l\'empreinte numérique (fingerprinting) sont strictement bloqués jusqu\'au recueil de votre consentement explicite.',
          'Vous pouvez à tout moment configurer ou retirer votre consentement depuis la bannière de cookies ou les paramètres de votre navigateur.'
        ]
      }
    ]
  },
};

const it: Record<LegalPageKey, LegalDocument> = {
  /* ==================== INFORMATIVA SULLA PRIVACY (IT) ==================== */
  privacy: {
    title: 'Informativa sulla Privacy',
    updated: 'Ultimo aggiornamento: 1 agosto 2026',
    sections: [
      {
        title: '1. Titolare del trattamento',
        paragraphs: [
          'NELHEALTHCOACH LLC (di seguito "NELHEALTHCOACH", "noi" o "la Piattaforma"), con sede legale in 33450 Shifting Sands Trail, Cathedral City, CA 92234, Stati Uniti, è il titolare del trattamento dei dati personali raccolti tramite il sito web https://nelhealthcoach.com e i relativi servizi.',
          'Per qualsiasi domanda relativa alla presente Informativa sulla Privacy o al trattamento dei tuoi dati, puoi contattarci a contact@nelhealthcoach.com o telefonando al +1 (442) 342-5050 (spagnolo) o +1 (760) 980-5880 (inglese).'
        ]
      },
      {
        title: '2. Dati che raccogliamo',
        paragraphs: [
          'Raccogliamo le seguenti categorie di dati personali:'
        ],
        bullets: [
          'Dati di contatto: nome, indirizzo e-mail e, se del caso, numero di telefono.',
          'Dati del modulo sanitario: informazioni sul tuo stato di salute, anamnesi, abitudini alimentari, misure corporee, obiettivi e stile di vita fornite volontariamente compilando il modulo.',
          'Dati di pagamento: elaborati in modo sicuro dal nostro fornitore di pagamenti Stripe. Non memorizziamo numeri completi di carta di credito né coordinate bancarie sui nostri server.',
          'Dati di utilizzo: informazioni su come interagisci con la Piattaforma (pagine visitate, tempo di utilizzo, preferenze linguistiche).',
          'Dati di comunicazione: messaggi e informazioni che ci invii tramite il modulo di contatto o e-mail.'
        ]
      },
      {
        title: '3. Finalità del trattamento',
        paragraphs: [
          'Trattiamo i tuoi dati personali per le seguenti finalità:'
        ],
        bullets: [
          'Fornire il servizio di coaching e consulenza nutrizionale sottoscritto, inclusa la generazione di raccomandazioni personalizzate.',
          'Elaborare i pagamenti e gestire gli abbonamenti tramite Stripe.',
          'Comunicare con te riguardo al tuo programma, alle sedute e agli aggiornamenti del servizio.',
          'Analizzare i dati del modulo sanitario con strumenti di intelligenza artificiale per generare raccomandazioni personalizzate, sempre con il tuo preventivo consenso.',
          'Adempiere ai nostri obblighi legali e contrattuali.',
          'Migliorare la Piattaforma, la sua sicurezza e l\'esperienza dell\'utente.'
        ]
      },
      {
        title: '4. Base giuridica del trattamento',
        paragraphs: [
          'Trattiamo i tuoi dati personali sulle seguenti basi giuridiche:',
          '· Esecuzione del contratto: il trattamento è necessario per fornire i servizi sottoscritti.',
          '· Consenso: per il trattamento dei dati sanitari e l\'uso dell\'intelligenza artificiale, nonché per l\'invio di comunicazioni commerciali ove applicabile.',
          '· Interesse legittimo: per migliorare la Piattaforma, prevenire frodi e garantire la sicurezza dei servizi.',
          '· Obbligo di legge: quando la legge applicabile ci impone di conservare o comunicare determinati dati.'
        ]
      },
      {
        title: '5. Trattamento dei dati sanitari',
        paragraphs: [
          'I dati relativi alla tua salute costituiscono categorie particolari di dati. Li trattiamo solo con il tuo consenso esplicito, esclusivamente allo scopo di personalizzare il tuo programma di coaching.',
          'Questi dati sono accessibili solo al consulente che fornisce il servizio, al personale autorizzato della Piattaforma e ai sistemi di intelligenza artificiale che generano le raccomandazioni. Non vengono mai utilizzati per finalità pubblicitarie né ceduti a terzi senza il tuo consenso.',
          'Il consulente è contrattualmente obbligato a trattare i tuoi dati sanitari con la massima riservatezza e a non utilizzarli per finalità diverse dalla fornitura del servizio.'
        ]
      },
      {
        title: '6. Uso dell\'intelligenza artificiale',
        paragraphs: [
          'La Piattaforma utilizza sistemi di intelligenza artificiale (IA) per analizzare le informazioni del tuo modulo sanitario e generare raccomandazioni personalizzate di nutrizione e benessere.',
          'Questi sistemi trattano i dati automaticamente sotto la nostra supervisione. Le raccomandazioni vengono esaminate dal consulente prima della consegna e non vengono adottate decisioni automatizzate con effetti giuridici significativi su di te senza intervento umano.',
          'Puoi richiedere in qualsiasi momento informazioni sull\'uso dell\'IA nel tuo percorso, opporsi o chiedere che una persona esamini le decisioni basate su questi sistemi.'
        ]
      },
      {
        title: '7. Destinatari dei dati',
        paragraphs: [
          'Condividiamo i tuoi dati personali esclusivamente con:'
        ],
        bullets: [
          'Fornitori di pagamento (Stripe), unicamente per elaborare le transazioni.',
          'Fornitori di videoconferenze (Google Meet, Zoom), per lo svolgimento delle sedute.',
          'Fornitori di hosting, e-mail, analisi e intelligenza artificiale, che agiscono in qualità di responsabili del trattamento.',
          'Autorità pubbliche e giudiziarie, quando previsto dalla legge.'
        ],
      },
      {
        title: '8. Trasferimenti internazionali',
        paragraphs: [
          'La Piattaforma opera principalmente dagli Stati Uniti e i tuoi dati possono essere archiviati ed elaborati su server situati negli Stati Uniti o in altri paesi.',
          'Quando trasferiamo dati a terzi al di fuori del tuo paese di residenza, adottiamo le garanzie adeguate richieste dalla legislazione applicabile, incluse le clausole contrattuali standard dell\'Unione Europea ove applicabili.'
        ]
      },
      {
        title: '9. Conservazione dei dati',
        paragraphs: [
          'Conserviamo i tuoi dati personali solo per il tempo necessario a conseguire le finalità descritte nella presente Informativa e per i periodi richiesti dalla legge applicabile.',
          'Al termine del rapporto contrattuale, i dati del modulo sanitario vengono eliminati o resi anonimi, salvo che la legge ne esiga la conservazione o sia in corso un procedimento legale.'
        ]
      },
      {
        title: '10. Sicurezza dei dati',
        paragraphs: [
          'Implementiamo misure tecniche e organizzative per proteggere i tuoi dati personali, tra cui la cifratura dei dati in transito (TLS) e a riposo (AES-256), il controllo degli accessi autenticato e limitato per ruoli, il monitoraggio delle attività e i backup.',
          'Tuttavia, nessun sistema di trasmissione o archiviazione dei dati è completamente sicuro. Adottiamo ogni sforzo ragionevole per proteggere le tue informazioni.'
        ]
      },
      {
        title: '11. I tuoi diritti',
        paragraphs: [
          'Hai il diritto di:'
        ],
        bullets: [
          'Accedere ai tuoi dati personali e ottenerne una copia.',
          'Rettificare dati inesatti o incompleti.',
          'Richiedere la cancellazione dei tuoi dati quando non sono più necessari.',
          'Opporti al trattamento o richiederne la limitazione.',
          'Richiedere la portabilità dei tuoi dati.',
          'Revocare il tuo consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente.',
          'Proporre reclamo all\'autorità di protezione dei dati competente (in California, la California Privacy Protection Agency; nell\'Unione Europea, l\'autorità del tuo paese di residenza).'
        ],
      },
      {
        title: '12. Cookie',
        paragraphs: [
          'La Piattaforma utilizza cookie tecnici strettamente necessari al funzionamento del sito e cookie di preferenza per ricordare la tua lingua e le tue impostazioni.',
          'Puoi configurare il tuo browser per rifiutare o eliminare i cookie in qualsiasi momento; tuttavia, alcune funzionalità del sito potrebbero essere compromesse.'
        ]
      },
      {
        title: '13. Minori',
        paragraphs: [
          'I servizi della Piattaforma sono destinati a persone maggiorenni. Se il servizio viene fornito a un minore, il modulo deve essere compilato e autorizzato da un genitore o tutore legale, conformemente al contratto di servizi.'
        ]
      },
      {
        title: '14. Modifiche alla presente Informativa',
        paragraphs: [
          'Possiamo aggiornare la presente Informativa sulla Privacy in qualsiasi momento. La versione vigente sarà sempre pubblicata su questa pagina con la data di aggiornamento.',
          'Se apportiamo modifiche significative, ti informeremo tramite la Piattaforma o e-mail prima della loro entrata in vigore.'
        ]
      },
      {
        title: '15. Contatto',
        paragraphs: [
          'Se hai domande sulla presente Informativa sulla Privacy o desideri esercitare i tuoi diritti, contattaci a contact@nelhealthcoach.com, al +1 (442) 342-5050 o +1 (760) 980-5880, o scrivendo a NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Stati Uniti.'
        ]
      }
    ]
  },

  /* ==================== TERMINI E CONDIZIONI (IT) ==================== */
  terms: {
    title: 'Termini e Condizioni',
    updated: 'Ultimo aggiornamento: 1 agosto 2026',
    sections: [
      {
        title: '1. Accettazione dei Termini',
        paragraphs: [
          'I presenti Termini e Condizioni regolano l\'accesso e l\'uso del sito web https://nelhealthcoach.com e della piattaforma NELHEALTHCOACH (la "Piattaforma"), gestita da NELHEALTHCOACH LLC, con sede legale in 33450 Shifting Sands Trail, Cathedral City, CA 92234, Stati Uniti.',
          'Accedendo alla Piattaforma o utilizzando uno qualsiasi dei suoi servizi, accetti i presenti Termini e Condizioni nella versione vigente. Se non sei d\'accordo, non utilizzare la Piattaforma.'
        ]
      },
      {
        title: '2. Descrizione del servizio',
        paragraphs: [
          'La Piattaforma mette in contatto clienti con consulenti indipendenti di salute e nutrizione (i "Consulenti") per la fornitura di servizi di coaching personalizzato, che includono piani alimentari, di esercizio e abitudini sane.',
          'La Piattaforma fornisce gli strumenti tecnologici necessari: modulo sanitario, generazione di raccomandazioni tramite intelligenza artificiale, gestione dei pagamenti e prenotazione delle sedute.',
          'I Consulenti sono professionisti indipendenti, non dipendenti di NELHEALTHCOACH. Ogni Consulente è responsabile dei servizi che fornisce e del rispetto degli obblighi del proprio contratto.'
        ]
      },
      {
        title: '3. Registrazione e account',
        paragraphs: [
          'Per sottoscrivere i servizi, i clienti devono compilare il modulo sanitario e accettare il contratto di servizi applicabile. I Consulenti devono registrarsi come professionisti e accettare il proprio contratto di consulenza.',
          'Ti impegni a fornire informazioni veritiere e aggiornate. Sei responsabile del mantenimento della riservatezza delle tue credenziali di accesso e di tutte le attività svolte con il tuo account.'
        ]
      },
      {
        title: '4. Uso consentito',
        paragraphs: [
          'Utilizzando la Piattaforma ti impegni a non:'
        ],
        bullets: [
          'Utilizzarla per scopi illeciti, fraudolenti o contrari alla buona fede.',
          'Tentare di accedere senza autorizzazione a sistemi, account o dati di terzi.',
          'Riprodurre, duplicare, copiare o sfruttare commercialmente qualsiasi parte della Piattaforma senza autorizzazione.',
          'Introdurre virus, malware o qualsiasi tecnologia che possa danneggiare la Piattaforma o altri utenti.',
          'Usurpare l\'identità di altre persone o fornire informazioni false.'
        ]
      },
      {
        title: '5. I servizi non costituiscono consulenza medica',
        paragraphs: [
          'I servizi offerti tramite la Piattaforma sono coaching nutrizionale e benessere e NON costituiscono diagnosi, trattamento, cura o prevenzione di alcuna malattia, né consulenza medica professionale.',
          'Se soffri di una condizione medica, prendi farmaci o sei in gravidanza, consulta sempre il tuo medico o professionista sanitario prima di iniziare qualsiasi programma. In caso di emergenza medica, contatta i servizi di emergenza della tua zona.'
        ]
      },
      {
        title: '6. Pagamenti',
        paragraphs: [
          'I prezzi dei servizi vengono mostrati prima della conferma del pagamento. I pagamenti sono elaborati tramite il gateway di pagamento Stripe, soggetto alle proprie condizioni.',
          'Il prezzo applicabile sarà il prezzo pubblicato dal Consulente o, in mancanza, il prezzo standard della Piattaforma. Confermando il pagamento, autorizzi l\'addebito dell\'importo corrispondente al tuo piano.',
          'Rimborsi e annullamenti sono disciplinati dal contratto di servizi applicabile e dalla legge vigente.'
        ]
      },
      {
        title: '7. Sedute',
        paragraphs: [
          'Le sedute di coaching durano 60 minuti e si svolgono mensilmente tramite videoconferenza (Google Meet o Zoom), salvo diverso accordo con il Consulente.',
          'Le sedute possono essere annullate o riprogrammate con almeno 24 ore di preavviso, senza addebiti.'
        ]
      },
      {
        title: '8. Proprietà intellettuale',
        paragraphs: [
          'Tutti i contenuti della Piattaforma (testi, grafiche, loghi, immagini, software e materiali) sono di proprietà di NELHEALTHCOACH o dei suoi licenzianti e sono protetti dalle leggi applicabili in materia di proprietà intellettuale.',
          'Le informazioni fornite tramite il modulo sanitario sono di tua proprietà. La Piattaforma e il Consulente le utilizzano esclusivamente per fornire il servizio, conformemente all\'Informativa sulla Privacy.'
        ]
      },
      {
        title: '9. Limitazione di responsabilità',
        paragraphs: [
          'La Piattaforma è fornita "così com\'è" e "secondo disponibilità". NELHEALTHCOACH non garantisce che il servizio sia ininterrotto o privo di errori.',
          'Nella misura massima consentita dalla legge, NELHEALTHCOACH non sarà responsabile per danni indiretti, incidentali o consequenziali derivanti dall\'uso della Piattaforma o dei servizi dei Consulenti, e la sua responsabilità complessiva è limitata all\'importo pagato dal cliente nei tre mesi precedenti il fatto che la origina.',
          'I servizi forniti dai Consulenti sono di esclusiva responsabilità di ciascun Consulente.'
        ]
      },
      {
        title: '10. Sospensione e risoluzione',
        paragraphs: [
          'NELHEALTHCOACH può sospendere o annullare l\'accesso alla Piattaforma in caso di violazione dei presenti Termini, frode o condotta che metta in pericolo altri utenti, fatto salvo ogni altro rimedio legale applicabile.',
          'Le clausole relative a proprietà intellettuale, limitazione di responsabilità, legge applicabile e risoluzione delle controversie sopravvivranno alla risoluzione.'
        ]
      },
      {
        title: '11. Legge applicabile e risoluzione delle controversie',
        paragraphs: [
          'I presenti Termini e Condizioni sono disciplinati dalle leggi dello Stato della California, Stati Uniti.',
          'Le parti concordano di tentare in buona fede di risolvere qualsiasi controversia tramite mediazione per un periodo di 30 giorni prima di adire i tribunali. Le controversie non risolte tramite mediazione saranno sottoposte alla giurisdizione esclusiva dei tribunali dello Stato della California.'
        ]
      },
      {
        title: '12. Modifiche',
        paragraphs: [
          'Possiamo modificare i presenti Termini e Condizioni in qualsiasi momento. La versione vigente sarà pubblicata su questa pagina con la data di aggiornamento.',
          'L\'uso continuato della Piattaforma dopo la pubblicazione delle modifiche implica l\'accettazione dei nuovi Termini.'
        ]
      },
      {
        title: '13. Contatto',
        paragraphs: [
          'Per qualsiasi domanda sui presenti Termini e Condizioni, contattaci a contact@nelhealthcoach.com o a NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Stati Uniti.'
        ]
      }
    ]
  },

  /* ==================== AVVISO LEGALE (IT) ==================== */
  notice: {
    title: 'Avviso Legale',
    updated: 'Ultimo aggiornamento: 1 agosto 2026',
    sections: [
      {
        title: '1. Titolare del sito web',
        paragraphs: [
          'In conformità alla legislazione applicabile, il sito web https://nelhealthcoach.com è di proprietà di NELHEALTHCOACH LLC, società costituita nello Stato della California, Stati Uniti, con sede legale in 33450 Shifting Sands Trail, Cathedral City, CA 92234.',
          'Recapiti: contact@nelhealthcoach.com · +1 (442) 342-5050 · +1 (760) 980-5880.'
        ]
      },
      {
        title: '2. Oggetto',
        paragraphs: [
          'Il presente Avviso Legale regola l\'accesso e l\'uso del sito web, la cui finalità è presentare i servizi di coaching di salute e nutrizione della Piattaforma e consentirne la sottoscrizione.'
        ]
      },
      {
        title: '3. Proprietà intellettuale e industriale',
        paragraphs: [
          'Il nome "NELHEALTHCOACH", il logo, i testi, le immagini, le grafiche, la struttura e tutti i contenuti del sito web sono protetti da diritti di proprietà intellettuale e industriale di titolarità di NELHEALTHCOACH LLC.',
          'È vietata la riproduzione, distribuzione o trasformazione dei contenuti senza autorizzazione espressa e scritta del titolare.'
        ]
      },
      {
        title: '4. Esclusione di responsabilità',
        paragraphs: [
          'NELHEALTHCOACH non è responsabile dell\'uso improprio dei contenuti del sito web né delle conseguenze derivanti dalla loro applicazione, che hanno carattere informativo.',
          'I contenuti del sito web non costituiscono consulenza medica professionale. In caso di problemi di salute, consulta un professionista sanitario.',
          'NELHEALTHCOACH non garantisce la disponibilità continua del sito web né l\'assenza di errori, virus o danni derivanti dall\'accesso allo stesso.'
        ]
      },
      {
        title: '5. Link esterni',
        paragraphs: [
          'Il sito web può contenere link a siti di terzi (Stripe, Google Meet, Zoom, social network). NELHEALTHCOACH non controlla né si assume alcuna responsabilità per i contenuti, le politiche o le pratiche di tali siti.'
        ]
      },
      {
        title: '6. Legislazione applicabile',
        paragraphs: [
          'Il presente Avviso Legale è disciplinato dalle leggi dello Stato della California, Stati Uniti. Per la risoluzione di qualsiasi controversia, le parti si sottopongono alla giurisdizione dei tribunali dello Stato della California.'
        ]
      },
      {
        title: '7. Contatto',
        paragraphs: [
          'Se hai dubbi sul presente Avviso Legale, puoi scriverci a contact@nelhealthcoach.com o a NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Stati Uniti.'
        ]
      }
    ]
  },
  refunds: {
    title: 'Politica di Rimborso e Recesso',
    updated: 'Ottobre 2026',
    sections: [
      {
        title: '1. Diritto di recesso e servizi digitali personalizzati',
        paragraphs: [
          'In conformità con la direttiva 2011/83/UE, il consumatore ha diritto di recedere entro 14 giorni dall\'acquisto.',
          'Il diritto decade una volta avviata l\'esecuzione dei servizi personalizzati (piani nutrizionali, analisi IA o sessioni 1 a 1) con il consenso espresso del cliente.',
          'Gli abbonamenti possono essere annullati in qualsiasi momento prima del rinnovo mensile senza penali tramite la dashboard o scrivendo a soporte@nelhealthcoach.com.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Informativa sui Cookie e Tracciamento',
    updated: 'Ottobre 2026',
    sections: [
      {
        title: '1. Trasparenza sui cookie e conformità RGPD',
        paragraphs: [
          'Utilizziamo cookie tecnici essenziali per la navigazione sicura e le preferenze di lingua. I cookie analitici e il fingerprinting del dispositivo sono bloccati finché non viene fornito il consenso.',
          'Puoi modificare o revocare le tue preferenze in ogni momento tramite il banner cookie o le impostazioni del browser.'
        ]
      }
    ]
  },
};

const pt: Record<LegalPageKey, LegalDocument> = {
  /* ==================== POLÍTICA DE PRIVACIDADE (PT) ==================== */
  privacy: {
    title: 'Política de Privacidade',
    updated: 'Última atualização: 1 de agosto de 2026',
    sections: [
      {
        title: '1. Responsável pelo tratamento',
        paragraphs: [
          'A NELHEALTHCOACH LLC (doravante "NELHEALTHCOACH", "nós" ou "a Plataforma"), com sede em 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos, é a responsável pelo tratamento dos dados pessoais recolhidos através do site https://nelhealthcoach.com e dos serviços associados.',
          'Para qualquer questão relativa a esta Política de Privacidade ou ao tratamento dos seus dados, pode contactar-nos em contact@nelhealthcoach.com ou pelos telefones +1 (442) 342-5050 (espanhol) ou +1 (760) 980-5880 (inglês).'
        ]
      },
      {
        title: '2. Dados que recolhemos',
        paragraphs: [
          'Recolhemos as seguintes categorias de dados pessoais:'
        ],
        bullets: [
          'Dados de contacto: nome, endereço de e-mail e, quando aplicável, número de telefone.',
          'Dados do formulário de saúde: informações sobre o seu estado de saúde, histórico médico, hábitos alimentares, medidas corporais, objetivos e estilo de vida que fornece voluntariamente ao preencher o formulário.',
          'Dados de pagamento: processados de forma segura pelo nosso provedor de pagamentos Stripe. Não armazenamos números completos de cartão de crédito nem dados bancários nos nossos servidores.',
          'Dados de utilização: informações sobre como interage com a Plataforma (páginas visitadas, tempo de utilização, preferências de idioma).',
          'Dados de comunicação: mensagens e informações que nos envia através do formulário de contacto ou por e-mail.'
        ]
      },
      {
        title: '3. Finalidades do tratamento',
        paragraphs: [
          'Tratamos os seus dados pessoais para as seguintes finalidades:'
        ],
        bullets: [
          'Prestar o serviço de coaching e aconselhamento nutricional contratado, incluindo a geração de recomendações personalizadas.',
          'Processar pagamentos e gerir as subscrições através da Stripe.',
          'Comunicar consigo sobre o seu programa, sessões e novidades do serviço.',
          'Analisar os dados do formulário de saúde com ferramentas de inteligência artificial para gerar recomendações personalizadas, sempre com o seu consentimento prévio.',
          'Cumprir as nossas obrigações legais e contratuais.',
          'Melhorar a Plataforma, a sua segurança e a experiência do utilizador.'
        ]
      },
      {
        title: '4. Base legal do tratamento',
        paragraphs: [
          'Tratamos os seus dados pessoais com as seguintes bases legais:',
          '· Execução do contrato: o tratamento é necessário para prestar os serviços contratados.',
          '· Consentimento: para o tratamento de dados de saúde e a utilização de inteligência artificial, bem como para o envio de comunicações comerciais quando aplicável.',
          '· Interesse legítimo: para melhorar a Plataforma, prevenir fraudes e garantir a segurança dos serviços.',
          '· Obrigação legal: quando a lei aplicável nos exigir conservar ou comunicar determinados dados.'
        ]
      },
      {
        title: '5. Tratamento de dados de saúde',
        paragraphs: [
          'Os dados relativos à sua saúde constituem categorias especiais de dados. Só os tratamos com o seu consentimento explícito, exclusivamente com a finalidade de personalizar o seu programa de coaching.',
          'Estes dados são acessíveis apenas ao consultor que presta o serviço, ao pessoal autorizado da Plataforma e aos sistemas de inteligência artificial que geram as recomendações. Nunca são utilizados para fins publicitários nem cedidos a terceiros sem o seu consentimento.',
          'O consultor está contratualmente obrigado a tratar os seus dados de saúde com a máxima confidencialidade e a não os utilizar para fins distintos da prestação do serviço.'
        ]
      },
      {
        title: '6. Utilização de inteligência artificial',
        paragraphs: [
          'A Plataforma utiliza sistemas de inteligência artificial (IA) para analisar as informações do seu formulário de saúde e gerar recomendações personalizadas de nutrição e bem-estar.',
          'Estes sistemas processam os dados de forma automatizada sob a nossa supervisão. As recomendações são revistas pelo consultor antes de serem entregues, e não são tomadas decisões automatizadas com efeitos jurídicos significativos sobre si sem intervenção humana.',
          'Pode solicitar a qualquer momento informações sobre a utilização de IA no seu processo, bem como opor-se ou solicitar que uma pessoa reveja as decisões baseadas nestes sistemas.'
        ]
      },
      {
        title: '7. Destinatários dos dados',
        paragraphs: [
          'Partilhamos os seus dados pessoais exclusivamente com:'
        ],
        bullets: [
          'Provedores de pagamento (Stripe), apenas para processar as transações.',
          'Provedores de videoconferência (Google Meet, Zoom), para a realização das sessões.',
          'Provedores de hospedagem, e-mail, análise e inteligência artificial, que atuam como subcontratantes.',
          'Autoridades públicas e judiciais, quando exista obrigação legal.'
        ],
      },
      {
        title: '8. Transferências internacionais',
        paragraphs: [
          'A Plataforma opera principalmente dos Estados Unidos e os seus dados podem ser armazenados e processados em servidores localizados nos Estados Unidos ou noutros países.',
          'Quando transferimos dados para terceiros fora do seu país de residência, adotamos as garantias adequadas exigidas pela legislação aplicável, incluindo as cláusulas contratuais padrão da União Europeia quando aplicável.'
        ]
      },
      {
        title: '9. Conservação dos dados',
        paragraphs: [
          'Conservamos os seus dados pessoais apenas durante o tempo necessário para cumprir as finalidades descritas nesta Política, e durante os prazos exigidos pela lei aplicável.',
          'Quando termina a relação contratual, os dados do formulário de saúde são eliminados ou anonimizados, salvo se a lei exigir a sua conservação ou existir um procedimento legal em curso.'
        ]
      },
      {
        title: '10. Segurança dos dados',
        paragraphs: [
          'Implementamos medidas técnicas e organizacionais para proteger os seus dados pessoais, incluindo cifragem de dados em trânsito (TLS) e em repouso (AES-256), controlo de acesso autenticado e restrito por funções, monitorização da atividade e cópias de segurança.',
          'No entanto, nenhum sistema de transmissão ou armazenamento de dados é completamente seguro. Fazemos todos os esforços razoáveis para proteger as suas informações.'
        ]
      },
      {
        title: '11. Os seus direitos',
        paragraphs: [
          'Tem o direito de:'
        ],
        bullets: [
          'Aceder aos seus dados pessoais e obter uma cópia dos mesmos.',
          'Retificar dados inexatos ou incompletos.',
          'Solicitar a eliminação dos seus dados quando já não forem necessários.',
          'Opor-se ao tratamento ou solicitar a sua limitação.',
          'Solicitar a portabilidade dos seus dados.',
          'Retirar o seu consentimento em qualquer momento, sem afetar a licitude do tratamento anterior.',
          'Apresentar uma reclamação junto da autoridade de proteção de dados competente (na Califórnia, a California Privacy Protection Agency; na União Europeia, a autoridade do seu país de residência).'
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'A Plataforma utiliza cookies técnicos estritamente necessários ao funcionamento do site e cookies de preferências para recordar o seu idioma e configurações.',
          'Pode configurar o seu navegador para recusar ou eliminar cookies em qualquer momento; no entanto, algumas funcionalidades do site podem ser afetadas.'
        ]
      },
      {
        title: '13. Menores de idade',
        paragraphs: [
          'Os serviços da Plataforma destinam-se a pessoas maiores de 18 anos. Se o serviço for prestado a um menor, o formulário deve ser preenchido e autorizado pelo seu pai, mãe ou tutor legal, conforme o contrato de serviços.'
        ]
      },
      {
        title: '14. Alterações a esta Política',
        paragraphs: [
          'Podemos atualizar esta Política de Privacidade em qualquer momento. A versão em vigor será sempre publicada nesta página com a sua data de atualização.',
          'Se fizermos alterações significativas, notificaremos através da Plataforma ou por e-mail antes da sua entrada em vigor.'
        ]
      },
      {
        title: '15. Contacto',
        paragraphs: [
          'Se tiver perguntas sobre esta Política de Privacidade ou desejar exercer os seus direitos, contacte-nos em contact@nelhealthcoach.com, pelos telefones +1 (442) 342-5050 ou +1 (760) 980-5880, ou escrevendo para NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.'
        ]
      }
    ]
  },

  /* ==================== TERMOS E CONDIÇÕES (PT) ==================== */
  terms: {
    title: 'Termos e Condições',
    updated: 'Última atualização: 1 de agosto de 2026',
    sections: [
      {
        title: '1. Aceitação dos Termos',
        paragraphs: [
          'Estes Termos e Condições regulam o acesso e a utilização do site https://nelhealthcoach.com e da plataforma NELHEALTHCOACH (a "Plataforma"), operada pela NELHEALTHCOACH LLC, com sede em 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.',
          'Ao aceder à Plataforma ou utilizar qualquer um dos seus serviços, aceita estes Termos e Condições na sua versão em vigor. Se não concordar, não utilize a Plataforma.'
        ]
      },
      {
        title: '2. Descrição do serviço',
        paragraphs: [
          'A Plataforma liga clientes a consultores independentes de saúde e nutrição (os "Consultores") para a prestação de serviços de coaching personalizado, que incluem planos de alimentação, exercício e hábitos saudáveis.',
          'A Plataforma disponibiliza as ferramentas tecnológicas necessárias: formulário de saúde, geração de recomendações por inteligência artificial, gestão de pagamentos e marcação de sessões.',
          'Os Consultores são profissionais independentes, não funcionários da NELHEALTHCOACH. Cada Consultor é responsável pelos serviços que presta e pelo cumprimento das obrigações do seu contrato.'
        ]
      },
      {
        title: '3. Registo e contas',
        paragraphs: [
          'Para contratar os serviços, os clientes devem preencher o formulário de saúde e aceitar o contrato de serviços aplicável. Os Consultores devem registar-se como profissionais e aceitar o seu contrato de consultoria.',
          'Compromete-se a fornecer informações verdadeiras e atualizadas. É responsável por manter a confidencialidade das suas credenciais de acesso e por todas as atividades realizadas com a sua conta.'
        ]
      },
      {
        title: '4. Utilização aceitável',
        paragraphs: [
          'Ao utilizar a Plataforma, compromete-se a não:'
        ],
        bullets: [
          'Utilizá-la para fins ilícitos, fraudulentos ou contrários à boa-fé.',
          'Tentar aceder sem autorização a sistemas, contas ou dados de terceiros.',
          'Reproduzir, duplicar, copiar ou explorar comercialmente qualquer parte da Plataforma sem autorização.',
          'Introduzir vírus, malware ou qualquer tecnologia que possa danificar a Plataforma ou outros utilizadores.',
          'Suplantar a identidade de outras pessoas ou fornecer informações falsas.'
        ]
      },
      {
        title: '5. Os serviços não constituem aconselhamento médico',
        paragraphs: [
          'Os serviços oferecidos através da Plataforma são de coaching nutricional e bem-estar e NÃO constituem diagnóstico, tratamento, cura ou prevenção de qualquer doença, nem aconselhamento médico profissional.',
          'Se sofre de uma condição médica, toma medicação ou está grávida, consulte sempre o seu médico ou profissional de saúde antes de iniciar qualquer programa. Em caso de emergência médica, contacte os serviços de emergência da sua localidade.'
        ]
      },
      {
        title: '6. Pagamentos',
        paragraphs: [
          'Os preços dos serviços são mostrados antes da confirmação do pagamento. Os pagamentos são processados através da plataforma de pagamentos Stripe, sujeita aos seus próprios termos e condições.',
          'O preço aplicável será o preço publicado pelo Consultor ou, na sua ausência, o preço padrão da Plataforma. Ao confirmar o pagamento, autoriza a cobrança do valor correspondente ao seu plano.',
          'Os reembolsos e cancelamentos regem-se pelo contrato de serviços aplicável e pela lei em vigor.'
        ]
      },
      {
        title: '7. Sessões',
        paragraphs: [
          'As sessões de coaching têm a duração de 60 minutos e realizam-se mensalmente por videoconferência (Google Meet ou Zoom), salvo acordo diferente com o Consultor.',
          'As sessões podem ser canceladas ou remarcadas com pelo menos 24 horas de antecedência, sem cobrança.'
        ]
      },
      {
        title: '8. Propriedade intelectual',
        paragraphs: [
          'Todos os conteúdos da Plataforma (textos, gráficos, logótipos, imagens, software e materiais) são propriedade da NELHEALTHCOACH ou dos seus licenciantes e estão protegidos pelas leis de propriedade intelectual aplicáveis.',
          'As informações que fornece através do formulário de saúde são da sua propriedade. A Plataforma e o Consultor utilizam-nas apenas para prestar o serviço, em conformidade com a Política de Privacidade.'
        ]
      },
      {
        title: '9. Limitação de responsabilidade',
        paragraphs: [
          'A Plataforma é fornecida "tal como está" e "conforme disponibilidade". A NELHEALTHCOACH não garante que o serviço seja ininterrupto ou livre de erros.',
          'Na medida máxima permitida pela lei, a NELHEALTHCOACH não será responsável por danos indiretos, incidentais ou consequentes decorrentes da utilização da Plataforma ou dos serviços dos Consultores, e a sua responsabilidade total limita-se ao valor pago pelo cliente nos três meses anteriores ao facto que a origina.',
          'Os serviços prestados pelos Consultores são da responsabilidade exclusiva de cada Consultor.'
        ]
      },
      {
        title: '10. Suspensão e rescisão',
        paragraphs: [
          'A NELHEALTHCOACH pode suspender ou cancelar o acesso à Plataforma por incumprimento destes Termos, fraude ou conduta que coloque em risco outros utilizadores, sem prejuízo das demais ações legais aplicáveis.',
          'As cláusulas relativas à propriedade intelectual, limitação de responsabilidade, lei aplicável e resolução de litígios subsistirão após a rescisão.'
        ]
      },
      {
        title: '11. Lei aplicável e resolução de litígios',
        paragraphs: [
          'Estes Termos e Condições regem-se pelas leis do Estado da Califórnia, Estados Unidos.',
          'As partes concordam em tentar resolver de boa-fé qualquer litígio por mediação durante um período de 30 dias antes de recorrer aos tribunais. Os litígios que não possam ser resolvidos por mediação serão submetidos à jurisdição exclusiva dos tribunais do Estado da Califórnia.'
        ]
      },
      {
        title: '12. Modificações',
        paragraphs: [
          'Podemos modificar estes Termos e Condições em qualquer momento. A versão em vigor será publicada nesta página com a sua data de atualização.',
          'A utilização continuada da Plataforma após a publicação das alterações implica a aceitação dos novos Termos.'
        ]
      },
      {
        title: '13. Contacto',
        paragraphs: [
          'Para qualquer questão sobre estes Termos e Condições, contacte-nos em contact@nelhealthcoach.com ou na NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.'
        ]
      }
    ]
  },

  /* ==================== AVISO LEGAL (PT) ==================== */
  notice: {
    title: 'Aviso Legal',
    updated: 'Última atualização: 1 de agosto de 2026',
    sections: [
      {
        title: '1. Titular do site',
        paragraphs: [
          'Em conformidade com a legislação aplicável, o site https://nelhealthcoach.com é propriedade da NELHEALTHCOACH LLC, sociedade constituída no Estado da Califórnia, Estados Unidos, com sede em 33450 Shifting Sands Trail, Cathedral City, CA 92234.',
          'Dados de contacto: contact@nelhealthcoach.com · +1 (442) 342-5050 · +1 (760) 980-5880.'
        ]
      },
      {
        title: '2. Objeto',
        paragraphs: [
          'O presente Aviso Legal regula o acesso e a utilização do site, que tem como finalidade apresentar os serviços de coaching de saúde e nutrição da Plataforma e permitir a sua contratação.'
        ]
      },
      {
        title: '3. Propriedade intelectual e industrial',
        paragraphs: [
          'O nome "NELHEALTHCOACH", o logótipo, os textos, as imagens, os gráficos, a estrutura e todos os conteúdos do site estão protegidos por direitos de propriedade intelectual e industrial, titularidade da NELHEALTHCOACH LLC.',
          'É proibida a reprodução, distribuição ou transformação dos conteúdos sem autorização expressa e por escrito do titular.'
        ]
      },
      {
        title: '4. Exclusão de responsabilidade',
        paragraphs: [
          'A NELHEALTHCOACH não se responsabiliza pela má utilização dos conteúdos do site nem pelas consequências da sua aplicação, que têm caráter informativo.',
          'Os conteúdos do site não constituem aconselhamento médico profissional. Perante qualquer problema de saúde, consulte um profissional de saúde.',
          'A NELHEALTHCOACH não garante a disponibilidade contínua do site nem a ausência de erros, vírus ou danos decorrentes do seu acesso.'
        ]
      },
      {
        title: '5. Ligações externas',
        paragraphs: [
          'O site pode conter ligações a sites de terceiros (Stripe, Google Meet, Zoom, redes sociais). A NELHEALTHCOACH não controla nem assume qualquer responsabilidade pelos conteúdos, políticas ou práticas desses sites.'
        ]
      },
      {
        title: '6. Legislação aplicável',
        paragraphs: [
          'O presente Aviso Legal rege-se pelas leis do Estado da Califórnia, Estados Unidos. Para a resolução de qualquer litígio, as partes submetem-se à jurisdição dos tribunais do Estado da Califórnia.'
        ]
      },
      {
        title: '7. Contacto',
        paragraphs: [
          'Se tiver dúvidas sobre este Aviso Legal, pode escrever-nos para contact@nelhealthcoach.com ou para NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, Estados Unidos.'
        ]
      }
    ]
  },
  refunds: {
    title: 'Política de Reembolso e Cancelamento',
    updated: 'Outubro 2026',
    sections: [
      {
        title: '1. Direito de livre resolução e serviços digitais',
        paragraphs: [
          'Em conformidade com a Diretiva 2011/83/UE, o consumidor tem o direito de rescindir o contrato em 14 dias.',
          'O direito não se aplica após o início da prestação dos serviços personalizados (planos de saúde, análise por IA ou sessões 1 para 1) com o consentimento prévio do cliente.',
          'As assinaturas recorrentes podem ser canceladas a qualquer momento antes da renovação sem penalidades no painel ou por email para soporte@nelhealthcoach.com.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Política de Cookies e Rastreamento',
    updated: 'Outubro 2026',
    sections: [
      {
        title: '1. Gestão de cookies e conformidade RGPD',
        paragraphs: [
          'Utilizamos cookies técnicos essenciais para a segurança e funções da plataforma. Cookies analíticos e fingerprinting permanecem bloqueados até que o consentimento explícito seja concedido.',
          'Você pode alterar ou revogar suas preferências a qualquer momento no banner de cookies ou limpando os dados do navegador.'
        ]
      }
    ]
  },
};

const de: Record<LegalPageKey, LegalDocument> = {
  /* ==================== DATENSCHUTZERKLÄRUNG (DE) ==================== */
  privacy: {
    title: 'Datenschutzerklärung',
    updated: 'Zuletzt aktualisiert: 1. August 2026',
    sections: [
      {
        title: '1. Verantwortliche Stelle',
        paragraphs: [
          'NELHEALTHCOACH LLC (im Folgenden "NELHEALTHCOACH", "wir" oder "die Plattform"), mit Sitz in 33450 Shifting Sands Trail, Cathedral City, CA 92234, USA, ist die verantwortliche Stelle für die Verarbeitung personenbezogener Daten, die über die Website https://nelhealthcoach.com und die damit verbundenen Dienste erhoben werden.',
          'Bei Fragen zu dieser Datenschutzerklärung oder zur Verarbeitung Ihrer Daten können Sie uns unter contact@nelhealthcoach.com oder telefonisch unter +1 (442) 342-5050 (Spanisch) oder +1 (760) 980-5880 (Englisch) kontaktieren.'
        ]
      },
      {
        title: '2. Erhobene Daten',
        paragraphs: [
          'Wir erheben die folgenden Kategorien personenbezogener Daten:'
        ],
        bullets: [
          'Kontaktdaten: Name, E-Mail-Adresse und gegebenenfalls Telefonnummer.',
          'Daten aus dem Gesundheitsformular: Informationen über Ihren Gesundheitszustand, Ihre Krankengeschichte, Ernährungsgewohnheiten, Körpermaße, Ziele und Ihren Lebensstil, die Sie beim Ausfüllen des Formulars freiwillig angeben.',
          'Zahlungsdaten: werden sicher von unserem Zahlungsdienstleister Stripe verarbeitet. Wir speichern keine vollständigen Kreditkartennummern oder Bankdaten auf unseren Servern.',
          'Nutzungsdaten: Informationen darüber, wie Sie mit der Plattform interagieren (besuchte Seiten, Nutzungsdauer, Spracheinstellungen).',
          'Kommunikationsdaten: Nachrichten und Informationen, die Sie uns über das Kontaktformular oder per E-Mail senden.'
        ]
      },
      {
        title: '3. Zwecke der Verarbeitung',
        paragraphs: [
          'Wir verarbeiten Ihre personenbezogenen Daten für folgende Zwecke:'
        ],
        bullets: [
          'Erbringung des gebuchten Coaching- und Ernährungsberatungsdienstes, einschließlich der Erstellung personalisierter Empfehlungen.',
          'Abwicklung von Zahlungen und Verwaltung von Abonnements über Stripe.',
          'Kommunikation mit Ihnen über Ihr Programm, Ihre Sitzungen und Service-Updates.',
          'Analyse der Daten des Gesundheitsformulars mit Tools der künstlichen Intelligenz zur Erstellung personalisierter Empfehlungen, stets mit Ihrer vorherigen Einwilligung.',
          'Erfüllung unserer rechtlichen und vertraglichen Verpflichtungen.',
          'Verbesserung der Plattform, ihrer Sicherheit und der Benutzererfahrung.'
        ]
      },
      {
        title: '4. Rechtsgrundlagen der Verarbeitung',
        paragraphs: [
          'Wir verarbeiten Ihre personenbezogenen Daten auf folgenden Rechtsgrundlagen:',
          '· Vertragserfüllung: Die Verarbeitung ist zur Erbringung der gebuchten Dienste erforderlich.',
          '· Einwilligung: für die Verarbeitung von Gesundheitsdaten und die Nutzung künstlicher Intelligenz sowie gegebenenfalls für den Versand von Werbekommunikation.',
          '· Berechtigtes Interesse: zur Verbesserung der Plattform, zur Betrugsprävention und zur Gewährleistung der Servicesicherheit.',
          '· Rechtliche Verpflichtung: wenn das anwendbare Recht uns verpflichtet, bestimmte Daten aufzubewahren oder offenzulegen.'
        ]
      },
      {
        title: '5. Verarbeitung von Gesundheitsdaten',
        paragraphs: [
          'Daten über Ihre Gesundheit sind besondere Kategorien von Daten. Wir verarbeiten sie nur mit Ihrer ausdrücklichen Einwilligung, ausschließlich zum Zweck der Personalisierung Ihres Coaching-Programms.',
          'Diese Daten sind nur für den Berater, der den Dienst erbringt, das autorisierte Personal der Plattform und die Systeme der künstlichen Intelligenz, die die Empfehlungen erstellen, zugänglich. Sie werden niemals für Werbezwecke verwendet oder ohne Ihre Einwilligung an Dritte weitergegeben.',
          'Der Berater ist vertraglich verpflichtet, Ihre Gesundheitsdaten mit größter Vertraulichkeit zu behandeln und sie nicht für andere Zwecke als die Erbringung des Dienstes zu verwenden.'
        ]
      },
      {
        title: '6. Nutzung künstlicher Intelligenz',
        paragraphs: [
          'Die Plattform nutzt Systeme der künstlichen Intelligenz (KI), um die Informationen aus Ihrem Gesundheitsformular zu analysieren und personalisierte Ernährungs- und Wellness-Empfehlungen zu erstellen.',
          'Diese Systeme verarbeiten die Daten automatisiert unter unserer Aufsicht. Die Empfehlungen werden vor der Übergabe vom Berater geprüft, und es werden keine automatisierten Entscheidungen mit erheblichen rechtlichen Auswirkungen über Sie ohne menschliches Eingreifen getroffen.',
          'Sie können jederzeit Informationen über die Nutzung von KI in Ihrem Prozess anfordern, dieser widersprechen oder eine menschliche Überprüfung von Entscheidungen verlangen, die auf diesen Systemen basieren.'
        ]
      },
      {
        title: '7. Empfänger der Daten',
        paragraphs: [
          'Wir teilen Ihre personenbezogenen Daten ausschließlich mit:'
        ],
        bullets: [
          'Zahlungsdienstleistern (Stripe), ausschließlich zur Abwicklung von Transaktionen.',
          'Videokonferenz-Anbietern (Google Meet, Zoom) zur Durchführung der Sitzungen.',
          'Hosting-, E-Mail-, Analyse- und KI-Dienstleistern, die als Auftragsverarbeiter handeln.',
          'Öffentlichen und gerichtlichen Behörden, wenn dies gesetzlich vorgeschrieben ist.'
        ],
      },
      {
        title: '8. Internationale Übermittlungen',
        paragraphs: [
          'Die Plattform wird hauptsächlich von den USA aus betrieben, und Ihre Daten können auf Servern in den USA oder anderen Ländern gespeichert und verarbeitet werden.',
          'Wenn wir Daten an Dritte außerhalb Ihres Wohnsitzlandes übermitteln, ergreifen wir die geeigneten Garantien, die das anwendbare Recht verlangt, einschließlich der Standardvertragsklauseln der Europäischen Union, sofern anwendbar.'
        ]
      },
      {
        title: '9. Speicherdauer',
        paragraphs: [
          'Wir speichern Ihre personenbezogenen Daten nur so lange, wie es zur Erfüllung der in dieser Erklärung beschriebenen Zwecke erforderlich ist, sowie für die vom anwendbaren Recht geforderten Zeiträume.',
          'Wenn die Vertragsbeziehung endet, werden die Daten des Gesundheitsformulars gelöscht oder anonymisiert, es sei denn, das Gesetz verlangt ihre Aufbewahrung oder es läuft ein Gerichtsverfahren.'
        ]
      },
      {
        title: '10. Datensicherheit',
        paragraphs: [
          'Wir implementieren technische und organisatorische Maßnahmen zum Schutz Ihrer personenbezogenen Daten, einschließlich Verschlüsselung der Daten während der Übertragung (TLS) und im Ruhezustand (AES-256), authentifizierte rollenbasierte Zugriffskontrolle, Aktivitätsüberwachung und Sicherungskopien.',
          'Allerdings ist kein Übertragungs- oder Speichersystem vollständig sicher. Wir unternehmen alle angemessenen Anstrengungen, um Ihre Informationen zu schützen.'
        ]
      },
      {
        title: '11. Ihre Rechte',
        paragraphs: [
          'Sie haben das Recht auf:'
        ],
        bullets: [
          'Zugang zu Ihren personenbezogenen Daten und Erhalt einer Kopie.',
          'Berichtigung unrichtiger oder unvollständiger Daten.',
          'Löschung Ihrer Daten, wenn sie nicht mehr erforderlich sind.',
          'Widerspruch gegen die Verarbeitung oder Einschränkung der Verarbeitung.',
          'Datenübertragbarkeit.',
          'Jederzeitigen Widerruf Ihrer Einwilligung, ohne die Rechtmäßigkeit der bisherigen Verarbeitung zu beeinträchtigen.',
          'Beschwerde bei der zuständigen Datenschutzbehörde (in Kalifornien bei der California Privacy Protection Agency; in der Europäischen Union bei der Behörde Ihres Wohnsitzlandes).'
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'Die Plattform verwendet technisch notwendige Cookies für den Betrieb der Website sowie Präferenz-Cookies, um Ihre Sprache und Einstellungen zu speichern.',
          'Sie können Ihren Browser so konfigurieren, dass Cookies jederzeit abgelehnt oder gelöscht werden; einige Funktionen der Website könnten jedoch beeinträchtigt werden.'
        ]
      },
      {
        title: '13. Minderjährige',
        paragraphs: [
          'Die Dienste der Plattform richten sich an Personen über 18 Jahren. Wenn der Dienst einem Minderjährigen erbracht wird, muss das Formular von dessen Eltern oder gesetzlichem Vormund ausgefüllt und genehmigt werden, gemäß dem Dienstleistungsvertrag.'
        ]
      },
      {
        title: '14. Änderungen dieser Erklärung',
        paragraphs: [
          'Wir können diese Datenschutzerklärung jederzeit aktualisieren. Die aktuelle Version wird immer auf dieser Seite mit ihrem Aktualisierungsdatum veröffentlicht.',
          'Bei wesentlichen Änderungen informieren wir Sie über die Plattform oder per E-Mail, bevor sie in Kraft treten.'
        ]
      },
      {
        title: '15. Kontakt',
        paragraphs: [
          'Wenn Sie Fragen zu dieser Datenschutzerklärung haben oder Ihre Rechte ausüben möchten, kontaktieren Sie uns unter contact@nelhealthcoach.com, telefonisch unter +1 (442) 342-5050 oder +1 (760) 980-5880, oder per Post an NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, USA.'
        ]
      }
    ]
  },

  /* ==================== ALLGEMEINE GESCHÄFTSBEDINGUNGEN (DE) ==================== */
  terms: {
    title: 'Allgemeine Geschäftsbedingungen',
    updated: 'Zuletzt aktualisiert: 1. August 2026',
    sections: [
      {
        title: '1. Annahme der Bedingungen',
        paragraphs: [
          'Diese Allgemeinen Geschäftsbedingungen regeln den Zugang zur und die Nutzung der Website https://nelhealthcoach.com und der Plattform NELHEALTHCOACH (die "Plattform"), betrieben von NELHEALTHCOACH LLC, mit Sitz in 33450 Shifting Sands Trail, Cathedral City, CA 92234, USA.',
          'Durch den Zugriff auf die Plattform oder die Nutzung eines ihrer Dienste akzeptieren Sie diese Allgemeinen Geschäftsbedingungen in ihrer aktuellen Fassung. Wenn Sie nicht einverstanden sind, nutzen Sie die Plattform nicht.'
        ]
      },
      {
        title: '2. Beschreibung der Dienste',
        paragraphs: [
          'Die Plattform verbindet Kunden mit unabhängigen Gesundheits- und Ernährungsberatern (die "Berater") für die Erbringung personalisierter Coaching-Dienstleistungen, einschließlich Ernährungs-, Bewegungs- und Gewohnheitsplänen.',
          'Die Plattform stellt die erforderlichen technologischen Werkzeuge bereit: Gesundheitsformular, KI-gestützte Empfehlungen, Zahlungsverwaltung und Terminbuchung.',
          'Die Berater sind unabhängige Fachleute und keine Angestellten von NELHEALTHCOACH. Jeder Berater ist für die von ihm erbrachten Dienste und die Einhaltung der Verpflichtungen seines Vertrags verantwortlich.'
        ]
      },
      {
        title: '3. Registrierung und Konten',
        paragraphs: [
          'Zur Buchung von Diensten müssen Kunden das Gesundheitsformular ausfüllen und den geltenden Dienstleistungsvertrag akzeptieren. Berater müssen sich als Fachleute registrieren und ihren Beratervertrag akzeptieren.',
          'Sie verpflichten sich, wahrheitsgemäße und aktuelle Informationen bereitzustellen. Sie sind für die Vertraulichkeit Ihrer Zugangsdaten und für alle mit Ihrem Konto durchgeführten Aktivitäten verantwortlich.'
        ]
      },
      {
        title: '4. Zulässige Nutzung',
        paragraphs: [
          'Bei der Nutzung der Plattform verpflichten Sie sich, nicht:'
        ],
        bullets: [
          'Sie für rechtswidrige, betrügerische oder gegen Treu und Glauben verstoßende Zwecke zu nutzen.',
          'Unbefugt auf Systeme, Konten oder Daten Dritter zuzugreifen.',
          'Teile der Plattform ohne Genehmigung zu reproduzieren, zu duplizieren, zu kopieren oder kommerziell zu nutzen.',
          'Viren, Malware oder Technologien einzuschleusen, die die Plattform oder andere Nutzer schädigen könnten.',
          'Sich als andere Personen auszugeben oder falsche Informationen bereitzustellen.'
        ]
      },
      {
        title: '5. Die Dienste sind keine medizinische Beratung',
        paragraphs: [
          'Die über die Plattform angebotenen Dienste sind Ernährungs- und Wellness-Coaching und stellen KEINE Diagnose, Behandlung, Heilung oder Vorbeugung von Krankheiten und keine professionelle medizinische Beratung dar.',
          'Wenn Sie an einer Erkrankung leiden, Medikamente einnehmen oder schwanger sind, konsultieren Sie vor Beginn eines Programms immer Ihren Arzt oder Gesundheitsdienstleister. Bei einem medizinischen Notfall kontaktieren Sie die Notdienste Ihres Wohnorts.'
        ]
      },
      {
        title: '6. Zahlungen',
        paragraphs: [
          'Die Preise der Dienste werden vor der Bestätigung der Zahlung angezeigt. Die Zahlungen werden über das Zahlungsgateway Stripe abgewickelt, das seinen eigenen Bedingungen unterliegt.',
          'Der anwendbare Preis ist der vom Berater veröffentlichte Preis oder, falls keiner vorhanden ist, der Standardpreis der Plattform. Mit der Bestätigung der Zahlung ermächtigen Sie die Belastung des Ihrem Plan entsprechenden Betrags.',
          'Erstattungen und Stornierungen richten sich nach dem geltenden Dienstleistungsvertrag und dem geltenden Recht.'
        ]
      },
      {
        title: '7. Sitzungen',
        paragraphs: [
          'Coaching-Sitzungen dauern 60 Minuten und finden monatlich per Videokonferenz (Google Meet oder Zoom) statt, sofern mit dem Berater nichts anderes vereinbart wurde.',
          'Sitzungen können mit mindestens 24 Stunden Vorlauf kostenlos storniert oder verschoben werden.'
        ]
      },
      {
        title: '8. Geistiges Eigentum',
        paragraphs: [
          'Alle Inhalte der Plattform (Texte, Grafiken, Logos, Bilder, Software und Materialien) sind Eigentum von NELHEALTHCOACH oder seiner Lizenzgeber und durch die anwendbaren Gesetze zum geistigen Eigentum geschützt.',
          'Die Informationen, die Sie über das Gesundheitsformular bereitstellen, sind Ihr Eigentum. Die Plattform und der Berater verwenden sie ausschließlich zur Erbringung des Dienstes, gemäß der Datenschutzerklärung.'
        ]
      },
      {
        title: '9. Haftungsbeschränkung',
        paragraphs: [
          'Die Plattform wird "wie besehen" und "nach Verfügbarkeit" bereitgestellt. NELHEALTHCOACH übernimmt keine Garantie für einen ununterbrochenen oder fehlerfreien Betrieb.',
          'Im gesetzlich maximal zulässigen Umfang haftet NELHEALTHCOACH nicht für indirekte, zufällige oder Folgeschäden, die aus der Nutzung der Plattform oder der Dienste der Berater entstehen, und die Gesamthaftung ist auf den Betrag begrenzt, den der Kunde in den drei Monaten vor dem auslösenden Ereignis gezahlt hat.',
          'Die von den Beratern erbrachten Dienste liegen in der alleinigen Verantwortung des jeweiligen Beraters.'
        ]
      },
      {
        title: '10. Sperrung und Kündigung',
        paragraphs: [
          'NELHEALTHCOACH kann den Zugang zur Plattform bei Verstoß gegen diese Bedingungen, Betrug oder Verhalten, das andere Nutzer gefährdet, sperren oder kündigen, unbeschadet weiterer rechtlicher Schritte.',
          'Die Klauseln zu geistigem Eigentum, Haftungsbeschränkung, anwendbarem Recht und Streitbeilegung überdauern die Kündigung.'
        ]
      },
      {
        title: '11. Anwendbares Recht und Streitbeilegung',
        paragraphs: [
          'Diese Allgemeinen Geschäftsbedingungen unterliegen dem Recht des Bundesstaates Kalifornien, USA.',
          'Die Parteien vereinbaren, jede Streitigkeit 30 Tage lang nach Treu und Glauben durch Mediation zu lösen, bevor sie die Gerichte anrufen. Streitigkeiten, die nicht durch Mediation gelöst werden können, unterliegen der ausschließlichen Zuständigkeit der Gerichte des Bundesstaates Kalifornien.'
        ]
      },
      {
        title: '12. Änderungen',
        paragraphs: [
          'Wir können diese Allgemeinen Geschäftsbedingungen jederzeit ändern. Die aktuelle Fassung wird mit ihrem Aktualisierungsdatum auf dieser Seite veröffentlicht.',
          'Die fortgesetzte Nutzung der Plattform nach Veröffentlichung von Änderungen gilt als Annahme der neuen Bedingungen.'
        ]
      },
      {
        title: '13. Kontakt',
        paragraphs: [
          'Bei Fragen zu diesen Allgemeinen Geschäftsbedingungen kontaktieren Sie uns unter contact@nelhealthcoach.com oder unter NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, USA.'
        ]
      }
    ]
  },

  /* ==================== IMPRESSUM (DE) ==================== */
  notice: {
    title: 'Impressum',
    updated: 'Zuletzt aktualisiert: 1. August 2026',
    sections: [
      {
        title: '1. Betreiber der Website',
        paragraphs: [
          'Gemäß der geltenden Gesetzgebung wird mitgeteilt, dass die Website https://nelhealthcoach.com von NELHEALTHCOACH LLC betrieben wird, einer Gesellschaft mit Sitz im Bundesstaat Kalifornien, USA, mit eingetragenem Sitz in 33450 Shifting Sands Trail, Cathedral City, CA 92234.',
          'Kontaktdaten: contact@nelhealthcoach.com · +1 (442) 342-5050 · +1 (760) 980-5880.'
        ]
      },
      {
        title: '2. Zweck',
        paragraphs: [
          'Dieses Impressum regelt den Zugang zur und die Nutzung der Website, deren Zweck es ist, die Gesundheits- und Ernährungs-Coaching-Dienste der Plattform vorzustellen und deren Buchung zu ermöglichen.'
        ]
      },
      {
        title: '3. Geistiges und gewerbliches Eigentum',
        paragraphs: [
          'Der Name "NELHEALTHCOACH", das Logo, die Texte, Bilder, Grafiken, die Struktur und alle Inhalte der Website sind durch Rechte des geistigen und gewerblichen Eigentums geschützt, die bei NELHEALTHCOACH LLC liegen.',
          'Die Vervielfältigung, Verbreitung oder Bearbeitung der Inhalte ist ohne ausdrückliche schriftliche Genehmigung des Inhabers untersagt.'
        ]
      },
      {
        title: '4. Haftungsausschluss',
        paragraphs: [
          'NELHEALTHCOACH übernimmt keine Haftung für die missbräuchliche Nutzung der Website-Inhalte oder für die Folgen ihrer Anwendung, die informativen Charakter haben.',
          'Die Inhalte der Website stellen keine professionelle medizinische Beratung dar. Bei gesundheitlichen Problemen wenden Sie sich an einen Arzt.',
          'NELHEALTHCOACH übernimmt keine Gewähr für die ständige Verfügbarkeit der Website oder das Fehlen von Fehlern, Viren oder Schäden, die durch den Zugriff entstehen.'
        ]
      },
      {
        title: '5. Externe Links',
        paragraphs: [
          'Die Website kann Links zu Websites Dritter enthalten (Stripe, Google Meet, Zoom, soziale Netzwerke). NELHEALTHCOACH kontrolliert diese Websites nicht und übernimmt keine Verantwortung für deren Inhalte, Richtlinien oder Praktiken.'
        ]
      },
      {
        title: '6. Anwendbares Recht',
        paragraphs: [
          'Dieses Impressum unterliegt dem Recht des Bundesstaates Kalifornien, USA. Für die Beilegung von Streitigkeiten unterwerfen sich die Parteien der Zuständigkeit der Gerichte des Bundesstaates Kalifornien.'
        ]
      },
      {
        title: '7. Kontakt',
        paragraphs: [
          'Bei Fragen zu diesem Impressum schreiben Sie uns an contact@nelhealthcoach.com oder an NELHEALTHCOACH LLC, 33450 Shifting Sands Trail, Cathedral City, CA 92234, USA.'
        ]
      }
    ]
  },
  refunds: {
    title: 'Rückerstattungsrichtlinie',
    updated: 'October 2026',
    sections: [
      {
        title: '1. Widerrufsrecht und digitale Dienste',
        paragraphs: [
          'NelHealthCoach complies with EU consumer laws (Directive 2011/83/EU). Personalized health plans and AI-generated coaching recommendations initiated with express consent are exempt from statutory withdrawal upon commencement.',
          'Subscription renewals can be canceled anytime before the next billing cycle without fee via dashboard or email to soporte@nelhealthcoach.com.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Cookie-Richtlinie',
    updated: 'October 2026',
    sections: [
      {
        title: '1. Cookies und Tracking',
        paragraphs: [
          'We strictly respect GDPR & ePrivacy. Essential cookies ensure secure platform access and language settings. Analytics cookies and device fingerprinting are blocked until explicit consent is given.',
          'You can review or revoke your choices at any time via the cookie banner or browser settings.'
        ]
      }
    ]
  },
};

export const legalContent: Record<string, Record<LegalPageKey, LegalDocument>> = {
  es,
  en,
  fr,
  it,
  pt,
  de
};

/** Idiomas soportados en el mismo orden que el resto de la plataforma */
export const LEGAL_LANGUAGES = ['es', 'en', 'fr', 'it', 'pt', 'de'] as const;

/** Etiqueta del botón "volver al inicio" por idioma */
export const backLabels: Record<string, string> = {
  es: 'Volver al inicio',
  en: 'Back to Home',
  fr: "Retour à l'accueil",
  it: 'Torna alla home',
  pt: 'Voltar ao início',
  de: 'Zurück zur Startseite'
};

/** Normaliza un código de idioma (ej. 'es-ES' -> 'es') y hace fallback a 'es' */
export function normalizeLegalLang(lang: string | undefined): string {
  if (!lang) return 'es';
  const base = lang.split('-')[0].toLowerCase();
  return LEGAL_LANGUAGES.includes(base as (typeof LEGAL_LANGUAGES)[number]) ? base : 'es';
}
