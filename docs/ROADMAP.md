# ROADMAP — งานสำหรับ Claude Code (เรียงตามลำดับ ห้ามข้าม phase)

แต่ละ task มี acceptance criteria (AC) — ต้องผ่านครบก่อนถือว่าเสร็จ
เขียน test สำหรับ business logic ทุกตัว ก่อนขึ้น task ถัดไปให้ commit

---

## PHASE 0 — ตั้งโครง (ก่อนเขียน feature)
> เป้า: repo รันได้ มี CI มี schema พร้อมต่อยอด

- [ ] **0.1 Scaffold โปรเจกต์** — Next.js + TS + Tailwind + Prisma + PostgreSQL(docker-compose สำหรับ dev)
  - AC: `npm run dev` ขึ้นหน้าเปล่าได้ · `.env.example` ครบ · README บอกวิธีรัน
- [ ] **0.2 วาง Prisma schema ตาม DATA_MODEL.md** — migrate + seed ตัวอย่าง (วัสดุ ~30 ตัวจาก prototype, 2 org designer/seller)
  - AC: `prisma migrate` ผ่าน · seed แล้ว query ได้ · ครบทุกตารางใน DATA_MODEL
- [x] **0.3 ตั้ง i18n (TH default, EN toggle) + ระบบ auth 2 บทบาท**
  - AC: สมัคร/login/logout ได้ · แยก designer/seller · หน้าใน (designer)/(seller) ต้อง login · สลับภาษาทั้งเว็บได้
- [x] **0.4 ย้าย design system จาก prototype** — สี ปุ่ม การ์ด modal ขอบมน เงานุ่ม (ดู reference/) เป็น component ใช้ซ้ำ
  - AC: มี component library พื้นฐาน (Button, Card, Modal, StatusChip, Swatch) ตรงกับ prototype

## PHASE 1 — Core: ตารางสเปก (คุณค่าตั้งแต่ยังไม่มีผู้ขาย)
> เป้า: ผู้ออกแบบทำตารางสเปกจริงจนออฟฟิศเลิกใช้ Excel

- [x] **1.1 CRUD โปรเจกต์ + หลายโปรเจกต์** — list, สร้าง, duplicate, archive
  - AC: สร้าง/เปิด/ลบได้ · ข้อมูลอยู่ใน DB (รีเฟรชไม่หาย) · duplicate คัดลอกโครง
- [x] **1.2 ตารางสเปก + แก้ inline** — code/zone/qty แก้ได้ · เพิ่ม/ลบแถว · sort
  - AC: แก้แล้วบันทึกจริง · รหัสแก้อิสระ · มี audit log
- [x] **1.3 หลายตัวเลือกต่อรายการ (SpecOption)** — เก็บ option, confirm, ตัดทิ้ง
  - AC: 1 รายการมีได้ ≤4 ตัวเลือก · confirm แล้วสถานะเปลี่ยน · logic สถานะมี test
- [x] **1.4 คลังวัสดุ + ค้นหา + filter หมวด** — จากหน้าเลือกหมวดก่อน → คลัง
  - AC: search ทำงาน (ชื่อ/แบรนด์/รุ่น/sku) · เรียงตามความตรงสเปกเท่านั้น (กติกาข้อ 1) · เพิ่มวัสดุลงรายการได้
- [x] **1.5 มุมมองตาราง 4 แบบ** — full / compact / grid / material board
  - AC: สลับได้ · board แสดง swatch ตาม option · ตรง prototype
- [x] **1.6 Spec Book export (PDF)** — มีข้อมูลผู้ผลิตครบ + โลโก้ท้าย + versioned
  - AC: export PDF จริง · เก็บเวอร์ชันใน DB · รายการ option แสดงหมายเหตุ
- [x] **1.7 นำเข้า Excel** — อัปโหลด .xlsx/.csv + วางจากคลิปบอร์ด → สร้างโปรเจกต์
  - AC: parse หัวคอลัมน์ TH/EN · preview ก่อนยืนยัน · เก็บ mapping ที่ใช้บ่อย

