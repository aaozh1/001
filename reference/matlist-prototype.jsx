import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";

/* ============================================================
   MatList v6
   · สองภาษา TH/EN (default TH) — สลับได้ทั้งแพลตฟอร์ม
   · โครงข้อมูลสินค้าเต็ม: ผู้ผลิต/จัดจำหน่าย ยี่ห้อ รุ่น รหัสสินค้า สี ขนาด หมายเหตุ
   · วัสดุ ~140 รายการ (เจนจาก series จริงของแต่ละหมวด) + ภาพพื้นผิวด้วย CSS texture
   · หน้า detail แบบ full-spec + Specsheet/Catalog + ร้านผู้ผลิต + แชทผู้ขาย
   · Rating & Review จากผู้ออกแบบ/ผู้รับเหมา/ผู้ซื้อ
   · ตารางเทียบแบบเต็มทุกมิติ
   · สรุปข้อมูลผู้ผลิตในตารางสเปก
   ============================================================ */

/* ── i18n ── */
const L = {
  th: {
    tagline: "วัสดุครบ จบที่ลิสต์เดียว", navCat: "คลังวัสดุ", navSched: "ตารางสเปก", navSeller: "มุมมองผู้ขาย", metric: "วัดผล",
    searchPh: "ค้นหาวัสดุ แบรนด์ รุ่น หรือรหัสสินค้า เช่น กระเบื้อง 60×120, COTTO, Low-E",
    heroT: "เริ่มจากหมวดวัสดุที่กำลังหา", heroS: "หมวดแบ่งตามตระกูลวัสดุ ไม่ผูกตำแหน่งใช้งาน — กระเบื้องแผ่นเดียว จะปูพื้นหรือกรุผนังก็อยู่หมวดเดียวกัน",
    myWork: "งานของฉัน", newProj: "＋ โปรเจกต์ใหม่", specDone: "สเปกแล้ว", optWait: "ตัวเลือกรอ confirm", openSched: "เปิดตารางสเปก",
    results: "ผลลัพธ์", items: "รายการ", trust: "เรียงตามความตรงสเปกเท่านั้น — ไม่มีการซื้ออันดับหรือโฆษณาแฝง",
    compare: "เทียบ", pickInto: "เลือกลง", keep: "＋ เก็บเข้าตาราง", notFound: "ไม่เจอของที่ใช้จริง?", addOwn: "เพิ่มวัสดุเอง — พิมพ์ชื่อ+แบรนด์ ใช้ในตารางได้ทันที",
    cmpSel: "เลือกเทียบ", openCmp: "เปิดตารางเทียบ",
    schedT: "ตารางสเปก", schedSub: "แตะรหัส/ตำแหน่ง/ปริมาณเพื่อแก้ได้เลย", importX: "นำเข้า Excel", revit: "เชื่อม Revit", book: "สร้าง Spec Book",
    vFull: "รายละเอียดเต็ม", vCompact: "ย่อ", vGrid: "การ์ด", vBoard: "Material Board",
    stEmpty: "ยังไม่เลือกวัสดุ", stOpt: "ตัวเลือก", stChosen: "เลือกแล้ว", stSent: "รอราคา", stQuoted: "ได้ราคาแล้ว",
    confirm: "confirm", useThis: "✓ ใช้ตัวนี้", addOpt: "＋ เพิ่มตัวเลือก", pickMat: "＋ เลือกวัสดุ", addRow: "＋ เพิ่มรายการวัสดุ",
    ve: "หาของเทียบเท่า (VE)", veDone: "VE แล้ว", saveLast: "ครั้ง · ล่าสุดประหยัด", from: "จาก", reply48: "ผู้ขายมักตอบใน 48 ชม.",
    sumMfr: "ผู้ผลิต/จัดจำหน่าย", sumBrand: "ยี่ห้อ", sumModel: "รุ่น", sumSku: "รหัสสินค้า", sumColor: "สี", sumSize: "ขนาด", sumNote: "หมายเหตุผู้ผลิต",
    batchIdle: "ติ๊กรายการที่มีวัสดุ แล้วขอตัวอย่าง+ราคาพร้อมกันในคลิกเดียว", batchSel: "เลือกแล้ว", brands: "แบรนด์", askRfq: "ขอตัวอย่าง + ราคา",
    boardHint: "แผ่นใหญ่ = ตัวที่ใช้จริง · แผ่นจาง = ตัวเลือกที่ยังไม่ confirm — ไว้เช็ก mood & tone รวม และแคปส่งลูกค้าได้เลย",
    boardEmpty: "ยังไม่มีวัสดุในตาราง — เลือกจากคลังก่อน แล้วกลับมาดู mood รวมของโครงการที่นี่",
    detSpec: "ข้อมูลจำเพาะ", detSheet: "เปิด Specsheet (PDF)", detCata: "เปิด Catalog", detStd: "มาตรฐาน", detLead: "ระยะส่งของ", detMoq: "สั่งขั้นต่ำ", detWty: "รับประกัน",
    mfrBy: "ผลิต/จัดจำหน่ายโดย", seeAll: "ดูสินค้าทั้งหมดของรายนี้", chat: "แชทกับผู้ขาย", verified: "ผู้ขายยืนยันตัวตน",
    reviews: "รีวิวจากผู้ใช้งานจริง", reviewOf: "รีวิว", writeRev: "เขียนรีวิว (ต้องเคยสั่งซื้อ/ขอตัวอย่างผ่านระบบ)",
    storeT: "สินค้าทั้งหมดจาก", backCata: "← กลับคลังวัสดุ",
    chatT: "แชทกับ", chatPh: "พิมพ์ข้อความ… เช่น ขอราคาโครงการ 500 ตร.ม.", chatSend: "ส่ง", chatHint: "ประวัติแชทผูกกับโปรเจกต์ — ทีมขายเห็นบริบทสเปกของคุณ ไม่ต้องเล่าใหม่",
    cmpT: "ตารางเทียบวัสดุ", cmpPrice: "ราคา", cmpBrand: "ยี่ห้อ / รุ่น", cmpSize: "ขนาด", cmpColor: "สี", cmpSpec: "สเปกหลัก", cmpStd: "มาตรฐาน", cmpLead: "ส่งของ", cmpRate: "คะแนนรีวิว", cmpSeller: "ผู้ขาย", cmpPick: "เลือกตัวนี้",
    close: "ปิด", cancel: "ยกเลิก", backSched: "กลับตาราง",
    pickingFor: "กำลังเลือกวัสดุให้", pickMulti: "— เลือกได้หลายตัวเป็น option แล้วค่อย confirm",
  },
  en: {
    tagline: "Every material. One list.", navCat: "Materials", navSched: "Spec Schedule", navSeller: "Seller View", metric: "Metrics",
    searchPh: "Search materials, brands, models or SKU e.g. tile 60×120, COTTO, Low-E",
    heroT: "Start from the material family you need", heroS: "Categories follow material families, not locations — one tile lives in one place whether it goes on floors or walls",
    myWork: "My Work", newProj: "＋ New Project", specDone: "Specified", optWait: "options pending", openSched: "Open Schedule",
    results: "Results", items: "items", trust: "Ranked by spec relevance only — no paid placement, no hidden ads",
    compare: "Compare", pickInto: "Add to", keep: "＋ Add to schedule", notFound: "Can't find the exact product?", addOwn: "Add your own — type name + brand, use it in the schedule instantly",
    cmpSel: "Comparing", openCmp: "Open comparison",
    schedT: "Spec Schedule", schedSub: "Tap code / location / quantity to edit inline", importX: "Import Excel", revit: "Connect Revit", book: "Create Spec Book",
    vFull: "Full detail", vCompact: "Compact", vGrid: "Cards", vBoard: "Material Board",
    stEmpty: "No material yet", stOpt: "Options", stChosen: "Confirmed", stSent: "Awaiting quotes", stQuoted: "Quoted",
    confirm: "confirm", useThis: "✓ In use", addOpt: "＋ Add option", pickMat: "＋ Pick material", addRow: "＋ Add line item",
    ve: "Find equivalent (VE)", veDone: "VE ×", saveLast: " · last saved", from: "from", reply48: "Sellers usually reply in 48 h",
    sumMfr: "Manufacturer/Distributor", sumBrand: "Brand", sumModel: "Model", sumSku: "SKU", sumColor: "Color", sumSize: "Size", sumNote: "Manufacturer note",
    batchIdle: "Tick items with materials, then request samples + quotes in one click", batchSel: "Selected", brands: "brands", askRfq: "Samples + Quotes",
    boardHint: "Large tile = confirmed · faded = pending option — check overall mood & tone, screenshot for clients",
    boardEmpty: "Schedule is empty — pick materials first, then come back for the project mood view",
    detSpec: "Specifications", detSheet: "Open Specsheet (PDF)", detCata: "Open Catalog", detStd: "Standards", detLead: "Lead time", detMoq: "MOQ", detWty: "Warranty",
    mfrBy: "Made / distributed by", seeAll: "See all products from this seller", chat: "Chat with seller", verified: "Verified seller",
    reviews: "Reviews from real users", reviewOf: "reviews", writeRev: "Write a review (verified purchases/samples only)",
    storeT: "All products from", backCata: "← Back to materials",
    chatT: "Chat with", chatPh: "Type a message… e.g. quote for a 500 m² project", chatSend: "Send", chatHint: "Chat history is tied to your project — sales sees your spec context, no need to repeat",
    cmpT: "Material comparison", cmpPrice: "Price", cmpBrand: "Brand / Model", cmpSize: "Size", cmpColor: "Color", cmpSpec: "Key spec", cmpStd: "Standards", cmpLead: "Lead", cmpRate: "Rating", cmpSeller: "Seller", cmpPick: "Choose",
    close: "Close", cancel: "Cancel", backSched: "Back to schedule",
    pickingFor: "Picking material for", pickMulti: "— collect several options, confirm later",
  },
};

/* ── หมวด (ตระกูลวัสดุ) ── */
const CATS = [
  { key: "กระเบื้อง & พอร์ซเลน", en: "Tiles & Porcelain", icon: "▦", tint: "#FFF1EC", tex: "tile" },
  { key: "หินธรรมชาติ & หินขัด", en: "Stone & Terrazzo", icon: "◆", tint: "#F0F4F8", tex: "terrazzo" },
  { key: "ไม้จริง & ไม้เอนจิเนียร์", en: "Wood & Engineered", icon: "≣", tint: "#FBF3E7", tex: "wood" },
  { key: "ไวนิล SPC & ลามิเนต", en: "Vinyl SPC & Laminate", icon: "▤", tint: "#F1F8F4", tex: "wood" },
  { key: "อิฐ & บล็อก", en: "Brick & Block", icon: "▣", tint: "#FDEFEA", tex: "brick" },
  { key: "ปูน คอนกรีต & ไฟเบอร์ซีเมนต์", en: "Concrete & Fiber Cement", icon: "◧", tint: "#F3F4F6", tex: "concrete" },
  { key: "ยิปซัม & อะคูสติก", en: "Gypsum & Acoustic", icon: "◫", tint: "#F5F2FA", tex: "gypsum" },
  { key: "โลหะ & เหล็ก", en: "Metal & Steel", icon: "⬡", tint: "#EEF2F5", tex: "metal" },
  { key: "กระจก & อะคริลิก", en: "Glass & Acrylic", icon: "◇", tint: "#ECF6F8", tex: "glass" },
  { key: "สี & สารเคลือบผิว", en: "Paint & Coatings", icon: "◐", tint: "#FFF6E8", tex: "paint" },
  { key: "ฉนวน & กันความร้อน", en: "Insulation", icon: "≋", tint: "#EFF7EF", tex: "fabric" },
  { key: "ผ้า หนัง & วัสดุบุผิว", en: "Fabric & Upholstery", icon: "▨", tint: "#FAF0F3", tex: "fabric" },
  { key: "สุขภัณฑ์ & ฟิตติ้ง", en: "Sanitary & Fittings", icon: "◍", tint: "#EDF5FB", tex: "metal" },
  { key: "แสงสว่าง & โคมไฟ", en: "Lighting", icon: "◉", tint: "#FFFAE8", tex: "glass" },
];
const CATEGORIES = ["ทั้งหมด", ...CATS.map((c) => c.key)];
const catEn = (k) => (k === "ทั้งหมด" ? "All" : CATS.find((c) => c.key === k)?.en || k);

/* ── Texture engine: "ภาพวัสดุ" ด้วย CSS หลายชั้น (แทนรูปถ่ายจนกว่าผู้ขายจะ onboard) ── */
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
};
const tex = (p) => {
  const c = p.swatch, d = shade(c, -18), dd = shade(c, -38), l = shade(c, 16), ll = shade(c, 30);
  switch (p.tex) {
    case "wood": return { background: `repeating-linear-gradient(93deg, ${c} 0 14px, ${d} 14px 16px, ${l} 16px 30px, ${d} 30px 31px, ${c} 31px 46px), linear-gradient(180deg, ${ll}22, transparent 40%)`, backgroundBlendMode: "multiply, normal" };
    case "tile": return { background: `linear-gradient(45deg, ${ll}55 0%, transparent 45%), repeating-linear-gradient(0deg, ${c} 0 44px, ${dd} 44px 46px), repeating-linear-gradient(90deg, ${c}00 0 44px, ${dd} 44px 46px)`, backgroundColor: c };
    case "terrazzo": return { background: `radial-gradient(circle 5px at 12% 20%, ${dd} 98%, transparent), radial-gradient(circle 4px at 35% 60%, ${l} 98%, transparent), radial-gradient(circle 6px at 60% 30%, ${dd} 98%, transparent), radial-gradient(circle 3px at 80% 70%, ${d} 98%, transparent), radial-gradient(circle 5px at 25% 85%, ${l} 98%, transparent), radial-gradient(circle 4px at 90% 15%, ${d} 98%, transparent), radial-gradient(circle 3px at 50% 90%, ${dd} 98%, transparent), radial-gradient(circle 5px at 70% 55%, ${ll} 98%, transparent), ${c}` };
    case "brick": return { background: `repeating-linear-gradient(0deg, ${c} 0 22px, ${shade(c,-45)} 22px 25px), repeating-linear-gradient(90deg, transparent 0 46px, ${shade(c,-45)} 46px 49px)`, backgroundColor: c };
    case "concrete": return { background: `linear-gradient(120deg, ${l}44, transparent 55%), radial-gradient(circle 2px at 20% 30%, ${d} 98%, transparent), radial-gradient(circle 2px at 70% 60%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 45% 80%, ${dd} 98%, transparent), ${c}` };
    case "metal": return { background: `repeating-linear-gradient(90deg, ${c} 0 2px, ${l} 2px 3px, ${c} 3px 5px, ${d} 5px 6px), linear-gradient(100deg, transparent 30%, ${ll}66 48%, transparent 60%)` , backgroundColor: c};
    case "glass": return { background: `linear-gradient(115deg, ${ll} 0%, ${c} 35%, ${l} 50%, ${c} 65%, ${d} 100%)` };
    case "fabric": return { background: `repeating-linear-gradient(45deg, ${c} 0 3px, ${d} 3px 4px), repeating-linear-gradient(-45deg, transparent 0 3px, ${l}55 3px 4px)`, backgroundColor: c };
    case "gypsum": return { background: `radial-gradient(circle 1.5px at 25% 25%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 75% 25%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 25% 75%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 75% 75%, ${d} 98%, transparent), ${c}`, backgroundSize: "26px 26px" };
    case "paint": return { background: `linear-gradient(160deg, ${l} 0%, ${c} 45%, ${d} 100%)` };
    default: return { background: c };
  }
};

/* ── โรงงานเจนสินค้า ~140 รายการ: series จริงต่อหมวด × สี × ขนาด ── */
const SELLERS = {
  "Grand Ceramics": { logo: "GC", color: "#D96C4A" }, "EcoTile Studio": { logo: "ET", color: "#4A9C82" },
  "Siam Terrazzo Co.": { logo: "ST", color: "#5E7A99" }, "Stonefield TH": { logo: "SF", color: "#7A6E5D" },
  "Woodwork Studio TH": { logo: "WW", color: "#A9743F" }, "Northern Timber": { logo: "NT", color: "#7C5A34" },
  "FloorMaster": { logo: "FM", color: "#3F8A5F" }, "VinylPro Asia": { logo: "VP", color: "#4A7C9C" },
  "โรงอิฐบ้านโป่ง": { logo: "บป", color: "#B0512F" }, "BlockCraft": { logo: "BC", color: "#9C6A4A" },
  "BoardTech": { logo: "BT", color: "#6E7680" }, "SCG Living": { logo: "SL", color: "#C0392B" },
  "Acoustic Pro": { logo: "AP", color: "#7B6EA8" }, "Knauf TH": { logo: "KN", color: "#2C5F8A" },
  "Metro Steel Supply": { logo: "MS", color: "#4A5560" }, "AlumTech": { logo: "AT", color: "#8A94A0" },
  "ClearView Glass": { logo: "CV", color: "#4A93A8" }, "GlassArt BKK": { logo: "GA", color: "#6AA8B8" },
  "CoolCoat Thailand": { logo: "CC", color: "#E0A030" }, "ColorLab Paint": { logo: "CL", color: "#C05A8A" },
  "GreenBuild Insulation": { logo: "GB", color: "#6A8A50" }, "ThermoSafe": { logo: "TS", color: "#508A7A" },
  "Fabrica TH": { logo: "FB", color: "#B06A80" }, "Upholstery House": { logo: "UH", color: "#8A5A70" },
  "AquaFit": { logo: "AQ", color: "#4A80B0" }, "BathPro Studio": { logo: "BP", color: "#5A90A0" },
  "Lumina Lighting": { logo: "LM", color: "#D0A040" }, "BrightWorks": { logo: "BW", color: "#B08A30" },
};

