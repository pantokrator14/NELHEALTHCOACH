// apps/landing/src/lib/plans-data.ts
export type PlanId =
  | 'consult_1on1'
  | 'reto_tres_nel'
  | 'plan_1_reinicio'
  | 'plan_2_transformacion'
  | 'plan_3_maestria';

export interface LandingPlanCard {
  id: PlanId;
  tier: 'top' | 'core';
  badge?: string;
  name: string;
  duration: string;
  regularPrice: number;
  launchPrice: number;
  savingsText: string;
  modality: string;
  roadmap?: string[];
  includes: string[];
  ctaLabel: string;
}

export interface ConsultModalCopy {
  badge: string;
  title: string;
  subtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  objectiveLabel: string;
  objectivePlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  cancelLabel: string;
  securityNote: string;
  errorGeneric: string;
}

export interface LandingPlansCopy {
  ribbon: string;
  title: string;
  regularLabel: string;
  modalityLabel: string;
  roadmapLabel: string;
  includesLabel: string;
  unavailableLabel: string;
  alreadyHaveAccount: string;
  signInLink: string;
  consultModal: ConsultModalCopy;
  plans: LandingPlanCard[];
}

const ES_COPY: LandingPlansCopy = {
  ribbon: 'Cupos limitados por mes',
  title: 'Elige tu Plan y Transforma tu Salud',
  regularLabel: 'Regular',
  modalityLabel: 'Modalidad',
  roadmapLabel: 'Ruta',
  includesLabel: 'Incluye',
  unavailableLabel: 'Cupos no disponibles',
  alreadyHaveAccount: '¿Ya creaste tu cuenta de cliente o asesor?',
  signInLink: 'Iniciar sesión en el Portal →',
  consultModal: {
    badge: 'Consulta 1 a 1 • 45 min • $60 USD',
    title: 'Reserva tu Consulta Privada',
    subtitle: 'Sin crear cuenta. Completa tus datos, realiza el pago seguro y elige tu horario al instante para conectarte a tu videollamada privada.',
    nameLabel: 'Nombre completo *',
    namePlaceholder: 'Tu nombre y apellido',
    emailLabel: 'Correo electrónico *',
    emailPlaceholder: 'tucorreo@ejemplo.com',
    phoneLabel: 'WhatsApp o teléfono (opcional)',
    phonePlaceholder: '+1 555 000 0000',
    objectiveLabel: '¿Qué te gustaría mejorar primero? (opcional)',
    objectivePlaceholder: 'Ej: energía, descanso, digestión, metabolismo...',
    submitLabel: 'Continuar al pago ($60 USD) →',
    submittingLabel: 'Conectando con Stripe...',
    cancelLabel: 'Cancelar',
    securityNote: 'Al completar el pago te redirigiremos para elegir tu horario y recibirás el enlace también por correo.',
    errorGeneric: 'No pudimos iniciar el pago. Verifica tus datos e intenta nuevamente.',
  },
  plans: [
    {
      id: 'consult_1on1',
      tier: 'top',
      name: 'Consulta Privada 1 a 1',
      duration: '45 min',
      regularPrice: 80,
      launchPrice: 60,
      savingsText: 'Ahorras $20 (25% desc.)',
      modality: 'Videollamada privada 1 a 1',
      includes: [
        'Evaluación directa de hábitos y descanso con Manuel Martínez',
        'Diagnóstico de causas raíz y prioridades inmediatas',
        'Plan de acción práctico desde el día uno',
      ],
      ctaLabel: 'Agendar — $60',
    },
    {
      id: 'reto_tres_nel',
      tier: 'top',
      name: 'Reto 3S NEL',
      duration: '3 semanas',
      regularPrice: 130,
      launchPrice: 97,
      savingsText: 'Ahorras $33 (25% desc.)',
      modality: 'Web + Guía PDF + WhatsApp + 1 videollamada de cierre',
      roadmap: [
        'Sem 1: Limpieza y Desinflamación',
        'Sem 2: Ritmo Circadiano y Ayuno',
        'Sem 3: Energía y Estabilidad',
      ],
      includes: [
        'Portal web con historial, guía PDF y plan personalizado',
        'Acompañamiento vía WhatsApp las 3 semanas',
        '1 videollamada de cierre 1 a 1 en plataforma',
      ],
      ctaLabel: 'Unirme — $97',
    },
    {
      id: 'plan_1_reinicio',
      tier: 'core',
      name: 'Plan 1: Reinicio Metabólico',
      duration: '1 mes',
      regularPrice: 200,
      launchPrice: 150,
      savingsText: 'Ahorras $50 (25% desc.)',
      modality: 'Plataforma Web + WhatsApp semanal + 2 videollamadas 1 a 1 (inicial y cierre)',
      roadmap: [
        'Paso 1: Freno a la Inflamación',
        'Paso 2: Activación Metabólica',
        'Paso 3: Energía y Estabilidad',
      ],
      includes: [
        'Protocolo base y guía de alimentos en portal web',
        'Lista de compras ancestral y soporte semanal vía WhatsApp',
        '2 videollamadas 1 a 1 en plataforma (1 inicial + 1 de cierre)',
      ],
      ctaLabel: 'Plan 1 — $150',
    },
    {
      id: 'plan_2_transformacion',
      tier: 'core',
      badge: 'RECOMENDADO',
      name: 'Plan 2: Transformación Celular',
      duration: '3 meses',
      regularPrice: 450,
      launchPrice: 340,
      savingsText: 'Ahorras $110 (24% desc.)',
      modality: 'Web + WhatsApp directo + 4 videollamadas 1 a 1 (inicial + 1/mes)',
      roadmap: [
        'Paso 1: Sincronización Circadiana',
        'Paso 2: Flexibilidad Metabólica',
        'Paso 3: Hábitos Inquebrantables',
      ],
      includes: [
        'Todo lo del Plan 1 dentro de tu portal',
        'Acompañamiento directo vía WhatsApp con Manuel',
        '4 videollamadas 1 a 1 en plataforma (1 inicial + 1/mes)',
        'Biblioteca de recetas ancestrales y ejercicios en solo lectura (15 de cada una)',
        'Escáner nutricional por foto con IA (hasta 5 análisis/mes)',
      ],
      ctaLabel: 'Plan 2 — $340',
    },
    {
      id: 'plan_3_maestria',
      tier: 'core',
      name: 'Plan 3: Maestría y Longevidad',
      duration: '6 meses',
      regularPrice: 900,
      launchPrice: 590,
      savingsText: 'Ahorras $310 (34% desc.)',
      modality: 'Web + WhatsApp prioritario + 7 videollamadas 1 a 1 (inicial + 1/mes)',
      roadmap: [
        'Paso 1: Reducción Carga Tóxica',
        'Paso 2: Fuerza Biológica',
        'Paso 3: Autonomía de por Vida',
      ],
      includes: [
        'Portal completo y evolución de biomarcadores',
        'Canal prioritario en WhatsApp los 6 meses',
        '7 videollamadas 1 a 1 en plataforma (1 inicial + 1/mes)',
        'Acceso completo de lectura a todas las recetas ancestrales y ejercicios',
        'Escáner nutricional por foto con IA ampliado (hasta 30 análisis/mes)',
      ],
      ctaLabel: 'Plan 3 — $590',
    },
  ],
};

