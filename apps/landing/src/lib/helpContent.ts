/**
 * Contenido del Centro de Ayuda y Preguntas Frecuentes (/ayuda) en los 6 idiomas
 * de la plataforma: es, en, fr, it, pt, de.
 *
 * Canal exclusivo de soporte para casos extremos desde el Centro de Ayuda:
 * support@nelhealthcoach.com (sin atención por WhatsApp en esta sección).
 */

export type HelpLang = 'es' | 'en' | 'fr' | 'it' | 'pt' | 'de';

export type HelpCategoryId =
  | 'all'
  | 'plans'
  | 'onboarding'
  | 'videocalls'
  | 'libraries'
  | 'billing';

export interface HelpFaqItem {
  id: string;
  category: Exclude<HelpCategoryId, 'all'>;
  question: string;
  answer: string;
  bullets?: string[];
}

export interface HelpPageCopy {
  seoTitle: string;
  seoDescription: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  clearSearch: string;
  resultsCountLabel: string;
  noResultsTitle: string;
  noResultsDescription: string;
  resetFilters: string;
  categories: Record<HelpCategoryId, string>;
  faqs: HelpFaqItem[];
  supportBlock: {
    badge: string;
    title: string;
    description: string;
    noWhatsappNotice: string;
    checklistTitle: string;
    checklistItems: string[];
    emailLabel: string;
    emailAddress: string;
    emailSubject: string;
    ctaLabel: string;
    responseNote: string;
  };
  bottomCta: {
    title: string;
    subtitle: string;
    backToHome: string;
    viewPlans: string;
    loginPortal: string;
  };
}

export const SUPPORT_EMAIL = 'support@nelhealthcoach.com';

const es: HelpPageCopy = {
  seoTitle: 'Centro de Ayuda y Preguntas Frecuentes | NELHEALTHCOACH',
  seoDescription:
    'Resuelve dudas sobre planes de coaching, registro OTP, videollamadas en tu zona horaria, bibliotecas, escáner nutricional y soporte por correo en NELHEALTHCOACH.',
  heroBadge: 'Centro de Ayuda Oficial',
  heroTitle: '¿En qué podemos ayudarte?',
  heroSubtitle:
    'Encuentra respuestas claras sobre nuestros programas de nutrición ancestral y metabólica, tu portal de cliente, videollamadas y facturación.',
  searchLabel: 'Buscar en el Centro de Ayuda',
  searchPlaceholder: 'Buscar por tema: zonas horarias, OTP, recetas, escáner, reembolso...',
  clearSearch: 'Limpiar búsqueda',
  resultsCountLabel: 'preguntas disponibles',
  noResultsTitle: 'No encontramos preguntas que coincidan con tu búsqueda',
  noResultsDescription:
    'Prueba con otras palabras clave o restablece el filtro de categoría para ver todas las respuestas.',
  resetFilters: 'Ver todas las preguntas',
  categories: {
    all: 'Todas',
    plans: 'Planes y Precios',
    onboarding: 'Registro y Documentos',
    videocalls: 'Videollamadas y Horarios',
    libraries: 'Bibliotecas y Escáner',
    billing: 'Pagos y Cancelación',
  },
  faqs: [
    {
      id: 'plans-comparison',
      category: 'plans',
      question: '¿Qué programas ofrece NELHEALTHCOACH y qué incluye cada uno?',
      answer:
        'Contamos con 5 opciones comerciales diseñadas para distintas etapas de acompañamiento junto a Manuel Martínez:',
      bullets: [
        'Consulta Privada 1 a 1 ($60 USD · 45 min): sesión diagnóstica puntual por videollamada sin necesidad de crear cuenta completa.',
        'Reto 3S NEL ($97 USD · 3 semanas): programa intensivo en portal web, guía PDF, fases semanales progresivas, WhatsApp de seguimiento y 1 videollamada de cierre.',
        'Plan 1 — Reinicio Metabólico ($150 USD · 1 mes): protocolo base en portal web, WhatsApp semanal asincrónico y 2 videollamadas 1 a 1 (inicial y cierre).',
        'Plan 2 — Transformación Celular ($340 USD · 3 meses): portal completo, WhatsApp directo, 4 videollamadas 1 a 1 (1 inicial + 1 mensual), 15 recetas y 15 ejercicios en solo lectura, y hasta 5 análisis mensuales en el Escáner Nutricional con IA.',
        'Plan 3 — Maestría y Longevidad ($590 USD · 6 meses): canal prioritario en WhatsApp, 7 videollamadas 1 a 1 (1 inicial + 1 mensual), acceso completo en solo lectura a todas las recetas y ejercicios, y hasta 30 análisis mensuales en el Escáner Nutricional.',
      ],
    },
    {
      id: 'plans-upgrade-downgrade',
      category: 'plans',
      question: '¿Qué conservo si subo o bajo de plan al renovar?',
      answer:
        'Tu historial clínico, tus evaluaciones médicas previas y todas las recomendaciones de salud que ya hayan sido aprobadas para ti se conservan siempre en tu portal. Sin embargo, las herramientas adicionales dependen estrictamente del plan que tengas activo en ese momento:',
      bullets: [
        'Si pasas del Plan 2 o Plan 3 hacia el Plan 1 o el Reto 3S NEL, mantienes tu historial y recomendaciones previas, pero el acceso a las bibliotecas de Recetas, Ejercicios y Escáner Nutricional deja de estar disponible hasta volver a activar un plan compatible.',
        'Si subes de Plan 1 a Plan 2 o Plan 3, se desbloquean de inmediato las bibliotecas y el escáner nutricional según las cuotas de tu nuevo plan.',
      ],
    },
    {
      id: 'plans-quotas',
      category: 'plans',
      question: '¿Por qué un plan muestra "Cupos no disponibles"?',
      answer:
        'Para garantizar acompañamiento cercano y supervisión humana real de cada recomendación, Manuel Martínez limita el número de plazas activas por programa. Cuando un plan alcanza su cupo mensual, el botón se bloquea automáticamente hasta que se liberen nuevos lugares.',
    },
    {
      id: 'onboarding-otp',
      category: 'onboarding',
      question: '¿Cómo funciona el registro con código OTP de 6 dígitos?',
      answer:
        'Al elegir el Reto 3S NEL o cualquiera de los Planes 1, 2 o 3, creas tu cuenta en el Portal con una contraseña segura (mínimo 12 caracteres, combinando mayúsculas, minúsculas, números y símbolos) y recibes un código de verificación de 6 dígitos en tu correo con 15 minutos de vigencia. La Consulta 1 a 1 no requiere registro de cuenta.',
    },
    {
      id: 'onboarding-health-form',
      category: 'onboarding',
      question: '¿Qué debo hacer justo después de completar el pago?',
      answer:
        'Al confirmar tu pago en Stripe, entra a tu Portal en la sección Inicio (/dashboard). Si aún no has completado tu historial clínico, verás el formulario de salud integrado para indicar tus datos, hábitos, país/ciudad y objetivos. Ese paso desbloquea el análisis personalizado de tu asesor.',
    },
    {
      id: 'onboarding-documents',
      category: 'onboarding',
      question: '¿Qué archivos clínicos puedo subir y cómo descargo mis recomendaciones?',
      answer:
        'Dentro de tu formulario o en tu perfil (/dashboard/my-profile) puedes adjuntar análisis de laboratorio o estudios médicos en formato PDF, JPG, PNG, WEBP, DOC o DOCX (hasta 10 MB por archivo). Cuando tu asesor revise y apruebe tus recomendaciones, podrás leerlas en modo solo lectura dentro del portal y descargarlas en PDF en tu idioma.',
    },
    {
      id: 'videocalls-timezones',
      category: 'videocalls',
      question: '¿Cómo se calculan las fechas y la zona horaria de mis videollamadas?',
      answer:
        'Las fechas de tus sesiones se proyectan desde tu inscripción o las confirma directamente tu asesor. Para evitar confusiones entre países, cada invitación y recordatorio por correo muestra siempre ambos horarios: la hora oficial de Manuel Martínez en California (America/Los_Angeles) y tu horario local detectado a partir de tu dirección o navegador.',
    },
    {
      id: 'videocalls-join-window',
      category: 'videocalls',
      question: '¿Cuándo se activa el botón "Unirse a Videollamada"?',
      answer:
        'Por seguridad y control de agenda, el acceso a la sala de videollamada (en tu portal o mediante el enlace recibido por correo) permanece deshabilitado hasta exactamente 15 minutos antes de la hora programada. En cuanto falten 15 minutos o menos, el botón se activará en color verde para entrar.',
    },
    {
      id: 'videocalls-consent',
      category: 'videocalls',
      question: '¿Por qué me piden consentimiento antes de entrar a la videollamada?',
      answer:
        'En cumplimiento con el RGPD y la normativa de California (Cal. Penal Code § 632), antes de ingresar a la sala WebRTC te solicitamos consentimiento expreso para la posible grabación cifrada y transcripción clínica asistida de la sesión, garantizando máxima privacidad sobre tus datos de salud.',
    },
    {
      id: 'libraries-access',
      category: 'libraries',
      question: '¿Quién tiene acceso a Recetas, Ejercicios y Escáner Nutricional?',
      answer:
        'Las bibliotecas de recetas ancestrales, ejercicios funcionales y el Escáner Nutricional con IA están diseñados exclusivamente para clientes con Plan 2 o Plan 3 activos en modo solo lectura:',
      bullets: [
        'Plan 2 (Transformación Celular): acceso de lectura a 15 recetas y 15 ejercicios publicados + hasta 5 escaneos nutricionales por foto al mes.',
        'Plan 3 (Maestría y Longevidad): acceso de lectura al catálogo completo de recetas y ejercicios publicados + hasta 30 escaneos nutricionales por foto al mes.',
        'Consulta 1 a 1, Reto 3S NEL y Plan 1 no incluyen acceso a bibliotecas ni al escáner para mantener el foco en su protocolo base.',
      ],
    },
    {
      id: 'libraries-scanner-formats',
      category: 'libraries',
      question: '¿Cómo funciona el Escáner Nutricional por fotografía?',
      answer:
        'Desde la sección Escáner Nutricional (/dashboard/scanner) puedes tomar o subir una fotografía nítida de tu platillo en formato JPG, PNG, WEBP o GIF (máximo 10 MB). Nuestra IA estima el desglose nutricional por porción y el perfil metabólico evolutivo descontando 1 crédito de tu cuota mensual vigente.',
    },
    {
      id: 'billing-accumulation',
      category: 'billing',
      question: 'Si renuevo o cambio de plan antes de terminar, ¿se acumulan mis meses y videollamadas?',
      answer:
        'Sí. Todos los pagos se procesan de forma segura con Stripe Checkout. Si renuevas o contratas un nuevo programa mientras tienes saldo pendiente, el sistema suma automáticamente tus meses restantes y las sesiones de videollamada disponibles sin hacerte perder lo que ya habías adquirido.',
    },
    {
      id: 'billing-cancellation',
      category: 'billing',
      question: '¿Cómo cancelo o solicito un reembolso si tengo un problema técnico?',
      answer:
        'Si gestionas una suscripción periódica, puedes cancelar la renovación en cualquier momento sin penalizaciones antes del próximo ciclo desde tu portal o escribiendo a support@nelhealthcoach.com. Los reembolsos completos aplican únicamente ante cobros duplicados verificados o fallos técnicos imputables a la plataforma según nuestra Política de Reembolsos (/reembolsos).',
    },
    {
      id: 'billing-no-whatsapp',
      category: 'billing',
      question: '¿Puedo recibir soporte técnico de este Centro de Ayuda por WhatsApp?',
      answer:
        'No. En el Centro de Ayuda público no ofrecemos atención por WhatsApp. El seguimiento por WhatsApp está reservado exclusivamente para clientes activos dentro de los programas que lo incluyen. Ante incidencias técnicas urgentes, problemas de acceso OTP o casos extremos de facturación, escríbenos directamente a support@nelhealthcoach.com.',
    },
  ],
  supportBlock: {
    badge: 'Atención Exclusiva por Correo · Casos Extremos',
    title: '¿Sigues teniendo un inconveniente urgente?',
    description:
      'Si no lograste resolver tu duda en las preguntas anteriores, te falló un pago en Stripe o estás bloqueado para entrar a tu cuenta o videollamada, contáctanos por correo electrónico.',
    noWhatsappNotice:
      'Importante: El Centro de Ayuda no cuenta con soporte vía WhatsApp. Toda asistencia técnica o de casos extremos se atiende únicamente por correo.',
    checklistTitle: 'Para ayudarte más rápido, incluye en tu mensaje:',
    checklistItems: [
      'Tu correo electrónico registrado en NELHEALTHCOACH.',
      'El plan contratado y, si aplica, la fecha/hora de tu sesión.',
      'Una breve descripción del error o captura de pantalla.',
    ],
    emailLabel: 'Correo oficial de soporte:',
    emailAddress: SUPPORT_EMAIL,
    emailSubject: 'Soporte urgente - NELHEALTHCOACH',
    ctaLabel: 'Escribir a support@nelhealthcoach.com',
    responseNote: 'Horario de revisión de casos extremos: Lunes a Viernes (zona horaria California, PST/PDT).',
  },
  bottomCta: {
    title: '¿Listo para continuar tu proceso?',
    subtitle: 'Vuelve a la página principal, compara nuestros programas o accede directamente a tu portal.',
    backToHome: 'Volver al Inicio',
    viewPlans: 'Ver Planes',
    loginPortal: 'Iniciar Sesión en el Portal',
  },
};

