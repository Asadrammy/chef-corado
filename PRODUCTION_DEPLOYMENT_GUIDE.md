# Production Deployment Guide

## Overview

This guide covers deploying the Chef Marketplace platform to production with full monitoring, logging, rate limiting, backups, and security hardening.

---

## Pre-Deployment Checklist

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit with production values
nano .env.local
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Production domain
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `STRIPE_SECRET_KEY` - Live Stripe key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Live publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN

### 2. Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed

# Verify connection
npx prisma db execute --stdin < /dev/null
```

### 3. Dependencies Installation

```bash
# Install all dependencies
npm install

# Install production-specific packages
npm install @sentry/nextjs
npm install next-auth
npm install stripe
```

### 4. Build Verification

```bash
# Build for production
npm run build

# Verify build output
ls -la .next/

# Check for errors
npm run lint
```

---

## Deployment Steps

### Step 1: Prepare Infrastructure

**Database:**
- PostgreSQL 13+ with SSL enabled
- Automated daily backups configured
- Connection pooling enabled (PgBouncer recommended)

**Server:**
- Node.js 18+ LTS
- PM2 or similar process manager
- Nginx reverse proxy with SSL/TLS
- 2GB+ RAM, 20GB+ storage

**Monitoring:**
- Sentry account created and DSN configured
- CloudWatch/DataDog/New Relic account (optional)
- Uptime monitoring service

### Step 2: Deploy Application

```bash
# Clone repository
git clone <repo-url>
cd chef-marketplace

# Install dependencies
npm install --production

# Build application
npm run build

# Start with PM2
pm2 start npm --name "chef-marketplace" -- start
pm2 save
pm2 startup
```

### Step 3: Configure Nginx

```nginx
upstream app {
  server localhost:3000;
}

server {
  listen 80;
  server_name yourdomain.com www.yourdomain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com www.yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
  gzip_min_length 1000;

  location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # Health check endpoint
  location /api/health {
    proxy_pass http://app;
    access_log off;
  }
}
```

### Step 4: Enable SSL Certificate

```bash
# Using Let's Encrypt
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Step 5: Configure Monitoring

**Sentry Setup:**
```bash
# Initialize Sentry in application
npm install @sentry/nextjs

# Configure in lib/sentry.ts (already done)
# Set NEXT_PUBLIC_SENTRY_DSN in .env.local
```

**Health Check Endpoint:**
```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-03-30T...",
#   "uptime": 3600,
#   "database": { "status": "connected", "responseTime": "5ms" },
#   "environment": "production",
#   "version": "1.0.0"
# }
```

### Step 6: Configure Backups

**Automated Daily Backups:**
```bash
# Create backup script
cat > /usr/local/bin/backup-chef-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/chef-marketplace"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /usr/local/bin/backup-chef-db.sh

# Schedule with cron (2 AM daily)
0 2 * * * /usr/local/bin/backup-chef-db.sh
```

### Step 7: Configure Rate Limiting

Rate limiting is automatically applied to:
- `/api/auth/*` - 5 attempts per 15 minutes
- `/api/messages/*` - 50 requests per 15 minutes
- `/api/payments/*` - 20 requests per 15 minutes
- `/api/payouts/*` - 10 requests per 15 minutes
- `/api/search` - 30 requests per minute

### Step 8: Enable Logging

**Persistent Logging Setup:**

Option 1: Logtail (Recommended)
```bash
# Sign up at logtail.com
# Set LOGTAIL_TOKEN in .env.local
```

Option 2: Datadog
```bash
# Sign up at datadog.com
# Set DATADOG_API_KEY in .env.local
```

Option 3: Self-hosted ELK Stack
```bash
# Configure Elasticsearch, Logstash, Kibana
# Update log endpoint in lib/persistent-logger.ts
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check application health
curl https://yourdomain.com/api/health

# Check database connectivity
curl https://yourdomain.com/api/health | jq .database

# Monitor logs
tail -f /var/log/chef-marketplace/app.log
```

### 2. Security Verification

