# Functional Diagrams for JLPT N5–N1 System

Tài liệu này chứa các sơ đồ Mermaid (Activity + Sequence) cho từng chức năng đã yêu cầu. Dùng để vẽ trực tiếp hoặc dán vào các công cụ hỗ trợ Mermaid.

## 1. Authentication Functions

### 1.1 Registration (Activity)
```mermaid
flowchart TD
  A[User enters email/password/displayName] --> B[Validate input]
  B --> |invalid| C[Show validation error]
  B --> |valid| D[Check existing email via GET /api/users?email=]
  D --> |exists| E[Return 409 Email exists]
  D --> |not exists| F[Hash password (bcrypt)]
  F --> G[Create user record in users]
  G --> H[Generate JWT token]
  H --> I[Return 201 {user, token}]
```

### 1.1 Registration (Sequence)
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend (SignIn)
  participant B as Backend (/api/auth/register)
  participant DB as Database (users)

  U->>F: Submit (email, password, displayName)
  F->>B: POST /api/auth/register
  B->>B: Validate payload (Zod)
  B->>DB: SELECT * FROM users WHERE email
  alt email exists
    DB-->>B: user row
    B-->>F: 409 Email exists
    F-->>U: Show error
  else email not exists
    DB-->>B: null
    B-->>B: bcrypt.hash(password)
    B->>DB: INSERT new user
    DB-->>B: user created
    B-->>B: jwt.sign(...)
    B-->>F: 201 {user, token}
    F-->>U: Redirect /home
  end
```

### 1.2 Login (Activity)
```mermaid
flowchart TD
  A[User enters email/password] --> B[Send POST /api/auth/login]
  B --> C[Validate input]
  C --> D[Find user by email from DB]
  D --> |not found| E[401 Wrong credentials]
  D --> |found| F[Check is_active]
  F --> |false| G[403 Account inactive]
  F --> |true| H[bcrypt.compare]
  H --> |wrong| E
  H --> |correct| I[Update last_login]
  I --> J[Check admin role in admins table]
  J --> K[Get personal room state]
  K --> L[Return user+token]
```

### 1.2 Login (Sequence)
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend (SignIn)
  participant B as Backend (/api/auth/login)
  participant DB as Database

  U->>F: Submit credentials
  F->>B: POST /api/auth/login
  B->>B: Validate payload
  B->>DB: SELECT users WHERE email
  alt no user
    DB-->>B: null
    B-->>F: 401
    F-->>U: show error
  else user exists
    DB-->>B: user row
    B->>B: compare password
    alt wrong
      B-->>F: 401
    else ok
      B->>DB: UPDATE last_login
      B->>DB: SELECT admins WHERE user_id
      B->>B: getPersonalRoomStateForUser
      B-->>F: 200 {user, token}
      F-->>U: redirect
    end
  end
```

### 1.3 Logout (Activity)
```mermaid
flowchart TD
  A[User clicks Sign out] --> B[Clear localStorage token]
  B --> C[Navigate /signin]
```

### 1.3 Logout (Sequence)
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend

  U->>F: Click logout
  F->>F: localStorage.removeItem('token')
  F->>F: navigate('/signin')
```

### 1.4 Forgot Password (Activity)
```mermaid
flowchart TD
  A[User input email] --> B[POST /api/auth/forgot-password]
  B --> C[Validate email]
  C --> D[Find user]
  D --> |no user| E[Return success message generic]
  D --> |user| F[Set reset token + expiry]
  F --> G[sendPasswordResetEmail]
  G --> H[Return success message]
```

### 1.4 Forgot Password (Sequence)
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend
  participant DB as Database

  U->>F: Submit email
  F->>B: POST /api/auth/forgot-password
  B->>B: Validate email
  B->>DB: SELECT user where email
  alt no user
    B-->>F: 200 {message}
  else user found
    B->>DB: UPDATE user reset_token, reset_token_expires
    B->>B: sendPasswordResetEmail
    B-->>F: 200 {message}
  end
  F-->>U: show notice
```

### 1.5 Reset Password (Activity)
```mermaid
flowchart TD
  A[User visits link với token + new password] --> B[POST /api/auth/reset-password]
  B --> C[Validate token + password]
  C --> D[Find user where reset_token/token expiry > now]
  D --> |none| E[400 Token invalid]
  D --> |found| F[Hash password]
  F --> G[Save password_hash và clear token]
  G --> H[Return success]
```

### 1.5 Reset Password (Sequence)
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend
  participant DB as Database

  U->>F: Submit token + new password
  F->>B: POST /api/auth/reset-password
  B->>B: Validate request
  B->>DB: SELECT user where reset_token and expiry
  alt invalid
    B-->>F: 400
  else valid
    B->>B: bcrypt.hash(password)
    B->>DB: UPDATE password_hash/reset_token null
    B-->>F: 200
  end
  F-->>U: show success
```

## 2. Learning Functions

### 2.1 Reading Practice
#### Activity
```mermaid
flowchart TD
  A[User chọn level/exerciseType] --> B[GET /api/reading?level=&exerciseType=]
  B --> C[Backend fetch reading sets/items]
  C --> D[Flatten exercises]
  D --> E[Return exercises]
  E --> F[User chọn bài]
  F --> G[GET /api/reading/:id]
  G --> H[Show passage + questions]
  H --> I[Submit answer -> POST /api/reading/check... hoặc /attempt]