const EN_COPY: LandingPlansCopy = {
  ribbon: 'Limited monthly spots',
  title: 'Choose Your Plan & Transform Your Health',
  regularLabel: 'Regular',
  modalityLabel: 'Format',
  roadmapLabel: 'Roadmap',
  includesLabel: 'Includes',
  unavailableLabel: 'No spots available',
  alreadyHaveAccount: 'Already have a client or coach account?',
  signInLink: 'Sign in to Portal →',
  consultModal: {
    badge: '1-on-1 Consultation • 45 min • $60 USD',
    title: 'Book Your Private Consultation',
    subtitle: 'No account needed. Enter your details, complete secure checkout, and immediately pick your time for your private video call.',
    nameLabel: 'Full name *',
    namePlaceholder: 'Your full name',
    emailLabel: 'Email address *',
    emailPlaceholder: 'you@example.com',
    phoneLabel: 'WhatsApp or phone (optional)',
    phonePlaceholder: '+1 555 000 0000',
    objectiveLabel: 'What would you like to improve first? (optional)',
    objectivePlaceholder: 'E.g. energy, sleep, digestion, metabolism...',
    submitLabel: 'Continue to checkout ($60 USD) →',
    submittingLabel: 'Connecting to Stripe...',
    cancelLabel: 'Cancel',
    securityNote: 'After payment, we will redirect you to pick your time slot and email you the booking link.',
    errorGeneric: 'Could not start checkout. Please check your details and try again.',
  },
  plans: [
    {
      id: 'consult_1on1',
      tier: 'top',
      name: '1-on-1 Private Consultation',
      duration: '45 min',
      regularPrice: 80,
      launchPrice: 60,
      savingsText: 'Save $20 (25% off)',
      modality: '1-on-1 Private Video Call',
      includes: [
        'Direct evaluation of habits & sleep with Manuel Martínez',
        'Root-cause diagnosis and immediate priorities',
        'Actionable protocol to apply from day one',
      ],
      ctaLabel: 'Book — $60',
    },
    {
      id: 'reto_tres_nel',
      tier: 'top',
      name: '3S NEL Challenge',
      duration: '3 weeks',
      regularPrice: 130,
      launchPrice: 97,
      savingsText: 'Save $33 (25% off)',
      modality: 'Web + PDF Guide + WhatsApp + 1 closing video call',
      roadmap: [
        'Wk 1: Cleanse & Anti-Inflammation',
        'Wk 2: Circadian Rhythm & Fasting',
        'Wk 3: Energy & Stability',
      ],
      includes: [
        'Web portal with health profile & PDF handbook',
        'WhatsApp follow-up across all 3 weeks',
        '1 closing 1-on-1 video call on platform',
      ],
      ctaLabel: 'Join — $97',
    },
    {
      id: 'plan_1_reinicio',
      tier: 'core',
      name: 'Plan 1: Metabolic Reset',
      duration: '1 month',
      regularPrice: 200,
      launchPrice: 150,
      savingsText: 'Save $50 (25% off)',
      modality: 'Web Platform + Weekly WhatsApp + 2 1-on-1 video calls (initial & closing)',
      roadmap: [
        'Step 1: Stop Inflammation',
        'Step 2: Metabolic Activation',
        'Step 3: Energy & Stability',
      ],
      includes: [
        'Core clean-food protocol inside the web portal',
        'Ancestral shopping list & weekly async WhatsApp support',
        '2 1-on-1 platform video calls (1 initial + 1 closing)',
      ],
      ctaLabel: 'Plan 1 — $150',
    },
    {
      id: 'plan_2_transformacion',
      tier: 'core',
      badge: 'RECOMMENDED',
      name: 'Plan 2: Cellular Transformation',
      duration: '3 months',
      regularPrice: 450,
      launchPrice: 340,
      savingsText: 'Save $110 (24% off)',
      modality: 'Web + Direct WhatsApp + 4 1-on-1 video calls (initial + 1/mo)',
      roadmap: [
        'Step 1: Circadian Sync & Sleep',
        'Step 2: Metabolic Flexibility',
        'Step 3: Unbreakable Habits',
      ],
      includes: [
        'Everything in Plan 1 inside your portal',
        'Direct WhatsApp guidance with Manuel',
        '4 1-on-1 platform video calls (1 initial + 1/mo)',
        'Read-only ancestral recipes & exercises libraries (15 items each)',
        'AI nutritional photo scanner (up to 5 scans/month)',
      ],
      ctaLabel: 'Plan 2 — $340',
    },
    {
      id: 'plan_3_maestria',
      tier: 'core',
      name: 'Plan 3: Mastery & Longevity',
      duration: '6 months',
      regularPrice: 900,
      launchPrice: 590,
      savingsText: 'Save $310 (34% off)',
      modality: 'Web + Priority WhatsApp + 7 1-on-1 video calls (initial + 1/mo)',
      roadmap: [
        'Step 1: Toxic Load Reduction',
        'Step 2: Biological Strength',
        'Step 3: Lifelong Autonomy',
      ],
      includes: [
        'Full portal access & biomarker progress tracking',
        'Priority WhatsApp channel all 6 months',
        '7 1-on-1 platform video calls (1 initial + 1/mo)',
        'Full read-only access to the complete recipes & exercises libraries',
        'Expanded AI nutritional photo scanner (up to 30 scans/month)',
      ],
      ctaLabel: 'Plan 3 — $590',
    },
  ],
};