const en: HelpPageCopy = {
  seoTitle: 'Help Center & Frequently Asked Questions | NELHEALTHCOACH',
  seoDescription:
    'Find clear answers about coaching plans, 6-digit OTP registration, dual-timezone video calls, read-only libraries, nutrition scanner, billing, and email support.',
  heroBadge: 'Official Help Center',
  heroTitle: 'How can we help you?',
  heroSubtitle:
    'Clear answers about our evolutionary & metabolic nutrition programs, your client portal, video consultations, and billing.',
  searchLabel: 'Search Help Center',
  searchPlaceholder: 'Search by topic: time zones, OTP, recipes, scanner, refund...',
  clearSearch: 'Clear search',
  resultsCountLabel: 'questions available',
  noResultsTitle: 'No questions match your search',
  noResultsDescription:
    'Try different keywords or reset the category filter to view all help topics.',
  resetFilters: 'View all questions',
  categories: {
    all: 'All',
    plans: 'Plans & Pricing',
    onboarding: 'Signup & Documents',
    videocalls: 'Video Calls & Time Zones',
    libraries: 'Libraries & Scanner',
    billing: 'Billing & Cancellation',
  },
  faqs: [
    {
      id: 'plans-comparison',
      category: 'plans',
      question: 'Which coaching programs does NELHEALTHCOACH offer and what does each include?',
      answer:
        'We offer 5 structured options tailored to different stages of coaching with Manuel Martínez:',
      bullets: [
        '1-on-1 Private Consultation ($60 USD · 45 min): standalone diagnostic video session with instant booking and no full account required.',
        '3S NEL Challenge ($97 USD · 3 weeks): web portal, PDF guide, 3 progressive weekly phases, WhatsApp support, and 1 closing video call.',
        'Plan 1 — Metabolic Reset ($150 USD · 1 month): foundational protocol in the portal, weekly asynchronous WhatsApp support, and 2 1-on-1 video calls (initial + closing).',
        'Plan 2 — Cellular Transformation ($340 USD · 3 months): full portal, direct WhatsApp, 4 1-on-1 video calls (1 initial + 1 monthly), 15 recipes & 15 exercises (read-only), plus up to 5 AI Nutrition Scanner analyses/month.',
        'Plan 3 — Mastery & Longevity ($590 USD · 6 months): priority WhatsApp channel, 7 1-on-1 video calls (1 initial + 1 monthly), full read-only Recipes & Exercises libraries, plus up to 30 AI Nutrition Scanner analyses/month.',
      ],
    },
    {
      id: 'plans-upgrade-downgrade',
      category: 'plans',
      question: 'What happens to my data and features if I upgrade or downgrade my plan?',
      answer:
        'Your clinical history, prior health assessments, and already-approved health recommendations are always preserved in your portal. However, extra tools depend strictly on your currently active plan:',
      bullets: [
        'If you downgrade from Plan 2 or Plan 3 to Plan 1 or 3S NEL Challenge, you keep your history and past recommendations, while access to Recipes, Exercises, and the Nutrition Scanner turns off unless a compatible plan is active.',
        'If you upgrade from Plan 1 to Plan 2 or Plan 3, read-only libraries and your monthly Nutrition Scanner quota unlock immediately.',
      ],
    },
    {
      id: 'plans-quotas',
      category: 'plans',
      question: 'Why does a plan show "No spots available"?',
      answer:
        'To ensure attentive human oversight and high-quality 1-on-1 guidance, Manuel Martínez sets active capacity limits per program. When a plan reaches its quota, enrollment pauses automatically until new spots open.',
    },
    {
      id: 'onboarding-otp',
      category: 'onboarding',
      question: 'How do account registration and the 6-digit OTP code work?',
      answer:
        'When selecting 3S NEL Challenge or Plans 1, 2, or 3, you register in the Portal with a strong password (12+ characters including uppercase, lowercase, numbers, and symbols) and verify your email using a 6-digit OTP code valid for 15 minutes. The 1-on-1 Consultation does not require creating an account.',
    },
    {
      id: 'onboarding-health-form',
      category: 'onboarding',
      question: 'What should I do right after completing payment?',
      answer:
        'After completing Stripe Checkout, open Home (/dashboard) in your Client Portal. If your health profile is still pending, you will see the embedded Health Form to share your history, habits, country/city, and goals so your coach can prepare your recommendations.',
    },
    {
      id: 'onboarding-documents',
      category: 'onboarding',
      question: 'Which medical files can I upload and how do I download recommendations?',
      answer:
        'In the Health Form or My Profile (/dashboard/my-profile), you can upload lab results or clinical documents in PDF, JPG, PNG, WEBP, DOC, or DOCX (up to 10 MB per file). Once your advisor reviews and approves your plan, you can view it read-only in the portal and download a PDF in any of our 6 languages.',
    },
    {
      id: 'videocalls-timezones',
      category: 'videocalls',
      question: 'How are video call dates and time zones calculated?',
      answer:
        'Included sessions are projected from your enrollment date or confirmed by your coach. To prevent time-zone mix-ups, every email invite and reminder displays both Manuel Martínez’s California time (America/Los_Angeles) and your local time zone inferred from your address/country or browser.',
    },
    {
      id: 'videocalls-join-window',
      category: 'videocalls',
      question: 'When does the "Join Video Call" button unlock?',
      answer:
        'For scheduling integrity and security, the video room entry button (in your portal and email link) remains disabled until 15 minutes before the scheduled start time. At 15 minutes prior or closer, it automatically turns green so you can enter.',
    },
    {
      id: 'videocalls-consent',
      category: 'videocalls',
      question: 'Why am I asked for consent before joining the video call room?',
      answer:
        'To comply with GDPR and California privacy law (Cal. Penal Code § 632), we ask for your explicit consent before connecting to LiveKit WebRTC audio/recording or Deepgram clinical transcription.',
    },
    {
      id: 'libraries-access',
      category: 'libraries',
      question: 'Who gets access to Recipes, Exercises, and the AI Nutrition Scanner?',
      answer:
        'Read-only access to the evolutionary Recipes & Exercises libraries and the AI Meal Scanner is exclusively unlocked on active Plan 2 and Plan 3:',
      bullets: [
        'Plan 2 (Cellular Transformation): read-only access to 15 published recipes and 15 published exercises + up to 5 photo nutrition scans per month.',
        'Plan 3 (Mastery & Longevity): read-only access to the entire published Recipes and Exercises catalog + up to 30 photo nutrition scans per month.',
        '1-on-1 Consultation, 3S NEL Challenge, and Plan 1 focus strictly on their personalized core protocol without library or scanner access.',
      ],
    },
    {
      id: 'libraries-scanner-formats',
      category: 'libraries',
      question: 'How does the AI photo Nutrition Scanner work?',
      answer:
        'Inside Nutrition Scanner (/dashboard/scanner), upload or snap a clear meal photo in JPG, PNG, WEBP, or GIF format (max 10 MB). Our AI estimates per-serving macros and evolutionary metabolic insights, deducting 1 scan from your monthly quota.',
    },
    {
      id: 'billing-accumulation',
      category: 'billing',
      question: 'Do remaining months and video sessions accumulate when renewing early?',
      answer:
        'Yes. Payments run securely via Stripe Checkout. If you renew or purchase another coaching program while you still have active balance, remaining months and video call credits automatically add onto your account.',
    },
    {
      id: 'billing-cancellation',
      category: 'billing',
      question: 'How can I cancel a renewal or request a technical refund?',
      answer:
        'Recurring plans can be canceled penalty-free anytime before your next billing cycle via your dashboard or by emailing support@nelhealthcoach.com. Full refunds apply strictly to verified duplicate charges or platform technical unavailability under our Refund Policy (/reembolsos).',
    },
    {
      id: 'billing-no-whatsapp',
      category: 'billing',
      question: 'Is WhatsApp support available through this Help Center?',
      answer:
        'No. We do not provide public Help Center support over WhatsApp. WhatsApp guidance is strictly reserved for active coaching participants according to their plan. For urgent technical, OTP login, or billing issues in extreme cases, email support@nelhealthcoach.com directly.',
    },
  ],
  supportBlock: {
    badge: 'Email-Only Escalation · Extreme Cases',
    title: 'Still dealing with an urgent issue?',
    description:
      'If the FAQs above did not solve your issue, a Stripe payment failed, or you are locked out of your account or upcoming call, contact us strictly by email.',
    noWhatsappNotice:
      'Please note: There is no WhatsApp channel for Help Center support. Extreme cases and technical/billing escalations are handled exclusively via email.',
    checklistTitle: 'To help us assist you faster, please include:',
    checklistItems: [
      'The email address registered on NELHEALTHCOACH.',
      'Your active plan and, if applicable, session date/time.',
      'A brief description or screenshot of the error.',
    ],
    emailLabel: 'Official support email:',
    emailAddress: SUPPORT_EMAIL,
    emailSubject: 'Urgent Support - NELHEALTHCOACH',
    ctaLabel: 'Email support@nelhealthcoach.com',
    responseNote: 'Extreme-case review hours: Monday to Friday (California time, PST/PDT).',
  },
  bottomCta: {
    title: 'Ready to get back to your program?',
    subtitle: 'Return to the homepage, compare plans, or sign in to your client portal.',
    backToHome: 'Back to Home',
    viewPlans: 'View Plans',
    loginPortal: 'Sign in to Portal',
  },
};

