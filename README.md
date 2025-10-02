# Video Automation Pipeline

Hệ thống này dựng video tự động dựa trên Remotion, MoviePy, Auto-Editor, Whisper và một file kế hoạch (`plan.json`) sinh ra từ AI/Python. Repo gồm:

- `python-be/`: các script backend (chưa chỉnh sửa trong nhiệm vụ này).
- `remotion-app/`: project Remotion dựng video cuối.

## Kiến trúc tổng quan

1. Python/AI phân tích `input.mp4`, sinh `plan.json` chứa danh sách segment, highlight và thông tin hiệu ứng.
2. Remotion đọc `input.mp4`, `plan.json`, thư mục `sfx/` để dựng timeline:
   - Cắt video thành các đoạn (`segments`).
   - Áp dụng transition (crossfade/slide).
   - Render text highlight với animation (fade/zoom/slide).
   - Ghép SFX tương ứng highlight.
3. Xuất video cuối `final.mp4` bằng `npx remotion render`.

## Chuẩn bị dữ liệu đầu vào

1. Đặt video gốc vào `remotion-app/public/input.mp4`.
2. Đặt file kế hoạch thật vào `remotion-app/public/plan.json`. Thư mục `public/` chứa sẵn `plan.sample.json` để tham khảo cấu trúc:

```json
{
  "segments": [
    {
      "id": "intro",
      "sourceStart": 0,
      "duration": 20,
      "transitionOut": {"type": "crossfade", "duration": 1}
    }
  ],
  "highlights": [
    {
      "id": "hook",
      "text": "Điểm nhấn chính xuất hiện!",
      "start": 5,
      "duration": 4,
      "position": "center",
      "animation": "zoom",
      "sfx": "pop.mp3"
    }
  ]
}
```

3. Đặt các hiệu ứng âm thanh trong `remotion-app/public/sfx/` (ví dụ `pop.mp3`).

> **Lưu ý:** Mặc định composition dùng `planExample` trong code để preview. Khi render dữ liệu thực tế hãy truyền props để dùng `plan.json`:
>
> ```bash
> npx remotion render src/Root.tsx FinalVideo out/final.mp4 --props '{"plan":null,"planPath":"plan.json","inputVideo":"input.mp4"}'
> ```
>
> Khi props `plan` là `null`, component sẽ tự đọc file `plan.json` trong `public/`.

Nếu video cuối dài hơn 15 phút, cập nhật `DEFAULT_DURATION_IN_FRAMES` trong `remotion-app/src/config.ts` để phù hợp với thời lượng mới.

## Chạy preview & render

```bash
cd remotion-app
npm install
npm start          # Mở Remotion Studio preview
# hoặc
npm run render     # Xuất video ra out/final.mp4
```

Output cuối được lưu trong `remotion-app/out/final.mp4`.

## Cấu trúc Remotion

- `src/types.ts`: Định nghĩa type cho segments, highlights, transitions.
- `src/data/planSchema.ts`: Schema Zod + ví dụ plan.
- `src/hooks/usePlan.ts`: Hook tải & validate `plan.json`.
- `src/components/VideoTimeline.tsx`: Cắt video theo segments, xử lý transition.
- `src/components/HighlightCallout.tsx` + `HighlightsLayer.tsx`: Text overlay với animation.
- `src/components/SfxLayer.tsx`: Chèn SFX theo highlight.
- `src/components/FinalComposition.tsx`: Ghép toàn bộ timeline.
- `src/Root.tsx`: Đăng ký composition Remotion.

## Mở rộng

- Có thể kết hợp pipeline Python để tự sinh `plan.json` từ MoviePy/Auto-Editor.
- Tích hợp Whisper để tạo transcript và highlight tự động.
- Thêm background music track bằng cách mở rộng `FinalComposition`.
- Sử dụng metadata (ví dụ tag `cameraMovement`) trong `plan.json` để tạo animation nâng cao.

## Tiêu chí chất lượng

- Video không bị khung đen giữa các đoạn.
- Transition mượt, highlight xuất hiện đúng thời điểm & kèm SFX.
- Animation tinh gọn, giữ phong cách YouTube cơ bản.
