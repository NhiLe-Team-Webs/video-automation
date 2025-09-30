# dYZ Video Automation (Open Source)

## Tổng quan
**dYZ Video Automation** giúp bạn biến video thô thành phiên bản đã cắt ghép, thêm hiệu ứng chỉ với một lệnh duy nhất. Bộ công cụ kết hợp Auto-Editor để loại bỏ khoảng lặng, Whisper để tạo phụ đề và MoviePy để áp dụng hiệu ứng dựa trên kế hoạch dựng chi tiết.

### Quy trình xử lý tự động
1. Cắt bỏ khoảng lặng khỏi video gốc.
2. Tạo transcript và tệp phụ đề định dạng `.srt`.
3. Sinh kế hoạch dựng (`plan.json`) từ transcript và `mapping.json`.
4. Áp dụng hiệu ứng, b-roll, SFX, logo để xuất video hoàn chỉnh.

## Tính năng chính
- Tự động hóa toàn bộ pipeline xử lý video ngắn.
- Hỗ trợ chạy một lệnh cho toàn quy trình hoặc từng bước riêng lẻ.
- Tùy chỉnh linh hoạt qua `plan/mapping.json` cho SFX, b-roll, zoom, transition.
- Xuất kèm phụ đề và bản kế hoạch dựng để chỉnh sửa thủ công khi cần.

## Cấu trúc thư mục
```
video-automation/
  assets/
    broll/        # Video phụ trợ (đoạn cắt minh họa)
    brand/        # Logo, intro/outro
    sfx/          # Âm thanh hiệu ứng
    transition/   # Hiệu ứng chuyển cảnh mặc định
  inputs/         # Video đầu vào (ví dụ: 1.mp4)
  outputs/        # Kết quả sau mỗi bước và video cuối
  plan/           # Cấu hình mapping và các bản kế hoạch dựng
  scripts/        # Script tạo plan và áp dụng plan với MoviePy
  run_all.bat     # Pipeline đầy đủ cho Windows
  run_all.sh      # Pipeline đầy đủ cho macOS/Linux
  requirements.txt
```

