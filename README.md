# ติวนักวิชาการคอมพิวเตอร์ กรมที่ดิน

เว็บสำหรับทำข้อสอบและอ่านสรุปเนื้อหาจากเล่มน้ำตาล 1–2 มีข้อสอบ 3,446 ข้อ แบ่ง 29 บท (21 บทจากเล่ม + บทเสริม 2-11 เรื่อง Subnet / RAID / File System + เล่ม 3 แนวสอบกระทรวงการคลัง 7 บท) บทละ 3 ด่าน มีโหมดจำลองสอบกรมที่ดินและจำลองสอบกระทรวงการคลัง และบันทึกความคืบหน้าลง PostgreSQL

- **เล่ม 3 · แนวสอบกระทรวงการคลัง** (บท `3-1` ถึง `3-7`) แยกตาม 7 หมวดของคู่มือเตรียมสอบ ได้แก่ เครือข่าย/ไซเบอร์, Data Center, Server/PC, ระบบสารสนเทศ/ฐานข้อมูล, การพัฒนาโปรแกรม, กฎหมายดิจิทัล และจริยธรรม กค. ข้อสอบอยู่ที่ `pipeline/lv2_q/MOF*.jsonl` (371 ข้อ) ด่านแบ่งตามความยาก: ด่าน 1 ง่าย · ด่าน 2 กลาง · ด่าน 3 ยาก/สถานการณ์ สรุปเนื้อหาอยู่ที่ `pipeline/sum/B3-*.md` และสัดส่วนจำลองสอบ (`#/mockmof`) อยู่ที่ `MOF_GROUPS` ใน `pipeline/site_meta.py`

- เว็บจริง: http://210.246.215.122:3000 (ไม่มีรหัสผ่าน)
- push ขึ้น `main` แล้ว GitHub Actions จะตรวจ build และ deploy ขึ้นเซิร์ฟเวอร์ให้อัตโนมัติ

## โครงสร้าง

| โฟลเดอร์ | หน้าที่ |
|---|---|
| `web/` | แอป Next.js หน้าเว็บอยู่ที่ `public/app.js` (vanilla JS ใช้ hash routing) ส่วน API บันทึกความคืบหน้าอยู่ที่ `app/api/*` |
| `web/public/data`, `web/public/img` | ข้อสอบ สรุปเนื้อหา และรูป ที่ export มาจาก `pipeline/` |
| `pipeline/` | สคริปต์ Python และข้อมูลต้นทางที่ใช้สร้างคลังข้อสอบ (`questions.json`, `sum/*.md`, `real_q/`, `lv2_q/`, `rev/`, `imgs/`) |
| `deploy/` | สคริปต์ฝั่งเซิร์ฟเวอร์ ได้แก่ สร้าง `.env` และสำรองฐานข้อมูลรายวัน |
| `docker-compose.yml` | stack ที่รันบนเซิร์ฟเวอร์ (web + postgres) |

## แก้ข้อสอบหรือสรุปเนื้อหา

```bash
cd pipeline
python assemble.py      # รวม raw.json + real_q/ + lv2_q/ เป็น questions.json
python export_web.py    # คัดลอกข้อมูลไป web/public/data และ web/public/img
python build_site.py    # (ถ้าต้องการ) สร้างไฟล์ HTML ออฟไลน์ไฟล์เดียวไว้ที่ dist/
```

จากนั้น commit แล้ว push ระบบจะ deploy ให้เอง

หมายเหตุ: การดึงข้อความจาก PDF ต้นฉบับ (`build_raw.py`, `extract_lines.py`) ต้องใช้ไฟล์ติวต้นฉบับ ซึ่งไม่ได้เก็บไว้ใน repo

## รันในเครื่อง

```bash
cd web
npm ci
npm run check   # ตรวจข้อมูลข้อสอบ
npm run dev     # ถ้าจะใช้ API ให้ตั้ง DATABASE_URL=postgres://user:pass@host:5432/db
```

ถ้าไม่มีฐานข้อมูล หน้าเว็บยังใช้งานได้ โดยเก็บความคืบหน้าไว้ในเบราว์เซอร์แทน และจะส่งขึ้นเซิร์ฟเวอร์ให้เมื่อเชื่อมต่อได้

## API (ไม่มีการล็อกอิน)

| Method | Path | ใช้ทำอะไร |
|---|---|---|
| GET | `/api/state` | ดึงความคืบหน้าทั้งหมด `{p, bm, hist, o}` |
| POST | `/api/answer` | บันทึกคำตอบ `{items:[{qid, choice, correct, mode}]}` |
| POST | `/api/bookmark` | `{qid, on}` |
| POST | `/api/mock` | บันทึกผลจำลองสอบ `{title, n, ok, used, groups}` |
| POST | `/api/settings` | `{o}` |
| POST | `/api/import` | นำเข้าไฟล์สำรอง `{p, bm, hist, o}` |
| POST | `/api/reset` | ล้างความคืบหน้า |
| GET | `/api/health` | health check |

ตาราง: `answers` (ผลล่าสุดของแต่ละข้อ), `answer_log` (ทุกครั้งที่ตอบ), `bookmarks`, `mock_results`, `settings` ทุกตารางสร้างให้อัตโนมัติตอนเรียกใช้ครั้งแรก

## เซิร์ฟเวอร์

- โฟลเดอร์ `~/exam` บน `wongsakron@210.246.215.122` ไฟล์ `.env` (รหัสผ่านฐานข้อมูล) สร้างอัตโนมัติและอยู่บนเซิร์ฟเวอร์เท่านั้น
- ดู log: `cd ~/exam && sudo docker compose logs -f web`
- สำรองฐานข้อมูล: cron รัน `deploy/backup.sh` ทุกวันตอน 03:00 เก็บไว้ที่ `~/exam/backups` (เก็บ 14 ไฟล์ล่าสุด)
- กู้คืน: `gunzip -c backups/<file>.sql.gz | sudo docker compose exec -T db psql -U exam -d exam`

## GitHub Actions secrets

`SSH_HOST`, `SSH_USER`, `SSH_KEY` (private key สำหรับ deploy โดยเฉพาะ), `SSH_KNOWN_HOSTS` และตั้ง variable `WEB_PORT` ได้ถ้าต้องการ (ค่าเริ่มต้นคือ 3000)
