// Rules.gs - 品名對照與檢核規則
var SHEET_MASTER = '品項主檔';
var SHEET_ALIAS = '品名對照表';
var SHEET_RULES = '規則設定';

function Rules_standardName(raw){
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ALIAS);
  if(!sheet) return raw;
  var data = sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] === raw) return data[i][1];
  }
  return raw;
}

function Rules_getPricingMode(item){
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MASTER);
  if(!sheet) return 'weight';
  var data = sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] === item || data[i][1] === item){
      return data[i][2]; // 計價模式
    }
  }
  return 'weight';
}

function Rules_calcAmount(mode, price, g, j){
  if(mode === 'perPiece') return price * j;
  return price * g;
}

function Rules_checkHard(bank, date, item, batch){
  var sheet = SpreadsheetApp.getActive().getSheetByName(bank + '_明細(標準化)');
  if(!sheet) return {pass:true};
  var data = sheet.getDataRange().getValues();
  var cageCount=0, cgCount=0, cmCount=0;
  for(var i=1;i<data.length;i++){
    if(data[i][0] !== date) continue;
    if(data[i][2] === '雞籠') cageCount++;
    if(data[i][2] === '中公(180)') cgCount++;
    if(data[i][2] === '中母(150)') cmCount++;
    if(data[i][2] === item && data[i][8] === batch) return {pass:false,msg:'同日同批次僅能一筆'};
  }
  if(item === '雞籠' && cageCount >= 1) return {pass:false,msg:'雞籠每日必 1 筆，已有紀錄'};
  if(item === '中公(180)' && cgCount >= 1) return {pass:false,msg:'中公(180) 每日至多 1 筆'};
  if(item === '中母(150)' && cmCount >= 1) return {pass:false,msg:'中母(150) 每日至多 1 筆'};
  return {pass:true};
}

function Rules_error(msg){
  return {status:'FAIL',message:msg};
}
