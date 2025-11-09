# Cloudflare R2 Image Storage & Backup Design

- **Date:** 2025-10-26
- **Status**: ONGOING

## 1. Overview & Goals

This document outlines the migration of image storage from AWS S3 to Cloudflare R2 for cost efficiency, with ongoing
automated backups to AWS S3. The approach is designed for a Vercel-hosted, serverless Payload CMS project, using GitHub
Actions for scheduled backup automation.

**Goals:**

- Reduce image storage and bandwidth costs
- Maintain high durability and global CDN delivery
- Ensure robust, automated backups for disaster recovery
- Use cloud-native, serverless-compatible workflows

## 2. Architecture

- **Primary Storage:** Cloudflare R2 bucket (S3-compatible)
- **CDN Delivery:** Images served via Cloudflare CDN (zero egress fees)
- **Payload CMS Integration:** Uses S3 adapter pointed at R2 endpoint
- **Backup Storage:** AWS S3 bucket (for redundancy)
- **Backup Automation:** GitHub Actions workflow runs scheduled syncs from R2 to S3

## 3. Migration Plan (S3 → R2)

1. **Create R2 bucket** in Cloudflare dashboard; generate API credentials.
2. **Update Payload CMS** config to use R2 S3-compatible endpoint and credentials.
3. **Migrate existing images:**
   - Use `rclone` or a custom script to copy all files from S3 to R2.
   - Run this from a local machine or temporary cloud VM (not Vercel).
4. **Verify migration:**
   - Spot-check files in R2 and test Payload uploads.
5. **Update image URLs** if direct S3 URLs are stored in your database/frontend.

### 3.1. Setting Up R2 Custom Domain for Public Image Delivery

To serve images from R2 via a production-grade, CDN-cached public URL:

1. **Prepare R2 Bucket:** Ensure all images are uploaded to your R2 bucket and the bucket is set to public.

2. **Choose a Custom Domain:** Decide on a subdomain for images (e.g., `media.yoursite.com`). This domain must be
   managed by Cloudflare.

3. **Add Custom Domain in Cloudflare Dashboard:**
   - Go to Cloudflare dashboard → R2 → select your bucket.
   - In the "Custom Domains" section, click "Add Custom Domain."
   - Enter your chosen domain (e.g., `media.yoursite.com`).
   - Cloudflare will provide a CNAME target (e.g., `xxxxxx.r2.dev`).

4. **Update DNS:**
   - In Cloudflare DNS, add a CNAME record:
     - Name: your subdomain (e.g., `media`)
     - Target: the CNAME value from above
     - Proxy status: Proxied (orange cloud) for CDN caching.

5. **Wait for Propagation:**
   - After DNS propagates, your images will be available at `https://media.yoursite.com/path/to/image.jpg`.

6. **(Optional) Set Cache Headers:**
   - For optimal caching, set `Cache-Control` headers on R2 objects (e.g., `public, max-age=31536000`).

7. **Update Frontend:**
   - Use the new custom domain URLs in your frontend code.

**Note:** You can migrate to a Worker-based solution later if you need custom logic or image processing, simply by
updating the DNS to point your custom domain to a Worker.

**Additional Note:** You do not need to have your domain registered with Cloudflare to use a Worker on a `.workers.dev`
subdomain. However, if you want to use your own custom domain (e.g., `img.yoursite.com`) with a Worker, you must manage
DNS for that subdomain through Cloudflare. This does not affect your main site hosting (e.g., on Vercel); only the DNS
for the subdomain used by the Worker needs to be on Cloudflare.

**DNS Hosting Requirement for R2 Custom Domain:** To use a Cloudflare R2 Custom Domain (e.g., `media.ks-schoerke.de`),
the DNS for your domain (`ks-schoerke.de`) must be managed by Cloudflare. This allows you to point your main site
(`ks-schoerke.de` and `www.ks-schoerke.de`) to Vercel using A/CNAME records, and your media subdomain
(`media.ks-schoerke.de`) to R2 using a CNAME as instructed by Cloudflare. You cannot use R2 Custom Domain for a
subdomain if your DNS is managed elsewhere (e.g., at your registrar or Vercel). No Worker is required for this setup.

## 4. Ongoing Backups (R2 → S3 via GitHub Actions)

- **Backup Script:** Node.js or rclone script to sync new/changed files from R2 to S3.
- **Scheduling:** GitHub Actions workflow runs nightly (or as needed).
- **Credentials:** Store R2 and S3 keys as GitHub Secrets.
- **Sample Workflow:**

```yaml
name: R2 to S3 Backup
on:
  schedule:
    - cron: '0 3 * * *' # every day at 3am UTC
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout (optional)
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install aws-sdk
      - name: Run backup script
        env:
          R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
          R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
          AWS_ACCESS_KEY: ${{ secrets.AWS_ACCESS_KEY }}
          AWS_SECRET_KEY: ${{ secrets.AWS_SECRET_KEY }}
        run: node scripts/backupR2toS3.js
```

- **Script Outline:**
  - List objects in R2
  - For each, copy to S3 if not present or changed
  - Log results and errors

## 5. Security & Credentials

- Store all API keys in environment variables or GitHub Secrets
- Use least-privilege IAM policies for both R2 and S3
- Rotate credentials regularly

## 6. Testing & Verification

- After migration, verify image accessibility via R2 URLs and Payload CMS
- Test backup workflow by restoring a file from S3
- Monitor GitHub Actions logs for failures

## 7. Future Considerations

- Consider enabling versioning on S3 for backup retention
- Monitor Cloudflare R2 and S3 costs periodically
- Review and update backup frequency as needed
- Explore Cloudflare R2 object versioning (when stable)
