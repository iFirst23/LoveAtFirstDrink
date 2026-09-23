# Love AT FIRST DRINK — เว็บ RSVP งานแต่ง Tanawit & Kawisara

เว็บ static (HTML/CSS/JS ล้วน ไม่ต้อง build) เปิด `index.html` ดูได้ทันที หรืออัปโหลดขึ้น Cloudflare Pages / Netlify / GitHub Pages ได้เลย

## โครงไฟล์

```
index.html              เนื้อหาทั้งหมด (หน้าเดียว ไทย+อังกฤษผสมกัน ไม่มีปุ่มเลือกภาษา)
assets/css/style.css    สไตล์ + สีทั้งหมด (ตัวแปรสีอยู่บนสุดของไฟล์ใน :root)
assets/js/config.js     ค่าที่ต้องตั้ง: ลิงก์รับข้อมูล RSVP, ลิงก์แผนที่, ข้อมูลที่จอดรถ, เวลาปฏิทิน
assets/js/main.js       มาตรเมาข้างฟอร์ม (ขยับตามสไลเดอร์ 4 จังหวะ), ฟอร์ม RSVP (ตรวจช่องที่ต้องกรอก, ส่งข้อมูล), ใบเสร็จความพร้อม + ปุ่มเซฟเป็นภาพ PNG, ปุ่ม RSVP ลอยบนมือถือ, ปุ่มเพิ่มลงปฏิทิน
assets/img/             รูปทั้งหมด (มีทั้งไฟล์เล็ก -sm สำหรับมือถือ และไฟล์ใหญ่)
```

## 1) เชื่อมฟอร์มกับ Google Sheet (สำคัญ: ทำก่อนแจกลิงก์)

ตอนนี้ฟอร์มอยู่ในโหมดตัวอย่าง คือกดส่งแล้วจะเห็นหน้าสำเร็จพร้อมข้อความเตือน "ยังไม่ได้เชื่อมต่อฐานข้อมูล" และข้อมูลจะยังไม่ถูกบันทึก ให้ทำตามนี้เพื่อให้ข้อมูลลง Sheet

1. สร้าง Google Sheet ใหม่ ตั้งชื่ออะไรก็ได้ เช่น `RSVP Wedding`
2. เมนู **Extensions → Apps Script** ลบโค้ดเดิมทิ้ง แล้ววางโค้ดนี้

```js
const SHEET_NAME = 'RSVP';
// เรียงคอลัมน์เดิมไว้เหมือนเดิม แล้วต่อคอลัมน์ใหม่ท้ายตารางเสมอ (เพิ่มฟีเจอร์ทีหลังก็ทำแบบนี้ได้
// เรื่อยๆ โดยไม่ทำให้แถวเก่าเลื่อนคอลัมน์ผิด)
const HEADERS = ['เวลา', 'มา/ไม่มา', 'ชื่อ', 'ติดต่อ', 'เครื่องดื่ม', 'จำนวนที่นั่ง', 'แพ้อาหาร', 'การเดินทาง',
  'ระดับพร้อมเมา', 'ข้อความ', 'เพลงลุกขึ้นเต้น', 'ระดับ (1-4)', 'รหัสส่ง', 'ทะเบียนรถ', 'ลำดับ'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    // สร้าง/อัปเดตหัวตารางให้ครบทุกคอลัมน์ (ชีตเก่าที่มีคอลัมน์น้อยกว่าจะได้คอลัมน์ใหม่ต่อท้ายเอง)
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    // กันแถวซ้ำ: ถ้าแขกกดส่งซ้ำหลังเน็ตหลุด รหัสส่งเดิมจะไม่ถูกบันทึกอีก (คืนเลขลำดับเดิมกลับไปด้วย
    // ไม่งั้นบัตรจะมี 2 เลขสำหรับคนเดียว)
    // (หาคอลัมน์ด้วยชื่อ ไม่ใช่ตำแหน่งสุดท้าย เพราะคอลัมน์ใหม่ๆ จะถูกต่อท้ายไปเรื่อยๆ)
    const idCol = HEADERS.indexOf('รหัสส่ง') + 1;
    const runCol = HEADERS.indexOf('ลำดับ') + 1;
    if (d.submissionId && sh.getLastRow() > 1) {
      const hit = sh.getRange(2, idCol, sh.getLastRow() - 1, 1).createTextFinder(String(d.submissionId)).matchEntireCell(true).findNext();
      if (hit) {
        return json_({ ok: true, duplicate: true, runNumber: sh.getRange(hit.getRow(), runCol).getValue() });
      }
    }
    // เลขลำดับ = จำนวนแถวข้อมูลที่มีอยู่ก่อนแถวนี้ + 1 (แถว 1 คือหัวตาราง) ไม่ใช่ตัวนับแยกที่เก็บไว้ที่อื่น
    // ดังนั้นถ้าลบแถวในชีตทิ้ง เลขของคนที่ลงทะเบียนถัดไปจะขยับตามจำนวนแถวที่เหลือจริงโดยอัตโนมัติ
    const runNumber = sh.getLastRow();
    sh.appendRow([
      new Date(d.submittedAt), d.attend === 'yes' ? 'มา' : 'ไม่มา', d.name, d.contact,
      d.drink, d.guests, d.dietary, d.ride,
      d.readinessLevel ? d.readinessLevel + ' · ' + d.readiness : '',   // ไม่ได้เลือกมาตร = เว้นว่าง
      d.message, d.song, d.readinessLevel || '', d.submissionId || '',
      d.plate || '',   // มีค่าเฉพาะตอนเลือกตัวเลือก "รถส่วนตัว..." แล้วกรอกทะเบียน
      runNumber
    ]);
    return json_({ ok: true, runNumber: runNumber });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
```

