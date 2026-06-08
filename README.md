# RAGNEXUS AI

Enterprise knowledge intelligence and self-correcting RAG platform.

## Project Structure

```text
ragnexus-ai/
  backend/
    config/        MongoDB, ChromaDB, Gemini clients
    controllers/   Auth, RAG, admin analytics, logs, evaluation export
    middleware/    JWT auth, role gates, rate limits, security hardening
    models/        User, Document, Chat, Feedback, SystemLog
    routes/        /auth, /documents, /chat, /analytics, /logs, /evaluation
    services/      RAG engine, chunking, adaptive learning
    server.js
  frontend/
    src/api        Axios API bindings
    src/context    Auth provider
    src/layouts    Dashboard shell
    src/pages      Landing, chat, documents, analytics, audit logs
```

## Requirements

- Node.js 24.x and npm 11+
- MongoDB Atlas or another hosted MongoDB instance for production
- Google AI Studio Gemini API key
- ChromaDB server for local development, or the included Render private Chroma service for production

## Local Setup

```bash
npm run install:all
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Edit `backend/.env` with your `MONGO_URI`, `GEMINI_API_KEY`, and `JWT_SECRET`.

Run Chroma locally:

```bash
npx chroma run --path ./chroma-data
```

Start both apps:

```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- Health check: `http://localhost:5000/health`

## Render Backend Deployment

This repo includes `render.yaml`. Create a Render Blueprint from the GitHub repo and Render will create:

- `ragnexus-ai`: Node/Express web service
- `ragnexus-ai-chroma`: private ChromaDB service with a persistent disk
- A backend upload disk mounted at `/data`

During Blueprint creation, Render prompts for these secrets:

- `MONGO_URI`: MongoDB Atlas connection string
- `GEMINI_API_KEY`: Google Gemini API key

`JWT_SECRET` is generated automatically by Render.

After deployment, the expected backend URL is:

```text
https://ragnexus-ai.onrender.com
```

If Render gives the service a different URL, set Vercel's `VITE_API_BASE_URL` to:

```text
https://your-render-backend-url.onrender.com/api
```

If your Vercel production URL is not `https://ragnexus-ai.vercel.app`, update `CLIENT_ORIGIN` and `CLIENT_ORIGIN_REGEX` in the Render backend environment.

### Existing Manual Render Service Settings

If you create the backend as a normal Render Web Service instead of a Blueprint, use these exact settings:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: npm start
Health Check Path: /health
```

Do not use `npm build`. npm expects `npm run build` for package scripts, and `npm build` fails with `Unknown command: "build"` on current Render Node/npm images.

## Vercel Frontend Deployment

You can import the same GitHub repo in Vercel in either mode:

- Repo root mode: use the root `vercel.json`.
- Frontend root mode: set Vercel Root Directory to `frontend`; Vercel uses `frontend/vercel.json`.

Recommended Vercel environment variable:

```text
VITE_API_BASE_URL=https://ragnexus-ai.onrender.com/api
```

The frontend also has a production fallback to the same Render URL, but setting the variable in Vercel is safer if your Render service URL or custom domain changes.

## Admin Seed

Registration is open for normal users. To create or reset an admin, set these in the backend environment:

```env
ADMIN_NAME=RAGNEXUS Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

Then run from the backend service shell or locally:

```bash
npm run seed:admin --prefix backend
```

## Useful Scripts

```bash
npm run install:all       # install backend and frontend dependencies
npm run dev               # run backend and frontend together
npm run build:frontend    # build the Vite frontend
npm run start             # start the backend
npm run seed:admin        # seed/update admin from root
```

## Core API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/documents/strategies`
- `GET /api/documents`
- `POST /api/documents`
- `DELETE /api/documents/:id`
- `GET /api/chat/history`
- `POST /api/chat`
- `POST /api/chat/feedback`
- `GET /api/analytics`
- `GET /api/logs`
- `POST /api/evaluation/export-fine-tune`
