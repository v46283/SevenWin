// Backend.gs - 上傳 API、查重與寫入

function doGet(e){
  var token = e.parameter.token;
  var action = e.parameter.action;
  var info = Token_verify(token);
  if(!info) return json({error:'token 無效'});
  if(action === 'tokenInfo'){
    return json({bank:info.bank,scope:info.scope,entryId:info.id,scopeText:Token_scopeText(info.scope)});
  }
  if(action === 'report'){
    if(info.scope !== 'query' && info.scope !== 'admin') return json({error:'無查詢權限'});
    var start = e.parameter.start; var end = e.parameter.end;
    var data = Reports_build(info, start, end);
    return json(data);
  }
  return json({error:'未知動作'});
}

function doPost(e){
  var token = e.parameter.token;
  var action = e.parameter.action;
  var info = Token_verify(token);
  if(!info) return json({error:'token 無效'});
  var body = e.postData.contents ? JSON.parse(e.postData.contents) : {};
  if(action === 'upload'){
    if(info.scope !== 'upload') return json({error:'無上傳權限'});
    var res = Backend_handleUpload(info, body);
    return json(res);
  }
  if(action === 'check'){
    if(info.scope !== 'upload') return json({error:'無上傳權限'});
    return json(Backend_checkDuplicate(info, body));
  }
  if(action === 'closeMonth'){
    if(info.scope !== 'admin') return json({error:'無管理權限'});
    return json({status:'OK',message:'已送出封存指示'});
  }
  return json({error:'未知動作'});
}

function Backend_handleUpload(info, data){
  var bank = info.bank;
  var sheet = SpreadsheetApp.getActive().getSheetByName(bank + '_明細(原始)');
  if(!sheet) return {status:'FAIL',message:'找不到工作表'};
  var date = data.date;
  var itemRaw = Backend_clean(data.item);
  var g = Number(Backend_clean(data.weight));
  var j = Number(Backend_clean(data.qty));
  var price = Number(Backend_clean(data.price));
  var dest = Backend_clean(data.dest);
  var batch = Backend_clean(data.batch);
  var note = Backend_clean(data.note);
  var itemStd = Rules_standardName(itemRaw);
  var mode = Rules_getPricingMode(itemStd);
  var amount = Rules_calcAmount(mode, price, g, j);
  var rowKey = Backend_rowKey(bank,date,itemRaw,price,g,j,batch);
  var dup = Backend_findRow(sheet, rowKey);
  if(dup){
    var same = Backend_rowEquals(dup, [date,bank,itemRaw,g,j,price,amount,dest,batch,note]);
    return same ? {status:'DUPLICATE',message:'已重複'} : {status:'CONFLICT',message:'資料不一致'};
  }
  var hard = Rules_checkHard(bank,date,itemStd,batch);
  if(!hard.pass) return Rules_error(hard.msg);
  var row = [date, bank, itemRaw, g, j, price, amount, dest, batch, note, new Date(), false, rowKey, '', info.id];
  sheet.appendRow(row);
  Backend_writeStandard(bank,{date:date,itemStd:itemStd,g:g,j:j,price:price,amount:amount,dest:dest,batch:batch,sourceRow:sheet.getLastRow()});
  Backend_log(info,'upload',sheet.getName(),row);
  return {status:'OK',message:'已寫入',rowId:sheet.getLastRow()};
}

function Backend_checkDuplicate(info, data){
  var sheet = SpreadsheetApp.getActive().getSheetByName(info.bank + '_明細(原始)');
  var rowKey = Backend_rowKey(info.bank,data.date,data.item,data.price,data.weight,data.qty,data.batch);
  var dup = Backend_findRow(sheet, rowKey);
  if(dup) return {duplicate:true,message:'已存在資料'};
  return {duplicate:false,message:'無重複'};
}

function Backend_clean(v){
  if(typeof v !== 'string') return v;
  v = v.replace(/[台斤隻元\s]/g,'');
  return v.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s){return String.fromCharCode(s.charCodeAt(0)-0xFEE0);});
}

function Backend_rowKey(bank,date,item,price,g,j,batch){
  var str = bank + '|' + date + '|' + item + '|' + price + '|' + g + '|' + j + '|' + batch;
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, str);
  return hash.map(function(b){return ('0'+(b&0xFF).toString(16)).slice(-2);}).join('');
}

function Backend_findRow(sheet, rowKey){
  var data = sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][12] === rowKey) return data[i];
  }
  return null;
}

function Backend_rowEquals(row, arr){
  for(var i=0;i<arr.length;i++){
    if(row[i] != arr[i]) return false;
  }
  return true;
}

function Backend_writeStandard(bank,obj){
  var sheet = SpreadsheetApp.getActive().getSheetByName(bank + '_明細(標準化)');
  if(!sheet) return;
  var res = [obj.date, bank, obj.itemStd, obj.g, obj.j, obj.price, obj.amount, obj.dest, obj.batch, bank+'_明細(原始)', obj.sourceRow, 'PASS', ''];
  sheet.appendRow(res);
}

function Backend_log(info,action,target,row){
  var sheet = SpreadsheetApp.getActive().getSheetByName('稽核日誌');
  if(!sheet) return;
  var entry = [new Date(), info.id, info.bank, action, target, '', JSON.stringify(row), Session.getActiveUser().getEmail(), ''];
  sheet.appendRow(entry);
}

function json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function Backend_dailyLock(){ /* 每日鎖定 stub */ }
function Backend_monthlyRemind(){ /* 月結提醒 stub */ }
