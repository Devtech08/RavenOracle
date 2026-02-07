# Raven Oracle | Secure Communication Portal

A high-security, futuristic communication platform designed for discrete operations. The portal features a terminal-inspired interface with tiered access controls and real-time encrypted data streams.

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS with ShadCN UI components
- **Backend**: Firebase (Firestore & Authentication)
- **Icons**: Lucide React
- **Typography**: Source Code Pro (Monospace focus)

## 🔑 Access Control & Identity

### Gateway Sequences
Entry is controlled by two primary sequences:
- `raven.oracle`: Standard operative entry path.
- `raven.admin`: Direct administrative bypass path.

### Identity Types
- **WARRIOR (Admin)**: Has full command authority, can approve sessions, shift identities, and broadcast global orders.
- **Operative (User)**: Requires administrative approval to gain a unique session code for chat access.

## 🚀 Key Features

### 1. Dual-Path Verification
- **Operative Path**: Entering `raven.oracle` prompts for a callsign. If joining via a provisioned invite link, the user must undergo **Biometric Visage Hashing** (Camera capture). New users are placed in an **Approval Queue**.
- **Command Path**: Entering `raven.admin` and identifying as **WARRIOR** allows for immediate bypass of session keys and biometrics.

### 2. Secure Communication Hub
- **Targeted Messaging**: Users can broadcast to `ALL` or target specific callsigns (e.g., `WARRIOR`).
- **Session-Locked History**: For operatives, chat history is automatically purged at the end of every session. Only messages sent since the session start are visible.
- **Administrative Archive**: The WARRIOR maintains a permanent log of all communications for audit purposes.

### 3. Command Terminal (Admin Panel)
- **Access Queues**: Manage and authorize pending session requests from operatives.
- **Operative Registry**: Full view of all registered subjects, their status, and biometric confirmation.
- **Identity Tasks**: Authorize or reject requested callsign shifts from any user.
- **Comms Hub**: A centralized command station for broadcasting orders to individuals or the entire team.
- **System Config**: Dynamically update gateway sequences and provision new invite-only entry keys.

## 🛡️ Security Architecture

### Firestore Security Rules
Access is strictly enforced at the database level:
- **Registry Privacy**: Only verified admins can list the full user registry.
- **Message Integrity**: Users can only read messages sent to them or the global broadcast channel.
- **Identity Protection**: Only the account owner or an admin can update user profile data.

### Biometric Hashing
The portal utilizes browser-based media APIs to capture facial data for invited users, creating a persistent biometric link to the operative's callsign.

## 🛠️ Getting Started

To run this project locally:
1. Ensure your environment has the necessary Firebase configuration in `src/firebase/config.ts`.
2. Use the following commands:
   - `npm run dev`: Starts the Next.js development server.
   - `npm run build`: Compiles the application for production.

---
*The shadows hold your secrets. Encrypted end-to-end.*