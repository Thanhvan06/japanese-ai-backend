import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../prisma.js";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate audio từ text tiếng Nhật
 * Ưu tiên: Azure TTS > Google TTS > Web API (fallback)
 * @param {string} text - Text tiếng Nhật cần chuyển thành audio
 * @param {string} outputFilename - Tên file output (không cần extension)
 * @param {object} options - Tùy chọn: languageCode, voiceName, ssmlGender, audioEncoding
 * @returns {Promise<{filename: string, filepath: string, url: string, size: number}>}
 */
export const generateAudioFromText = async (
  text,
  outputFilename = null,
  options = {}
) => {
  try {
    // Đảm bảo thư mục uploads/audio tồn tại
    const audioDir = path.join(__dirname, "../../uploads/audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Tạo tên file nếu chưa có
    if (!outputFilename) {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      outputFilename = `tts-${timestamp}-${random}`;
    }

    const filepath = path.join(audioDir, `${outputFilename}.mp3`);

    // Ưu tiên 1: Azure TTS (nếu có cấu hình)
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      try {
        return await generateWithAzure(text, filepath, outputFilename, options);
      } catch (error) {
        console.warn("Azure TTS failed, trying fallback:", error.message);
        // Fallback to Web API
      }
    }

    // Ưu tiên 2: Google Cloud TTS (nếu có cấu hình)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_API_KEY) {
      try {
        return await generateWithGoogle(text, filepath, outputFilename, options);
      } catch (error) {
        console.warn("Google TTS failed, trying fallback:", error.message);
        // Fallback to Web API
      }
    }

    // Fallback: Sử dụng Web API miễn phí (Google Translate TTS)
    return await generateWithWebAPI(text, filepath, outputFilename);
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
};

/**
 * Generate audio với Azure Cognitive Services TTS
 */
const generateWithAzure = async (text, filepath, outputFilename, options) => {
  const sdk = await import("microsoft-cognitiveservices-speech-sdk");
  const { SpeechConfig, AudioConfig, SpeechSynthesizer, ResultReason } = sdk;

  // Cấu hình Azure Speech
  const speechConfig = SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_SPEECH_REGION
  );

  // Cấu hình voice tiếng Nhật
  // Các giọng nói tiếng Nhật có sẵn:
  // - ja-JP-NanamiNeural (nữ, trẻ)
  // - ja-JP-KeitaNeural (nam, trẻ)
  // - ja-JP-AoiNeural (nữ, trẻ)
  // - ja-JP-DaichiNeural (nam, trẻ)
  speechConfig.speechSynthesisVoiceName = options.voiceName || "ja-JP-NanamiNeural";
  speechConfig.speechSynthesisLanguage = options.languageCode || "ja-JP";

  // Cấu hình audio output
  const audioConfig = AudioConfig.fromAudioFileOutput(filepath);

  // Tạo synthesizer
  const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(
      text,
      (result) => {
        synthesizer.close();
        
        if (result.reason === ResultReason.SynthesizingAudioCompleted) {
          const baseUrl = process.env.BASE_URL || "http://localhost:4000";
          const url = `${baseUrl}/uploads/audio/${outputFilename}.mp3`;
          const stats = fs.statSync(filepath);

          resolve({
            filename: `${outputFilename}.mp3`,
            filepath: filepath,
            url: url,
            size: stats.size,
            provider: "Azure",
          });
        } else {
          reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
        }
      },
      (error) => {
        synthesizer.close();
        reject(error);
      }
    );
  });
};

/**
 * Generate audio với Google Cloud TTS (nếu có cấu hình)
 */
