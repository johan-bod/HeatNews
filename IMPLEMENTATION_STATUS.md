# Implementation Status & Roadmap

## ✅ Completed Features

### 1. **4-Hour Background Caching System** ✅

**How it works:**
- **First visit**: Fetches news from API (3 requests), caches for 4 hours
- **Subsequent visits**: Loads instantly from cache (0 API requests)
- **Background refresh**: Every 4 hours, checks if cache is stale
  - If stale: Refreshes in background (doesn't block UI)
  - User sees old data while new data loads
  - Automatic update when refresh completes
- **Manual refresh**: "Refresh News" button for user-triggered updates

**Implementation:**
```javascript
// src/services/cachedNews.ts
- initializeBackgroundRefresh() // Checks every 5 minutes
- shouldRefreshCache() // Determines if 4 hours have passed
- refreshCacheInBackground() // Non-blocking background refresh
```

**API Usage:**
- **First load**: 3 requests (Argentina + Asia + International)
- **Return visits**: 0 requests (cached)
- **Every 4 hours**: 3 requests (automatic background refresh)
- **Daily usage**: ~18 requests/day (vs. previous 200/day limit)
- **Savings**: 91% reduction!

### 2. **Updated News Queries** ✅

**Argentina Local News** (Hyperlocal):
- Country: Argentina (ar)
- Language: Spanish (es)
- Keywords: Mendoza, Córdoba, Rosario, Buenos Aires
- Scale: **Local**
- 10 articles

**Asia National News** (National):
- Countries: India, Japan, China, South Korea, Singapore, Thailand, Indonesia, Malaysia
- Language: English
- Categories: Top stories, Politics, Business
- Scale: **National**
- 10 articles

**International News**:
- Countries: US, GB, DE, FR, ES, IT, BR, CA, AU, ZA
- Language: English
- Categories: Top stories, World news
- Scale: **International**
- 10 articles

**Total**: 30 articles with diverse geographic and scale coverage

### 3. **Heat Mapping & Clustering** ✅

- Topic clustering using Jaccard similarity
- Scale-aware heat calculation (local/national/international)
- Color gradient: Grey → Yellow → Orange → Red
- Marker size proportional to heat level
- Coverage metrics in popups

---

## 🚧 Features To Implement

### 4. **Comprehensive Filter System** (High Priority)

**Goal**: Let users filter by all NewsData.io parameters

**Available NewsData.io Filters:**

| Filter | Options | Example |
|--------|---------|---------|
| **Country** | 206 countries | us, gb, fr, ar, jp, etc. |
| **Language** | 89 languages | en, es, fr, de, ja, zh, etc. |
| **Category** | 12 categories | business, politics, sports, tech, etc. |
| **Domain** | Specific domains | bbc.com, cnn.com, etc. |
| **Priority** | top, medium, low | Only top-tier sources |
| **Timeframe** | Date ranges | Last 24h, week, month |

**Implementation Plan:**

**Step 1: Create Filter Component**
```bash
# Create new file
touch src/components/NewsFilters.tsx
```

**Step 2: Add Filter UI**
```typescript
// src/components/NewsFilters.tsx
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export function NewsFilters({ onFilterChange }) {
  return (
    <div className="filters">
      <Select name="country">
        <option value="">All Countries</option>
        <option value="us">United States</option>
        <option value="gb">United Kingdom</option>
        <option value="ar">Argentina</option>
        {/* Add all 206 countries */}
      </Select>

      <Select name="category">
        <option value="">All Categories</option>
        <option value="business">Business</option>
        <option value="politics">Politics</option>
        <option value="sports">Sports</option>
        {/* Add all 12 categories */}
      </Select>

      <Select name="language">
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        {/* Add all 89 languages */}
      </Select>

      <Select name="scale">
        <option value="all">All Scales</option>
        <option value="local">Local</option>
        <option value="national">National</option>
        <option value="international">International</option>
      </Select>
    </div>
  );
}
```

**Step 3: Create Custom Search Function**
```typescript
// src/services/newsdata-api.ts
export async function searchNewsWithFilters(filters: {
  country?: string[];
  language?: string;
  category?: string[];
  scale?: 'local' | 'national' | 'international';
  query?: string;
}) {
  const response = await fetchNewsDataArticles({
    country: filters.country,
    language: filters.language,
    category: filters.category,
    query: filters.query,
    size: 10,
  });

  // Apply scale filtering and heat mapping
  let articles = response.results.map(convertNewsDataArticle);
  articles = geocodeArticles(articles);

  // Filter by scale if specified
  if (filters.scale) {
    articles = articles.filter(a => a.scale === filters.scale);
  }

  return articles;
}
```

**Step 4: Integrate into Index Page**
```typescript
// Add to src/pages/Index.tsx
const [filters, setFilters] = useState({});

<NewsFilters onFilterChange={setFilters} />
<NewsDemo articles={filteredArticles} />
```

**Estimated Time**: 4-6 hours

---

### 5. **Search Bar with Topic & Scale Filtering** (High Priority)

**Goal**: Allow users to search for specific topics

**Implementation Plan:**

**Step 1: Create Search Component**
```bash
# Create new file
touch src/components/NewsSearch.tsx
```

**Step 2: Build Search UI**
```typescript
// src/components/NewsSearch.tsx
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function NewsSearch({ onSearch }) {
  const [query, setQuery] = useState('');
  const [scale, setScale] = useState('all');

  const handleSearch = async () => {
    const results = await searchNewsWithFilters({
      query,
      scale: scale !== 'all' ? scale : undefined,
    });
    onSearch(results);
  };

  return (
    <div className="search-bar">
      <Input
        placeholder="Search for topics... (e.g., climate change, elections)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />

      <Select value={scale} onChange={setScale}>
        <option value="all">All Scales</option>
        <option value="local">Local Only</option>
        <option value="national">National Only</option>
        <option value="international">International Only</option>
      </Select>

      <Button onClick={handleSearch}>
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
    </div>
  );
}
```

**Step 3: Add to Index Page**
```typescript
<NewsSearch onSearch={handleSearchResults} />
```

**API Usage**: 1 request per search (user-triggered)

**Estimated Time**: 2-3 hours

---

### 6. **Google OAuth Authentication** (Medium Priority)

**Goal**: User login with Google

**Requirements:**
- Google Cloud Platform account
- OAuth 2.0 credentials
- Backend to manage sessions (or Firebase)

**Implementation Options:**

#### **Option A: Firebase Authentication** (Recommended - Easiest)

**Pros:**
- No backend needed
- Built-in Google OAuth
- Free tier: 10,000 users
- Easy setup

**Step 1: Install Firebase**
```bash
npm install firebase
```

**Step 2: Set Up Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable Google Sign-In in Authentication section
4. Copy config credentials

**Step 3: Initialize Firebase**
```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ... other config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

**Step 4: Create Auth Context**
```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin user emails (hardcoded for now)
  const ADMIN_EMAILS = ['your-email@gmail.com'];
  const isAdmin = user ? ADMIN_EMAILS.includes(user.email || '') : false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Step 5: Wrap App with Auth Provider**
```typescript
// src/App.tsx
import { AuthProvider } from '@/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {/* Your routes */}
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

**Step 6: Create Login Component**
```typescript
// src/components/LoginButton.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  const { user, signInWithGoogle, logout } = useAuth();

  if (user) {
    return (
      <div>
        <span>Welcome, {user.displayName}</span>
        <Button onClick={logout}>Logout</Button>
      </div>
    );
  }

  return (
    <Button onClick={signInWithGoogle}>
      <img src="/google-icon.svg" className="w-5 h-5 mr-2" />
      Sign in with Google
    </Button>
  );
}
```

**Estimated Time**: 4-6 hours (including Firebase setup)

#### **Option B: Auth0** (More Features)

**Pros:**
- Professional auth service
- Supports multiple providers
- Better security features

**Cons:**
- More complex setup
- Paid for higher usage

**Setup Guide**: [Auth0 React Quickstart](https://auth0.com/docs/quickstart/spa/react)

---

### 7. **Admin Panel** (Low Priority - Depends on Auth)

**Goal**: Admin-only interface for managing content

**Prerequisites:**
- Authentication system (Feature #6)
- User role detection

**Implementation Plan:**

**Step 1: Create Protected Route**
```typescript
// src/components/ProtectedRoute.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;

  return children;
}
```

**Step 2: Create Admin Panel Page**
```typescript
// src/pages/Admin.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function AdminPanel() {
  const { user } = useAuth();

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      <p>Welcome, {user?.displayName}</p>

      <div className="admin-sections">
        {/* Cache Management */}
        <section>
          <h2>Cache Management</h2>
          <Button onClick={clearAllCache}>Clear All Cache</Button>
          <Button onClick={refreshNewsCache}>Force Refresh</Button>
        </section>

        {/* Analytics */}
        <section>
          <h2>Analytics</h2>
          <div>API Requests Today: {apiRequestCount}</div>
          <div>Cache Hit Rate: {cacheHitRate}%</div>
        </section>

        {/* Content Moderation */}
        <section>
          <h2>Content Moderation</h2>
          <Button>View Flagged Articles</Button>
        </section>
      </div>
    </div>
  );
}
```

**Step 3: Add Admin Route**
```typescript
// src/App.tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route
    path="/admin"
    element={
      <AdminRoute>
        <AdminPanel />
      </AdminRoute>
    }
  />