const FR_COPY: LandingPlansCopy = {
  ribbon: 'Places limitées par mois',
  title: 'Choisissez Votre Plan et Transformez Votre Santé',
  regularLabel: 'Tarif normal',
  modalityLabel: 'Format',
  roadmapLabel: 'Parcours',
  includesLabel: 'Inclus',
  unavailableLabel: 'Places indisponibles',
  alreadyHaveAccount: 'Vous avez déjà un compte client ou coach ?',
  signInLink: 'Se connecter au Portail →',
  consultModal: {
    badge: 'Consultation 1 à 1 • 45 min • 60 $ USD',
    title: 'Réservez Votre Consultation Privée',
    subtitle: 'Sans créer de compte. Saisissez vos coordonnées, réglez en toute sécurité et choisissez votre créneau pour votre appel vidéo privé.',
    nameLabel: 'Nom complet *',
    namePlaceholder: 'Votre prénom et nom',
    emailLabel: 'Adresse e-mail *',
    emailPlaceholder: 'vous@exemple.com',
    phoneLabel: 'WhatsApp ou téléphone (optionnel)',
    phonePlaceholder: '+33 6 00 00 00 00',
    objectiveLabel: 'Que souhaitez-vous améliorer en priorité ? (optionnel)',
    objectivePlaceholder: 'Ex : énergie, sommeil, digestion, métabolisme...',
    submitLabel: 'Continuer vers le paiement (60 $ USD) →',
    submittingLabel: 'Connexion à Stripe...',
    cancelLabel: 'Annuler',
    securityNote: 'Après le paiement, vous pourrez choisir votre créneau et recevrez également le lien par e-mail.',
    errorGeneric: 'Impossible de lancer le paiement. Vérifiez vos informations et réessayez.',
  },
  plans: [
    {
      id: 'consult_1on1',
      tier: 'top',
      name: 'Consultation Privée 1 à 1',
      duration: '45 min',
      regularPrice: 80,
      launchPrice: 60,
      savingsText: 'Économisez 20 $ (-25 %)',
      modality: 'Appel vidéo privé 1 à 1',
      includes: [
        'Évaluation directe de vos habitudes avec Manuel Martínez',
        'Diagnostic des causes profondes et priorités immédiates',
        'Plan d’action concret dès le premier jour',
      ],
      ctaLabel: 'Réserver — $60',
    },
    {
      id: 'reto_tres_nel',
      tier: 'top',
      name: 'Défi 3S NEL',
      duration: '3 semaines',
      regularPrice: 130,
      launchPrice: 97,
      savingsText: 'Économisez 33 $ (-25 %)',
      modality: 'Web + Guide PDF + WhatsApp + 1 appel vidéo final',
      roadmap: [
        'Sem 1 : Nettoyage & Désinflammation',
        'Sem 2 : Rythme Circadien & Jeûne',
        'Sem 3 : Énergie & Stabilité',
      ],
      includes: [
        'Portail web avec profil santé et guide PDF',
        'Suivi via WhatsApp pendant les 3 semaines',
        '1 appel vidéo 1 à 1 de clôture sur la plateforme',
      ],
      ctaLabel: 'Rejoindre — $97',
    },
    {
      id: 'plan_1_reinicio',
      tier: 'core',
      name: 'Plan 1 : Réinitialisation Métabolique',
      duration: '1 mois',
      regularPrice: 200,
      launchPrice: 150,
      savingsText: 'Économisez 50 $ (-25 %)',
      modality: 'Web + WhatsApp hebdo + 2 appels vidéo 1 à 1 (initial et final)',
      roadmap: [
        'Étape 1 : Freiner l’Inflammation',
        'Étape 2 : Activation Métabolique',
        'Étape 3 : Énergie & Stabilité',
      ],
      includes: [
        'Protocole de base et guide alimentaire sur le portail',
        'Liste de courses ancestrale et support hebdo WhatsApp',
        '2 appels vidéo 1 à 1 sur la plateforme (1 initial + 1 final)',
      ],
      ctaLabel: 'Plan 1 — $150',
    },
    {
      id: 'plan_2_transformacion',
      tier: 'core',
      badge: 'RECOMMANDÉ',
      name: 'Plan 2 : Transformation Cellulaire',
      duration: '3 mois',
      regularPrice: 450,
      launchPrice: 340,
      savingsText: 'Économisez 110 $ (-24 %)',
      modality: 'Web + WhatsApp direct + 4 appels vidéo 1 à 1 (initial + 1/mois)',
      roadmap: [
        'Étape 1 : Synchro Circadienne',
        'Étape 2 : Flexibilité Métabolique',
        'Étape 3 : Habitudes Durables',
      ],
      includes: [
        'Tout le Plan 1 inclus dans votre portail',
        'Accompagnement direct WhatsApp avec Manuel',
        '4 appels vidéo 1 à 1 sur la plateforme (1 initial + 1/mois)',
        'Bibliothèques de recettes ancestrales et d’exercices en lecture seule (15 chacun)',
        'Scanner nutritionnel photo avec IA (jusqu’à 5 analyses/mois)',
      ],
      ctaLabel: 'Plan 2 — $340',
    },
    {
      id: 'plan_3_maestria',
      tier: 'core',
      name: 'Plan 3 : Maîtrise & Longévité',
      duration: '6 mois',
      regularPrice: 900,
      launchPrice: 590,
      savingsText: 'Économisez 310 $ (-34 %)',
      modality: 'Web + WhatsApp prioritaire + 7 appels vidéo 1 à 1 (initial + 1/mois)',
      roadmap: [
        'Étape 1 : Réduction Charge Toxique',
        'Étape 2 : Force Biologique',
        'Étape 3 : Autonomie à Vie',
      ],
      includes: [
        'Accès complet et suivi continu des biomarqueurs',
        'Canal WhatsApp prioritaire pendant 6 mois',
        '7 appels vidéo 1 à 1 sur la plateforme (1 initial + 1/mois)',
        'Accès complet en lecture seule à toutes les recettes ancestrales et exercices',
        'Scanner nutritionnel photo IA étendu (jusqu’à 30 analyses/mois)',
      ],
      ctaLabel: 'Plan 3 — $590',
    },
  ],
};

