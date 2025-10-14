# 🚀 RENDER DEPLOYMENT - STEP BY STEP

## ✅ GitHub Push Complete!
Your code is now at: https://github.com/MikeWKI/WKI-WIP

---

## 📋 NEXT STEPS: Deploy to Render

### STEP 1: Deploy Backend API (5-10 minutes)

1. **Go to Render:** https://render.com
   - Sign in (or create account with GitHub)

2. **Create New Web Service:**
   - Click **"New +"** button (top right)
   - Select **"Web Service"**

3. **Connect Repository:**
   - Select **"MikeWKI/WKI-WIP"** from list
   - Click **"Connect"**

4. **Configure Service:**
   ```
   Name:              wki-wip-api
   Region:            Oregon (US West)
   Branch:            main
   Runtime:           Node
   Build Command:     npm install && npm run build:server
   Start Command:     node dist-server/index.js
   Instance Type:     Free
   ```

5. **Add Environment Variables:**
   Click **"Advanced"** → **"Add Environment Variable"**
   
   Add these THREE variables:
   ```
   Variable 1:
   Key:   NODE_ENV
   Value: production
   
   Variable 2:
   Key:   MONGODB_URI
   Value: mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1
   
   Variable 3:
   Key:   PORT
   Value: 10000
   ```

6. **Create Web Service:**
   - Click **"Create Web Service"** button
   - Wait 5-10 minutes for deployment
   - Look for "Live" status (green dot)

7. **Copy Backend URL:**
   - It will be like: `https://wki-wip-api.onrender.com`
   - **SAVE THIS URL** - you need it for Step 2!

8. **Test Backend:**
   - Open: `https://wki-wip-api.onrender.com/api/health`
   - Should see: `{"status":"healthy","timestamp":"..."}`

---

### STEP 2: Deploy Frontend Static Site (3-5 minutes)

1. **Create New Static Site:**
   - Click **"New +"** button
   - Select **"Static Site"**

2. **Connect Same Repository:**
   - Select **"MikeWKI/WKI-WIP"** again
   - Click **"Connect"**

3. **Configure Site:**
   ```
   Name:              wki-wip
   Branch:            main
   Build Command:     npm install && npm run build
   Publish Directory: dist
   ```

4. **Add Environment Variable:**
   Click **"Advanced"** → **"Add Environment Variable"**
   
   ```
   Key:   VITE_API_URL
   Value: https://wki-wip-api.onrender.com/api
   ```
   
   ⚠️ **IMPORTANT:** Use YOUR actual backend URL from Step 1.7!

5. **Create Static Site:**
   - Click **"Create Static Site"** button
   - Wait 3-5 minutes for deployment
   - Look for "Live" status

6. **Get Frontend URL:**
   - It will be like: `https://wki-wip.onrender.com`
   - Click the URL to open your app!

---

## 🎯 STEP 3: Test Your Production App

1. **Open your frontend URL**
   - Should see fuel gauge splash screen (2 seconds)
   - Then main app loads

2. **Add Test Repair Order:**
   - Click **"New RO"** button
   - Fill in:
     - Customer: Test Customer
     - Unit: 12345
     - R.O.: RO-001
     - Bay: 1
   - Click **"Add Repair Order"**

3. **Verify Data Persists:**
   - Refresh the page (F5)
   - Test order should still be there
   - Data is in MongoDB Atlas!

4. **Test All Features:**
   - ✓ Edit an order (click on it)
   - ✓ Delete an order
   - ✓ Search functionality
   - ✓ Dark/Light mode toggle
   - ✓ Archive months in sidebar

---

## 🔧 Troubleshooting

### Backend Deploy Failed?
- **Check logs:** Render Dashboard → wki-wip-api → Logs
- **Verify:** All 3 environment variables are set
- **Verify:** MONGODB_URI has no extra spaces
- **Try:** Manual Deploy (Deploy → "Clear build cache & deploy")

### Frontend Can't Connect?
- **Check:** VITE_API_URL points to correct backend URL
- **Check:** Backend is "Live" (green dot)
- **Test:** Backend health endpoint works
- **Fix:** If wrong URL, update env var and redeploy frontend

### Backend Takes 30-60 Seconds First Time?
- **This is normal!** Free tier spins down after 15 min inactivity
- Subsequent requests will be fast
- Upgrade to paid tier ($7/month) for always-on

### Data Not Saving?
- **Check:** MongoDB Atlas → Network Access → 0.0.0.0/0 is allowed
- **Check:** Database credentials are correct
- **Check:** Browser console for errors (F12)

---

## 📝 After Successful Deployment

Your production URLs will be:
- **Frontend:** `https://wki-wip.onrender.com`
- **Backend API:** `https://wki-wip-api.onrender.com`
- **MongoDB:** Already configured in Atlas

### Update README with Production URLs

Share these with your team:
- App URL: `https://wki-wip.onrender.com`
- For authorized WKI personnel only

---

## 🔄 Making Updates Later

```bash
# Make your code changes
git add .
git commit -m "Description of changes"
git push

# Render automatically rebuilds and redeploys!
# Wait 3-5 minutes for changes to go live
```

---

## 🎉 Success Checklist

- [ ] Backend deployed successfully
- [ ] Backend health check returns OK
- [ ] Frontend deployed successfully  
- [ ] Can access frontend URL
- [ ] Splash screen shows
- [ ] Can add new repair order
- [ ] Data persists after refresh
- [ ] Can edit orders
- [ ] Can delete orders
- [ ] Search works
- [ ] Dark mode toggle works

---

**Need Help?** Check the logs in Render Dashboard or review DEPLOYMENT_GUIDE.md
