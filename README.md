# MatList

> วัสดุครบ จบที่ลิสต์เดียว — Every material. One list.

เครื่องมือทำ **ตารางสเปกวัสดุ** สำหรับสถาปนิกไทย ที่ต่อท่อส่งใบขอราคา (RFQ)
ไปหาผู้ขายวัสดุในตัว มีผู้ใช้ 2 ฝั่งที่แยก workspace กัน: **ผู้ออกแบบ (Designer)**
และ **ผู้ขาย (Seller)**

รายละเอียดทั้งหมดอยู่ใน `docs/` — เริ่มที่ [`CLAUDE.md`](./CLAUDE.md) และ
[`docs/ROADMAP.md`](./docs/ROADMAP.md)

## Tech stack

| ชั้น | เทคโนโลยี |
|---|---|
| Frontend / Backend | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma ORM |
| Dev database | Docker Compose |

ดูเหตุผลการเลือก stack ใน [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## ความต้องการของเครื่อง (Prerequisites)

- **Node.js** ≥ 20 (พัฒนาด้วย v22)
- **npm** ≥ 10
- **Docker** + **Docker Compose** (สำหรับฐานข้อมูล dev)

## เริ่มใช้งาน (Getting started)

```bash
# 1) ติดตั้ง dependencies
npm install

# 2) เตรียมไฟล์ env (แล้วแก้ค่าตามต้องการ)
cp .env.example .env

# 3) รันฐานข้อมูล Postgres สำหรับ dev
npm run db:up          # = docker compose up -d db

# 4) สร้างตาราง + generate client
npm run db:migrate

# 5) ใส่ข้อมูลตัวอย่าง (2 org designer/seller + วัสดุ 29 ตัว + โปรเจกต์ตัวอย่าง)
npm run db:seed

# 6) รัน dev server
npm run dev
```

เปิด <http://localhost:3000> จะเห็นหน้าแรกของ MatList (สลับภาษา TH/EN ได้ที่มุมขวาบน)

### เข้าสู่ระบบด้วยบัญชีตัวอย่าง (หลัง seed)

| บทบาท | อีเมล | รหัสผ่าน | เข้า workspace |
|---|---|---|---|
| ผู้ออกแบบ (designer) | `designer@matlist.dev` | `matlist1234` | `/designer` |
| ผู้ขาย (seller) | `seller@matlist.dev` | `matlist1234` | `/seller` |

หรือกด **สมัครสมาชิก** เพื่อสร้างบัญชีใหม่ (เลือกบทบาท designer/seller ตอนสมัคร)
แต่ละบทบาทเข้าได้เฉพาะ workspace ของตัวเอง — เข้าผิดฝั่งจะถูกพากลับ workspace ที่มีสิทธิ์
โดยอัตโนมัติ ส่วนหน้า `/designer` `/seller` ต้อง login ก่อนเสมอ

> หมายเหตุ: ถ้าไม่มี Docker แต่มี PostgreSQL 16 ในเครื่องอยู่แล้ว ให้สร้าง role
> `matlist` (password `matlist`, สิทธิ์ `CREATEDB` สำหรับ shadow db ของ Prisma)
> + database `matlist` แล้วใช้ `DATABASE_URL` เดิมได้เลย

## สคริปต์ที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server (Next.js) |
| `npm run build` | build production |
| `npm run start` | รัน production build |
| `npm run lint` | ตรวจ ESLint |
| `npm run typecheck` | ตรวจ TypeScript (`tsc --noEmit`) |
| `npm test` | รัน unit test (Vitest — permissions / i18n / validation) |
| `npm run db:up` / `db:down` | เปิด/ปิดฐานข้อมูล dev (Docker) |
| `npm run db:migrate` | สร้าง/รัน Prisma migration |
| `npm run db:seed` | ใส่ข้อมูลตัวอย่าง (idempotent — รันซ้ำได้) |
| `npm run db:reset` | ล้าง+migrate+seed ใหม่ทั้งหมด |
| `npm run db:studio` | เปิด Prisma Studio |

## โครงสร้างโปรเจกต์

```
app/                 Next.js App Router (หน้าเว็บ + API routes)
lib/                 business logic + prisma client (db.ts)
prisma/              schema.prisma + migrations
docs/                เอกสารสถาปัตยกรรม/ข้อมูล/roadmap/การตัดสินใจ
reference/           prototype อ้างอิง UX/flow (React หน้าเดียว)
CLAUDE.md            กติกา + วิธีทำงานสำหรับพัฒนาต่อ
```

โครงสร้างเป้าหมายเต็ม (workspace 2 ฝั่ง, catalog, business logic modules)
อยู่ใน [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## กติกาเหล็ก (อ่านก่อนพัฒนา)

MatList มีกติกาที่ห้ามละเมิด — เช่น **ความเป็นกลางของผลค้นหา** (ห้ามซื้ออันดับ),
ราคา lead เดียวทุกเจ้า, ขายข้อมูล aggregate เท่านั้น, และความเป็นส่วนตัวของ RFQ
รายละเอียดครบใน [`CLAUDE.md`](./CLAUDE.md)
