# GitHub Actions Deployment Control Setup Guide
*Fix the 24+ concurrent deployments chaos*

## 🚨 Current Problem
You currently have **24 concurrent Vercel deployments** running simultaneously, causing:
- Resource waste
- Deployment conflicts
- Unpredictable production state
- Potential data corruption

## ✅ Solution: GitHub Actions with Concurrency Control

### Step 1: Enable GitHub Actions in Repository

1. **Go to your GitHub repository**
   ```
   https://github.com/[your-username]/KINN
   ```

2. **Navigate to Settings**
   - Click on "Settings" tab in the repository
   - Scroll down to "Actions" → "General" in the left sidebar

3. **Enable Actions**
   - Select: "Allow all actions and reusable workflows"
   - Click "Save"

### Step 2: Set Up Repository Secrets

1. **Go to Settings → Secrets and variables → Actions**

2. **Click "New repository secret"** and add these secrets:

   **Secret 1: VERCEL_TOKEN**
   - Name: `VERCEL_TOKEN`
   - Value: Get from https://vercel.com/account/tokens
   - Click "Add secret"

   **Secret 2: VERCEL_ORG_ID**
   - Name: `VERCEL_ORG_ID`
   - Value: Get from `.vercel/project.json` in your local project:
     ```bash
     cat .vercel/project.json | grep orgId
     ```
   - Click "Add secret"

   **Secret 3: VERCEL_PROJECT_ID**
   - Name: `VERCEL_PROJECT_ID`
   - Value: Get from `.vercel/project.json`:
     ```bash
     cat .vercel/project.json | grep projectId
     ```
   - Should be something like: `prj_xxxxxxxxxxxxx`
   - Click "Add secret"

### Step 3: Verify Workflow File Exists

Check that `.github/workflows/deploy.yml` exists with this content:

```yaml
name: Production Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:

# THIS IS THE KEY: Only one deployment at a time!
concurrency:
  group: production-deployment
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Production
        run: |
          deployment_url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "Deployed to: $deployment_url"

      - name: Comment on Commit
        uses: actions/github-script@v6
        if: github.event_name == 'push'
        with:
          script: |
            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: '✅ Deployed to production'
            })
```

### Step 4: Test the Workflow

1. **Make a small change to trigger deployment**
   ```bash
   echo "# Deployment test" >> README.md
   git add README.md
   git commit -m "test: GitHub Actions deployment"
   git push origin main
   ```

2. **Watch the Action run**
   - Go to the "Actions" tab in your GitHub repository
   - You should see "Production Deployment" workflow running
   - Click on it to see real-time logs

3. **Verify single deployment**
   - If you push again while it's running, the first one will be cancelled
   - Only one deployment runs at a time

### Step 5: Disable Direct Vercel CLI Deployments

To prevent accidental manual deployments bypassing the workflow:

1. **Update your local environment**
   ```bash
   # Create a deployment script
   cat > deploy.sh << 'EOF'
   #!/bin/bash
   echo "⚠️  Direct deployment disabled!"
   echo "Please push to GitHub instead:"
   echo "  git push origin main"
   echo ""
   echo "GitHub Actions will handle the deployment."
   EOF

   chmod +x deploy.sh
   ```

2. **Add to `.gitignore`** (if not already there)
   ```bash
   echo "deploy.sh" >> .gitignore
   ```

### Step 6: Monitor Deployment Status

1. **GitHub Actions Dashboard**
   - URL: `https://github.com/[your-username]/KINN/actions`
   - Shows all deployments with status

2. **Vercel Dashboard**
   - URL: `https://vercel.com/dashboard`
   - Should show orderly, sequential deployments

3. **Set up notifications (optional)**
   - Go to GitHub Settings → Notifications
   - Enable "Actions" notifications for failures

### Step 7: Clean Up Current Chaos

Since you have 24 deployments running:

1. **Cancel all current deployments in Vercel**
   ```bash
   # Go to Vercel dashboard
   # Click on your project
   # Go to "Deployments" tab
   # Cancel all "Building" deployments except the latest
   ```

2. **Or wait for them to timeout** (they'll fail after ~10 minutes)

### Step 8: Verify Everything Works

After setup, your deployment flow will be:

```
Code Change → Git Push → GitHub Actions → Single Deployment → Production
                             ↑
                    Concurrency Control
                    (Cancels duplicates)
```

## 🎯 Benefits After Implementation

### Before (Current Chaos)
- 24+ concurrent deployments
- Random production state
- Resource waste
- No deployment history

### After (With GitHub Actions)
- Max 1 deployment at a time
- Predictable deployments
- Clear deployment history
- Automatic cancellation of outdated deployments

## 🔧 Troubleshooting

### "Workflow not running"
- Check: Is GitHub Actions enabled in Settings?
- Check: Is the workflow file in `.github/workflows/deploy.yml`?
- Check: Are you pushing to the `main` branch?

### "Deployment failed: Invalid token"
- Regenerate Vercel token at https://vercel.com/account/tokens
- Update the `VERCEL_TOKEN` secret in GitHub

### "Project not found"
- Verify `VERCEL_PROJECT_ID` matches your `.vercel/project.json`
- Ensure the project exists in your Vercel account

### "Still seeing multiple deployments"
- Check Vercel webhook settings
- Disable Git integration in Vercel project settings
- Only deploy via GitHub Actions

## 📊 Success Indicators

You'll know it's working when:
1. ✅ Actions tab shows single running workflow
2. ✅ Vercel shows sequential (not parallel) deployments
3. ✅ Push during deployment cancels the old one
4. ✅ Deployments complete in ~2-3 minutes
5. ✅ No more timeout errors

## 🚀 Next Steps

Once this is working:
1. Add staging environment workflow
2. Add automated tests before deployment
3. Add deployment notifications to Slack/Discord
4. Implement rollback capabilities

## 📝 Quick Reference

**Check current deployments:**
```bash
curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  https://api.vercel.com/v6/deployments?projectId=YOUR_PROJECT_ID
```

**Manual trigger from GitHub:**
- Go to Actions → Production Deployment → Run workflow

**Emergency stop:**
- Go to Actions → Click running workflow → Cancel workflow

---

This setup will immediately solve your deployment chaos. No more 24 concurrent deployments!