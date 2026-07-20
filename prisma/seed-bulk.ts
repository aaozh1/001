// Bulk demo-catalog generator — ~1,000 extra plausible materials across all 14
// categories so the catalog feels like a real marketplace (filter, sort, view
// modes and pagination all have something to chew on). DEV/DEMO ONLY — the
// seed must never run on production (see CLAUDE.md).
//
// Deterministic by design (seeded PRNG, no Date/Math.random): re-seeding
// produces the identical catalog, which keeps demos and screenshots stable.

export interface BulkMaterial {
  cat: number;
  brand: string;
  model: string;
  th: string;
  en: string;
  unit: string;
  price: number;
  specTh: string;
  specEn: string;
  cert: string | null;
  lead: string;
  wty: string | null;
  moq: string;
  colors: [string, string][];
  sizes: string[];
}

// Small deterministic PRNG (mulberry32).
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CatConfig {
  /** Product name stems [th, en] */
  stems: [string, string][];
  /** Brand pool — mixes prototype brands (facet consolidation) with new ones */
  brands: string[];
  series: string[];
  unit: string;
  priceMin: number;
  priceMax: number;
  specTh: string[];
  specEn: string[];
  certs: (string | null)[];
  palette: [string, string][];
  sizes: string[][];
}

const LEADS = ["3 วัน", "5 วัน", "7 วัน", "10 วัน", "14 วัน", "21 วัน", "30 วัน", "45 วัน"];
const WTYS = [null, "3 ปี", "5 ปี", "10 ปี", "15 ปี"];

