# 📊 NELHEALTHCOACH Dashboard

Panel de control para coaches de salud — parte del monorepo [NELHEALTHCOACH](../../README.md).

## Características

- **Gestión de pacientes** — lista, búsqueda y detalle completo
- **Recomendaciones de IA** — generación asíncrona con LangGraph + Gemini
- **Análisis médico** — interpretación de laboratorios, hallazgos clínicos y estudios recomendados
- **Seguimiento de progreso** — métricas y estadísticas
- **Gestión de documentos** — subida y análisis de PDFs médicos con Gemini
- **Panel de audio** — integración con LiveKit para sesiones en vivo

## Stack

| Categoría | Tecnología |
|---|---|
| Framework | Next.js 15.5.4 (Pages Router) |
| UI | React 19.1.0, Tailwind CSS |
| Tipado | TypeScript 5.8.3 |
| Gráficos | Chart.js / react-chartjs-2 |
| Audio en vivo | LiveKit |
| API | `apps/api` (puerto 3001) |

## Desarrollo

```bash
# Desde la raíz del monorepo
npm run dev:dashboard

# O directamente
cd apps/dashboard && npm run dev
```

El dashboard corre en `http://localhost:3002` y se comunica con la API en `http://localhost:3001`.

## Variables de Entorno

```env
# URL de la API
NEXT_PUBLIC_API_URL=http://localhost:3001

# LiveKit (audio en vivo)
NEXT_PUBLIC_LIVEKIT_URL=wss://tu-proyecto.livekit.cloud
LIVEKIT_API_KEY=tu_api_key
LIVEKIT_API_SECRET=tu_api_secret
```

## Estructura

```
apps/dashboard/
├── 📂 pages/              # Rutas de Next.js (Pages Router)
│   ├── 📂 api/            # API routes internas (proxy, upload)
│   ├── 📄 index.tsx       # Login
│   └── 📄 dashboard.tsx   # Panel principal
├── 📂 components/         # Componentes React
│   ├── 📂 dashboard/      # Componentes del panel
│   │   ├── AIRecommendationsModal.tsx  # Modal de recomendaciones IA
│   │   └── ...
│   └── 📂 ui/             # Componentes reutilizables
├── 📂 styles/             # Estilos globales
└── 📂 lib/                # Utilidades y helpers
```