const GEN = [
  { cat: 0, brand: "COTTO", seller: "Grand Ceramics", model: "Arctic", th: "กระเบื้องพอร์ซเลน", en: "Porcelain tile", unit: "ตร.ม.", base: 890, spec: "ดูดซึมน้ำ <0.5% · Matt R9", specEn: "Water abs. <0.5% · Matt R9", cert: "มอก. 2508", lead: "7 วัน", wty: "10 ปี", moq: "20 ตร.ม.", note: "แนะนำยาแนวสีเดียวกับกระเบื้อง เว้นร่อง 2 มม.", noteEn: "Use matching grout, 2 mm joint", colors: [["ขาวหินอ่อน", "#E4E1DC"], ["เทาคาร์รารา", "#C9CBCE"], ["ดำแกรนิต", "#5A5B5E"], ["เบจทราเวอทีน", "#D8CBB4"]], sizes: ["60×60 ซม.", "60×120 ซม."] },
  { cat: 0, brand: "Duragres", seller: "Grand Ceramics", model: "Mist", th: "กระเบื้องผนัง", en: "Wall tile", unit: "ตร.ม.", base: 420, spec: "กันลื่น R11 · เหมาะงานเปียก", specEn: "Anti-slip R11 · wet areas", cert: "มอก. 2508", lead: "5 วัน", wty: "5 ปี", moq: "15 ตร.ม.", note: "รุ่นนี้มีขอบ rectified ปูชิดได้", noteEn: "Rectified edge, tight joints OK", colors: [["ขาวด้าน", "#EDEBE6"], ["เขียวเซจ", "#AEBFAE"], ["ฟ้าหมอก", "#AFC4CE"]], sizes: ["30×60 ซม."] },
  { cat: 0, brand: "EcoTile", seller: "EcoTile Studio", model: "Mosaic Glass", th: "โมเสกแก้วรีไซเคิล", en: "Recycled glass mosaic", unit: "ตร.ม.", base: 1180, spec: "แผ่นตาข่าย 30×30 · ทนคลอรีน", specEn: "Mesh 30×30 · chlorine-proof", cert: "—", lead: "12 วัน", wty: "5 ปี", moq: "5 ตร.ม.", note: "สั่งสีพิเศษได้ ขั้นต่ำ 50 ตร.ม.", noteEn: "Custom colors from 50 m²", colors: [["เขียวทะเล", "#7FB8AE"], ["น้ำเงินลึก", "#4A6A9C"], ["ทองชา", "#C0A060"]], sizes: ["2×2 ซม."] },
  { cat: 1, brand: "Siam Terrazzo", seller: "Siam Terrazzo Co.", model: "Classic Lime", th: "หินขัดเทอราซโซ", en: "Terrazzo", unit: "ตร.ม.", base: 1450, spec: "หนา 20 มม. · กันลื่น R10 · Recycled 30%", specEn: "20 mm · R10 · 30% recycled", cert: "มอก. 826", lead: "21 วัน", wty: "10 ปี", moq: "30 ตร.ม.", note: "หล่อหน้างานได้ ไร้รอยต่อ", noteEn: "Cast-in-place, seamless", colors: [["ครีมปูนขาว", "#C9C2B4"], ["เทาควันบุหรี่", "#A8A8A4"], ["ชมพูพาสเทล", "#D4B8B0"], ["เขียวหยก", "#9CB0A0"]], sizes: ["หล่อในที่", "แผ่น 60×60"] },
  { cat: 1, brand: "Stonefield", seller: "Stonefield TH", model: "Granite Flame", th: "หินแกรนิตเผาไฟ", en: "Flamed granite", unit: "ตร.ม.", base: 1850, spec: "หนา 30 มม. · ผิวเผาไฟกันลื่น", specEn: "30 mm · flamed anti-slip", cert: "—", lead: "14 วัน", wty: "—", moq: "10 ตร.ม.", note: "งานภายนอกควรเคลือบกันคราบ", noteEn: "Seal for exterior use", colors: [["ดำอินเดีย", "#4A4A4C"], ["เทาเขา", "#8A8C8A"]], sizes: ["30×60 ซม.", "60×60 ซม."] },
  { cat: 2, brand: "Woodwork", seller: "Woodwork Studio TH", model: "Oak Tri-layer", th: "ไม้เอ็นจิเนียร์โอ๊ค", en: "Engineered oak", unit: "ตร.ม.", base: 2190, spec: "หนา 15 มม. · ผิว UV Lacquer · E1", specEn: "15 mm · UV lacquer · E1", cert: "FSC", lead: "30 วัน", wty: "15 ปี", moq: "20 ตร.ม.", note: "ปรับสภาพไม้ในไซต์ 72 ชม. ก่อนติดตั้ง", noteEn: "Acclimatize on site 72 h", colors: [["โอ๊คธรรมชาติ", "#A9743F"], ["โอ๊ครมควัน", "#7A5230"], ["โอ๊คขาวแซนด์", "#C8A87C"]], sizes: ["190×1900 มม.", "220×2200 มม."] },
  { cat: 2, brand: "Northern", seller: "Northern Timber", model: "Teak Solid", th: "ไม้สักแท้", en: "Solid teak", unit: "ตร.ม.", base: 3400, spec: "หนา 18 มม. · อบแห้ง KD", specEn: "18 mm · kiln dried", cert: "FSC", lead: "45 วัน", wty: "—", moq: "10 ตร.ม.", note: "สีไม้เข้มขึ้นตามอายุ เป็นธรรมชาติของสัก", noteEn: "Natural darkening over time", colors: [["สักทอง", "#B08048"]], sizes: ["90×900 มม.", "120×1200 มม."] },
  { cat: 3, brand: "FloorMaster", seller: "FloorMaster", model: "AquaLock", th: "พื้น SPC คลิกล็อก", en: "SPC click-lock", unit: "ตร.ม.", base: 620, spec: "หนา 5 มม. · Wear 0.5 มม. · กันน้ำ 100%", specEn: "5 mm · wear 0.5 · waterproof", cert: "FloorScore", lead: "3 วัน", wty: "10 ปี", moq: "10 ตร.ม.", note: "ปูทับกระเบื้องเดิมได้ ถ้าพื้นเรียบ ±2 มม.", noteEn: "Install over tile if flat ±2 mm", colors: [["ไม้โอ๊คอ่อน", "#B8916A"], ["ไม้วอลนัท", "#7A5A42"], ["ไม้แอชเทา", "#A0968C"], ["หินเทา", "#9AA0A4"]], sizes: ["180×1220 มม."] },
  { cat: 3, brand: "VinylPro", seller: "VinylPro Asia", model: "Loose-lay", th: "กระเบื้องยาง LVT", en: "LVT loose-lay", unit: "ตร.ม.", base: 480, spec: "หนา 5 มม. · ถอดเปลี่ยนรายแผ่น", specEn: "5 mm · replace per plank", cert: "FloorScore", lead: "5 วัน", wty: "7 ปี", moq: "20 ตร.ม.", note: "เหมาะงานเช่า/รีโนเวต รื้อไม่ทิ้งร่องรอย", noteEn: "Great for rentals, no residue", colors: [["โอ๊คน้ำผึ้ง", "#B78B5C"], ["คอนกรีต", "#A8A8A6"]], sizes: ["500×500 มม.", "180×1220 มม."] },
  { cat: 4, brand: "บ้านโป่ง", seller: "โรงอิฐบ้านโป่ง", model: "เผาฟืนดั้งเดิม", th: "อิฐดินเผามือ", en: "Handmade clay brick", unit: "ก้อน", base: 12, spec: "6.5×15×3 ซม. · เผาเตาฟืน", specEn: "6.5×15×3 cm · wood-fired", cert: "—", lead: "14 วัน", wty: "—", moq: "1,000 ก้อน", note: "สีแต่ละล็อตต่างกันเล็กน้อย คือเสน่ห์ของงานมือ", noteEn: "Slight lot variation — handmade charm", colors: [["ส้มอิฐ", "#B0512F"], ["แดงเข้ม", "#8A3A24"], ["ส้มอ่อนไฟอ่อน", "#C87A50"]], sizes: ["มาตรฐาน", "จัมโบ้ 7×16×4"] },
  { cat: 4, brand: "BlockCraft", seller: "BlockCraft", model: "Breeze", th: "บล็อกช่องลมคอนกรีต", en: "Concrete breeze block", unit: "ก้อน", base: 65, spec: "19×19×9 ซม. · รับแรง 2.5 MPa", specEn: "19×19×9 · 2.5 MPa", cert: "มอก. 58", lead: "10 วัน", wty: "—", moq: "200 ก้อน", note: "มีลาย 6 แบบ สั่งผสมลายได้", noteEn: "6 patterns, mixable", colors: [["เทาซีเมนต์", "#A8A8A4"], ["ขาว", "#DCDCD8"]], sizes: ["19×19 ซม."] },
  { cat: 5, brand: "BoardTech", seller: "BoardTech", model: "FiberPlank", th: "แผ่นไฟเบอร์ซีเมนต์", en: "Fiber cement board", unit: "ตร.ม.", base: 385, spec: "กันชื้น · ทนไฟ 2 ชม.", specEn: "Moisture-proof · 2 h fire", cert: "มอก. 1427", lead: "5 วัน", wty: "10 ปี", moq: "10 แผ่น", note: "ใช้ได้ทั้งผนัง ฝ้า และพื้นยกเบา", noteEn: "Walls, ceilings, raised floors", colors: [["เทาซีเมนต์เปลือย", "#B8B5AC"], ["ขาวรองพื้น", "#D8D6D0"]], sizes: ["8 มม.", "12 มม.", "16 มม."] },
  { cat: 5, brand: "SCG", seller: "SCG Living", model: "Smartboard", th: "สมาร์ทบอร์ด", en: "Smartboard", unit: "แผ่น", base: 320, spec: "ขอบเรียบ · ไม่มีใยหิน", specEn: "Square edge · asbestos-free", cert: "มอก. 1427", lead: "3 วัน", wty: "10 ปี", moq: "10 แผ่น", note: "รอยต่อใช้ PU sealant ตามคู่มือ", noteEn: "PU sealant joints per manual", colors: [["เทา", "#B4B2AC"]], sizes: ["120×240 ซม. 8 มม.", "120×240 ซม. 10 มม."] },
  { cat: 6, brand: "Acoustic Pro", seller: "Acoustic Pro", model: "Perfo", th: "ยิปซัมอะคูสติกเจาะรู", en: "Perforated acoustic gypsum", unit: "ตร.ม.", base: 460, spec: "NRC 0.70 · ขอบ Tegular", specEn: "NRC 0.70 · Tegular", cert: "มอก. 219", lead: "10 วัน", wty: "5 ปี", moq: "20 ตร.ม.", note: "ต้องเว้น plenum ≥200 มม. เพื่อค่า NRC ตามสเปก", noteEn: "≥200 mm plenum for rated NRC", colors: [["ขาว", "#E9E7E0"]], sizes: ["รูกลม 8 มม.", "รูเหลี่ยม 12 มม."] },
  { cat: 6, brand: "Knauf", seller: "Knauf TH", model: "MoistShield", th: "ยิปซัมกันชื้น", en: "Moisture-resistant gypsum", unit: "แผ่น", base: 260, spec: "แกนกันชื้นสีเขียว · 9 มม.", specEn: "Green MR core · 9 mm", cert: "มอก. 219", lead: "3 วัน", wty: "5 ปี", moq: "20 แผ่น", note: "ห้องน้ำโซนเปียกควรกรุกระเบื้องทับ", noteEn: "Tile over in wet zones", colors: [["เขียว MR", "#B8C8B0"]], sizes: ["120×240 ซม."] },
  { cat: 7, brand: "Metro Steel", seller: "Metro Steel Supply", model: "H-Beam SS400", th: "เหล็ก H-Beam", en: "H-Beam", unit: "กก.", base: 24.5, spec: "Yield 245 MPa · JIS G3101", specEn: "Yield 245 MPa · JIS G3101", cert: "มอก. 1227", lead: "7 วัน", wty: "—", moq: "1 ตัน", note: "ราคาอิงตลาดรายสัปดาห์ ยืนราคา 7 วัน", noteEn: "Weekly market price, 7-day validity", colors: [["เหล็กดิบ", "#5B6670"]], sizes: ["150×150", "200×200", "300×300"] },
  { cat: 7, brand: "AlumTech", seller: "AlumTech", model: "Facade Fin", th: "ครีบอะลูมิเนียม", en: "Aluminium fin", unit: "ม.", base: 850, spec: "เคลือบ PVDF · กันซีดจาง 20 ปี", specEn: "PVDF coated · 20-yr fade", cert: "AAMA 2605", lead: "25 วัน", wty: "20 ปี", moq: "100 ม.", note: "สั่งสี RAL พิเศษได้ ขั้นต่ำ 300 ม.", noteEn: "Custom RAL from 300 m", colors: [["เงินอโนไดซ์", "#B8BEC4"], ["ดำด้าน", "#3A3C40"], ["ทองแชมเปญ", "#C0A878"]], sizes: ["50×150 มม.", "50×200 มม."] },
  { cat: 8, brand: "ClearView", seller: "ClearView Glass", model: "Low-E Lam", th: "กระจกลามิเนต Low-E", en: "Low-E laminated", unit: "ตร.ม.", base: 3200, spec: "SHGC 0.28 · VLT 62% · PVB 0.76", specEn: "SHGC 0.28 · VLT 62%", cert: "มอก. 1222", lead: "45 วัน", wty: "10 ปี", moq: "10 ตร.ม.", note: "แจ้งขนาดจริงหน้างานก่อนสั่งตัด", noteEn: "Confirm site dims before cutting", colors: [["ใสเขียวอ่อน", "#9FBCC4"], ["ใสน้ำเงิน", "#8AAEC4"]], sizes: ["6+6 มม.", "8+8 มม."] },
  { cat: 8, brand: "GlassArt", seller: "GlassArt BKK", model: "Fluted", th: "กระจกลอนฟลูท", en: "Fluted glass", unit: "ตร.ม.", base: 1850, spec: "หนา 8 มม. · เทมเปอร์", specEn: "8 mm tempered", cert: "มอก. 965", lead: "18 วัน", wty: "5 ปี", moq: "5 ตร.ม.", note: "ลอนแนวตั้งพรางสายตาแต่ผ่านแสง", noteEn: "Vertical flutes: privacy + light", colors: [["ใส", "#C8D8DC"], ["ชาอ่อน", "#B8A890"]], sizes: ["ลอน 10 มม.", "ลอน 20 มม."] },
  { cat: 9, brand: "CoolCoat", seller: "CoolCoat Thailand", model: "SolarShield", th: "สีสะท้อนความร้อน", en: "Heat-reflective paint", unit: "ถัง 9 ล.", base: 2450, spec: "SRI 108 · VOC <50 g/L", specEn: "SRI 108 · VOC <50", cert: "ฉลากเขียว", lead: "3 วัน", wty: "10 ปี", moq: "1 ถัง", note: "ทา 2 เที่ยว เว้น 4 ชม. ค่า SRI ถึงสเปก", noteEn: "2 coats, 4 h apart for rated SRI", colors: [["ขาวออฟไวท์", "#EDEBE6"], ["เทาอ่อน", "#CCCCC8"], ["ครีม", "#E4DCC8"]], sizes: ["9 ล.", "18.9 ล."] },
  { cat: 9, brand: "ColorLab", seller: "ColorLab Paint", model: "LimeWash", th: "สีปูนไลม์วอช", en: "Limewash", unit: "ถัง 5 ล.", base: 1650, spec: "ผิวด้านมีมิติ · ระบายไอน้ำ", specEn: "Matte texture · breathable", cert: "—", lead: "7 วัน", wty: "5 ปี", moq: "1 ถัง", note: "ต้องทารองพื้นแร่ก่อนเสมอ", noteEn: "Mineral primer required", colors: [["ขาวปูน", "#E8E4DC"], ["เทาหมอก", "#C4C2BC"], ["ดินเผา", "#C89078"], ["เขียวโคลน", "#A8AC94"]], sizes: ["5 ล."] },
  { cat: 10, brand: "GreenBuild", seller: "GreenBuild Insulation", model: "RockVolc", th: "ฉนวนใยหินภูเขาไฟ", en: "Rockwool", unit: "ตร.ม.", base: 185, spec: "60 kg/m³ · ไม่ลามไฟ A1 · NRC 0.90", specEn: "60 kg/m³ · A1 · NRC 0.90", cert: "ASTM C612", lead: "10 วัน", wty: "—", moq: "50 ตร.ม.", note: "ติดตั้งสวมถุงมือ ใยอาจระคายผิว", noteEn: "Wear gloves when installing", colors: [["เขียวขี้ม้า", "#8B8F72"]], sizes: ["50 มม.", "75 มม.", "100 มม."] },
  { cat: 10, brand: "ThermoSafe", seller: "ThermoSafe", model: "PE Foil", th: "ฉนวน PE สะท้อนรังสี", en: "PE reflective foil", unit: "ม้วน", base: 1250, spec: "หนา 5 มม. · ฟอยล์ 2 หน้า", specEn: "5 mm · double foil", cert: "—", lead: "3 วัน", wty: "10 ปี", moq: "1 ม้วน", note: "เว้นช่องอากาศ 25 มม. เพื่อประสิทธิภาพสูงสุด", noteEn: "25 mm air gap for best result", colors: [["ฟอยล์เงิน", "#C8CCD0"]], sizes: ["ม้วน 60 ตร.ม."] },
  { cat: 11, brand: "Fabrica", seller: "Fabrica TH", model: "Crib 5", th: "ผ้าบุกันน้ำกันไฟ", en: "FR waterproof fabric", unit: "ม.", base: 780, spec: "Martindale 60,000 · BS5852", specEn: "Martindale 60k · BS5852", cert: "—", lead: "18 วัน", wty: "—", moq: "10 ม.", note: "หน้ากว้าง 140 ซม. เผื่อลาย 10%", noteEn: "140 cm width, +10% pattern", colors: [["ชมพูตุ่น", "#B98A94"], ["เทาเข้ม", "#787880"], ["เขียวขวด", "#5A7868"], ["ครีม", "#D8CCB8"]], sizes: ["140 ซม."] },
  { cat: 11, brand: "Upholstery", seller: "Upholstery House", model: "MicroLeather", th: "หนังไมโครไฟเบอร์", en: "Microfiber leather", unit: "ม.", base: 1150, spec: "ทนขีดข่วน · เช็ดล้างได้", specEn: "Scratch-proof · wipeable", cert: "—", lead: "12 วัน", wty: "3 ปี", moq: "5 ม.", note: "เหมาะงาน hospitality ใช้งานหนัก", noteEn: "For heavy hospitality use", colors: [["น้ำตาลคาราเมล", "#9A6A48"], ["ดำ", "#3A3A3C"], ["เทาอุ่น", "#8A847C"]], sizes: ["137 ซม."] },
  { cat: 12, brand: "AquaFit", seller: "AquaFit", model: "EcoFlow", th: "ก๊อกอ่างประหยัดน้ำ", en: "Water-saving faucet", unit: "ชุด", base: 2890, spec: "4.5 ล./นาที · Chrome", specEn: "4.5 L/min · chrome", cert: "ฉลากประหยัดน้ำ", lead: "7 วัน", wty: "5 ปี", moq: "1 ชุด", note: "มีวาล์วเซรามิกกันหยด", noteEn: "Ceramic drip-free valve", colors: [["โครเมียม", "#A9B4BC"], ["ดำด้าน", "#4A4C50"], ["ทองแชมเปญ", "#C0A878"]], sizes: ["ก้านสั้น", "ก้านสูง"] },
  { cat: 12, brand: "BathPro", seller: "BathPro Studio", model: "RainSet", th: "ชุดฝักบัวเรนชาวเวอร์", en: "Rain shower set", unit: "ชุด", base: 6890, spec: "หัว 250 มม. · แรงดันต่ำใช้ได้", specEn: "250 mm head · low-pressure OK", cert: "—", lead: "10 วัน", wty: "5 ปี", moq: "1 ชุด", note: "แถมวาล์วกันน้ำร้อนลวก", noteEn: "Anti-scald valve included", colors: [["โครเมียม", "#AAB4BC"], ["นิกเกิลด้าน", "#9A9C98"]], sizes: ["ฝังผนัง", "ลอยผนัง"] },
  { cat: 13, brand: "Lumina", seller: "Lumina Lighting", model: "TrackPro", th: "ราง Magnetic Track", en: "Magnetic track", unit: "ชุด/ม.", base: 1850, spec: "48V · CRI 90 · Dim to warm", specEn: "48V · CRI 90 · DTW", cert: "มอก. 1955", lead: "14 วัน", wty: "3 ปี", moq: "3 ม.", note: "หัวโคมถอดสลับได้โดยไม่ตัดไฟ", noteEn: "Hot-swappable heads", colors: [["ดำ", "#38383A"], ["ขาว", "#E4E4E2"]], sizes: ["ฝังฝ้า", "ลอยฝ้า"] },
  { cat: 13, brand: "BrightWorks", seller: "BrightWorks", model: "LinearSlim", th: "โคมไฟเส้น LED", en: "LED linear", unit: "ม.", base: 950, spec: "CRI 90 · 3000K/4000K · IP44", specEn: "CRI 90 · IP44", cert: "มอก. 1955", lead: "7 วัน", wty: "3 ปี", moq: "5 ม.", note: "ตัดความยาวตามแบบได้ทุก 50 มม.", noteEn: "Cut-to-length per 50 mm", colors: [["อลูมิเนียม", "#B0B4B8"], ["ดำ", "#3C3C3E"]], sizes: ["กว้าง 20 มม.", "กว้าง 35 มม."] },
];