const CONFIGS: CatConfig[] = [
  {
    // 0 กระเบื้อง & พอร์ซเลน
    stems: [
      ["กระเบื้องพอร์ซเลน", "Porcelain tile"],
      ["กระเบื้องแกรนิตโต้", "Granito tile"],
      ["กระเบื้องผนัง", "Wall tile"],
      ["กระเบื้องลายหิน", "Stone-look tile"],
      ["โมเสกเซรามิก", "Ceramic mosaic"],
      ["กระเบื้องลายไม้", "Wood-look tile"],
    ],
    brands: ["COTTO", "Duragres", "EcoTile", "Campana", "Sosuco", "RCI", "WDC"],
    series: ["Arctic", "Terra", "Urban", "Marble", "Nordic", "Loft", "Sahara", "Onyx", "Basalt", "Prime"],
    unit: "ตร.ม.",
    priceMin: 320,
    priceMax: 2200,
    specTh: ["ดูดซึมน้ำ <0.5% · Matt", "กันลื่น R10", "กันลื่น R11 · เหมาะงานเปียก", "ผิว Polished · ขอบ rectified", "ผิว Lappato"],
    specEn: ["Water abs. <0.5% · Matt", "Anti-slip R10", "Anti-slip R11 · wet areas", "Polished · rectified edge", "Lappato finish"],
    certs: ["มอก. 2508", "มอก. 2508", null],
    palette: [
      ["ขาวหินอ่อน", "#E4E1DC"], ["เทาคาร์รารา", "#C9CBCE"], ["ดำแกรนิต", "#5A5B5E"],
      ["เบจทราเวอทีน", "#D8CBB4"], ["ครีมงาช้าง", "#E8E2D2"], ["เทาซีเมนต์", "#AFAFAB"],
      ["น้ำตาลไม้", "#A57B52"], ["เขียวเซจ", "#AEBFAE"],
    ],
    sizes: [["60×60 ซม."], ["60×120 ซม."], ["30×60 ซม."], ["80×80 ซม."], ["20×120 ซม."]],
  },
  {
    // 1 หินธรรมชาติ & หินขัด
    stems: [
      ["หินขัดเทอราซโซ", "Terrazzo"],
      ["หินแกรนิต", "Granite"],
      ["หินอ่อน", "Marble"],
      ["หินทรายธรรมชาติ", "Sandstone"],
      ["หินกาบ", "Ledge stone"],
      ["หินควอตซ์สังเคราะห์", "Engineered quartz"],
    ],
    brands: ["Siam Terrazzo", "Stonefield", "ThaiStone", "Marmo", "QuartzLab"],
    series: ["Classic", "Royal", "Venice", "Alpine", "Delta", "Canyon", "Riviera", "Summit"],
    unit: "ตร.ม.",
    priceMin: 850,
    priceMax: 5200,
    specTh: ["หนา 20 มม. · กันลื่น R10", "หนา 30 มม. · ผิวเผาไฟ", "ขัดเงา · เคลือบกันคราบ", "ผิวธรรมชาติ split-face"],
    specEn: ["20 mm · R10", "30 mm · flamed", "Polished · sealed", "Natural split-face"],
    certs: ["มอก. 826", null, null],
    palette: [
      ["ครีมปูนขาว", "#C9C2B4"], ["เทาควัน", "#A8A8A4"], ["ดำอินเดีย", "#4A4A4C"],
      ["ขาวคาร์รารา", "#DCDCD8"], ["เขียวหยก", "#9CB0A0"], ["ชมพูพาสเทล", "#D4B8B0"],
      ["น้ำตาลทราย", "#C0A882"],
    ],
    sizes: [["หล่อในที่"], ["แผ่น 60×60"], ["30×60 ซม."], ["สั่งตัดตามแบบ"]],
  },
  {
    // 2 ไม้จริง & ไม้เอนจิเนียร์
    stems: [
      ["ไม้เอ็นจิเนียร์", "Engineered wood"],
      ["ไม้จริงปาร์เก้", "Solid parquet"],
      ["ไม้พื้นรางลิ้น", "T&G plank"],
      ["ไม้ระแนงผนัง", "Wall slat"],
      ["ไม้ตกแต่งฝ้า", "Ceiling timber"],
    ],
    brands: ["Woodwork", "Northern", "Leowood", "Vanachai", "TimberPlus"],
    series: ["Oak", "Teak", "Walnut", "Ash", "Merbau", "Maple", "Ebony"],
    unit: "ตร.ม.",
    priceMin: 980,
    priceMax: 4800,
    specTh: ["หนา 15 มม. · ผิว UV Lacquer · E1", "หนา 18 มม. · อบแห้ง KD", "ผิวแปรงเสี้ยน · น้ำมันธรรมชาติ", "กันปลวก · เคลือบ 7 ชั้น"],
    specEn: ["15 mm · UV lacquer · E1", "18 mm · kiln dried", "Brushed · natural oil", "Termite-proof · 7 coats"],
    certs: ["FSC", "FSC", null],
    palette: [
      ["โอ๊คธรรมชาติ", "#A9743F"], ["โอ๊ครมควัน", "#7A5230"], ["สักทอง", "#B08048"],
      ["วอลนัทเข้ม", "#6A4A32"], ["แอชขาว", "#C8A87C"], ["น้ำตาลเทา", "#8A7460"],
    ],
    sizes: [["190×1900 มม."], ["120×1200 มม."], ["90×900 มม."], ["220×2200 มม."]],
  },
  {
    // 3 ไวนิล SPC & ลามิเนต
    stems: [
      ["พื้น SPC คลิกล็อก", "SPC click-lock"],
      ["กระเบื้องยาง LVT", "LVT plank"],
      ["พื้นลามิเนต", "Laminate floor"],
      ["พื้นไวนิลม้วน", "Vinyl sheet"],
      ["พื้นกีฬา PVC", "Sports PVC floor"],
    ],
    brands: ["FloorMaster", "VinylPro", "Starflex", "Dynoflex", "GreenLam"],
    series: ["AquaLock", "DuraClick", "HomePro", "Style", "Core", "Titan"],
    unit: "ตร.ม.",
    priceMin: 260,
    priceMax: 1450,
    specTh: ["หนา 4 มม. · Wear 0.3 มม.", "หนา 5 มม. · Wear 0.5 มม. · กันน้ำ 100%", "AC4 · หนา 8 มม.", "AC5 · หนา 12 มม.", "ถอดเปลี่ยนรายแผ่น"],
    specEn: ["4 mm · wear 0.3", "5 mm · wear 0.5 · waterproof", "AC4 · 8 mm", "AC5 · 12 mm", "Replace per plank"],
    certs: ["FloorScore", null, "E1"],
    palette: [
      ["ไม้โอ๊คอ่อน", "#B8916A"], ["ไม้วอลนัท", "#7A5A42"], ["ไม้แอชเทา", "#A0968C"],
      ["หินเทา", "#9AA0A4"], ["คอนกรีต", "#A8A8A6"], ["โอ๊คน้ำผึ้ง", "#B78B5C"],
    ],
    sizes: [["180×1220 มม."], ["230×1520 มม."], ["500×500 มม."]],
  },
  {
    // 4 อิฐ & บล็อก
    stems: [
      ["อิฐดินเผา", "Clay brick"],
      ["อิฐโชว์แนว", "Facing brick"],
      ["บล็อกช่องลม", "Breeze block"],
      ["อิฐมวลเบา", "AAC block"],
      ["บล็อกปูพื้น", "Paving block"],
    ],
    brands: ["บ้านโป่ง", "BlockCraft", "Q-CON", "อิฐแดงราชบุรี", "PaveStone"],
    series: ["ดั้งเดิม", "Breeze", "Classic", "Smooth", "Rustic", "Modern"],
    unit: "ก้อน",
    priceMin: 8,
    priceMax: 120,
    specTh: ["เผาเตาฟืน · สีธรรมชาติ", "รับแรง 2.5 MPa", "รับแรง 5 MPa · G4", "กันเสียง กันไฟ 4 ชม.", "ผิวกันลื่น"],
    specEn: ["Wood-fired · natural tone", "2.5 MPa", "5 MPa · G4", "Acoustic · 4 h fire", "Anti-slip surface"],
    certs: ["มอก. 58", "มอก. 77", null],
    palette: [
      ["ส้มอิฐ", "#B0512F"], ["แดงเข้ม", "#8A3A24"], ["ส้มอ่อน", "#C87A50"],
      ["เทาซีเมนต์", "#A8A8A4"], ["ขาว", "#DCDCD8"], ["น้ำตาลเผา", "#96543A"],
    ],
    sizes: [["มาตรฐาน"], ["จัมโบ้ 7×16×4"], ["19×19 ซม."], ["20×60×7.5 ซม."]],
  },
  {
    // 5 ปูน คอนกรีต & ไฟเบอร์ซีเมนต์
    stems: [
      ["แผ่นไฟเบอร์ซีเมนต์", "Fiber cement board"],
      ["ปูนฉาบตกแต่ง", "Decorative render"],
      ["คอนกรีตขัดมัน", "Polished concrete"],
      ["ไม้สังเคราะห์ไฟเบอร์", "WPC fiber plank"],
      ["ปูนซีเมนต์ขาว", "White cement"],
    ],
    brands: ["BoardTech", "SCG", "เฌอร่า", "TPI", "ConWood"],
    series: ["FiberPlank", "Smartboard", "SkimCoat", "Loft", "Nano", "Ultra"],
    unit: "ตร.ม.",
    priceMin: 120,
    priceMax: 980,
    specTh: ["กันชื้น · ทนไฟ 2 ชม.", "ขอบเรียบ · ไม่มีใยหิน", "ผิวลอฟท์เปลือย", "ทนแดดฝน ไม่บิดงอ"],
    specEn: ["Moisture-proof · 2 h fire", "Square edge · asbestos-free", "Raw loft finish", "Weatherproof, no warp"],
    certs: ["มอก. 1427", null],
    palette: [
      ["เทาซีเมนต์เปลือย", "#B8B5AC"], ["ขาวรองพื้น", "#D8D6D0"], ["เทาเข้ม", "#8A8A86"],
      ["ครีม", "#D4CCBC"],
    ],
    sizes: [["8 มม."], ["12 มม."], ["16 มม."], ["120×240 ซม."]],
  },
  {
    // 6 ยิปซัม & อะคูสติก
    stems: [
      ["ยิปซัมอะคูสติก", "Acoustic gypsum"],
      ["แผ่นยิปซัมกันชื้น", "MR gypsum board"],
      ["แผ่นซับเสียงผนัง", "Acoustic wall panel"],
      ["ฝ้าทีบาร์อะคูสติก", "Acoustic T-bar tile"],
      ["แผ่นยิปซัมกันไฟ", "Fire-rated gypsum"],
    ],
    brands: ["Acoustic Pro", "Knauf", "ยิปรอค", "SCG", "SoundTech"],
    series: ["Perfo", "MoistShield", "Quiet", "Echo", "FireLine", "Cloud"],
    unit: "ตร.ม.",
    priceMin: 150,
    priceMax: 1250,
    specTh: ["NRC 0.70 · ขอบ Tegular", "แกนกันชื้นสีเขียว", "NRC 0.85 · หุ้มผ้า", "ทนไฟ 2 ชม. · แกนชมพู"],
    specEn: ["NRC 0.70 · Tegular", "Green MR core", "NRC 0.85 · fabric-wrapped", "2 h fire · pink core"],
    certs: ["มอก. 219", null],
    palette: [
      ["ขาว", "#E9E7E0"], ["เขียว MR", "#B8C8B0"], ["เทาอ่อน", "#CCCCC8"],
      ["ชมพูกันไฟ", "#D8B8B4"],
    ],
    sizes: [["120×240 ซม."], ["60×60 ซม."], ["9 มม."], ["12 มม."]],
  },
  {
    // 7 โลหะ & เหล็ก
    stems: [
      ["เหล็กรูปพรรณ", "Structural steel"],
      ["ครีบอะลูมิเนียม", "Aluminium fin"],
      ["แผ่นเมทัลชีท", "Metal sheet"],
      ["ตะแกรงเหล็กฉีก", "Expanded mesh"],
      ["สแตนเลสแผ่น", "Stainless sheet"],
    ],
    brands: ["Metro Steel", "AlumTech", "BlueScope", "SteelPro", "InoxThai"],
    series: ["H-Beam", "Facade", "Roof", "Mesh", "Hairline", "Box"],
    unit: "ตร.ม.",
    priceMin: 180,
    priceMax: 3200,
    specTh: ["Yield 245 MPa · JIS", "เคลือบ PVDF · 20 ปี", "หนา 0.35 มม. · กันสนิม", "ผิว Hairline · เกรด 304"],
    specEn: ["Yield 245 MPa · JIS", "PVDF coated · 20-yr", "0.35 mm · rust-proof", "Hairline · grade 304"],
    certs: ["มอก. 1227", "AAMA 2605", null],
    palette: [
      ["เหล็กดิบ", "#5B6670"], ["เงินอโนไดซ์", "#B8BEC4"], ["ดำด้าน", "#3A3C40"],
      ["ทองแชมเปญ", "#C0A878"], ["ขาวมุก", "#D8D8D4"],
    ],
    sizes: [["150×150"], ["50×150 มม."], ["760 มม. คลุม"], ["4×8 ฟุต"]],
  },
  {
    // 8 กระจก & อะคริลิก
    stems: [
      ["กระจกลามิเนต", "Laminated glass"],
      ["กระจกเทมเปอร์", "Tempered glass"],
      ["กระจกลอนฟลูท", "Fluted glass"],
      ["บล็อกแก้ว", "Glass block"],
      ["แผ่นโพลีคาร์บอเนต", "Polycarbonate sheet"],
    ],
    brands: ["ClearView", "GlassArt", "AGC", "ไทยกลาส", "PolyTech"],
    series: ["Low-E", "Crystal", "Fluted", "Wave", "Solar", "Frost"],
    unit: "ตร.ม.",
    priceMin: 480,
    priceMax: 4800,
    specTh: ["SHGC 0.28 · VLT 62%", "หนา 10 มม. · เทมเปอร์", "หนา 8 มม. · ลอนแนวตั้ง", "กัน UV 99% · น้ำหนักเบา"],
    specEn: ["SHGC 0.28 · VLT 62%", "10 mm tempered", "8 mm · vertical flutes", "99% UV cut · lightweight"],
    certs: ["มอก. 1222", "มอก. 965", null],
    palette: [
      ["ใสเขียวอ่อน", "#9FBCC4"], ["ใสน้ำเงิน", "#8AAEC4"], ["ใส", "#C8D8DC"],
      ["ชาอ่อน", "#B8A890"], ["ขุ่นฟรอสต์", "#D0D8DA"],
    ],
    sizes: [["6+6 มม."], ["8+8 มม."], ["10 มม."], ["ลอน 10 มม."]],
  },
  {
    // 9 สี & สารเคลือบผิว
    stems: [
      ["สีน้ำอะคริลิกภายใน", "Interior acrylic paint"],
      ["สีภายนอกทนยูวี", "Exterior UV paint"],
      ["สีสะท้อนความร้อน", "Heat-reflective paint"],
      ["สีปูนไลม์วอช", "Limewash"],
      ["เคลือบกันซึม PU", "PU waterproofing"],
    ],
    brands: ["CoolCoat", "ColorLab", "TOA", "Beger", "Jotun", "Nippon"],
    series: ["SolarShield", "LimeWash", "Shield", "Fresh", "Aqua", "Pro"],
    unit: "ถัง 9 ล.",
    priceMin: 850,
    priceMax: 4200,
    specTh: ["VOC <50 g/L · ด้าน", "SRI 108 · กันร้อน", "เช็ดล้างได้ 10,000 รอบ", "กันเชื้อรา · กลิ่นอ่อน"],
    specEn: ["VOC <50 · matte", "SRI 108 · cool", "10,000-cycle scrub", "Anti-mould · low odour"],
    certs: ["ฉลากเขียว", null],
    palette: [
      ["ขาวออฟไวท์", "#EDEBE6"], ["เทาอ่อน", "#CCCCC8"], ["ครีม", "#E4DCC8"],
      ["เขียวโคลน", "#A8AC94"], ["ดินเผา", "#C89078"], ["ฟ้าหมอก", "#AFC4CE"],
    ],
    sizes: [["9 ล."], ["18.9 ล."], ["5 ล."], ["3.5 ล."]],
  },
  {
    // 10 ฉนวน & กันความร้อน
    stems: [
      ["ฉนวนใยแก้ว", "Fiberglass insulation"],
      ["ฉนวนใยหิน", "Rockwool"],
      ["ฉนวน PE สะท้อนรังสี", "PE reflective foil"],
      ["โฟม PU พ่น", "Spray PU foam"],
      ["แผ่นกันเสียงพื้น", "Floor acoustic underlay"],
    ],
    brands: ["GreenBuild", "ThermoSafe", "SCG", "Micro-Fiber", "InsulPro"],
    series: ["RockVolc", "PE Foil", "Stay Cool", "Quiet", "Therm"],
    unit: "ตร.ม.",
    priceMin: 65,
    priceMax: 1450,
    specTh: ["60 kg/m³ · A1 · NRC 0.90", "หนา 5 มม. · ฟอยล์ 2 หน้า", "R-value 3.2", "ลดเสียงกระแทก 22 dB"],
    specEn: ["60 kg/m³ · A1 · NRC 0.90", "5 mm · double foil", "R-value 3.2", "22 dB impact reduction"],
    certs: ["ASTM C612", null],
    palette: [
      ["เขียวขี้ม้า", "#8B8F72"], ["ฟอยล์เงิน", "#C8CCD0"], ["เหลืองใยแก้ว", "#D8C878"],
      ["เทา", "#A8A8A6"],
    ],
    sizes: [["50 มม."], ["75 มม."], ["100 มม."], ["ม้วน 60 ตร.ม."]],
  },
  {
    // 11 ผ้า หนัง & วัสดุบุผิว
    stems: [
      ["ผ้าบุเฟอร์นิเจอร์", "Upholstery fabric"],
      ["หนังไมโครไฟเบอร์", "Microfiber leather"],
      ["ผ้าม่านกันแสง", "Blackout curtain"],
      ["วอลเปเปอร์ไวนิล", "Vinyl wallpaper"],
      ["พรมแผ่น", "Carpet tile"],
    ],
    brands: ["Fabrica", "Upholstery", "PasayaPro", "WallDeco", "CarpetOne"],
    series: ["Crib 5", "Micro", "Night", "Texture", "Loop", "Velvet"],
    unit: "ม.",
    priceMin: 180,
    priceMax: 2400,
    specTh: ["Martindale 60,000 · BS5852", "ทนขีดข่วน · เช็ดล้างได้", "กันแสง 100% · ซักได้", "กันชื้น · ลายนูน 3D"],
    specEn: ["Martindale 60k · BS5852", "Scratch-proof · wipeable", "100% blackout · washable", "Moisture-proof · 3D emboss"],
    certs: [null, "BS5852"],
    palette: [
      ["ชมพูตุ่น", "#B98A94"], ["เทาเข้ม", "#787880"], ["เขียวขวด", "#5A7868"],
      ["ครีม", "#D8CCB8"], ["น้ำตาลคาราเมล", "#9A6A48"], ["น้ำเงินหมึก", "#4A5A78"],
    ],
    sizes: [["140 ซม."], ["137 ซม."], ["หน้ากว้าง 280 ซม."], ["50×50 ซม."]],
  },
  {
    // 12 สุขภัณฑ์ & ฟิตติ้ง
    stems: [
      ["ก๊อกอ่างล้างหน้า", "Basin faucet"],
      ["ชุดฝักบัวเรนชาวเวอร์", "Rain shower set"],
      ["สุขภัณฑ์หนึ่งชิ้น", "One-piece toilet"],
      ["อ่างล้างหน้าเซรามิก", "Ceramic basin"],
      ["สายฉีดชำระ", "Bidet spray"],
    ],
    brands: ["AquaFit", "BathPro", "COTTO", "American Std", "Mogen"],
    series: ["EcoFlow", "RainSet", "Slim", "Cube", "Arc", "Wave"],
    unit: "ชุด",
    priceMin: 450,
    priceMax: 18500,
    specTh: ["4.5 ล./นาที · Chrome", "หัว 250 มม. · แรงดันต่ำใช้ได้", "ประหยัดน้ำ 3/4.5 ล.", "เคลือบนาโนกันคราบ"],
    specEn: ["4.5 L/min · chrome", "250 mm head · low-pressure OK", "3/4.5 L dual flush", "Nano anti-stain glaze"],
    certs: ["ฉลากประหยัดน้ำ", null],
    palette: [
      ["โครเมียม", "#A9B4BC"], ["ดำด้าน", "#4A4C50"], ["ทองแชมเปญ", "#C0A878"],
      ["ขาว", "#E8E8E4"], ["นิกเกิลด้าน", "#9A9C98"],
    ],
    sizes: [["ก้านสั้น"], ["ก้านสูง"], ["ฝังผนัง"], ["ตั้งพื้น"]],
  },
  {
    // 13 แสงสว่าง & โคมไฟ
    stems: [
      ["ราง Magnetic Track", "Magnetic track"],
      ["โคมไฟเส้น LED", "LED linear"],
      ["ดาวน์ไลท์ฝังฝ้า", "Recessed downlight"],
      ["โคมแขวนตกแต่ง", "Pendant light"],
      ["ไฟเส้น LED Strip", "LED strip"],
    ],
    brands: ["Lumina", "BrightWorks", "Philips", "Opple", "LightCraft"],
    series: ["TrackPro", "LinearSlim", "Spot", "Halo", "Orb", "Flex"],
    unit: "ชุด",
    priceMin: 120,
    priceMax: 6800,
    specTh: ["48V · CRI 90 · Dim to warm", "CRI 90 · 3000K/4000K · IP44", "CRI 97 · กันแสงแยง UGR<19", "IP65 ใช้ภายนอกได้"],
    specEn: ["48V · CRI 90 · DTW", "CRI 90 · IP44", "CRI 97 · UGR<19", "IP65 outdoor-rated"],
    certs: ["มอก. 1955", null],
    palette: [
      ["ดำ", "#38383A"], ["ขาว", "#E4E4E2"], ["อลูมิเนียม", "#B0B4B8"],
      ["ทองเหลือง", "#B89858"],
    ],
    sizes: [["ฝังฝ้า"], ["ลอยฝ้า"], ["กว้าง 20 มม."], ["ม้วน 5 ม."]],
  },
];

