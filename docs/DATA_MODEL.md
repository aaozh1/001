# Data Model — MatList

อ่านไฟล์นี้ก่อนเขียน migration ใด ๆ นี่คือ schema ที่ตัดสินใจแล้ว การเปลี่ยน relation หลักต้องถามผู้ใช้ก่อน

หมายเหตุ: เขียนเป็น Prisma-style เพื่อความชัด ปรับ syntax ตาม ORM จริงได้

## แผนภาพความสัมพันธ์ (ระดับสูง)
```
User ──< Membership >── Organization (ออฟฟิศ หรือ บริษัทผู้ขาย)
Organization(designer) ──< Project ──< SpecItem ──< SpecOption >── Material
SpecItem ──< RFQ ──< Quote >── Organization(seller)
Material >── Brand >── Organization(seller)
Material ──< Review
Project ──< SpecBook (versioned)
Organization ──< Subscription ──< Invoice
* ──< AuditLog
```

## ตารางหลัก

### User
- id, email, name, phone, locale (th/en, default th)
- professional_license (เลขใบประกอบวิชาชีพ ภ.สถ. — ใช้ verify ผู้ออกแบบจริง; nullable)
- created_at

### Organization
ใช้ตัวเดียวแทนทั้ง "ออฟฟิศออกแบบ" และ "บริษัทผู้ขาย" แยกด้วย type
- id, name, **type** (designer | seller), tax_id
- verified (bool — ผ่านการตรวจ DBD/ภพ.20 แล้ว)
- addresses (JSON: ที่อยู่จัดส่งตัวอย่าง/คลัง หลายที่ได้)
- created_at

### Membership (User ↔ Organization, many-to-many + role)
- id, user_id, org_id
- **role**: designer side → owner | editor | viewer ; seller side → owner | manager | sales | content
- ดู permissions/ ว่าแต่ละ role ทำอะไรได้

### Project (ของ Organization type=designer)
- id, org_id, name, building_type, status (active | waiting_client | delivered | archived)
- created_by, created_at, updated_at

### SpecItem (รายการในตารางสเปก) ★ ตารางที่สำคัญที่สุด
- id, project_id
- **code** (รหัสตำแหน่ง เช่น FL-01 — แก้ได้อิสระ)
- zone (ตำแหน่งใช้งาน), category (ตระกูลวัสดุ; nullable ตอนยังไม่เลือก)
- qty, qty_unit
- **confirmed_material_id** (nullable — วัสดุที่ confirm แล้ว; ตัวเลือกอยู่ใน SpecOption)
- status: derived จากข้อมูล (empty | options | chosen | sent | quoted) — คิดใน logic ไม่ต้องเก็บ
- sort_order
- created_at, updated_at

### SpecOption (ตัวเลือกวัสดุของ SpecItem — หลายตัวต่อรายการ)
- id, spec_item_id, material_id
- is_confirmed (bool)
- added_at
- **เหตุผลที่แยกตาราง**: ผู้ออกแบบเก็บตัวเลือกไว้ก่อน แล้วค่อย confirm/ตัดทิ้ง; RFQ ส่งขอทุกตัวเลือกได้

### VEHistory (ประวัติการปรับ VE ต่อ SpecItem)
- id, spec_item_id, from_material_id, to_material_id, saved_percent, created_at
- **ห้ามลบของเดิมเมื่อ VE** — เก็บประวัติเสมอ

### Material
- id, seller_org_id, brand_id
- name_th, name_en, model, sku, category (ตระกูลวัสดุ)
- color, size, price, unit
- spec (JSON ตาม schema ของหมวด — เช่น กระเบื้อง {water_abs, r_rating, edge}; ฐานของ search + VE)
- cert, lead_time, moq, warranty, note_th, note_en
- swatch_hex, images (array), specsheet_url, catalog_url, bim_url
- status (draft | published | hidden | suspended)
- completeness (คิดจากความครบของ field — ไม่ใช่การซื้ออันดับ)
- created_at, updated_at

### Brand (ผู้ขายหนึ่งรายดูแลได้หลายแบรนด์)
- id, seller_org_id, name, logo_url, story, authorization_doc_url (หนังสือแต่งตั้งตัวแทน)

