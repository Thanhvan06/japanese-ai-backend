// Test script cho TTS Web API
import { generateAudioFromText } from "./src/services/tts.service.js";

async function testTTS() {
  console.log("🧪 Testing Web API TTS...\n");

  const testText = "こんにちは。私は田中です。今日はいい天気ですね。";

  try {
    console.log(`📝 Text: ${testText}`);
    console.log("⏳ Generating audio...\n");

    const result = await generateAudioFromText(testText, "test-audio");

    console.log("✅ Success!");
    console.log(`📁 Filename: ${result.filename}`);
    console.log(`🔗 URL: ${result.url}`);
    console.log(`📊 Size: ${result.size} bytes`);
    console.log(`🔧 Provider: ${result.provider}`);
    if (result.warnings) {
      console.log(`⚠️  Warnings: ${result.warnings}`);
    }
    console.log(`\n✨ Audio file saved to: ${result.filepath}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testTTS();