/** Generate ~`perCategory` extra materials per category (default 72 → ~1,008). */
export function generateBulkMaterials(perCategory = 72): BulkMaterial[] {
  const out: BulkMaterial[] = [];
  const usedModels = new Set<string>();

  CONFIGS.forEach((cfg, cat) => {
    const rand = rng(1000 + cat * 97);
    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

    for (let i = 0; i < perCategory; i++) {
      const stem = pick(cfg.stems);
      const brand = pick(cfg.brands);
      const series = pick(cfg.series);
      // Numbered model keeps SKUs unique and looks like a real product line.
      let model = `${series} ${100 + Math.floor(rand() * 900)}`;
      while (usedModels.has(`${brand}|${model}`)) {
        model = `${series} ${100 + Math.floor(rand() * 900)}`;
      }
      usedModels.add(`${brand}|${model}`);

      // Price: log-ish spread inside the category band, rounded to a clean step.
      const span = cfg.priceMax - cfg.priceMin;
      const raw = cfg.priceMin + span * rand() * rand();
      const step = raw > 1000 ? 50 : raw > 100 ? 10 : 1;
      const price = Math.max(cfg.priceMin, Math.round(raw / step) * step);

      const colorCount = 1 + Math.floor(rand() * 3);
      const start = Math.floor(rand() * cfg.palette.length);
      const colors = Array.from(
        { length: colorCount },
        (_, k) => cfg.palette[(start + k) % cfg.palette.length],
      );

      const specIdx = Math.floor(rand() * cfg.specTh.length);
      out.push({
        cat,
        brand,
        model,
        th: `${stem[0]} ${series}`,
        en: `${stem[1]} ${series}`,
        unit: cfg.unit,
        price,
        specTh: cfg.specTh[specIdx],
        specEn: cfg.specEn[specIdx],
        cert: pick(cfg.certs),
        lead: pick(LEADS),
        wty: pick(WTYS),
        moq: `${pick([1, 5, 10, 20, 50])} ${cfg.unit}`,
        colors: colors as [string, string][],
        sizes: pick(cfg.sizes),
      });
    }
  });

  return out;
}
