
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
- **WARRIOR (Admin)**: Has full command authority. Can bypass verification protocols, approve sessions, shift identities, and broadcast global orders.
- **Operative (User)**: Requires explicit administrative authorization on *every login*.

## 🚀 Per-Session Security Protocol

To ensure maximum security, standard operatives must undergo the following sequence for **every new session**:

1.  **Gateway Authentication**: State the correct sequence (`raven.oracle`).
2.  **Identity Registry**: Submit an active callsign.
3.  **Command Approval**: Wait for the **WARRIOR** to manually authorize the session request from the Command Terminal.
4.  **Biometric Visage Link**: Complete a camera-based facial scan to link the physical subject to the session.
5.  **Session Code Unlock**: Enter the unique 4-digit numeric code provided by the Oracle upon approval.

*Note: Administrators (WARRIOR) bypass stages 3-5 for rapid response capabilities.*

## 🛡️ Feature Breakdown

### 1. Secure Communication Hub
- **Targeted Messaging**: Users can broadcast to `ALL` or target specific callsigns (e.g., `WARRIOR`).
- **Session-Locked History**: Operatives only see communications transmitted since their specific session began. History is purged locally on termination.
- **Command Broadcasts**: Administrators can transmit priority orders to individuals or the entire team.

### 2. Command Terminal (Admin Panel)
- **Access Queues**: Manage and authorize pending session requests from operatives.
- **Operative Registry**: Full view of all registered subjects and their status.
- **Termination Control**: Admins can instantly block or purge any operative, forcing an immediate session disconnect.
- **Identity Tasks**: Authorize or reject requested callsign shifts.
- **System Config**: Update gateway sequences and provision invite-only biometric links.

## 🛠️ Getting Started

To run this project locally:
1. Ensure your environment has the necessary Firebase configuration in `src/firebase/config.ts`.
2. Use the following commands:
   - `npm run dev`: Starts the Next.js development server.
   - `npm run build`: Compiles the application for production.

---
*The shadows hold your secrets. Encrypted end-to-end.*
