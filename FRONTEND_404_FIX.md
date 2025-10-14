# 🔧 QUICK FIX: Frontend 404 Error

## Problem
Frontend shows error: `Failed to load resource: 404` when trying to fetch from:
```
https://wki-wip-api.onrender.com/orders
```

## Root Cause
The `VITE_API_URL` environment variable in Render is missing `/api` at the end.

**Current (Wrong):**
```
VITE_API_URL = https://wki-wip-api.onrender.com
```

**Should be:**
```
VITE_API_URL = https://wki-wip-api.onrender.com/api
```

---

## 🚀 How to Fix (2 minutes)

### Step 1: Update Environment Variable

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your **"wki-wip"** static site
3. Click **"Environment"** in the left sidebar
4. Find the `VITE_API_URL` variable
5. Click **"Edit"** (pencil icon)
6. Change the value to:
   ```
   https://wki-wip-api.onrender.com/api
   ```
   **⚠️ IMPORTANT: Make sure it ends with `/api`**
7. Click **"Save Changes"**

### Step 2: Redeploy Frontend

1. Still in the "wki-wip" service
2. Click **"Manual Deploy"** button (top right)
3. Select **"Clear build cache & deploy"**
4. Click **"Deploy"**
5. Wait 3-5 minutes for rebuild

---

## ✅ Verify Fix

After redeployment:

1. **Open your app:** `https://wki-wip.onrender.com`
2. **Check console:** Should have NO errors (F12 → Console)
3. **Test:** Click "New RO" and add a repair order
4. **Verify:** Data saves and persists after refresh

---

## 📋 Correct Environment Variables Checklist

### Backend (`wki-wip-api`)
```
✓ NODE_ENV = production
✓ MONGODB_URI = mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1
✓ PORT = 10000
```

### Frontend (`wki-wip`)
```
✓ VITE_API_URL = https://wki-wip-api.onrender.com/api
                                                    ^^^^
                                             Must include /api!
```

---

## 🔍 How to Check What's Currently Set

1. Go to Render Dashboard
2. Click "wki-wip" static site
3. Click "Environment"
4. Look at `VITE_API_URL` value
5. If it doesn't end with `/api`, update it!

---

## Why This Happens

- **Backend routes** are defined as: `/api/orders`, `/api/health`, etc.
- **Frontend code** appends `/orders` to the base URL
- If base URL is `https://wki-wip-api.onrender.com`, it tries: `https://wki-wip-api.onrender.com/orders` ❌
- If base URL is `https://wki-wip-api.onrender.com/api`, it tries: `https://wki-wip-api.onrender.com/api/orders` ✅

---

## Alternative: Check via Browser DevTools

1. Open your app: `https://wki-wip.onrender.com`
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for the error URL
5. If it shows `/orders` instead of `/api/orders`, update env var

---

**After fixing, your app will work perfectly!** 🎉
