# บันทึกการตัดสินใจ (อ่านเพื่อไม่ทำผิดซ้ำ)

## ทำไม project-first ไม่ใช่ catalog-first
คู่แข่ง (Wazzadu) เล่น catalog-first มา 7 ปีและนำอยู่ การชนะคือเล่นเกมอื่น: เครื่องมือทำสเปกที่มีค่าตั้งแต่ยังไม่มีผู้ขาย แก้ปัญหาไก่กับไข่ตรง ๆ

## ทำไมรายได้หลักมาจากผู้ขาย ไม่ใช่สถาปนิก
ฝั่งสถาปนิกเพดานรายได้เตี้ย (จ่าย 390-690 ต่อคน) ฝั่งผู้ขายจ่ายเพื่อ sales-qualified lead ที่มีบริบทโปรเจกต์ครบ = งบขาย ไม่ใช่งบโฆษณา งบเหนียวกว่า แต่ต้องมีโปรเจกต์ active มากพอ (75-100) lead ถึงไหลพอให้ผู้ขายยอมจ่าย

## ทำไมต้องมี SpecOption แยกตาราง
ผู้ออกแบบทำงานเป็น "เก็บตัวเลือกไว้ก่อน ค่อยตัด" ไม่ใช่เลือกทีเดียวจบ และ RFQ ต้องส่งขอทุกตัวเลือกให้เทียบในรอบเดียว + VE สลับวัสดุแต่ประวัติต้องอยู่ → วัสดุผูกกับรายการแบบ 1-หลาย ไม่ใช่ 1-1

## ทำไมความเป็นกลางคือกติกาเหล็ก
ความเชื่อถือของฝั่งที่"ไม่จ่าย"(สถาปนิก) คือสินค้าที่เอาไปขายฝั่งที่จ่าย(ผู้ขาย) ถ้าขายอันดับ/Boost = ทำลาย lead quality = ผู้ขายเลิกจ่าย พังทั้งระบบ นี่ไม่ใช่เรื่องจริยธรรมอย่างเดียว แต่เป็นตรรกะธุรกิจ

## กับดักที่ต้องระวัง
ถ้าวันไหน RFQ ไหลช้าแล้วมีแบรนด์เสนอเงินทำ "คอนเทนต์สปอนเซอร์/ขึ้นอันดับ" — นั่นคือจุดที่จะกลายเป็น Wazzadu ห้ามรับ ขายความตั้งใจซื้อ (RFQ) ไม่ใช่ขายสายตา (impression)

## Phase 0.3 — auth + i18n (บันทึกการตัดสินใจ)

### ทำไม Auth.js (NextAuth v5) + Credentials + JWT session
- ARCHITECTURE เสนอ NextAuth/Auth.js หรือ Clerk — เลือก Auth.js เพราะ Clerk พึ่ง service ภายนอก (ต่อ LINE/องค์กรไทยยืดหยุ่นน้อยกว่า) ส่วน Auth.js self-host ได้เต็มตัว
- ใช้ **Credentials (email + password)** ก่อน เพราะ onboarding ผู้ขาย/ออฟฟิศไทยเริ่มด้วยอีเมล-รหัสผ่านเข้าใจง่ายสุด — provider อื่น (LINE Login, OAuth) เพิ่มทีหลังได้โดยไม่รื้อ
- ใช้ **JWT session strategy** ไม่ใช่ database session → ไม่ต้องเพิ่มตาราง Account/Session/VerificationToken ของ adapter; schema เปลี่ยนน้อยสุด (เพิ่มแค่ `User.passwordHash`)
- **Split config** (`auth.config.ts` ปลอด DB/bcrypt สำหรับ Edge middleware + `auth.ts` ตัวเต็มบน Node) — จำเป็นเพราะ Prisma/bcrypt รันบน Edge ไม่ได้ นี่คือ pattern มาตรฐานของ Auth.js กับ middleware
- `trustHost: true` — เรา self-host หลัง proxy ของตัวเอง (ไม่ใช่ Vercel) Auth.js จะปฏิเสธด้วย UntrustedHost ถ้าไม่ตั้ง

### role = ประเภท Organization (ไม่ใช่ field บน User)
- ตาม ARCHITECTURE decision #3: ผู้ใช้คนเดียวมีได้ทั้ง designer และ seller แต่ workspace แยกกัน → สิทธิ์เข้า workspace จึงมาจาก "ชุดประเภท org ที่เป็นสมาชิก" ไม่ใช่ enum เดียวบน User
- logic คิดสิทธิ์อยู่ใน `lib/permissions/` (pure functions, มี test) ตามที่ CLAUDE.md กำหนด

### ทำไม i18n แบบ cookie (next-intl แบบไม่มี locale ใน URL)
- ARCHITECTURE เสนอ next-intl หรือ i18next — เลือก **next-intl แบบ no-routing** (locale อยู่ใน cookie `NEXT_LOCALE`)
- เหตุผล: prototype เป็น toggle ปุ่มเดียวสลับทั้งเว็บ + AC "สลับภาษาทั้งเว็บได้" → cookie ให้ URL สะอาด ไม่ต้อง `/th` `/en` ทุกหน้า และ toggle ปุ่มเดียวรีเฟรชทั้ง tree
- dictionaries อยู่ `lib/i18n/messages/{th,en}.json`; มี test เช็คว่า key ตรงกันสองภาษา (กัน string ตกหล่น) — default = th

### ทำไม workspace มี URL prefix (/designer, /seller)
- route group `(designer)`/`(seller)` **ไม่ปรากฏใน URL** ถ้าให้ทั้งสองฝั่งใช้ path เปล่า จะชนกันที่ segment ร่วม (`/rfq`, `/billing`) — Next.js ไม่ยอม
- จึง prefix ด้วยชื่อ workspace (`/designer/*`, `/seller/*`) → แยก workspace ชัด, gate ด้วย path ใน middleware ได้ตรงไปตรงมา, และ role ผิดฝั่ง redirect ไป workspace ของตัวเองอัตโนมัติ

## Phase 0.4 — design system (บันทึกการตัดสินใจ)

### tokens ยกจาก prototype `:root` ตรง ๆ (ไม่ทับด้วยชุดสีเดา)
- scaffold 0.1 วางสี placeholder ไว้ (earth/clay/sand ฯลฯ) — 0.4 แทนที่ด้วย token จริงจาก prototype `:root` ทั้งชุด (brand, ink, sub, mut, line, line-2, canvas, surface, ok/warn/info + soft, r/r-sm, sh/sh-2) ใน `app/globals.css` (`@theme` ของ Tailwind v4)
- **กฎ**: component ห้าม hardcode สี/รัศมี/เงา — ต้องผ่าน token เสมอ

### component library อยู่ `components/ui/` (แยกจาก `app/_components/`)
- `components/ui/` = primitives ใช้ซ้ำทั้งเว็บ (Button, Card, Modal, StatusChip, Swatch + Badge, Chip, Input) — มี barrel `index.ts`
- `app/_components/` = ชิ้นที่ผูกกับ layout/flow เฉพาะ (LangToggle, WorkspaceShell ฯลฯ) ที่ประกอบจาก primitives อีกที
- texture engine (CSS วัสดุ) ย้ายไป `lib/ui/texture.ts` เพื่อให้ Material Board (Phase 1.5) เรียกใช้ซ้ำได้
- สถานะสเปก (empty|options|chosen|sent|quoted) เป็น logic derived → อยู่ `lib/spec/status.ts` (มี test) StatusChip เอา label จาก i18n + สีจาก status→variant map