### RFQ (ใบขอราคา — อ้างอิง SpecItem)
- id, spec_item_id, project_id (denormalize เพื่อ query เร็ว)
- created_by, deadline, note, want_sample (bool)
- status (open | quoted | closed_won | closed_lost | expired)
- sla_due_at (สำหรับ countdown ฝั่งผู้ขาย)
- created_at
- **privacy**: ผู้ขายเห็น project/zone/spec/qty แต่ **ไม่เห็น contact ผู้ออกแบบ** จนกว่าจะมี Quote ที่ผู้ออกแบบ engage

### RFQRecipient (RFQ หนึ่งใบส่งถึงผู้ขายหลายราย)
- id, rfq_id, seller_org_id, material_id (ตัวเลือกที่เกี่ยวกับผู้ขายนี้)
- delivered_via (line | email | in_app), opened_at, responded_at

### Quote (ใบเสนอราคาจากผู้ขาย)
- id, rfq_id, seller_org_id
- price_per_unit, project_discount, lead_time, payment_terms, valid_until
- specsheet_url, include_sample (bool)
- status (submitted | selected | rejected)
- created_at

### Review (รีวิววัสดุ — เฉพาะผู้เคยสั่งซื้อ/ขอตัวอย่างผ่านระบบ)
- id, material_id, user_id, role (architect | contractor | designer | owner)
- stars (1-5), body_th, body_en
- **verified_purchase (bool — ต้อง true ถึงจะแสดง)** กัน review ปลอม
- created_at

### Template & MaterialSet (ฟีเจอร์ Studio)
- Template: id, org_id (nullable=system), name, building_type, structure (JSON โครงรหัส)
- MaterialSet: id, org_id, name, material_ids (array)

### Subscription / Invoice
- Subscription: id, org_id, plan (designer: free|pro|studio ; seller: free|standard|premium), seats, current_period_end
- Invoice: id, org_id, amount, tax_invoice_url (ใบกำกับภาษีเต็มรูป — บังคับมี), issued_at

### AuditLog
- id, org_id, user_id, entity_type, entity_id, action, diff (JSON), created_at
- บันทึกทุก mutation ที่แตะราคา/สถานะ RFQ/สเปก

### ChatThread / ChatMessage
- Thread: id, designer_org_id, seller_org_id, project_id (บริบท)
- Message: id, thread_id, sender_user_id, body, attachments, created_at

### EngagementEvent / SellerWallet / CreditTransaction (Phase 5 — FOUNDATION, inert)
> ข้อเสนอ: `docs/proposals/MONETIZATION_REWORK.md` · schema ลงแล้วแต่ **ปิดสวิตช์**
> (billing gate ด้วย ENV `ENGAGEMENT_BILLING_ENABLED`, default OFF) ยังไม่ผูก flow จริง
- **EngagementEvent**: id, type (sample_request | contact_request | quote_request),
  designer_org_id, seller_org_id, spec_item_id?, material_id?, rfq_id?, credit_cost
  (placeholder 0 จน validate ราคา), billing_status, dedup_key (unique — กัน broadcast), created_at
  - sample_request / contact_request = **PDPA-gated** (เก็บที่อยู่จัดส่ง/เปิดเผย contact) → เปิดไม่ได้จนทนายอนุมัติ (กติกาข้อ 5)
  - spec_sync **ไม่อยู่** ที่นี่ — เก็บเป็น AnalyticsEvent เท่านั้น (ไม่ผูก billing)
  - ราคาอิง *type* ล้วน เท่ากันทุกผู้ขาย (กติกาข้อ 2)
- **SellerWallet**: id, org_id (unique), balance_credits, updated_at — prepaid, พึ่ง Phase 3.5 (payment)
- **CreditTransaction**: id, wallet_id, type (topup | debit | refund | adjustment), amount, balance_after, engagement_id?, invoice_id?, note, created_at

## Index ที่ต้องมี (performance)
- Material: (category, status), (seller_org_id), full-text บน name_th/name_en/brand/model/sku
- RFQ: (status, sla_due_at), (project_id)
- SpecItem: (project_id, sort_order)
- EngagementEvent: unique(dedup_key), (seller_org_id, type, billing_status), (designer_org_id)
