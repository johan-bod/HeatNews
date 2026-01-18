# Global News Horizon View

A real-time news mapping application that visualizes news articles from around the world on an interactive map. Built with React, TypeScript, and NewsData.io API.

## 🌍 Features

- **Real-Time News Feed**: Fetches latest news from 206 countries via NewsData.io API
- **Interactive World Map**: Visualize news articles with Leaflet.js mapping
- **Smart Geocoding**: Automatically extracts and maps article locations
- **Geographic Filtering**: Filter news by UK, World, or All regions
- **Auto-Refresh**: Updates every 4 hours automatically
- **Responsive Design**: Beautiful UI with Tailwind CSS and shadcn/ui components

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+ recommended)
- npm or bun
- NewsData.io API key (free tier available)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd global-news-horizon-view

# Install dependencies
npm install

# Set up your API key
cp .env.example .env
# Edit .env and add your NewsData.io API key

# Start the development server
npm run dev
```

### Get Your Free API Key

1. Visit [NewsData.io](https://newsdata.io/register)
2. Register for a free account (no credit card required)
3. Copy your API key from the dashboard
4. Add it to your `.env` file:
   ```
   VITE_NEWSDATA_API_KEY=your_api_key_here
   ```

For detailed setup instructions, see [NEWSDATA_SETUP.md](./NEWSDATA_SETUP.md)

## 📊 API Usage

- **Free Tier**: 200 requests/day
- **Commercial Use**: ✅ Allowed on free tier
- **Coverage**: 87,287+ news sources, 206 countries, 89 languages
- **Your App Usage**: ~40-50 requests/day (well within limits!)

## 🗺️ Map Technology

- **Leaflet.js**: Free, open-source interactive maps
- **OpenStreetMap**: High-quality map tiles
- **Zoom Levels**: From world view down to street level
- **No API Keys Needed**: Completely free forever

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Data Fetching**: React Query (TanStack Query)
- **Mapping**: Leaflet, React Leaflet
- **News API**: NewsData.io
- **Routing**: React Router v7

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── Hero.tsx        # Landing hero section
│   ├── NewsDemo.tsx    # News feed list
│   ├── NewsMap.tsx     # Interactive map
│   ├── MapSection.tsx  # Map container
│   └── Features.tsx    # Feature showcase
├── pages/              # Route pages
│   └── Index.tsx       # Main page
├── services/           # API services
│   └── newsdata-api.ts # NewsData.io integration
├── utils/              # Utility functions
│   └── geocoding.ts    # Location extraction
└── types/              # TypeScript types
    └── news.ts         # News article types
```

## 🔧 Available Scripts

```sh
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📖 Documentation

- [NewsData.io Setup Guide](./NEWSDATA_SETUP.md) - Complete API setup and configuration
- [Dependency Audit Report](./DEPENDENCY_AUDIT.md) - Security and dependency analysis

## 🌟 Key Features Explained

### Auto-Refresh Strategy

The app automatically refreshes news every **4 hours** to stay current while minimizing API usage:
- Auto-refresh: 6 times/day
- Window focus refresh: When you return to the tab
- Manual refresh: User-triggered (optional)

### Geocoding Intelligence

Since NewsData.io doesn't provide coordinates, we use smart location extraction:
1. Analyzes article title, description, and AI region tags
2. Matches locations against a database of 80+ major cities and countries
3. Places markers on the map with extracted coordinates
4. Falls back to source country if no specific location found

### Geographic Filtering

- **All News**: Shows all articles from 10 countries
- **UK News**: Filters to UK-related articles
- **World News**: Shows international news (non-UK)

## 🎨 Customization

### Change Auto-Refresh Interval

Edit `src/pages/Index.tsx`:
```javascript
refetchInterval: 4 * 60 * 60 * 1000, // 4 hours (change as needed)
```

### Change Countries Fetched

Edit `src/pages/Index.tsx`:
```javascript
country: ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'es', 'it', 'jp'],
// Add or remove country codes
```

### Add Category Filtering

Edit `src/pages/Index.tsx`:
```javascript
category: ['technology', 'business'], // Add this parameter
```

## 🐛 Troubleshooting

**"Failed to load news" error:**
1. Check your API key in `.env`
2. Verify you haven't exceeded 200 requests/day
3. Check console for error messages

**No articles on map:**
1. Some articles can't be geocoded automatically
2. They still appear in the news feed
3. Try different geographic filters

See [NEWSDATA_SETUP.md](./NEWSDATA_SETUP.md) for more troubleshooting tips.

## 📈 Scaling to Production

When ready to scale beyond the free tier:

1. **Basic Plan** ($199/mo): 20,000 requests/month
2. **Pro Plan** (Custom): Higher limits, historical data, webhooks
3. Visit [NewsData.io Pricing](https://newsdata.io/pricing)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is built with [Lovable](https://lovable.dev) and uses the following open-source libraries:
- React (MIT)
- Leaflet (BSD-2-Clause)
- Tailwind CSS (MIT)
- shadcn/ui (MIT)

## 🔗 Links

- **Project Dashboard**: https://lovable.dev/projects/0ead47fe-e854-43bb-beac-4c5e1e50c639
- **NewsData.io**: https://newsdata.io
- **Documentation**: [NEWSDATA_SETUP.md](./NEWSDATA_SETUP.md)

## 💡 Project Info

**URL**: https://lovable.dev/projects/0ead47fe-e854-43bb-beac-4c5e1e50c639

### How to Edit This Code

**Use Lovable**
Visit the [Lovable Project](https://lovable.dev/projects/0ead47fe-e854-43bb-beac-4c5e1e50c639) and start prompting. Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**
Clone this repo and push changes. Pushed changes will also be reflected in Lovable.

**Use GitHub Codespaces**
Click on "Code" → "Codespaces" → "New codespace" to launch a development environment in your browser.

---

Built with ❤️ using [Lovable](https://lovable.dev)