const fr: HelpPageCopy = {
  seoTitle: "Centre d'Aide et Questions Fréquentes | NELHEALTHCOACH",
  seoDescription:
    "Réponses sur nos programmes, l'inscription OTP à 6 chiffres, les appels vidéo multi-fuseaux, les bibliothèques, le scanner nutritionnel et le support par e-mail.",
  heroBadge: "Centre d'Aide Officiel",
  heroTitle: 'Comment pouvons-nous vous aider ?',
  heroSubtitle:
    'Trouvez des réponses claires sur nos programmes de nutrition ancestrale, votre portail client, les appels vidéo et la facturation.',
  searchLabel: "Rechercher dans le Centre d'Aide",
  searchPlaceholder: 'Rechercher : fuseaux horaires, OTP, recettes, scanner, remboursement...',
  clearSearch: 'Effacer la recherche',
  resultsCountLabel: 'questions disponibles',
  noResultsTitle: 'Aucune question ne correspond à votre recherche',
  noResultsDescription:
    'Essayez d’autres mots-clés ou réinitialisez le filtre de catégorie pour voir toutes les questions.',
  resetFilters: 'Voir toutes les questions',
  categories: {
    all: 'Toutes',
    plans: 'Formules & Tarifs',
    onboarding: 'Inscription & Documents',
    videocalls: 'Appels Vidéo & Horaires',
    libraries: 'Bibliothèques & Scanner',
    billing: 'Paiements & Annulation',
  },
  faqs: [
    {
      id: 'plans-comparison',
      category: 'plans',
      question: 'Quels programmes propose NELHEALTHCOACH et que comprend chacun ?',
      answer:
        'Nous proposons 5 formules structurées selon votre besoin d’accompagnement avec Manuel Martínez :',
      bullets: [
        'Consultation Privée 1 à 1 (60 $ USD · 45 min) : séance diagnostique ponctuelle par appel vidéo avec réservation directe sans compte complet.',
        'Défi 3S NEL (97 $ USD · 3 semaines) : portail web, guide PDF, 3 phases hebdomadaires progressives, suivi WhatsApp et 1 appel vidéo de clôture.',
        'Formule 1 — Réinitialisation Métabolique (150 $ USD · 1 mois) : protocole de base en ligne, suivi WhatsApp hebdomadaire et 2 appels vidéo 1 à 1 (initial + clôture).',
        'Formule 2 — Transformation Cellulaire (340 $ USD · 3 mois) : portail complet, WhatsApp direct, 4 appels vidéo 1 à 1 (1 initial + 1/mois), 15 recettes et 15 exercices en lecture seule, et jusqu’à 5 analyses/mois via le Scanner Nutritionnel IA.',
        'Formule 3 — Maîtrise & Longévité (590 $ USD · 6 mois) : canal WhatsApp prioritaire, 7 appels vidéo 1 à 1 (1 initial + 1/mois), accès complet en lecture seule aux recettes et exercices, et jusqu’à 30 analyses/mois via le Scanner Nutritionnel.',
      ],
    },
    {
      id: 'plans-upgrade-downgrade',
      category: 'plans',
      question: 'Que deviennent mes données et accès si je change de formule ?',
      answer:
        'Votre dossier médical, votre historique et toutes les recommandations déjà approuvées restent toujours conservés dans votre espace. En revanche, les modules additionnels reflètent strictement la formule actuellement active :',
      bullets: [
        'En passant de la Formule 2 ou 3 vers la Formule 1 ou le Défi 3S NEL, vous conservez vos recommandations passées, mais les bibliothèques Recettes, Exercices et le Scanner Nutritionnel ne sont plus accessibles.',
        'En passant vers une formule supérieure (Formule 2 ou 3), ces modules se débloquent instantanément selon votre nouveau quota.',
      ],
    },
    {
      id: 'plans-quotas',
      category: 'plans',
      question: 'Pourquoi une formule affiche-t-elle « Places indisponibles » ?',
      answer:
        'Afin d’assurer une supervision humaine rigoureuse, Manuel Martínez limite le nombre de places actives par programme. Dès qu’un quota est atteint, le bouton se bloque automatiquement jusqu’à la libération de nouvelles places.',
    },
    {
      id: 'onboarding-otp',
      category: 'onboarding',
      question: 'Comment fonctionne l’inscription avec le code OTP à 6 chiffres ?',
      answer:
        'Pour le Défi 3S NEL et les Formules 1, 2 et 3, vous créez votre compte sur le Portail avec un mot de passe robuste (12 caractères min. avec majuscules, minuscules, chiffres et symboles) et validez votre e-mail grâce à un code OTP à 6 chiffres valable 15 minutes. La Consultation 1 à 1 ne requiert pas de compte.',
    },
    {
      id: 'onboarding-health-form',
      category: 'onboarding',
      question: 'Que dois-je faire juste après le paiement ?',
      answer:
        'Après validation sur Stripe, rendez-vous sur Accueil (/dashboard) dans votre portail. Si votre bilan n’est pas encore rempli, le formulaire de santé s’affiche directement pour renseigner vos habitudes, votre pays/ville et vos objectifs.',
    },
    {
      id: 'onboarding-documents',
      category: 'onboarding',
      question: 'Quels documents médicaux envoyer et comment télécharger mes recommandations ?',
      answer:
        'Vous pouvez importer vos analyses en PDF, JPG, PNG, WEBP, DOC ou DOCX (10 Mo max. par fichier) depuis le formulaire ou Mon Profil (/dashboard/my-profile). Une fois validées par votre conseiller, vos recommandations sont consultables en lecture seule et téléchargeables en PDF dans 6 langues.',
    },
    {
      id: 'videocalls-timezones',
      category: 'videocalls',
      question: 'Comment sont calculés les horaires et fuseaux horaires des appels vidéo ?',
      answer:
        'Vos séances sont planifiées depuis votre inscription ou ajustées par votre conseiller. Chaque e-mail d’invitation et de rappel indique toujours deux repères : l’heure de Manuel Martínez en Californie (America/Los_Angeles) et votre heure locale détectée selon votre pays ou navigateur.',
    },
    {
      id: 'videocalls-join-window',
      category: 'videocalls',
      question: 'Quand le bouton « Rejoindre l’appel vidéo » devient-il actif ?',
      answer:
        'Par sécurité, l’accès à la salle vidéo (portail ou lien e-mail) reste désactivé jusqu’à exactement 15 minutes avant l’heure prévue. Dès T-15 minutes, le bouton passe au vert pour vous permettre d’entrer.',
    },
    {
      id: 'videocalls-consent',
      category: 'videocalls',
      question: 'Pourquoi un consentement est-il demandé avant l’appel vidéo ?',
      answer:
        'Conformément au RGPD et au droit californien (Cal. Penal Code § 632), nous recueillons votre accord explicite avant l’activation de l’audio/enregistrement LiveKit et de la transcription clinique Deepgram.',
    },
    {
      id: 'libraries-access',
      category: 'libraries',
      question: 'Qui a accès aux Recettes, Exercices et au Scanner Nutritionnel IA ?',
      answer:
        'Ces ressources en lecture seule sont réservées exclusivement aux clients actifs des Formules 2 et 3 :',
      bullets: [
        'Formule 2 : lecture de 15 recettes et 15 exercices publiés + jusqu’à 5 analyses photo par mois.',
        'Formule 3 : accès complet en lecture seule à tout le catalogue publié + jusqu’à 30 analyses photo par mois.',
        'La Consultation 1 à 1, le Défi 3S NEL et la Formule 1 n’incluent pas ces bibliothèques ni le scanner.',
      ],
    },
    {
      id: 'libraries-scanner-formats',
      category: 'libraries',
      question: 'Comment fonctionne le Scanner Nutritionnel par photo ?',
      answer:
        'Dans Scanner Nutritionnel (/dashboard/scanner), importez une photo nette de votre repas en JPG, PNG, WEBP ou GIF (max. 10 Mo). L’IA estime les macros par portion et le profil métabolique évolutif en déduisant 1 crédit mensuel.',
    },
    {
      id: 'billing-accumulation',
      category: 'billing',
      question: 'Les mois et appels restants s’accumulent-ils en cas de renouvellement anticipé ?',
      answer:
        'Oui. Les paiements passent par Stripe Checkout. Si vous renouvelez ou choisissez un nouveau programme avant l’échéance, les mois et crédits d’appels restants s’additionnent automatiquement.',
    },
    {
      id: 'billing-cancellation',
      category: 'billing',
      question: 'Comment annuler ou demander un remboursement en cas d’incident technique ?',
      answer:
        'Vous pouvez annuler tout renouvellement récurrent sans pénalité avant la prochaine échéance depuis votre compte ou via support@nelhealthcoach.com. Les remboursements s’appliquent uniquement aux doubles débits vérifiés ou pannes imputables à la plateforme (/reembolsos).',
    },
    {
      id: 'billing-no-whatsapp',
      category: 'billing',
      question: 'Y a-t-il un support WhatsApp dans ce Centre d’Aide ?',
      answer:
        'Non. Le Centre d’Aide public n’offre aucun support via WhatsApp (réservé aux participants actifs des programmes compatibles). Pour tout blocage critique ou cas extrême, écrivez uniquement à support@nelhealthcoach.com.',
    },
  ],
  supportBlock: {
    badge: 'Support Exclusif par E-mail · Cas Extrêmes',
    title: 'Vous rencontrez encore un blocage urgent ?',
    description:
      'Si cette FAQ n’a pas résolu votre problème, si un paiement Stripe a échoué ou si votre accès est bloqué, contactez-nous exclusivement par e-mail.',
    noWhatsappNotice:
      'Important : Aucun support WhatsApp n’est assuré depuis le Centre d’Aide. Les cas extrêmes et incidents techniques sont traités uniquement par e-mail.',
    checklistTitle: 'Pour accélérer le traitement, indiquez dans votre message :',
    checklistItems: [
      'L’adresse e-mail utilisée sur NELHEALTHCOACH.',
      'Votre formule active et, si besoin, la date/heure de la séance.',
      'Une courte description ou capture d’écran du problème.',
    ],
    emailLabel: 'E-mail officiel du support :',
    emailAddress: SUPPORT_EMAIL,
    emailSubject: 'Support urgent - NELHEALTHCOACH',
    ctaLabel: 'Écrire à support@nelhealthcoach.com',
    responseNote: 'Traitement des cas extrêmes : du lundi au vendredi (heure de Californie, PST/PDT).',
  },
  bottomCta: {
    title: 'Prêt à reprendre votre programme ?',
    subtitle: 'Revenez à l’accueil, comparez nos formules ou connectez-vous à votre portail.',
    backToHome: 'Retour à l’accueil',
    viewPlans: 'Voir les formules',
    loginPortal: 'Connexion au Portail',
  },
};

