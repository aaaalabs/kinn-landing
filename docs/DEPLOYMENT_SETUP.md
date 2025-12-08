# Deployment Setup Guide

## Stop Manual Deployments!

From now on, deployments should ONLY happen through GitHub Actions, not manual `vercel --prod` commands.

## Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

### 1. Get Vercel Token
```bash
# Create a token at: https://vercel.com/account/tokens
# Add as: VERCEL_TOKEN
```

### 2. Get Vercel IDs
```bash
# Run this in your project directory:
vercel link

# Then get the IDs:
cat .vercel/project.json

# Add these as secrets:
# VERCEL_ORG_ID = "orgId" value
# VERCEL_PROJECT_ID = "projectId" value
```

## How It Works

1. **Push to main** → Automatic deployment
2. **Concurrency control** → Only 1 deployment at a time
3. **Cancel in-progress** → New pushes cancel old deployments
4. **Deployment comment** → Links added to commits

## Disable Local Deployments

Add this to your `.bashrc` or `.zshrc`:
```bash
alias vercel="echo '⛔ Use GitHub Actions for deployment! Push to main instead.'"
```

## Emergency Manual Deploy

If you MUST deploy manually:
```bash
# Use the unaliased command
\vercel --prod
```

## Monitoring

Check deployment status:
- GitHub Actions tab: https://github.com/aaaalabs/kinn-landing/actions
- Vercel Dashboard: https://vercel.com/dashboard