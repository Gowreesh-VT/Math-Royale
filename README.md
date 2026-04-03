# 🏆 Math-Royale Tournament System

![Next.js](https://img.shields.io/badge/Next.js-15.5.14-black?logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0.0-green?logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-blue?logo=tailwindcss)

**Math-Royale** is a high-stakes competitive programming and mathematical showdown platform. It features a dynamic, multi-round tournament structure with real-time scoring and elimination mechanics.

---

## ✨ Key Features

*   ⚔️ **1v1 Tug of War**: Real-time competitive matching where solving speed and accuracy shift the score balance.
*   📉 **Dynamic Advancement**: Automated stage-based progression (Stage A → B → C) with configurable elimination thresholds.
*   🔒 **NextAuth Integration**: Secure team authentication via Google with custom JWT session handling.
*   📊 **Real-time Leaderboards**: Global and round-specific rankings to track the best mathematicians and coders in the tournament.
*   🛠️ **CLI Admin Tools**: Comprehensive command-line interface for managing teams, matches, and tournament progression.

---

## 🚀 Getting Started

### 1. Environment Setup

Copy the example environment file and fill in your secrets:

```bash
cp .env.local.example .env.local
```

| Variable               | Description                                      |
| :--------------------- | :----------------------------------------------- |
| `MONGODB_URI`          | Your MongoDB connection string.                  |
| `GOOGLE_CLIENT_ID`     | Google Cloud Console OAuth Client ID.            |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth Client Secret.        |
| `NEXTAUTH_SECRET`      | A unique, random secret for session encryption.  |
| `NEXTAUTH_URL`         | The canonical URL of your site (Production).     |

### 2. Development Workflow

Install dependencies and start the local survival server:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to see the arena.

---

## ☁️ Deploy to Azure App Service

This repository includes a GitHub Actions workflow for Azure App Service deployment:

*   `.github/workflows/deploy-azure-webapp.yml`

### 1. Create Azure resources

Use Azure Portal or Azure CLI to create:

*   Resource Group
*   Linux App Service Plan
*   Web App (Node.js 20)

### 2. Configure App Service startup command

In the Web App Configuration (General settings), set Startup Command to:

```bash
node server.js
```

### 3. Add App Service environment variables

In App Service -> Settings -> Environment variables, add at least:

*   `NODE_ENV=production`
*   `MONGODB_URI=...`
*   `GOOGLE_CLIENT_ID=...`
*   `GOOGLE_CLIENT_SECRET=...`
*   `NEXTAUTH_SECRET=...`
*   `NEXTAUTH_URL=https://<your-webapp-name>.azurewebsites.net`

### 4. Add GitHub secrets

In GitHub -> Settings -> Secrets and variables -> Actions, add:

*   `AZURE_WEBAPP_NAME` (example: `math-royale-prod`)
*   `AZURE_WEBAPP_PUBLISH_PROFILE` (download from App Service -> Get publish profile)

### 5. Deploy

Push to `main` (or run the workflow manually). The workflow builds Next.js standalone output and deploys it to Azure.

---

## 🏆 Tournament Management

Managing the tournament is handled via scripts in the `scripts/` directory.

### Core Lifecycle Scripts:
*   **Seed Content**: `npm run seed-round2`
*   **Initialize**: `npm run initialize-tournament-multi` (Setup Stage A)
*   **Advance**: `npm run advance-round-multi A` (Move A → B)

For a complete guide on running the tournament, see:
👉 **[Tournament Guide](./scripts/tournament_guide.md)** (Admin Manual)
👉 **[Scripts Documentation](./scripts/SCRIPTS.md)** (CLI Reference)

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org) (App Router)
*   **Database**: [MongoDB](https://mongodb.com) via [Mongoose](https://mongoosejs.com)
*   **Authentication**: [NextAuth.js](https://next-auth.js.org)
*   **Styling**: Vanilla CSS + Tailwind-inspired utilities
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 📄 License

This project is intended for tournament organization. All rights reserved by the event coordinators.
