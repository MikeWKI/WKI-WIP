# Render Deployment Guide - WKI-WIP

## 🚀 Deploying to Render

This guide will help you deploy both the frontend and backend to Render.

---

## 📋 Prerequisites

1. ✅ GitHub account
2. ✅ Render account (free tier works!)
3. ✅ MongoDB Atlas connection string
4. ✅ Code pushed to GitHub

---

## 🌐 Deployment Architecture

Your app will have TWO services on Render:

1. **Backend API** (`wki-wip-api`)
   - Node.js web service
   - Connects to MongoDB Atlas
   - Runs Express server
   - URL: `https://wki-wip-api.onrender.com`

2. **Frontend** (`wki-wip`)
   - Static site (React app)
   - Connects to backend API
   - URL: `https://wki-wip.onrender.com`

---

## 📝 Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Add MongoDB backend and full-stack deployment config"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR-USERNAME/wki-wip.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy Backend API on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select `wki-wip` repository

#### Configure Backend Service:

- **Name**: `wki-wip-api`
- **Region**: Oregon (or closest to you)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build:server`
- **Start Command**: `node dist-server/server/index.js`
- **Plan**: Free

#### Environment Variables (Click "Advanced" → "Add Environment Variable"):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1` |
| `PORT` | `10000` |

5. Click **"Create Web Service"**
6. Wait 3-5 minutes for deployment
7. You should see: ✅ "Live" badge
8. Note your backend URL (e.g., `https://wki-wip-api.onrender.com`)

#### Test Backend:
Visit `https://wki-wip-api.onrender.com/api/health` - you should see:
```json
{
  "status": "OK",
  "message": "WKI-WIP API is running",
  "mongodb": "Connected"
}
```

---

### Step 3: Deploy Frontend on Render

1. Go back to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Static Site"**
3. Connect the same GitHub repository
4. Select `wki-wip` repository

#### Configure Frontend Service:

- **Name**: `wki-wip`
- **Region**: Oregon (same as backend)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

#### Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://wki-wip-api.onrender.com/api` |

**⚠️ IMPORTANT**: Replace `wki-wip-api` with YOUR actual backend service name!

5. Click **"Create Static Site"**
6. Wait 3-5 minutes for deployment
7. You should see: ✅ "Live" badge

---

### Step 4: Test Your Deployed App! 🎉

1. Visit your frontend URL: `https://wki-wip.onrender.com`
2. You should see the splash screen
3. Try adding a repair order
4. Refresh the page - data should persist!
5. Open in another device - same data!

---

## 🔧 Troubleshooting

### Backend Issues:

**Problem**: "Deploy failed" or "Build failed"
- Check build logs in Render dashboard
- Verify MongoDB connection string is correct
- Ensure all environment variables are set

**Problem**: Backend shows "Disconnected" in health check
- Double-check MONGODB_URI in environment variables
- Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Check MongoDB Atlas user has read/write permissions

### Frontend Issues:

**Problem**: Frontend can't connect to backend
- Verify `VITE_API_URL` points to correct backend URL
- Check backend is actually running (visit health endpoint)
- Look at browser console for CORS errors

**Problem**: "Failed to fetch orders"
- Backend might be sleeping (free tier spins down after 15 min)
- Wait 30-60 seconds for backend to wake up
- Check backend logs in Render dashboard

---

## 💡 Important Notes

### Free Tier Limitations:
- **Backend spins down after 15 minutes** of inactivity
- First request after spindown takes ~30-60 seconds
- 750 hours/month free (enough for one service 24/7)

### Auto-Deploy:
- Any push to `main` branch triggers automatic redeployment
- Both services rebuild automatically

### Custom Domains:
- Can add custom domain in Render settings (free)
- Example: `wip.wkitrucks.com`

---

## 🔒 Security Best Practices

### MongoDB Atlas Network Access:
1. Go to MongoDB Atlas → Network Access
2. Add Render IPs or allow all (0.0.0.0/0) for simplicity
3. Keep your connection string secret!

### Environment Variables:
- **Never commit** `.env` files to git (already in .gitignore ✅)
- Set secrets in Render dashboard, not in `render.yaml`
- Rotate MongoDB password periodically

---

## 📊 Monitoring Your Deployment

### Render Dashboard:
- View logs: Click service → "Logs" tab
- Check metrics: CPU, memory, bandwidth
- Set up notifications: Email alerts for failures

### MongoDB Atlas:
- Monitor database size
- Check connection count
- Review slow queries

---

## 🔄 Updating Your Deployment

### To Deploy Changes:

```bash
# Make your changes
git add .
git commit -m "Your change description"
git push

# Render auto-deploys! Wait 3-5 minutes
```

### Manual Redeploy:
1. Go to Render dashboard
2. Click service → "Manual Deploy" → "Deploy latest commit"

---

## 🎯 Your Live URLs

After deployment, you'll have:

- **Frontend**: `https://wki-wip.onrender.com`
- **Backend API**: `https://wki-wip-api.onrender.com/api`
- **Health Check**: `https://wki-wip-api.onrender.com/api/health`

Share the frontend URL with your team! 🎉

---

## 📱 Adding to Home Screen (Mobile)

Users can add the app to their phone home screen:

1. Open frontend URL in mobile browser
2. **iOS**: Tap Share → "Add to Home Screen"
3. **Android**: Tap Menu → "Add to Home screen"

Works like a native app!

---

## ✅ Deployment Checklist

Before going live:

- [ ] Backend deployed and showing "Live"
- [ ] Backend health check returns "Connected"
- [ ] Frontend deployed and showing "Live"
- [ ] Can add/edit/delete repair orders
- [ ] Data persists after refresh
- [ ] Works on mobile devices
- [ ] Multiple users can see same data
- [ ] MongoDB Atlas connection is stable

---

## 🆘 Need Help?

Common commands:

```bash
# Check if backend is running locally
npm run dev:server

# Check if frontend works with local backend
npm run dev:all

# Build for production (test before deploying)
npm run build
npm run build:server
```

---

## 🎊 You're All Set!

Your WKI-WIP app is now deployed and accessible from anywhere! 

**Next Steps**:
- Share the URL with your team
- Add more repair orders
- Consider upgrading to paid tier for 24/7 uptime (backend won't sleep)

Good luck! 🚀
