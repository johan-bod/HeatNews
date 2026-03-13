# HeatStory

**HeatStory** maps global news coverage in real-time. See which stories get the most attention, which regions are underreported, and which local stories are bubbling up before they go national.

Local journalism is dying — but local stories still matter. HeatStory surfaces coverage patterns that traditional news feeds bury, giving editors and informed readers the tools to connect the dots across newsrooms and geographies.

Built with React, TypeScript, and NewsData.io API.

## 🌍 Features

- **Real-Time News Feed**: Fetches latest news from 206 countries via NewsData.io API
- **Interactive World Map**: Visualize news articles with Leaflet.js mapping, allowing users to look for their interest
- **Smart Geocoding**: Automatically extracts and maps article locations from newspapers published online
- **Geographic Filtering**: Filter news by hyperlocal, regional, national or international
- **Topic Filtering**: Filter news by topic, trending, and else - the map automatically portrays a heatmap where interest/publications are the highest, based on geography the user chooses

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
- **National News**: Filters to country-related articles
- **World News**: Shows international news (non-UK)

```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is uses the following open-source libraries:
- React (MIT)
- Leaflet (BSD-2-Clause)
- Tailwind CSS (MIT)
- shadcn/ui (MIT)

## 🔗 Links

- **NewsData.io**: https://newsdata.io
- **Documentation**: [NEWSDATA_SETUP.md](./NEWSDATA_SETUP.md)

---