const REV_POOL = [
  { role: "สถาปนิก", roleEn: "Architect", stars: 5, th: "สเปกตรงตามเอกสาร ติดตั้งจริงสีไม่เพี้ยนจากตัวอย่าง", en: "Matches datasheet, installed color true to sample" },
  { role: "ผู้รับเหมา", roleEn: "Contractor", stars: 4, th: "ของมาตรงเวลา แพ็กกิ้งดี มีแตกเสียหาย 2 แผ่นแต่เคลมไว", en: "On-time, well packed, 2 damaged pieces claimed fast" },
  { role: "มัณฑนากร", roleEn: "Interior designer", stars: 5, th: "ลูกค้าชอบมาก ผิวสัมผัสจริงดีกว่าในรูป", en: "Client loved it, texture better than photos" },
  { role: "ผู้รับเหมา", roleEn: "Contractor", stars: 4, th: "ติดตั้งง่าย คู่มือละเอียด แนะนำเผื่อของ 7%", en: "Easy install, good manual, order +7% waste" },
  { role: "เจ้าของโครงการ", roleEn: "Owner", stars: 4, th: "ใช้มา 1 ปี สภาพยังดี ทำความสะอาดง่าย", en: "1 year in, holding up well, easy to clean" },
  { role: "สถาปนิก", roleEn: "Architect", stars: 5, th: "เซลล์ตอบไว ส่งตัวอย่างถึงออฟฟิศใน 2 วัน", en: "Fast sales response, samples in 2 days" },
  { role: "สถาปนิก", roleEn: "Architect", stars: 3, th: "ของดีแต่ lead time จริงนานกว่าที่แจ้ง ควรเผื่อเวลา", en: "Good product but real lead time longer than quoted" },
  { role: "ผู้รับเหมา", roleEn: "Contractor", stars: 5, th: "ล็อตสีสม่ำเสมอ ตัดแต่งหน้างานไม่บิ่น", en: "Consistent lot color, clean site cuts" },
];

const PRODUCTS = [];
GEN.forEach((g, gi) => {
  const c = CATS[g.cat];
  g.colors.forEach(([cn, hex], ci) => {
    g.sizes.forEach((sz, si) => {
      const i = PRODUCTS.length;
      const price = Math.round(g.base * (1 + si * 0.12 + ci * 0.03));
      const rating = Math.round((3.8 + ((gi * 7 + ci * 3 + si) % 12) / 10) * 10) / 10;
      const rcount = 4 + ((gi * 13 + ci * 5 + si * 3) % 117);
      const revs = [0, 1, 2].map((k) => REV_POOL[(gi + ci + si + k * 3) % REV_POOL.length]);
      PRODUCTS.push({
        id: `MAT-${String(i + 1).padStart(4, "0")}`,
        name: `${g.th} ${g.brand} ${g.model} ${cn} ${sz}`,
        nameEn: `${g.en} ${g.brand} ${g.model} ${cn} ${sz}`,
        cat: c.key, tex: c.tex, swatch: hex,
        brand: g.brand, model: g.model, sku: `${g.brand.slice(0, 2).toUpperCase()}-${g.model.replace(/\s/g, "").slice(0, 4).toUpperCase()}-${String(ci + 1)}${String(si + 1)}${String(gi).padStart(2, "0")}`,
        color: cn, size: sz, price, unit: g.unit, seller: g.seller,
        spec: g.spec, specEn: g.specEn, cert: g.cert, lead: g.lead, wty: g.wty, moq: g.moq, note: g.note, noteEn: g.noteEn,
        rating: Math.min(rating, 4.9), rcount, revs,
      });
    });
  });
});
const P = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const findP = (brand, colorIdx = 0) => PRODUCTS.find((p) => p.brand === brand && p.color === GEN.find((g) => g.brand === brand).colors[colorIdx][0]);

const INITIAL_ROWS_F = () => {
  const a = findP("Siam Terrazzo"), b = findP("Woodwork"), b2 = findP("FloorMaster"), c = findP("บ้านโป่ง"), d = findP("ClearView"), e = findP("CoolCoat");
  return [
    { rid: 1, code: "FL-01", zone: "พื้นล็อบบี้ + ทางเดินหลัก", cat: a.cat, options: [a.id], pid: a.id, status: "quoted", quote: Math.round(a.price * 0.96), qty: 420, qunit: "ตร.ม.", quoteBy: a.seller },
    { rid: 2, code: "FL-02", zone: "พื้นห้องพัก (ชั้น 2–4)", cat: b.cat, options: [b.id, b2.id], pid: null, status: "options", qty: 1650, qunit: "ตร.ม." },
    { rid: 3, code: "WL-01", zone: "ผนังภายนอก อาคาร A", cat: c.cat, options: [c.id], pid: c.id, status: "chosen", qty: 18000, qunit: "ก้อน" },
    { rid: 4, code: "WL-02", zone: "ผนัง Feature หลัง Reception", cat: null, options: [], pid: null, status: "empty", qty: 46, qunit: "ตร.ม." },
    { rid: 5, code: "CE-01", zone: "ฝ้าห้องอาหาร (ควบคุมเสียง)", cat: null, options: [], pid: null, status: "empty", qty: 180, qunit: "ตร.ม." },
    { rid: 6, code: "GL-01", zone: "กระจก Facade ทิศตะวันตก", cat: d.cat, options: [d.id], pid: d.id, status: "chosen", qty: 260, qunit: "ตร.ม." },
    { rid: 7, code: "PT-01", zone: "สีภายนอกทั้งโครงการ", cat: e.cat, options: [e.id], pid: e.id, status: "chosen", qty: 34, qunit: "ถัง" },
  ];
};

const Stars = ({ v }) => (
  <span className="stars" aria-label={`คะแนน ${v} จาก 5`}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= Math.round(v) ? "st on" : "st"}>★</span>)}
  </span>
);

