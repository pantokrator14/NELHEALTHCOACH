// apps/dashboard/src/lib/formConstants.ts

// Opciones de frecuencia
export const frequencyOptions = [
  { value: 'nunca', label: 'Nunca' },
  { value: 'rara-vez', label: 'Rara vez' },
  { value: 'a-veces', label: 'A veces' },
  { value: 'casi-siempre', label: 'Casi siempre' },
  { value: 'siempre', label: 'Siempre' },
];

// Opciones Sí/No
export const yesNoOptions = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];

// Mapeo de valores a etiquetas (para mostrar respuestas)
export const valueLabels: Record<string, string> = {
  // Frecuencias
  'nunca': 'Nunca',
  'rara-vez': 'Rara vez',
  'a-veces': 'A veces',
  'casi-siempre': 'Casi siempre',
  'siempre': 'Siempre',
  // Sí/No
  'si': 'Sí',
  'no': 'No',
  // Objetivos
  'perder-peso': 'Perder peso / grasa corporal',
  'ganar-musculo': 'Ganar masa muscular / tonificar',
  'mas-energia': 'Tener más energía durante el día',
  'mejorar-digestion': 'Mejorar mi digestión',
  'reducir-estres': 'Reducir el estrés y la ansiedad',
  'dormir-mejor': 'Dormir mejor',
  'prevenir-enfermedades': 'Prevenir enfermedades futuras',
  'rendimiento-deportivo': 'Mejorar mi rendimiento deportivo',
  'manejar-condicion': 'Manejar una condición de salud específica',
  // Compromiso
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  // Experiencia previa
  'true': 'Sí',
  'false': 'No',
  // Cambios apetito
  'mucho-hambre': 'Sí, mucha más hambre',
  'mucha-sed': 'Sí, mucha más sed',
  // Red de apoyo
  'si-tengo': 'Sí, tengo personas de confianza',
  'algunas': 'Tengo algunas personas, pero no siempre me siento cómodo/a',
  'no.': 'No, me siento solo/a en este aspecto',
  // Estrés diario
  'bajo': 'Bajo',
  'moderado': 'Moderado',
  'alto': 'Alto',
  'muy-alto': 'Muy Alto',
};

// Preguntas de Objetivos
export const objectivesQuestions = {
  motivation: '¿Cuál es tu motivación principal? (Selecciona hasta 3)',
  commitmentLevel: 'En una escala del 1 al 10, ¿cuál es tu nivel de compromiso para realizar cambios en tus hábitos en los próximos 3 meses?',
  previousCoachExperience: '¿Has trabajado antes con un coach de salud o nutricionista?',
  previousCoachExperienceDetails: 'Si respondiste que sí, ¿qué fue lo que funcionó bien y qué no?',
  targetDate: '¿Tienes alguna fecha límite o evento importante en mente para alcanzar tus objetivos?',
};

// Preguntas de Estilo de Vida
export const lifestyleQuestions = {
  typicalWeekday: 'Describe un día típico entre semana (desde que te levantas hasta que te acuestas). Incluye horarios de comidas, trabajo y tiempo libre.',
  typicalWeekend: '¿Cómo es un día típico de fin de semana? ¿Es muy diferente al de entre semana?',
  whoCooks: '¿Quién cocina en casa principalmente? ¿Con qué frecuencia comes fuera de casa o pides comida a domicilio?',
  currentActivityLevel: '¿Cuál es tu nivel de actividad física actual? ¿Qué tipo de ejercicio disfrutas o estarías dispuesto a probar?',
  physicalLimitations: '¿Tienes alguna lesión o limitación física que debamos tener en cuenta al recomendar ejercicios?',
};

