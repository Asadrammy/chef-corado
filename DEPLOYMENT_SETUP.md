# 🚀 Render Deployment Setup Guide

## 1. DATABASE_URL - Render PostgreSQL Setup

### Steps:
1. Go to Render Dashboard → New → PostgreSQL
2. Choose plan (Free tier available)
3. Create database
4. Copy connection URL from database dashboard

### Example Format:
```
DATABASE_URL=postgresql://render_user:AbCdEf123456@postgres.render.com:5432/chef_marketplace
```

### What to do:
- Copy the exact URL from your Render PostgreSQL dashboard
- Replace the placeholder in your env variables

---

## 2. NEXTAUTH_URL - Your Render App URL

### Steps:
1. Deploy your app to Render first
2. Get your app URL from Render dashboard
3. Replace `your-app-name` with actual URL

### Example:
```
NEXTAUTH_URL=https://chef-marketplace-xyz.onrender.com
```

### What to do:
- After deploying, your app gets a URL like `https://your-app-name.onrender.com`
- Use this exact URL for NEXTAUTH_URL

---

## 3. STRIPE_KEYS - Live Stripe Setup

### Steps:
1. Go to Stripe Dashboard → Developers → API keys
2. Toggle to "Live mode" (not test mode)
3. Copy your keys

### Example Format:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### Webhook Setup:
1. In Stripe Dashboard → Webhooks → Add endpoint
2. Endpoint URL: `https://your-app-name.onrender.com/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the signing secret

### What to do:
- Get your LIVE keys (not test keys)
- Set up webhook endpoint
- Copy all three values

---

## 4. CLOUDINARY - Image Storage Setup

### Steps:
1. Go to Cloudinary.com → Sign up (free)
2. Get credentials from Dashboard

### Example Format:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET_HERE
```

### What to do:
- Create free Cloudinary account
- Copy cloud name, API key, and API secret from dashboard

---

## 🎯 FINAL ENVIRONMENT VARIABLES EXAMPLE

Replace ALL placeholders with your actual values:

```bash
DATABASE_URL=postgresql://render_user:AbCdEf123456@postgres.render.com:5432/chef_marketplace
NEXTAUTH_URL=https://chef-marketplace-xyz.onrender.com
NEXTAUTH_SECRET=4WQYmU86W++f:&A9UN+v@0?1!p+ucSR]
NODE_ENV=production
ENVIRONMENT=production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET_HERE
API_TIMEOUT_MS=30000
MAX_REQUEST_SIZE=10mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://chef-marketplace-xyz.onrender.com
ALLOWED_ORIGINS=https://chef-marketplace-xyz.onrender.com
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
```

## ⚠️ IMPORTANT NOTES

1. **Never commit secrets to Git**
2. **Use LIVE Stripe keys for production**
3. **Set up webhooks in Stripe after deployment**
4. **Test all payment flows after deployment**

## 🔧 DEPLOYMENT ORDER

1. Create PostgreSQL database on Render
2. Create Cloudinary account
3. Set up Stripe account and get live keys
4. Deploy app to Render
5. Add environment variables to Render
6. Set up Stripe webhook
7. Test the deployed app