```bash
# Check SSL/TLS
curl -I https://yourdomain.com

# Verify security headers
curl -I https://yourdomain.com | grep -E "Strict-Transport|X-Content-Type|X-Frame"

# Check rate limiting
for i in {1..10}; do curl https://yourdomain.com/api/auth/login; done
```

### 3. Monitoring Setup

```bash
# Verify Sentry integration
# Go to Sentry dashboard and check for events

# Test error tracking
curl -X POST https://yourdomain.com/api/test-error

# Check logs
# Go to Logtail/Datadog dashboard
```

### 4. Backup Verification

```bash
# List backups
aws s3 ls s3://your-backup-bucket/

# Test restore (on staging)
pg_restore -d staging_db backup_latest.sql.gz
```

---

## Monitoring & Maintenance

### Daily Tasks

- [ ] Check Sentry for new errors
- [ ] Review application logs
- [ ] Monitor database performance
- [ ] Check backup completion

### Weekly Tasks

- [ ] Review rate limiting metrics
- [ ] Check SSL certificate expiration
- [ ] Review security logs
- [ ] Test backup restoration

### Monthly Tasks

- [ ] Update dependencies
- [ ] Review and optimize slow queries
- [ ] Audit access logs
- [ ] Test disaster recovery plan

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs chef-marketplace

# Verify environment variables
env | grep NEXTAUTH

# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

### High Error Rate

```bash
# Check Sentry dashboard
# Review recent deployments
# Check database performance
# Review rate limiting metrics
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
# Monitor active connections
# Increase pool size if needed
```

### Backup Failures

```bash
# Check backup script logs
tail -f /var/log/backup-chef-db.log

# Verify S3 permissions
aws s3 ls s3://your-backup-bucket/

# Test manual backup
pg_dump $DATABASE_URL | gzip > test_backup.sql.gz
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**
   - Use AWS ALB or Nginx load balancer
   - Configure sticky sessions for WebSocket support

2. **Database Scaling**
   - Read replicas for read-heavy operations
   - Connection pooling with PgBouncer

3. **Caching Layer**
   - Redis for session storage
   - CloudFront for static assets

### Vertical Scaling

- Increase server RAM and CPU
- Optimize database queries
- Enable query caching

---

## Security Hardening

### Network Security

- [ ] Enable VPC with private subnets
- [ ] Configure security groups
- [ ] Enable WAF (Web Application Firewall)
- [ ] DDoS protection enabled

### Application Security

- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Input validation enabled
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (React escaping)

### Data Security

- [ ] Database encryption at rest
- [ ] Encrypted backups
- [ ] Encrypted in transit (TLS)
- [ ] Secrets management (AWS Secrets Manager)

---

## Disaster Recovery

### Backup & Restore

1. **Daily Backups**
   - Automated at 2 AM UTC
   - Stored in S3 with 30-day retention
   - Tested weekly

2. **Restore Procedure**
   ```bash
   # Download backup
   aws s3 cp s3://your-backup-bucket/backup_latest.sql.gz .
   
   # Restore database
   gunzip -c backup_latest.sql.gz | psql $DATABASE_URL
   
   # Verify restoration
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users"
   ```

### Failover Plan

1. **Database Failover**
   - Primary-replica setup
   - Automatic failover with monitoring

2. **Application Failover**
   - Multiple instances behind load balancer
   - Health checks every 30 seconds
   - Auto-restart on failure

---

## Support & Escalation

### Critical Issues

- Application down: Page on-call engineer
- Database down: Immediate restore from backup
- Security breach: Activate incident response plan

### Contact Information

- On-call: [phone/email]
- Escalation: [manager contact]
- Vendor support: [vendor contacts]

---

## Appendix

### Useful Commands

```bash
# View application logs
pm2 logs chef-marketplace

# Restart application
pm2 restart chef-marketplace

# View database stats
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements LIMIT 10"

# Check disk space
df -h

# Monitor system resources
top
```

### References

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production Checklist](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-production)
- [Sentry Documentation](https://docs.sentry.io/)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

**Last Updated:** March 30, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