// Preguntas de Evaluaciones de Salud
export const evaluationQuestions: Record<string, { title: string; questions: string[] }> = {
  carbohydrateAddiction: {
    title: 'Adicción a los carbohidratos',
    questions: [
      '¿El primer alimento que consumes en el día es de sabor dulce (azúcar o carbohidrato)?',
      '¿Consumes alimentos procesados (los que tienen más de 5 ingredientes)?',
      'Durante el último año ¿has comido más azúcar de lo que pretendías?',
      '¿Alguna vez has dejado de hacer tus actividades cotidianas por comer alimentos con azúcar?',
      '¿Sientes que necesitas o que deberías reducir tu consumo de azúcar?',
      '¿Alguna vez has comido alimentos con azúcar para calmar una emoción (fatiga, tristeza, enojo, aburrimiento)?',
      '¿Haces más de 5 comidas al día? ¿Comes cada 3-4 horas?',
      '¿Te da dolor de cabeza si pasas más de 4 horas sin comer?',
      '¿Piensas constantemente en alimentos con azúcar?',
      '¿Crees que debes terminar la comida con un alimento dulce?',
      '¿Sientes que no tienes control en lo que comes?'
    ]
  },
  leptinResistance: {
    title: 'Resistencia a la leptina',
    questions: [
      '¿Tienes sobrepeso u obesidad?',
      '¿Tienes hambre constantemente?',
      '¿Tienes antojos por carbohidratos, especialmente por las noches?',
      '¿Tienes problemas para dormir? (insomnio)',
      '¿Te sientes sin energía durante el día?',
      '¿Sientes que al despertar no descansaste bien durante la noche?',
      '¿Te ejercitas menos de 30 minutos al día?',
      '¿Te saltas el desayuno?'
    ]
  },
  circadianRhythms: {
    title: 'Alteración de los ritmos circadianos / Exposición al sol',
    questions: [
      '¿Lo primero que ves al despertar es tu celular?',
      '¿Estás expuesto a la luz artificial después del atardecer? (pantallas de computadoras, televisiones, celulares, tablets, focos de luz blanca o amarilla)',
      '¿Utilizas algún tipo de tecnología Wifi, 2G, 3G, 4G, 5G y/o luz artificial durante la noche?',
      '¿Exponerte al sol te hace daño (sufres quemaduras)?',
      '¿Utilizas gafas/lentes solares?',
      '¿Utilizas cremas o protectores solares?',
      '¿Comes pocos pescados, moluscos y/o crustáceos (menos de 1 vez a la semana)?',
      '¿Comes cuando ya no hay luz del sol?',
      '¿Tu exposición al sol es de menos de 30 minutos al día?',
      '¿Haces grounding (caminar descalzo sobre hierba, tierra, o arena) menos de 30 minutos al día?',
      '¿Utilizas filtros de luz azul en tus dispositivos electrónicos (modo noche, aplicaciones) por la noche?'
    ]
  },
  sleepHygiene: {
    title: 'Alteración en la higiene del sueño',
    questions: [
      '¿Duermes con el celular encendido cerca de ti?',
      '¿Te despiertas con la alarma del celular?',
      '¿La temperatura de tu habitación es muy caliente o muy fría?',
      '¿Entra luz artificial a tu habitación al momento de dormir?',
      '¿La cabecera de tu cama está pegada a la pared?',
      '¿Duermes con el wifi de tu casa encendido?',
      '¿Te duermes después de las 11 pm?',
      'Cuando te despiertas ¿ya amaneció?',
      '¿Duermes menos de 4 horas?',
      '¿Haces cenas copiosas?',
      '¿Te acuestas inmediatamente después de cenar?',
      '¿Tu horario de sueño es regular? (¿Te acuestas y levantas más o menos a la misma hora todos los días, incluidos fines de semana?)'
    ]
  },
  electrosmogExposure: {
    title: 'Exposición al electrosmog',
    questions: [
      'Al hacer llamadas por celular ¿te lo pegas a la oreja?',
      '¿Llevas el celular cerca de tu cuerpo (por ejemplo: en el bolsillo del pantalón)?',
      '¿Vives cerca de líneas de alta tensión?',
      '¿Utilizas el microondas?',
      '¿Presentas cansancio general durante el día? O ¿Duermes en exceso?',
      '¿Tienes piel sensible o con erupciones?',
      '¿Tienes taquicardia o arritmia?',
      '¿Tienes problemas de presión arterial?',
      '¿Tienes colon irritable?',
      '¿Tienes pérdida auditiva, oyes un zumbido (tinitus) o te duelen los oídos?'
    ]
  },
  generalToxicity: {
    title: 'Toxicidad general',
    questions: [
      '¿Bebes agua embotellada?',
      '¿Utilizas protector solar convencional?',
      '¿Algún miembro de tu familia ha sido diagnosticado con fibromialgia, fatiga crónica o sensibilidades químicas múltiples?',
      '¿Tienes algún historial de disfunción renal?',
      '¿Tienes tú o algún miembro de tu familia inmediata antecedentes de cáncer?',
      '¿Tienes algún historial de enfermedad cardíaca, infarto de miocardio (ataque cardíaco) o de accidentes cerebrovasculares?',
      '¿Alguna vez te han diagnosticado trastorno bipolar, esquizofrenia o depresión?',
      '¿Alguna vez te han diagnosticado diabetes o tiroiditis?',
      '¿Fumas o consumes algún tipo de vapeador?',
      '¿Consumes alcohol? ¿Con qué frecuencia y cantidad?'
    ]
  },
  microbiotaHealth: {
    title: 'Salud de la microbiota',
    questions: [
      '¿Sufres de estreñimiento o de diarrea?',
      '¿Sientes distensión, hinchazón, sensación de saciedad y/o ruidos en el intestino después de comer carbohidratos como brócoli, coles de Bruselas u otras verduras?',
      '¿Tienes a menudo gases con olor desagradable como a azufre?',
      '¿Alguna vez has sido vegano o vegetariano durante algún tiempo?',
      '¿Tienes intolerancia a la carne?',
      '¿Has usado o utilizas antiácidos, inhibidores de la bomba de protones o cualquier otro medicamento que bloquee el ácido?',
      'Cuando consumes alcohol, ¿tienes confusión mental o una sensación tóxica incluso después de 1 porción?',
      '¿Has tomado antibióticos durante un período prolongado o con frecuencia (aún de niño)?',
      '¿Naciste por cesárea?',
      '¿Tomaste leche de fórmula en lugar de ser amamantado?',
      '¿Consumes alimentos fermentados con regularidad (kéfir, chucrut, kombucha, yogur natural, kimchi)?',
      'En tu opinión, ¿crees que consumes suficiente fibra de frutas, verduras y legumbres?'
    ]
  }
};

