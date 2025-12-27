import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "AdminPassword123!";

  // check exist
  const exists = await prisma.users.findUnique({ where: { email } });
  if (exists) {
    console.log("Admin already exists:", exists.user_id);
    // ensure role/admins record exists
    if (exists.role !== "admin") {
      await prisma.users.update({ where: { user_id: exists.user_id }, data: { role: "admin" } });
      console.log("Updated role to admin for user", exists.user_id);
    }
    const adminRec = await prisma.admins.findUnique({ where: { user_id: exists.user_id } });
    if (!adminRec) {
      await prisma.admins.create({ data: { user_id: exists.user_id, role: "content_manager", assigned_by: exists.user_id } });
      console.log("Created admins record for user", exists.user_id);
    }
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.users.create({
    data: {
      email,
      password_hash: hash,
      display_name: "Administrator",
      role: "admin",
      is_active: true
    }
  });

  await prisma.admins.create({
    data: {
      user_id: user.user_id,
      role: "content_manager",
      assigned_by: user.user_id
    }
  });

  console.log("Created admin user:", email, "id:", user.user_id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




