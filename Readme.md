# 📄 Contract Risk Analyzer

An AI-powered web application designed to help users upload, scan, and analyze legal contracts (PDFs) for potential risks, compliance issues, and key terms. Built with a decoupled **React (Vite)** frontend and a **Spring Boot** backend, utilizing **Tesseract OCR** and Large Language Models for deep analysis.

# Live Link: (https://contract-risk-analyzer-theta.vercel.app/)
---

## ✨ Key Features

* **Secure Authentication:** Highly secure HttpOnly Cookie-based JWT authentication. Includes OTP email verification, Password Reset, and **Google OAuth2** login.
* **AI-Powered Analysis:** Upload PDF contracts to automatically extract text via Tesseract OCR and analyze risk levels, jurisdiction compliance, and contract clauses using AI.
* **Smart Dashboard:** View all uploaded contracts, risk badges (Low/Medium/High), processing status, and historical data.
* **Admin Console:** Dedicated admin capabilities to monitor system uploads, view file sizes and page counts, and manage user data.
* **Rate Limiting & Quotas:** Built-in daily upload quotas for standard users with live countdown timers.
* **Interactive Chat:** Chat directly with the AI regarding specific contracts to ask legal questions and get summaries.

---

## 🛠️ Tech Stack

**Frontend (Client)**
* React.js (Vite)
* React-Bootstrap & Tailwind (Glassmorphism UI)
* Axios (with secure credential interceptors)
* React-Router-DOM
* PDF-lib

**Backend (Server)**
* Java 17
* Spring Boot 3.x (Web, Data MongoDB, Security, Mail, OAuth2)
* Spring Security (Stateless JWT via HttpOnly Cookies)
* Tesseract OCR (Optical Character Recognition)
* Generative AI Integration (Gemini/Groq)

**Database & Infrastructure**
* MongoDB / MongoDB Atlas

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
* **Java 17**
* **Node.js (v20+)**
* **Maven**

### 1. Environment Variables Setup
Create an `application.properties` (or `application.yml`) file in `src/main/resources/` with the following configurations:

```properties
# MongoDB Database
spring.data.mongodb.uri=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# Email Settings (For OTP)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=your-google-client-id
spring.security.oauth2.client.registration.google.client-secret=your-google-client-secret

# JWT Secret
jwt.secret=your-256-bit-secure-secret-key-here

# AI API Keys
ai.api.key=your-ai-api-key
```

### 2. Running Locally
**Start the Backend:**
Ensure you have Tesseract OCR installed on your local OS, then run:
```bash
./mvnw clean install
./mvnw spring-boot:run
```
The Spring Boot server will start on port 8080.

**Start the Frontend:**
Open a new terminal window:
```bash
cd client
npm install
npm run dev
```
The React development server will start on port 5173.

🔒 Security Architecture
This application implements enterprise-grade security for handling sensitive legal documents:

Stateless Sessions: Server memory is protected by using JSON Web Tokens (JWT).

XSS Protection: Tokens are never stored in localStorage. They are managed entirely by the browser via HttpOnly, Secure Cookies.

CSRF Protection: Configured via Spring Security with explicit CORS origin mappings.

Auto-Logout: Frontend implements an inactivity tracker that automatically destroys the session after 30 minutes of idle time.