// Preguntas de Salud Mental (opción múltiple)
export const mentalHealthMultipleChoiceQuestions: Record<string, string> = {
  mentalHealthEmotionIdentification: '¿Puedes identificar con facilidad qué emoción estás sintiendo en momentos clave de tu día (ej. enojo, tristeza, ansiedad, alegría)?',
  mentalHealthEmotionIntensity: '¿Cómo de intensas suelen ser tus emociones?',
  mentalHealthUncomfortableEmotion: '¿Qué haces cuando sientes una emoción incómoda?',
  mentalHealthInternalDialogue: 'Cuando algo sale mal, ¿cuál es tu diálogo interno más frecuente?',
  mentalHealthStressStrategies: 'Ante una situación estresante, ¿qué estrategias sueles utilizar?',
  mentalHealthSayingNo: '¿Te resulta difícil decir "no" por miedo a decepcionar a los demás?',
  mentalHealthRelationships: 'En tus relaciones, ¿sueles sentir que das más de lo que recibes?',
  mentalHealthExpressThoughts: '¿Expresas abiertamente lo que piensas y sientes, incluso cuando es incómodo?',
  mentalHealthEmotionalDependence: '¿Alguna relación actual o pasada te genera malestar o dependencia emocional?',
  mentalHealthPurpose: '¿Sientes que tienes un propósito o metas que te motivan?',
  mentalHealthFailureReaction: 'Cuando enfrentas un fracaso, ¿cómo reaccionas?',
  mentalHealthSelfConnection: '¿Practicas alguna rutina que te ayude a conectar contigo mismo/a (meditación, escritura, naturaleza, etc.)?',
  mentalHealthSupportNetwork: '¿Cuentas con una red de apoyo sólida (amigos, familia, pareja) con quien puedas hablar abiertamente?',
  mentalHealthDailyStress: 'En general, ¿cómo calificarías tu nivel de estrés diario?',
};

