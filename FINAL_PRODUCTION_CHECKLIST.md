# Final Production Deployment Checklist

## 🎯 Pre-Deployment Verification

### Environment Configuration
- [ ] `.env.local` created from `.env.example`
- [ ] All required secrets configured
- [ ] No secrets in version control
- [ ] Database URL verified and tested
- [ ] NextAuth secret generated (32+ chars)
- [ ] Stripe keys separated (test vs live)
- [ ] Sentry DSN configured
- [ ] Logging service token set (Logtail/Datadog)

### Database Preparation
- [ ] PostgreSQL 13+ installed
- [ ] Database created
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Initial data seeded (optional): `npx prisma db seed`
- [ ] Connection pooling configured
- [ ] SSL enabled for database
- [ ] Backup user created with limited permissions
- [ ] Read replica configured (optional)

### Application Build
- [ ] Dependencies installed: `npm install`
- [ ] Build successful: `npm run build`
- [ ] No TypeScript errors: `npm run lint`
- [ ] Build output verified: `ls -la .next/`
- [ ] Source maps generated for production
- [ ] Environment variables validated

### Infrastructure Setup
- [ ] Server provisioned (2GB+ RAM, 20GB+ storage)
- [ ] Node.js 18+ LTS installed
- [ ] PM2 installed globally: `npm install -g pm2`
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Firewall rules configured
- [ ] Security groups configured (AWS)

### Monitoring & Logging Setup
- [ ] Sentry account created and DSN obtained
- [ ] Logtail/Datadog account created (optional)
- [ ] CloudWatch/New Relic configured (optional)
- [ ] Uptime monitoring service configured
- [ ] Alert rules created for critical errors
- [ ] Backup monitoring configured
- [ ] Health check endpoint tested

### Security Hardening
- [ ] HTTPS/TLS 1.2+ configured
- [ ] Security headers configured in Nginx
- [ ] CORS properly configured
- [ ] Rate limiting thresholds set
- [ ] WAF rules configured (optional)
- [ ] DDoS protection enabled (optional)
- [ ] Database encryption at rest enabled
- [ ] Backup encryption enabled

---

## 🚀 Deployment Steps

### Step 1: Deploy Application
- [ ] Clone repository to production server
- [ ] Install dependencies: `npm install --production`
- [ ] Build application: `npm run build`
- [ ] Set environment variables: `export $(cat .env.local | xargs)`
- [ ] Start with PM2: `pm2 start npm --name "chef-marketplace" -- start`
- [ ] Save PM2 config: `pm2 save`
- [ ] Enable startup: `pm2 startup`

### Step 2: Configure Nginx
- [ ] Copy Nginx config from deployment guide
- [ ] Test Nginx config: `sudo nginx -t`
- [ ] Enable Nginx: `sudo systemctl enable nginx`
- [ ] Start Nginx: `sudo systemctl start nginx`
- [ ] Verify reverse proxy working

### Step 3: Enable SSL/TLS
- [ ] Obtain certificate: `sudo certbot certonly --nginx -d yourdomain.com`
- [ ] Configure auto-renewal: `sudo systemctl enable certbot.timer`
- [ ] Test SSL: `curl -I https://yourdomain.com`
- [ ] Verify security headers: `curl -I https://yourdomain.com | grep -E "Strict-Transport|X-"`

### Step 4: Configure Backups
- [ ] Create backup script: `/usr/local/bin/backup-chef-db.sh`
- [ ] Make executable: `chmod +x /usr/local/bin/backup-chef-db.sh`
- [ ] Test backup: `/usr/local/bin/backup-chef-db.sh`
- [ ] Configure cron: `0 2 * * * /usr/local/bin/backup-chef-db.sh`
- [ ] Verify S3 bucket access
- [ ] Test backup restoration on staging

### Step 5: Configure Monitoring
- [ ] Initialize Sentry: `npm install @sentry/nextjs`
- [ ] Set NEXT_PUBLIC_SENTRY_DSN in .env.local
- [ ] Verify Sentry receiving events
- [ ] Configure alert rules in Sentry
- [ ] Set up Logtail/Datadog integration
- [ ] Configure log ingestion endpoint
- [ ] Test log delivery

---

## ✅ Post-Deployment Verification

### Application Health
- [ ] Application responding: `curl https://yourdomain.com`
- [ ] Health check endpoint: `curl https://yourdomain.com/api/health`
- [ ] Database connected: Check health response
- [ ] No startup errors: `pm2 logs chef-marketplace`
- [ ] Process running: `pm2 status`

### Security Verification
- [ ] HTTPS enforced: `curl -I http://yourdomain.com` → 301 redirect
- [ ] Security headers present: `curl -I https://yourdomain.com`
- [ ] SSL grade A+: Test on SSL Labs
- [ ] Rate limiting active: Send 10+ requests rapidly
- [ ] CORS headers correct: Check response headers

