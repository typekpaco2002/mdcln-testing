import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import {
  captureReferralHint,
  createPayoutRequest,
  getReferralReconciliation,
  getAdminReferralOverview,
  getMyReferralOverview,
  linkReferralReconciliation,
  markPayoutRequestPaid,
  resolveReferralCode,
  upsertMyReferralCode,
  addReferralBonus,
  markReferrerPayoutPaid,
  setReferralAdvanced,
} from "../controllers/referral.controller.js";

const router = express.Router();

router.get("/resolve/:suffix", resolveReferralCode);
router.post("/capture", captureReferralHint);

router.get("/me/overview", authMiddleware, getMyReferralOverview);
router.post("/me/code", authMiddleware, upsertMyReferralCode);
router.post("/me/request-payout", authMiddleware, createPayoutRequest);

router.get("/admin/overview", authMiddleware, adminMiddleware, getAdminReferralOverview);
router.post(
  "/admin/payout-requests/:id/mark-paid",
  authMiddleware,
  adminMiddleware,
  markPayoutRequestPaid,
);
router.post(
  "/admin/users/:userId/mark-paid",
  authMiddleware,
  adminMiddleware,
  markReferrerPayoutPaid,
);
router.post(
  "/admin/users/:userId/add-bonus",
  authMiddleware,
  adminMiddleware,
  addReferralBonus,
);
router.post(
  "/admin/users/:userId/set-advanced",
  authMiddleware,
  adminMiddleware,
  setReferralAdvanced,
);
router.get(
  "/admin/reconciliation",
  authMiddleware,
  adminMiddleware,
  getReferralReconciliation,
);
router.post(
  "/admin/reconciliation/link",
  authMiddleware,
  adminMiddleware,
  linkReferralReconciliation,
);

export default router;
