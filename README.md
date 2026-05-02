# Chayakada ☕

Chayakada is a premium, real-time communication platform built with a modern glassmorphism aesthetic. It combines high-performance 3D visuals with robust WebRTC video streaming and Socket.io messaging to create a unique "digital tea shop" experience.

![Chayakada Logo](https://raw.githubusercontent.com/HellzAngel/chayakada-/main/public/chayakada_favicon.png)

## ✨ Features

- **Real-Time Messaging**: Instant chat powered by Socket.io.
- **WebRTC Video Streaming**: High-quality Peer-to-Peer video and audio calls.
- **3D Atmospheric Background**: A stunning, performance-optimized Three.js scene with floating Malayalam chat bubbles.
- **Premium Glassmorphism UI**: Modern, translucent interface with neon "tube" lighting effects.
- **Mobile First Design**: Fully responsive layout with sliding participant overlays for small screens.
- **Room Management**: Support for both Private (1-on-1) and Group chat rooms with unique 6-digit codes.
- **Screen Sharing**: Native browser screen sharing capabilities.

## 🚀 Tech Stack

- **Frontend**: React.js, Vite, Three.js (R3F), PeerJS, Lucide React.
- **Backend**: Node.js, Express, Socket.io.
- **Styling**: Vanilla CSS (Custom Glassmorphism System).
- **Deployment**: Optimized for Vercel (Frontend) and Render (Backend).

## 🛠️ Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/HellzAngel/chayakada-.git
cd chayakada-
```

### 2. Frontend Setup
```bash
npm install
# Create a .env file and add:
# VITE_SOCKET_URL=http://localhost:3001
npm run dev
```

### 3. Backend Setup
```bash
cd server
npm install
node server.js
```

## 🌐 Deployment Instructions

### Backend (Render)
1. Create a new **Web Service** on Render.
2. Root Directory: `server`
3. Build Command: `npm install`
4. Start Command: `node server.js`

### Frontend (Vercel)
1. Connect your repository to Vercel.
2. Add Environment Variable: `VITE_SOCKET_URL` = (Your Render URL).
3. Deploy.

---

## ☕ Why "Chayakada"?
In Kerala, India, a "Chayakada" (Tea Shop) is the heart of social life—a place where people gather to discuss everything from local gossip to global politics over a hot cup of tea. This app brings that same communal spirit to the digital world.

---
Built with ❤️ by [HellzAngel](https://github.com/HellzAngel)