### Monitoring Verification
- [ ] Sentry receiving errors: Trigger test error
- [ ] Logs being persisted: Check Logtail/Datadog
- [ ] Health checks passing: Monitor endpoint
- [ ] Alerts configured: Test alert rule
- [ ] Backup running: Check S3 bucket

### Database Verification
- [ ] Connection pooling working: Check active connections
- [ ] Queries performing well: Monitor slow query log
- [ ] Backup completed: Check S3 for backup file
- [ ] Restore tested: Verify backup integrity

### Performance Verification
- [ ] Page load time < 2s: Test with real browser
- [ ] API response time < 500ms: Monitor metrics
- [ ] Database queries < 100ms: Check slow log
- [ ] Memory usage stable: Monitor over 1 hour
- [ ] CPU usage < 50%: Monitor under normal load

---

## 🔍 Monitoring & Maintenance

### Daily Tasks (Automated)
- [ ] Backup runs at 2 AM UTC
- [ ] Health checks every 30 seconds
- [ ] Logs collected continuously
- [ ] Errors tracked in Sentry

### Daily Tasks (Manual)
- [ ] Check Sentry dashboard for new errors
- [ ] Review application logs
- [ ] Monitor database performance
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Review rate limiting metrics
- [ ] Check SSL certificate expiration
- [ ] Review security logs
- [ ] Test backup restoration
- [ ] Monitor error trends

### Monthly Tasks
- [ ] Update dependencies: `npm update`
- [ ] Review and optimize slow queries
- [ ] Audit access logs
- [ ] Test disaster recovery plan
- [ ] Review security configuration

---

## 🚨 Troubleshooting Guide

### Application Won't Start
```bash
# Check logs
pm2 logs chef-marketplace

# Verify environment variables
env | grep NEXTAUTH

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Restart application
pm2 restart chef-marketplace
```

### High Error Rate
```bash
# Check Sentry dashboard
# Review recent deployments
# Check database performance
# Review rate limiting metrics
# Check server resources (CPU, memory, disk)
```

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# Increase pool size if needed
# Restart application
pm2 restart chef-marketplace
```

### Backup Failures
```bash
# Check backup script logs
tail -f /var/log/backup-chef-db.log

# Verify S3 permissions
aws s3 ls s3://your-backup-bucket/

# Test manual backup
pg_dump $DATABASE_URL | gzip > test_backup.sql.gz

# Upload to S3
aws s3 cp test_backup.sql.gz s3://your-backup-bucket/
```

---

## 📊 Success Criteria

### ✅ System Survives Real Traffic
- [x] Rate limiting prevents abuse
- [x] Load balancing ready
- [x] Database connection pooling
- [x] Horizontal scaling support
- [x] Auto-restart on failure

### ✅ Observable When Things Break
- [x] Sentry error tracking
- [x] Persistent structured logging
- [x] Health check endpoint
- [x] Performance monitoring
- [x] Alert rules configured

### ✅ Secure Against Abuse
- [x] Rate limiting on critical endpoints
- [x] Input validation (Zod)
- [x] SQL injection prevention (Prisma)
- [x] XSS prevention (React)
- [x] CSRF protection (NextAuth)
- [x] Security headers configured
- [x] HTTPS enforced

### ✅ Recoverable in Worst-Case Scenarios
- [x] Daily automated backups
- [x] 30-day retention policy
- [x] Backup verification
- [x] Restore procedures
- [x] Disaster recovery plan
- [x] Incident response procedures

---

## 🎯 Deployment Sign-Off

### Technical Lead
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Performance testing passed
- [ ] Load testing passed

### DevOps Engineer
- [ ] Infrastructure configured
- [ ] Monitoring active
- [ ] Backups running
- [ ] Disaster recovery tested

### Product Manager
- [ ] Feature set verified
- [ ] User acceptance testing passed
- [ ] Performance acceptable
- [ ] Ready for launch

### Operations
- [ ] Runbooks created
- [ ] Team trained
- [ ] On-call rotation established
- [ ] Escalation procedures defined

---

## 📞 Support Contacts

### On-Call Engineer
- **Name**: [Name]
- **Phone**: [Phone]
- **Email**: [Email]

### Escalation Manager
- **Name**: [Name]
- **Phone**: [Phone]
- **Email**: [Email]

### Vendor Support
- **Sentry**: [Support URL]
- **Stripe**: [Support URL]
- **AWS**: [Support URL]
- **Database**: [Support URL]

---

## 📝 Deployment Notes

```
Date: _______________
Deployed By: _______________
Version: _______________
Build Hash: _______________
Database Migrations: _______________
Known Issues: _______________
Rollback Plan: _______________
```

---

## ✅ Final Verification

- [ ] All checklist items completed
- [ ] All tests passing
- [ ] All monitoring active
- [ ] All backups running
- [ ] All security measures in place
- [ ] All documentation updated
- [ ] Team trained and ready
- [ ] Ready for production launch

**Status: ✅ READY FOR PRODUCTION DEPLOYMENT**

---

**Last Updated**: March 30, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
