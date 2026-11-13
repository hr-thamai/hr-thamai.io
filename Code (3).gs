/**
 * ระบบขออนุญาตไปราชการออนไลน์ - โรงเรียนท่าใหม่ "พูลสวัสดิ์ราษฎร์นุกูล"
 * วิธีใช้: Apps Script > วางไฟล์นี้เป็น Code.gs และสร้างไฟล์ HTML ชื่อ Index
 * แล้ว Deploy > New deployment > Web app
 */
const CONFIG = {
  FOLDER_NAME: 'คำขออนุญาตไปราชการ (PDF)', // โฟลเดอร์ใน Drive (สร้างให้อัตโนมัติ)
  FOLDER_ID: '1cdCzS8Nv4Y0CPCMEPhpeu5bXD7QcHSZT',                           // ถ้ามีโฟลเดอร์อยู่แล้ว ใส่ ID ที่นี่
  SHEET_NAME: 'คำขอ',
  CARS: ['นข 545 จันทบุรี', 'นข 2549 จันทบุรี', 'นข 5302 จันทบุรี'],
  PURPOSES: ['เข้าร่วมประชุม/อบรม/สัมมนา', 'ศึกษาดูงาน', 'เป็นวิทยากร', 'อื่นๆ'],
  EXPENSES: ['เบี้ยเลี้ยง', 'ที่พัก', 'พาหนะ', 'ลงทะเบียน', 'ค่าใช้จ่ายอื่น']
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('แบบขออนุญาตไปราชการออนไลน์')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function getConfig() { return CONFIG; }

/* ---------- บันทึกคำขอ: รับ PDF (base64) ที่สร้างจากหน้าเว็บ เก็บลง Drive + Sheets ---------- */
function saveRequest(d, pdfBase64) {
  const data = (d && d.pdf) || pdfBase64;
  if (!data) throw new Error('ไม่ได้รับไฟล์ PDF จากหน้าเว็บ — ตรวจว่า Index.html เป็นเวอร์ชันล่าสุดและ Deploy เวอร์ชันใหม่แล้ว');
  delete d.pdf;
  const folder = getFolder_();
  const stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
  const name = 'ไปราชการ_' + (d.name || 'ไม่ระบุชื่อ') + '_' + stamp + '.pdf';
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(data), 'application/pdf', name));
  getSheet_().appendRow([
    new Date(), d.name, d.position, d.rank, d.group, d.topic, d.place, d.province,
    d.dateFrom, d.dateTo, d.days, (d.persons || []).length + 1, file.getUrl()
  ]);
  return { ok: true, url: file.getUrl(), name: name };
}

function getFolder_() {
  if (CONFIG.FOLDER_ID) return DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const it = DriveApp.getFoldersByName(CONFIG.FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.FOLDER_NAME);
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  let ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create('ฐานข้อมูลคำขอไปราชการ');
    props.setProperty('SHEET_ID', ss.getId());
    getFolder_().addFile(DriveApp.getFileById(ss.getId()));
  }
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) {
    sh = ss.getSheets()[0].setName(CONFIG.SHEET_NAME);
    sh.appendRow(['เวลาบันทึก', 'ชื่อ-สกุล', 'ตำแหน่ง', 'วิทยฐานะ', 'กลุ่มสาระ', 'เรื่อง', 'สถานที่',
      'จังหวัด', 'ไปราชการวันที่', 'ถึงวันที่', 'จำนวนวัน', 'รวมคน', 'ลิงก์ PDF']);
    sh.setFrozenRows(1);
  }
  return sh;
}