const it: HelpPageCopy = {
  seoTitle: 'Centro Assistenza e Domande Frequenti | NELHEALTHCOACH',
  seoDescription:
    'Risposte chiare su piani di coaching, registrazione OTP a 6 cifre, videochiamate con fuso orario, librerie, scanner nutrizionale e supporto via email.',
  heroBadge: 'Centro Assistenza Ufficiale',
  heroTitle: 'Come possiamo aiutarti?',
  heroSubtitle:
    'Trova risposte chiare sui nostri programmi di nutrizione ancestrale, sul portale clienti, sulle videochiamate e sui pagamenti.',
  searchLabel: 'Cerca nel Centro Assistenza',
  searchPlaceholder: 'Cerca per tema: fuso orario, OTP, ricette, scanner, rimborso...',
  clearSearch: 'Cancella ricerca',
  resultsCountLabel: 'domande disponibili',
  noResultsTitle: 'Nessuna domanda corrisponde alla tua ricerca',
  noResultsDescription:
    'Prova con altre parole chiave o reimposta il filtro della categoria per vedere tutte le risposte.',
  resetFilters: 'Vedi tutte le domande',
  categories: {
    all: 'Tutte',
    plans: 'Piani e Prezzi',
    onboarding: 'Registrazione e Documenti',
    videocalls: 'Videochiamate e Orari',
    libraries: 'Librerie e Scanner',
    billing: 'Pagamenti e Recesso',
  },
  faqs: [
    {
      id: 'plans-comparison',
      category: 'plans',
      question: 'Quali programmi offre NELHEALTHCOACH e cosa include ciascuno?',
      answer:
        'Offriamo 5 soluzioni commerciali studiate per diverse fasi di percorso con Manuel Martínez:',
      bullets: [
        'Consulenza Privata 1 a 1 ($60 USD · 45 min): sessione diagnostica singola in videochiamata con prenotazione diretta senza account completo.',
        'Sfida 3S NEL ($97 USD · 3 settimane): portale web, guida PDF, 3 fasi settimanali progressive, supporto WhatsApp e 1 videochiamata finale.',
        'Piano 1 — Reset Metabolico ($150 USD · 1 mese): protocollo base su portale web, WhatsApp settimanale asincrono e 2 videochiamate 1 a 1 (iniziale + finale).',
        'Piano 2 — Trasformazione Cellulare ($340 USD · 3 mesi): portale completo, WhatsApp diretto, 4 videochiamate 1 a 1 (1 iniziale + 1 al mese), 15 ricette e 15 esercizi in sola lettura e fino a 5 analisi/mese con Scanner Nutrizionale IA.',
        'Piano 3 — Maestria e Longevità ($590 USD · 6 mesi): canale WhatsApp prioritario, 7 videochiamate 1 a 1 (1 iniziale + 1 al mese), accesso completo in sola lettura a tutte le ricette ed esercizi e fino a 30 analisi/mese con Scanner Nutrizionale.',
      ],
    },
    {
      id: 'plans-upgrade-downgrade',
      category: 'plans',
      question: 'Cosa conservo se passo a un piano superiore o inferiore?',
      answer:
        'La tua scheda clinica, lo storico delle valutazioni e tutte le raccomandazioni già approvate restano sempre salvate nel portale. Le funzionalità aggiuntive dipendono però esclusivamente dal piano attivo:',
      bullets: [
        'Se passi dal Piano 2 o 3 al Piano 1 o alla Sfida 3S NEL, mantieni lo storico e le raccomandazioni precedenti, ma l’accesso a Ricette, Esercizi e Scanner Nutrizionale si disattiva.',
        'Se effettui un upgrade verso Piano 2 o Piano 3, librerie e scanner si sbloccano subito secondo i limiti del nuovo piano.',
      ],
    },
    {
      id: 'plans-quotas',
      category: 'plans',
      question: 'Perché un piano mostra "Posti non disponibili"?',
      answer:
        'Per garantire supervisione umana reale e attenzione individuale, Manuel Martínez limita i posti mensili attivi per programma. Quando la quota è piena, l’iscrizione si blocca automaticamente finché non si liberano nuovi posti.',
    },
    {
      id: 'onboarding-otp',
      category: 'onboarding',
      question: 'Come funziona la registrazione con codice OTP a 6 cifre?',
      answer:
        'Per la Sfida 3S NEL e i Piani 1, 2 o 3 crei il tuo account nel Portale con una password sicura (min. 12 caratteri con maiuscole, minuscole, numeri e simboli) e confermi l’email tramite un codice OTP a 6 cifre valido 15 minuti. La Consulenza 1 a 1 non richiede registrazione.',
    },
    {
      id: 'onboarding-health-form',
      category: 'onboarding',
      question: 'Cosa devo fare subito dopo il pagamento?',
      answer:
        'Dopo la conferma su Stripe, accedi alla sezione Home (/dashboard) del tuo portale. Se il profilo clinico non è ancora compilato, troverai il Modulo Salute integrato per inserire abitudini, paese/città e obiettivi.',
    },
    {
      id: 'onboarding-documents',
      category: 'onboarding',
      question: 'Quali referti posso caricare e come scarico le mie raccomandazioni?',
      answer:
        'Puoi caricare esami e referti medici in PDF, JPG, PNG, WEBP, DOC o DOCX (fino a 10 MB ciascuno) dal modulo o in Il Mio Profilo (/dashboard/my-profile). Una volta approvate dal coach, potrai leggere le raccomandazioni in sola lettura e scaricarle in PDF in 6 lingue.',
    },
    {
      id: 'videocalls-timezones',
      category: 'videocalls',
      question: 'Come vengono gestiti date e fusi orari delle videochiamate?',
      answer:
        'Le sessioni vengono programmate dalla data di iscrizione o confermate dal consulente. Ogni invito e promemoria email mostra sempre entrambi gli orari: l’ora della California di Manuel Martínez (America/Los_Angeles) e il tuo fuso locale rilevato da indirizzo o browser.',
    },
    {
      id: 'videocalls-join-window',
      category: 'videocalls',
      question: 'Quando si attiva il pulsante "Partecipa alla Videochiamata"?',
      answer:
        'Per sicurezza organizzativa, l’ingresso alla stanza video resta bloccato fino a 15 minuti prima dell’orario fissato. A 15 minuti dall’inizio il pulsante diventa verde e accessibile.',
    },
    {
      id: 'videocalls-consent',
      category: 'videocalls',
      question: 'Perché viene chiesto il consenso prima di entrare in videochiamata?',
      answer:
        'Nel rispetto del GDPR e della legge della California (Cal. Penal Code § 632), richiediamo il consenso esplicito prima di attivare eventuale registrazione cifrata LiveKit o trascrizione clinica Deepgram.',
    },
    {
      id: 'libraries-access',
      category: 'libraries',
      question: 'Chi può accedere a Ricette, Esercizi e Scanner Nutrizionale IA?',
      answer:
        'L’accesso in sola lettura alle librerie e allo Scanner Nutrizionale è riservato esclusivamente ai piani 2 e 3 attivi:',
      bullets: [
        'Piano 2: lettura di 15 ricette e 15 esercizi pubblicati + fino a 5 scansioni foto/mese.',
        'Piano 3: accesso completo in sola lettura a tutto il catalogo pubblicato + fino a 30 scansioni foto/mese.',
        'Consulenza 1 a 1, Sfida 3S NEL e Piano 1 non includono librerie né scanner.',
      ],
    },
    {
      id: 'libraries-scanner-formats',
      category: 'libraries',
      question: 'Come funziona lo Scanner Nutrizionale fotografico?',
      answer:
        'In Scanner Nutrizionale (/dashboard/scanner) carica una foto chiara del piatto in JPG, PNG, WEBP o GIF (max 10 MB). L’IA calcola una stima dei macro per porzione e il profilo metabolico evolutivo scalando 1 credito mensile.',
    },
    {
      id: 'billing-accumulation',
      category: 'billing',
      question: 'I mesi e le videochiamate residue si accumulano se rinnovo in anticipo?',
      answer:
        'Sì. Tutti i pagamenti passano da Stripe Checkout. Se rinnovi o acquisti un nuovo programma prima della scadenza, mesi residui e sessioni video rimanenti si sommano automaticamente.',
    },
    {
      id: 'billing-cancellation',
      category: 'billing',
      question: 'Come annullo un rinnovo o chiedo un rimborso per errore tecnico?',
      answer:
        'Puoi annullare qualsiasi abbonamento prima del ciclo successivo senza penali dal portale o scrivendo a support@nelhealthcoach.com. I rimborsi integrali valgono solo per addebiti duplicati verificati o guasti imputabili alla piattaforma (/reembolsos).',
    },
    {
      id: 'billing-no-whatsapp',
      category: 'billing',
      question: 'Esiste un supporto WhatsApp per questo Centro Assistenza?',
      answer:
        'No. Il Centro Assistenza pubblico non offre supporto via WhatsApp (riservato ai partecipanti attivi nei percorsi abilitati). Per emergenze tecniche, OTP o pagamenti, scrivi unicamente a support@nelhealthcoach.com.',
    },
  ],
  supportBlock: {
    badge: 'Assistenza Esclusiva via Email · Casi Estremi',
    title: 'Hai ancora un problema urgente?',
    description:
      'Se le FAQ non hanno risolto il tuo caso, hai avuto un errore con Stripe o sei bloccato fuori dall’account o da una videochiamata, contattaci solo via email.',
    noWhatsappNotice:
      'Nota importante: Il Centro Assistenza non dispone di supporto WhatsApp. I casi estremi e tecnici vengono gestiti esclusivamente via email.',
    checklistTitle: 'Per aiutarti più velocemente, includi nel messaggio:',
    checklistItems: [
      'L’indirizzo email registrato su NELHEALTHCOACH.',
      'Il tuo piano attivo ed eventuale data/ora della sessione.',
      'Una breve descrizione o screenshot del problema.',
    ],
    emailLabel: 'Email ufficiale del supporto:',
    emailAddress: SUPPORT_EMAIL,
    emailSubject: 'Supporto urgente - NELHEALTHCOACH',
    ctaLabel: 'Scrivi a support@nelhealthcoach.com',
    responseNote: 'Gestione casi estremi: dal lunedì al venerdì (fuso orario California, PST/PDT).',
  },
  bottomCta: {
    title: 'Pronto a riprendere il tuo percorso?',
    subtitle: 'Torna alla home page, confronta i piani o accedi direttamente al portale.',
    backToHome: 'Torna alla Home',
    viewPlans: 'Vedi i Piani',
    loginPortal: 'Accedi al Portale',
  },
};