export default function App() {
  const [lang, setLang] = useState("th"); // default ไทย
  const t = L[lang];
  const pn = (p) => (lang === "en" && p.nameEn ? p.nameEn : p.name);
  const ps = (p) => (lang === "en" && p.specEn ? p.specEn : p.spec);
  const pnote = (p) => (lang === "en" && p.noteEn ? p.noteEn : p.note);
  const cn = (k) => (lang === "en" ? catEn(k) : k);

  const [view, setView] = useState("home"); // home | catalog | schedule | seller | store
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("ทั้งหมด");
  const [mode, setMode] = useState("full");
  const [storeFor, setStoreFor] = useState(null); // seller name
  const [chatFor, setChatFor] = useState(null); // seller name
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const [projects, setProjects] = useState(() => [{ id: 1, name: "โรงแรมบูทีค เขาใหญ่", rows: INITIAL_ROWS_F() }]);
  const [cur, setCur] = useState(0);
  const proj = projects[cur];
  const rows = proj.rows;
  const setRows = (up) => setProjects((ps2) => ps2.map((p, i) => (i === cur ? { ...p, rows: typeof up === "function" ? up(p.rows) : up } : p)));

  const [events, setEvents] = useState([]);
  const track = (name, meta) => setEvents((e) => [...e, { t: new Date(), name, meta }]);
  const countEv = (name) => events.filter((e) => e.name === name).length;

  const [metricsOpen, setMetricsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState(null);
  const [importName, setImportName] = useState("");
  const [newProjOpen, setNewProjOpen] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [custom, setCustom] = useState([]);
  const [compare, setCompare] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [pickingRow, setPickingRow] = useState(null);
  const [checked, setChecked] = useState({});
  const [rfqOpen, setRfqOpen] = useState(false);
  const [rfqDeadline, setRfqDeadline] = useState("7 วัน");
  const [rfqNote, setRfqNote] = useState("");
  const [rfqSample, setRfqSample] = useState(true);
  const [veFor, setVeFor] = useState(null);
  const [veUsed, setVeUsed] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customSeller, setCustomSeller] = useState("");
  const [leadFor, setLeadFor] = useState(null);
  const [leadPrice, setLeadPrice] = useState("");
  const [specBook, setSpecBook] = useState(false);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);

  /* ── v7: Workspace 2 ฝั่ง ── */
  const [dwsTab, setDwsTab] = useState("dash"); // designer workspace: dash|projects|templates|billing
  const [scTab, setScTab] = useState("dash"); // seller center: dash|rfq|materials|billing
  const [rfqFilter, setRfqFilter] = useState("new");
  const [plan, setPlan] = useState("free"); // designer: free|pro|studio
  const [sellerPlan, setSellerPlan] = useState("standard");
  const [templates, setTemplates] = useState([
    { name: "บ้านเดี่ยว", sys: true }, { name: "คอนโดมิเนียม", sys: true }, { name: "ออฟฟิศ", sys: true }, { name: "ร้านค้า", sys: true }, { name: "โรงแรม", sys: true },
  ]);
  const [matSets, setMatSets] = useState([]);
  const [gate, setGate] = useState(null); // studio paywall gate
  const [sellerMats, setSellerMats] = useState([]);
  const [matStatus, setMatStatus] = useState({}); // id -> เผยแพร่|ซ่อน
  const [matForm, setMatForm] = useState(null); // {..fields} หรือ null
  const [projStatus, setProjStatus] = useState({}); // project id -> Active|Archived

  const notify = (m) => { setToast(m); setTimeout(() => setToast(null), 3200); };
  const ALL = useMemo(() => ({ ...P, ...Object.fromEntries([...custom, ...sellerMats].map((p) => [p.id, p])) }), [custom, sellerMats]);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return [...PRODUCTS, ...custom, ...sellerMats.filter((p) => (matStatus[p.id] || "ฉบับร่าง") === "เผยแพร่")].filter((p) =>
      (cat === "ทั้งหมด" || p.cat === cat) &&
      (!q || p.name.toLowerCase().includes(q) || (p.nameEn || "").toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q) || (p.model || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || p.seller.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
    );
  }, [query, cat, custom, sellerMats, matStatus]);

  const repOf = (r) => (r.pid ? ALL[r.pid] : r.options.length ? ALL[r.options[0]] : null);
  const statusOf = (r) => (r.status === "sent" || r.status === "quoted" ? r.status : r.pid ? "chosen" : r.options.length ? "options" : "empty");
  const statusText = (r) => {
    const s = statusOf(r);
    return s === "sent" ? `${t.stSent} ${r.pending || ""}` : s === "quoted" ? t.stQuoted : s === "chosen" ? t.stChosen : s === "options" ? `${t.stOpt} ${r.options.length}` : t.stEmpty;
  };

  const addOption = (code, product) => {
    setRows((rs) => rs.map((r) => {
      if (r.code !== code || r.options.includes(product.id)) return r;
      return { ...r, options: [...r.options, product.id].slice(0, 4), cat: r.cat || product.cat, status: r.pid ? r.status : "options" };
    }));
    track("option_added", { code });
    notify(lang === "th" ? `เก็บ ${pn(product)} เป็นตัวเลือกของ ${code} แล้ว` : `Saved ${pn(product)} as an option for ${code}`);
  };
  const confirmOption = (rid, pid) => { setRows((rs) => rs.map((r) => (r.rid === rid ? { ...r, pid, status: "chosen", quote: undefined, quoteBy: undefined } : r))); track("material_confirmed"); };
  const removeOption = (rid, pid) => setRows((rs) => rs.map((r) => {
    if (r.rid !== rid) return r;
    const options = r.options.filter((x) => x !== pid);
    const sp = r.pid === pid ? null : r.pid;
    return { ...r, options, pid: sp, status: sp ? "chosen" : options.length ? "options" : "empty" };
  }));
  const editRow = (rid, patch) => setRows((rs) => rs.map((r) => (r.rid === rid ? { ...r, ...patch } : r)));
  const addRow = () => { setRows((rs) => [...rs, { rid: Date.now(), code: `NEW-${String(rows.length + 1).padStart(2, "0")}`, zone: lang === "th" ? "ระบุตำแหน่งใช้งาน…" : "Set location…", cat: null, options: [], pid: null, status: "empty", qty: 0, qunit: "ตร.ม." }]); track("row_added"); };
  const delRow = (rid) => setRows((rs) => rs.filter((r) => r.rid !== rid));

  const goPick = (row) => {
    setPickingRow(row); setQuery("");
    if (row.cat && CATEGORIES.includes(row.cat)) { setCat(row.cat); setView("catalog"); }
    else { setCat("ทั้งหมด"); setView("home"); }
  };
  const pickCat = (c) => { setCat(c); setView("catalog"); track("category_opened", { cat: c }); };
  const toggleCompare = (id) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  const placeFromCatalog = (product) => {
    if (pickingRow) { addOption(pickingRow.code, product); setPickingRow(null); setView("schedule"); }
    else { const tg = rows.find((r) => !r.pid && !r.options.length) || rows[rows.length - 1]; addOption(tg.code, product); }
    setShowCompare(false); setCompare([]); setDetail(null);
  };

  const eligible = (r) => r.options.length > 0;
  const rfqTargets = rows.filter((r) => checked[r.rid] && eligible(r));
  const rfqBrands = new Set(rfqTargets.flatMap((tt) => tt.options.map((o) => ALL[o]?.seller))).size;
  const sampleCount = rfqTargets.length;
  const confirmRfq = () => {
    track("rfq_sent", { items: rfqTargets.length, brands: rfqBrands });
    setRows((rs) => rs.map((r) => (checked[r.rid] && eligible(r) && r.status !== "quoted" ? { ...r, status: "sent", pending: r.options.length * 3 } : r)));
    notify(lang === "th" ? `ส่งแล้ว ${rfqTargets.length} รายการ ถึงผู้ขาย ${rfqBrands * 3} ราย` : `Sent ${rfqTargets.length} items to ${rfqBrands * 3} sellers`);
    setChecked({}); setRfqOpen(false); setRfqNote("");
    setTimeout(() => {
      setRows((rs) => {
        const f = rs.find((r) => statusOf(r) === "sent");
        if (!f) return rs;
        const pid = f.pid || f.options[0];
        return rs.map((r) => (r === f ? { ...r, pid, status: "quoted", quote: Math.round(ALL[pid].price * 0.94), quoteBy: ALL[pid].seller, pending: undefined } : r));
      });
      notify(lang === "th" ? "ใบเสนอราคาแรกเข้าแล้ว — ต่ำกว่าราคาตั้ง 6%" : "First quote in — 6% below list price");
    }, 3000);
  };

  const createProject = (mf) => {
    const name = newProjName.trim() || (lang === "th" ? `โปรเจกต์ที่ ${projects.length + 1}` : `Project ${projects.length + 1}`);
    const base = mf === "duplicate" ? rows : INITIAL_ROWS_F();
    const nr = base.map((r, i) => ({ rid: Date.now() + i, code: r.code, zone: r.zone, cat: mf === "duplicate" ? r.cat : null, qty: r.qty, qunit: r.qunit, options: mf === "duplicate" ? [...r.options] : [], pid: mf === "duplicate" ? r.pid : null, status: "empty" }));
    nr.forEach((r) => { r.status = r.pid ? "chosen" : r.options.length ? "options" : "empty"; });
    setProjects((ps2) => [...ps2, { id: Date.now(), name, rows: nr }]);
    setCur(projects.length); track("project_created", { from: mf });
    setNewProjOpen(false); setNewProjName(""); setView("schedule");
  };
  const aoaToRows = (aoa) => {
    if (!aoa || !aoa.length) return [];
    const keys = ["รหัส", "code", "ตำแหน่ง", "zone", "location", "ปริมาณ", "qty", "จำนวน", "หน่วย", "unit"];
    const hIdx = aoa.findIndex((row) => row.some((cc) => keys.some((k) => String(cc ?? "").toLowerCase().includes(k))));
    const head = hIdx >= 0 ? aoa[hIdx].map((cc) => String(cc ?? "").toLowerCase()) : [];
    const col = (ks, fb) => { const i = head.findIndex((h) => ks.some((k) => h.includes(k))); return i >= 0 ? i : fb; };
    const ci = { code: col(["รหัส", "code"], 0), zone: col(["ตำแหน่ง", "zone", "location"], 1), qty: col(["ปริมาณ", "qty", "จำนวน"], 2), qunit: col(["หน่วย", "unit"], 3) };
    return aoa.slice(hIdx + 1).filter((row) => String(row[ci.code] ?? "").trim()).slice(0, 60).map((row, i) => ({ rid: Date.now() + i, code: String(row[ci.code]).trim(), zone: String(row[ci.zone] ?? "…").trim(), cat: null, qty: parseFloat(String(row[ci.qty] ?? "").replace(/,/g, "")) || 0, qunit: String(row[ci.qunit] ?? "ตร.ม.").trim(), options: [], pid: null, status: "empty" }));
  };
  const handleImportFile = (file) => {
    if (!file) return;
    setImportName(file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
    const rd = new FileReader();
    rd.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const parsed = aoaToRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
        parsed.length ? setImportRows(parsed) : notify("อ่านไฟล์ได้ แต่ไม่พบแถวข้อมูล");
      } catch { notify("อ่านไฟล์ไม่สำเร็จ — ลองบันทึกเป็น .xlsx"); }
    };
    rd.readAsArrayBuffer(file);
  };
  const handleImportPaste = (text) => {
    const parsed = aoaToRows(text.split(/\r?\n/).map((l) => l.split("\t")));
    parsed.length ? setImportRows(parsed) : notify("ยังไม่พบแถวข้อมูล — วางทั้งตารางรวมหัวคอลัมน์");
  };
  const confirmImport = () => {
    setProjects((ps2) => [...ps2, { id: Date.now(), name: importName.trim() || "Excel Import", rows: importRows }]);
    setCur(projects.length); track("excel_import", { rows: importRows.length }); track("project_created", { from: "excel" });
    setImportOpen(false); setImportRows(null); setView("schedule");
  };

  const veAlts = useMemo(() => {
    const pid = veFor && (veFor.pid || veFor.options[0]);
    if (!pid) return [];
    const cu = ALL[pid];
    return PRODUCTS.filter((p) => p.cat === cu.cat && p.id !== cu.id && p.price < cu.price).sort((a, b) => b.price - a.price).slice(0, 3);
  }, [veFor, ALL]);
  const applyVe = (alt) => {
    const pid = veFor.pid || veFor.options[0];
    const old = ALL[pid];
    const save = Math.round((1 - alt.price / old.price) * 100);
    setRows((rs) => rs.map((r) => (r.rid === veFor.rid ? { ...r, pid: alt.id, options: [...new Set([...r.options, alt.id])], status: "chosen", quote: undefined, quoteBy: undefined, ve: [...(r.ve || []), { from: pn(old), save }] } : r)));
    track("ve_applied", { save }); setVeFor(null); setVeUsed(true);
  };
  const addCustom = () => {
    if (!customName.trim()) return;
    const id = `CUS-${String(custom.length + 1).padStart(4, "0")}`;
    const p = { id, name: customName.trim(), nameEn: customName.trim(), cat: cat !== "ทั้งหมด" ? cat : (pickingRow?.cat || CATS[0].key), tex: "paint", price: 0, unit: "—", seller: customSeller.trim() || "ระบุภายหลัง", swatch: "#E3DFD6", spec: "วัสดุกำหนดเอง", specEn: "Custom material", cert: "—", lead: "—", brand: customSeller.trim() || "—", model: "—", sku: id, color: "—", size: "—", note: "—", noteEn: "—", rating: 0, rcount: 0, revs: [], custom: true };
    setCustom((c) => [...c, p]); track("custom_material");
    setCustomOpen(false); setCustomName(""); setCustomSeller("");
    if (pickingRow) placeFromCatalog(p);
  };
  const sendQuote = () => {
    const num = parseFloat(String(leadPrice).replace(/,/g, ""));
    if (!num || !leadFor) return;
    const pid = leadFor.pid || leadFor.options[0];
    setRows((rs) => rs.map((r) => (r.rid === leadFor.rid ? { ...r, pid, status: "quoted", quote: Math.round(num), quoteBy: ALL[pid].seller, pending: undefined } : r)));
    setLeadFor(null); setLeadPrice("");
  };
  const openChat = (seller) => {
    setChatFor(seller); track("chat_opened", { seller });
    setChatMsgs([{ who: "v", text: lang === "th" ? `สวัสดีครับ ${seller} ยินดีให้บริการ สนใจสินค้าตัวไหน แจ้งปริมาณคร่าว ๆ ได้เลยครับ` : `Hi! ${seller} here — which product are you interested in? Share rough quantities anytime.` }]);
  };
  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMsgs((m) => [...m, { who: "u", text: msg }]);
    setChatInput("");
    setTimeout(() => setChatMsgs((m) => [...m, { who: "v", text: lang === "th" ? `รับทราบครับ เดี๋ยวทีมขายคำนวณราคาโครงการ "${proj.name}" ให้ ภายในวันนี้ พร้อมแนบ Specsheet ให้ทางแชทนี้เลยครับ` : `Got it — our team will price it for "${proj.name}" today and attach the specsheet here.` }]), 1400);
  };
  const rfqInbox = rows.filter((r) => statusOf(r) === "sent" || statusOf(r) === "quoted");
  const chosenCount = rows.filter((r) => r.pid).length;
  const sellerProducts = (s) => PRODUCTS.filter((p) => p.seller === s);

  const Swatch = ({ p, h = 110, onClick, children, style }) => (
    <div className="swatch" style={{ ...tex(p), height: h, ...style }} onClick={onClick}>{children}</div>
  );
  const SellerBadge = ({ s, size = 34 }) => {
    const sl = SELLERS[s] || { logo: s.slice(0, 2).toUpperCase(), color: "#8A94A0" };
    return <span className="slogo" style={{ background: sl.color, width: size, height: size, fontSize: size * 0.38 }}>{sl.logo}</span>;
  };


  /* ── v7 helpers ── */
  const MY_SELLER = "Siam Terrazzo Co.";
  const completeness = (p) => {
    const f = [p.spec, p.cert && p.cert !== "—", p.lead && p.lead !== "—", p.moq, p.wty && p.wty !== "—", p.note && p.note !== "—", p.swatch];
    return Math.round((f.filter(Boolean).length / 7) * 100);
  };
  const myMats = [...PRODUCTS.filter((p) => p.seller === MY_SELLER), ...sellerMats];
  const veSaveTotal = rows.reduce((sm, r) => {
    if (!r.ve?.length) return sm;
    const p = repOf(r);
    return sm + Math.round((r.ve[r.ve.length - 1].save / 100) * (p ? p.price : 0) * (r.qty || 0));
  }, 0);
  const slaLeft = (r) => 48 - (r.rid % 40 || 17);
  const sentRows = rows.filter((r) => statusOf(r) === "sent");
  const quotedRows = rows.filter((r) => statusOf(r) === "quoted");
  const saveTemplate = () => {
    if (plan !== "studio") { setGate("template"); track("studio_gate_seen", { at: "template" }); return; }
    setTemplates((tp) => [...tp, { name: `โครงจาก "${proj.name}"`, sys: false }]);
    track("template_saved"); notify(lang === "th" ? "บันทึกเป็น template ออฟฟิศแล้ว" : "Saved as office template");
  };
  const saveSet = () => {
    if (plan !== "studio") { setGate("set"); track("studio_gate_seen", { at: "set" }); return; }
    const pids = rows.filter((r) => r.pid).map((r) => r.pid);
    if (!pids.length) return notify(lang === "th" ? "ยังไม่มีวัสดุที่ confirm ในโปรเจกต์นี้" : "No confirmed materials yet");
    setMatSets((ms) => [...ms, { name: `ชุดจาก "${proj.name}"`, pids }]);
    track("set_created", { n: pids.length }); notify(lang === "th" ? `บันทึกชุดวัสดุ ${pids.length} รายการแล้ว` : `Saved a set of ${pids.length}`);
  };
  const applySet = (st) => {
    setRows((rs) => {
      let out = [...rs];
      st.pids.forEach((pid, i) => {
        const p = ALL[pid]; if (!p) return;
        const idx = out.findIndex((r) => !r.options.length && (!r.cat || r.cat === p.cat));
        if (idx >= 0) out[idx] = { ...out[idx], options: [pid], cat: p.cat, status: "options" };
        else out.push({ rid: Date.now() + i, code: `SET-${String(i + 1).padStart(2, "0")}`, zone: p.cat, cat: p.cat, options: [pid], pid: null, status: "options", qty: 0, qunit: "ตร.ม." });
      });
      return out;
    });
    track("set_applied"); notify(lang === "th" ? `ใส่ชุด "${st.name}" ลงโปรเจกต์แล้ว — ไป confirm ในตาราง` : `Set applied — confirm in schedule`);
    setView("schedule");
  };
  const saveMat = () => {
    const m = matForm;
    if (!m.name?.trim()) return;
    const id = m.id || `SLR-${String(sellerMats.length + 1).padStart(4, "0")}`;
    const np = { id, name: m.name, nameEn: m.name, cat: m.cat || CATS[1].key, tex: CATS.find((c) => c.key === (m.cat || CATS[1].key))?.tex || "paint", swatch: m.swatch || "#C9C2B4", brand: m.brand || MY_SELLER, model: m.model || "—", sku: m.sku || id, color: m.color || "—", size: m.size || "—", price: parseFloat(m.price) || 0, unit: m.unit || "ตร.ม.", seller: MY_SELLER, spec: m.spec || "", specEn: m.spec || "", cert: m.cert || "—", lead: m.lead || "—", moq: m.moq || "", wty: m.wty || "—", note: m.note || "—", noteEn: m.note || "—", rating: 0, rcount: 0, revs: [] };
    setSellerMats((sm) => (m.id ? sm.map((x) => (x.id === m.id ? np : x)) : [...sm, np]));
    setMatStatus((ms) => ({ ...ms, [id]: ms[id] || "ฉบับร่าง" }));
    track("material_added", { completeness: completeness(np) });
    setMatForm(null); notify(lang === "th" ? `บันทึกสินค้าแล้ว · ความครบของข้อมูล ${completeness(np)}%` : `Saved · data ${completeness(np)}%`);
  };
  const Side = ({ items, tab, setTab }) => (
    <nav className="side">
      {items.map(([k, ic, label]) => (
        <a key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{ic} {label}</a>
      ))}
    </nav>
  );
  const PlanCards = ({ plans, curPlan, onPick }) => (
    <div className="plan-grid">
      {plans.map(([k, name, price, feats]) => (
        <div key={k} className={"plan-card" + (curPlan === k ? " cur" : "")}>
          <b>{name}</b>
          <div className="plan-price">{price}</div>
          <ul>{feats.map((f) => <li key={f}>{f}</li>)}</ul>
          {curPlan === k ? <span className="status s-chosen">{lang === "th" ? "แผนปัจจุบัน" : "Current"}</span> : <button className="btn sm" onClick={() => onPick(k)}>{lang === "th" ? "เปลี่ยนเป็นแผนนี้" : "Switch"}</button>}
        </div>
      ))}
    </div>
  );

  /* ════════ RENDER ════════ */
  return (
    <div className="app">
      <style>{CSS}</style>
      <header>
        <div className="logo" onClick={() => setView("home")}>MatList<small>{t.tagline}</small></div>
        <nav className="nav-links">
          <a className={view === "catalog" || view === "home" || view === "store" ? "on" : ""} onClick={() => setView("home")}>{t.navCat}</a>
          <a className={view === "schedule" ? "on" : ""} onClick={() => setView("schedule")}>{t.navSched}</a>
          <a className={view === "work" ? "on" : ""} onClick={() => setView("work")}>Workspace</a>
          <a className={view === "seller" ? "on" : ""} onClick={() => setView("seller")}>Seller Center</a>
          <button className="metric-link" onClick={() => setMetricsOpen(true)}>{t.metric} {events.length}</button>
          <div className="lang-tg" role="group" aria-label="Language">
            <button className={lang === "th" ? "on" : ""} onClick={() => setLang("th")}>ไทย</button>
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
        </nav>
        <div className="search-bubble">
          <span className="search-ic">⌕</span>
          <input value={query} placeholder={t.searchPh}
            onFocus={() => view !== "catalog" && setView("catalog")}
            onChange={(e) => { setQuery(e.target.value); if (view !== "catalog") setView("catalog"); }} aria-label={t.navCat} />
        </div>
      </header>

      <main>
        {pickingRow && view !== "schedule" && (
          <div className="pickband">
            <span>{t.pickingFor} <b>{pickingRow.code}</b> · {pickingRow.zone} {t.pickMulti}</span>
            <button className="btn ghost sm" onClick={() => { setPickingRow(null); setView("schedule"); }}>{t.backSched}</button>
          </div>
        )}

        {view === "home" && (
          <>
            <div className="hero"><h1>{t.heroT}</h1><p>{t.heroS}</p></div>
            <div className="cat-grid">
              {CATS.map((c) => (
                <button className="cat-tile" key={c.key} onClick={() => pickCat(c.key)}>
                  <span className="cat-ic" style={{ background: c.tint }}>{c.icon}</span>
                  <span className="cat-name">{cn(c.key)}</span>
                  <span className="cat-count">{PRODUCTS.filter((p) => p.cat === c.key).length} {t.items}</span>
                </button>
              ))}
            </div>
            <div className="home-sec">{t.myWork}<small onClick={() => setNewProjOpen(true)}>{t.newProj}</small></div>
            <div className="proj-card">
              <div><b>{proj.name}</b><div className="proj-meta">{t.specDone} {chosenCount}/{rows.length} · {t.optWait} {rows.filter((r) => !r.pid && r.options.length).length}</div></div>
              <button className="btn" onClick={() => setView("schedule")}>{t.openSched}</button>
            </div>
          </>
        )}

        {view === "catalog" && (
          <>
            <div className="chip-row">
              {CATEGORIES.map((c) => <button key={c} className={"chip" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>{c === "ทั้งหมด" ? (lang === "th" ? "ทั้งหมด" : "All") : cn(c)}</button>)}
            </div>
            <div className="trust-line">{t.results} {results.length} {t.items} · {t.trust}</div>
            <div className="grid">
              {results.slice(0, 60).map((p) => (
                <article key={p.id} className="card">
                  <Swatch p={p} onClick={() => setDetail(p)}>
                    <label className="cmp" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={compare.includes(p.id)} onChange={() => toggleCompare(p.id)} /> {t.compare}
                    </label>
                  </Swatch>
                  <div className="card-body">
                    <div className="spec-id">{p.brand} · {p.model} · {p.sku}</div>
                    <h3 onClick={() => setDetail(p)}>{pn(p)}</h3>
                    <div className="rate-line"><Stars v={p.rating} /><span className="sub-td">{p.rating} ({p.rcount})</span></div>
                    <div className="card-foot">
                      <span className="price">{p.price ? p.price.toLocaleString() : "—"} <small>฿/{p.unit}</small></span>
                      <button className="btn sm" onClick={() => placeFromCatalog(p)}>{pickingRow ? `${t.pickInto} ${pickingRow.code}` : t.keep}</button>
                    </div>
                    <div className="seller-line">{p.seller}</div>
                  </div>
                </article>
              ))}
              <button className="add-card" onClick={() => setCustomOpen(true)}>
                <span className="add-plus">＋</span><b>{t.notFound}</b><span>{t.addOwn}</span>
              </button>
            </div>
            {results.length > 60 && <p className="hint" style={{ textAlign: "center" }}>{lang === "th" ? `แสดง 60 จาก ${results.length} — พิมพ์ค้นหาเพื่อกรองต่อ` : `Showing 60 of ${results.length} — refine your search`}</p>}
            {compare.length >= 2 && (
              <div className="batch live"><span>{t.cmpSel} {compare.length}</span><button className="btn sm" onClick={() => setShowCompare(true)}>{t.openCmp}</button></div>
            )}
          </>
        )}

        {/* ── ร้านผู้ผลิต/ผู้ขาย ── */}
        {view === "store" && storeFor && (
          <>
            <button className="link-btn" onClick={() => setView("catalog")}>{t.backCata}</button>
            <div className="panel store-head">
              <SellerBadge s={storeFor} size={56} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 17 }}>{storeFor}</b>
                <div className="sub-td">✓ {t.verified} · {sellerProducts(storeFor).length} {t.items}</div>
              </div>
              <button className="btn sm" onClick={() => openChat(storeFor)}>💬 {t.chat}</button>
            </div>
            <div className="home-sec">{t.storeT} {storeFor}</div>
            <div className="grid">
              {sellerProducts(storeFor).map((p) => (
                <article key={p.id} className="card">
                  <Swatch p={p} onClick={() => setDetail(p)} />
                  <div className="card-body">
                    <div className="spec-id">{p.model} · {p.sku}</div>
                    <h3 onClick={() => setDetail(p)}>{pn(p)}</h3>
                    <div className="rate-line"><Stars v={p.rating} /><span className="sub-td">{p.rating}</span></div>
                    <div className="card-foot">
                      <span className="price">{p.price.toLocaleString()} <small>฿/{p.unit}</small></span>
                      <button className="btn sm" onClick={() => placeFromCatalog(p)}>{pickingRow ? `${t.pickInto} ${pickingRow.code}` : t.keep}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {view === "schedule" && (
          <>
            <div className="panel">
              <div className="sched-head">
                <div>
                  <h2>{t.schedT} · <select className="cell-edit" style={{ fontWeight: 700 }} value={cur} onChange={(e) => { const v = e.target.value; v === "new" ? setNewProjOpen(true) : setCur(Number(v)); }} aria-label="project">
                    {projects.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}
                    <option value="new">{t.newProj}</option>
                  </select></h2>
                  <div className="sched-sub">{t.specDone} {chosenCount}/{rows.length} · {t.schedSub}</div>
                </div>
                <div className="head-actions">
                  <button className="btn ghost sm" onClick={() => { setImportOpen(true); setImportRows(null); }}>{t.importX}</button>
                  <button className="btn ghost sm" onClick={() => { track("revit_waitlist"); notify("Revit waitlist ✓"); }}>{t.revit}</button>
                  <button className="btn sm" onClick={() => { setSpecBook(true); track("specbook_open"); }}>{t.book}</button>
                </div>
              </div>
              <div className="seg" role="tablist">
                {[["full", t.vFull], ["compact", t.vCompact], ["grid", t.vGrid], ["board", t.vBoard]].map(([k, tt]) => (
                  <button key={k} className={mode === k ? "on" : ""} onClick={() => { setMode(k); track("viewmode", { mode: k }); }}>{tt}</button>
                ))}
              </div>

              {(mode === "full" || mode === "compact") && (
                <>
                  {rows.map((r) => {
                    const s = statusOf(r);
                    const rp = repOf(r);
                    return (
                      <div className={"row-card" + (mode === "compact" ? " compact" : "")} key={r.rid}>
                        <input type="checkbox" className="row-chk" checked={!!checked[r.rid]} disabled={!eligible(r)} onChange={() => setChecked((c) => ({ ...c, [r.rid]: !c[r.rid] }))} aria-label={r.code} />
                        <div className="row-main">
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input className="cell-edit cell-code" value={r.code} onChange={(e) => editRow(r.rid, { code: e.target.value })} aria-label="code" />
                            <input className="cell-edit cell-zone" value={r.zone} onChange={(e) => editRow(r.rid, { zone: e.target.value })} aria-label="zone" />
                            <input className="cell-edit cell-qty" value={r.qty || ""} placeholder="qty" onChange={(e) => editRow(r.rid, { qty: parseFloat(e.target.value.replace(/,/g, "")) || 0 })} aria-label="qty" />
                            <span className="sub-td">{r.qunit}</span>
                          </div>
                          {mode === "compact" && rp && <div className="sub-td" style={{ marginTop: 3 }}>{rp.brand} · {rp.model} · {rp.color} · {rp.size}</div>}
                          {mode === "full" && (
                            <>
                              {r.ve?.length > 0 && <div className="ve-hist">{t.veDone} {r.ve.length} {t.saveLast} {r.ve[r.ve.length - 1].save}% ({t.from} {r.ve[r.ve.length - 1].from})</div>}
                              <div className="opt-strip">
                                {r.options.map((pid) => {
                                  const p = ALL[pid];
                                  const isMain = r.pid === pid;
                                  return (
                                    <span className={"opt" + (isMain ? " confirmed" : "")} key={pid}>
                                      <span className="sw" style={tex(p)} />
                                      <span><span className="opt-name">{pn(p)}</span><div className="opt-price">{p.price ? p.price.toLocaleString() + " ฿/" + p.unit : "—"}</div></span>
                                      {isMain ? <span className="opt-act ok">{t.useThis}</span> : <button className="opt-act ok" onClick={() => confirmOption(r.rid, pid)}>{t.confirm}</button>}
                                      <button className="opt-act" onClick={() => removeOption(r.rid, pid)} aria-label="remove">✕</button>
                                    </span>
                                  );
                                })}
                                {r.options.length < 4 && <button className="opt-add" onClick={() => goPick(r)}>{r.options.length ? t.addOpt : t.pickMat}</button>}
                              </div>
                              {/* ── สรุปข้อมูลผู้ผลิตของตัวที่ confirm ── */}
                              {r.pid && (
                                <div className="sum-grid">
                                  {[[t.sumMfr, ALL[r.pid].seller], [t.sumBrand, ALL[r.pid].brand], [t.sumModel, ALL[r.pid].model], [t.sumSku, ALL[r.pid].sku], [t.sumColor, ALL[r.pid].color], [t.sumSize, ALL[r.pid].size], [t.sumNote, pnote(ALL[r.pid])]].map(([k, v]) => (
                                    <div className="sum-cell" key={k}><div className="sum-k">{k}</div><div className="sum-v">{v}</div></div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="row-right">
                          <span className={"status s-" + s}>{statusText(r)}</span>
                          {r.quote && <span className="quote-val">{r.quote.toLocaleString()} ฿<div className="sub-td">{r.quoteBy}</div></span>}
                          {mode === "full" && r.options.length > 0 && <button className="ve-link" onClick={() => { setVeFor(r); track(veUsed ? "pro_paywall_seen" : "ve_open"); }}>{t.ve}</button>}
                          {s === "sent" && <span className="sub-td">{t.reply48}</span>}
                          <button className="row-del" onClick={() => delRow(r.rid)} aria-label="delete">🗑</button>
                        </div>
                      </div>
                    );
                  })}
                  <button className="add-row" onClick={addRow}>{t.addRow}</button>
                </>
              )}

              {mode === "grid" && (
                <div className="sched-grid">
                  {rows.map((r) => {
                    const p = repOf(r);
                    return (
                      <div className="gcell" key={r.rid}>
                        <div className="gswatch" style={p ? tex(p) : { background: "var(--bg)" }}><span className="gcode">{r.code}</span></div>
                        <div className="gbody">
                          <div className="gname">{p ? pn(p) : t.stEmpty}</div>
                          <div className="gzone">{r.zone}</div>
                          {p && <div className="sub-td">{p.brand} · {p.color} · {p.size}</div>}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                            <span className={"status s-" + statusOf(r)}>{statusText(r)}</span>
                            <button className="link-btn" onClick={() => goPick(r)}>{r.options.length ? t.addOpt : t.pickMat}</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {mode === "board" && (
                <>
                  <div className="board">
                    {rows.flatMap((r) => r.options.map((pid) => {
                      const p = ALL[pid];
                      const main = r.pid === pid || (!r.pid && r.options[0] === pid);
                      const size = main ? 128 : 88;
                      return <div key={r.rid + pid} className={"bt" + (main ? "" : " opt-ghost")} style={{ ...tex(p), width: size, height: size }} onClick={() => setDetail(p)} title={`${r.code} · ${pn(p)}`}><span>{r.code}</span></div>;
                    }))}
                  </div>
                  {rows.every((r) => !r.options.length) && <div className="empty-line">{t.boardEmpty}</div>}
                  <div className="board-hint">{t.boardHint}</div>
                </>
              )}
            </div>
            <div className={"batch" + (sampleCount ? " live" : "")}>
              <span>{sampleCount ? `${t.batchSel} ${sampleCount} · ${rfqBrands} ${t.brands}` : t.batchIdle}</span>
              <button className="btn sm" disabled={!sampleCount} onClick={() => setRfqOpen(true)}>{t.askRfq} ({sampleCount})</button>
            </div>
          </>
        )}

        {/* ════════ Designer Workspace ════════ */}
        {view === "work" && (
          <div className="ws">
            <Side tab={dwsTab} setTab={setDwsTab} items={[["dash", "🏠", lang === "th" ? "ภาพรวม" : "Dashboard"], ["projects", "📁", lang === "th" ? "โปรเจกต์" : "Projects"], ["templates", "📋", "Template & Sets"], ["billing", "💳", "Billing"]]} />
            <div className="ws-body">
              {dwsTab === "dash" && (
                <>
                  <div className="stat-grid">
                    {[[lang === "th" ? "โปรเจกต์ active" : "Active projects", projects.filter((p) => projStatus[p.id] !== "Archived").length], [lang === "th" ? "รายการรอ confirm" : "Options pending", rows.filter((r) => !r.pid && r.options.length).length], [lang === "th" ? "ใบเสนอยังไม่เปิด" : "Unread quotes", quotedRows.length], [lang === "th" ? "กล่องตัวอย่างกำลังส่ง" : "Sample boxes", sentRows.length ? 1 : 0]].map(([k, v]) => <div className="metric" key={k}><div className="stat-k">{k}</div><div className="stat-v">{v}</div></div>)}
                  </div>
                  <div className="panel" style={{ marginTop: 14 }}>
                    <h2>{lang === "th" ? "ต้องทำวันนี้" : "To do today"}</h2>
                    {quotedRows.map((r) => <div className="todo" key={r.rid} onClick={() => setView("schedule")}><span className="todo-dot ok" />{r.code} {lang === "th" ? "มีใบเสนอราคาแล้ว — พร้อมเทียบและเลือก" : "has quotes — ready to compare"}</div>)}
                    {sentRows.map((r) => <div className="todo" key={r.rid}><span className="todo-dot warn" />{r.code} {lang === "th" ? `รอผู้ขายตอบ (ส่งแล้ว ${r.pending} ราย)` : `awaiting ${r.pending} sellers`}</div>)}
                    {rows.filter((r) => !r.options.length).slice(0, 2).map((r) => <div className="todo" key={r.rid} onClick={() => goPick(r)}><span className="todo-dot" />{r.code} · {r.zone} {lang === "th" ? "ยังไม่เลือกวัสดุ" : "no material yet"}</div>)}
                    {!quotedRows.length && !sentRows.length && rows.every((r) => r.options.length) && <div className="empty-line">🎉 {lang === "th" ? "ไม่มีงานค้าง" : "All clear"}</div>}
                  </div>
                  <div className="panel hookline">
                    <div><b>{lang === "th" ? "ประหยัดจากการปรับ VE เดือนนี้" : "VE savings this month"}: ฿{veSaveTotal.toLocaleString()}</b><div className="sub-td">{lang === "th" ? "Pro ใช้ VE Finder ไม่จำกัด + เก็บประวัติทุกโปรเจกต์" : "Pro: unlimited VE + full history"}</div></div>
                    {plan === "free" && <button className="btn sm" onClick={() => setDwsTab("billing")}>{lang === "th" ? "ดูแผน Pro" : "See Pro"}</button>}
                  </div>
                  <div className="head-actions"><button className="btn sm" onClick={() => setNewProjOpen(true)}>{t.newProj}</button><button className="btn ghost sm" onClick={() => { setImportOpen(true); setImportRows(null); }}>{t.importX}</button><button className="btn ghost sm" onClick={() => setView("home")}>{t.navCat}</button></div>
                </>
              )}
              {dwsTab === "projects" && (
                <div className="panel">
                  <div className="sched-head"><h2>{lang === "th" ? "โปรเจกต์ทั้งหมด" : "All projects"}</h2><button className="btn sm" onClick={() => setNewProjOpen(true)}>{t.newProj}</button></div>
                  <table className="tbl"><thead><tr><th>{lang === "th" ? "ชื่อ" : "Name"}</th><th>{lang === "th" ? "ความคืบหน้า" : "Progress"}</th><th>{lang === "th" ? "มูลค่าวัสดุ (ประมาณ)" : "Est. value"}</th><th>{lang === "th" ? "สถานะ" : "Status"}</th><th></th></tr></thead>
                    <tbody>{projects.map((p, i) => {
                      const done = p.rows.filter((r) => r.pid).length;
                      const val = p.rows.reduce((sm, r) => sm + ((r.pid && ALL[r.pid]) ? ALL[r.pid].price * (r.qty || 0) : 0), 0);
                      const st = projStatus[p.id] || "Active";
                      return <tr key={p.id}><td><b>{p.name}</b></td><td><div className="meter"><div style={{ width: `${(done / p.rows.length) * 100}%` }} /></div><span className="sub-td">{done}/{p.rows.length}</span></td><td>฿{val.toLocaleString()}</td><td><span className={"status " + (st === "Active" ? "s-chosen" : "s-empty")}>{st}</span></td>
                        <td className="tbl-act"><button className="link-btn" onClick={() => { setCur(i); setView("schedule"); }}>{lang === "th" ? "เปิด" : "Open"}</button> <button className="link-btn" onClick={() => { setCur(i); setNewProjOpen(true); }}>Duplicate</button> <button className="link-btn" onClick={() => { setCur(i); setSpecBook(true); }}>Spec Book</button> <button className="link-btn" onClick={() => setProjStatus((ps2) => ({ ...ps2, [p.id]: st === "Active" ? "Archived" : "Active" }))}>{st === "Active" ? "Archive" : "คืนค่า"}</button></td></tr>;
                    })}</tbody></table>
                </div>
              )}
              {dwsTab === "templates" && (
                <>
                  <div className="panel">
                    <div className="sched-head"><h2>Project Templates</h2><button className="btn sm" onClick={saveTemplate}>{lang === "th" ? `＋ บันทึกโครง "${proj.name}" เป็น template` : "＋ Save current as template"}</button></div>
                    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))" }}>
                      {templates.map((tp) => <button key={tp.name} className="cat-tile" onClick={() => { setNewProjName(tp.name); createProject("template"); }}><span className="cat-ic" style={{ background: tp.sys ? "#F3F4F6" : "var(--brand-soft)" }}>📋</span><span className="cat-name">{tp.name}</span><span className="cat-count">{tp.sys ? (lang === "th" ? "ของระบบ" : "System") : (lang === "th" ? "ของออฟฟิศ · Studio" : "Office · Studio")}</span></button>)}
                    </div>
                  </div>
                  <div className="panel">
                    <div className="sched-head"><h2>Material Sets</h2><button className="btn sm" onClick={saveSet}>{lang === "th" ? `＋ บันทึกวัสดุที่ confirm ใน "${proj.name}" เป็นชุด` : "＋ Save confirmed materials as a set"}</button></div>
                    {!matSets.length && <p className="empty-line">{lang === "th" ? "ยังไม่มีชุดวัสดุ — บันทึกจากโปรเจกต์เพื่อใช้ซ้ำในงานหน้า (ความรู้ไม่หายตอนคนลาออก)" : "No sets yet"}</p>}
                    {matSets.map((st2, i) => <div className="todo" key={i}><span style={{ display: "flex", gap: 4 }}>{st2.pids.slice(0, 5).map((pid) => <span key={pid} className="sw-sm" style={{ ...tex(ALL[pid]), width: 22, height: 22 }} />)}</span><b style={{ flex: 1 }}>{st2.name}</b><span className="sub-td">{st2.pids.length} {t.items}</span><button className="btn ghost sm" onClick={() => applySet(st2)}>{lang === "th" ? "ใส่ลงโปรเจกต์ปัจจุบัน" : "Apply"}</button></div>)}
                  </div>
                  <div className="panel">
                    <h2>My Library</h2>
                    {!custom.length && <p className="empty-line">{lang === "th" ? "วัสดุที่คุณเพิ่มเองจะมารวมที่นี่" : "Your custom materials appear here"}</p>}
                    {custom.map((p) => <div className="todo" key={p.id}><span className="sw-sm" style={tex(p)} /><b style={{ flex: 1 }}>{p.name}</b><span className="sub-td">{p.seller}</span></div>)}
                  </div>
                </>
              )}
              {dwsTab === "billing" && (
                <div className="panel">
                  <h2>{lang === "th" ? "แพ็กเกจ & การเงิน" : "Plan & Billing"}</h2>
                  <div className="stat-grid">{[[lang === "th" ? "โปรเจกต์ active" : "Projects", `${projects.length}`], [lang === "th" ? "ที่นั่งทีม" : "Seats", plan === "studio" ? "1/10" : "1/1"], [lang === "th" ? "VE เดือนนี้" : "VE this month", veUsed ? "1/1 (Free)" : "0/1"]].map(([k, v]) => <div className="metric" key={k}><div className="stat-k">{k}</div><div className="stat-v" style={{ fontSize: 15 }}>{v}</div></div>)}</div>
                  <PlanCards curPlan={plan} onPick={(k) => { setPlan(k); track("plan_upgraded", { to: k }); notify("✓ (mock)"); }} plans={[["free", "Free", "฿0", [lang === "th" ? "ตารางสเปกไม่จำกัด" : "Unlimited schedules", "Spec Book", "RFQ"]], ["pro", "Pro", "฿690/ด.", ["VE Finder ∞", "Revit plug-in", lang === "th" ? "ประวัติ VE ทุกโปรเจกต์" : "VE history"]], ["studio", "Studio", "฿2,990/ด.", [lang === "th" ? "10 ที่นั่ง" : "10 seats", "Template ออฟฟิศ", "Material Sets", lang === "th" ? "สิทธิ์ Admin" : "Admin roles"]]]} />
                  <div className="field-label">{lang === "th" ? "เอกสารการเงิน" : "Documents"}</div>
                  {["มิ.ย. 2569", "พ.ค. 2569"].map((m) => <div className="todo" key={m}><span className="todo-dot ok" />{lang === "th" ? `ใบเสร็จ + ใบกำกับภาษีเต็มรูป — ${m}` : `Receipt + Tax invoice — ${m}`}<span style={{ flex: 1 }} /><button className="link-btn" onClick={() => notify("PDF ✓ (mock)")}>PDF</button></div>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ Seller Center ════════ */}
        {view === "seller" && (
          <div className="ws">
            <Side tab={scTab} setTab={setScTab} items={[["dash", "🏠", lang === "th" ? "ภาพรวม" : "Dashboard"], ["rfq", "📨", "RFQ & Leads"], ["materials", "📦", lang === "th" ? "จัดการวัสดุ" : "Materials"], ["billing", "💳", "Billing"]]} />
            <div className="ws-body">
              <div className="sc-ident"><SellerBadge s={MY_SELLER} size={30} /><b>{MY_SELLER}</b><span className="status s-chosen">✓ {t.verified}</span><span className="status s-options">{sellerPlan === "standard" ? "Standard" : sellerPlan === "premium" ? "Premium" : "Free"}</span></div>
              {scTab === "dash" && (
                <>
                  <div className="stat-grid">
                    <button className="metric todo-metric urgent" onClick={() => { setScTab("rfq"); setRfqFilter("new"); }}><div className="stat-k">{lang === "th" ? "RFQ ยังไม่ตอบ ⏱" : "Unanswered RFQ ⏱"}</div><div className="stat-v">{sentRows.length}</div><div className="sub-td">{sentRows.length ? (lang === "th" ? `ด่วนสุดเหลือ ${Math.min(...sentRows.map(slaLeft))} ชม.` : `${Math.min(...sentRows.map(slaLeft))} h left`) : "—"}</div></button>
                    <button className="metric todo-metric" onClick={() => notify("Chat ✓")}><div className="stat-k">{lang === "th" ? "แชทยังไม่อ่าน" : "Unread chats"}</div><div className="stat-v">{countEv("chat_opened")}</div></button>
                    <button className="metric todo-metric" onClick={() => setScTab("materials")}><div className="stat-k">{lang === "th" ? "สินค้าข้อมูลไม่ครบ" : "Incomplete listings"}</div><div className="stat-v">{myMats.filter((p) => completeness(p) < 80).length}</div></button>
                    <button className="metric todo-metric" onClick={() => setScTab("rfq")}><div className="stat-k">{lang === "th" ? "ใบเสนอใกล้หมดอายุ" : "Quotes expiring"}</div><div className="stat-v">1</div></button>
                  </div>
                  <div className="panel" style={{ marginTop: 14 }}>
                    <h2>{lang === "th" ? "สุขภาพร้าน (เทียบค่าเฉลี่ยหมวด)" : "Shop health vs category avg"}</h2>
                    <div className="stat-grid">{[["Response rate", "92%", "78%"], [lang === "th" ? "เวลาตอบเฉลี่ย" : "Avg reply", "14 ชม.", "26 ชม."], [lang === "th" ? "คะแนนรีวิว" : "Rating", "4.6", "4.2"], [lang === "th" ? "Save เข้าตาราง/สัปดาห์" : "Saves/wk", "12", "7"]].map(([k, v, avg]) => <div className="metric" key={k}><div className="stat-k">{k}</div><div className="stat-v" style={{ fontSize: 17 }}>{v}</div><div className="sub-td">{lang === "th" ? "เฉลี่ยหมวด" : "avg"} {avg}</div></div>)}</div>
                    <div className="spark">{[4, 6, 5, 8, 7, 10, 9, 12, 11, 14, 12, 16].map((v, i) => <div key={i} style={{ height: v * 5 }} title={`${v}`} />)}</div>
                    <div className="sub-td">Views · Saves · RFQ (30 {lang === "th" ? "วัน" : "days"})</div>
                  </div>
                </>
              )}
              {scTab === "rfq" && (
                <div className="panel">
                  <div className="seg">{[["new", lang === "th" ? `ใหม่ (${sentRows.length})` : `New (${sentRows.length})`], ["replied", lang === "th" ? `ตอบแล้ว (${quotedRows.length})` : `Replied (${quotedRows.length})`], ["won", lang === "th" ? "ชนะ" : "Won"], ["lost", lang === "th" ? "ไม่ได้งาน" : "Lost"]].map(([k, tt]) => <button key={k} className={rfqFilter === k ? "on" : ""} onClick={() => setRfqFilter(k)}>{tt}</button>)}</div>
                  {rfqFilter === "new" && (sentRows.length ? sentRows.map((r) => (
                    <button className="rfq" key={r.rid} onClick={() => setLeadFor(r)}>
                      <div><b>{repOf(r) && pn(repOf(r))}</b><div className="sub-td">{proj.name} · {r.code} · ≈ {(r.qty || 0).toLocaleString()} {r.qunit} · {lang === "th" ? "มูลค่าประมาณ" : "est."} ฿{Math.round((repOf(r)?.price || 0) * (r.qty || 0)).toLocaleString()}</div></div>
                      <div className="rfq-right"><span className={"sla" + (slaLeft(r) < 12 ? " hot" : "")}>⏱ {slaLeft(r)} {lang === "th" ? "ชม." : "h"}</span><span className="status s-sent">{lang === "th" ? "แตะเพื่อตอบ" : "Reply"}</span></div>
                    </button>
                  )) : <p className="empty-line">{lang === "th" ? "ไม่มีใบใหม่ — สร้างจากตารางสเปกฝั่งผู้ออกแบบเพื่อจำลอง" : "None — send one from the designer side"}</p>)}
                  {rfqFilter === "replied" && (quotedRows.length ? quotedRows.map((r) => <div className="rfq" key={r.rid}><div><b>{repOf(r) && pn(repOf(r))}</b><div className="sub-td">{lang === "th" ? "เสนอไป" : "Quoted"} ฿{r.quote?.toLocaleString()} · {lang === "th" ? "รอผู้ออกแบบตัดสิน" : "awaiting decision"}</div></div><span className="status s-quoted">{lang === "th" ? "รอผล" : "Pending"}</span></div>) : <p className="empty-line">—</p>)}
                  {rfqFilter === "won" && <p className="empty-line">{lang === "th" ? "ยังไม่มีในเดโมนี้ — เมื่อผู้ออกแบบกดเลือกใบเสนอของคุณ จะย้ายมาที่นี่พร้อมมูลค่างาน" : "Won deals appear here"}</p>}
                  {rfqFilter === "lost" && <div className="rfq"><div><b>{lang === "th" ? "หินขัด Classic Lime (ตัวอย่าง)" : "Terrazzo (example)"}</b><div className="sub-td">{lang === "th" ? "เหตุผลรวม: ราคาสูงกว่าผู้ชนะ 8–12% · lead time นานกว่า" : "Aggregate: 8–12% pricier than winner"}</div></div><span className="status s-empty">{lang === "th" ? "ไม่ได้งาน" : "Lost"}</span></div>}
                  <p className="hint">{lang === "th" ? "SLA 48 ชม. — ตอบช้าเกิน คะแนน response rate ตกและผู้ออกแบบเห็นป้าย \"ตอบช้า\"" : "48 h SLA affects your response badge"}</p>
                </div>
              )}
              {scTab === "materials" && (
                <div className="panel">
                  <div className="sched-head"><h2>{lang === "th" ? "จัดการวัสดุ" : "Materials"} ({myMats.length})</h2><div className="head-actions"><button className="btn ghost sm" onClick={() => notify("Excel template ✓ (mock)")}>{lang === "th" ? "นำเข้า Excel เป็นชุด" : "Bulk Excel"}</button><button className="btn sm" onClick={() => setMatForm({})}>{lang === "th" ? "＋ เพิ่มสินค้า" : "＋ Add product"}</button></div></div>
                  <table className="tbl"><thead><tr><th></th><th>{lang === "th" ? "ชื่อ / SKU" : "Name / SKU"}</th><th>{lang === "th" ? "ราคา" : "Price"}</th><th>{lang === "th" ? "ความครบข้อมูล" : "Data"}</th><th>{lang === "th" ? "สถานะ" : "Status"}</th><th></th></tr></thead>
                    <tbody>{myMats.slice(0, 12).map((p) => {
                      const pc = completeness(p); const st = matStatus[p.id] || "เผยแพร่";
                      return <tr key={p.id}><td><span className="sw-sm" style={tex(p)} /></td><td><b>{pn(p)}</b><div className="sub-td">{p.sku}</div></td><td>฿{p.price.toLocaleString()}</td>
                        <td><div className="meter"><div style={{ width: pc + "%", background: pc >= 80 ? "var(--ok)" : "var(--warn)" }} /></div><span className="sub-td">{pc}%</span></td>
                        <td><span className={"status " + (st === "เผยแพร่" ? "s-chosen" : "s-empty")}>{st}</span></td>
                        <td className="tbl-act"><button className="link-btn" onClick={() => setMatForm({ ...p })}>{lang === "th" ? "แก้ไข" : "Edit"}</button> <button className="link-btn" onClick={() => setMatStatus((ms) => ({ ...ms, [p.id]: st === "เผยแพร่" ? "ซ่อน" : "เผยแพร่" }))}>{st === "เผยแพร่" ? (lang === "th" ? "ซ่อน" : "Hide") : (lang === "th" ? "เผยแพร่" : "Publish")}</button></td></tr>;
                    })}</tbody></table>
                  <p className="hint">{lang === "th" ? "ความครบของข้อมูลไม่ใช่การซื้ออันดับ — ข้อมูลครบ = ถูกจับคู่กับสเปกที่ผู้ออกแบบค้นได้แม่นกว่า" : "Data completeness ≠ paid ranking — complete data matches spec searches better"}</p>
                </div>
              )}
              {scTab === "billing" && (
                <div className="panel">
                  <h2>{lang === "th" ? "แพ็กเกจ & การเงิน" : "Plan & Billing"}</h2>
                  <PlanCards curPlan={sellerPlan} onPick={(k) => { setSellerPlan(k); track("seller_plan_changed", { to: k }); notify("✓ (mock)"); }} plans={[["free", "Free", "฿0", [lang === "th" ? "รับ+ตอบ RFQ ได้ทุกใบ" : "Receive & reply all RFQs"]], ["standard", "Standard", "฿2,490/ด.", [lang === "th" ? "แจ้งเตือนทุกใบในหมวด" : "All category alerts", "Quote templates", lang === "th" ? "สถิติร้าน" : "Shop stats"]], ["premium", "Premium", "฿5,990/ด.", [lang === "th" ? "หลายแบรนด์" : "Multi-brand", "Analytics + VE report", "API/CRM"]]]} />
                  <div className="field-label">{lang === "th" ? "เอกสารการเงิน" : "Documents"}</div>
                  {["มิ.ย. 2569"].map((m) => <div className="todo" key={m}><span className="todo-dot ok" />{lang === "th" ? `ใบกำกับภาษีเต็มรูป — ${m}` : `Tax invoice — ${m}`}<span style={{ flex: 1 }} /><button className="link-btn" onClick={() => notify("PDF ✓")}>PDF</button></div>)}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Detail: full-spec + ผู้ผลิต + reviews ── */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <Swatch p={detail} h={150} style={{ borderRadius: 12, marginBottom: 12 }} />
            <div className="det-head">
              <div style={{ flex: 1 }}>
                <h2>{pn(detail)}</h2>
                <div className="rate-line"><Stars v={detail.rating} /><span className="sub-td">{detail.rating} · {detail.rcount} {t.reviewOf}</span></div>
              </div>
              <div className="price" style={{ fontSize: 20 }}>{detail.price ? detail.price.toLocaleString() : "—"} <small>฿/{detail.unit}</small></div>
            </div>
            <div className="det-btns">
              <button className="btn ghost sm" onClick={() => { track("specsheet_open"); notify("Specsheet PDF ✓ (mock)"); }}>📄 {t.detSheet}</button>
              <button className="btn ghost sm" onClick={() => { track("catalog_open"); notify("Catalog ✓ (mock)"); }}>📚 {t.detCata}</button>
            </div>
            <div className="field-label">{t.detSpec}</div>
            <div className="sum-grid det">
              {[[t.sumBrand, detail.brand], [t.sumModel, detail.model], [t.sumSku, detail.sku], [t.sumColor, detail.color], [t.sumSize, detail.size], [lang === "th" ? "สเปกหลัก" : "Key spec", ps(detail)], [t.detStd, detail.cert], [t.detLead, detail.lead], [t.detMoq, detail.moq || "—"], [t.detWty, detail.wty || "—"], [t.sumNote, pnote(detail)]].map(([k, v]) => (
                <div className="sum-cell" key={k}><div className="sum-k">{k}</div><div className="sum-v">{v}</div></div>
              ))}
            </div>
            <button className="mfr-row" onClick={() => { setDetail(null); setStoreFor(detail.seller); setView("store"); track("store_opened", { seller: detail.seller }); }}>
              <SellerBadge s={detail.seller} size={40} />
              <span style={{ flex: 1, textAlign: "left" }}><div className="sub-td">{t.mfrBy}</div><b>{detail.seller}</b><div className="sub-td">✓ {t.verified} · {sellerProducts(detail.seller).length} {t.items} → {t.seeAll}</div></span>
            </button>
            <button className="btn ghost full" onClick={() => { setDetail(null); openChat(detail.seller); }}>💬 {t.chat}</button>
            {detail.revs?.length > 0 && (
              <>
                <div className="field-label">{t.reviews}</div>
                {detail.revs.map((rv, i) => (
                  <div className="rev" key={i}>
                    <div className="rev-head"><b>{lang === "en" ? rv.roleEn : rv.role}</b><Stars v={rv.stars} /></div>
                    <div className="rev-body">{lang === "en" ? rv.en : rv.th}</div>
                  </div>
                ))}
                <div className="sub-td" style={{ marginTop: 6 }}>{t.writeRev}</div>
              </>
            )}
            <button className="btn full" onClick={() => placeFromCatalog(detail)}>{pickingRow ? `${t.pickInto} ${pickingRow.code}` : t.keep}</button>
            <button className="close" onClick={() => setDetail(null)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {/* ── Chat ผู้ขาย ── */}
      {chatFor && (
        <div className="overlay" onClick={() => setChatFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="lead-head" style={{ alignItems: "center" }}><SellerBadge s={chatFor} size={34} /><h2 style={{ flex: 1 }}>{t.chatT} {chatFor}</h2></div>
            <div className="chat-box">
              {chatMsgs.map((m, i) => <div key={i} className={"bubble " + (m.who === "u" ? "u" : "v")}>{m.text}</div>)}
            </div>
            <div className="quote-row">
              <input className="note-input" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder={t.chatPh} aria-label="chat" />
              <button className="btn sm" onClick={sendChat}>{t.chatSend}</button>
            </div>
            <p className="hint">{t.chatHint}</p>
            <button className="close" onClick={() => setChatFor(null)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {/* ── Compare แบบเต็ม ── */}
      {showCompare && (
        <div className="overlay" onClick={() => setShowCompare(false)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h2>{t.cmpT}</h2>
            <div className="cmp-scroll">
              <table className="cmp-table">
                <thead><tr><th></th>{compare.map((id) => <th key={id}><div className="cmp-sw" style={tex(ALL[id])} /><div className="cmp-name">{pn(ALL[id])}</div></th>)}</tr></thead>
                <tbody>
                  {[
                    [t.cmpPrice, (p) => <b className="price" style={{ fontSize: 14 }}>{p.price.toLocaleString()} ฿/{p.unit}</b>],
                    [t.cmpBrand, (p) => `${p.brand} · ${p.model}`],
                    [t.sumSku, (p) => p.sku],
                    [t.cmpSize, (p) => p.size],
                    [t.cmpColor, (p) => p.color],
                    [t.cmpSpec, (p) => ps(p)],
                    [t.cmpStd, (p) => p.cert],
                    [t.cmpLead, (p) => p.lead],
                    [t.detMoq, (p) => p.moq || "—"],
                    [t.detWty, (p) => p.wty || "—"],
                    [t.cmpRate, (p) => <span><Stars v={p.rating} /> {p.rating} ({p.rcount})</span>],
                    [t.cmpSeller, (p) => p.seller],
                    [t.sumNote, (p) => pnote(p)],
                  ].map(([label, fn]) => (
                    <tr key={label}><th>{label}</th>{compare.map((id) => <td key={id}>{fn(ALL[id])}</td>)}</tr>
                  ))}
                  <tr><th></th>{compare.map((id) => <td key={id}><button className="btn sm" onClick={() => placeFromCatalog(ALL[id])}>{pickingRow ? `${t.pickInto} ${pickingRow.code}` : t.cmpPick}</button></td>)}</tr>
                </tbody>
              </table>
            </div>
            <button className="close" onClick={() => setShowCompare(false)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {/* ── modals เดิมจาก v5 ── */}
      {rfqOpen && (
        <div className="overlay" onClick={() => setRfqOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t.askRfq}</h2>
            <p className="hint">{proj.name}</p>
            <div className="rfq-lines">
              {rfqTargets.map((r) => <div className="rfq-line" key={r.rid}><span><b>{r.code}</b> · {r.options.map((o) => pn(ALL[o])).join(" / ")}</span><span className="sub-td">{(r.qty || 0).toLocaleString()} {r.qunit}</span></div>)}
            </div>
            <div className="greenbox"><b>{rfqTargets.length} {t.items} · {rfqBrands} {t.brands} — {lang === "th" ? "รวมส่งกล่องเดียว" : "one combined box"}</b><div>{lang === "th" ? "ถึงออฟฟิศใน 3–5 วันทำการ ไม่ต้องคุยกับเซลล์ทีละเจ้า" : "At your office in 3–5 days, no per-vendor calls"}</div></div>
            <div className="field-label">{lang === "th" ? "ต้องการราคาภายใน" : "Quote needed within"}</div>
            <div className="chip-row">{["3 วัน", "7 วัน", "ไม่รีบ"].map((d) => <button key={d} className={"chip" + (rfqDeadline === d ? " on" : "")} onClick={() => setRfqDeadline(d)}>{d}</button>)}</div>
            <label className="sample-chk"><input type="checkbox" checked={rfqSample} onChange={() => setRfqSample(!rfqSample)} /> {lang === "th" ? "ขอตัวอย่างจริงด้วย (รวมกล่องเดียว)" : "Include physical samples (one box)"}</label>
            <input className="note-input" value={rfqNote} onChange={(e) => setRfqNote(e.target.value)} placeholder={lang === "th" ? "โน้ตถึงผู้ขาย (ไม่บังคับ)" : "Note to sellers (optional)"} aria-label="note" />
            <button className="btn full" onClick={confirmRfq}>{lang === "th" ? `ส่งถึงผู้ขาย ${rfqBrands * 3} ราย ในคลิกเดียว` : `Send to ${rfqBrands * 3} sellers in one click`}</button>
            <p className="privacy">{lang === "th" ? "ผู้ขายเห็น: โปรเจกต์ ตำแหน่ง สเปก ปริมาณ — ไม่เห็นเบอร์คุณจนกว่าคุณจะตอบกลับ" : "Sellers see project, location, spec, qty — never your phone until you reply"}</p>
            <button className="close" onClick={() => setRfqOpen(false)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {veFor && (
        <div className="overlay" onClick={() => setVeFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {!veUsed ? (
              <>
                <h2>{t.ve}</h2>
                <p className="hint">{veFor.code} · {pn(ALL[veFor.pid || veFor.options[0]])}</p>
                <div className="slot-list">
                  {veAlts.map((a) => (
                    <button key={a.id} className="slot" onClick={() => applyVe(a)}>
                      <span className="sw-sm" style={tex(a)} />
                      <span className="slot-zone"><b>{pn(a)}</b><div className="sub-td">{ps(a)} · {a.seller}</div></span>
                      <span className="slot-new">−{Math.round((1 - a.price / ALL[veFor.pid || veFor.options[0]].price) * 100)}% · {a.price.toLocaleString()} ฿</span>
                    </button>
                  ))}
                </div>
                <p className="hint">{lang === "th" ? "ทดลองฟรี 1 รายการ · ของเดิมยังอยู่ในตัวเลือก" : "1 free use · original stays as an option"}</p>
              </>
            ) : (
              <>
                <h2>VE Finder — Pro</h2>
                <div className="paywall">
                  <div className="paywall-price">690 <small>฿/{lang === "th" ? "เดือน" : "mo"} ({lang === "th" ? "รายปี" : "annual"} 590)</small></div>
                  <ul className="paywall-list"><li>VE Finder {lang === "th" ? "ไม่จำกัด + ประวัติทุกโปรเจกต์" : "unlimited + history"}</li><li>Revit plug-in</li></ul>
                  <button className="btn full" onClick={() => { track("pro_founder_click"); setVeFor(null); notify("Founder price ✓"); }}>{lang === "th" ? "จองราคาผู้ก่อตั้ง 590 ฿/เดือน" : "Lock founder price 590 ฿/mo"}</button>
                </div>
              </>
            )}
            <button className="close" onClick={() => setVeFor(null)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {customOpen && (
        <div className="overlay" onClick={() => setCustomOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{lang === "th" ? "เพิ่มวัสดุเอง" : "Add your own material"}</h2>
            <input className="note-input" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={lang === "th" ? "ชื่อวัสดุ + รุ่น" : "Material name + model"} aria-label="name" />
            <input className="note-input" value={customSeller} onChange={(e) => setCustomSeller(e.target.value)} placeholder={lang === "th" ? "แบรนด์ / ผู้ขาย (ถ้ารู้)" : "Brand / seller (if known)"} aria-label="brand" />
            <button className="btn full" disabled={!customName.trim()} onClick={addCustom}>{pickingRow ? `${t.pickInto} ${pickingRow.code}` : (lang === "th" ? "เพิ่มเข้าคลังของฉัน" : "Add to my library")}</button>
            <button className="close" onClick={() => setCustomOpen(false)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {leadFor && (
        <div className="overlay" onClick={() => setLeadFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="lead-head"><h2>{lang === "th" ? "ใบขอราคาใหม่ถึงคุณ" : "New RFQ for you"}</h2><span className="cmp-pressure">{lang === "th" ? "เทียบ" : "vs"} {Math.max(leadFor.options.length * 3, 3)}</span></div>
            <table className="lead-table"><tbody>
              <tr><th>{lang === "th" ? "โปรเจกต์" : "Project"}</th><td>{proj.name}</td></tr>
              <tr><th>{lang === "th" ? "ตำแหน่งใช้" : "Location"}</th><td>{leadFor.code} · {leadFor.zone}</td></tr>
              <tr><th>{lang === "th" ? "สินค้า" : "Product"}</th><td><b>{repOf(leadFor) && pn(repOf(leadFor))}</b></td></tr>
              <tr><th>{lang === "th" ? "ปริมาณ" : "Quantity"}</th><td>≈ {(leadFor.qty || 0).toLocaleString()} {leadFor.qunit}</td></tr>
            </tbody></table>
            <div className="quote-row">
              <input className="note-input" value={leadPrice} onChange={(e) => setLeadPrice(e.target.value)} placeholder={String(Math.round((repOf(leadFor)?.price || 100) * 0.95))} aria-label="price" />
              <button className="btn ghost sm" onClick={() => notify("Attach ✓")}>{lang === "th" ? "แนบไฟล์" : "Attach"}</button>
            </div>
            <button className="btn full" disabled={!parseFloat(String(leadPrice).replace(/,/g, ""))} onClick={sendQuote}>{lang === "th" ? "ส่งใบเสนอราคา" : "Send quote"}</button>
            <button className="close" onClick={() => setLeadFor(null)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {specBook && (
        <div className="overlay" onClick={() => setSpecBook(false)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h2>Spec Book · {proj.name}</h2>
            <div className="cmp-scroll">
              <table className="cmp-table book">
                <thead><tr>{["Code", t.sumBrand, t.sumModel, t.sumSku, t.sumColor, t.sumSize, t.sumMfr, t.cmpPrice, t.sumNote].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.filter((r) => r.pid).map((r) => {
                    const p = ALL[r.pid];
                    return <tr key={r.rid}><th>{r.code}</th><td>{p.brand}</td><td>{p.model}</td><td>{p.sku}</td><td>{p.color}</td><td>{p.size}</td><td>{p.seller}</td><td>{r.quote ? r.quote.toLocaleString() + " ฿*" : p.price.toLocaleString() + " ฿"}</td><td>{pnote(p)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <p className="hint">{lang === "th" ? "* ราคาจริงจากใบเสนอ · รายการที่ยังเป็นตัวเลือกไม่ถูกรวมจนกว่าจะ confirm" : "* quoted price · unconfirmed options excluded"}</p>
            <button className="btn full" onClick={() => { setSpecBook(false); notify("Export PDF ✓ (mock)"); }}>Export PDF</button>
            <button className="close" onClick={() => setSpecBook(false)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {metricsOpen && (
        <div className="overlay" onClick={() => setMetricsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t.metric}</h2>
            <div className="metric-grid">
              {[[lang === "th" ? "โปรเจกต์" : "Projects", projects.length], ["RFQ", events.filter((e) => e.name === "rfq_sent").reduce((s, e) => s + (e.meta?.items || 0), 0)], ["Founder ★", countEv("pro_founder_click")], [lang === "th" ? "ตัวเลือกที่เก็บ" : "Options saved", countEv("option_added")], ["Confirm", countEv("material_confirmed")], ["VE", countEv("ve_open")], ["Paywall", countEv("pro_paywall_seen")], ["Revit", countEv("revit_waitlist")], ["Excel", countEv("excel_import")], ["Chat", countEv("chat_opened")], [lang === "th" ? "เปิดร้านผู้ขาย" : "Store views", countEv("store_opened")], ["Specsheet", countEv("specsheet_open")], ["Studio gate", countEv("studio_gate_seen")], ["Plan Δ", countEv("plan_upgraded")], ["Template/Set", countEv("template_saved") + countEv("set_created")], [lang === "th" ? "สินค้าใหม่ (ผู้ขาย)" : "New listings", countEv("material_added")]].map(([k, v]) => <div className="metric" key={k}><div className="stat-k">{k}</div><div className="stat-v sm">{v}</div></div>)}
            </div>
            <div className="ev-log">
              {events.length === 0 && <div className="empty-line">—</div>}
              {[...events].reverse().slice(0, 30).map((e, i) => <div className="ev-line" key={i}>{e.t.toLocaleTimeString("th-TH")} · {e.name}{e.meta ? " · " + JSON.stringify(e.meta) : ""}</div>)}
            </div>
            <button className="close" onClick={() => setMetricsOpen(false)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="overlay" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t.importX}</h2>
            {!importRows ? (
              <>
                <label className="drop">
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => handleImportFile(e.target.files[0])} />
                  <span className="add-plus">⇪</span><b>{lang === "th" ? "เลือกไฟล์ Excel เดิมของออฟฟิศ" : "Pick your office's Excel file"}</b>
                </label>
                <div className="field-label">{lang === "th" ? "หรือวางตารางจาก Excel (รวมหัวคอลัมน์)" : "Or paste from Excel (with headers)"}</div>
                <textarea className="note-input paste-area" onChange={(e) => e.target.value.includes("\n") && handleImportPaste(e.target.value)} aria-label="paste" />
              </>
            ) : (
              <>
                <input className="note-input" value={importName} onChange={(e) => setImportName(e.target.value)} aria-label="name" />
                <div className="rfq-lines import-preview">
                  {importRows.slice(0, 6).map((r) => <div className="rfq-line" key={r.rid}><span><b>{r.code}</b> · {r.zone}</span><span className="sub-td">{r.qty ? r.qty.toLocaleString() + " " + r.qunit : "—"}</span></div>)}
                  {importRows.length > 6 && <div className="rfq-line sub-td">+{importRows.length - 6}</div>}
                </div>
                <button className="btn full" onClick={confirmImport}>{lang === "th" ? `นำเข้า ${importRows.length} รายการ` : `Import ${importRows.length} items`}</button>
              </>
            )}
            <button className="close" onClick={() => setImportOpen(false)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {newProjOpen && (
        <div className="overlay" onClick={() => setNewProjOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t.newProj.replace("＋ ", "")}</h2>
            <input className="note-input" value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder={lang === "th" ? "ชื่อโปรเจกต์" : "Project name"} aria-label="name" />
            <div className="slot-list">
              <button className="slot" onClick={() => createProject("duplicate")}><span className="slot-zone"><b>{lang === "th" ? `คัดลอกโครงจาก "${proj.name}"` : `Duplicate "${proj.name}"`}</b><div className="sub-td">{lang === "th" ? "รหัส + ตัวเลือกวัสดุตามมาทั้งหมด" : "Codes + material options carried over"}</div></span></button>
              <button className="slot" onClick={() => createProject("template")}><span className="slot-zone"><b>{lang === "th" ? "เริ่มจากแบบมาตรฐาน" : "Start from template"}</b></span></button>
              <button className="slot" onClick={() => { setNewProjOpen(false); setImportOpen(true); setImportRows(null); }}><span className="slot-zone"><b>{t.importX}</b></span></button>
            </div>
            <button className="close" onClick={() => setNewProjOpen(false)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {/* ── Seller: ฟอร์มเพิ่ม/แก้สินค้า (ย่อ) ── */}
      {matForm && (
        <div className="overlay" onClick={() => setMatForm(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h2>{matForm.id ? (lang === "th" ? "แก้ไขสินค้า" : "Edit product") : (lang === "th" ? "เพิ่มสินค้าใหม่" : "Add product")}</h2>
            <div className="field-label">1 · {lang === "th" ? "ข้อมูลหลัก" : "Basics"}</div>
            <div className="form-2col">
              <input className="note-input" value={matForm.name || ""} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} placeholder={lang === "th" ? "ชื่อสินค้า *" : "Name *"} aria-label="name" />
              <select className="note-input" value={matForm.cat || CATS[1].key} onChange={(e) => setMatForm({ ...matForm, cat: e.target.value })} aria-label="cat">{CATS.map((c) => <option key={c.key} value={c.key}>{cn(c.key)}</option>)}</select>
              <input className="note-input" value={matForm.model || ""} onChange={(e) => setMatForm({ ...matForm, model: e.target.value })} placeholder={lang === "th" ? "รุ่น" : "Model"} aria-label="model" />
              <input className="note-input" value={matForm.sku || ""} onChange={(e) => setMatForm({ ...matForm, sku: e.target.value })} placeholder="SKU" aria-label="sku" />
              <input className="note-input" value={matForm.color || ""} onChange={(e) => setMatForm({ ...matForm, color: e.target.value })} placeholder={t.sumColor} aria-label="color" />
              <input className="note-input" value={matForm.size || ""} onChange={(e) => setMatForm({ ...matForm, size: e.target.value })} placeholder={t.sumSize} aria-label="size" />
            </div>
            <div className="field-label">2 · {lang === "th" ? "สเปกทางเทคนิค (ตาม schema หมวด — เลี้ยง search และ VE Finder)" : "Technical spec (per-category schema)"}</div>
            <input className="note-input" value={matForm.spec || ""} onChange={(e) => setMatForm({ ...matForm, spec: e.target.value })} placeholder={lang === "th" ? "เช่น ดูดซึมน้ำ <0.5% · กันลื่น R10 · หนา 20 มม." : "e.g. abs <0.5% · R10 · 20 mm"} aria-label="spec" />
            <div className="field-label">3 · {lang === "th" ? "การค้า" : "Commercial"}</div>
            <div className="form-2col">
              <input className="note-input" value={matForm.price || ""} onChange={(e) => setMatForm({ ...matForm, price: e.target.value })} placeholder={lang === "th" ? "ราคาตั้ง (฿) *" : "List price *"} aria-label="price" />
              <input className="note-input" value={matForm.unit || ""} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} placeholder={lang === "th" ? "หน่วย เช่น ตร.ม." : "Unit"} aria-label="unit" />
              <input className="note-input" value={matForm.moq || ""} onChange={(e) => setMatForm({ ...matForm, moq: e.target.value })} placeholder="MOQ" aria-label="moq" />
              <input className="note-input" value={matForm.lead || ""} onChange={(e) => setMatForm({ ...matForm, lead: e.target.value })} placeholder={t.detLead} aria-label="lead" />
              <input className="note-input" value={matForm.wty || ""} onChange={(e) => setMatForm({ ...matForm, wty: e.target.value })} placeholder={t.detWty} aria-label="wty" />
              <input className="note-input" value={matForm.cert || ""} onChange={(e) => setMatForm({ ...matForm, cert: e.target.value })} placeholder={t.detStd + " เช่น มอก. 2508"} aria-label="cert" />
            </div>
            <input className="note-input" value={matForm.note || ""} onChange={(e) => setMatForm({ ...matForm, note: e.target.value })} placeholder={t.sumNote} aria-label="note" />
            <div className="field-label">4 · {lang === "th" ? "ไฟล์" : "Files"}</div>
            <div className="head-actions"><button className="btn ghost sm" onClick={() => notify("📷 (mock)")}>{lang === "th" ? "อัปโหลดรูปถ่าย" : "Photos"}</button><button className="btn ghost sm" onClick={() => notify("📄 (mock)")}>Specsheet PDF</button><button className="btn ghost sm" onClick={() => notify("📚 (mock)")}>Catalog</button></div>
            <div className="greenbox" style={{ marginTop: 14 }}><b>{lang === "th" ? "คะแนนความครบของข้อมูล" : "Data completeness"}: {completeness({ ...matForm, swatch: 1 })}%</b><div>{lang === "th" ? "ครบ ≥80% = ถูกจับคู่ในผลค้นหาสเปกได้แม่นขึ้น (ไม่ใช่การซื้ออันดับ)" : "≥80% matches spec searches better (not paid ranking)"}</div></div>
            <button className="btn full" disabled={!matForm.name?.trim()} onClick={saveMat}>{lang === "th" ? "บันทึกสินค้า" : "Save product"}</button>
            <button className="close" onClick={() => setMatForm(null)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {/* ── Studio gate ── */}
      {gate && (
        <div className="overlay" onClick={() => setGate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{gate === "template" ? "Template ออฟฟิศ" : "Material Sets"} — Studio</h2>
            <div className="paywall">
              <div className="paywall-price">2,990 <small>฿/{lang === "th" ? "เดือน · ทั้งออฟฟิศ 10 ที่นั่ง" : "mo · 10 seats"}</small></div>
              <ul className="paywall-list">
                <li>{lang === "th" ? "บันทึกโครงโปรเจกต์เป็นมาตรฐานออฟฟิศ" : "Save office-standard templates"}</li>
                <li>{lang === "th" ? "ชุดวัสดุใช้ซ้ำข้ามโปรเจกต์ — ความรู้ไม่หายตอนคนลาออก" : "Reusable material sets"}</li>
                <li>{lang === "th" ? "สิทธิ์ Admin ล็อกโครงรหัสไม่ให้จูเนียร์แก้" : "Admin-locked code structure"}</li>
              </ul>
              <button className="btn full" onClick={() => { setPlan("studio"); setGate(null); track("plan_upgraded", { to: "studio", from_gate: gate }); notify(lang === "th" ? "อัปเป็น Studio แล้ว (mock) — ลองบันทึกอีกครั้ง" : "Studio ✓ — try again"); }}>{lang === "th" ? "อัปเกรดเป็น Studio (mock)" : "Upgrade to Studio (mock)"}</button>
            </div>
            <button className="close" onClick={() => setGate(null)} aria-label="close">✕</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ── CSS (module-level, ใช้ตอน render จึงประกาศท้ายไฟล์ได้) ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0}
:root{--brand:#F4632A;--brand-soft:#FFF1EA;--ink:#1F2430;--sub:#6B7280;--mut:#9AA1AC;--line:#ECEDF0;--line-2:#E2E4E9;--bg:#F5F6F8;--card:#FFFFFF;--ok:#12A150;--ok-soft:#E6F6EC;--warn:#B45309;--warn-soft:#FDF3E3;--info:#4F46E5;--info-soft:#EFEEFC;--sh:0 1px 3px rgba(16,24,40,.06),0 1px 2px rgba(16,24,40,.04);--sh-2:0 4px 12px rgba(16,24,40,.10);--r:14px;--r-sm:10px}
.app{font-family:'IBM Plex Sans Thai',sans-serif;background:var(--bg);min-height:100vh;color:var(--ink);font-size:14px}
button{font-family:inherit;cursor:pointer}
input,textarea,select{font-family:inherit}
header{background:var(--card);border-bottom:1px solid var(--line);padding:12px 20px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:20;flex-wrap:wrap}
.logo{font-size:21px;font-weight:700;color:var(--brand);letter-spacing:-.5px;cursor:pointer;flex:none}
.logo small{font-size:10.5px;font-weight:500;color:var(--mut);display:block;letter-spacing:0;margin-top:-3px}
.search-bubble{flex:1;min-width:200px;display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--line-2);border-radius:999px;padding:9px 18px;transition:box-shadow .15s}
.search-bubble:focus-within{box-shadow:0 0 0 3px var(--brand-soft);border-color:var(--brand);background:#fff}
.search-bubble input{flex:1;border:none;background:none;outline:none;font-size:14px;min-width:0}
.search-ic{color:var(--mut);flex:none;font-size:15px}
.nav-links{display:flex;gap:14px;align-items:center;flex:none}
.nav-links a{font-size:12.5px;color:var(--sub);cursor:pointer;transition:color .12s;white-space:nowrap}
.nav-links a:hover{color:var(--brand)}
.nav-links a.on{color:var(--brand);font-weight:600}
.metric-link{font-size:11px;color:var(--mut);border:1px dashed var(--line-2);border-radius:999px;padding:4px 10px;background:none}
.metric-link:hover{color:var(--brand);border-color:var(--brand)}
.lang-tg{display:inline-flex;border:1px solid var(--line-2);border-radius:999px;overflow:hidden}
.lang-tg button{border:none;background:none;font-size:11.5px;padding:5px 11px;color:var(--sub)}
.lang-tg button.on{background:var(--brand);color:#fff;font-weight:600}
main{max-width:1120px;margin:0 auto;padding:20px}
.hero{background:linear-gradient(135deg,var(--brand) 0%,#FF8A50 100%);border-radius:var(--r);padding:26px 24px;color:#fff;box-shadow:var(--sh-2);margin-bottom:18px}
.hero h1{font-size:21px;font-weight:700}
.hero p{font-size:13px;opacity:.92;margin-top:4px}
.home-sec{font-size:14.5px;font-weight:600;margin:18px 2px 10px;display:flex;justify-content:space-between;align-items:baseline}
.home-sec small{font-size:12px;color:var(--brand);font-weight:500;cursor:pointer}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px}
.cat-tile{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px 12px;display:flex;flex-direction:column;align-items:center;gap:7px;box-shadow:var(--sh);transition:transform .12s,box-shadow .12s;text-align:center}
.cat-tile:hover{transform:translateY(-2px);box-shadow:var(--sh-2)}
.cat-ic{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px}
.cat-name{font-size:12.5px;line-height:1.35}
.cat-count{font-size:10.5px;color:var(--mut)}
.proj-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh);padding:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.proj-card b{font-size:15px}
.proj-meta{font-size:12px;color:var(--sub);margin-top:3px}
.btn{border:none;border-radius:999px;padding:9px 18px;font-size:13.5px;font-weight:600;background:var(--brand);color:#fff;box-shadow:var(--sh);transition:filter .12s}
.btn:hover{filter:brightness(1.06)}
.btn:disabled{background:#D6D9DE;box-shadow:none;cursor:default}
.btn.ghost{background:var(--card);color:var(--ink);border:1px solid var(--line-2)}
.btn.ghost:hover{border-color:var(--brand);color:var(--brand)}
.btn.sm{padding:6px 13px;font-size:12.5px}
.btn.full{width:100%;margin-top:12px}
.link-btn{background:none;border:none;color:var(--brand);font-size:12.5px;padding:2px 0;text-decoration:underline dotted}
.pickband{background:var(--info-soft);border:1px solid #D8D5F6;color:var(--info);border-radius:var(--r-sm);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;font-size:13px}
.chip-row{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 8px}
.chip{border:1px solid var(--line-2);background:var(--card);border-radius:999px;padding:6px 14px;font-size:12.5px;color:var(--sub);transition:all .12s}
.chip.on{background:var(--brand-soft);border-color:var(--brand);color:var(--brand);font-weight:600}
.trust-line{font-size:11.5px;color:var(--mut);margin:2px 2px 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:transform .12s,box-shadow .12s;display:flex;flex-direction:column}
.card:hover{transform:translateY(-2px);box-shadow:var(--sh-2)}
.swatch{height:110px;position:relative;cursor:pointer}
.cmp{position:absolute;top:8px;left:8px;background:rgba(255,255,255,.92);border-radius:999px;font-size:11px;padding:4px 10px;display:flex;gap:5px;align-items:center;cursor:pointer;box-shadow:var(--sh)}
.card-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;flex:1}
.spec-id{font-size:10.5px;color:var(--mut)}
.card-body h3{font-size:13px;font-weight:600;cursor:pointer;line-height:1.4}
.rate-line{display:flex;gap:6px;align-items:center}
.stars .st{color:#D8DBDF;font-size:12px}
.stars .st.on{color:#F5A623}
.card-foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:8px;gap:8px}
.price{font-size:15px;font-weight:700;color:var(--brand)}
.price small{font-size:10.5px;color:var(--mut);font-weight:400}
.seller-line{font-size:11px;color:var(--mut)}
.add-card{border:1.5px dashed var(--line-2);border-radius:var(--r);background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:24px 14px;font-size:12.5px;color:var(--sub);text-align:center;transition:border-color .12s}
.add-card:hover{border-color:var(--brand)}
.add-card b{color:var(--brand);font-size:13.5px}
.add-plus{font-size:24px;color:var(--brand);line-height:1}
.panel{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh);padding:18px;margin-bottom:16px}
.sched-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.sched-head h2{font-size:17px;font-weight:700}
.sched-sub{font-size:12px;color:var(--sub);margin-top:3px}
.head-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.seg{display:inline-flex;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:3px;gap:2px;margin-bottom:12px;flex-wrap:wrap}
.seg button{border:none;background:none;border-radius:999px;padding:6px 13px;font-size:12px;color:var(--sub)}
.seg button.on{background:var(--card);color:var(--brand);font-weight:600;box-shadow:var(--sh)}
.row-card{border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:10px;background:var(--card);display:flex;gap:12px;align-items:flex-start;transition:box-shadow .12s}
.row-card:hover{box-shadow:var(--sh)}
.row-card.compact{padding:8px 12px;align-items:center}
.row-chk{margin-top:4px;accent-color:var(--brand);width:16px;height:16px}
.row-main{flex:1;min-width:0}
.cell-edit{border:1px solid transparent;border-radius:8px;padding:3px 7px;background:transparent;transition:all .12s;max-width:100%}
.cell-edit:hover{border-color:var(--line-2);background:var(--bg)}
.cell-edit:focus{outline:none;border-color:var(--brand);background:#fff;box-shadow:0 0 0 3px var(--brand-soft)}
.cell-code{font-weight:700;font-size:13.5px;width:86px}
.cell-zone{font-size:13px;width:min(100%,300px)}
.cell-qty{font-size:12px;width:70px;text-align:right;color:var(--sub)}
.opt-strip{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.opt{display:flex;gap:8px;align-items:center;border:1px solid var(--line-2);border-radius:var(--r-sm);padding:6px 9px;font-size:12px;background:var(--card)}
.opt.confirmed{border-color:var(--ok);background:var(--ok-soft)}
.opt .sw{width:26px;height:26px;border-radius:8px;flex:none}
.opt-name{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;display:inline-block}
.opt-price{color:var(--sub);font-size:11px}
.opt-act{border:none;background:none;font-size:11.5px;color:var(--sub);padding:2px 5px;border-radius:6px}
.opt-act:hover{background:var(--bg)}
.opt-act.ok{color:var(--ok);font-weight:600}
.opt-add{border:1.5px dashed var(--line-2);border-radius:var(--r-sm);background:none;font-size:12px;color:var(--sub);padding:8px 12px}
.opt-add:hover{border-color:var(--brand);color:var(--brand)}
.sum-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden;margin-top:10px}
.sum-grid.det{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-top:6px}
.sum-cell{background:var(--card);padding:8px 11px}
.sum-k{font-size:10px;color:var(--mut)}
.sum-v{font-size:12px;margin-top:2px;line-height:1.45}
.status{font-size:11px;border-radius:999px;padding:4px 11px;white-space:nowrap;font-weight:600}
.s-empty{background:var(--bg);color:var(--mut)}
.s-options{background:var(--warn-soft);color:var(--warn)}
.s-chosen{background:var(--ok-soft);color:var(--ok)}
.s-sent{background:var(--info-soft);color:var(--info)}
.s-quoted{background:#E8F4FD;color:#0B6BAE}
.row-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:none}
.quote-val{font-size:14px;font-weight:700;color:#0B6BAE;text-align:right}
.row-del{border:none;background:none;color:var(--mut);font-size:13px;border-radius:8px;padding:3px 7px}
.row-del:hover{background:#FDECEC;color:#C0362C}
.ve-link{border:none;background:none;color:var(--info);font-size:11px;padding:0;text-decoration:underline dotted}
.ve-hist{color:var(--ok);font-size:11px}
.add-row{width:100%;border:1.5px dashed var(--line-2);border-radius:var(--r-sm);background:none;padding:11px;font-size:13px;color:var(--sub)}
.add-row:hover{border-color:var(--brand);color:var(--brand)}
.sched-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.gcell{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--card);box-shadow:var(--sh)}
.gswatch{height:86px;display:flex;align-items:flex-end;padding:8px}
.gcode{background:rgba(255,255,255,.94);border-radius:8px;font-size:11.5px;font-weight:700;padding:3px 9px;box-shadow:var(--sh)}
.gbody{padding:10px 12px}
.gname{font-size:12.5px;font-weight:600;line-height:1.35}
.gzone{font-size:11px;color:var(--sub);margin-top:2px}
.board{display:flex;flex-wrap:wrap;gap:10px;padding:6px}
.bt{border-radius:16px;position:relative;box-shadow:var(--sh-2);cursor:pointer;transition:transform .15s}
.bt:hover{transform:scale(1.04);z-index:2}
.bt span{position:absolute;left:8px;bottom:8px;background:rgba(255,255,255,.92);border-radius:8px;font-size:10.5px;font-weight:700;padding:2px 8px}
.bt.opt-ghost{opacity:.45}
.board-hint{font-size:12px;color:var(--sub);margin-top:10px}
.batch{position:sticky;bottom:12px;background:var(--ink);color:#fff;border-radius:999px;padding:10px 12px 10px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px;box-shadow:var(--sh-2);opacity:.55;transition:opacity .15s;flex-wrap:wrap;z-index:10}
.batch.live{opacity:1}
.batch span{font-size:13px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px}
.metric{border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px;background:var(--bg)}
.stat-k{font-size:11px;color:var(--sub)}
.stat-v{font-size:20px;font-weight:700;margin-top:2px}
.stat-v.sm{font-size:19px}
.rfq{width:100%;background:none;border:none;border-bottom:1px solid var(--line);text-align:left;padding:12px 4px;display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:8px}
.rfq:hover{background:var(--bg)}
.rfq-right{display:flex;gap:8px;align-items:center;flex:none}
.cmp-pressure{font-size:10.5px;background:var(--info-soft);color:var(--info);border-radius:999px;padding:3px 9px;white-space:nowrap}
.hookline{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;border-color:#FCD9C8;background:linear-gradient(0deg,var(--brand-soft),#fff)}
.hint{font-size:11.5px;color:var(--mut);line-height:1.55;margin-top:8px}
.empty-line{font-size:12.5px;color:var(--mut);padding:14px 4px}
.sub-td{font-size:11px;color:var(--mut)}
.overlay{position:fixed;inset:0;background:rgba(20,24,32,.42);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)}
.modal{background:var(--card);border-radius:18px;box-shadow:var(--sh-2);padding:22px;max-width:560px;width:100%;max-height:88vh;overflow-y:auto;position:relative}
.modal.wide{max-width:760px}
.modal h2{font-size:16.5px;font-weight:700}
.close{position:absolute;top:12px;right:14px;border:none;background:var(--bg);border-radius:999px;width:30px;height:30px;font-size:13px;color:var(--sub)}
.close:hover{background:var(--line)}
.field-label{font-size:11.5px;color:var(--sub);margin-top:12px;font-weight:600}
.note-input{width:100%;padding:10px 14px;border:1px solid var(--line-2);border-radius:var(--r-sm);font-size:13.5px;background:var(--card);margin-top:6px}
.note-input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.rfq-lines{border:1px solid var(--line);border-radius:var(--r-sm);margin-top:8px;overflow:hidden}
.rfq-line{display:flex;justify-content:space-between;gap:10px;padding:9px 13px;border-bottom:1px solid var(--line);font-size:13px}
.rfq-line:last-child{border-bottom:none}
.greenbox{background:var(--ok-soft);border:1px solid #BEE5CD;border-radius:var(--r-sm);padding:12px 14px;margin:12px 0 4px;font-size:12.5px;line-height:1.55}
.greenbox b{color:var(--ok)}
.sample-chk{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:12px;cursor:pointer}
.sample-chk input{accent-color:var(--brand)}
.privacy{font-size:11px;color:var(--mut);text-align:center;margin-top:10px;line-height:1.5}
.paywall{border:1px solid var(--line-2);border-radius:var(--r);padding:18px;margin-top:10px;background:linear-gradient(180deg,var(--brand-soft),#fff)}
.paywall-price{font-size:28px;font-weight:700;color:var(--brand)}
.paywall-price small{font-size:12.5px;font-weight:400;color:var(--sub)}
.paywall-list{margin:12px 0 4px 18px;font-size:13px;line-height:1.7;color:var(--sub)}
.slot-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.slot{display:flex;gap:10px;align-items:center;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--card);padding:11px 13px;text-align:left;transition:all .12s}
.slot:hover{border-color:var(--brand);box-shadow:var(--sh)}
.slot-zone{flex:1}
.slot-new{font-size:12px;color:var(--ok);font-weight:700;white-space:nowrap}
.sw-sm{width:30px;height:30px;border-radius:9px;flex:none}
.lead-table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0 4px;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden}
.lead-table th{text-align:left;font-size:11px;color:var(--sub);font-weight:600;width:110px;padding:8px 12px;vertical-align:top;background:var(--bg)}
.lead-table td{padding:8px 12px;border-bottom:1px solid var(--line)}
.quote-row{display:flex;gap:8px;align-items:stretch;margin-top:6px}
.quote-row .note-input{margin-top:0;flex:1}
.lead-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-right:34px}
.metric-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px}
.ev-log{border:1px solid var(--line);border-radius:var(--r-sm);max-height:170px;overflow-y:auto;margin-top:10px}
.ev-line{font-size:11px;padding:6px 11px;border-bottom:1px solid var(--line);color:var(--sub);word-break:break-all}
.drop{display:flex;flex-direction:column;align-items:center;gap:6px;border:1.5px dashed var(--brand);border-radius:var(--r);padding:22px 16px;margin-top:10px;cursor:pointer;background:var(--brand-soft);text-align:center;font-size:12.5px}
.drop b{color:var(--brand)}
.paste-area{min-height:84px;font-size:12px;resize:vertical}
.import-preview{max-height:190px;overflow-y:auto}
.toast{position:fixed;top:74px;right:20px;background:var(--ink);color:#fff;padding:13px 18px;font-size:13px;z-index:60;max-width:340px;line-height:1.5;border-radius:var(--r-sm);box-shadow:var(--sh-2)}
.slogo{border-radius:12px;color:#fff;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none}
.det-head{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.det-btns{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.mfr-row{display:flex;gap:12px;align-items:center;width:100%;border:1px solid var(--line-2);border-radius:var(--r);background:var(--bg);padding:12px 14px;margin-top:14px;transition:all .12s}
.mfr-row:hover{border-color:var(--brand);box-shadow:var(--sh)}
.rev{border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 13px;margin-top:8px}
.rev-head{display:flex;justify-content:space-between;align-items:center;font-size:12.5px}
.rev-body{font-size:12.5px;color:var(--sub);margin-top:4px;line-height:1.5}
.chat-box{border:1px solid var(--line);border-radius:var(--r-sm);background:var(--bg);padding:12px;margin-top:12px;max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.bubble{max-width:82%;padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.5}
.bubble.v{background:var(--card);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px}
.bubble.u{background:var(--brand);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.cmp-scroll{overflow-x:auto;margin-top:10px}
.cmp-table{border-collapse:collapse;font-size:12.5px;min-width:520px;width:100%}
.cmp-table th{text-align:left;font-size:11px;color:var(--sub);font-weight:600;padding:8px 10px;background:var(--bg);border:1px solid var(--line);vertical-align:top;min-width:96px}
.cmp-table td{padding:8px 10px;border:1px solid var(--line);vertical-align:top;line-height:1.5}
.cmp-sw{height:56px;border-radius:10px;margin-bottom:6px;min-width:120px}
.cmp-name{font-size:12px;font-weight:600;line-height:1.35;max-width:160px}
.cmp-table.book th,.cmp-table.book td{min-width:70px}
.store-head{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.ws{display:flex;gap:16px;align-items:flex-start}
.side{width:200px;flex:none;background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh);padding:8px;display:flex;flex-direction:column;gap:2px;position:sticky;top:78px}
.side a{display:block;padding:9px 12px;border-radius:10px;font-size:13px;color:var(--sub);cursor:pointer}
.side a:hover{background:var(--bg)}
.side a.on{background:var(--brand-soft);color:var(--brand);font-weight:600}
.ws-body{flex:1;min-width:0}
.sc-ident{display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.todo{display:flex;gap:10px;align-items:center;padding:10px 6px;border-bottom:1px solid var(--line);font-size:13px;cursor:pointer;flex-wrap:wrap}
.todo:hover{background:var(--bg)}
.todo-dot{width:8px;height:8px;border-radius:99px;background:var(--mut);flex:none}
.todo-dot.ok{background:var(--ok)}
.todo-dot.warn{background:#E8A23D}
.todo-metric{text-align:left;border:1px solid var(--line);cursor:pointer;transition:all .12s}
.todo-metric:hover{border-color:var(--brand);box-shadow:var(--sh)}
.todo-metric.urgent{border-color:#F3C1AE;background:linear-gradient(180deg,var(--brand-soft),var(--bg))}
.todo-metric.urgent .stat-v{color:var(--brand)}
.tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.tbl th{text-align:left;font-size:11px;color:var(--sub);font-weight:600;padding:8px 10px;border-bottom:1px solid var(--line-2);background:var(--bg)}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl-act{white-space:nowrap}
.meter{width:90px;height:6px;background:var(--bg);border-radius:99px;overflow:hidden;display:inline-block;margin-right:6px;vertical-align:middle}
.meter div{height:100%;background:var(--brand);border-radius:99px}
.plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:12px}
.plan-card{border:1px solid var(--line-2);border-radius:var(--r);padding:16px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;background:var(--card)}
.plan-card.cur{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.plan-card b{font-size:14.5px}
.plan-price{font-size:20px;font-weight:700;color:var(--brand)}
.plan-card ul{margin:0 0 4px 16px;font-size:12px;color:var(--sub);line-height:1.7}
.sla{font-size:11px;background:var(--warn-soft);color:var(--warn);border-radius:999px;padding:3px 9px;white-space:nowrap;font-weight:600}
.sla.hot{background:#FDE3DC;color:#C0362C}
.spark{display:flex;gap:4px;align-items:flex-end;height:86px;margin-top:12px}
.spark div{flex:1;background:linear-gradient(180deg,var(--brand),#FF8A50);border-radius:6px 6px 0 0;min-width:8px}
.form-2col{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:760px){.ws{flex-direction:column}.side{width:100%;position:static;flex-direction:row;flex-wrap:wrap}.form-2col{grid-template-columns:1fr}}
@media(max-width:760px){header{gap:10px}.nav-links{order:2;margin-left:auto;flex-wrap:wrap}.search-bubble{order:3;flex-basis:100%}main{padding:14px}.cell-zone{width:100%}}
`;
