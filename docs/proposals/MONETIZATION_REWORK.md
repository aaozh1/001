# ข้อเสนอ — Monetization Rework (Billable Engagement Events)

> **สถานะ: ข้อเสนอ ยังไม่อนุมัติให้ implement**
>
> เอกสารนี้เป็นการ *วิเคราะห์ + ร่าง schema ให้ review* ตามที่ตกลงกัน — **ไม่มีการแก้
> `prisma/schema.prisma`, ไม่มี migration, ไม่มีโค้ด billing ใด ๆ ในงานชุดนี้**
> schema ด้านล่างเป็น "ร่างเพื่ออภิปราย" เท่านั้น
>
> ทุกจุด 🛑 = ต้องให้ **มนุษย์ (และ/หรือ ทนาย) ตัดสินก่อน** ห้าม Claude Code ตัดสินเอง
> (ตาม CLAUDE.md: แตะกติกาเหล็ก + core relation ใน DATA_MODEL + payment)
>
> ที่มา: `MONETIZATION_REWORK_BRIEF.md` (อัปโหลดโดยเจ้าของโปรเจกต์)

---

## 0. สรุปสภาพโค้ดปัจจุบัน (grep ยืนยันแล้ว)

ก่อนตัดสินใจ ควรรู้ว่าของจริงตอนนี้เป็นยังไง:

| หัวข้อ | สภาพจริงในโค้ด | นัยต่อข้อเสนอ |
|---|---|---|
| `SubscriptionPlan` enum | `free, pro, studio` (designer) + `standard, premium` (seller) | เข้ากับข้อเสนอ subscription รายเดือนฝั่งผู้ขายได้ ไม่ต้องแตะ enum |
| `RFQRecipient` | core relation: `rfqId, sellerOrgId, materialId, openedAt, respondedAt`, unique `(rfq,seller,material)`, ผูกกับ `RFQ`→`Quote` | เป็นตัวตั้งต้นของ "engagement event" แต่เป็น **core relation** → 🛑 ห้ามแก้เอง |
| `RFQ.wantSample` | **มี `Boolean @default(false)` อยู่แล้ว** | มี concept "ขอตัวอย่าง" บางส่วนแล้ว → ต้องตัดสินว่าต่อยอด flag เดิม หรือแยกเป็น event ใหม่ |
| `lib/billing/plans.ts` | มีแต่ `DESIGNER_PLANS` (pro 390 / studio 690) | โครงราคา/เครดิตฝั่งผู้ขาย + wallet = **ของใหม่ทั้งหมด** |
| `SellerWallet` / `CreditTransaction` | **ยังไม่มี** | net-new |
| `AnalyticsEvent` + `track()` | มีแล้ว (งาน 4.2) | `spec_sync` เกาะระบบ analytics เดิมได้ ไม่ต้องมีตาราง billing |
| Phase 3.5 (payment จริง) | **ยังไม่ทำ** (`[ ]`) | wallet top-up ต้องพึ่ง payment gateway → พึ่ง 3.5 |
| Phase 4.1 (PDPA/ทนาย) | **ยังค้าง** — "เหลือทนายตรวจ-อนุมัติ" | `sample_request` + `contact_request` เปิดใช้ไม่ได้จนกว่าทนายเซ็น |

**ข้อสรุปสำคัญ:** งานนี้ *ยังไม่อยู่ใน ROADMAP* และ **พึ่ง Phase 4.1 (PDPA) + Phase 3.5 (payment) ที่ยังไม่เสร็จ** — จึงยัง implement ส่วน sample/contact/wallet ไม่ได้เลยจนกว่าจะปลดล็อกด่านเหล่านั้น

---

## 1. ไล่ตอบคำถามเปิด (section 7 ของบรีฟ)

> ข้อเสนอแนะด้านล่างคือ *คำแนะนำเชิงเทคนิค* เพื่อช่วยคุณตัดสิน — **การตัดสินขั้นสุดท้ายเป็นของคุณ**

### Q1. Attribution / dedup — ขอหลายเจ้ารอบเดียว เก็บทุกเจ้า หรือกันซ้ำ/cap? 🛑 (business)
ปัญหา broadcast เดิม (ดีไซเนอร์ยิง RFQ หาผู้ขายหลายเจ้าพร้อมกัน) จะกลายเป็น *ต้นทุนคูณจำนวนเจ้า* ทันทีถ้าเก็บทุก recipient

