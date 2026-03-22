import Stripe from "stripe";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  inferSubscriptionCreditsFromAmount,
  inferSubscriptionPlanFromAmount,
  normalizeCreditUnits,
  resolveSubscriptionBillingCycle,
} from "../src/utils/creditUnits.js";

dotenv.config();

const prisma = new PrismaClient();
let stripe;

function parseArgs(argv) {
  const args = {
    limit: null,
    email: null,
    userId: null,
    onlyMismatches: true,
    mode: null,
    stripeKey: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--limit") args.limit = parseInt(argv[i + 1], 10) || null;
    if (token === "--email") args.email = argv[i + 1] || null;
    if (token === "--userId") args.userId = argv[i + 1] || null;
    if (token === "--all") args.onlyMismatches = false;
    if (token === "--mode") args.mode = argv[i + 1] || null;
    if (token === "--stripe-key") args.stripeKey = argv[i + 1] || null;
  }

  return args;
}

function resolveStripeSecretKey(args) {
  if (args.stripeKey) return args.stripeKey;
  if (args.mode === "live") return process.env.STRIPE_SECRET_KEY || null;
  if (args.mode === "test") {
    return process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || null;
  }
  return process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY || null;
}

function normalizeDbSubscriptionStatus(status) {
  if (!status) return "unknown";
  if (status === "trial") return "trialing";
  if (status === "cancelled") return "canceled";
  return status;
}

function pickBestSubscription(subscriptions) {
  if (!subscriptions.length) return null;

  const statusRank = {
    active: 5,
    trialing: 4,
    past_due: 3,
    unpaid: 2,
    canceled: 1,
    incomplete: 0,
    incomplete_expired: 0,
    paused: 0,
  };

  return [...subscriptions].sort((a, b) => {
    const rankDiff = (statusRank[b.status] || -1) - (statusRank[a.status] || -1);
    if (rankDiff !== 0) return rankDiff;
    return (b.created || 0) - (a.created || 0);
  })[0];
}

async function getStripeSubscriptionForUser(user) {
  if (user.stripeSubscriptionId) {
    try {
      return await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    } catch (error) {
      return {
        lookupError: error,
        id: user.stripeSubscriptionId,
      };
    }
  }

  if (!user.stripeCustomerId) return null;

  try {
    const list = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 20,
    });
    return pickBestSubscription(list.data);
  } catch (error) {
    return {
      lookupError: error,
      id: null,
    };
  }
}

