# 🔊 ScreamRoom

> Shout it. Spill it. Then feel better.

A dopamine-hit stress relief platform where people can vent, gossip, and scream into the void — anonymously as a ghost 👻 or boldly as themselves 🔥.

---

## ✨ Features

- **Three modes** — Shout, Spill Tea (gossip), Vent
- **Ghost 👻 vs Real Me 🔥** — choose your identity per post
- **AI Vibe Analysis** — every post gets a mood score (0–100), tag, emoji & empathetic reply via Claude AI
- **AI Identity Verification** — signup uses AI to verify real humans, govt ID hashed & discarded
- **Live reaction wall** — emoji reactions, filter by type
- **Strict registration** — name, email, govt ID (hashed), DOB required to keep bots out
- **Playful UI** — animated ticker, floating confessions, shake-on-hover shout button

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Inline styles + Google Fonts (Syne + Space Grotesk) |
| AI | Anthropic Claude API (vibe analysis, ID verification) |
| Database | Supabase (Postgres + Realtime + RLS) |

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in your Supabase + Anthropic keys

# 3. Run the Supabase migration
# Open supabase/migration.sql in your Supabase SQL Editor and run it

# 4. Start the dev server
npm run dev
```

---

## 🗄 Supabase Setup

1. Create or activate a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migration.sql`
3. Copy your **Project URL** and **anon key** into `.env`
4. Enable **Realtime** on `posts` and `reactions` tables in the dashboard

The migration creates:
- `users` — verified accounts with hashed ID
- `posts` — shouts / tea / vents with ghost flag
- `reactions` — emoji reactions per post per user
- `dm_threads` + `dm_messages` — direct messages
- Row Level Security policies on all tables

---

## 🤖 AI Features

All AI runs through the **Anthropic Claude API**:

| Feature | What it does |
|---------|-------------|
| Post analysis | Scores vibe intensity, generates mood tag + empathetic reply |
| Identity verification | Reviews signup data, approves/rejects via AI judgment |
| Per-post AI reply | "🤖 AI vibe" button generates a witty/warm response |

> ⚠️ For production, move the Anthropic API calls to a Supabase Edge Function so your key isn't exposed client-side.

---

## 📁 Project Structure

```
screamroom/
├── src/
│   ├── App.jsx          # Main React app (all components)
│   └── main.jsx         # React entry point
├── supabase/
│   └── migration.sql    # Full DB schema + RLS + realtime
├── public/
│   └── index-static.html  # Static HTML prototype
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## 🔮 Roadmap

- [ ] Wire up Supabase real-time posts feed
- [ ] DM threads UI
- [ ] Trending wall (most reacted in 24h)
- [ ] Push notifications for reactions
- [ ] Mobile app (React Native)

---

## 🔐 Privacy

- Government IDs are SHA-256 hashed before any processing and **never stored in readable form**
- Ghost posts have zero link to user identity in the database
- No ads. No selling data. Ever.

---

Built with chaos and care. 🖤