ทางเลือก:
- **(a) เก็บทุกเจ้า** — รายได้สูงสุด แต่เสี่ยง lead คุณภาพต่ำ + ผู้ขายไม่พอใจว่าจ่ายค่า lead ที่ดีไซเนอร์หว่าน
- **(b) dedup ด้วย `dedupKey`** — กันเก็บซ้ำ *เจ้าเดิม × ดีไซเนอร์เดิม × spec เดิม* ภายในหน้าต่างเวลา (เช่น 24–72 ชม.) → ยิงซ้ำไม่โดนเก็บซ้ำ
- **(c) cap fan-out** — จำกัดจำนวนผู้ขายต่อ RFQ ต่อ spec_item (เช่น ≤ N เจ้า) เพื่อคง lead ให้ตั้งใจ

**คำแนะนำ:** ใช้ **(b) + (c) ร่วมกัน** — เก็บเงินต่อ event ที่ *ส่งถึงจริง* แต่ dedup กันซ้ำในหน้าต่างเวลา และ cap จำนวนเจ้าต่อรอบ เพื่อไม่ให้ broadcast ทำลายคุณภาพ lead **แต่ค่า N + ความยาวหน้าต่างเวลา = คุณตัดสิน 🛑**

### Q2. ยืนยัน `spec_sync` ไม่เก็บเงินผู้ขาย
**คำแนะนำ: ยืนยัน ✅ (ความเสี่ยงต่ำ)** — เหตุผลในบรีฟถูกต้อง: (1) เป็น value ฝั่งดีไซเนอร์ ขายเป็น Pro/Revit อยู่แล้ว → double-charge, (2) ไม่มี action ให้ผู้ขายตอบ, (3) sync หลายตัวเลือกเทียบ = broadcast แบบ RFQ เดิม
→ บันทึกเป็น **analytics signal** ผ่าน `AnalyticsEvent` (มีระบบอยู่แล้ว) **ไม่ผูก billing** ยังต้องให้คุณเคาะยืนยันเป็นทางการ

### Q3. PDPA — ที่อยู่จัดส่ง + เปิดเผย contact 🛑🛑 (รอทนาย — hard blocker)
- `sample_request` เก็บ **ที่อยู่จัดส่ง** (ข้อมูลส่วนบุคคล) แล้วส่งให้ผู้ขาย
- `contact_request` **เปิดเผย contact ดีไซเนอร์** (แม้ดีไซเนอร์ initiate เองก็ยังต้องมี consent + ขอบเขตชัด)

ทั้งคู่ต้อง:
1. flow consent ชัดเจน ณ จุดกด(เก็บอะไร ส่งให้ใคร เพื่ออะไร ถอนได้)
2. ผ่าน **`docs/legal/PDPA_REVIEW_CHECKLIST.md` + ทนายเซ็น** (Phase 4.1 ที่ยังค้าง)

**เปิดใช้ไม่ได้จนกว่าทนายอนุมัติ** — ไม่ใช่เรื่องเทคนิค เป็นด่านกฎหมาย

### Q4. ของแถมฟรี — ผู้ขายที่ให้ตัวอย่างฟรีจะยอมจ่ายค่า lead เพิ่มไหม? 🛑 (validate)
สมมติฐาน: ผู้ขายที่แจกตัวอย่างฟรีอยู่แล้วอาจต้านการจ่าย *ทั้งค่าตัวอย่าง + ค่า lead* → เสี่ยง churn
ทางเลือกบรรเทา (ต้องทดสอบ): `sample_request` คิดถูกกว่า, หรือ bundle ค่า lead ไว้ในราคาตัวอย่าง, หรือให้เครดิตแรกเข้าฟรี
→ ตอบไม่ได้จากในโค้ด **ต้องถามผู้ขายจริง (ผูกกับ Q6)**

### Q5. ผู้ขายได้รับอะไร + ทำ action อะไร ต่อแต่ละ type (ข้อเสนอให้คุณ confirm)
| type | ผู้ขายเห็น | action ผู้ขาย | เก็บเงิน |
|---|---|---|---|
| `sample_request` | บริบทสเปก + **ที่อยู่จัดส่ง (หลัง consent)** | ยืนยัน/จัดส่งตัวอย่าง, อัปเดตสถานะ | ✅ tier สูง |
| `contact_request` | **contact ดีไซเนอร์ (ดีไซเนอร์ initiate)** | ติดต่อกลับ/ตอบใน chat | ✅ tier สูง |
| `quote_request` (RFQ) | บริบทสเปก **ไม่เห็น contact** (กติกาข้อ 4) | เสนอราคา (flow เดิม) | ✅ tier กลาง |
| `spec_sync` | — (ไม่ใช่ lead) | — | ❌ analytics เท่านั้น |

