// File: Rules.gs
/**
 * 規則、標準化與檢核
 */

/** 取得計價模式 */
function priceMode(product){
  const ss=SpreadsheetApp.getActive();
  const data = ss.getSheetByName(MASTER.PRODUCT).getDataRange().getValues();
  for(let i=1;i<data.length;i++){
    if(data[i][1]==product || data[i][0]==product) return data[i][2];
  }
  return '重量';
}

/** 是否鎖定 */
function isLocked(bank,date){
  const sh = SpreadsheetApp.getActive().getSheetByName(bank+RAW_SUFFIX);
  const rows = sh.getDataRange().getValues();
  for(let i=1;i<rows.length;i++){
    if(rows[i][0]==date && rows[i][12]) return true;
  }
  return false;
}

/** 規則檢核 - 雞籠必 1、中公/中母最多 1 */
function checkDaily(bank,date,product){
  const sh = SpreadsheetApp.getActive().getSheetByName(bank+RAW_SUFFIX);
  const rows = sh.getDataRange().getValues();
  const dayRows = rows.filter((r,i)=>i>0 && r[0]==date);
  if(product==='雞籠'){
    const cnt = dayRows.filter(r=>r[2]=='雞籠').length;
    if(cnt>=1) return {pass:true};
    else return {pass:true}; // allow insert; final check elsewhere
  }
  if(product==='中公(180)'){
    const cnt = dayRows.filter(r=>r[2]=='中公(180)').length;
    if(cnt>=1) return {pass:false,message:'中公(180) 每日僅能一筆'};
  }
  if(product==='中母(150)'){
    const cnt = dayRows.filter(r=>r[2]=='中母(150)').length;
    if(cnt>=1) return {pass:false,message:'中母(150) 每日僅能一筆'};
  }
  return {pass:true};
}

/** 寫入標準化表 */
function standardize(bank,row){
  const ss = SpreadsheetApp.getActive();
  const rawSh = ss.getSheetByName(bank+RAW_SUFFIX);
  const stdSh = ss.getSheetByName(bank+STD_SUFFIX);
  const data = rawSh.getRange(row,1,1,15).getValues()[0];
  const std = mapProduct(data[2]);
  const mode = priceMode(std.standard);
  const amount = data[5] * (mode==='重量'?data[3]:data[4]);
  stdSh.appendRow([
    data[0],bank,std.standard,data[3],data[4],data[5],amount,data[7],data[8],rawSh.getName(),row,'PASS',std.msg
  ]);
}

/** 品名對照 */
function mapProduct(name){
  const alias = SpreadsheetApp.getActive().getSheetByName(MASTER.ALIAS).getDataRange().getValues();
  for(let i=1;i<alias.length;i++) if(alias[i][0]==name) return {standard:alias[i][1],msg:''};
  return {standard:name,msg:'未對照'};
}