const generateWithGoogle = async (text, filepath, outputFilename, options) => {
  try {
    const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
    
    let client;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      client = new TextToSpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    } else {
      client = new TextToSpeechClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
    }

    const request = {
      input: { text: text },
      voice: {
        languageCode: options.languageCode || "ja-JP",
        name: options.voiceName || "ja-JP-Standard-A",
        ssmlGender: options.ssmlGender || "FEMALE",
      },
      audioConfig: {
        audioEncoding: options.audioEncoding || "MP3",
        speakingRate: options.speakingRate || 1.0,
        pitch: options.pitch || 0.0,
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    fs.writeFileSync(filepath, response.audioContent, "binary");

    const baseUrl = process.env.BASE_URL || "http://localhost:4000";
    const url = `${baseUrl}/uploads/audio/${outputFilename}.mp3`;

    return {
      filename: `${outputFilename}.mp3`,
      filepath: filepath,
      url: url,
      size: response.audioContent.length,
      provider: "Google",
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Fallback: Sử dụng Web API miễn phí (Google Translate TTS)
 * Cải thiện: Thêm retry logic, user-agent, error handling tốt hơn
 */
const generateWithWebAPI = async (text, filepath, outputFilename) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Google Translate TTS (unofficial, miễn phí)
      // Giới hạn: ~200 ký tự mỗi request
      const maxLength = 200;
      
      // Chia text thành các đoạn nhỏ nếu quá dài
      const textChunks = [];
      for (let i = 0; i < text.length; i += maxLength) {
        const chunk = text.substring(i, i + maxLength);
        if (chunk.trim()) {
          textChunks.push(chunk.trim());
        }
      }

      if (textChunks.length === 0) {
        reject(new Error("Text is empty"));
        return;
      }

      let completedChunks = 0;
      let failedChunks = 0;
      const audioBuffers = new Array(textChunks.length);
      const errors = [];

      // Hàm download một chunk với retry
      const downloadChunk = async (chunk, index, retryCount = 0) => {
        const maxRetries = 3;
        const encodedText = encodeURIComponent(chunk);
        
        // Sử dụng endpoint mới hơn và ổn định hơn
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodedText}&ttsspeed=1`;

        return new Promise((resolveChunk, rejectChunk) => {
          const options = {
            hostname: "translate.google.com",
            path: `/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodedText}&ttsspeed=1`,
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "audio/webm,audio/ogg,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5",
              "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
              "Referer": "https://translate.google.com/",
            },
          };

          const req = https.get(options, (response) => {
            // Kiểm tra status code
            if (response.statusCode !== 200) {
              if (retryCount < maxRetries) {
                // Retry sau 1 giây
                setTimeout(() => {
                  downloadChunk(chunk, index, retryCount + 1)
                    .then(resolveChunk)
                    .catch(rejectChunk);
                }, 1000 * (retryCount + 1));
                return;
              }
              rejectChunk(new Error(`HTTP ${response.statusCode}`));
              return;
            }

            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
              if (chunks.length === 0) {
                if (retryCount < maxRetries) {
                  setTimeout(() => {
                    downloadChunk(chunk, index, retryCount + 1)
                      .then(resolveChunk)
                      .catch(rejectChunk);
                  }, 1000 * (retryCount + 1));
                  return;
                }
                rejectChunk(new Error("Empty response"));
                return;
              }
              resolveChunk(Buffer.concat(chunks));
            });
          });

          req.on("error", (err) => {
            if (retryCount < maxRetries) {
              setTimeout(() => {
                downloadChunk(chunk, index, retryCount + 1)
                  .then(resolveChunk)
                  .catch(rejectChunk);
              }, 1000 * (retryCount + 1));
            } else {
              rejectChunk(err);
            }
          });

          req.setTimeout(10000, () => {
            req.destroy();
            if (retryCount < maxRetries) {
              setTimeout(() => {
                downloadChunk(chunk, index, retryCount + 1)
                  .then(resolveChunk)
                  .catch(rejectChunk);
              }, 1000 * (retryCount + 1));
            } else {
              rejectChunk(new Error("Request timeout"));
            }
          });
        });
      };

      // Download tất cả chunks song song (nhưng có giới hạn)
      const downloadPromises = textChunks.map((chunk, index) => {
        return downloadChunk(chunk, index)
          .then((buffer) => {
            audioBuffers[index] = buffer;
            completedChunks++;
          })
          .catch((error) => {
            errors.push({ index, error: error.message });
            failedChunks++;
            completedChunks++;
          });
      });

      // Đợi tất cả chunks hoàn thành
      await Promise.all(downloadPromises);

      // Kiểm tra nếu có quá nhiều lỗi
      if (failedChunks > textChunks.length / 2) {
        reject(new Error(`Too many failed chunks: ${failedChunks}/${textChunks.length}. Errors: ${JSON.stringify(errors)}`));
        return;
      }

      // Gộp tất cả audio chunks lại (bỏ qua các chunks lỗi)
      const validBuffers = audioBuffers.filter((buf) => buf !== undefined);
      if (validBuffers.length === 0) {
        reject(new Error("No valid audio chunks received"));
        return;
      }

      const finalBuffer = Buffer.concat(validBuffers);
      fs.writeFileSync(filepath, finalBuffer);

      const baseUrl = process.env.BASE_URL || "http://localhost:4000";
      const url_result = `${baseUrl}/uploads/audio/${outputFilename}.mp3`;
      const stats = fs.statSync(filepath);

      resolve({
        filename: `${outputFilename}.mp3`,
        filepath: filepath,
        url: url_result,
        size: stats.size,
        provider: "WebAPI",
        warnings: failedChunks > 0 ? `${failedChunks} chunks failed` : null,
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate audio cho listening item và cập nhật vào database
 * @param {number} itemId - ID của listening item
 * @param {string} transcript - Transcript tiếng Nhật
 * @returns {Promise<{audioUrl: string}>}
 */
export const generateAndUpdateAudio = async (itemId, transcript) => {
  try {
    const outputFilename = `listening-item-${itemId}`;
    const result = await generateAudioFromText(transcript, outputFilename);

    await prisma.listening_items.update({
      where: { item_id: itemId },
      data: { audio_url: result.url },
    });

    return { audioUrl: result.url };
  } catch (error) {
    console.error("Error generating and updating audio:", error);
    throw error;
  }
};
