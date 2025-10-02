# 🎬 Python Backend Toolkit

Bộ script trong thư mục `python-be/` chịu trách nhiệm chuẩn hóa video gốc, tạo transcript và sinh `plan.json` đúng với flow Remotion hiện tại. Output cuối sẽ được copy sang `remotion-app/public/` để Remotion render tự động.

## 🚀 Quy trình nhanh

1. **Chuẩn bị môi trường**
   ```bash
   cd python-be
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

2. **Đặt dữ liệu đầu vào**
   - Video gốc: `python-be/inputs/input.mp4` (có thể truyền đường dẫn khác khi chạy script).
   - Nếu muốn dùng Gemini để lập kế hoạch: tạo `.env` với `GEMINI_API_KEY=...` (tùy chọn `GEMINI_MODEL`).
   - SFX dùng trong highlight phải tồn tại trong `remotion-app/public/sfx/` với path tương đối chuẩn (ví dụ `ui/pop.mp3`, `whoosh/whoosh.mp3`).

3. **Chạy toàn bộ pipeline**
   ```bash
   # macOS/Linux
   ./run_all.sh                     # hoặc ./run_all.sh path/to/video.mp4

   :: Windows
   run_all.bat                      # hoặc run_all.bat path\to\video.mp4
   ```

   Script sẽ:
   - Auto-Editor: cắt khoảng lặng → `outputs/stage1_cut.mp4`.
   - Whisper: tạo transcript SRT → `outputs/stage1_cut.srt`.
   - Sinh `plan.json` (ưu tiên Gemini, fallback mapping tĩnh).
   - Copy `stage1_cut.mp4` và `plan.json` vào `remotion-app/public/` với tên `input.mp4` và `plan.json`.

4. **Render bằng Remotion**
   ```bash
   cd ../remotion-app
   npm install
   npm run render                   # sinh out/final.mp4
   ```

## 📄 Cấu trúc `plan.json`

Plan khớp với schema Remotion (`remotion-app/src/data/planSchema.ts`):

```json
{
  "segments": [
    {
      "id": "segment-01",
      "sourceStart": 0.0,
      "duration": 12.5,
      "label": "Giới thiệu đề bài",
      "transitionOut": {"type": "crossfade", "duration": 0.6}
    },
    {
      "id": "segment-02",
      "sourceStart": 14.1,
      "duration": 18.2,
      "transitionIn": {"type": "crossfade", "duration": 0.6},
      "transitionOut": {"type": "slide", "duration": 0.5, "direction": "left"}
    }
  ],
  "highlights": [
    {
      "id": "highlight-01",
      "text": "Key insight: tăng trưởng 200%",
      "start": 5.8,
      "duration": 2.6,
      "position": "center",
      "animation": "zoom",
      "sfx": "emphasis/ding.mp3"
    }
  ]
}
```

- `sourceStart` và `duration` được tính theo giây của video đã trim (`input.mp4`).
- `transitionIn`/`transitionOut` hỗ trợ các `type`: `cut`, `crossfade`, `slide`, `zoom`, `scale`, `rotate`, `blur` (slide có thể thêm `direction`: `left|right|up|down`; zoom/scale/rotate/blur có thể thiết lập `intensity` ~0.1–0.35).
- Highlight mặc định xoay vòng animation (`fade/zoom/slide/bounce/float/flip`) và chọn vị trí (`center/bottom/top`). Nếu rule SFX có `volume`, giá trị được giữ lại (0–1).

## 🤖 Gemini Planner (tuỳ chọn)

- Script `scripts/make_plan_gemini.py` gửi transcript sang Gemini và normalize về schema trên.
- Cần biến môi trường `GEMINI_API_KEY` (và tuỳ chọn `GEMINI_MODEL`).
- Nếu Gemini lỗi, pipeline sẽ tự động fallback `scripts/make_plan_from_srt.py` dựa trên `plan/mapping.json`.

### Tuỳ chỉnh mapping thủ công

- `plan/mapping.json` cho phép định nghĩa rule cho segment, transition, SFX.
- Bạn có thể bổ sung/tinh chỉnh rule để ảnh hưởng tới kết quả fallback.
- Các highlight fallback sẽ lấy nội dung câu thoại quan trọng và đính SFX theo rule `sfx` phù hợp.

## 🧪 Các file trung gian

| File | Vai trò |
|------|---------|
| `outputs/stage1_cut.mp4` | Video đã loại bỏ khoảng lặng (được copy sang Remotion). |
| `outputs/stage1_cut.srt` | Transcript Whisper. |
| `outputs/plan.json` | Plan cuối cùng (trước khi copy sang Remotion). |
| `remotion-app/public/input.mp4` | Video đầu vào cho Remotion. |
| `remotion-app/public/plan.json` | Plan Remotion sử dụng khi render. |

## 🔧 Troubleshooting

- **Thiếu `stage1_cut.srt`**: kiểm tra Whisper đã cài thành công (`pip install -r requirements.txt`) và có GPU/CPU hỗ trợ.
- **Plan không có highlight**: đảm bảo rule SFX trong `mapping.json` khớp transcript, hoặc thêm hướng dẫn khi gọi Gemini.
- **Render Remotion lỗi vì thiếu SFX**: chắc chắn path SFX trong `plan.json` (vd `ui/pop.mp3`) tồn tại trong `remotion-app/public/sfx/`.
- **Muốn debug kế hoạch**: mở `outputs/plan.json` để xem dữ liệu trước khi Remotion đọc.

Bộ script giờ đã khớp hoàn toàn với Remotion pipeline – chỉ cần chạy `run_all`, sau đó render trong `remotion-app` là có thể xuất `final.mp4` với segment, transition, highlight và SFX đồng bộ.
