// Init.gs - 初始化與自訂選單
var BANKS = ['行口A','行口B','行口C'];

function Init_BANKS(){ return BANKS; }

function onOpen(){
  SpreadsheetApp.getUi().createMenu('對賬系統')
    .addItem('初始化/重建表結構','Init_buildAll')
    .addItem('產出本日對帳','Init_reportToday')
    .addItem('產出本週對帳','Init_reportWeek')
    .addItem('產出本月對帳','Init_reportMonth')
    .addItem('自訂區間報表','Init_reportCustom')
    .addItem('匯出本月CSV','Init_exportMonth')
    .addItem('封存本月','Init_closeMonth')
    .addItem('入口/Token 管理','Init_tokenManage')
    .addToUi();
}

function Init_buildAll(){
  var ss = SpreadsheetApp.getActive();
  BANKS.forEach(function(b){
    createSheet(ss, b + '_明細(原始)', ['日期','行口','品名(原始)','G台斤','J數量','單價','金額','門市/去向','批次','備註','建立時間','鎖定','RowKey','重複標記','提交來源']);
    createSheet(ss, b + '_明細(標準化)', ['日期','行口','品名(標準)','G台斤','J數量','單價','金額','門市/去向','批次','來源頁面','來源列ID','檢核結果','錯誤訊息']);
    createSheet(ss, b + '_對帳(日)', ['日期','總重量','總數量','總金額','每隻均價','規則違反','待補件']);
    createSheet(ss, b + '_對帳(月)', ['月份','總重量','總數量','總金額','每隻均價','規則違反','待補件']);
  });
  createSheet(ss,'品項主檔',['品名(原始)','品名(標準)','計價模式','預設單位','預設單價','啟用']);
  createSheet(ss,'品名對照表',['別名','對應品名(標準)']);
  createSheet(ss,'規則設定',['規則名稱','說明','參數']);
  createSheet(ss,'入口管理',['入口ID','行口','用途','Token值','有效期限','備註','是否啟用','速率限制']);
  createSheet(ss,'稽核日誌',['時間','入口ID/使用者線索','行口','動作','目標表單/列','舊值','新值','IP/UA','結果']);
  createSheet(ss,'合併報表(日)',['日期','行口','品名','G台斤','J數量','單價','金額']);
  createSheet(ss,'合併報表(月)',['月份','行口','品名','G台斤','J數量','單價','金額']);
  Init_seedDemoData();
  Init_buildTriggers();
}

function createSheet(ss,name,headers){
  var sh = ss.getSheetByName(name);
  if(!sh) sh = ss.insertSheet(name);
  sh.clear();
  if(headers) sh.getRange(1,1,1,headers.length).setValues([headers]);
}

function Init_seedDemoData(){
  var sh = SpreadsheetApp.getActive().getSheetByName('行口A_明細(原始)');
  if(sh) sh.appendRow(['2023-01-01','行口A','雞籠',0,1,0,0,'門市1','B001','示範',new Date(),false,'demo','', 'seed']);
}

function Init_buildTriggers(){
  ScriptApp.newTrigger('Backend_dailyLock').timeBased().atHour(23).nearMinute(59).everyDays(1).create();
  ScriptApp.newTrigger('Backend_monthlyRemind').timeBased().onMonthDay(1).atHour(0).nearMinute(10).everyMonths(1).create();
}

function Init_reportToday(){ /* stub */ }
function Init_reportWeek(){ /* stub */ }
function Init_reportMonth(){ /* stub */ }
function Init_reportCustom(){ /* stub */ }
function Init_exportMonth(){ /* stub */ }
function Init_closeMonth(){ /* stub */ }
function Init_tokenManage(){ /* stub */ }