const IT_COPY: LandingPlansCopy = {
  ribbon: 'Posti limitati ogni mese',
  title: 'Scegli il Tuo Piano e Trasforma la Tua Salute',
  regularLabel: 'Regolare',
  modalityLabel: 'Modalità',
  roadmapLabel: 'Percorso',
  includesLabel: 'Include',
  unavailableLabel: 'Posti non disponibili',
  alreadyHaveAccount: 'Hai già un account cliente o consulente?',
  signInLink: 'Accedi al Portale →',
  consultModal: {
    badge: 'Consulenza 1 a 1 • 45 min • $60 USD',
    title: 'Prenota la Tua Consulenza Privata',
    subtitle: 'Senza creare account. Inserisci i tuoi dati, completa il pagamento sicuro e scegli subito il tuo orario per la videochiamata privata.',
    nameLabel: 'Nome completo *',
    namePlaceholder: 'Il tuo nome e cognome',
    emailLabel: 'Indirizzo email *',
    emailPlaceholder: 'tu@esempio.com',
    phoneLabel: 'WhatsApp o telefono (opzionale)',
    phonePlaceholder: '+39 300 000 0000',
    objectiveLabel: 'Cosa vorresti migliorare per primo? (opzionale)',
    objectivePlaceholder: 'Es: energia, sonno, digestione, metabolismo...',
    submitLabel: 'Procedi al pagamento ($60 USD) →',
    submittingLabel: 'Connessione a Stripe...',
    cancelLabel: 'Annulla',
    securityNote: 'Dopo il pagamento ti reindirizzeremo per scegliere il tuo orario e riceverai il link anche via email.',
    errorGeneric: 'Impossibile avviare il pagamento. Controlla i dati e riprova.',
  },
  plans: [
    {
      id: 'consult_1on1',
      tier: 'top',
      name: 'Consulenza Privata 1 a 1',
      duration: '45 min',
      regularPrice: 80,
      launchPrice: 60,
      savingsText: 'Risparmi $20 (-25%)',
      modality: 'Videochiamata privata 1 a 1',
      includes: [
        'Valutazione diretta di abitudini e riposo con Manuel Martínez',
        'Diagnosi delle cause profonde e priorità immediate',
        'Piano d’azione pratico fin dal primo giorno',
      ],
      ctaLabel: 'Prenota — $60',
    },
    {
      id: 'reto_tres_nel',
      tier: 'top',
      name: 'Sfida 3S NEL',
      duration: '3 settimane',
      regularPrice: 130,
      launchPrice: 97,
      savingsText: 'Risparmi $33 (-25%)',
      modality: 'Web + Guida PDF + WhatsApp + 1 videochiamata finale',
      roadmap: [
        'Sett 1: Pulizia e Disinfiammazione',
        'Sett 2: Ritmo Circadiano e Digiuno',
        'Sett 3: Energia e Stabilità',
      ],
      includes: [
        'Portale web con profilo salute e guida PDF',
        'Supporto WhatsApp per tutte le 3 settimane',
        '1 videochiamata finale 1 a 1 in piattaforma',
      ],
      ctaLabel: 'Partecipa — $97',
    },
    {
      id: 'plan_1_reinicio',
      tier: 'core',
      name: 'Piano 1: Reset Metabolico',
      duration: '1 mese',
      regularPrice: 200,
      launchPrice: 150,
      savingsText: 'Risparmi $50 (-25%)',
      modality: 'Web + WhatsApp sett. + 2 videochiamate 1 a 1 (iniziale e finale)',
      roadmap: [
        'Passo 1: Stop all’Infiammazione',
        'Passo 2: Attivazione Metabolica',
        'Passo 3: Energia e Stabilità',
      ],
      includes: [
        'Protocollo base e guida alimentare nel portale',
        'Lista della spesa ancestrale e supporto WhatsApp settimanale',
        '2 videochiamate 1 a 1 in piattaforma (1 iniziale + 1 finale)',
      ],
      ctaLabel: 'Piano 1 — $150',
    },
    {
      id: 'plan_2_transformacion',
      tier: 'core',
      badge: 'CONSIGLIATO',
      name: 'Piano 2: Trasformazione Cellulare',
      duration: '3 mesi',
      regularPrice: 450,
      launchPrice: 340,
      savingsText: 'Risparmi $110 (-24%)',
      modality: 'Web + WhatsApp diretto + 4 videochiamate 1 a 1 (iniziale + 1/mese)',
      roadmap: [
        'Passo 1: Sincronia Circadiana',
        'Passo 2: Flessibilità Metabolica',
        'Passo 3: Abitudini Incrollabili',
      ],
      includes: [
        'Tutto ciò del Piano 1 nel tuo portale',
        'Supporto diretto WhatsApp con Manuel',
        '4 videochiamate 1 a 1 in piattaforma (1 iniziale + 1/mese)',
        'Librerie di ricette ancestrali ed esercizi in sola lettura (15 ciascuna)',
        'Scanner nutrizionale fotografico con IA (fino a 5 analisi/mese)',
      ],
      ctaLabel: 'Piano 2 — $340',
    },
    {
      id: 'plan_3_maestria',
      tier: 'core',
      name: 'Piano 3: Maestria e Longevità',
      duration: '6 mesi',
      regularPrice: 900,
      launchPrice: 590,
      savingsText: 'Risparmi $310 (-34%)',
      modality: 'Web + WhatsApp prioritario + 7 videochiamate 1 a 1 (iniziale + 1/mese)',
      roadmap: [
        'Passo 1: Riduzione Carico Tossico',
        'Passo 2: Forza Biologica',
        'Passo 3: Autonomia a Vita',
      ],
      includes: [
        'Accesso completo e monitoraggio biomarcatori',
        'Canale WhatsApp prioritario per 6 mesi',
        '7 videochiamate 1 a 1 in piattaforma (1 iniziale + 1/mese)',
        'Accesso completo in sola lettura a tutte le ricette ancestrali e gli esercizi',
        'Scanner nutrizionale fotografico IA esteso (fino a 30 analisi/mese)',
      ],
      ctaLabel: 'Piano 3 — $590',
    },
  ],
};

