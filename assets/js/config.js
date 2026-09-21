/*
  ค่าตั้งต้นของเว็บ — แก้ไฟล์นี้ไฟล์เดียวได้เลย
  Site settings: edit this file only.
*/
window.WEDDING_CONFIG = {
  // 1) URL ของ Google Apps Script Web App ที่รับข้อมูล RSVP ลง Google Sheet (ขั้นตอนอยู่ใน README.md)
  //    เว้นว่างไว้ = โหมดตัวอย่าง (ฟอร์มใช้ได้ แต่ข้อมูลจะไม่ถูกบันทึก และจะมีข้อความเตือนให้เห็น)
  rsvpEndpoint: '',

  // 2) ลิงก์ Google Maps ของสถานที่จริง (เว้นว่าง = ใช้ลิงก์ค้นหา "Undercloud Venue Nonthaburi")
  mapUrl: '',

  // 3) เวลาสำหรับปุ่ม "เพิ่มลงปฏิทิน" (UTC)  18:00 น. เวลาไทย = 11:00 UTC
  //    เวลาจบเป็นค่าสมมติ 23:00 น. เวลาไทย (16:00 UTC) — แก้ได้เมื่อกำหนดเวลาจบจริง
  event: {
    startUtc: '20261226T110000Z',
    endUtc:   '20261226T160000Z',
    title:    'Love AT FIRST DRINK — Tanawit & Kawisara',
    location: 'Undercloud Venue, Nonthaburi',
    description: 'Bar opens 18:00. Drink up, never drive: book your ride home.'
  }
};
