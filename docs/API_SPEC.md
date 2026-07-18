# API Spec — endpoint หลัก (ย่อ)

REST-style ผ่าน Next.js route handlers ทุก endpoint ต้องเช็คสิทธิ์ตาม role (ดู permissions/)
รูปแบบ error สม่ำเสมอ: `{ error: { code, message } }` · ทุก list มี pagination

## Auth
- POST /api/auth/register   {email, role: designer|seller}
- POST /api/auth/login
- POST /api/auth/logout

## Projects (designer)
- GET/POST      /api/projects
- GET/PATCH/DEL /api/projects/:id
- POST          /api/projects/:id/duplicate
- POST          /api/projects/:id/spec-book        → สร้าง PDF version

## Spec items
- GET/POST      /api/projects/:id/items
- PATCH/DEL     /api/items/:id                      (แก้ code/zone/qty → audit log)
- POST/DEL      /api/items/:id/options              (เพิ่ม/ตัดตัวเลือก)
- POST          /api/items/:id/confirm              {material_id}
- POST          /api/items/:id/ve                   → คืนตัวเลือกเทียบเท่า (spec-matching/)

## Catalog / materials
- GET  /api/materials?category=&q=&page=            (เรียงตามความตรงสเปกเท่านั้น — กติกาข้อ 1)
- GET  /api/materials/:id                           (+ reviews, seller, related)
- GET  /api/sellers/:id/materials

## Materials (seller)
- GET/POST      /api/seller/materials
- PATCH/DEL     /api/seller/materials/:id
- POST          /api/seller/materials/import        (Excel bulk)
- PATCH         /api/seller/materials/:id/status    (publish/hide)

## RFQ
- POST /api/rfq                                      {item_ids[], deadline, note, want_sample}
- GET  /api/rfq  (designer: ของตัวเอง / seller: ที่ได้รับ — filter ตาม role)
- POST /api/rfq/:id/quote                           (seller ตอบ)
- POST /api/rfq/:id/select                           {quote_id}  → won/lost + แจ้งผล
- ** ห้ามคืน contact ผู้ออกแบบใน response ฝั่ง seller จนกว่าจะมี engagement (กติกาข้อ 4) **

## Chat
- GET/POST /api/threads · GET/POST /api/threads/:id/messages

## Billing
- GET  /api/billing/subscription
- POST /api/billing/checkout                        (Omise/2C2P)
- POST /api/webhooks/payment                        (verify signature เสมอ)
- GET  /api/billing/invoices                        (ใบกำกับภาษีเต็มรูป)

## หลักความปลอดภัยทุก endpoint
- ตรวจ session + role + ownership (org ตรงกับ resource)
- mutation แตะราคา/สถานะ → เขียน AuditLog
- validate input (zod) ทุกตัว