const PT_COPY: LandingPlansCopy = {
  ribbon: 'Vagas limitadas por mês',
  title: 'Escolha Seu Plano e Transforme Sua Saúde',
  regularLabel: 'Regular',
  modalityLabel: 'Modalidade',
  roadmapLabel: 'Rota',
  includesLabel: 'Inclui',
  unavailableLabel: 'Vagas indisponíveis',
  alreadyHaveAccount: 'Já criou sua conta de cliente ou consultor?',
  signInLink: 'Entrar no Portal →',
  consultModal: {
    badge: 'Consulta 1 a 1 • 45 min • $60 USD',
    title: 'Agende Sua Consulta Privada',
    subtitle: 'Sem criar conta. Preencha seus dados, faça o pagamento seguro e escolha seu horário na hora para sua chamada de vídeo privada.',
    nameLabel: 'Nome completo *',
    namePlaceholder: 'Seu nome completo',
    emailLabel: 'E-mail *',
    emailPlaceholder: 'voce@exemplo.com',
    phoneLabel: 'WhatsApp ou telefone (opcional)',
    phonePlaceholder: '+55 11 90000-0000',
    objectiveLabel: 'O que você gostaria de melhorar primeiro? (opcional)',
    objectivePlaceholder: 'Ex: energia, sono, digestão, metabolismo...',
    submitLabel: 'Ir para o pagamento ($60 USD) →',
    submittingLabel: 'Conectando com a Stripe...',
    cancelLabel: 'Cancelar',
    securityNote: 'Após o pagamento, redirecionaremos você para escolher seu horário e enviaremos o link por e-mail.',
    errorGeneric: 'Não foi possível iniciar o pagamento. Verifique seus dados e tente novamente.',
  },
  plans: [
    {
      id: 'consult_1on1',
      tier: 'top',
      name: 'Consulta Privada 1 a 1',
      duration: '45 min',
      regularPrice: 80,
      launchPrice: 60,
      savingsText: 'Economize $20 (25% desc.)',
      modality: 'Chamada de vídeo privada 1 a 1',
      includes: [
        'Avaliação direta de hábitos e sono com Manuel Martínez',
        'Diagnóstico de causas raiz e prioridades imediatas',
        'Plano de ação prático desde o primeiro dia',
      ],
      ctaLabel: 'Agendar — $60',
    },
    {
      id: 'reto_tres_nel',
      tier: 'top',
      name: 'Desafio 3S NEL',
      duration: '3 semanas',
      regularPrice: 130,
      launchPrice: 97,
      savingsText: 'Economize $33 (25% desc.)',
      modality: 'Web + Guia PDF + WhatsApp + 1 chamada de vídeo final',
      roadmap: [
        'Sem 1: Limpeza e Desinflamação',
        'Sem 2: Ritmo Circadiano e Jejum',
        'Sem 3: Energia e Estabilidade',
      ],
      includes: [
        'Portal web com histórico e guia em PDF',
        'Acompanhamento via WhatsApp por 3 semanas',
        '1 chamada de vídeo 1 a 1 de encerramento na plataforma',
      ],
      ctaLabel: 'Participar — $97',
    },
    {
      id: 'plan_1_reinicio',
      tier: 'core',
      name: 'Plano 1: Reinício Metabólico',
      duration: '1 mês',
      regularPrice: 200,
      launchPrice: 150,
      savingsText: 'Economize $50 (25% desc.)',
      modality: 'Web + WhatsApp semanal + 2 chamadas de vídeo 1 a 1 (inicial e final)',
      roadmap: [
        'Passo 1: Freio à Inflamação',
        'Passo 2: Ativação Metabólica',
        'Passo 3: Energia e Estabilidade',
      ],
      includes: [
        'Protocolo base e guia alimentar no portal web',
        'Lista de compras ancestral e suporte semanal via WhatsApp',
        '2 chamadas de vídeo 1 a 1 na plataforma (1 inicial + 1 final)',
      ],
      ctaLabel: 'Plano 1 — $150',
    },
    {
      id: 'plan_2_transformacion',
      tier: 'core',
      badge: 'RECOMENDADO',
      name: 'Plano 2: Transformação Celular',
      duration: '3 meses',
      regularPrice: 450,
      launchPrice: 340,
      savingsText: 'Economize $110 (24% desc.)',
      modality: 'Web + WhatsApp direto + 4 chamadas de vídeo 1 a 1 (inicial + 1/mês)',
      roadmap: [
        'Passo 1: Sincronização Circadiana',
        'Passo 2: Flexibilidade Metabólica',
        'Passo 3: Hábitos Inquebráveis',
      ],
      includes: [
        'Tudo do Plano 1 dentro do seu portal',
        'Acompanhamento direto via WhatsApp com Manuel',
        '4 chamadas de vídeo 1 a 1 na plataforma (1 inicial + 1/mês)',
        'Bibliotecas de receitas ancestrais e exercícios somente leitura (15 itens cada)',
        'Scanner nutricional por foto com IA (até 5 análises/mês)',
      ],
      ctaLabel: 'Plano 2 — $340',
    },
    {
      id: 'plan_3_maestria',
      tier: 'core',
      name: 'Plano 3: Maestria e Longevidade',
      duration: '6 meses',
      regularPrice: 900,
      launchPrice: 590,
      savingsText: 'Economize $310 (34% desc.)',
      modality: 'Web + WhatsApp prioritário + 7 chamadas de vídeo 1 a 1 (inicial + 1/mês)',
      roadmap: [
        'Passo 1: Redução Carga Tóxica',
        'Passo 2: Força Biológica',
        'Passo 3: Autonomia para a Vida',
      ],
      includes: [
        'Portal completo e evolução de biomarcadores',
        'Canal prioritário no WhatsApp por 6 meses',
        '7 chamadas de vídeo 1 a 1 na plataforma (1 inicial + 1/mês)',
        'Acesso completo somente leitura a toda a biblioteca de receitas ancestrais e exercícios',
        'Scanner nutricional por foto com IA ampliado (até 30 análises/mês)',
      ],
      ctaLabel: 'Plano 3 — $590',
    },
  ],
};

