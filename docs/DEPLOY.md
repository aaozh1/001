# DEPLOY — ขึ้น production จริง

คู่มือติดตั้ง MatList บนเซิร์ฟเวอร์จริง เขียนให้ทำตามได้ทีละขั้น (หรือส่งให้คนดูแลระบบทำแทนได้ทั้งไฟล์)
คู่กันกับ `docs/OPERATIONS.md` (การดูแลหลังขึ้นระบบ: backup, monitoring, rate limit)

---

## 0. สิ่งที่ต้องเตรียมก่อนเริ่ม

| สิ่งที่ต้องมี | สเปก/หมายเหตุ | ราคาโดยประมาณ |
|---|---|---|
| เซิร์ฟเวอร์ (VPS) | Ubuntu 22.04+ · RAM ≥ 2GB · ดิสก์ ≥ 25GB (DigitalOcean, Vultr, AWS Lightsail ฯลฯ) | ~300-700 บาท/เดือน |
| โดเมน | เช่น `matlist.co.th` — ชี้ **A record** มาที่ IP เซิร์ฟเวอร์ | ~350-800 บาท/ปี |
| อีเมลทีม | ไว้ใส่ `OPS_EMAILS` และรับแจ้งเตือน | — |

> ⚠️ **ก่อนเปิดรับผู้ใช้จริง**: เอกสารใน `docs/legal/` ต้องผ่านทนายตรวจก่อน (ดู PDPA_REVIEW_CHECKLIST.md) — ขึ้นระบบเพื่อทดสอบภายใน/ปิดรับสมัครไปพลางได้

มีสองทางเลือก — **แนะนำทาง A (Docker)** ถ้าไม่มีเหตุผลเฉพาะ:

- **ทาง A — Docker Compose**: คำสั่งเดียวได้ครบทั้ง แอป + ฐานข้อมูล + HTTPS
- **ทาง B — ติดตั้งตรงบน Ubuntu**: ควบคุมละเอียดกว่า เหมาะถ้ามีคนดูแลระบบอยู่แล้ว

---

## ทาง A — Docker Compose (แนะนำ)

### A1. ติดตั้ง Docker บนเซิร์ฟเวอร์

```bash
curl -fsSL https://get.docker.com | sh
```

### A2. ดึงโค้ด

```bash
git clone https://github.com/aaozh1/001.git /srv/matlist
cd /srv/matlist
```

### A3. ตั้งค่า

สร้างไฟล์ `deploy/.env.prod`:

```bash
# รหัสผ่านฐานข้อมูล — ตั้งใหม่ให้เดายาก
DB_PASSWORD=<รหัสยาวๆ>
# กุญแจเซ็น session — สร้างด้วยคำสั่ง: openssl rand -base64 32
AUTH_SECRET=<ผลจาก openssl rand -base64 32>
# อีเมลที่เข้าหน้า /ops/metrics ได้ (คั่นด้วย comma)
OPS_EMAILS=you@company.co.th
```

แก้ `deploy/Caddyfile` — เปลี่ยน `matlist.example.com` เป็นโดเมนจริง (DNS ต้องชี้มาแล้ว)

### A4. รัน

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

รอ build เสร็จ (ครั้งแรก ~5 นาที) — migration รันอัตโนมัติตอนแอปสตาร์ต แล้วเปิด `https://โดเมนของคุณ` ได้เลย (Caddy ออกใบรับรอง HTTPS ให้อัตโนมัติ)

### A5. เช็คว่ารอด

```bash
curl -s https://โดเมนของคุณ/api/health   # ต้องได้ {"ok":true,"db":true,...}
docker compose -f deploy/docker-compose.prod.yml logs app --tail 20
```

---

## ทาง B — ติดตั้งตรงบน Ubuntu (ไม่ใช้ Docker)

> ขั้นตอนนี้คือ flow เดียวกับที่ใช้ตรวจสอบระบบมาตลอดการพัฒนา (build → migrate → start)

### B1. ติดตั้งของพื้นฐาน

