# Deploy checklist

## Before pushing
- [ ] `pnpm build` passes locally with no errors
- [ ] `package.json` has `"postinstall": "prisma generate"`
- [ ] `.env` is listed in `.gitignore` (never commit your Shopify token)

## Vercel environment variables (all 5)
| Name | Where it comes from |
|---|---|
| DATABASE_URL | Neon **Pooled** connection string |
| DIRECT_URL | Neon **Direct** connection string |
| JWT_SECRET | any long random string |
| SHOPIFY_STORE_DOMAIN | your-store.myshopify.com |
| SHOPIFY_ACCESS_TOKEN | your shpat_ token |
| CRON_SECRET | any long random string |

## After first deploy
- [ ] Open the site, sign in as admin
- [ ] Press Sync, confirm orders load
- [ ] Sign in as a rider on a real phone
- [ ] Mark one order delivered, check it appears in admin
