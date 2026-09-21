# Love AT FIRST DRINK — เว็บ RSVP งานแต่ง Tanawit & Kawisara

เว็บ static (HTML/CSS/JS ล้วน ไม่ต้อง build) เปิด `index.html` ดูได้ทันที หรืออัปโหลดขึ้น Cloudflare Pages / Netlify / GitHub Pages ได้เลย

## โครงไฟล์

```
index.html              เนื้อหาทั้งหมด (ข้อความไทย/อังกฤษอยู่ในไฟล์นี้ เป็นคู่ .th / .en)
assets/css/style.css    สไตล์ + สีทั้งหมด (ตัวแปรสีอยู่บนสุดของไฟล์ใน :root)
assets/js/config.js     ค่าที่ต้องตั้ง: ลิงก์รับข้อมูล RSVP, ลิงก์แผนที่, เวลาปฏิทิน
assets/js/main.js       สลับภาษา, มาตรวัด, ฟอร์ม RSVP, ปุ่มเพิ่มลงปฏิทิน
assets/img/             รูปทั้งหมด (มีทั้งไฟล์เล็ก -sm สำหรับมือถือ และไฟล์ใหญ่)
```

## 1) เชื่อมฟอร์มกับ Google Sheet (สำคัญ: ทำก่อนแจกลิงก์)

ตอนนี้ฟอร์มอยู่ในโหมดตัวอย่าง คือกดส่งแล้วจะเห็นหน้าสำเร็จพร้อมข้อความเตือน "ยังไม่ได้เชื่อมต่อฐานข้อมูล" และข้อมูลจะยังไม่ถูกบันทึก ให้ทำตามนี้เพื่อให้ข้อมูลลง Sheet

1. สร้าง Google Sheet ใหม่ ตั้งชื่ออะไรก็ได้ เช่น `RSVP Wedding`
2. เมนู **Extensions → Apps Script** ลบโค้ดเดิมทิ้ง แล้ววางโค้ดนี้

```js
const SHEET_NAME = 'RSVP';
const HEADERS = ['เวลา', 'มา/ไม่มา', 'ชื่อ', 'ติดต่อ', 'เครื่องดื่ม', 'จำนวนที่นั่ง', 'แพ้อาหาร', 'ขากลับ', 'ระดับพร้อมเมา', 'ข้อความ', 'ภาษา'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  sh.appendRow([
    new Date(d.submittedAt), d.attend === 'yes' ? 'มา' : 'ไม่มา', d.name, d.contact,
    d.drink, d.guests, d.dietary, d.ride, d.readiness, d.message, d.lang
  ]);
  return ContentService.createTextOutput('ok');
}
```

3. กด **Deploy → New deployment** เลือกชนิด **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. กด Deploy แล้วอนุญาตสิทธิ์ตามที่ Google ถาม (หน้าจอเตือน "Google hasn't verified this app" ให้กด Advanced → Go to ... เพราะเป็นสคริปต์ของคุณเอง)
5. คัดลอก **Web app URL** (ขึ้นต้นด้วย `https://script.google.com/macros/s/...`) ไปวางใน `assets/js/config.js` ที่ `rsvpEndpoint`
6. ทดสอบ: เปิดเว็บ กรอกฟอร์ม กดส่ง แล้วดูว่ามีแถวใหม่ใน Sheet

ถ้าแก้โค้ด Apps Script ภายหลัง ต้องกด **Deploy → Manage deployments → แก้ไข → New version** ถึงจะมีผล

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
ใน `index.html` แก้ `og:image` ให้เป็นลิงก์เต็ม เช่น `https://โดเมนของคุณ/assets/img/og.jpg` เพื่อให้ตอนแชร์ใน LINE/Facebook ขึ้นรูปตัวอย่าง

## 4) แก้เนื้อหา

- **ข้อความ**: ใน `index.html` ทุกข้อความมีสองภาษา `<span class="th">…</span><span class="en">…</span>`
- **ตารางงาน**: ส่วน `<ol class="rail">` มี 4 รอบ (`<li class="row">`) แก้เวลา ชื่อ และคำอธิบายได้
- **สี**: `:root` บนสุดของ `style.css` (`--bg` เบอร์กันดี, `--org` ส้ม, `--olv` มะกอก, `--gold` ครีม)
- **รูป**: ใส่ไฟล์ webp ใหม่ใน `assets/img/` แล้วแก้ชื่อไฟล์ใน `index.html` (แนะนำทำสองขนาด: กว้าง 640 และ 1200)
- **ช่องฟอร์ม**: เพิ่ม/ลบช่องใน `<form id="rsvp-form">` ถ้าเพิ่มช่องใหม่ ต้องเพิ่มชื่อฟิลด์ในตัวแปร `data` ของ `main.js` และเพิ่มคอลัมน์ในสคริปต์ Apps Script ด้วย
- **ปิดการกัน Google ไม่ให้ค้นเจอ**: ตอนนี้ตั้ง `noindex` ไว้ (ให้เฉพาะคนที่มีลิงก์เข้าได้) ถ้าอยากให้ค้นเจอ ให้ลบบรรทัด `<meta name="robots">` ใน `index.html`

## ข้อควรรู้

- ฟอนต์โหลดจาก Google Fonts ต้องมีอินเทอร์เน็ตตอนเปิดเว็บ
- ปุ่ม "เพิ่มลงปฏิทิน" ตั้งเวลาจบเป็น 23:00 น. เป็นค่าสมมติ แก้ได้ใน `config.js`
- ข้อความ "เมาได้ · แต่ห้ามขับ" มีทั้งในส่วนมาตรวัด สติกเกอร์ ช่อง "ขากลับจะกลับยังไง?" ในฟอร์ม และท้ายหน้า
