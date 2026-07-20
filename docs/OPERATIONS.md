# OPERATIONS — running MatList in production (Phase 4.3)

คู่มือ ops สำหรับ self-host (Next.js + PostgreSQL หลัง reverse proxy ของเราเอง)

## Monitoring

- **Uptime**: ชี้ uptime monitor (เช่น Uptime Kuma / cron + curl) ที่ `GET /api/health`
  — ตอบ `200 {ok:true}` เมื่อแอป+DB ปกติ, `503` เมื่อ DB ล่ม ไม่ต้อง auth และไม่มีข้อมูลอ่อนไหว
- **Error log**: ทุก error boundary (`app/error.tsx`, `app/global-error.tsx`) และ
  `track()` ที่พังจะ `console.error` พร้อม prefix (`[route-error]`, `[global-error]`,
  `[analytics]`) — ผูก log-based alert กับ prefix เหล่านี้ได้ทันที
- **Error tracking vendor** (Sentry ฯลฯ): ยังไม่ผูก — จุดเสียบคือ error boundary
  ทั้งสองไฟล์ + `lib/analytics/track.ts` (catch block) ถ้าจะใช้ ให้เพิ่ม DSN ผ่าน env
- **Funnel/พฤติกรรม**: `/ops/metrics` (อีเมลใน `OPS_EMAILS` เท่านั้น) — ดู funnel
  สองฝั่ง + จำนวน event ย้อนหลัง 30 วัน

## Backup / restore

- สคริปต์: `./scripts/backup.sh [dir]` — `pg_dump` custom format + บีบอัด,
  ลบ dump เก่ากว่า `RETENTION_DAYS` (ค่าเริ่มต้น 14 วัน)
- Cron แนะนำ (ทุกวัน 03:00):
  `0 3 * * * cd /srv/matlist && DATABASE_URL=... ./scripts/backup.sh /srv/backups`
- **เก็บสำเนานอกเครื่องด้วย** (rsync/rclone ไป object storage) — dump ในเครื่องเดียว
  ไม่ใช่ backup จริง
- Restore: `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>.dump`
  แล้วรัน `npx prisma migrate deploy` เผื่อ schema ใหม่กว่า dump
- **ซ้อม restore** อย่างน้อยไตรมาสละครั้ง — backup ที่ไม่เคย restore = ไม่มี backup

## Rate limits (in-process, `lib/rate-limit.ts`)

| Surface | Key | Limit |
|---|---|---|
| Login | email | 10 / 15 นาที |
| Register | IP | 5 / ชม. |
| ส่ง RFQ | designer org | 30 / ชม. |
| ส่งข้อความแชท | user | 60 / นาที |
| เสนอราคา | seller org | 60 / ชม. |
| Parse ไฟล์นำเข้า | user | 20 / 10 นาที |

- เกิน limit → `429` + header `Retry-After` (login คืน error message ใน form)
- Store เป็น **in-memory ต่อ instance** — พอสำหรับ deployment เครื่องเดียวตาม
  ARCHITECTURE; ถ้า scale หลาย instance ให้เปลี่ยน store หลังฟังก์ชัน `consume`
  เป็น shared store (จุดเดียว, call site ไม่ต้องแก้)

## Security posture

- **Headers** (next.config.ts): `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  ปิด camera/mic/geolocation, `HSTS` 2 ปี (TLS จบที่ reverse proxy)
- **Auth**: bcrypt cost 12, รหัสผ่าน 8–72 ตัว (72 = จุดตัด bcrypt), JWT session,
  brute-force throttle ต่อบัญชี
- **AuthZ**: ทุก query scoped ด้วย orgId ที่ service layer; role gates ผ่าน
  `lib/permissions` (pure + tested); billing = owner เท่านั้น; ห้ามองค์กรไร้เจ้าของ
- **RFQ privacy (กติกาข้อ 4)**: ทุก shape ที่ผู้ขายอ่านผ่าน projection ที่ตัด
  ตัวตนผู้ออกแบบ — มี unit test + เคยตรวจ runtime (ดู PR #17)
- **Audit log**: ทุก mutation ที่แตะราคา/สถานะ RFQ/สเปก เขียน `AuditLog` ใน
  transaction เดียวกัน
- รอบ security review เต็ม (3 audit ขนาน + แก้ครบ): PR #17

## Env ที่ ops ต้องรู้ (`.env.example`)

- `DATABASE_URL` — Postgres
- `AUTH_SECRET`, `AUTH_TRUST_HOST=true` — NextAuth หลัง proxy ตัวเอง
- `OPS_EMAILS` — อีเมลที่เข้าหน้า `/ops/metrics` ได้ (คั่นด้วย comma; ว่าง = ปิด)
