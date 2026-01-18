# UK Road Safety Dashboard

A React-based interactive dashboard for visualizing UK road safety data.

## 🚀 Features

- Interactive maps with accident markers
- Analytics charts and visualizations
- School safety analysis
- Accident hotspot identification
- Responsive design with Tailwind CSS

## 📋 Prerequisites

- Node.js 18+
- npm or yarn

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000

# Optional: Map Configuration
VITE_MAP_DEFAULT_LAT=51.505
VITE_MAP_DEFAULT_LNG=-0.09
VITE_MAP_DEFAULT_ZOOM=10
```

## 🏃 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/uk-road-safety-dashboard.git
cd uk-road-safety-dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

Access at: http://localhost:3000

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build and run
docker build -t uk-road-safety-dashboard .
docker run -p 80:80 uk-road-safety-dashboard
```

## 📁 Project Structure

```
uk-road-safety-dashboard/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Analytics.jsx
│   │   ├── AccidentMap.jsx
│   │   ├── Hotspots.jsx
│   │   └── SchoolSafety.jsx
│   ├── services/        # API client
│   │   └── api.js
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── .env.example         # Environment template
├── Dockerfile
├── nginx.conf           # Production nginx config
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🔗 Related

- [API Backend](https://github.com/yourusername/uk-road-safety-api)

## 📄 License

MIT License