## Yêu cầu hệ thống
- Windows 10/11, macOS hoặc Linux.
- Python 3.11 trở lên (nên cài đặt từ [python.org/downloads](https://www.python.org/downloads/)).
- `pip` đi kèm Python để cài thư viện.
- FFmpeg được cài và thêm vào `PATH` (`ffmpeg -version` để kiểm tra).
- Gói Python: Auto-Editor, OpenAI Whisper, MoviePy, PyDub (cài bằng `pip`).

## Cài đặt
1. **Tải mã nguồn**
   ```bash
   git clone https://github.com/<your-org>/video-automation.git
   cd video-automation
   ```
   Hoặc tải ZIP từ GitHub, giải nén và mở trong terminal.

2. **Tạo môi trường ảo (khuyến nghị)**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Cài đặt thư viện Python**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Cài FFmpeg**
   - Windows: tải bản build tại [ffmpeg.org/download.html](https://ffmpeg.org/download.html), giải nén, thêm thư mục `bin` vào `PATH`.
   - macOS: dùng `brew install ffmpeg`.
   - Linux: dùng trình quản lý gói (ví dụ `sudo apt install ffmpeg`).

5. **Xác thực cài đặt**
   ```bash
   python --version
   pip list | findstr auto-editor
   ffmpeg -version
   ```

## Chuẩn bị dữ liệu đầu vào
- Đặt video gốc vào `inputs/` và đặt tên theo thứ tự (ví dụ `1.mp4`).
- Tổ chức tài nguyên trong `assets/`:
  - `assets/sfx/`: hiệu ứng âm thanh, ví dụ `applause.mp3`, `ding.mp3`.
  - `assets/broll/`: video minh họa, ví dụ `office.mp4`, `typing.mp4`.
  - `assets/transition/`: clip chuyển cảnh, ví dụ `fade.mov`.
  - `assets/brand/`: logo, intro/outro.
- Điều chỉnh `plan/mapping.json` để map từ khóa sang file asset mong muốn:
  ```json
  {
    "keywords_to_remove": ["um", "uh", "like", "you know"],
    "keywords_to_sfx": {
      "applause": "sfx/applause.mp3",
      "notification": "sfx/notification.mp3"
    },
    "keywords_to_zoom": ["important", "note", "key point"],
    "default_transition": "transition/fade.mov"
  }
  ```

## Chạy pipeline
### Cách nhanh nhất
- **Windows**
  ```powershell
  .\run_all.bat
  ```
- **macOS/Linux**
  ```bash
  chmod +x run_all.sh
  ./run_all.sh
  ```

### Từng bước thủ công
1. Cắt khoảng lặng:
   ```bash
   python -m auto_editor inputs/1.mp4 -o outputs/stage1_cut.mp4 --edit audio:threshold=0.04 --quiet
   ```
2. Tạo transcript và phụ đề tiếng Anh:
   ```bash
   python -m whisper outputs/stage1_cut.mp4 --model small --language en --task transcribe --output_format srt --output_dir outputs
   ```
3. Sinh plan từ transcript:
   ```bash
   python scripts/make_plan_from_srt.py outputs/stage1_cut.srt plan/mapping.json outputs/plan.json
   ```
4. Áp dụng plan với MoviePy:
   ```bash
   python scripts/apply_plan_moviepy.py outputs/stage1_cut.mp4 outputs/plan.json NONE outputs/final.mp4
   ```
   Tham số thứ ba (`NONE`) là đường dẫn logo. Đổi thành file cụ thể hoặc giữ `NONE` nếu không chèn logo.

## Kết quả dự kiến
- `outputs/stage1_cut.mp4`: video đã cắt khoảng lặng.
- `outputs/stage1_cut.srt`: phụ đề tự động.
- `outputs/plan.json`: kế hoạch dựng với thông tin b-roll, SFX, zoom.
- `outputs/final.mp4`: video hoàn chỉnh sau khi áp dụng hiệu ứng.

## Tùy chỉnh nâng cao
- **Bổ sung SFX**: thêm file vào `assets/sfx/` rồi cập nhật `keywords_to_sfx`.
- **Thêm b-roll**: đặt file trong `assets/broll/` và khai báo từ khóa tương ứng.
- **Chỉnh zoom**: sửa danh sách `keywords_to_zoom`.
- **Đổi transition mặc định**: trỏ `default_transition` tới file mới trong `assets/transition/`.
- **Tắt logo**: truyền `NONE` (hoặc để trống) ở bước apply plan.

## Khắc phục sự cố
- `python` hoặc `pip` không nhận diện: đảm bảo đã cài Python 3.11 và thêm vào PATH.
- `ffmpeg` không tìm thấy: mở lại terminal sau khi thêm PATH hoặc kiểm tra cài đặt.
- Whisper báo thiếu GPU: mô hình `small` vẫn chạy được trên CPU, nhưng sẽ lâu hơn.
- Không thấy `outputs/final.mp4`: xem lại log của từng bước, đảm bảo script trong `scripts/` đã được triển khai đầy đủ.

## Lộ trình phát triển
- Hoàn thiện logic trong `scripts/make_plan_from_srt.py` và `scripts/apply_plan_moviepy.py` (hiện để trống).
- Hỗ trợ mô hình ngôn ngữ để sinh plan thông minh hơn.
- Thêm template cho nhiều video đầu vào cùng lúc.
- Bổ sung bộ test tự động và ghi log chi tiết.

## Đóng góp & hỗ trợ
- Tạo issue hoặc pull request nếu bạn phát hiện lỗi hoặc muốn bổ sung tính năng.
- Chia sẻ đề xuất cải tiến qua Discussions/Slack nội bộ nếu có.
- Khi đóng góp, vui lòng mô tả rõ ràng thay đổi và cung cấp bước tái hiện.

Chúc bạn dựng video thật nhanh với dYZ Video Automation!
