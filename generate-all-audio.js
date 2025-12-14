// generate-all-audio.js
import dotenv from "dotenv";
import { prisma } from "./src/prisma.js";
import { generateAndUpdateAudio } from "./src/services/tts.service.js";

dotenv.config();

async function generateAllAudio() {
  try {
    console.log("🔍 Đang tìm các items chưa có audio...\n");

    // Tìm tất cả items có transcript
    // Sau đó filter để tìm items chưa có audio_url hợp lệ
    const allItems = await prisma.listening_items.findMany({
      where: {
        transcript_jp: { not: null },
      },
      select: {
        item_id: true,
        transcript_jp: true,
        question: true,
        audio_url: true,
      },
      orderBy: {
        item_id: "asc"
      }
    });

    // Filter items chưa có audio_url hoặc audio_url rỗng
    const items = allItems.filter(item => 
      !item.audio_url || 
      item.audio_url.trim() === "" ||
      item.audio_url === "null"
    );

    if (items.length === 0) {
      console.log("✅ Tất cả items đã có audio!");
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log(`📊 Tìm thấy ${items.length} items cần generate audio\n`);
    console.log("⏳ Bắt đầu generate audio...\n");

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Generate từng item (tuần tự để tránh rate limit)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const progress = `[${i + 1}/${items.length}]`;

      try {
        console.log(`${progress} Generating audio for item ${item.item_id}...`);
        console.log(`   Transcript: ${item.transcript_jp.substring(0, 50)}...`);

        await generateAndUpdateAudio(item.item_id, item.transcript_jp);

        successCount++;
        console.log(`   ✅ Item ${item.item_id} - SUCCESS\n`);
      } catch (error) {
        failCount++;
        const errorMsg = error.message || "Unknown error";
        errors.push({ itemId: item.item_id, error: errorMsg });
        console.log(`   ❌ Item ${item.item_id} - FAILED: ${errorMsg}\n`);
      }

      // Delay giữa các requests để tránh rate limit (1 giây)
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Tổng kết
    console.log("\n" + "=".repeat(50));
    console.log("📊 TỔNG KẾT");
    console.log("=".repeat(50));
    console.log(`✅ Thành công: ${successCount}/${items.length}`);
    console.log(`❌ Thất bại: ${failCount}/${items.length}`);

    if (errors.length > 0) {
      console.log("\n❌ Chi tiết lỗi:");
      errors.forEach(({ itemId, error }) => {
        console.log(`   Item ${itemId}: ${error}`);
      });
    }

    console.log("\n✨ Hoàn tất!");

    // Đóng Prisma connection
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Chạy script
generateAllAudio();

