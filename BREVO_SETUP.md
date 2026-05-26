# 📧 Brevo Email Setup Guide

## ✅ Migration Complete

Your application now uses **Brevo (Sendinblue)** instead of SMTP for sending OTP emails.

**Benefits:**
- ✅ 300 emails/day free forever
- ✅ Works on DigitalOcean (no port blocking)
- ✅ Better deliverability than Gmail SMTP
- ✅ Professional email infrastructure

---

## 🚀 Setup Steps

### 1. Create Brevo Account
1. Go to [https://app.brevo.com/account/register](https://app.brevo.com/account/register)
2. Sign up with your email
3. Verify your email address

### 2. Get API Key
1. Login to Brevo dashboard
2. Go to **Settings** → **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Name it: `Veridox Production`
5. Copy the API key (starts with `xkeysib-...`)

### 3. Verify Sender Email
1. Go to **Senders & IP** → **Senders**
2. Add your sender email: `animeshj425@gmail.com`
3. Verify it via the confirmation email Brevo sends

### 4. Update Configuration
Open `src/main/resources/application.properties` and replace:
```properties
brevo.api.key=YOUR_BREVO_API_KEY_HERE
```
With your actual API key:
```properties
brevo.api.key=xkeysib-abc123...
```

### 5. Rebuild & Deploy
```bash
./mvnw clean install
./mvnw spring-boot:run
```

---

## 🧪 Testing

Test OTP email delivery:
1. Register a new user
2. Check your email for the OTP
3. Verify the OTP works

**Check Brevo Dashboard:**
- Go to **Statistics** → **Email** to see delivery status
- Monitor daily quota usage (300/day limit)

---

## 📊 Monitoring

**Daily Limits:**
- Free tier: 300 emails/day
- Resets at midnight UTC

**If you exceed limits:**
- Upgrade to paid plan: €25/month for 20,000 emails
- Or use multiple Brevo accounts (not recommended)

---

## 🔧 Troubleshooting

**Error: "Unauthorized"**
- Check API key is correct in `application.properties`
- Ensure no extra spaces in the key

**Error: "Sender not verified"**
- Verify your sender email in Brevo dashboard
- Wait 5-10 minutes after verification

**Emails not arriving:**
- Check spam folder
- Verify sender email is verified in Brevo
- Check Brevo dashboard for delivery logs

---

## 🔄 Rollback (if needed)

If you need to revert to SMTP, restore these in `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
    <version>3.4.1</version>
</dependency>
```

And restore SMTP config in `application.properties`.