```bash
sudo apt update
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
# PostgreSQL 16
sudo apt install -y postgresql-16
# Caddy (reverse proxy + HTTPS อัตโนมัติ)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### B2. สร้างฐานข้อมูล + ผู้ใช้ระบบ

```bash
sudo -u postgres psql -c "CREATE USER matlist WITH PASSWORD '<รหัสยาวๆ>';"
sudo -u postgres psql -c "CREATE DATABASE matlist OWNER matlist;"
sudo useradd -r -m -d /srv/matlist -s /bin/bash matlist
```

### B3. ดึงโค้ด + ตั้งค่า

```bash
sudo -u matlist git clone https://github.com/aaozh1/001.git /srv/matlist
cd /srv/matlist
sudo -u matlist tee .env > /dev/null <<'EOF'
DATABASE_URL="postgresql://matlist:<รหัส>@localhost:5432/matlist?schema=public"
AUTH_SECRET="<ผลจาก openssl rand -base64 32>"
AUTH_TRUST_HOST=true
OPS_EMAILS="you@company.co.th"
EOF
sudo chmod 600 .env
```

### B4. Build + migrate

```bash
sudo -u matlist bash -c 'cd /srv/matlist && npm ci && npx prisma migrate deploy && npm run build'
```

### B5. ตั้งเป็น service (รีบูตแล้วขึ้นเอง)

```bash
sudo cp deploy/matlist.service /etc/systemd/system/matlist.service
sudo systemctl daemon-reload
sudo systemctl enable --now matlist
systemctl status matlist --no-pager
```

### B6. Reverse proxy

แก้ `/etc/caddy/Caddyfile` เป็น:

```
โดเมนของคุณ {
	reverse_proxy 127.0.0.1:3000
	encode gzip
}
```

แล้ว `sudo systemctl reload caddy` — เปิด `https://โดเมนของคุณ` ได้เลย

---

## ตาราง Environment Variables (ทั้งสองทาง)

| ตัวแปร | จำเป็น | ความหมาย |
|---|---|---|
| `DATABASE_URL` | ✅ | สาย Postgres — ห้ามใช้รหัส dev (`matlist:matlist`) บน production |
| `AUTH_SECRET` | ✅ | กุญแจเซ็น session — `openssl rand -base64 32` · **เปลี่ยน = ทุกคนหลุด login** |
| `AUTH_TRUST_HOST` | ✅ `true` | จำเป็นเพราะ self-host หลัง reverse proxy (ดู docs/DECISIONS.md) |
| `OPS_EMAILS` | แนะนำ | อีเมลที่เปิดหน้า `/ops/metrics` (funnel) ได้ — ว่าง = ปิดหน้านี้ |

## ข้อมูลตั้งต้น

- **ห้ามรัน seed บน production** (`prisma db seed` คือข้อมูลเดโม่ + รหัสผ่านสาธารณะ)
- บัญชีแรก: เปิดเว็บ → สมัครสมาชิก (เลือกฝั่งผู้ออกแบบ/ผู้ขาย) — คนแรกขององค์กรได้สิทธิ์เจ้าของอัตโนมัติ
- วัสดุจริงจากผู้ขาย 20-30 ราย = ROADMAP 4.4 (ให้ผู้ขายกรอกผ่านหน้า "สินค้าของฉัน" หรือทีมช่วยคีย์)

## หลังขึ้นระบบ (สรุปจาก docs/OPERATIONS.md)

1. **Backup อัตโนมัติ** — เพิ่ม cron (ทาง B ตรง ๆ; ทาง A ใช้ `docker compose exec db pg_dump ...` หรือ mount สคริปต์):
   ```
   0 3 * * * cd /srv/matlist && DATABASE_URL=... ./scripts/backup.sh /srv/backups
   ```
   และ sync `/srv/backups` ออกนอกเครื่อง (rclone ไป object storage)
2. **Uptime monitor** — ชี้ที่ `GET /api/health` (ฟรี: UptimeRobot / Uptime Kuma)
3. ทดสอบ `https://โดเมน/ops/metrics` ด้วยอีเมลใน `OPS_EMAILS`

## การอัปเดตเวอร์ชัน

ทาง A:
```bash
cd /srv/matlist && git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

ทาง B:
```bash
cd /srv/matlist
sudo -u matlist git pull
sudo -u matlist bash -c 'npm ci && npx prisma migrate deploy && npm run build'
sudo systemctl restart matlist
```

**Rollback**: `git checkout <commit เดิม>` แล้ว build/restart ซ้ำ — ⚠️ migration ของเราเป็นแบบเพิ่มอย่างเดียว (additive) จึงถอยโค้ดได้โดยไม่ต้องถอย DB; ถ้าข้อมูลพัง ให้ restore จาก backup (ดู OPERATIONS.md)

## Checklist ก่อนเปิดตัวจริง

- [ ] `docs/legal/` ผ่านทนาย + ลบแบนเนอร์ "ฉบับร่าง" (แก้ใน `lib/i18n/messages/*` key `legal.draftBanner`)
- [ ] `AUTH_SECRET` + รหัส DB เป็นค่า production (ไม่ใช่ค่า dev/ตัวอย่าง)
- [ ] Backup cron ทำงาน + ลอง restore หนึ่งครั้ง
- [ ] Uptime monitor เขียว
- [ ] Smoke test กติกาเหล็ก: สมัคร 2 ฝั่ง → สร้างโปรเจกต์ → ส่ง RFQ → ฝั่งผู้ขายต้องไม่เห็นอีเมล/เบอร์ผู้ออกแบบ → เสนอราคา → เทียบ+เลือก
- [ ] ยังไม่เปิด 2.2 (LINE outreach) จนกว่า checklist ข้อ A1 ผ่านทนาย
