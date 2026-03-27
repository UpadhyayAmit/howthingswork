# Vercel Deployment Setup

This guide explains how to configure GitHub Actions for automatic Vercel deployment.

## Required GitHub Secrets

You need to add 3 secrets to your GitHub repository:

### 1. VERCEL_TOKEN
- Go to https://vercel.com/account/tokens
- Click "Create Token"
- Name it "GitHub Actions"
- Copy the token
- Add it to GitHub: Settings → Secrets → Actions → New repository secret
- Name: `VERCEL_TOKEN`
- Value: (paste your token)

### 2. VERCEL_ORG_ID
- Run this command in the project directory:
  ```bash
  npx vercel link
  ```
- This creates a `.vercel` folder
- Open `.vercel/project.json`
- Copy the `orgId` value
- Add to GitHub secrets as `VERCEL_ORG_ID`

### 3. VERCEL_PROJECT_ID
- From the same `.vercel/project.json` file
- Copy the `projectId` value
- Add to GitHub secrets as `VERCEL_PROJECT_ID`

## Vercel Project Configuration

Make sure your Vercel project is configured correctly:

1. **Framework Preset:** Next.js
2. **Build Command:** `npm run build`
3. **Output Directory:** `.next`
4. **Install Command:** `npm install`
5. **Node Version:** 20.x

## Workflow Behavior

- **Push to `main`:** Deploys to production
- **Pull Requests:** Creates preview deployment and comments on PR with URL
- **Build Verification:** Always runs `npm run build` before deploying

## Quick Start

1. Push repository to GitHub
2. Create a project on Vercel (import from GitHub)
3. Run `npx vercel link` locally to get org/project IDs
4. Add the 3 secrets to GitHub repo settings
5. Push to `main` → automatic deployment fires