const pt: HelpPageCopy = {
  seoTitle: 'Central de Ajuda e Perguntas Frequentes | NELHEALTHCOACH',
  seoDescription:
    'Tire dúvidas sobre planos, cadastro com código OTP de 6 dígitos, videochamadas com fuso horário, bibliotecas, scanner nutricional e suporte por e-mail.',
  heroBadge: 'Central de Ajuda Oficial',
  heroTitle: 'Como podemos ajudar?',
  heroSubtitle:
    'Encontre respostas claras sobre nossos programas de nutrição ancestral e metabólica, seu portal do cliente, videochamadas e pagamentos.',
  searchLabel: 'Pesquisar na Central de Ajuda',
  searchPlaceholder: 'Buscar por tema: fuso horário, OTP, receitas, scanner, reembolso...',
  clearSearch: 'Limpar busca',
  resultsCountLabel: 'perguntas disponíveis',
  noResultsTitle: 'Nenhuma pergunta corresponde à sua busca',
  noResultsDescription:
    'Tente outras palavras-chave ou redefina o filtro de categoria para ver todas as respostas.',
  resetFilters: 'Ver todas as perguntas',
  categories: {
    all: 'Todas',
    plans: 'Planos e Preços',
    onboarding: 'Cadastro e Documentos',
    videocalls: 'Videochamadas e Horários',
    libraries: 'Bibliotecas e Scanner',
    billing: 'Pagamentos e Cancelamento',
  },
  faqs: [
    {
      id: 'plans-comparison',
      category: 'plans',
      question: 'Quais programas a NELHEALTHCOACH oferece e o que cada um inclui?',
      answer:
        'Oferecemos 5 opções estruturadas para diferentes momentos de acompanhamento com Manuel Martínez:',
      bullets: [
        'Consulta Privada 1 a 1 (US$ 60 · 45 min): sessão diagnóstica pontual por videochamada com agendamento imediato, sem exigir conta completa.',
        'Desafio 3S NEL (US$ 97 · 3 semanas): portal web, guia em PDF, 3 fases semanais progressivas, acompanhamento no WhatsApp e 1 videochamada de encerramento.',
        'Plano 1 — Reinício Metabólico (US$ 150 · 1 mês): protocolo base no portal, suporte semanal assíncrono no WhatsApp e 2 videochamadas 1 a 1 (inicial e encerramento).',
        'Plano 2 — Transformação Celular (US$ 340 · 3 meses): portal completo, WhatsApp direto, 4 videochamadas 1 a 1 (1 inicial + 1/mês), 15 receitas e 15 exercícios em modo leitura e até 5 análises/mês no Scanner Nutricional com IA.',
        'Plano 3 — Maestria e Longevidade (US$ 590 · 6 meses): canal prioritário no WhatsApp, 7 videochamadas 1 a 1 (1 inicial + 1/mês), acesso completo em leitura a todas as receitas e exercícios e até 30 análises/mês no Scanner Nutricional.',
      ],
    },
    {
      id: 'plans-upgrade-downgrade',
      category: 'plans',
      question: 'O que eu mantenho se subir ou baixar de plano ao renovar?',
      answer:
        'Seu histórico clínico, avaliações anteriores e todas as recomendações já aprovadas permanecem sempre preservados no portal. Já os recursos extras seguem estritamente o plano ativo no momento:',
      bullets: [
        'Ao migrar do Plano 2 ou 3 para o Plano 1 ou Desafio 3S NEL, seu histórico e recomendações anteriores ficam salvos, mas o acesso a Receitas, Exercícios e Scanner Nutricional é desativado.',
        'Ao fazer upgrade para o Plano 2 ou Plano 3, as bibliotecas e o scanner são liberados imediatamente conforme o limite do novo plano.',
      ],
    },
    {
      id: 'plans-quotas',
      category: 'plans',
      question: 'Por que um plano aparece como "Vagas indisponíveis"?',
      answer:
        'Para garantir revisão humana real e acompanhamento próximo, Manuel Martínez limita a quantidade mensal de vagas ativas por programa. Quando o limite é atingido, o botão bloqueia automaticamente até surgirem novas vagas.',
    },
    {
      id: 'onboarding-otp',
      category: 'onboarding',
      question: 'Como funciona o cadastro com código OTP de 6 dígitos?',
      answer:
        'No Desafio 3S NEL e nos Planos 1, 2 ou 3, você cria sua conta no Portal com uma senha forte (mínimo 12 caracteres com maiúsculas, minúsculas, números e símbolos) e confirma seu e-mail com um código OTP de 6 dígitos válido por 15 minutos. A Consulta 1 a 1 não exige conta.',
    },
    {
      id: 'onboarding-health-form',
      category: 'onboarding',
      question: 'O que devo fazer logo após concluir o pagamento?',
      answer:
        'Após confirmar no Stripe, acesse Início (/dashboard) no seu portal. Se sua ficha clínica ainda estiver pendente, o Formulário de Saúde aparecerá integrado para você enviar histórico, hábitos, país/cidade e objetivos.',
    },
    {
      id: 'onboarding-documents',
      category: 'onboarding',
      question: 'Quais exames posso enviar e como baixo minhas recomendações?',
      answer:
        'Você pode anexar exames em PDF, JPG, PNG, WEBP, DOC ou DOCX (até 10 MB por arquivo) no formulário ou em Meu Perfil (/dashboard/my-profile). Quando seu consultor aprovar seu plano, você poderá lê-lo no portal em modo leitura e baixar o PDF em 6 idiomas.',
    },
    {
      id: 'videocalls-timezones',
      category: 'videocalls',
      question: 'Como são calculados os horários e fusos horários das videochamadas?',
      answer:
        'As datas são projetadas a partir da inscrição ou ajustadas pelo seu consultor. Todo convite e lembrete por e-mail exibe ambos os horários: o horário da Califórnia de Manuel Martínez (America/Los_Angeles) e o seu fuso horário local detectado pelo endereço ou navegador.',
    },
    {
      id: 'videocalls-join-window',
      category: 'videocalls',
      question: 'Quando o botão "Entrar na Videochamada" fica disponível?',
      answer:
        'Por segurança, o acesso à sala (no portal ou link do e-mail) fica bloqueado até exatamente 15 minutos antes do horário agendado. Faltando 15 minutos ou menos, o botão fica verde para você entrar.',
    },
    {
      id: 'videocalls-consent',
      category: 'videocalls',
      question: 'Por que pedem consentimento antes de entrar na videochamada?',
      answer:
        'Em conformidade com o GDPR e a legislação da Califórnia (Cal. Penal Code § 632), solicitamos consentimento expresso antes de ativar áudio/gravação criptografada no LiveKit ou transcrição clínica com Deepgram.',
    },
    {
      id: 'libraries-access',
      category: 'libraries',
      question: 'Quem tem acesso a Receitas, Exercícios e Scanner Nutricional com IA?',
      answer:
        'O acesso em modo somente leitura às bibliotecas e ao Scanner Nutricional é exclusivo dos Planos 2 e 3 ativos:',
      bullets: [
        'Plano 2: leitura de 15 receitas e 15 exercícios publicados + até 5 análises por foto/mês.',
        'Plano 3: acesso completo em leitura a todo o catálogo publicado + até 30 análises por foto/mês.',
        'Consulta 1 a 1, Desafio 3S NEL e Plano 1 não incluem bibliotecas nem scanner.',
      ],
    },
    {
      id: 'libraries-scanner-formats',
      category: 'libraries',
      question: 'Como funciona o Scanner Nutricional por foto?',
      answer:
        'Na aba Scanner Nutricional (/dashboard/scanner), envie uma foto nítida da refeição em JPG, PNG, WEBP ou GIF (máx. 10 MB). A IA estima os macros por porção e o perfil metabólico evolutivo descontando 1 uso da cota mensal.',
    },
    {
      id: 'billing-accumulation',
      category: 'billing',
      question: 'Se eu renovar ou trocar de plano antes do fim, meus meses e sessões acumulam?',
      answer:
        'Sim. Os pagamentos são processados com segurança pelo Stripe Checkout. Ao renovar ou contratar outro plano enquanto houver saldo ativo, meses restantes e videochamadas disponíveis são somados automaticamente.',
    },
    {
      id: 'billing-cancellation',
      category: 'billing',
      question: 'Como cancelo ou peço reembolso em caso de falha técnica?',
      answer:
        'Assinaturas recorrentes podem ser canceladas sem multa antes do próximo ciclo pelo painel ou escrevendo para support@nelhealthcoach.com. Reembolsos integrais aplicam-se apenas a cobranças duplicadas comprovadas ou indisponibilidade técnica da plataforma (/reembolsos).',
    },
    {
      id: 'billing-no-whatsapp',
      category: 'billing',
      question: 'Existe suporte por WhatsApp nesta Central de Ajuda?',
      answer:
        'Não. Esta Central de Ajuda não oferece atendimento via WhatsApp (canal exclusivo de alunos ativos nos planos elegíveis). Para casos extremos, falhas de pagamento ou bloqueio de acesso, escreva apenas para support@nelhealthcoach.com.',
    },
  ],
  supportBlock: {
    badge: 'Atendimento Exclusivo por E-mail · Casos Extremos',
    title: 'Ainda está enfrentando um problema urgente?',
    description:
      'Se as perguntas acima não resolveram sua situação, ocorreu erro no Stripe ou você está bloqueado para acessar sua conta ou videochamada, fale conosco apenas por e-mail.',
    noWhatsappNotice:
      'Atenção: Não há suporte por WhatsApp nesta Central de Ajuda. Casos extremos e falhas técnicas são atendidos exclusivamente por e-mail.',
    checklistTitle: 'Para agilizar seu atendimento, envie no e-mail:',
    checklistItems: [
      'O e-mail cadastrado na NELHEALTHCOACH.',
      'Seu plano ativo e, se aplicável, data/hora da sessão.',
      'Uma breve descrição ou captura de tela do erro.',
    ],
    emailLabel: 'E-mail oficial de suporte:',
    emailAddress: SUPPORT_EMAIL,
    emailSubject: 'Suporte urgente - NELHEALTHCOACH',
    ctaLabel: 'Enviar e-mail para support@nelhealthcoach.com',
    responseNote: 'Análise de casos extremos: segunda a sexta (fuso horário da Califórnia, PST/PDT).',
  },
  bottomCta: {
    title: 'Pronto para continuar sua jornada?',
    subtitle: 'Volte à página inicial, compare os planos ou entre diretamente no seu portal.',
    backToHome: 'Voltar ao Início',
    viewPlans: 'Ver Planos',
    loginPortal: 'Entrar no Portal',
  },
};

