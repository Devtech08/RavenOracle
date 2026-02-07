
# Raven Oracle | Secure Communication Portal

A high-security, futuristic communication platform designed for discrete operations. The portal features a terminal-inspired interface with tiered access controls and real-time encrypted data streams.

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS with ShadCN UI components
- **Backend**: Firebase (Firestore & Authentication)
- **AI/GenAI**: Genkit (Agentic reasoning and automation)
- **Icons**: Lucide React
- **Typography**: Source Code Pro (Monospace focus)

## 🎨 Branding
To update the main gateway emblem:
- Ensure there is a folder named `public` at the **root of your project** (outside the `src` folder).
- Upload your logo file to that root `public/` directory.
- Ensure the filename is exactly `logo.jpeg`.
- The system will automatically detect and apply the cyan glow and background-removal blending to the emblem.

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

---
*The shadows hold your secrets. Encrypted end-to-end.*

**WARRIOR**
