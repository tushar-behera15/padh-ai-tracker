# Padh AI Tracker — Backend Server 🚀

> A robust and intelligent backend service for the **Padh AI Tracker** ecosystem — managing learning progress, academic organization, and AI-powered revision scheduling based on student performance.

---

## ✨ Features

| Feature | Description |
|:---|:---|
| 🔐 **Auth** | Full user lifecycle with JWT, Bcrypt, and Cookie-based sessions |
| 📚 **Organization** | Hierarchical management of Subjects and Chapters |
| 📊 **Performance Tracking** | Score logging with automatic categorization — *Weak*, *Average*, *Strong* |
| 🤖 **AI Revisions** | Dynamic scheduling via Google Gemini AI, performance-aware gap strategies |
| 🛡️ **Security** | Helmet, CORS protection, and Zod-based request validation |

---

## 🛠️ Tech Stack

- **Runtime** — [Node.js](https://nodejs.org/) v18+
- **Framework** — [Express.js v5](https://expressjs.com/)
- **Language** — [TypeScript](https://www.typescriptlang.org/)
- **Database** — [PostgreSQL](https://www.postgresql.org/) via `pg`
- **AI** — [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Auth** — JWT & `cookie-parser`
- **Security** — `helmet`, `cors`, `bcrypt`
- **Validation** — `zod`
- **Dev Tools** — `nodemon`, `ts-node`

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL database
- Google Gemini API Key

### Installation

**1. Clone the repository**

```bash
git clone <repository-url>
cd padh-ai-tracker-server
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file in the root directory:

```env
PORT=5000
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
MY_NODE_ENV=development
```

**4. Run the server**

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 🛤️ API Reference

### Auth

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate & get session cookie |
| `GET` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get current user profile |

### Subjects & Chapters

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/subject` | Get all subjects |
| `POST` | `/api/subject/create` | Create a new subject |
| `PUT` | `/api/subject/:id` | Update subject details |
| `DELETE` | `/api/subject/:id` | Delete a subject |
| `GET` | `/api/subject/:subjectId/chapters` | Get all chapters for a subject |
| `POST` | `/api/subject/:subjectId/chapters` | Create a new chapter |

### Scoring & Revisions *(AI-Integrated)*

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/subject/:sId/chapters/:cId/scores` | Log a score & trigger AI revision scheduling |
| `GET` | `/api/subject/:sId/chapters/:cId/scores` | Get score history for a chapter |
| `GET` | `/api/revision` | Get all scheduled revisions |
| `PUT` | `/api/revision/:id/completed` | Mark a revision as completed |

---

## 📄 License

Licensed under the **ISC License**.