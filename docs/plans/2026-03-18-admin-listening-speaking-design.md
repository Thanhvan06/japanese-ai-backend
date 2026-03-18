## Admin luyện nghe & luyện nói – Thiết kế chức năng quản trị

**Mục tiêu:** Cho phép admin quản lý nội dung luyện nghe/nói (CRUD) và xem thống kê kết quả luyện tập của học viên theo level/set/bài, tận dụng các bảng hiện có như `listening_sets`, `listening_items`, `listening_attempts`, `speaking_phrases`, `speaking_attempts`.

**Phạm vi:** Chỉ sửa trong hai project `japanese-ai-backend` và `japanese-ai-frontend`. Không thay đổi schema DB lớn (dùng lại các bảng hiện có, chỉ thêm trường nhỏ nếu thật sự cần).

---

### 1. Backend – Listening admin

#### 1.1. Kiến trúc tổng quan

- Reuse Express app và Prisma hiện có.
- Thêm route nhóm admin cho listening dưới prefix: `/api/admin/listening`.
- Tách controller/admin cho listening riêng để code rõ ràng, hoặc thêm nhóm hàm admin vào `listening.controller.js` với prefix `/api/admin/...`.
- Bảo vệ bằng middleware auth + kiểm tra role admin hoặc bảng `admins`.

#### 1.2. Phân quyền

- Sử dụng `auth(true)` để bắt buộc đăng nhập.
- Kiểm tra `req.user.role === 'admin'` và/hoặc tồn tại bản ghi trong `admins`:
  - Nếu không thỏa mãn, trả về 403.
- Tận dụng luồng audit/log hiện có (`admin_audit` nếu cần log thao tác quan trọng như xóa set).

#### 1.3. API quản lý set/bài nghe

Prefix chung: `/api/admin/listening`.

- `GET /api/admin/listening/sets?level=&page=&limit=`
  - Trả về danh sách `listening_sets` theo `jlpt_level` (nếu có filter).
  - Thông tin mỗi set:
    - `set_id`, `title`, `jlpt_level`, `description`, `is_published`, `created_at`.
    - Số lượng items trong set.
    - Thống kê cơ bản:
      - Tổng số attempts trên các item trong set.
      - Tỉ lệ đúng trung bình (sử dụng `listening_attempts`).

- `POST /api/admin/listening/sets`
  - Body: `title`, `jlpt_level`, `description?`, `is_published?`.
  - Tạo set mới trong `listening_sets`.

- `PUT /api/admin/listening/sets/:id`
  - Cập nhật meta: `title`, `jlpt_level`, `description`, `is_published`.

- `DELETE /api/admin/listening/sets/:id`
  - Xóa set (transaction):
    - Xóa `listening_items` thuộc set.
    - Có thể xóa `listening_attempts` liên quan hoặc để lại nếu muốn giữ log (quyết định đơn giản là xóa cùng lúc để tránh rác).

#### 1.4. API quản lý item/câu hỏi nghe

- `GET /api/admin/listening/sets/:setId/items`
  - Trả về danh sách `listening_items` của một set:
    - `item_id`, `exercise_type`, `question`, `audio_url`, `transcript_jp`, `explain_viet`, `options_json`, `words_json`, `correct_index`.
    - Thống kê:
      - Số lần attempt.
      - Tỉ lệ đúng.

- `POST /api/admin/listening/sets/:setId/items`
  - Tạo mới item:
    - Bắt buộc: `exercise_type`, `question`.
    - Tùy loại bài:
      - Multiple choice: `options_json` (array), `correct_index`.
      - Dictation: `transcript_jp`, `explain_viet?`.
      - Sentence ordering: `words_json` hoặc derive từ `transcript_jp`.
    - `audio_url` có thể null, admin upload/generate sau.

- `PUT /api/admin/listening/items/:itemId`
  - Cập nhật các trường trên.

