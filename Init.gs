// File: Init.gs
/**
 * 初始化與觸發器設定
 * 建立所有工作表、欄位、命名範圍與白名單
 * 試算表名稱：行口雲端對賬系統
 */

const BANKS = ['A','B','C'];
const RAW_SUFFIX = '_明細(原始)';
const STD_SUFFIX = '_明細(標準化)';
const REPORT_DAY = '_對帳(日)';
const REPORT_MONTH = '_對帳(月)';
const MASTER = {
  PRODUCT: '品項主檔',
  ALIAS: '品名對照表',
  WHITE: '白名單',
  RULE: '規則設定',
  AUDIT: '稽核日誌'
};

/** 建立全部結構 */
function buildAll(){
  const ss = SpreadsheetApp.getActive();
  ss.rename('行口雲端對賬系統');
  createMasters_(ss);
  BANKS.forEach(b=>{
    createRaw_(ss,b);
    createStd_(ss,b);
    createReportSheets_(ss,b);
  });
  createTriggers_();
}

/** 建立主檔 */
function createMasters_(ss){
  Object.values(MASTER).forEach(name=>{
    let sh = ss.getSheetByName(name);
    if(!sh) sh = ss.insertSheet(name);
    sh.clear();
  });
  ss.getSheetByName(MASTER.PRODUCT).getRange('A1:F1').setValues([
    ['品名(原始)','品名(標準)','計價模式','預設單位','預設單價','啟用']
  ]);
  ss.getSheetByName(MASTER.ALIAS).getRange('A1:B1').setValues([
    ['別名','對應品名(標準)']
  ]);
  ss.getSheetByName(MASTER.WHITE).getRange('A1:D1').setValues([
    ['Email','行口','是否管理者','是否允許填報']
  ]);
  ss.getSheetByName(MASTER.RULE).getRange('A1:C1').setValues([
    ['規則名稱','說明','參數']
  ]);
  ss.getSheetByName(MASTER.AUDIT).getRange('A1:H1').setValues([
    ['時間','使用者','行口','動作','目標表單/列','舊值','新值','IP/UA']
  ]);
}

/** 建立原始明細表 */
function createRaw_(ss,b){
  const name = b+RAW_SUFFIX;
  let sh = ss.getSheetByName(name);
  if(!sh) sh = ss.insertSheet(name);
  sh.clear();
  sh.getRange('A1:M1').setValues([
    ['日期','供應商/行口','品名(原始)','G台斤','J數量/籠或隻','單價','金額','門市/去向','批次','備註','建立者','建立時間','鎖定','RowKey','重複標記']
  ]);
  sh.getRange('B2:B').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([b],true).setAllowInvalid(false));
  sh.getRange('K2:K').setDataValidation(SpreadsheetApp.newDataValidation().requireTextIsEmail());
}

/** 建立標準化表 */
function createStd_(ss,b){
  const name = b+STD_SUFFIX;
  let sh = ss.getSheetByName(name);
  if(!sh) sh = ss.insertSheet(name);
  sh.clear();
  sh.getRange('A1:J1').setValues([
    ['日期','行口','品名(標準)','G台斤','J數量','單價','金額','門市/去向','批次','來源頁面','來源列ID','檢核結果','錯誤訊息']
  ]);
}

/** 建立報表頁 */
function createReportSheets_(ss,b){
  [REPORT_DAY,REPORT_MONTH].forEach(suffix=>{
    const name = b+suffix;
    if(!ss.getSheetByName(name)) ss.insertSheet(name);
  });
}

/** 建立觸發器 */
function createTriggers_(){
  // 刪除舊觸發器
  ScriptApp.getProjectTriggers().forEach(t=>ScriptApp.deleteTrigger(t));
  // 開啟自訂選單
  ScriptApp.newTrigger('onOpen').forSpreadsheet(SpreadsheetApp.getActive()).onOpen().create();
  // 每日 23:59 鎖定
  ScriptApp.newTrigger('dailyLock').timeBased().everyDays(1).atHour(23).nearMinute(59).create();
  // 每月封存提醒
  ScriptApp.newTrigger('monthlyReminder').timeBased().onMonthDay(1).atHour(0).nearMinute(10).create();
}

