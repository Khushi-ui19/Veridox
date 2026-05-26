# 🚀 Deployment Instructions - Brevo Email Migration

## ⚠️ Current Issue

Your production server at `https://68.183.83.161.nip.io` is still running the **old SMTP code**, which is causing the 500 error because:
- DigitalOcean blocks SMTP ports (25, 587)
- The old `JavaMailSender` dependency is trying to connect and failing

## ✅ Solution: Deploy New Code with Brevo

### Step 1: Get Brevo API Key

1. Sign up at https://app.brevo.com/account/register
2. Go to **Settings → SMTP & API → API Keys**
3. Create new API key named "Veridox Production"
4. Copy the key (starts with `xkeysib-...`)

### Step 2: Update Production Configuration

SSH into your DigitalOcean server and update the configuration:

```bash
# SSH into server
ssh root@68.183.83.161

# Navigate to project
cd /path/to/Veridox

# Edit application.properties
nano src/main/resources/application.properties
```

Replace this line:
```properties
brevo.api.key=YOUR_BREVO_API_KEY_HERE
```

With your actual key:
```properties
brevo.api.key=xkeysib-abc123your-actual-key-here
```

**Also verify sender email is set:**
```properties
app.email.sender=animeshj425@gmail.com
app.email.sender.name=Veridox
```

### Step 3: Rebuild and Restart

```bash
# Clean and rebuild with new dependencies
./mvnw clean install

# Restart the Spring Boot application
# (Method depends on how you're running it)

# If using systemd:
sudo systemctl restart veridox

# If using screen/tmux:
# Kill old process and start new one
pkill -f "java.*Veridox"
./mvnw spring-boot:run &

# If using Docker:
docker-compose down
docker-compose up -d --build
```

### Step 4: Verify Deployment

1. Check logs for startup errors:
```bash
tail -f /var/log/veridox.log
# or
journalctl -u veridox -f
```

2. Look for this message:
```
✅ Email sent to [email] via Brevo in thread: ...
```

3. Test OAuth2 login at: https://68.183.83.161.nip.io/login

### Step 5: Verify Sender Email in Brevo

**Important:** Before emails will send, you must verify your sender email in Brevo:

1. Go to Brevo Dashboard → **Senders & IP** → **Senders**
2. Add `animeshj425@gmail.com`
3. Check your Gmail for verification email from Brevo
4. Click the verification link

---

## 🔍 Troubleshooting

### Error: "Email service not configured"
- Brevo API key is missing or still set to `YOUR_BREVO_API_KEY_HERE`
- Update `application.properties` with real key

### Error: "Unauthorized" from Brevo
- API key is incorrect
- Check for extra spaces or quotes in the key

### Error: "Sender not verified"
- Verify your sender email in Brevo dashboard
- Wait 5-10 minutes after verification

### Still getting 500 errors?
Check server logs:
```bash
# View last 100 lines
tail -n 100 /var/log/veridox.log

# Or if using journalctl
journalctl -u veridox -n 100
```

Look for stack traces mentioning:
- `JavaMailSender` (means old code is still running)
- `Brevo` or `sendinblue` (means new code is running)
- `Failed to send email` (check API key and sender verification)

---

## 📊 Post-Deployment Checklist

- [ ] Brevo API key configured in `application.properties`
- [ ] Sender email verified in Brevo dashboard
- [ ] Application rebuilt with `./mvnw clean install`
- [ ] Application restarted
- [ ] OAuth2 login works without 500 error
- [ ] Registration OTP emails arrive
- [ ] Password reset emails arrive

---

## 🔄 Quick Rollback (Emergency)

If Brevo isn't working and you need to rollback temporarily:

```bash
# Revert to previous commit
git log --oneline  # Find commit before Brevo changes
git checkout <commit-hash>

# Rebuild
./mvnw clean install

# Restart
sudo systemctl restart veridox
```

**Note:** This will restore SMTP, which still won't work on DigitalOcean. Better to fix Brevo configuration.