### Q6. ราคาจริง 🛑 (validate ผู้ขาย 5–10 ราย)
บรีฟตั้งสมมติฐาน: sample ~฿60–150, contact ~฿40–120, quote ~฿30–90 ต่อ lead
**ห้าม hardcode ก่อน validate** — ค่าเหล่านี้ต้องมาจากการคุยผู้ขายจริง แล้วค่อยใส่เป็น config (ไม่ hardcode กระจาย)

> กติกาเหล็กข้อ 2: **ราคาเท่ากันทุกผู้ขายใน type เดียวกัน** — ต่างได้แค่ *ข้าม type* เท่านั้น

---

## 2. ร่าง Schema (เพื่อ review — ยังไม่ applied)

> ⚠️ **นี่คือร่าง ไม่ใช่ migration** — ยังไม่เขียนลง `prisma/schema.prisma` หรือ `DATA_MODEL.md`
> ต้องให้คุณอนุมัติ schema diff ก่อน แล้วค่อยแยกเป็นงาน migration ต่างหาก

### แนวทางที่แนะนำ: เพิ่ม `EngagementEvent` เป็น "สมุดบันทึก intent/billing" — คง RFQ→Quote เดิมไว้

เหตุผล: `RFQRecipient`→`RFQ`→`Quote` เป็น flow ที่ทำงานอยู่และมีเทสต์แล้ว การ *generalize ทับ* เสี่ยงพัง flow เดิม → แนะนำ **เพิ่มตารางใหม่ข้าง ๆ** แล้วให้ `quote_request` อ้างอิง `rfqId` (ไม่รื้อของเดิม)

```prisma
// ── ร่าง (ยังไม่ applied) ──────────────────────────────────────────

enum EngagementType {
  sample_request
  contact_request
  quote_request        // = RFQ เดิม (คงไว้)
  // spec_sync ไม่อยู่ที่นี่ — เก็บเป็น AnalyticsEvent เท่านั้น (ไม่ผูก billing)
}

enum EngagementBillingStatus {
  pending
  billed
  waived               // เช่น เครดิตแรกเข้าฟรี / โปร
  refunded
}

model EngagementEvent {
  id             String   @id @default(cuid())
  type           EngagementType

  // ใคร/อะไร
  designerOrgId  String
  sellerOrgId    String
  specItemId     String?
  materialId     String?
  rfqId          String?  // set เมื่อ type = quote_request (link RFQ เดิม)

  // billing — ราคาเท่ากันทุกผู้ขายใน type (กติกาข้อ 2)
  creditCost     Int      @default(0)   // resolve จาก type ณ ตอนสร้าง (snapshot)
  billingStatus  EngagementBillingStatus @default(pending)

  // anti-broadcast — กันเก็บซ้ำเจ้าเดิม×ดีไซเนอร์เดิม×spec เดิม ในหน้าต่างเวลา
  dedupKey       String

  // 🛑 PDPA — เก็บเฉพาะหลัง consent, ต้องผ่านทนาย (Q3)
  // shippingSnapshot Json?   // ที่อยู่จัดส่งสำหรับ sample_request (รอทนายอนุมัติรูปแบบ)

  createdAt      DateTime @default(now())

  designerOrg Organization @relation("DesignerEngagements", fields: [designerOrgId], references: [id], onDelete: Cascade)
  sellerOrg   Organization @relation("SellerEngagements",   fields: [sellerOrgId],   references: [id], onDelete: Cascade)
  specItem    SpecItem?    @relation(fields: [specItemId], references: [id])
  material    Material?    @relation(fields: [materialId], references: [id])
  rfq         RFQ?         @relation(fields: [rfqId],      references: [id])

  @@unique([dedupKey])                              // กันซ้ำระดับ DB
  @@index([sellerOrgId, type, billingStatus])
  @@index([designerOrgId])
}

// ── Wallet / prepaid credit (net-new) ──────────────────────────────

model SellerWallet {
  id             String   @id @default(cuid())
  orgId          String   @unique
  balanceCredits Int      @default(0)
  updatedAt      DateTime @updatedAt

  org          Organization        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  transactions CreditTransaction[]
}

enum CreditTxnType {
  topup        // เติมเงินล่วงหน้า → link Invoice/payment (พึ่ง Phase 3.5)
  debit        // event หักเครดิต
  refund
  adjustment   // แอดมินปรับมือ (มี AuditLog)
}

model CreditTransaction {
  id           String   @id @default(cuid())
  walletId     String
  type         CreditTxnType
  amount       Int      // + สำหรับ topup/refund, − สำหรับ debit
  balanceAfter Int
  engagementId String?  // set เมื่อ type = debit
  invoiceId    String?  // set เมื่อ type = topup
  note         String?
  createdAt    DateTime @default(now())

  wallet SellerWallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId, createdAt])
}
```

