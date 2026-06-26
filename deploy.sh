#!/bin/bash
# ScreamRoom — One-click Vercel deploy
# Run: bash deploy.sh YOUR_VERCEL_TOKEN

set -e
TOKEN=${1:-$VERCEL_TOKEN}

if [ -z "$TOKEN" ]; then
  echo "Usage: bash deploy.sh YOUR_VERCEL_TOKEN"
  echo "Get your token from: https://vercel.com/account/tokens"
  exit 1
fi

echo "🔗 Linking to Vercel..."
vercel link --yes --token "$TOKEN"

echo "🔑 Setting environment variables..."
echo "https://dvlykbunjlwzoqgtdgpn.supabase.co" | vercel env add VITE_SUPABASE_URL production --token "$TOKEN" --yes 2>/dev/null || true
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bHlrYnVuamx3em9xZ3RkZ3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTUwNjUsImV4cCI6MjA5MTk5MTA2NX0.lsyEpmOmAsjZDE2F8ZMIkITA67IVFBVDh2WiLlNjGkU" | vercel env add VITE_SUPABASE_ANON_KEY production --token "$TOKEN" --yes 2>/dev/null || true

echo "🚀 Deploying..."
vercel deploy --prod --token "$TOKEN"

echo "✅ ScreamRoom is live!"