// Opciones para salud mental (valores -> etiquetas)
export const mentalHealthOptions: Record<string, Record<string, string>> = {
  mentalHealthEmotionIdentification: {
    a: 'Casi siempre',
    b: 'A veces',
    c: 'Rara vez'
  },
  mentalHealthEmotionIntensity: {
    a: 'Muy intensas, a veces me desbordan',
    b: 'Moderadas, las puedo manejar',
    c: 'Poco intensas, casi no las noto'
  },
  mentalHealthUncomfortableEmotion: {
    a: 'La evito o la reprimo',
    b: 'Me dejo llevar por ella sin control',
    c: 'La acepto y trato de entender su mensaje'
  },
  mentalHealthInternalDialogue: {
    a: '"Siempre me pasa a mí", "No sirvo para esto"',
    b: '"Es una oportunidad para aprender"',
    c: '"No puedo hacer nada para cambiarlo"'
  },
  mentalHealthStressStrategies: {
    a: 'Comer, fumar, distraerme con pantallas',
    b: 'Hablar con alguien, respirar, hacer deporte',
    c: 'Me bloqueo y no hago nada'
  },
  mentalHealthSayingNo: {
    a: 'Sí, casi siempre',
    b: 'Solo en algunas situaciones',
    c: 'No, priorizo mis necesidades'
  },
  mentalHealthRelationships: {
    a: 'Sí, con frecuencia',
    b: 'A veces',
    c: 'No, hay equilibrio'
  },
  mentalHealthExpressThoughts: {
    a: 'Casi nunca',
    b: 'Depende de la situación',
    c: 'Sí, de manera asertiva'
  },
  mentalHealthEmotionalDependence: {
    a: 'Sí',
    b: 'No estoy seguro/a',
    c: 'No'
  },
  mentalHealthPurpose: {
    a: 'Sí, claramente',
    b: 'Estoy en proceso de definirlas',
    c: 'No, me siento perdido/a'
  },
  mentalHealthFailureReaction: {
    a: 'Me hundo y tardo en recuperarme',
    b: 'Me frustro, pero sigo adelante',
    c: 'Lo veo como parte del aprendizaje'
  },
  mentalHealthSelfConnection: {
    a: 'Sí, regularmente',
    b: 'Ocasionalmente',
    c: 'No'
  },
  mentalHealthSupportNetwork: {
    'si-tengo': 'Sí, tengo personas de confianza',
    'algunas': 'Tengo algunas personas, pero no siempre me siento cómodo/a',
    'no': 'No, me siento solo/a en este aspecto'
  },
  mentalHealthDailyStress: {
    'bajo': 'Bajo',
    'moderado': 'Moderado',
    'alto': 'Alto',
    'muy-alto': 'Muy Alto'
  }
};

// Preguntas abiertas de salud mental
export const mentalHealthOpenQuestions: Record<string, string> = {
  mentalHealthSelfRelationship: 'Si tuvieras que describir tu relación contigo mismo/a en tres palabras, ¿cuáles serían?',
  mentalHealthLimitingBeliefs: '¿Hay alguna creencia o pensamiento recurrente que sientas que te limita en tu vida actual?',
  mentalHealthIdealBalance: 'Imagina que has alcanzado un equilibrio emocional ideal. ¿Qué cambiaría en tu día a día?',
};