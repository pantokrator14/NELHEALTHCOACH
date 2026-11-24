// apps/api/src/app/lib/timezone.ts
// Resolución determinista de zonas horarias IANA para coach (California por defecto) y clientes.

export const DEFAULT_COACH_TIMEZONE = 'America/Los_Angeles';

export function isValidTimeZone(tz?: string | null): tz is string {
  if (!tz || typeof tz !== 'string') return false;
  const trimmed = tz.trim();
  if (!trimmed || trimmed.length > 100) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function resolveCoachTimezone(coachTimezone?: string | null): string {
  if (isValidTimeZone(coachTimezone)) {
    return coachTimezone.trim();
  }
  return DEFAULT_COACH_TIMEZONE;
}

const ADDRESS_TIMEZONE_PATTERNS: Array<[RegExp, string]> = [
  // México — Noroeste / Pacífico / Centro / Sureste
  [/\b(tijuana|mexicali|ensenada|rosarito|tecate|baja\s*california(?!\s*sur))\b/i, 'America/Tijuana'],
  [/\b(hermosillo|nogales|obreg[oó]n|sonora)\b/i, 'America/Hermosillo'],
  [/\b(mazatl[aá]n|culiac[aá]n|los\s*mochis|sinaloa|la\s*paz|cabo\s*san\s*lucas|san\s*jos[eé]\s*del\s*cabo|baja\s*california\s*sur|tepic|nayarit)\b/i, 'America/Mazatlan'],
  [/\b(ciudad\s*ju[aá]rez|chihuahua)\b/i, 'America/Ciudad_Juarez'],
  [/\b(canc[uú]n|playa\s*del\s*carmen|tulum|cozumel|chetumal|quintana\s*roo)\b/i, 'America/Cancun'],
  [/\b(ciudad\s*de\s*m[eé]xico|cdmx|mexico\s*city|d\.?f\.?|guadalajara|jalisco|monterrey|nuevo\s*le[oó]n|puebla|quer[eé]taro|m[eé]rida|yucat[aá]n|oaxaca|veracruz|le[oó]n|guanajuato|toluca|cuernavaca|san\s*luis\s*potos[ií]|aguascalientes|morelia|michoac[aá]n|saltillo|torre[oó]n|coahuila|tampico|reynosa|tamaulipas|chiapas|tuxtla|villahermosa|tabasco|campeche|m[eé]xico|mexico)\b/i, 'America/Mexico_City'],

  // Estados Unidos — Pacífico, Montaña, Centro, Este
  [/\b(los\s*angeles|cathedral\s*city|palm\s*springs|san\s*diego|san\s*francisco|san\s*jose|sacramento|fresno|oakland|anaheim|santa\s*monica|beverly\s*hills|irvine|california|seattle|tacoma|spokane|washington|portland|oregon|las\s*vegas|reno|nevada)\b/i, 'America/Los_Angeles'],
  [/\b(phoenix|tucson|scottsdale|mesa|arizona)\b/i, 'America/Phoenix'],
  [/\b(denver|boulder|colorado\s*springs|colorado|salt\s*lake\s*city|utah|albuquerque|santa\s*fe|new\s*mexico|boise|idaho|billings|montana|cheyenne|wyoming)\b/i, 'America/Denver'],
  [/\b(austin|dallas|houston|san\s*antonio|fort\s*worth|el\s*paso|texas|chicago|illinois|nashville|memphis|tennessee|new\s*orleans|louisiana|minneapolis|minnesota|kansas\s*city|st\.?\s*louis|missouri|milwaukee|wisconsin|oklahoma\s*city|oklahoma|omaha|nebraska|des\s*moines|iowa|birmingham|alabama|little\s*rock|arkansas)\b/i, 'America/Chicago'],
  [/\b(new\s*york|manhattan|brooklyn|queens|nyc|miami|orlando|tampa|jacksonville|florida|atlanta|georgia|boston|massachusetts|philadelphia|pittsburgh|pennsylvania|charlotte|raleigh|north\s*carolina|south\s*carolina|detroit|michigan|cleveland|columbus|cincinnati|ohio|indianapolis|indiana|baltimore|maryland|virginia|richmond|washington\s*d\.?c\.?|d\.?c\.?|connecticut|new\s*jersey|newark|jersey\s*city)\b/i, 'America/New_York'],

  // Canadá
  [/\b(vancouver|victoria|british\s*columbia)\b/i, 'America/Vancouver'],
  [/\b(calgary|edmonton|alberta)\b/i, 'America/Edmonton'],
  [/\b(winnipeg|manitoba)\b/i, 'America/Winnipeg'],
  [/\b(toronto|ottawa|montreal|quebec|ontario|halifax)\b/i, 'America/Toronto'],

  // Latinoamérica & Caribe
  [/\b(bogot[aá]|medell[ií]n|cali|barranquilla|cartagena|bucaramanga|colombia)\b/i, 'America/Bogota'],
  [/\b(lima|arequipa|cusco|trujillo|per[uú]|peru)\b/i, 'America/Lima'],
  [/\b(quito|guayaquil|cuenca|ecuador)\b/i, 'America/Guayaquil'],
  [/\b(panam[aá]|panama)\b/i, 'America/Panama'],
  [/\b(caracas|maracaibo|valencia|venezuela)\b/i, 'America/Caracas'],
  [/\b(santo\s*domingo|santiago\s*de\s*los\s*caballeros|punta\s*cana|rep[uú]blica\s*dominicana|dominican\s*republic)\b/i, 'America/Santo_Domingo'],
  [/\b(san\s*juan|puerto\s*rico)\b/i, 'America/Puerto_Rico'],
  [/\b(la\s*paz|santa\s*cruz|cochabamba|bolivia)\b/i, 'America/La_Paz'],
  [/\b(santiago|valpara[ií]so|concepci[oó]n|chile)\b/i, 'America/Santiago'],
  [/\b(buenos\s*aires|c[oó]rdoba|rosario|mendoza|la\s*plata|argentina)\b/i, 'America/Argentina/Buenos_Aires'],
  [/\b(montevideo|punta\s*del\s*este|uruguay)\b/i, 'America/Montevideo'],
  [/\b(asunci[oó]n|paraguay)\b/i, 'America/Asuncion'],
  [/\b(s[aã]o\s*paulo|sao\s*paulo|rio\s*de\s*janeiro|bras[ií]lia|brasilia|belo\s*horizonte|curitiba|porto\s*alegre|brasil|brazil)\b/i, 'America/Sao_Paulo'],
  [/\b(san\s*jos[eé]|costa\s*rica)\b/i, 'America/Costa_Rica'],
  [/\b(ciudad\s*de\s*guatemala|guatemala)\b/i, 'America/Guatemala'],
  [/\b(san\s*salvador|el\s*salvador)\b/i, 'America/El_Salvador'],
  [/\b(tegucigalpa|san\s*pedro\s*sula|honduras)\b/i, 'America/Tegucigalpa'],
  [/\b(managua|nicaragua)\b/i, 'America/Managua'],

  // Europa
  [/\b(madrid|barcelona|valencia|sevilla|m[aá]laga|bilbao|zaragoza|espa[nñ]a|spain)\b/i, 'Europe/Madrid'],
  [/\b(lisboa|lisbon|porto|oporto|portugal)\b/i, 'Europe/Lisbon'],
  [/\b(londres|london|manchester|birmingham|edinburgh|glasgow|uk|united\s*kingdom|reino\s*unido|england|scotland)\b/i, 'Europe/London'],
  [/\b(par[ií]s|paris|lyon|marseille|marsella|toulouse|nice|niza|bordeaux|francia|france)\b/i, 'Europe/Paris'],
  [/\b(roma|rome|mil[aá]n|milano|milan|tur[ií]n|torino|n[aá]poles|napoli|florencia|firenze|bolonia|bologna|venecia|italia|italy)\b/i, 'Europe/Rome'],
  [/\b(berl[ií]n|berlin|m[uú]nich|munich|m[uü]nchen|hamburgo|hamburg|frankfurt|colonia|k[oö]ln|stuttgart|d[uü]sseldorf|alemania|germany|deutschland)\b/i, 'Europe/Berlin'],
  [/\b(z[uú]rich|zurich|ginebra|geneva|suiza|switzerland|schweiz)\b/i, 'Europe/Zurich'],
  [/\b(viena|vienna|wien|austria)\b/i, 'Europe/Vienna'],
  [/\b([aá]msterdam|amsterdam|rotterdam|pa[ií]ses\s*bajos|holanda|netherlands)\b/i, 'Europe/Amsterdam'],
  [/\b(bruselas|brussels|b[eé]lgica|belgium)\b/i, 'Europe/Brussels'],

  // Fallbacks por códigos de país/estado comunes al final de direcciones
  [/,\s*CA(?:\s+\d{5})?\s*$/i, 'America/Los_Angeles'],
  [/,\s*WA(?:\s+\d{5})?\s*$/i, 'America/Los_Angeles'],
  [/,\s*OR(?:\s+\d{5})?\s*$/i, 'America/Los_Angeles'],
  [/,\s*NV(?:\s+\d{5})?\s*$/i, 'America/Los_Angeles'],
  [/,\s*NY(?:\s+\d{5})?\s*$/i, 'America/New_York'],
  [/,\s*FL(?:\s+\d{5})?\s*$/i, 'America/New_York'],
  [/,\s*TX(?:\s+\d{5})?\s*$/i, 'America/Chicago'],
  [/,\s*IL(?:\s+\d{5})?\s*$/i, 'America/Chicago'],
  [/\b(estados\s*unidos|united\s*states|usa|u\.s\.a\.?)\b/i, 'America/Los_Angeles'],
];

export function inferTimezoneFromAddress(address?: string | null): string | null {
  if (!address || typeof address !== 'string') return null;
  const trimmed = address.trim();
  if (!trimmed) return null;

  for (const [pattern, tz] of ADDRESS_TIMEZONE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return tz;
    }
  }
  return null;
}

