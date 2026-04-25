# Lok Shikayat - Digital Complaint Management System

Lok Shikayat is a comprehensive, enterprise-grade grievance redressal platform designed for seamless citizen-governance interaction. Built with React and powered by Firebase, it features AI-driven insights, multi-role access control, and real-time tracking.

## 🚀 Key Features

### 👥 Multi-role Ecosystem
- **Citizen Portal**: Secure login via Google, easy grievance submission with camera/location support, and real-time status tracking.
- **Officer Dashboard**: Specialized views for department officers to manage, review, and act on assigned complaints.
- **Admin Console**: High-level oversight, system configuration, and advanced security audit logs.

### 🧠 Intelligent Core
- **AI Insights**: Automated analysis of grievance patterns to help departments prioritize critical issues.
- **QR Code Tracking**: Every complaint generates a unique QR code for instant physical-to-digital tracking.
- **Real-time Notifications**: Automatic alerts for citizens when the status of their grievance changes.

### 🌍 Accessibility & Security
- **Bilingual Interface**: Full support for English and Hindi (हिंदी).
- **Hardened Security**: Military-grade Firestore security rules ensuring data isolation and PII protection.
- **Responsive Design**: Optimized for mobile, tablet, and desktop users.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Motion (Animations)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google OAuth)
- **AI Integration**: Google Gemini API
- **Internationalization**: react-i18next
- **Visualizations**: Recharts

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- A Firebase Project

### Setup Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ayushkr0005/LokShikayat.git
   cd LokShikayat
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file based on `.env.example` and add your Firebase and Gemini credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   GEMINI_API_KEY=your_gemini_key
   ```

4. **Running Locally**:
   ```bash
   npm run dev
   ```

## 🚀 Deployment (Vercel)

1. **Import to Vercel**: Connect your GitHub repository to Vercel.
2. **Configure Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Add Environment Variables**: Copy your `.env` values into the Vercel dashboard.
4. **Deploy**: Vercel will automatically deploy and provide a production URL.

## 🔒 Security Rules
The system uses strict Attribute-Based Access Control (ABAC). Citizens can only read/write their own records, while officers are restricted to their department's data.

---
**Built for transparent and efficient governance.**
