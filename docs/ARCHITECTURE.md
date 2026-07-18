# สถาปัตยกรรม MatList

## หลักการเลือก stack
เลือกจาก 3 เกณฑ์: (1) Claude Code ทำงานได้คล่อง มี ecosystem ใหญ่ (2) ทีมเล็ก/คนเดียวดูแลไหว (3) รองรับไทย/i18n และ realtime ได้

## Stack ที่แนะนำ (ปรับได้ถ้ามีเหตุผล — บันทึกใน DECISIONS.md)
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind — prototype เป็น React อยู่แล้ว ย้ายง่าย
- **Backend**: Next.js API routes / Route Handlers สำหรับเริ่มต้น (monolith ก่อน แยก service ทีหลังเมื่อจำเป็น)
- **Database**: PostgreSQL + Prisma ORM — relational เหมาะกับข้อมูลที่มีความสัมพันธ์แน่น (โปรเจกต์→รายการ→ตัวเลือก→RFQ)
- **Auth**: NextAuth / Auth.js หรือ Clerk — ต้องรองรับ 2 บทบาท (designer/seller) และทีม (หลาย role)
- **File storage**: S3-compatible (rูปวัสดุ, specsheet PDF, Spec Book export)
- **Realtime**: สำหรับแชท — เริ่มด้วย polling ก่อนได้ ค่อยเปลี่ยนเป็น websocket/Pusher เมื่อ scale
- **Notification**: LINE Messaging API (สำคัญสุดสำหรับ RFQ ถึงผู้ขาย) + email (Resend/SES)
- **Payment**: Omise หรือ 2C2P (รองรับโอน+บัตร+ออกใบกำกับภาษีไทย)
- **i18n**: next-intl หรือ i18next — TH default, EN toggle

## โครงสร้างโปรเจกต์ (เป้าหมาย)
```
/app
  /(marketing)        หน้า public: landing, pricing
  /(designer)         Designer Workspace — ต้อง login role=designer
    /projects/[id]    ตารางสเปก + tabs
    /templates
    /rfq
    /billing
  /(seller)           Seller Center — ต้อง login role=seller
    /rfq
    /materials
    /performance
    /billing
  /catalog            คลังวัสดุ (สาธารณะ + personalized เมื่อ login)
  /api                route handlers
/lib
  /db                 prisma client, queries
  /rfq                business logic การส่ง/สถานะ RFQ (มี test)
  /spec-matching      logic จับคู่สเปก + VE Finder (มี test)
  /permissions        คิดสิทธิ์ผู้ใช้/ทีม (มี test)
  /i18n               dictionaries TH/EN
/prisma
  schema.prisma
  /migrations
/tests
```

## การตัดสินใจเชิงสถาปัตยกรรมที่ห้ามเปลี่ยนโดยไม่ถาม
1. **รายการสเปก (spec_item) มีตัวเลือกวัสดุได้หลายตัว** — RFQ อ้างอิง spec_item ไม่ใช่วัสดุ เพราะวัสดุถูก VE สลับได้แต่ประวัติต้องอยู่ (ดู DATA_MODEL)
2. **รหัสตำแหน่ง (code) แก้ได้อิสระต่อโปรเจกต์** — ห้าม hardcode รหัสมาตรฐาน ทุกออฟฟิศตั้งไม่เหมือนกัน
3. **แยก role designer/seller ตั้งแต่ auth** — ผู้ใช้คนเดียวอาจมีทั้งสอง role ได้ แต่ workspace แยกกัน
4. **ทุก mutation ที่แตะราคา/สถานะ RFQ ต้องมี audit log** — เวลาโดนถาม "ใครเปลี่ยนสเปกตัวนี้"

## Environment
- `.env.example` ต้องมีทุก key ที่ระบบใช้ พร้อม comment ว่าแต่ละตัวคืออะไร
- อย่า commit secret จริง