- `DELETE /api/admin/listening/items/:itemId`
  - Xóa item, cân nhắc xóa attempt liên quan.

#### 1.5. API thống kê listening

- `GET /api/admin/listening/stats/overview?level=`
  - Tổng quan:
    - Tổng số set theo level.
    - Tổng số item theo level.
    - Tổng số attempts (`listening_attempts`) theo level.
    - Tỉ lệ đúng trung bình toàn level.
    - Top N item có tỉ lệ đúng thấp nhất:
      - `item_id`, `question`, `set_title`, `wrongCount`, `totalAttempts`, `accuracy`.

- `GET /api/admin/listening/stats/by-set/:setId`
  - Theo từng set:
    - Cho mỗi item: `item_id`, `question`, `totalAttempts`, `correctCount`, `accuracy`.

#### 1.6. Audio tools cho admin

- Reuse các API hiện tại:
  - `POST /api/listening/upload` – upload file audio.
  - `DELETE /api/listening/audio/:filename` – xóa file.
  - `POST /api/listening/generate-audio` – generate audio từ text.
  - `POST /api/listening/generate-audio-batch` – generate hàng loạt.
- Từ UI admin:
  - Gọi trực tiếp các endpoint trên, chỉ thêm lớp kiểm soát ở frontend (chỉ admin mới thấy nút).

---

### 2. Backend – Speaking admin

#### 2.1. Kiến trúc tổng quan

- Reuse `speaking.controller.js` và các route hiện có.
- Thêm nhóm route admin dưới prefix `/api/admin/speaking`.
- Phân quyền giống phần listening.

#### 2.2. API quản lý ngữ liệu nói

- `GET /api/admin/speaking/phrases?level=&topic=&page=&limit=`
  - Dựa trên `speaking_phrases`.
  - Trả về:
    - `phrase_id`, `jp`, `romaji`, `vi`, `topic`, `jlpt_level`, `is_published`, `audio_url`, `created_at`.
    - Thống kê: số attempts, điểm trung bình cho mỗi phrase.

- `POST /api/admin/speaking/phrases`
  - Tạo câu mới:
    - `jp`, `romaji?`, `vi`, `topic?`, `jlpt_level?`, `is_published?`.

- `PUT /api/admin/speaking/phrases/:id`
  - Cập nhật nội dung và trạng thái publish.

- `DELETE /api/admin/speaking/phrases/:id`
  - Xóa phrase, cân nhắc xóa attempts liên quan.

- `POST /api/admin/speaking/phrases/:id/generate-audio`
  - Reuse logic `generatePhraseAudio` hiện có, chỉ đảm bảo route có auth+admin.

#### 2.3. API thống kê speaking

- `GET /api/admin/speaking/stats/overview?level=&topic=`
  - Tổng số phrases.
  - Tổng số attempts (`speaking_attempts`).
  - Điểm trung bình chung (`accuracy_score`).
  - Top N câu:
    - luyện nhiều nhất.
    - có điểm trung bình thấp nhất.

- (Tuỳ chọn) `GET /api/admin/speaking/stats/by-phrase/:id`
  - Chi tiết: danh sách attempt gần đây cho 1 phrase (nếu cần UI chi tiết).

---

### 3. Frontend – Routing và layout admin

#### 3.1. Routing

- Dùng `AdminRoute` để bảo vệ các trang admin mới.
- Thêm route:
  - `/admin/listening` → component `AdminListening`.
  - `/admin/speaking` → component `AdminSpeaking`.
- Cập nhật `Sidebar` để hiển thị menu:
  - "Luyện nghe (Admin)".
  - "Luyện nói (Admin)".
  - Chỉ hiện nếu user là admin (sử dụng role/claims hiện có).

#### 3.2. Sử dụng `AdminLayout`

- Cả hai trang mới bọc bởi `AdminLayout` với title:
  - `AdminLayout title="Quản lý luyện nghe"`.
  - `AdminLayout title="Quản lý luyện nói"`.