function buildMismatch(user, stripeSubscription) {
  const issues = [];

  if (!stripeSubscription) {
    if (
      user.stripeSubscriptionId ||
      user.subscriptionTier ||
      user.subscriptionBillingCycle ||
      (user.subscriptionStatus && user.subscriptionStatus !== "trial")
    ) {
      issues.push("No Stripe subscription found");
    }
    return {
      userId: user.id,
      email: user.email,
      dbSubscriptionId: user.stripeSubscriptionId || null,
      stripeSubscriptionId: null,
      stripeStatus: null,
      dbStatus: user.subscriptionStatus,
      dbTier: user.subscriptionTier,
      stripeTier: null,
      dbBilling: user.subscriptionBillingCycle,
      stripeBilling: null,
      expectedCredits: null,
      metadataCredits: null,
      issues,
    };
  }

  if (stripeSubscription.lookupError) {
    issues.push(`Stripe lookup failed: ${stripeSubscription.lookupError.code || stripeSubscription.lookupError.message}`);
    return {
      userId: user.id,
      email: user.email,
      dbSubscriptionId: user.stripeSubscriptionId || null,
      stripeSubscriptionId: stripeSubscription.id || null,
      stripeStatus: null,
      dbStatus: user.subscriptionStatus,
      dbTier: user.subscriptionTier,
      stripeTier: null,
      dbBilling: user.subscriptionBillingCycle,
      stripeBilling: null,
      expectedCredits: null,
      metadataCredits: null,
      issues,
    };
  }

  const stripeBilling = resolveSubscriptionBillingCycle(stripeSubscription);
  const priceAmountCents =
    stripeSubscription.items?.data?.[0]?.price?.unit_amount ??
    stripeSubscription.items?.data?.[0]?.plan?.amount ??
    0;
  const inferredPlan = inferSubscriptionPlanFromAmount(priceAmountCents, stripeBilling);
  const stripeTier = stripeSubscription.metadata?.tierId || inferredPlan?.tierId || null;
  const metadataCreditsRaw = stripeSubscription.metadata?.credits || null;
  const metadataCredits = metadataCreditsRaw ? normalizeCreditUnits(metadataCreditsRaw) || null : null;
  const expectedCredits = inferSubscriptionCreditsFromAmount(priceAmountCents, stripeBilling) || null;

  if (user.stripeSubscriptionId !== stripeSubscription.id) {
    issues.push("DB subscription id mismatch");
  }

  const normalizedDbStatus = normalizeDbSubscriptionStatus(user.subscriptionStatus);
  if (normalizedDbStatus !== stripeSubscription.status) {
    issues.push("DB status mismatch");
  }

  if ((user.subscriptionTier || null) !== (stripeTier || null)) {
    issues.push("DB tier mismatch");
  }

  if ((user.subscriptionBillingCycle || null) !== (stripeBilling || null)) {
    issues.push("DB billing cycle mismatch");
  }

  if (!stripeSubscription.metadata?.userId) {
    issues.push("Stripe metadata.userId missing");
  }

  if (!stripeSubscription.metadata?.tierId) {
    issues.push("Stripe metadata.tierId missing");
  }

  if (!stripeSubscription.metadata?.credits) {
    issues.push("Stripe metadata.credits missing");
  }

  if (metadataCredits && expectedCredits && metadataCredits !== expectedCredits) {
    issues.push("Stripe metadata.credits inconsistent with price");
  }

  if (!user.stripeCustomerId) {
    issues.push("DB stripeCustomerId missing");
  }

  return {
    userId: user.id,
    email: user.email,
    dbSubscriptionId: user.stripeSubscriptionId || null,
    stripeSubscriptionId: stripeSubscription.id,
    stripeStatus: stripeSubscription.status,
    dbStatus: user.subscriptionStatus,
    dbTier: user.subscriptionTier,
    stripeTier,
    dbBilling: user.subscriptionBillingCycle,
    stripeBilling,
    expectedCredits,
    metadataCredits: metadataCreditsRaw,
    issues,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stripeSecretKey = resolveStripeSecretKey(args);

  if (!stripeSecretKey) {
    throw new Error(
      "Missing Stripe secret key. Set STRIPE_SECRET_KEY / TESTING_STRIPE_SECRET_KEY or pass --stripe-key.",
    );
  }

  stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-11-20.acacia",
  });

  const where = {
    OR: [
      { stripeSubscriptionId: { not: null } },
      { stripeCustomerId: { not: null } },
      { subscriptionTier: { not: null } },
      { subscriptionBillingCycle: { not: null } },
      { subscriptionStatus: { not: "trial" } },
    ],
  };

  if (args.email) where.email = args.email;
  if (args.userId) where.id = args.userId;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      subscriptionBillingCycle: true,
      subscriptionCredits: true,
      creditsExpireAt: true,
    },
    orderBy: { createdAt: "desc" },
    ...(args.limit ? { take: args.limit } : {}),
  });

  console.log(`Auditing ${users.length} users...\n`);

  const rows = [];
  for (const user of users) {
    const stripeSubscription = await getStripeSubscriptionForUser(user);
    const row = buildMismatch(user, stripeSubscription);
    if (!args.onlyMismatches || row.issues.length > 0) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    console.log("No mismatches found.");
    return;
  }

  console.table(
    rows.map((row) => ({
      email: row.email,
      userId: row.userId,
      dbSubId: row.dbSubscriptionId,
      stripeSubId: row.stripeSubscriptionId,
      dbStatus: row.dbStatus,
      stripeStatus: row.stripeStatus,
      dbTier: row.dbTier,
      stripeTier: row.stripeTier,
      dbBilling: row.dbBilling,
      stripeBilling: row.stripeBilling,
      metadataCredits: row.metadataCredits,
      expectedCredits: row.expectedCredits,
      issues: row.issues.join("; "),
    })),
  );

  const issueCounts = rows.reduce((acc, row) => {
    for (const issue of row.issues) {
      acc[issue] = (acc[issue] || 0) + 1;
    }
    return acc;
  }, {});

  console.log("\nIssue summary:");
  console.table(
    Object.entries(issueCounts).map(([issue, count]) => ({ issue, count })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