const de: HelpPageCopy = {
  seoTitle: 'Hilfe-Center & Häufige Fragen | NELHEALTHCOACH',
  seoDescription:
    'Antworten zu Coaching-Plänen, 6-stelligem OTP-Login, Video-Calls mit Zeitzonen, Bibliotheken, Ernährungs-Scanner, Zahlung und E-Mail-Support.',
  heroBadge: 'Offizielles Hilfe-Center',
  heroTitle: 'Wie können wir dir helfen?',
  heroSubtitle:
    'Klare Antworten zu unseren Programmen für evolutionäre Ernährung, deinem Kundenportal, Video-Calls und Abrechnung.',
  searchLabel: 'Im Hilfe-Center suchen',
  searchPlaceholder: 'Nach Thema suchen: Zeitzonen, OTP, Rezepte, Scanner, Rückerstattung...',
  clearSearch: 'Suche löschen',
  resultsCountLabel: 'Fragen verfügbar',
  noResultsTitle: 'Keine passenden Fragen gefunden',
  noResultsDescription:
    'Versuche andere Suchbegriffe oder setze den Kategorie-Filter zurück, um alle Fragen zu sehen.',
  resetFilters: 'Alle Fragen anzeigen',
  categories: {
    all: 'Alle',
    plans: 'Pläne & Preise',
    onboarding: 'Registrierung & Dokumente',
    videocalls: 'Video-Calls & Zeitzonen',
    libraries: 'Bibliotheken & Scanner',
    billing: 'Zahlung & Kündigung',
  },
  faqs: [
    {
      id: 'plans-comparison',
      category: 'plans',
      question: 'Welche Programme bietet NELHEALTHCOACH an und was ist enthalten?',
      answer:
        'Wir bieten 5 strukturierte Programme für unterschiedliche Phasen der Begleitung durch Manuel Martínez:',
      bullets: [
        '1-zu-1 Privatberatung (60 $ USD · 45 Min.): einzelne Diagnose-Videositzung mit direkter Terminbuchung ohne vollständiges Konto.',
        '3S-NEL-Challenge (97 $ USD · 3 Wochen): Webportal, PDF-Guide, 3 aufbauende Wochenphasen, WhatsApp-Begleitung und 1 Abschluss-Video-Call.',
        'Plan 1 — Stoffwechsel-Reset (150 $ USD · 1 Monat): Basisprotokoll im Portal, wöchentlicher asynchroner WhatsApp-Support und 2 1-zu-1 Video-Calls (Start + Abschluss).',
        'Plan 2 — Zelluläre Transformation (340 $ USD · 3 Monate): komplettes Portal, direkter WhatsApp-Kontakt, 4 1-zu-1 Video-Calls (1 Start + 1/Monat), Lesezugriff auf 15 Rezepte & 15 Übungen sowie bis zu 5 KI-Ernährungs-Scans/Monat.',
        'Plan 3 — Meisterschaft & Langlebigkeit (590 $ USD · 6 Monate): priorisierter WhatsApp-Kanal, 7 1-zu-1 Video-Calls (1 Start + 1/Monat), voller Lesezugriff auf alle Rezepte & Übungen sowie bis zu 30 KI-Ernährungs-Scans/Monat.',
      ],
    },
    {
      id: 'plans-upgrade-downgrade',
      category: 'plans',
      question: 'Was bleibt erhalten, wenn ich auf einen anderen Plan wechsle?',
      answer:
        'Deine Gesundheitsakte, frühere Auswertungen und bereits freigegebene Empfehlungen bleiben dauerhaft im Portal gespeichert. Zusätzliche Funktionen richten sich jedoch strikt nach dem aktuell aktiven Plan:',
      bullets: [
        'Bei einem Wechsel von Plan 2 oder 3 auf Plan 1 oder die 3S-NEL-Challenge bleiben Historie und Empfehlungen erhalten, während der Zugriff auf Rezepte, Übungen und den Scanner deaktiviert wird.',
        'Bei einem Upgrade auf Plan 2 oder Plan 3 werden die Bibliotheken und dein monatliches Scanner-Kontingent sofort freigeschaltet.',
      ],
    },
    {
      id: 'plans-quotas',
      category: 'plans',
      question: 'Warum steht bei einem Plan „Keine Plätze verfügbar“?',
      answer:
        'Um eine sorgfältige menschliche Prüfung jeder Empfehlung sicherzustellen, begrenzt Manuel Martínez die monatlichen Plätze je Programm. Ist das Kontingent voll, wird die Anmeldung automatisch pausiert.',
    },
    {
      id: 'onboarding-otp',
      category: 'onboarding',
      question: 'Wie funktionieren Registrierung und 6-stelliger OTP-Code?',
      answer:
        'Für die 3S-NEL-Challenge oder Plan 1, 2 bzw. 3 erstellst du im Portal ein Konto mit starkem Passwort (mind. 12 Zeichen mit Groß-/Kleinbuchstaben, Zahlen und Symbolen) und bestätigst deine E-Mail per 6-stelligem OTP-Code (15 Min. gültig). Die 1-zu-1 Privatberatung benötigt kein Konto.',
    },
    {
      id: 'onboarding-health-form',
      category: 'onboarding',
      question: 'Was muss ich direkt nach der Zahlung tun?',
      answer:
        'Öffne nach der Stripe-Zahlung die Startseite (/dashboard) im Portal. Falls dein Gesundheitsprofil noch aussteht, erscheint das integrierte Formular für Anamnese, Gewohnheiten, Land/Stadt und Ziele.',
    },
    {
      id: 'onboarding-documents',
      category: 'onboarding',
      question: 'Welche Befunde kann ich hochladen und wie lade ich meine Empfehlungen herunter?',
      answer:
        'Laborwerte und Befunde können als PDF, JPG, PNG, WEBP, DOC oder DOCX (max. 10 MB pro Datei) hochgeladen werden. Sobald dein Berater den Plan freigibt, kannst du ihn im Portal im Lesemodus ansehen und als PDF in 6 Sprachen herunterladen.',
    },
    {
      id: 'videocalls-timezones',
      category: 'videocalls',
      question: 'Wie werden Termine und Zeitzonen der Video-Calls berechnet?',
      answer:
        'Die Termine werden ab Anmeldung geplant oder vom Coach bestätigt. Jede E-Mail zeigt stets beide Zeiten: Manuel Martínez’ Zeit in Kalifornien (America/Los_Angeles) sowie deine lokale Zeitzone anhand von Adresse oder Browser.',
    },
    {
      id: 'videocalls-join-window',
      category: 'videocalls',
      question: 'Wann wird der Button „Am Video-Call teilnehmen“ aktiviert?',
      answer:
        'Aus Sicherheits- und Planungsgründen bleibt der Raumzugang bis exakt 15 Minuten vor Terminbeginn gesperrt. Ab 15 Minuten vorher färbt sich der Button grün und erlaubt den Beitritt.',
    },
    {
      id: 'videocalls-consent',
      category: 'videocalls',
      question: 'Warum wird vor dem Video-Call um Einwilligung gebeten?',
      answer:
        'Gemäß DSGVO und kalifornischem Recht (Cal. Penal Code § 632) holen wir vor Aktivierung von verschlüsseltem LiveKit-Audio/Recording oder Deepgram-Transkription deine ausdrückliche Einwilligung ein.',
    },
    {
      id: 'libraries-access',
      category: 'libraries',
      question: 'Wer hat Zugriff auf Rezepte, Übungen und den KI-Ernährungs-Scanner?',
      answer:
        'Der Lesezugriff auf Bibliotheken und den Scanner ist ausschließlich aktiven Plan-2- und Plan-3-Kunden vorbehalten:',
      bullets: [
        'Plan 2: Lesezugriff auf 15 veröffentlichte Rezepte & 15 Übungen + bis zu 5 Foto-Scans pro Monat.',
        'Plan 3: voller Lesezugriff auf alle veröffentlichten Rezepte & Übungen + bis zu 30 Foto-Scans pro Monat.',
        '1-zu-1 Beratung, 3S-NEL-Challenge und Plan 1 enthalten keinen Bibliotheks- oder Scanner-Zugriff.',
      ],
    },
    {
      id: 'libraries-scanner-formats',
      category: 'libraries',
      question: 'Wie funktioniert der KI-Foto-Ernährungs-Scanner?',
      answer:
        'Lade unter Ernährungs-Scanner (/dashboard/scanner) ein klares Foto deiner Mahlzeit als JPG, PNG, WEBP oder GIF (max. 10 MB) hoch. Die KI schätzt Nährwerte pro Portion sowie das metabolische Profil und zieht 1 Scan vom Monatskontingent ab.',
    },
    {
      id: 'billing-accumulation',
      category: 'billing',
      question: 'Werden verbleibende Monate und Video-Calls bei vorzeitiger Verlängerung addiert?',
      answer:
        'Ja. Alle Zahlungen laufen sicher über Stripe Checkout. Bei Verlängerung oder Planwechsel vor Ablauf werden verbleibende Monate und Video-Sitzungen automatisch gutgeschrieben.',
    },
    {
      id: 'billing-cancellation',
      category: 'billing',
      question: 'Wie kündige ich oder beantrage bei technischen Fehlern eine Rückerstattung?',
      answer:
        'Wiederkehrende Abos lassen sich jederzeit vor der nächsten Abrechnung straffrei im Portal oder über support@nelhealthcoach.com kündigen. Volle Erstattungen gelten nur bei nachgewiesenen Doppelbuchungen oder plattformbedingten Störungen (/reembolsos).',
    },
    {
      id: 'billing-no-whatsapp',
      category: 'billing',
      question: 'Gibt es in diesem Hilfe-Center Support über WhatsApp?',
      answer:
        'Nein. Im öffentlichen Hilfe-Center wird kein WhatsApp-Support angeboten (dieser ist ausschließlich aktiven Programmteilnehmern vorbehalten). Bei akuten technischen Störungen, OTP- oder Zahlungsproblemen schreibe bitte direkt an support@nelhealthcoach.com.',
    },
  ],
  supportBlock: {
    badge: 'Nur E-Mail-Support · Ausnahmefälle',
    title: 'Besteht weiterhin ein dringendes Problem?',
    description:
      'Falls diese Fragen nicht weiterhelfen, eine Stripe-Zahlung fehlgeschlagen ist oder du keinen Zugang zu Konto bzw. Video-Call hast, kontaktiere uns ausschließlich per E-Mail.',
    noWhatsappNotice:
      'Wichtiger Hinweis: Das Hilfe-Center bietet keinen WhatsApp-Support. Extremfälle sowie technische oder Zahlungsanfragen werden nur per E-Mail bearbeitet.',
    checklistTitle: 'Für schnellere Hilfe gib bitte an:',
    checklistItems: [
      'Deine bei NELHEALTHCOACH registrierte E-Mail-Adresse.',
      'Deinen aktiven Plan und ggf. Datum/Uhrzeit des Termins.',
      'Eine kurze Fehlerbeschreibung oder einen Screenshot.',
    ],
    emailLabel: 'Offizielle Support-E-Mail:',
    emailAddress: SUPPORT_EMAIL,
    emailSubject: 'Dringender Support - NELHEALTHCOACH',
    ctaLabel: 'E-Mail an support@nelhealthcoach.com senden',
    responseNote: 'Bearbeitungszeit für Ausnahmefälle: Montag bis Freitag (Kalifornische Zeit, PST/PDT).',
  },
  bottomCta: {
    title: 'Bereit für den nächsten Schritt?',
    subtitle: 'Kehre zur Startseite zurück, vergleiche Pläne oder melde dich im Portal an.',
    backToHome: 'Zurück zur Startseite',
    viewPlans: 'Pläne ansehen',
    loginPortal: 'Zum Portal-Login',
  },
};

export const helpContent: Record<HelpLang, HelpPageCopy> = {
  es,
  en,
  fr,
  it,
  pt,
  de,
};

const HELP_LANGUAGES: readonly HelpLang[] = ['es', 'en', 'fr', 'it', 'pt', 'de'];

export function normalizeHelpLang(lang: string | undefined): HelpLang {
  if (!lang) return 'es';
  const base = lang.split('-')[0].toLowerCase();
  return (HELP_LANGUAGES as readonly string[]).includes(base) ? (base as HelpLang) : 'es';
}