- Giữ UI đồng bộ với các trang admin hiện có (`AdminUsers`, `AdminVocab`, `AdminAudit`, ...).

---

### 4. Frontend – Trang AdminListening

#### 4.1. Khối filter + overview

- Thanh filter ở trên:
  - Select `JLPT level` (N5–N1).
  - Có thể thêm filter theo `exercise_type`.
- Card thống kê overview (lấy từ `/api/admin/listening/stats/overview`):
  - Tổng số set.
  - Tổng số câu hỏi.
  - Tổng số lượt làm.
  - Tỉ lệ đúng trung bình.

#### 4.2. Bảng danh sách set

- Bảng chính:
  - Cột: `Tên set`, `Level`, `Số câu`, `Đã xuất bản?`, `Số lượt làm`, `% đúng`, Actions.
  - Action:
    - Xem chi tiết (expand/chi tiết items).
    - Sửa (open modal form).
    - Xóa.
- Nút "Tạo set mới":
  - Mở modal với form: `title`, `jlpt_level`, `description`, `is_published`.

#### 4.3. Quản lý item trong set

- Khi chọn 1 set:
  - Hiện panel/danh sách items bên dưới:
    - Cột: `ID`, `Loại bài`, `Câu hỏi`, `Có audio?`, `Số lượt làm`, `% đúng`, Actions.
  - Nút "Thêm câu hỏi":
    - Form chọn:
      - `exercise_type`.
      - `question`.
      - Tuỳ loại:
        - Multiple choice:
          - Nhập danh sách options (list input).
          - Chọn đáp án đúng (`correct_index`).
        - Dictation:
          - `transcript_jp`, `explain_viet`.
        - Sentence ordering:
          - Nhập `words` hoặc text và tách thành words.
      - Upload/generate audio:
        - Gọi `POST /api/listening/upload` hoặc `POST /api/listening/generate-audio`.
  - Action trên mỗi item:
    - Sửa: mở lại form như trên với data hiện tại.
    - Xóa: gọi API delete item.

---

### 5. Frontend – Trang AdminSpeaking

#### 5.1. Khối filter + overview

- Filter:
  - Level (N5–N1).
  - Topic.
- Thống kê overview (từ `/api/admin/speaking/stats/overview`):
  - Tổng số câu mẫu.
  - Tổng số lượt luyện.
  - Điểm trung bình.
  - Có thể kèm "Top câu khó nhất" (điểm thấp).

#### 5.2. Bảng quản lý phrases

- Bảng:
  - Cột: `ID`, `Câu JP`, `Romaji`, `Nghĩa Việt`, `Topic`, `Level`, `Đã xuất bản?`, `Có audio?`, Actions.
  - Nút "Thêm câu mẫu":
    - Form: `jp`, `romaji`, `vi`, `topic`, `jlpt_level`, `is_published`.
  - Action:
    - Sửa phrase.
    - Xóa phrase.
    - Generate audio nếu chưa có:
      - Gọi `POST /api/admin/speaking/phrases/:id/generate-audio` (hoặc reuse route public nhưng gọi từ admin).

---

### 6. Kiểm thử và quan sát

- Viết test API cho các route admin mới (ít nhất happy path + unauthorized/forbidden).
- Kiểm tra pagination, filter.
- Đảm bảo các route user hiện có (`/api/listening`, `/api/speaking/...`) không bị thay đổi behavior.
- Logging:
  - Log lỗi ngắn gọn, không log dữ liệu nhạy cảm.
  - Có thể ghi admin audit cho các thao tác delete/set quan trọng.

---

### 7. Phạm vi chưa thực hiện

- Không làm dashboard cực kỳ chi tiết theo thời gian (chỉ mức overview và theo set/phrase).
- Không thêm loại bài nghe/nói mới ngoài các loại hiện có trong DB, chỉ hỗ trợ cấu trúc hiện tại.