**ถ้าเคย deploy ไปแล้วและแค่จะอัปเดตโค้ด** (เช่น เพิ่มคอลัมน์ 'ลำดับ' รอบนี้): แทนที่โค้ดเดิมในหน้า Apps Script ด้วยโค้ดข้างบนทั้งหมด กด 💾 แล้วกด **Deploy → Manage deployments** → กดไอคอนดินสอ (แก้ไข) ข้างเวอร์ชันปัจจุบัน → เปลี่ยน Version เป็น **New version** → กด **Deploy** (URL เดิมใช้ต่อได้ ไม่ต้องเปลี่ยนใน config.js)

หมายเหตุคอลัมน์ **'ลำดับ'**: เป็นเลขที่ใช้ออกบัตร Guest Pass (JF-0001, JF-0002, ...) นับจาก**จำนวนแถวที่มีอยู่จริงในชีตตอนนั้น** ไม่ใช่ตัวนับแยกที่เก็บไว้ที่อื่น ดังนั้นถ้าลบแถวทดสอบ/แถวไหนออกจากชีต คนที่ลงทะเบียนคนถัดไปจะได้เลขที่ขยับตามจำนวนแถวที่เหลือจริงโดยอัตโนมัติ — ถ้าต้องการให้แขกที่ลงทะเบียนไปแล้วมีเลขนิ่งไม่ขยับ ห้ามลบแถวกลางตาราง (ลบได้เฉพาะแถวท้ายสุดที่ยังไม่มีใครเห็นเลขบัตรตัวเอง เช่น แถวทดสอบ)

3. กด **Deploy → New deployment** เลือกชนิด **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. กด Deploy แล้วอนุญาตสิทธิ์ตามที่ Google ถาม (หน้าจอเตือน "Google hasn't verified this app" ให้กด Advanced → Go to ... เพราะเป็นสคริปต์ของคุณเอง)
5. คัดลอก **Web app URL** (ขึ้นต้นด้วย `https://script.google.com/macros/s/...`) ไปวางใน `assets/js/config.js` ที่ `rsvpEndpoint`
6. ทดสอบ: เปิดเว็บ กรอกฟอร์ม กดส่ง แล้วดูว่ามีแถวใหม่ใน Sheet

ถ้าแก้โค้ด Apps Script ภายหลัง ต้องกด **Deploy → Manage deployments → แก้ไข → New version** ถึงจะมีผล

หน้าเว็บจะแสดง "ใบเสร็จความพร้อม" **ก็ต่อเมื่อสคริปต์ตอบกลับว่าบันทึกแล้วจริง** (`{"ok":true}` หรือข้อความ `ok` จากสคริปต์รุ่นเก่า) ถ้าเชื่อมต่อไม่ได้หรือสคริปต์ตอบ error ฟอร์มจะขึ้นข้อความให้ส่งใหม่ พร้อมเก็บคำตอบเดิมไว้ ต้องตั้ง **Who has access: Anyone** ไม่อย่างนั้นเบราว์เซอร์จะอ่านคำตอบกลับไม่ได้

หมายเหตุ: คนที่รู้ลิงก์ Web app สามารถส่งข้อมูลเข้า Sheet ได้ ฟอร์มมีช่องดักบอท (honeypot) อยู่แล้ว แต่ถ้าจะกันเพิ่มให้เพิ่มรหัสลับในสคริปต์ได้

