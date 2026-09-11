# The single biggest speed fix

Your Vercel build ran in `iad1` (Washington DC). If your Neon database is in
Singapore or Mumbai, every query crosses the planet and back. The sync makes
hundreds of queries, so that latency multiplies.

## 1. Find your Neon region

Neon dashboard -> your project -> the connection string host tells you:

    ep-xxxx.ap-southeast-1.aws.neon.tech   = Singapore
    ep-xxxx.ap-south-1.aws.neon.tech       = Mumbai
    ep-xxxx.us-east-2.aws.neon.tech        = US East
    ep-xxxx.eu-central-1.aws.neon.tech     = Frankfurt

## 2. Set Vercel to the matching region

`vercel.json` in this bundle sets `bom1` (Mumbai), which is correct if your
Neon is `ap-south-1` and is also closest to Ahmedabad.

If your Neon says **ap-southeast-1 (Singapore)**, change it to:

    "regions": ["sin1"]

If your Neon is in the **US**, you have two choices:
  - easiest: leave `"regions": ["iad1"]`
  - better:  create a new Neon project in ap-south-1, run
             `pnpm exec prisma db push` against it, re-sync, and use `bom1`

The rule is simple: Vercel region and Neon region should be the same part of
the world. Everything else is a rounding error next to this.

## 3. Confirm it applied

After deploying, Vercel -> your project -> Deployments -> click the latest ->
Functions. The region shown should match what you set.

Note: on the Hobby plan only one region is allowed, which is fine here.