/** onOpen 自訂選單 */
function onOpen(){
  SpreadsheetApp.getUi().createMenu('對賬系統')
  .addItem('初始化/重建表結構','buildAll')
  .addItem('開啟填報頁','openWeb')
  .addItem('產出本日對帳','menuReportToday')
  .addItem('產出本週對帳','menuReportWeek')
  .addItem('產出本月對帳','menuReportMonth')
  .addItem('自訂區間報表','menuReportCustom')
  .addItem('匯出本月CSV','exportMonthCsv')
  .addItem('封存本月','archiveMonth')
  .addItem('管理白名單','menuWhitelist')
  .addToUi();
}

function openWeb(){
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(`<a href="${url}" target="_blank">開啟 Web App</a>`), '填報頁');
}

function menuReportToday(){
  const today = new Date();
  Reports.showReport(new Date(today.getFullYear(),today.getMonth(),today.getDate()));
}
function menuReportWeek(){
  const now = new Date();
  const start = new Date(now.getFullYear(),now.getMonth(),now.getDate()-now.getDay());
  const end = new Date(start); end.setDate(start.getDate()+6);
  Reports.showReport(start,end);
}
function menuReportMonth(){
  const now = new Date();
  const start = new Date(now.getFullYear(),now.getMonth(),1);
  const end = new Date(now.getFullYear(),now.getMonth()+1,0);
  Reports.showReport(start,end);
}
function menuReportCustom(){
  const html = HtmlService.createHtmlOutputFromFile('DateRange').setWidth(300).setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, '選擇日期區間');
}
function exportMonthCsv(){
  const now = new Date();
  const start = new Date(now.getFullYear(),now.getMonth(),1);
  const end = new Date(now.getFullYear(),now.getMonth()+1,0);
  Reports.exportCsv(start,end);
}
function archiveMonth(){
  const now = new Date();
  const monthStr = Utilities.formatDate(now,'Asia/Taipei','yyyy-MM');
  BANKS.forEach(b=>{
    const sh = SpreadsheetApp.getActive().getSheetByName(b+RAW_SUFFIX);
    const rg = sh.getRange('A2:A'+sh.getLastRow());
    const values = rg.getValues();
    values.forEach((r,i)=>{
      if(r[0] && r[0].toString().slice(0,7)===monthStr) sh.getRange(i+2,13).setValue(true);
    });
  });
}
function menuWhitelist(){
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('Whitelist')); }

/** 每日鎖定 */
function dailyLock(){
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const dStr = Utilities.formatDate(yesterday,'Asia/Taipei','yyyy-MM-dd');
  BANKS.forEach(b=>{
    const sh = SpreadsheetApp.getActive().getSheetByName(b+RAW_SUFFIX);
    const rng = sh.getRange('A2:A'+sh.getLastRow()).getValues();
    rng.forEach((r,i)=>{ if(r[0]===dStr) sh.getRange(i+2,13).setValue(true); });
  });
}

function monthlyReminder(){
  MailApp.sendEmail(Session.getActiveUser().getEmail(),'上月資料已封存','請確認上月資料並封存。');
}

/** demo 資料 */
function seedDemoData(){
  const ss = SpreadsheetApp.getActive();
  const today = new Date();
  BANKS.forEach((b,idx)=>{
    const sh = ss.getSheetByName(b+RAW_SUFFIX);
    for(let i=0;i<3;i++){
      const d = new Date(today.getFullYear(),today.getMonth(),today.getDate()-i);
      const dateStr = Utilities.formatDate(d,'Asia/Taipei','yyyy-MM-dd');
      const row=[dateStr,b,'雞籠',0,1,100,100,'總店','B'+i,'demo',Session.getActiveUser().getEmail(),new Date(),false,'',''];
      sh.appendRow(row);
    }
  });
}
