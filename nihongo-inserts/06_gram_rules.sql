-- ==========================================================================
-- Quy tắc ngữ pháp chi tiết (bảng grammar_rules): mã rule, pattern đúng/sai,
-- giải thích JP/VI, thể loại, tần suất. Hỗ trợ gợi ý và kiểm tra lỗi thực tế.
-- Bảng: grammar_rules. Phụ thuộc: không.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `grammar_rules`
--

INSERT INTO `grammar_rules` (`grammar_rule_id`, `rule_code`, `rule_name_jp`, `rule_name_viet`, `pattern`, `error_pattern`, `correct_pattern`, `explanation_viet`, `explanation_jp`, `jlpt_level`, `category`, `frequency`) VALUES
(1, 'PARTICLE_WO_NI_001', '移動動詞の助詞「を」と「に」', 'Trợ từ を và に với động từ di chuyển', '行く/来る/帰る + を/に', '(行く|来る|帰る) + を + (場所)', '(行く|来る|帰る) + に + (場所)', 'Với động từ di chuyển (行く, 来る, 帰る), dùng に để chỉ địa điểm đến, を để chỉ nơi đi qua.', '移動動詞（行く、来る、帰る）では、到達点には「に」を使い、通過点には「を」を使います。', 'N5', 'PARTICLE', 85),
(2, 'POLITE_JANAI_DEWANAI_001', '否定形「じゃない」と「ではありません」', 'Thể phủ định lịch sự', 'じゃない vs ではありません', 'です/ます体 + じゃない', 'です/ます体 + ではありません', 'Trong văn phong lịch sự (です・ます体), dùng ではありません thay vì じゃない.', '丁寧体（です・ます体）では、「じゃない」ではなく「ではありません」を使います。', 'N5', 'POLITE_FORM', 70),
(3, 'VERB_DEWA_JA_001', '「では」と「じゃ」の使い分け', 'Phân biệt では và じゃ', 'では vs じゃ', 'です体 + じゃ', 'です体 + では', 'Trong văn phong trang trọng, dùng では thay vì じゃ. じゃ là cách nói thân mật.', '丁寧な言い方では「じゃ」ではなく「では」を使います。「じゃ」はくだけた表現です。', 'N5', 'POLITE_FORM', 65),
(4, 'PARTICLE_WO_ACTION_001', '動作の対象の助詞「を」', 'Trợ từ を chỉ đối tượng của hành động', 'V[他動詞] + を', 'V[他動詞] + が', 'V[他動詞] + を', 'Với động từ tha động từ (transitive verbs), dùng を để chỉ đối tượng trực tiếp của hành động.', '他動詞では、動作の直接的な対象に「を」を使います。', 'N5', 'PARTICLE', 80),
(5, 'PARTICLE_NI_PURPOSE_001', '目的を表す「に」', 'Trợ từ に biểu thị mục đích', 'N/V[ます stem] + に + 行く/来る', 'N/V[ます stem] + で + 行く/来る', 'N/V[ます stem] + に + 行く/来る', 'Khi biểu thị mục đích đi/đến đâu, dùng に sau danh từ hoặc động từ thể ます (bỏ ます).', '目的を表すときは、名詞または動詞のます形（ますを取った形）の後に「に」を使います。', 'N5', 'PARTICLE', 75),
(6, 'VERB_TE_FORM_001', 'て形の基本', 'Thể て cơ bản', 'V[て]', 'V[辞書形] + ます', 'V[て]', 'Thể て dùng để nối câu, yêu cầu lịch sự, hoặc biểu thị hành động đang diễn ra.', 'て形は文を接続する、丁寧な依頼、動作の継続などを表します。', 'N5', 'VERB_CONJUGATION', 90),
(7, 'VERB_NAI_FORM_001', 'ない形の作り方', 'Cách tạo thể ない', 'V[ない]', 'V[辞書形] + ない', 'V[ます stem] + ない', 'Thể ない được tạo bằng cách lấy gốc ます và thêm ない. Với động từ nhóm 1, âm cuối い thành わ.', 'ない形は、ます形の語幹に「ない」を付けます。第1グループ動詞では、い段をわ段に変えます。', 'N5', 'VERB_CONJUGATION', 85),
(8, 'ADJECTIVE_NA_I_001', 'な形容詞とい形容詞の否定', 'Tính từ な và い thể phủ định', 'なadj[ではない] / いadj[くない]', 'なadj[じゃない] / いadj[ない]', 'なadj[ではない] / いadj[くない]', 'Tính từ な phủ định: ではない. Tính từ い phủ định: くない (bỏ い + くない).', 'な形容詞の否定：ではない。い形容詞の否定：くない（いを取って＋くない）。', 'N5', 'TENSE', 70),
(9, 'TENSE_PRESENT_FUTURE_001', '現在形と未来形の使い分け', 'Phân biệt hiện tại và tương lai', 'V[辞書形] / V[ます]', 'V[た] (過去) cho tương lai', 'V[辞書形] / V[ます] cho tương lai', 'Trong tiếng Nhật, hiện tại và tương lai thường dùng chung một hình thức.', '日本語では、現在形と未来形は同じ形を使うことが多いです。', 'N5', 'TENSE', 60),
(10, 'PARTICLE_GA_SUBJECT_001', '主語を表す「が」', 'Trợ từ が chỉ chủ ngữ', 'N + が + V/Adj', 'N + は + (thay cho が)', 'N + が + V/Adj', 'が dùng để chỉ chủ ngữ mới xuất hiện, nhấn mạnh chủ thể hành động.', '「が」は、新情報の主語や動作主を強調するときに使います。', 'N5', 'PARTICLE', 80),
(11, 'PARTICLE_WA_TOPIC_001', '主題を表す「は」', 'Trợ từ は chỉ chủ đề', 'N + は + V/Adj', 'N + が + (khi cần chỉ chủ đề)', 'N + は + V/Adj', 'は dùng để giới thiệu chủ đề đã biết, thông tin chung về người/vật.', '「は」は、既知の話題や一般的な情報について話すときに使います。', 'N5', 'PARTICLE', 85),
(12, 'QUESTION_WORD_DOCO_001', '疑問詞「どこ」の使い方', 'Cách dùng nghi vấn từ どこ', 'どこ + ですか/ありますか', 'どこ + を/が (sai trợ từ)', 'どこ + ですか/ありますか', 'どこ (ở đâu) dùng để hỏi địa điểm. Thường đi với ですか hoặc ありますか.', '「どこ」は場所を尋ねる疑問詞です。「ですか」や「ありますか」と一緒に使います。', 'N5', 'OTHER', 65),
(13, 'EXISTENCE_ARU_IRU_001', '存在動詞「ある」と「いる」', 'Động từ tồn tại ある và いる', '物が ある / 人が いる', '人が ある / 物が いる', '物が ある / 人が いる', 'ある dùng cho vật vô tri. いる dùng cho người/động vật có tri giác.', '「ある」は無生物に、「いる」は人や動物などの生物に使います。', 'N5', 'VERB_CONJUGATION', 75),
(14, 'NUMBER_COUNTER_001', '助数詞「つ」の使い方', 'Cách dùng trợ số từ つ', '数 + つ', '数 + 個 (cho đồ vật nhỏ)', '数 + つ', 'つ là trợ số từ đa dụng, dùng cho đồ vật nhỏ không có trợ số từ riêng. Dùng từ 1-9.', '「つ」は汎用性のある助数詞で、特別な助数詞がない小さな物に使います。1〜9まで使えます。', 'N5', 'OTHER', 70),
(15, 'TIME_EXPRESSION_001', '時間の表現「時」と「時間」', 'Diễn đạt thời gian: 時 và 時間', '時 (giờ) vs 時間 (khoảng thời gian)', '3時に勉強しました (khi muốn nói thời lượng)', '3時間勉強しました', '時 chỉ thời điểm (3 giờ). 時間 chỉ khoảng thời gian (3 tiếng).', '「時」は時刻を、「時間」は時間の長さを表します。', 'N5', 'TENSE', 60);
