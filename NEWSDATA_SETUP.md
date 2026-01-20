# NewsData.io API Setup Guide

This application uses NewsData.io's free, commercial-friendly news API to fetch real-time articles and display them on an interactive map.

## Why NewsData.io?

- ✅ **200 API requests/day** on free tier
- ✅ **Commercial use allowed** (perfect for MVP → production)
- ✅ **Real-time news** (no delays)
- ✅ **87,287+ news sources** worldwide
- ✅ **206 countries**, **89 languages**
- ✅ **Multi-level geographic filtering** (city, state, country)
- ✅ **No credit card required** for free tier

## Getting Your Free API Key

### Step 1: Register for Free

1. Visit: **https://newsdata.io/register**
2. Fill out the registration form:
   - Your name
   - Email address
   - Password
3. Verify your email
4. **You'll receive your API key immediately!**

### Step 2: Copy Your API Key

1. After logging in, go to your dashboard
2. Find your API key in the "API Key" section
3. Copy the key (it looks like: `pub_xxxxxxxxxxxxx`)

## Setting Up Your API Key

### Step 1: Add to Environment Variables

Open the `.env` file in your project root and replace `test` with your actual API key:

```env
VITE_NEWSDATA_API_KEY=pub_your_actual_api_key_here
```

### Step 2: Restart Your Development Server

If your dev server is running, restart it to pick up the new environment variable:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## API Usage & Limits

### Free Tier Limits

- **200 requests/day**
- **10 articles per request** (max on free tier)
- **Commercial use allowed** ✅
- **Real-time news** (no delays)
- **6 months historical data**

### Your App's Usage Pattern

With **4-hour auto-refresh**:
- Auto-refreshes: **6 requests/day** (24 ÷ 4 = 6)
- User manual refreshes: ~**20-30 requests/day** (estimated)
- Window focus refreshes: ~**10 requests/day** (estimated)
- **Total: ~40-50 requests/day**

**You have ~150 requests/day spare** for development and testing! 🎉

### Request Counting

**1 API call = 1 request**, regardless of parameters!

Examples:
- `GET /news?country=us` = **1 request**
- `GET /news?country=us&language=en&category=politics` = **1 request**
- `GET /news?country=us,gb,ca&category=tech,business` = **1 request**

Adding more filters **doesn't increase** the request count!

## Scaling to Paid Tier (When You Need It)

When you exceed 200 requests/day or need more features:

| Plan | Price | Requests | Features |
|------|-------|----------|----------|
| **Free** | $0/mo | 200/day | Basic, commercial use ✅ |
| **Basic** | $199/mo | 20,000/mo | Full text, priority support |
| **Pro** | Custom | Custom | Historical data, webhooks |

## Features & Coverage

### Geographic Coverage

**Multi-Level Filtering:**
- **Cities**: London, New York, Mumbai, etc.
- **Regions/States**: California, Texas, etc.
- **Countries**: US, UK, India, etc. (206 countries total)
- **Continents**: North America, Europe, Asia, etc.

**Current Implementation:**
```javascript
// Fetching from 10 countries for diverse coverage
country: ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'es', 'it', 'jp']
```

### News Categories

Available categories:
- `business` - Business news
- `entertainment` - Entertainment & celebrity news
- `environment` - Environmental news
- `food` - Food & dining
- `health` - Health & medical news
- `politics` - Political news
- `science` - Scientific discoveries
- `sports` - Sports news
- `technology` - Tech & gadgets
- `top` - Top stories
- `tourism` - Travel & tourism
- `world` - World news

### Languages Supported

89 languages including:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ar` - Arabic
- `zh` - Chinese
- `ja` - Japanese
- `hi` - Hindi
- And 79 more...

## How the App Uses NewsData.io

### Data Flow

```
NewsData.io API → Fetch articles → Extract locations → Geocode → Map markers
                        ↓
                  News feed list
```

### Current Configuration

**Auto-Refresh:**
- Every **4 hours** automatically
- On **window focus** (when you return to the tab)
- On **user request** (manual refresh button - if added)

**Filters Applied:**
```javascript
{
  size: 10,              // Max articles per request (free tier limit)
  language: 'en',        // English only
  country: [             // 10 countries for diversity
    'us', 'gb', 'ca', 'au', 'in',
    'de', 'fr', 'es', 'it', 'jp'
  ]
}
```

### Geocoding Process

Since NewsData.io doesn't provide coordinates, we use intelligent extraction:

1. **Extract Location Keywords**
   - Analyzes article title, description, and AI region tag
   - Looks for mentions of cities, countries, and regions

2. **Match to Coordinate Database**
   - Uses built-in database of 80+ major cities and countries
   - Matches location mentions to latitude/longitude coordinates

3. **Display on Map**
   - Places markers at extracted coordinates
   - Groups articles by location
   - Defaults to article's source country if no specific location found

## API Response Example

```json
{
  "status": "success",
  "totalResults": 10,
  "results": [
    {
      "article_id": "abc123...",
      "title": "Breaking: Major Event Occurs",
      "description": "A significant event has occurred...",
      "link": "https://newssite.com/article",
      "pubDate": "2026-01-18 10:30:00",
      "image_url": "https://newssite.com/image.jpg",
      "source_id": "newssite",
      "country": ["us"],
      "category": ["politics"],
      "language": "en",
      "ai_region": "Washington DC"
    }
  ]
}
```

## Customization

### Change Auto-Refresh Interval

Edit `/src/pages/Index.tsx`:

```javascript
// Current: 4 hours
refetchInterval: 4 * 60 * 60 * 1000,

