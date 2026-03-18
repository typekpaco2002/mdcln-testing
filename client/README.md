# 🎨 ModelClone Frontend - Premium Edition

Apple-level design frontend for ModelClone AI content generation platform.

## ✨ Features

- 🎭 **Premium Apple-inspired Design** - Glassmorphism, smooth animations
- 🔐 **Complete Auth Flow** - Signup, Login, Email Verification
- 📧 **Email Verification** - 6-digit code with resend functionality
- 💳 **Credits System** - Real-time credit tracking
- ⏱️ **Queue Status** - Live queue monitoring (Bronze tier: 3 concurrent)
- 📤 **Drag & Drop Upload** - Cloudinary integration
- 🎬 **AI Generation** - Complete recreation pipeline
- 📱 **Fully Responsive** - Works on all devices
- ⚡ **Lightning Fast** - Vite + React 18
- 🎨 **Framer Motion** - Smooth page transitions
- 🍞 **Toast Notifications** - Beautiful feedback
- 📦 **State Management** - Zustand with persistence

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
```

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:5173

## 📦 Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **Zustand** - State management
- **Axios** - HTTP client
- **React Dropzone** - File uploads
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 🎯 Pages

- `/` - Landing page with features & pricing
- `/login` - User login
- `/signup` - User registration
- `/verify` - Email verification (6-digit code)
- `/dashboard` - Main app (protected)

## 💰 Credits System

- **Image**: 3 credits ($0.30)
- **Video**: 4 credits/second ($0.40/s)
- **Complete Pipeline**: 7 credits (image + video)

## 🔧 API Integration

All API calls configured in `src/services/api.js`:

```javascript
import { authAPI, generationAPI } from './services/api';

// Auth
await authAPI.signup(email, password, name);
await authAPI.login(email, password);
await authAPI.verifyEmail(email, code);

// Generation
await generationAPI.completeRecreation({
  modelIdentityImages: [url1, url2, url3],
  videoScreenshot: targetUrl,
  originalVideoUrl: videoUrl
});
```

## 🎨 Design System

### Colors
- **Primary**: Purple (#a855f7)
- **Secondary**: Blue (#3b82f6)
- **Background**: Black (#000000)
- **Glass**: rgba(17, 17, 17, 0.7) with backdrop-blur

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300-900

### Components
- Glassmorphism cards
- Gradient buttons
- Smooth transitions
- Loading states
- Toast notifications

## 📱 Responsive

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🚀 Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## 🌐 Deploy

### Vercel (Recommended)
```bash
vercel
```

### Netlify
```bash
netlify deploy --prod
```

## 🔒 Environment Variables

Required:
- `VITE_API_URL` - Backend API URL
- `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `VITE_CLOUDINARY_UPLOAD_PRESET` - Cloudinary upload preset

## 📝 Project Structure

```
src/
├── components/         # Reusable components
├── pages/             # Page components
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── VerifyEmailPage.jsx
│   └── DashboardPage.jsx
├── services/          # API services
│   └── api.js
├── store/             # Zustand stores
│   └── index.js
├── App.jsx            # Main app with routing
├── main.jsx           # Entry point
└── index.css          # Global styles + Tailwind
```

## 🎉 Features Checklist

- ✅ Apple-level design
- ✅ Email verification flow
- ✅ Credits display
- ✅ Queue status monitoring
- ✅ Drag & drop uploads
- ✅ Complete generation pipeline
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Protected routes
- ✅ State persistence
- ✅ Smooth animations

## 🆘 Troubleshooting

### API Connection Issues
```bash
# Make sure backend is running
cd ../backend
npm run dev

# Check VITE_API_URL in .env
```

### Cloudinary Upload Fails
```bash
# Verify Cloudinary credentials
# Check upload preset allows unsigned uploads
```

### Build Errors
```bash
# Clear cache
rm -rf node_modules
npm install
```

## 📄 License

MIT

## 🤝 Support

For issues or questions, contact support.

---

Built with ❤️ for creators
