# KINN-RADAR Vercel Environment Variables

## 📋 Ready to Copy-Paste

Copy each line below and add to Vercel Dashboard:
https://vercel.com/your-team/kinn/settings/environment-variables

### 1. RADAR_GROQ_API_KEY
```
[REDACTED - Already set in Vercel]
```

### 2. RADAR_GOOGLE_SHEET_ID
```
1grvzmQ_oGpfIMCK68Ctx0Nr3wjvE1jScuXad77xKK-s
```

### 3. GOOGLE_SERVICE_ACCOUNT_KEY
```
[REDACTED - Already set in Vercel]
```

### 4. ADMIN_SYNC_TOKEN
```
lf2pTHpUCobT1lpScNSvYTcMKM83fiKnNqQt2O0p/BE=
```

### 5. RESEND_WEBHOOK_SECRET
⚠️ **ACTION REQUIRED**: Get this from Resend Dashboard
1. Go to: https://resend.com/domains
2. Click on `in.kinn.at`
3. Navigate to "Webhooks" or "Inbound" section
4. Copy the webhook secret or generate one
5. Paste it here

---

## ✅ Already Existing (from KINN)

These should already be in your Vercel project:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## 📝 Checklist After Adding Variables

- [ ] All 5 new environment variables added to Vercel
- [ ] Google Sheet shared with `kinn-radar-sync@kinn-radar.iam.gserviceaccount.com`
- [ ] Resend webhook configured to `https://kinn.at/api/radar/inbound`
- [ ] Test with: `curl https://kinn.at/api/radar/health`

---

## 🔒 Security Note

Keep these credentials secure:
- Never commit them to Git
- The `GOOGLE_SERVICE_ACCOUNT_KEY_FOR_VERCEL.txt` file should be deleted after use
- Rotate `ADMIN_SYNC_TOKEN` periodically