const DE_COPY: LandingPlansCopy = {
  ribbon: 'Begrenzte Plätze pro Monat',
  title: 'Wähle Deinen Plan & Verwandle Deine Gesundheit',
  regularLabel: 'Regulär',
  modalityLabel: 'Format',
  roadmapLabel: 'Fahrplan',
  includesLabel: 'Enthält',
  unavailableLabel: 'Keine Plätze verfügbar',
  alreadyHaveAccount: 'Hast du bereits ein Kunden- oder Beraterkonto?',
  signInLink: 'Im Portal anmelden →',
  consultModal: {
    badge: '1:1 Beratung • 45 Min. • $60 USD',
    title: 'Buche Deine Private Beratung',
    subtitle: 'Kein Konto nötig. Gib deine Daten ein, bezahle sicher und wähle sofort deinen Termin für dein privates Videogespräch.',
    nameLabel: 'Vollständiger Name *',
    namePlaceholder: 'Dein Vor- und Nachname',
    emailLabel: 'E-Mail-Adresse *',
    emailPlaceholder: 'du@beispiel.de',
    phoneLabel: 'WhatsApp oder Telefon (optional)',
    phonePlaceholder: '+49 170 0000000',
    objectiveLabel: 'Was möchtest du zuerst verbessern? (optional)',
    objectivePlaceholder: 'Z. B. Energie, Schlaf, Verdauung, Stoffwechsel...',
    submitLabel: 'Weiter zur Zahlung ($60 USD) →',
    submittingLabel: 'Verbinde mit Stripe...',
    cancelLabel: 'Abbrechen',
    securityNote: 'Nach der Zahlung leiten wir dich zur Terminauswahl weiter und senden dir den Link per E-Mail.',
    errorGeneric: 'Zahlung konnte nicht gestartet werden. Bitte prüfe deine Angaben.',
  },
  plans: [
    {
      id: 'consult_1on1',
      tier: 'top',
      name: 'Private 1:1 Beratung',
      duration: '45 Min.',
      regularPrice: 80,
      launchPrice: 60,
      savingsText: '$20 sparen (25% Rabatt)',
      modality: 'Privates 1:1 Videogespräch',
      includes: [
        'Direkte Analyse von Gewohnheiten & Schlaf mit Manuel',
        'Ursachendiagnose und sofortige Prioritäten',
        'Praktischer Aktionsplan ab dem ersten Tag',
      ],
      ctaLabel: 'Buchen — $60',
    },
    {
      id: 'reto_tres_nel',
      tier: 'top',
      name: '3S-NEL-Challenge',
      duration: '3 Wochen',
      regularPrice: 130,
      launchPrice: 97,
      savingsText: '$33 sparen (25% Rabatt)',
      modality: 'Web + PDF-Guide + WhatsApp + 1 Abschluss-Videoanruf',
      roadmap: [
        'Woche 1: Entgiftung & Beruhigung',
        'Woche 2: Zirkadianer Rhythmus',
        'Woche 3: Stabile Energie',
      ],
      includes: [
        'Web-Portal mit Profil, Plan & PDF-Handbuch',
        'WhatsApp-Begleitung über alle 3 Wochen',
        '1 abschließender 1:1 Videoanruf in der Plattform',
      ],
      ctaLabel: 'Teilnehmen — $97',
    },
    {
      id: 'plan_1_reinicio',
      tier: 'core',
      name: 'Plan 1: Stoffwechsel-Reset',
      duration: '1 Monat',
      regularPrice: 200,
      launchPrice: 150,
      savingsText: '$50 sparen (25% Rabatt)',
      modality: 'Web-Plattform + Wöchentl. WhatsApp + 2 Videoanrufe 1:1 (Start & Abschluss)',
      roadmap: [
        'Schritt 1: Entzündung stoppen',
        'Schritt 2: Stoffwechsel aktivieren',
        'Schritt 3: Energie & Stabilität',
      ],
      includes: [
        'Basisprotokoll & Lebensmittel-Guide im Web-Portal',
        'Evolutionäre Einkaufsliste & wöchentlicher WhatsApp-Support',
        '2 1:1 Videoanrufe in der Plattform (1 Start + 1 Abschluss)',
      ],
      ctaLabel: 'Plan 1 — $150',
    },
    {
      id: 'plan_2_transformacion',
      tier: 'core',
      badge: 'EMPFOHLEN',
      name: 'Plan 2: Zelluläre Transformation',
      duration: '3 Monate',
      regularPrice: 450,
      launchPrice: 340,
      savingsText: '$110 sparen (24% Rabatt)',
      modality: 'Web + Direkter WhatsApp + 4 Videoanrufe 1:1 (Start + 1/Monat)',
      roadmap: [
        'Schritt 1: Zirkadiane Synchronisation',
        'Schritt 2: Stoffwechsel-Flexibilität',
        'Schritt 3: Starke Gewohnheiten',
      ],
      includes: [
        'Alles aus Plan 1 in deinem persönlichen Portal',
        'Direkte WhatsApp-Begleitung mit Manuel',
        '4 1:1 Videoanrufe in der Plattform (1 Start + 1/Monat)',
        'Lesezugriff auf evolutionäre Rezept- und Übungsbibliotheken (je 15 Einträge)',
        'KI-Foto-Ernährungsscanner (bis zu 5 Analysen/Monat)',
      ],
      ctaLabel: 'Plan 2 — $340',
    },
    {
      id: 'plan_3_maestria',
      tier: 'core',
      name: 'Plan 3: Meisterschaft & Langlebigkeit',
      duration: '6 Monate',
      regularPrice: 900,
      launchPrice: 590,
      savingsText: '$310 sparen (34% Rabatt)',
      modality: 'Web + Prioritäts-WhatsApp + 7 Videoanrufe 1:1 (Start + 1/Monat)',
      roadmap: [
        'Schritt 1: Toxinbelastung senken',
        'Schritt 2: Biologische Resilienz',
        'Schritt 3: Lebenslange Autonomie',
      ],
      includes: [
        'Voller Portalzugang & Biomarker-Verlauf',
        'Prioritäts-WhatsApp-Kanal für 6 Monate',
        '7 1:1 Videoanrufe in der Plattform (1 Start + 1/Monat)',
        'Voller Lesezugriff auf die gesamte Rezept- und Übungsbibliothek',
        'Erweiterter KI-Foto-Ernährungsscanner (bis zu 30 Analysen/Monat)',
      ],
      ctaLabel: 'Plan 3 — $590',
    },
  ],
};

export function getLandingPlansCopy(lang: string): LandingPlansCopy {
  const short = (lang || 'es').split('-')[0].toLowerCase();
  if (short === 'en') return EN_COPY;
  if (short === 'fr') return FR_COPY;
  if (short === 'it') return IT_COPY;
  if (short === 'pt') return PT_COPY;
  if (short === 'de') return DE_COPY;
  return ES_COPY;
}
