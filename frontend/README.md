## 🌍 Environment Configuration Guide

This project uses environment variables to separate sensitive credentials and service URLs from the codebase. Below is a description of all required variables for both the frontend and backend environments.

---

## 🌐 Frontend `.env.local`

Create a `.env.local` file inside the `/frontend` directory and include the following:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_DOMAIN=http://localhost:3000
```

### Explanation

- `NEXT_PUBLIC_BACKEND_URL`: The base URL for accessing your FastAPI backend. If running locally, use `http://localhost:8000`.
- `NEXT_PUBLIC_DOMAIN`: The frontend domain or base URL. When deploying, set this to your public-facing frontend URL.

---

## ⚙️ Backend `.env`

Create a `.env` file inside the `/backend` directory and add the following:

```env
DB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
ACCESS_KEY=your-secret-access-key
REFRESH_KEY=your-secret-refresh-key
BREVO_KEY=your-brevo-email-api-key
DOMAIN=your-frontend-domain.com
BACKEND_URL=http://localhost:8000
```

### Explanation

- `DB_URL`: MongoDB Atlas connection string with credentials.
- `ACCESS_KEY`: A strong secret used for signing access JWT tokens.
- `REFRESH_KEY`: A strong secret used for signing refresh JWT tokens.
- `BREVO_KEY`: API key from Brevo for sending emails like verification and notifications.
- `DOMAIN`: Your website domain, used in links (e.g., email verification links).
- `BACKEND_URL`: Public or local backend server URL (used in CORS setup and link generation).

---

## ⚠️ Best Practices

- Do not commit `.env` files into version control.
- Use strong random secrets for keys.
- Keep your API keys and tokens secure.

---

Let me know if you need an `.env.example` template or production deployment instructions.
