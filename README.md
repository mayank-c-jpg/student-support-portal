# Secure AI Student Support Portal

A full-stack student support web application built with **HTML, CSS, JavaScript, Bootstrap 5, Node.js, Express.js, and MongoDB**, secured with **IBM Cloud App ID** and powered by an **IBM Watson Assistant** AI chatbot.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Prerequisites](#prerequisites)
5. [Local Installation](#local-installation)
6. [IBM Cloud App ID Configuration](#ibm-cloud-app-id-configuration)
7. [IBM Watson Assistant Configuration](#ibm-watson-assistant-configuration)
8. [Environment Variables](#environment-variables)
9. [Running the App](#running-the-app)
10. [Making a User an Admin](#making-a-user-an-admin)
11. [API Reference](#api-reference)
12. [Security](#security)
13. [Deployment to IBM Cloud](#deployment-to-ibm-cloud)
14. [Troubleshooting](#troubleshooting)

---

## Features

- **Authentication** via IBM Cloud App ID (Cloud Directory email/password, hosted & secured by IBM — no passwords ever touch our server)
- **AI Chatbot** via IBM Watson Assistant with session-based conversational context
- Protected dashboard, profile, and admin routes
- MongoDB storage for user profiles, chat history, and activity logs
- Full **admin panel**: user management, usage statistics, chat moderation (flag/delete), FAQ CRUD
- Responsive Bootstrap 5 UI: landing, login, register, dashboard, profile, admin, custom 404
- Security hardening: Helmet CSP, CORS, CSRF (double-submit cookie), rate limiting, input validation & sanitization (XSS/NoSQL-injection protection), MongoDB-backed sessions with expiration handling
- Clean **MVC architecture** with async/await throughout

## Tech Stack

| Layer      | Technology                                              |
|------------|----------------------------------------------------------|
| Frontend   | HTML5, CSS3, Bootstrap 5, vanilla JavaScript (fetch API), EJS templates |
| Backend    | Node.js, Express.js                                     |
| Database   | MongoDB + Mongoose                                       |
| Auth       | IBM Cloud App ID (`ibmcloud-appid` + Passport.js `WebAppStrategy`) |
| AI Chatbot | IBM Watson Assistant V2 (`ibm-watson` SDK)               |
| Security   | Helmet, CORS, csrf-csrf, express-rate-limit, express-mongo-sanitize, xss, express-validator |

## Folder Structure

```
/project
│
├── public/
│   ├── css/style.css
│   ├── js/ (main.js, chat.js, dashboard.js, profile.js, admin.js)
│   └── images/
│
├── routes/        (authRoutes, pageRoutes, chatRoutes, userRoutes, adminRoutes)
├── controllers/    (authController, pageController, chatController, userController, adminController)
├── middleware/     (authMiddleware, errorMiddleware, rateLimitMiddleware, csrfMiddleware)
├── models/         (User, ChatHistory, ActivityLog, FAQ)
├── config/         (db.js, appId.js, watson.js)
├── views/          (EJS pages + partials + admin/)
├── services/       (appIdService.js, watsonService.js)
├── utils/          (logger.js, apiResponse.js, validators.js, seedAdmin.js)
├── app.js
├── package.json
├── .env.example
└── README.md
```

## Prerequisites

- Node.js **18+** and npm
- A MongoDB instance (local `mongod`, Docker, or MongoDB Atlas)
- An **IBM Cloud** account (free tier is fine) with:
  - An **App ID** service instance
  - A **Watson Assistant** service instance with at least one Assistant configured

## Local Installation

```bash
# 1. Clone / unzip the project, then install dependencies
cd project
npm install

# 2. Copy the environment template and fill in your credentials
cp .env.example .env

# 3. Start MongoDB locally (if not using Atlas)
#    e.g. with Docker:
docker run -d -p 27017:27017 --name student-portal-mongo mongo:7

# 4. Run in development mode (auto-restart on changes)
npm run dev

# — or run in production mode —
npm start
```

The app will be available at `http://localhost:3000`.

---

## IBM Cloud App ID Configuration

1. In the [IBM Cloud Console](https://cloud.ibm.com/), create an **App ID** service instance (any region/plan works for development, e.g. Lite plan).
2. Open the App ID instance → **Identity providers** → enable **Cloud Directory**. This is what powers native email/password registration & login, along with password reset — entirely hosted and managed by IBM.
   - Under Cloud Directory settings you can require email verification, set password strength rules, etc.
3. Go to **Service Credentials** → **New Credential** → copy the generated:
   - `tenantId` → `APPID_TENANT_ID`
   - `clientId` → `APPID_CLIENT_ID`
   - `secret` → `APPID_SECRET`
   - `oauthServerUrl` → `APPID_OAUTH_SERVER_URL`
4. Go to **Authentication settings** (or "Application" registration for a "Web App" type) and add a **Redirect URL**:
   ```
   http://localhost:3000/auth/callback
   ```
   For production, add your deployed URL as well, e.g. `https://your-app.mybluemix.net/auth/callback`. This value must exactly match `APPID_REDIRECT_URI` in your `.env`.
5. (Optional) Under **Cloud Directory → Email templates**, customize the sign-up/verification/reset emails to match your institution's branding.
6. Set `ADMIN_EMAILS` in `.env` to a comma-separated list of email addresses that should automatically be granted the `admin` role the first time they log in.

**How the flow works in this app:**
`/login` and `/register` pages show a "Continue to Secure Login/Sign Up" button that redirects to `/auth/login` (or `/auth/register`), which uses Passport's `WebAppStrategy` to redirect the browser to App ID's hosted, secure sign-in widget. After the user authenticates (or creates an account) there, App ID redirects back to `/auth/callback` with an authorization code; `ibmcloud-appid` exchanges it for tokens automatically, and `authController.callbackSuccess` provisions/updates the matching local `User` profile in MongoDB before redirecting to `/dashboard`.

## IBM Watson Assistant Configuration

1. In the IBM Cloud Console, create a **Watson Assistant** service instance and launch the Watson Assistant tool.
2. Create a new **Assistant**, then create/import a **Dialog Skill** with intents & entities covering:
   - Admissions, Courses, Fee structure, Placements, Internships, Examination schedule, Scholarships, Library services, Campus facilities, General FAQs
   - Tip: create one intent per topic (e.g. `#ask_fee_structure`, `#ask_placements`) with 10–15 example utterances each, and a dialog node per intent returning the relevant answer. You can seed initial answers from the admin panel's FAQ list.
3. Go to the Assistant's **Settings → API details** and copy:
   - **Assistant ID** → `WATSON_ASSISTANT_ID`
   - **Service URL** → `WATSON_ASSISTANT_URL`
   - **API Key** (from the underlying Watson Assistant service credentials) → `WATSON_ASSISTANT_API_KEY`
4. Set `WATSON_ASSISTANT_VERSION` to a valid API version date (e.g. `2021-11-27` — check IBM's current documented version).
5. Publish your dialog skill so the live Assistant reflects your changes.

The backend (`services/watsonService.js`) creates one Watson session per browser login session, so conversational context (e.g. multi-turn slot filling) is preserved across chat turns until logout or session expiry.

## Environment Variables

See [`.env.example`](./.env.example) for the full list with comments. Key groups:

- **General**: `NODE_ENV`, `PORT`, `APP_BASE_URL`, `SESSION_SECRET`
- **MongoDB**: `MONGO_URI`
- **App ID**: `APPID_TENANT_ID`, `APPID_CLIENT_ID`, `APPID_SECRET`, `APPID_OAUTH_SERVER_URL`, `APPID_REDIRECT_URI`, `ADMIN_EMAILS`
- **Watson Assistant**: `WATSON_ASSISTANT_API_KEY`, `WATSON_ASSISTANT_URL`, `WATSON_ASSISTANT_ID`, `WATSON_ASSISTANT_VERSION`
- **Security**: `CORS_ORIGIN`, `CSRF_SECRET`

Never commit your real `.env` file — it's already covered by a typical `.gitignore` (add one with `node_modules/` and `.env` if you initialize git).

## Running the App

```bash
npm run dev     # development, with nodemon auto-reload
npm start       # production
```

Visit:
- `/` — Landing page
- `/register` → `/login` — App ID hosted sign-up / sign-in
- `/dashboard` — Chatbot + profile summary + recent chats + FAQ (requires login)
- `/profile` — Edit profile (requires login)
- `/admin` — Admin panel (requires login + `admin` role)

## Making a User an Admin

Log in once as the target user (so their profile is provisioned), then run:

```bash
npm run seed:admin -- user@example.com
```

Or simply add their email to `ADMIN_EMAILS` in `.env` **before** their first login — they'll be granted the admin role automatically.

## API Reference

All API responses use the envelope `{ success, message, data }` (or `errors` on failure). All non-GET `/api/*` requests require a valid `x-csrf-token` header (see `public/js/main.js`'s `apiFetch` helper).

| Method | Endpoint                          | Auth        | Description                          |
|--------|------------------------------------|-------------|---------------------------------------|
| POST   | `/api/chat/session`                | User        | Start/resume a Watson session         |
| POST   | `/api/chat/message`                | User        | Send a chat message, get AI reply     |
| GET    | `/api/chat/history`                | User        | Paginated chat history                |
| GET    | `/api/users/me`                    | User        | Get own profile                       |
| PUT    | `/api/users/me`                    | User        | Update own profile                    |
| GET    | `/api/admin/users`                 | Admin       | List registered users                 |
| PATCH  | `/api/admin/users/:id/status`      | Admin       | Enable/disable a user                 |
| GET    | `/api/admin/stats`                 | Admin       | Usage statistics                      |
| GET    | `/api/admin/chats`                 | Admin       | List/filter chat history              |
| PATCH  | `/api/admin/chats/:id/flag`        | Admin       | Flag/unflag a conversation            |
| DELETE | `/api/admin/chats/:id`             | Admin       | Delete an inappropriate conversation  |
| GET    | `/api/admin/faqs`                  | Admin       | List FAQs                             |
| POST   | `/api/admin/faqs`                  | Admin       | Create FAQ                            |
| PUT    | `/api/admin/faqs/:id`               | Admin       | Update/publish/hide FAQ               |
| DELETE | `/api/admin/faqs/:id`               | Admin       | Delete FAQ                            |

`GET /auth/login`, `GET /auth/register`, `GET /auth/logout`, `GET /auth/callback` handle the App ID OAuth flow.

## Security

- **Authentication**: delegated entirely to IBM App ID (OAuth 2.0 / OIDC); no passwords stored locally
- **Sessions**: stored server-side in MongoDB (`connect-mongo`), `httpOnly` + `sameSite=lax` cookies, 2-hour TTL, graceful redirect-to-login on expiry
- **CSRF**: double-submit-cookie pattern (`csrf-csrf`) on all state-changing API requests
- **XSS**: all free-text input sanitized server-side (`xss` package) before persistence; EJS auto-escapes output (`<%= %>`)
- **NoSQL injection**: `express-mongo-sanitize` strips `$`/`.` operators from user input
- **Rate limiting**: separate limiters for auth routes, chat messages, and general API traffic
- **Input validation**: `express-validator` chains on every mutating endpoint
- **Transport security**: Helmet sets a strict Content-Security-Policy and standard security headers; enable `NODE_ENV=production` + HTTPS termination (via your reverse proxy / IBM Cloud) so `secure` cookies are enforced
- **CORS**: locked to `CORS_ORIGIN`

## Deployment to IBM Cloud

**Option A — Cloud Foundry:**

```bash
ibmcloud login
ibmcloud target --cf
ibmcloud cf push secure-ai-student-support-portal
```

Add a `manifest.yml`:
```yaml
applications:
  - name: secure-ai-student-support-portal
    memory: 512M
    instances: 1
    buildpacks:
      - nodejs_buildpack
    env:
      NODE_ENV: production
```
Set all `.env` values as IBM Cloud environment variables (`ibmcloud cf set-env <app> KEY VALUE` for each, or via the console's Runtime → Environment Variables tab) rather than uploading `.env` itself. Then update the App ID **Redirect URL** to your live Cloud Foundry route (e.g. `https://secure-ai-student-support-portal.<region>.cf.appdomain.cloud/auth/callback`).

**Option B — IBM Cloud Kubernetes Service / Code Engine:**

1. Build & push a Docker image (add a simple `Dockerfile`: `FROM node:18-alpine`, `COPY`, `RUN npm ci --omit=dev`, `CMD ["node","app.js"]`).
2. Deploy via `ibmcloud ce application create` (Code Engine) or a standard Kubernetes Deployment + Service + Ingress on IKS.
3. Inject secrets (App ID, Watson, Mongo URI, session/CSRF secrets) as Kubernetes Secrets / Code Engine secrets rather than a checked-in `.env`.
4. Point MongoDB to a managed instance (IBM Cloud Databases for MongoDB, or MongoDB Atlas) reachable from your cluster/VPC.
5. Update the App ID Redirect URL and `APPID_REDIRECT_URI`/`APP_BASE_URL` to your public HTTPS endpoint.

In both cases, remember: **App ID's redirect URL configuration must always exactly match** the live `APPID_REDIRECT_URI`, including protocol (`https://`) and no trailing slash mismatches.

## Troubleshooting

- **"Session expired" loops right after login**: check that `APPID_REDIRECT_URI` matches an App ID "Redirect URL" exactly, and that `SESSION_SECRET` doesn't change between restarts (or sessions won't decode).
- **Chatbot returns a 503 "temporarily unavailable"**: verify `WATSON_ASSISTANT_API_KEY`, `WATSON_ASSISTANT_URL`, and `WATSON_ASSISTANT_ID`, and that the assistant is published.
- **CSRF errors on API calls**: ensure the page includes the `<meta name="csrf-token">` tag (already in `views/partials/head.ejs`) and that requests go through `apiFetch()` in `public/js/main.js`.
- **Mongo connection errors**: confirm `MONGO_URI` is reachable from where the app runs (firewall/VPC rules for Atlas or IBM Cloud Databases).

---

Built with an MVC architecture, async/await throughout, and production-ready error handling — ready to run as soon as real IBM Cloud App ID and Watson Assistant credentials are added to `.env`.