## PHASE 2 — Core: RFQ ข้ามคนจริง (เครื่องยนต์รายได้)
> เป้า: ท่อ RFQ ทำงานถึงผู้ขายจริง — ถ้าพังทั้งโมเดลพัง

- [ ] **2.1 สร้าง+ส่ง RFQ** — เลือกหลายรายการ → ยืนยัน (กำหนดตอบ/โน้ต/ตัวอย่าง) → สร้าง RFQ+Recipient
  - AC: ส่งขอทุกตัวเลือก · privacy: ไม่เปิด contact ผู้ออกแบบ (กติกาข้อ 4) · มี sla_due_at
- [ ] **2.2 ส่งแจ้งผู้ขายผ่าน LINE + email** — รวมถึงผู้ขายที่ยังไม่สมัคร (cold start)
  - AC: LINE Messaging API ต่อจริง · **มี flag ให้มนุษย์ตรวจก่อนส่งหา contact ที่ยังไม่สมัคร (PDPA, กติกาข้อ 5)** · ห้าม auto-scrape
- [ ] **2.3 ผู้ขายเปิด+ตอบ RFQ (Quote Builder)** — ตอบได้แม้ยังไม่สมัครเต็ม · ราคา/lead/เงื่อนไข/หมดอายุ
  - AC: quote บันทึก · ราคาวิ่งกลับเข้าตารางผู้ออกแบบ · สร้าง account เงียบตอนตอบ
- [ ] **2.4 ผู้ออกแบบเทียบใบเสนอ + เลือก** — ตารางเทียบราคาจริง → เลือกเจ้า → แจ้งผลเจ้าที่ไม่ได้เลือก
  - AC: เลือกแล้วบันทึกราคาจริง · RFQ→closed_won/lost · ผู้ขายที่แพ้ได้แจ้ง (มารยาท)
- [ ] **2.5 แชท 2 ฝั่ง** — ผูกบริบทโปรเจกต์ · เริ่ม polling ก่อนได้
  - AC: ส่ง/รับข้อความ · ผู้ขายเห็นบริบทสเปก

## PHASE 3 — Workspace 2 ฝั่ง (จัดการ + monetize)
- [ ] **3.1 Designer: Dashboard + Billing + แผน** — งานค้าง, VE savings, แผน Free/Pro/Studio, ใบกำกับภาษี
- [ ] **3.2 Designer: Template & Material Sets (Studio gate)** — บันทึก/ใช้ซ้ำ, ล็อกหลังแผน Studio
  - AC: gate ทำงาน · apply set ลงโปรเจกต์ได้
- [ ] **3.3 Seller: Dashboard (SLA card) + RFQ tabs + Materials + ฟอร์มสินค้า**
  - AC: SLA countdown จริง · completeness score · สินค้าที่ publish โผล่ในคลัง
- [ ] **3.4 Seller: Performance + Brands + Admin Console(routing/roles)**
- [ ] **3.5 Payment จริง** (Omise/2C2P) + ออกใบกำกับภาษี + webhook
  - AC: จ่ายได้ · ออกใบกำกับภาษีเต็มรูป · อัปเกรด/ดาวน์เกรดแผน

## PHASE 4 — ก่อน launch
- [ ] **4.1 ตรวจ PDPA + terms/privacy** (ต้องมีมนุษย์/ทนายร่วม — Claude Code เตรียมร่าง+จุดที่ต้องตรวจ)
- [ ] **4.2 Analytics ถาวร** (แทนแผงวัดผล in-session ของ prototype) — track funnel ทั้ง 2 ฝั่ง
- [ ] **4.3 Monitoring/error tracking/backup** + rate limit + security review
- [ ] **4.4 Seed ข้อมูลวัสดุจริงจากผู้ขาย 20-30 ราย** (งานคน + AI ช่วยแปลง spec sheet)

---

## จุดที่ Claude Code ต้อง"หยุดถามมนุษย์" (ไม่ตัดสินเอง)
- อะไรก็ตามที่กระทบกติกาเหล็ก 5 ข้อใน CLAUDE.md
- การส่ง RFQ หา contact ที่ยังไม่สมัคร (PDPA)
- การเปลี่ยน relation หลักใน DATA_MODEL
- การเลือก payment/legal vendor
