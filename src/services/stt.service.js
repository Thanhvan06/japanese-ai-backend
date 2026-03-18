import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WHISPER_API_URL = process.env.WHISPER_API_URL || "http://localhost:9000";

/**
 * Chuẩn hóa âm thanh về 16kHz Mono trước khi gửi tới Whisper
 * @param {string} inputPath - Đường dẫn file gốc
 * @param {string} outputPath - Đường dẫn file sau khi convert
 */
function processAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Kiểm tra file input có tồn tại không
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`File không tồn tại: ${inputPath}`));
    }

    ffmpeg(inputPath)
      .toFormat("wav")
      .audioChannels(1) // Ép về Mono (1 kênh)
      .audioFrequency(16000) // Ép về 16000Hz (16kHz)
      .on("end", () => {
        // Kiểm tra file output đã được tạo chưa
        if (fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error("File output không được tạo"));
        }
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(new Error(`Lỗi xử lý audio: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Gửi âm thanh đã chuẩn hóa tới Docker Whisper để transcribe
 * @param {string} audioFilePath - Đường dẫn file audio gốc
 * @returns {Promise<string>} - Text đã được transcribe
 */
export async function transcribeAudio(audioFilePath) {
  const processedPath = path.join(
    __dirname,
    "../../uploads/temp",
    `processed_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`
  );

  // Đảm bảo thư mục temp tồn tại
  const tempDir = path.dirname(processedPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // 1. Chuẩn hóa định dạng âm thanh
    console.log("--- Đang chuẩn hóa âm thanh về 16kHz Mono ---");
    await processAudio(audioFilePath, processedPath);

    // 2. Chuẩn bị Form Data
    const form = new FormData();
    form.append("file", fs.createReadStream(processedPath));
    form.append("model", "base");
    form.append("language", "ja"); // Cấu hình ngôn ngữ Nhật Bản
    form.append("temperature", "0"); // Cấu hình độ chính xác cao nhất
    form.append("response_format", "json");

    console.log("🚀 Đang gửi dữ liệu tới Whisper Server...");

    // 3. Gọi API Whisper
    let response;
    try {
      response = await axios.post(
        `${WHISPER_API_URL}/v1/audio/transcriptions`,
        form,
        {
          headers: { ...form.getHeaders() },
          timeout: 60000, // CPU cần thời gian xử lý, nên để timeout 60s
        }
      );
    } catch (axiosError) {
      console.error("Whisper API error:", axiosError.message);
      if (axiosError.code === "ECONNREFUSED") {
        throw new Error(
          `Không thể kết nối tới Whisper API tại ${WHISPER_API_URL}. Vui lòng đảm bảo Docker container đang chạy.`
        );
      }
      if (axiosError.response) {
        throw new Error(
          `Whisper API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`
        );
      }
      throw new Error(`Lỗi khi gọi Whisper API: ${axiosError.message}`);
    }

    console.log("✅ Kết quả nhận diện:", response.data?.text || "Không có text");

    // Dọn dẹp file tạm sau khi xong
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }

    if (!response.data || !response.data.text) {
      throw new Error("Whisper API không trả về text");
    }

    return response.data.text;
  } catch (error) {
    // Dọn dẹp file tạm nếu có lỗi
    if (fs.existsSync(processedPath)) {
      try {
        fs.unlinkSync(processedPath);
      } catch (e) {
        console.error("Lỗi khi xóa file tạm:", e);
      }
    }

    console.error("❌ Lỗi xử lý STT:", error.message);
    if (error.response) {
      console.error("Response error:", error.response.data);
    }
    throw new Error(`Lỗi transcribe audio: ${error.message}`);
  }
}