// Change to 2 hours:
refetchInterval: 2 * 60 * 60 * 1000,

// Change to 6 hours:
refetchInterval: 6 * 60 * 60 * 1000,
```

### Change Countries Fetched

Edit `/src/pages/Index.tsx`:

```javascript
// Current: 10 countries
country: ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'es', 'it', 'jp'],

// Europe only:
country: ['gb', 'de', 'fr', 'es', 'it'],

// Asia only:
country: ['in', 'jp', 'cn', 'sg', 'th'],
```

### Add Category Filtering

Edit `/src/pages/Index.tsx`:

```javascript
const rawArticles = await fetchTodayNews({
  size: 10,
  language: 'en',
  country: ['us', 'gb', 'ca'],
  category: ['technology', 'business'], // Add this line
});
```

### Search by Keyword

Use the `searchNews` function:

```javascript
import { searchNews } from '@/services/newsdata-api';

const articles = await searchNews('climate change', {
  size: 10,
  language: 'en',
  country: ['us', 'gb'],
});
```

## Troubleshooting

### "Failed to load news" Error

**1. Check your API key**
- Make sure you've added it to `.env`
- Verify there are no extra spaces or quotes
- Key should start with `pub_`

**2. Verify the key is valid**
- Log in to https://newsdata.io/dashboard
- Check your API key is active
- Verify you haven't exceeded daily limit (200 requests)

**3. Check rate limits**
- Free tier: 200 requests per day
- Check your dashboard for current usage
- Wait until next day for limit reset (resets at midnight UTC)

**4. Check console for errors**
- Open browser DevTools (F12)
- Look in Console tab for error messages
- Check Network tab for API request details

### No Articles on Map

**1. Articles may not have location data**
- NewsData.io doesn't provide coordinates
- We extract locations from article content
- Some articles can't be geocoded automatically

**2. Try different filters**
- Switch between "All News", "UK News", and "World News"
- Some filters may have more geocoded articles

**3. Check geocoding database**
- Edit `/src/utils/geocoding.ts`
- Add more cities to `LOCATION_DATABASE` if needed

### API Rate Limit Exceeded

**Solution 1: Reduce auto-refresh frequency**
```javascript
// Change from 4 hours to 6 hours
refetchInterval: 6 * 60 * 60 * 1000,
```

**Solution 2: Disable auto-refresh temporarily**
```javascript
// Comment out this line:
// refetchInterval: 4 * 60 * 60 * 1000,
```

**Solution 3: Upgrade to paid tier**
- Visit https://newsdata.io/pricing
- Basic plan: $199/mo for 20,000 requests/month

## Testing the Integration

### Test API Call Directly

Test your API key with curl:

```bash
curl "https://newsdata.io/api/1/news?apikey=YOUR_KEY&language=en&country=us"
```

### Check Request Count

Monitor your usage:
1. Visit https://newsdata.io/dashboard
2. Check "API Usage" section
3. See how many requests you've used today

## Resources

- **Documentation**: https://newsdata.io/documentation
- **Dashboard**: https://newsdata.io/dashboard
- **Pricing**: https://newsdata.io/pricing
- **API Status**: https://status.newsdata.io/
- **Support**: support@newsdata.io

## Development Tips

### Enable Debug Mode

Add console logging to see API responses:

```javascript
// In src/services/newsdata-api.ts
console.log('NewsData.io Response:', data);
```

### Test with Different Parameters

Try different combinations in `/src/pages/Index.tsx`:

```javascript
// Tech news from US only
const rawArticles = await fetchTodayNews({
  size: 10,
  language: 'en',
  country: 'us',
  category: 'technology',
});

// Breaking news from multiple countries
const rawArticles = await fetchTodayNews({
  size: 10,
  language: 'en',
  country: ['us', 'gb', 'ca'],
  prioritydomain: 'top', // Top news sources only
});
```

## Next Steps

1. ✅ Get your API key from NewsData.io
2. ✅ Add it to `.env` file
3. ✅ Run `npm run dev`
4. ✅ See live news on your map!
5. 🎯 Customize filters and refresh intervals
6. 🚀 Build your MVP and start testing!

---

**Questions?** Check the [NewsData.io documentation](https://newsdata.io/documentation) or open an issue in this repository.