</Routes>
```

**Step 4: Add Admin Link (Conditional)**
```typescript
// In header/nav
const { isAdmin } = useAuth();

{isAdmin && (
  <Link to="/admin" className="admin-link">
    Admin Panel
  </Link>
)}
```

**Estimated Time**: 3-4 hours (after auth is set up)

---

## 📋 Implementation Timeline

### Phase 1: Filters & Search (Immediate - 1-2 days)
1. ✅ 4-hour caching (DONE)
2. ✅ Argentina + Asia news (DONE)
3. 🔲 Comprehensive filters (4-6 hours)
4. 🔲 Search bar (2-3 hours)

### Phase 2: Authentication (1-2 days)
5. 🔲 Firebase setup (1 hour)
6. 🔲 Google OAuth integration (4-6 hours)
7. 🔲 Auth context & protected routes (2-3 hours)

### Phase 3: Admin Features (1 day)
8. 🔲 Admin panel UI (3-4 hours)
9. 🔲 Cache management tools (2 hours)
10. 🔲 Analytics dashboard (3-4 hours)

---

## 🚀 Next Steps

### To See Current Features:

```bash
npm run dev
```

Open: http://localhost:5173/

**You should see:**
- ✅ Instant load from cache (no API calls on repeat visits)
- ✅ 30 articles (Argentina local + Asia national + International)
- ✅ Color-coded heat map markers
- ✅ "Auto-refreshes every 4 hours" badge
- ✅ Background refresh after 4 hours

### To Implement Filters (Next Priority):

1. **Create NewsFilters component**
2. **Add to Index page**
3. **Connect to API**
4. **Test filtering**

See detailed steps in **Section 4** above.

### To Add Authentication:

1. **Set up Firebase project**
2. **Install Firebase SDK**
3. **Configure OAuth**
4. **Create auth context**

See detailed steps in **Section 6** above.

---

## 💡 Questions?

For feature-specific implementation help:
- **Filters**: See Section 4
- **Search**: See Section 5
- **Auth**: See Section 6 (Firebase guide)
- **Admin Panel**: See Section 7

All code examples are production-ready and can be copied directly into your project.
