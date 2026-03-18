import { prisma } from "../prisma.js";

/**
 * Record an admin action for audit/troubleshooting.
 *
 * @param {number} adminUserId
 * @param {string} action
 * @param {number|null} targetUserId
 * @param {object|null} details
 * @returns {Promise<void>}
 */
export async function recordAdminAudit(
  adminUserId,
  action,
  targetUserId,
  details
) {
  const safeDetails =
    details && typeof details === "object" ? JSON.stringify(details) : details;

  await prisma.admin_audit.create({
    data: {
      admin_user_id: adminUserId,
      target_user_id: targetUserId ?? null,
      action,
      details: safeDetails ?? null,
    },
  });
}

