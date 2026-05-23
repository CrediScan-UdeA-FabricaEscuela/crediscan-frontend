# CrediScan — Frontend

Interfaz web del motor de evaluación crediticia **CrediScan** (Fábrica Escuela UdeA, 2026-1). Consume el [`crediscan-backend`](https://github.com/CrediScan-UdeA-FabricaEscuela/crediscan-backend) (Spring Boot + PostgreSQL) y cubre las 17 historias de usuario del proyecto.

## Stack

- **React 19** + **React Router 7**
- **Vite 8** (build + dev server)
- **Vitest** + **Testing Library** (tests)
- Estilos CSS plano (sin framework UI)
- Deploy: Vercel

## Funcionalidades por rol

| Rol | Funciones |
|---|---|
| **ADMIN** | Acceso total: solicitantes, evaluaciones, modelos, variables, usuarios, auditoría, reportes, simulación |
| **ANALYST** | Solicitantes, ejecutar evaluaciones, consultar por ID, simulación |
| **RISK_MANAGER** | Modelos, variables, listado y reportes de evaluaciones, simulación, auditoría |
| **CREDIT_SUPERVISOR** | Listado de evaluaciones, reportes |

## Setup local

### Requisitos
- Node.js ≥ 20 (probado con 24)
- npm ≥ 10
- Backend corriendo en `http://localhost:8080` (vía Docker — ver `crediscan-backend`)

### Pasos
```bash
git clone https://github.com/CrediScan-UdeA-FabricaEscuela/crediscan-frontend.git
cd crediscan-frontend
npm install
npm run dev          # http://localhost:5173
```

El cliente detecta automáticamente si está corriendo en `localhost:5173` y apunta a `http://localhost:8080` para el backend.

### Usuarios seed (entorno dev)
| Usuario | Password | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `analista1` | `pass1234` | ANALYST |
| `riskmanager1` | `pass1234` | RISK_MANAGER |

## Scripts

```bash
npm run dev          # Dev server con HMR
npm run build        # Build de producción → dist/
npm run preview      # Sirve el dist/ buildeado
npm run lint         # ESLint
npm test             # Vitest (run once)
npm run test:watch   # Vitest watch mode
```

## Variables de entorno

`.env.production`:
```
VITE_API_URL=https://<backend-render-url>.onrender.com
```

> **⚠️ Verificá** la URL real del backend en Render antes de deployar. `vercel.json` y `.env.production` deben coincidir.

## Estructura

```
src/
├── api/
│   └── client.js          # Cliente fetch con JWT, todos los endpoints
├── components/
│   ├── Layout.jsx         # Sidebar + outlet
│   └── ProtectedRoute.jsx # Guard por auth + roles
├── context/
│   └── AuthContext.jsx    # Estado de sesión (localStorage)
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Applicants.jsx, RegisterApplicant.jsx, EditApplicant.jsx, FinancialData.jsx
│   ├── Evaluations.jsx, NewEvaluation.jsx, EvaluationDetail.jsx
│   ├── ScoringVariables.jsx, ScoringModels.jsx
│   ├── Simulation.jsx     # HU-14
│   ├── Reports.jsx        # HU-15, 16, 17
│   ├── AuditLog.jsx
│   └── Users.jsx
├── test/
│   ├── setup.js
│   ├── client.test.js
│   └── Evaluations.test.jsx
├── App.jsx                # Routing
└── main.jsx
```

## Rutas

| Path | Páginas | Roles |
|---|---|---|
| `/` | Login | público |
| `/dashboard` | Panel principal | autenticado |
| `/solicitantes` (`/nuevo`, `/:id/editar`, `/:id/financiero`) | Gestión solicitantes | autenticado |
| `/evaluaciones` | Búsqueda paginada + ID lookup | autenticado (búsqueda: ADMIN/RM/CS) |
| `/evaluaciones/nueva`, `/:id` | Nueva eval / detalle | ADMIN, ANALYST |
| `/modelos` | Modelos + comparación (HU-08) | ADMIN, RISK_MANAGER |
| `/variables` | Variables de scoring | ADMIN, RISK_MANAGER |
| `/simulacion` | Simulación HU-14 | ADMIN, RM, ANALYST |
| `/reportes` | Reportes HU-15/16/17 | ADMIN, RM, CS |
| `/auditoria` | Log de auditoría | ADMIN, RISK_MANAGER |
| `/usuarios` | Gestión usuarios | ADMIN |

## Cobertura de Historias de Usuario

| HU | Tema | Estado |
|---|---|---|
| 1-7, 9, 11 | Solicitantes, datos financieros, variables, modelos, KO, scoring, decisiones, detalle | ✅ |
| 8 | Comparar modelos | ✅ |
| 10 | Búsqueda avanzada + export de evaluaciones | ✅ |
| 12 | Estadísticas evaluaciones | ✅ (API) |
| 13 | Clasificación de riesgo | ✅ (API) |
| 14 | Simulación + escenarios guardados | ✅ |
| 15 | Reporte distribución de riesgo | ✅ |
| 16 | Reporte efectividad del modelo | ✅ |
| 17 | Reporte actividad de analistas | ✅ |

## Deploy

Frontend en Vercel — push a `master` dispara auto-deploy.

```bash
npm run build
# o, con Vercel CLI:
vercel --prod
```

## Tests

```bash
npm test
```

Tests actuales:
- `client.test.js`: construcción de URLs, manejo de JWT, errores
- `Evaluations.test.jsx`: render por rol, integración con búsqueda paginada
