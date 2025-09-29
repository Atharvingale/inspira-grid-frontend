# Inspira-Grid Frontend

Frontend application for the Inspira-Grid collaborative platform built with Next.js.

## 🚀 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/inspira-grid-frontend)

## 🔧 Environment Variables

Set these environment variables in your Vercel project:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app/api
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.vercel.app
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_DISABLE_SOCKET=false
```

## ✨ Features

- 🔐 Firebase Authentication with Google & GitHub OAuth
- 👥 Project Management & Team Collaboration
- 💬 Real-time Messaging with Socket.IO
- 📊 User Profiles & Skill Showcasing
- 🎯 Smart Project Recommendations
- 📱 Responsive Design with Tailwind CSS
- ⚡ Real-time Updates & Notifications

## 🛠️ Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Tech Stack

- **Framework**: Next.js 15.5.3
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Animations**: Framer Motion
- **Authentication**: Firebase Auth
- **Real-time**: Socket.IO Client