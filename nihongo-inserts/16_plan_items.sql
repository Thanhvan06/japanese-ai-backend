-- ==========================================================================
-- Chi tiết từng ngày trong kế hoạch (bảng study_plan_items): ngày học, số từ cần học.
-- Bảng: study_plan_items. Phụ thuộc: plan_id trong study_plans.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `study_plan_items`
--

INSERT INTO `study_plan_items` (`item_id`, `plan_id`, `study_date`, `required_vocab_count`) VALUES
(29, 5, '2025-12-23', 28),
(30, 5, '2025-12-24', 28),
(31, 5, '2025-12-25', 28),
(32, 5, '2025-12-26', 28);
