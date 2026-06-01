# Despliegue — CrediScan Frontend

Guía de despliegue y operación del frontend de **CrediScan** (Motor de Scoring Crediticio · Fábrica Escuela UdeA 2026-1).

Stack: **React + Vite**, desplegado en **Vercel**. Consume la API REST del backend (Spring) bajo la ruta base `/api/v1`.

---

## 1. Topología de despliegue

| Componente | URL | Dónde vive | Estado |
|---|---|---|---|
| **Frontend (demo)** | https://crediscan-frontend-gabo.vercel.app | Vercel · proyecto `crediscan-frontend-gabo` | ✅ Operativo |
| **Backend (demo)** | https://crediscan-api-gabo.onrender.com | Render · deploy del mirror `gjcardonam/crediscan-backend` | ✅ Operativo |
| **Base de datos** | `crediscan-db-gabo` | Render Postgres (free) | ✅ Activa — ⚠️ **expira 2026-06-22** |
| **Backend del equipo** | https://crediscan-backend.onrender.com | Render (otra cuenta) | ✅ Vivo · ver nota CORS |

> El **stack demo** (frontend-gabo → api-gabo → db-gabo) es el que está 100% operativo y verificado end-to-end. Es el que se usa para la sustentación.

---

## 2. Variable de entorno

El frontend resuelve la URL del backend desde **`VITE_API_URL`** (Vite hornea el valor en *build time*).

- **Local:** se lee de `.env.local`.
- **Producción (Vercel):** se lee de la **Environment Variable del proyecto en Vercel**, que **tiene prioridad sobre** el archivo `.env.production` del repo.

| Entorno | `VITE_API_URL` |
|---|---|
| Local (`.env.local`) | `http://localhost:8080` (o la IP de tu backend local) |
| Vercel `crediscan-frontend-gabo` | `https://crediscan-api-gabo.onrender.com` |
| `.env.production` (default del repo) | `https://crediscan-backend.onrender.com` |

> Como la env var de Vercel manda, el despliegue demo apunta a `api-gabo` aunque el archivo `.env.production` diga otra cosa.

---

## 3. Correr en local

```bash
npm install
# crear .env.local con la URL del backend que quieras consumir:
echo 'VITE_API_URL=http://localhost:8080' > .env.local
npm run dev          # Vite -> http://localhost:5173
```

Para apuntar el front local al backend desplegado, usa `VITE_API_URL=https://crediscan-api-gabo.onrender.com`.

---

## 4. Despliegue en Vercel

El proyecto `crediscan-frontend-gabo` está conectado al repo `gjcardonam/crediscan-frontend` (rama `main`) con **auto-deploy**: cada *push* a `main` dispara un build y publica a producción.

- `vercel.json` define un *SPA fallback* (`/(.*) → /`) para soportar deep-linking de React Router.
- Para desplegar manualmente: push a `main`, o usar el botón *Redeploy* en el dashboard de Vercel.

---

## 5. Dependencia del backend (CORS)

El navegador exige que el backend autorice el **origin** del frontend. El backend lee la lista desde la env var **`CORS_ALLOWED_ORIGINS`**.

- `api-gabo` ya incluye `https://crediscan-frontend-gabo.vercel.app` → preflight `OPTIONS` responde **200**. ✅
- Si se quiere apuntar el front al **backend del equipo** (`crediscan-backend.onrender.com`), ese servicio **debe agregar** el origin del front a su `CORS_ALLOWED_ORIGINS` (hoy responde **403** al preflight).

---

## 6. Datos de demostración

La BD `crediscan-db-gabo` está sembrada con datos listos para mostrar:

- **Modelo de scoring** "Modelo Demo 2026-1" **activo** (4 variables: buró 40%, ingreso 25%, historial 20%, ratio 15%).
- **21 solicitantes** con datos financieros, evaluación y decisión, cubriendo los 5 niveles de riesgo (VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH).
- Reportes HU-15 (distribución de riesgo), HU-16 (efectividad del modelo) y HU-17 (actividad de analistas) muestran datos.

### Credenciales demo

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `analista1` | `pass1234` | ANALYST |
| `riskmanager1` | `pass1234` | RISK_MANAGER |

---

## 7. Notas operativas

- ⚠️ **Cold start:** el plan free de Render duerme el backend por inactividad. La **primera petición** tras el sueño tarda **1–2 min**. Para una demo en vivo, abrir el backend (`/actuator/health`) 1–2 minutos antes.
- ⚠️ **Expiración de BD:** `crediscan-db-gabo` (Postgres free) **expira el 2026-06-22**. Después hay que renovar/recrear la BD y re-sembrar.
- El deploy `crediscan-api.onrender.com` (deploy personal del repo oficial) está caído: su BD expiró el 2026-05-07. No se usa; el backend canónico vivo es el del equipo.
