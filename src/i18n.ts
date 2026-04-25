import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app_name": "LokShikayat",
      "slogan": "Digital Complaint Management System",
      "login_title": "Welcome to Lok Shikayat",
      "login_subtitle": "Secure, Scalable, AI-Powered Grievance Redressal",
      "continue_google": "Continue with Google",
      "dashboard_overview": "Dashboard Overview",
      "citizen_portal": "Citizen Portal",
      "officer_dashboard": "Officer Dashboard",
      "admin_console": "Admin Console",
      "my_complaints": "My Complaints",
      "new_case": "New Case",
      "search_placeholder": "Search complaints...",
      "status_submitted": "Submitted",
      "status_review": "In Review",
      "status_progress": "In Progress",
      "status_resolved": "Resolved",
      "status_rejected": "Rejected",
      "priority_low": "Low",
      "priority_medium": "Medium",
      "priority_high": "High",
      "priority_critical": "Critical",
      "category_infrastructure": "Infrastructure",
      "category_sanitation": "Sanitation",
      "category_traffic": "Traffic",
      "category_noise": "Noise",
      "category_safety": "Safety",
      "category_utilities": "Utilities",
      "category_environment": "Environment",
      "category_other": "Other",
      "ai_insights": "AI Intelligence Insights",
      "recent_events": "Recent Audit Security Events",
      "sign_out": "Sign Out",
      "language": "Language",
      "english": "English",
      "hindi": "Hindi"
    }
  },
  hi: {
    translation: {
      "app_name": "LokShikayat",
      "slogan": "डिजिटल शिकायत प्रबंधन प्रणाली",
      "login_title": "लोक शिकायत में आपका स्वागत है",
      "login_subtitle": "सुरक्षित, स्केलेबल, एआई-संचालित शिकायत निवारण",
      "continue_google": "गूगल के साथ जारी रखें",
      "dashboard_overview": "डैशबोर्ड अवलोकन",
      "citizen_portal": "नागरिक पोर्टल",
      "officer_dashboard": "अधिकारी डैशबोर्ड",
      "admin_console": "एडमिन कंसोल",
      "my_complaints": "मेरी शिकायतें",
      "new_case": "नई शिकायत",
      "search_placeholder": "शिकायतें खोजें...",
      "status_submitted": "जमा की गई",
      "status_review": "समीक्षा में",
      "status_progress": "प्रगति में",
      "status_resolved": "हल हो गई",
      "status_rejected": "अस्वीकृत",
      "priority_low": "कम",
      "priority_medium": "मध्यम",
      "priority_high": "उच्च",
      "priority_critical": "गंभीर",
      "category_infrastructure": "बुनियादी ढांचा",
      "category_sanitation": "स्वच्छता",
      "category_traffic": "यातायात",
      "category_noise": "शोर",
      "category_safety": "सुरक्षा",
      "category_utilities": "उपयोगिताएँ",
      "category_environment": "पर्यावरण",
      "category_other": "अन्य",
      "ai_insights": "एआई इंटेलिजेंस अंतर्दृष्टि",
      "recent_events": "हालिया ऑडिट सुरक्षा कार्यक्रम",
      "sign_out": "साइन आउट",
      "language": "भाषा",
      "english": "अंग्रेज़ी",
      "hindi": "हिंदी"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
