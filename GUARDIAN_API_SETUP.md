# The Guardian API Setup Guide

This application uses The Guardian's free, open-source news API to fetch today's articles and display them on an interactive map.

## Getting Your Free API Key

1. **Visit The Guardian Open Platform**
   - Go to: https://open-platform.theguardian.com/access/

2. **Register for a Free API Key**
   - Click "Register for a developer key"
   - Fill out the registration form with:
     - Your name
     - Your email address
     - Description of your use (e.g., "Personal news mapping project")
   - Accept the terms and conditions

3. **Receive Your API Key**
   - You'll receive your API key instantly via email
   - The key will also be displayed on the website after registration

## Setting Up Your API Key

1. **Copy the `.env.example` file**
   ```bash
   cp .env.example .env
   ```

2. **Add your API key to `.env`**
   Open the `.env` file and replace `your_api_key_here` with your actual API key:
   ```
   VITE_GUARDIAN_API_KEY=your_actual_api_key_here
   ```

3. **Important: Never commit your `.env` file**
   - The `.env` file is already in `.gitignore`
   - Never share your API key publicly

## API Usage Limits

The Guardian API has the following limits for free tier:

- **5,000 calls per day**
- **500 calls per hour**
- Rate limited to prevent abuse

For this application:
- Initial load: 1 API call (fetches 30 articles)
- Auto-refresh: Every 10 minutes (1 call per 10 minutes)
- Daily usage: ~144 calls per day (well within limits)

## Features Powered by The Guardian API

### 1. **Real-Time News Feed**
   - Fetches today's news articles from The Guardian
   - Updates every 10 minutes automatically
   - Displays article title, description, category, and timestamp

### 2. **Interactive World Map**
   - Articles are automatically geocoded based on content
   - Each article appears as a marker on the map
   - Click markers to read article summaries and links

### 3. **Smart Location Filtering**
   - **All News**: Shows all articles
   - **UK News**: Filters articles related to UK locations
   - **World News**: Shows international news

## How It Works

```
The Guardian API → Fetch articles → Extract locations → Geocode → Map markers
                        ↓
                  News feed list
```

### Geocoding Process

Since The Guardian API doesn't provide geographic coordinates, we use an intelligent location extraction system:

1. **Extract Location Keywords**
   - Analyzes article title, description, and category
   - Looks for mentions of cities, countries, and regions

2. **Match to Coordinate Database**
   - Uses a built-in database of 80+ major cities and countries
   - Matches location mentions to latitude/longitude coordinates

3. **Display on Map**
   - Places markers at extracted coordinates
   - Groups articles by location
   - Default to London (Guardian HQ) if no location found

## API Response Example

```json
{
  "response": {
    "status": "ok",
    "total": 30,
    "results": [
      {
        "id": "politics/2024/jan/18/...",
        "type": "article",
        "sectionName": "Politics",
        "webPublicationDate": "2024-01-18T10:30:00Z",
        "webTitle": "Article Title Here",
        "webUrl": "https://www.theguardian.com/...",
        "fields": {
          "headline": "Full Headline",
          "trailText": "Article summary...",
          "thumbnail": "https://..."
        }
      }
    ]
  }
}
```

## Troubleshooting

### "Failed to load news" Error

1. **Check your API key**
   - Make sure you've added it to `.env`
   - Verify there are no extra spaces or quotes

2. **Verify the key is valid**
   - Test your key at: https://open-platform.theguardian.com/documentation/
   - Try a simple request in your browser

3. **Check rate limits**
   - Wait a few minutes if you've exceeded limits
   - The app auto-refreshes every 10 minutes

### No Articles on Map

1. **Articles may not have location data**
   - Some articles can't be geocoded automatically
   - They'll still appear in the news feed

2. **Try different filter options**
   - Switch between "All News", "UK News", and "World News"
   - Some filters may have more geocoded articles

## Development

### Testing API Calls

Test the API directly:
```bash
curl "https://content.guardianapis.com/search?api-key=YOUR_KEY&page-size=10"
```

### Modifying API Parameters

Edit `/src/services/guardian-api.ts` to change:
- Number of articles fetched (`pageSize`)
- Date range (`fromDate`, `toDate`)
- Content sections (`section`)
- Fields returned (`showFields`)

### Adding More Locations

Edit `/src/utils/geocoding.ts` to add more cities/countries to the location database.

## Resources

- [The Guardian API Documentation](https://open-platform.theguardian.com/documentation/)
- [API Explorer](https://open-platform.theguardian.com/explore/)
- [Terms of Service](https://open-platform.theguardian.com/terms-of-service/)

## Support

For API issues, contact The Guardian:
- Email: api.team@theguardian.com
- Twitter: [@gdndevelopers](https://twitter.com/gdndevelopers)

For application issues, check the GitHub repository issues page.