```

#### Sequence
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend
  participant DB as Database

  U->>F: choose level N4
  F->>B: GET /api/reading?level=N4
  B->>DB: SELECT reading_sets/items
  DB-->>B: data
  B-->>F: exercises list
  U->>F: choose exercise 123
  F->>B: GET /api/reading/123
  B->>DB: SELECT reading_items where id
  DB-->>B: item
  B-->>F: item detail
  U->>F: answer
  F->>B: POST /api/reading/check-fill-in-the-blank
  B->>DB: SAVE reading_attempt (if auth)
  B-->>F: result
```

### 2.2 Listening Practice
#### Activity
```mermaid
flowchart TD
  A[User chọn level] --> B[GET /api/listening?level=]
  B --> C[API trả item+audio]
  C --> D[Play audio (frontend control)]
  D --> E[Submit MCQ/caption/raw text]
  E --> F[POST /api/listening/attempt hoặc /check-dictation]
  F --> G[Return score]
  G --> H[Optional: GET /api/listening/review (auth)]
```

#### Sequence
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend
  participant DB as Database

  U->>F: choose level N3
  F->>B: GET /api/listening?level=N3
  B->>DB: SELECT set/items
  DB-->>B: data
  B-->>F: listening items
  U->>F: play audio, respond
  F->>B: POST /api/listening/attempt
  B->>DB: INSERT listening_attempt
  DB-->>B: saved
  B-->>F: {score}
  U->>F: request review
  F->>B: GET /api/listening/review?level=N3
  B->>DB: SELECT attempts/collections
  B-->>F: review data
```

### 2.3 Speaking Practice
#### Activity
```mermaid
flowchart TD
  A[User chọn phrase level/topic] --> B[GET /api/speaking/phrases]
  B --> C[Show phrase list]
  C --> D[Option generate audio / practice]
  D --> |generate| E[POST /api/speaking/phrases/:id/generate-audio]
  D --> |practice| F[user ghi âm/audio file]
  F --> G[POST /api/speaking/practice (multipart)]
  G --> H[Service xử lý STT + đánh giá]
  H --> I[Save speaking_attempt]
  I --> J[Trả feedback+score]
```

#### Sequence
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend
  participant DB as Database

  U->>F: request phrases
  F->>B: GET /api/speaking/phrases
  B->>DB: SELECT phrases
  B-->>F: list
  U->>F: select phrase 42
  F->>B: POST /api/speaking/phrases/42/generate-audio
  B-->>F: audio file link
  U->>F: upload recording
  F->>B: POST /api/speaking/practice (audio)
  B->>B: process audio; STT & scoring
  B->>DB: INSERT speaking_attempt
  DB-->>B: saved
  B-->>F: score
```

### 2.4 Chatbot AI
#### Activity
```mermaid
flowchart TD
  A[User opens Chatbot] --> B[GET /api/chat/sessions]
  B --> C[Show existing sessions]
  C --> D[User selects/creates session]
  D --> E[User gửi message]
  E --> F[POST /api/chat/send]
  F --> G[AI backend xử lý + lưu message]
  G --> H[GET /api/chat/messages/:session_id]
  H --> I[Hiển thị trả lời]
```

#### Sequence
```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend
  participant DB as Database

  U->>F: load page
  F->>B: GET /api/chat/sessions
  B->>DB: SELECT chat_sessions
  B-->>F: sessions
  U->>F: send msg
  F->>B: POST /api/chat/send
  B->>DB: INSERT message, maybe create session
  B-->>F: bot response
  F-->>U: show chat
```

## 3. Administrator / Management Functions

### 3.1 User Management
#### Sequence
```mermaid
sequenceDiagram
  participant Admin
  participant FE as Frontend Admin
  participant BE as Backend Admin
  participant DB as Database

  Admin->>FE: open "User Management"
  FE->>BE: GET /api/admin/users
  BE->>DB: SELECT users
  DB-->>BE: list
  BE-->>FE: list
  Admin->>FE: choose user & click deactivate
  FE->>BE: POST /api/admin/users/:id/deactivate
  BE->>DB: UPDATE user is_active=false
  DB-->>BE: ok
  BE-->>FE: success
```

### 3.2 Admin Management
#### Sequence
```mermaid
sequenceDiagram
  participant Superadmin
  participant FE
  participant BE
  participant DB

  Superadmin->>FE: promote user to admin
  FE->>BE: POST /api/admin/users/:id/promote
  BE->>DB: INSERT/UPDATE admins table
  DB-->>BE: ok
  BE-->>FE: success
```

### 3.3 Reading/Listening/Speaking Content Management
#### Activity
```mermaid
flowchart TD
  A[Admin mở module quản lý Reading/Listening/Speaking] --> B[GET /api/admin/<type>/sets or /phrases]
  B --> C[Hiện danh sách]
  C --> D[Add/Edit/Delete]
  D --> |Add| E[POST /api/admin/..]
  D --> |Edit| F[PUT/PATCH /api/admin/..]
  D --> |Delete| G[DELETE /api/admin/..]
  E/F/G --> H[DB cập nhật (insert/update/delete)]
  H --> I[BE trả về success]
```

### 3.4 Admin Audit Log
#### Activity
```mermaid
flowchart TD
  A[Admin mở Audit Log] --> B[GET /api/admin/audit]
  B --> C[Return operations list]
  C --> D[Hiển thị filter/chi tiết]
```

#### Sequence
```mermaid
sequenceDiagram
  participant Admin
  participant FE
  participant BE
  participant DB

  Admin->>FE: Request audit history
  FE->>BE: GET /api/admin/audit
  BE->>DB: SELECT admin_audit
  DB-->>BE: records
  BE-->>FE: records
  FE-->>Admin: display
```