export function resolveClientTimezone(params: {
  explicitTimezone?: string | null;
  address?: string | null;
  sessionTimezone?: string | null;
}): string {
  if (isValidTimeZone(params.explicitTimezone)) {
    return params.explicitTimezone.trim();
  }
  const inferred = inferTimezoneFromAddress(params.address);
  if (inferred && isValidTimeZone(inferred)) {
    return inferred;
  }
  if (isValidTimeZone(params.sessionTimezone)) {
    return params.sessionTimezone.trim();
  }
  return DEFAULT_COACH_TIMEZONE;
}

export interface LocalTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getLocalTimeParts(date: Date, timeZone: string): LocalTimeParts {
  const safeTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_COACH_TIMEZONE;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): number => {
    const val = parts.find((p) => p.type === type)?.value;
    return val ? parseInt(val, 10) : 0;
  };
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour') % 24,
    minute: pick('minute'),
  };
}

export function isSameLocalDay(d1: Date, d2: Date, timeZone: string): boolean {
  const p1 = getLocalTimeParts(d1, timeZone);
  const p2 = getLocalTimeParts(d2, timeZone);
  return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day;
}

export function formatDateInTimezone(date: Date, timeZone: string, locale = 'es-MX'): string {
  const safeTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_COACH_TIMEZONE;
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: safeTz,
  });
}

export function formatTimeInTimezone(date: Date, timeZone: string, locale = 'es-MX'): string {
  const safeTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_COACH_TIMEZONE;
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: safeTz,
  });
}

export function formatTimeWithZoneLabel(date: Date, timeZone: string, locale = 'es-MX'): string {
  const safeTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_COACH_TIMEZONE;
  const timeStr = formatTimeInTimezone(date, safeTz, locale);
  return `${timeStr} (${safeTz})`;
}
