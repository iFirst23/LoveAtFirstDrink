/*
  ค่าตั้งต้นของ Social Wall — แก้ไฟล์นี้ไฟล์เดียวได้เลย
  Social Wall settings: edit this file only.

  เว้นว่างไว้ = โหมดตัวอย่าง (หน้า /social, /live จะโชว์โพสต์ตัวอย่างที่ใส่ไว้ให้ดูหน้าตา
  แต่ "+ ADD YOUR MOMENT" จะยังส่งจริงไม่ได้ จนกว่าจะใส่ค่าด้านล่างให้ครบ)
*/
window.SOCIAL_CONFIG = {
  // Project Settings → API ใน Supabase dashboard
  supabaseUrl: 'https://hhdhsxmkpzuvbwfflnmd.supabase.co',
  supabaseAnonKey: 'sb_publishable_UMv6WoMtC0_uZYsBhuNhOQ_QEMxXReh',   // "anon public" / publishable key (ไม่ใช่ service_role — อันนั้นห้ามเอามาใส่ในไฟล์นี้เด็ดขาด)

  hashtag: '#JFLoveAtFirstDrink'
};