## 2) ตั้งลิงก์แผนที่

ตอนนี้ปุ่ม Map ใช้ลิงก์ค้นหา "Undercloud Venue Nonthaburi" ถ้าอยากให้ปักหมุดตรงจุด ให้เปิด Google Maps หาสถานที่ กดแชร์ แล้ววางลิงก์ใน `mapUrl` ของ `config.js`

## 3) Deploy

### วิธีเร็วที่สุด: Cloudflare Pages (ลากวาง)
1. เข้า dash.cloudflare.com → **Workers & Pages → Create → Pages → Upload assets**
2. ลากทั้งโฟลเดอร์นี้ (ที่มี `index.html`) ใส่ แล้ว Deploy
3. ได้ลิงก์ `xxx.pages.dev` ตั้งโดเมนเองได้ที่แท็บ Custom domains

### วิธี GitHub + Cloudflare Pages (แก้แล้วขึ้นเว็บอัตโนมัติ)
1. สร้าง repo ใหม่บน GitHub แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → เลือก repo
3. Build command: เว้นว่าง · Build output directory: `/`

### หลังมีโดเมนแล้ว
ใน `index.html` แก้ `og:image` และ `og:url` ให้เป็นลิงก์เต็ม (ตอนนี้ชี้ไปที่ GitHub Pages) เช่น `https://โดเมนของคุณ/assets/img/og.jpg` เพื่อให้ตอนแชร์ใน LINE/Facebook ขึ้นรูปตัวอย่าง

## 4) แก้เนื้อหา

- **ข้อความ**: แก้ตรงๆ ใน `index.html` ได้เลย หลักคือ อังกฤษ = ชื่อหัวข้อ/ชื่อเมนู/บุคลิก, ไทย = ข้อมูลสำคัญที่แขกต้องอ่าน (ไม่เขียนซ้ำสองภาษา)
- **ตารางงาน**: ส่วน `<ol class="rail">` มี 4 รอบ (`<li class="row">`) แก้เวลา ชื่อ และคำอธิบายได้
- **สี**: `:root` บนสุดของ `style.css` (`--bg` เบอร์กันดี, `--org` ส้ม, `--olv` มะกอก, `--gold` ครีม)
- **รูป**: ใส่ไฟล์ webp ใหม่ใน `assets/img/` แล้วแก้ชื่อไฟล์ใน `index.html` (แนะนำทำสองขนาด: กว้าง 640 และ 1200)
- **ที่จอดรถ**: ใส่ข้อความใน `parkingNote` ของ `config.js` แล้วการ์ด PARKING ในส่วน GETTING HOME จะโผล่ขึ้นเอง (เว้นว่าง = ไม่แสดง)
- **ช่องที่ต้องกรอกในฟอร์ม**: ชื่อ (เสมอ) · ถ้าตอบว่ามา ต้องมี LINE/เบอร์โทร และถ้าเลือก "มี" แพ้อาหาร ต้องระบุ ส่วน THE FUN STUFF (เครื่องดื่ม ขากลับ มาตรเมา ขอเพลง) และช่องฝากข้อความข้ามได้ (มาตรเมาจะไม่ถูกบันทึกถ้าแขกไม่ได้แตะสไลเดอร์)
- **ช่องฟอร์ม**: เพิ่ม/ลบช่องใน `<form id="rsvp-form">` ถ้าเพิ่มช่องใหม่ ต้องเพิ่มชื่อฟิลด์ในตัวแปร `data` ของ `main.js` และเพิ่มคอลัมน์ในสคริปต์ Apps Script ด้วย
- **ปิดการกัน Google ไม่ให้ค้นเจอ**: ตอนนี้ตั้ง `noindex` ไว้ (ให้เฉพาะคนที่มีลิงก์เข้าได้) ถ้าอยากให้ค้นเจอ ให้ลบบรรทัด `<meta name="robots">` ใน `index.html`

## ข้อควรรู้

- ฟอนต์โหลดจาก Google Fonts ต้องมีอินเทอร์เน็ตตอนเปิดเว็บ
- ปุ่ม "เพิ่มลงปฏิทิน" ตั้งเวลาจบเป็น 23:00 น. เป็นค่าสมมติ แก้ได้ใน `config.js`
- ข้อความ "เมาได้ · แต่ห้ามขับ" มีทั้งในส่วนสติกเกอร์ ส่วน GETTING HOME และท้ายหน้า