### สิ่งที่ต้องเพิ่มในโมเดลเดิม (ร่าง — ต้องขออนุมัติเพราะแตะ core)
- `Organization` — เพิ่ม back-relation: `designerEngagements`, `sellerEngagements`, `wallet SellerWallet?`
- `RFQ` — เพิ่ม back-relation `engagements EngagementEvent[]` (optional link)
- `SpecItem` / `Material` — เพิ่ม back-relation `engagements EngagementEvent[]`

### ราคา/เครดิตต่อ type — เป็น config ไม่ hardcode
เสนอวางใน `lib/billing/plans.ts` (ตำแหน่งเดียวกับ plan เดิม) เป็นตารางเดียว เช่น
`ENGAGEMENT_CREDIT_COST: Record<EngagementType, number>` — ค่าจริงเติมหลัง validate (Q6) 🛑

### `spec_sync` — ไม่มีตารางใหม่
เกาะ `AnalyticsEvent` (มีอยู่) ผ่าน `track()` — บันทึก signal, **ไม่แตะ billing**

---

## 3. Iron-rule checklist (ตรวจข้อเสนอกับกติกาเหล็ก 5 ข้อ)

| กติกา | ข้อเสนอนี้ทำตามไหม |
|---|---|
| **1. ความเป็นกลาง (ไม่มีซื้ออันดับ/boost/โฆษณาแฝง)** | ✅ event เป็น "เกาะ intent ที่เกิดเอง" ไม่แตะการเรียงผลค้นหา/หน้าเทียบ — **ห้าม** ให้จ่ายเพื่อขึ้นก่อนในทุกกรณี |
| **2. ราคา lead เดียวทุกเจ้า** | ✅ `creditCost` อิง *type* ล้วน เท่ากันทุกผู้ขายใน type เดียวกัน (ต่างได้แค่ข้าม type) |
| **3. ขายเฉพาะ aggregate** | ✅ ไม่มีการขายข้อมูลรายออฟฟิศ/โปรเจกต์ — event ใช้ภายในเพื่อ billing เท่านั้น |
| **4. ความเป็นส่วนตัว RFQ** | ✅ `quote_request` ผู้ขายไม่เห็น contact; `contact_request` = ดีไซเนอร์ initiate เอง + consent |
| **5. PDPA (ส่งหา contact/เก็บ PII)** | 🛑 sample/contact ต้องผ่านทนายก่อนเปิด — **hard blocker** |

---

## 4. Rollout ที่เสนอ (เรียง phase — ห้ามข้าม ตาม CLAUDE.md)

ลำดับพึ่งพากันจริง (ต้องปลดล็อกด่านก่อนหน้าก่อน):

1. **คนตัดสิน** — schema diff (ข้อ 2) + dedup/cap (Q1) + ราคา (Q6) 🛑
2. **PDPA/ทนายอนุมัติ** (Phase 4.1) — ปลดล็อก sample/contact 🛑
3. **Payment gateway** (Phase 3.5) — ปลดล็อก wallet top-up
4. migration `EngagementEvent` + wallet (หลังอนุมัติ schema)
5. backend: event + credit logic + **test business logic** (dedup, หักเครดิต, คิดสิทธิ์)
6. UI reframe: RFQ ลดจาก CTA กลาง → action ต่อแถว; CTA กลางดีไซเนอร์ = material list/sync; inbox ผู้ขายแยก type + ยอด wallet
7. i18n TH/EN ทุก key
8. เปิด + วัดผลผ่าน analytics

> ลำดับนี้ถูกเพิ่มเป็น **Phase 5** ใน `docs/ROADMAP.md` (ทำเครื่องหมาย 🛑 ครบ) — ยังไม่เริ่ม implement

---

## 5. สิ่งที่ต้องได้จากคุณก่อนไปต่อ (สรุป 🛑)

1. **Q1** ค่า cap N + ความยาวหน้าต่าง dedup
2. **Q2** ยืนยัน spec_sync ไม่เก็บเงินผู้ขาย (คาดว่า "ใช่")
3. **Q3** ส่ง PDPA checklist ให้ทนาย (ที่อยู่จัดส่ง + เปิดเผย contact)
4. **Q4/Q6** validate ราคา + โมเดลของแถมฟรี กับผู้ขาย 5–10 ราย
5. **ข้อ 2** อนุมัติ/แก้ schema diff ก่อนทำ migration
6. ยืนยันว่าจัดเป็น **Phase 5** (หลัง 3.5 + 4.1) — ไม่แซงคิว
