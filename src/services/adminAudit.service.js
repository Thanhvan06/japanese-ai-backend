import { prisma } from "../prisma.js";

export async function recordAdminAudit(adminUserId, action, targetUserId = null, details = null) {
  try {
    await prisma.admin_audit.create({
      data: {
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err) {
    console.error("Failed to record admin audit:", err);
  }
}




