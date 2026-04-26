/**
 * Collect subscription rows from both NEW and LEGACY Stripe accounts (admin resync, portal, etc.).
 */
import { getStripeForAccount, retrieveSubscriptionFromEitherAccount } from "./stripeClients.js";

const SUB_LIST = {
  status: "all",
  limit: 20,
  expand: ["data.items.data.price"],
};

/**
 * @param {object} user – must include email, stripeCustomerId, legacyStripeCustomerId, stripeSubscriptionId, legacyStripeSubscriptionId
 * @returns {Promise<{ entries: { subscription: object, account: "new" | "legacy" }[] }>}
 */
export async function gatherSubscriptionCandidatesFromDualAccounts(user) {
  const added = new Set();
  const entries = [];

  const add = (subscription, account) => {
    if (!subscription?.id || !account) return;
    if (added.has(subscription.id)) return;
    added.add(subscription.id);
    entries.push({ subscription, account });
  };

  for (const sid of new Set(
    [user.stripeSubscriptionId, user.legacyStripeSubscriptionId].filter(Boolean),
  )) {
    const { subscription, account } = await retrieveSubscriptionFromEitherAccount(sid, ["items.data.price"]);
    if (subscription && account) add(subscription, account);
  }

  for (const cusId of new Set(
    [user.stripeCustomerId, user.legacyStripeCustomerId].filter(Boolean),
  )) {
    for (const acc of ["new", "legacy"]) {
      const client = getStripeForAccount(acc);
      if (!client) continue;
      try {
        const list = await client.subscriptions.list({ ...SUB_LIST, customer: cusId });
        for (const s of list.data || []) add(s, acc);
      } catch {
        /* no such customer on this account */
      }
    }
  }

  if (entries.length === 0 && user.email) {
    for (const acc of ["new", "legacy"]) {
      const client = getStripeForAccount(acc);
      if (!client) continue;
      let customers;
      try {
        customers = await client.customers.list({ email: user.email, limit: 15 });
      } catch {
        continue;
      }
      for (const cust of customers.data || []) {
        if (cust.deleted) continue;
        try {
          const list = await client.subscriptions.list({ ...SUB_LIST, customer: cust.id });
          for (const s of list.data || []) add(s, acc);
        } catch {
          /* ignore */
        }
      }
    }
  }

  return { entries };
}

/**
 * @returns {Promise<{ customerId: string | null, account: "new" | "legacy" | null }>}
 */
export async function findFirstCustomerByEmailDualAccount(email) {
  if (!email) return { customerId: null, account: null };
  for (const acc of ["new", "legacy"]) {
    const client = getStripeForAccount(acc);
    if (!client) continue;
    try {
      const r = await client.customers.list({ email, limit: 1 });
      const c = r.data?.[0];
      if (c && !c.deleted) return { customerId: c.id, account: acc };
    } catch {
      /* continue */
    }
  }
  return { customerId: null, account: null };
}
