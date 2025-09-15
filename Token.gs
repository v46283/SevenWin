// Token.gs - 入口與 Token 管理
var TOKEN_SECRET = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');

function Token_generate(entryId, bank, scope, validDays){
  var payload = {
    id: entryId,
    bank: bank,
    scope: scope,
    exp: Date.now() + (validDays||1)*24*3600*1000,
    salt: Utilities.getUuid()
  };
  var payloadStr = JSON.stringify(payload);
  var sigBytes = Utilities.computeHmacSha256Signature(payloadStr, TOKEN_SECRET);
  var sig = Utilities.base64Encode(sigBytes);
  return Utilities.base64Encode(payloadStr) + '.' + sig;
}

function Token_verify(token){
  try{
    var parts = token.split('.');
    var payloadStr = Utilities.newBlob(Utilities.base64Decode(parts[0])).getDataAsString();
    var sig = parts[1];
    var sig2 = Utilities.base64Encode(Utilities.computeHmacSha256Signature(payloadStr, TOKEN_SECRET));
    if(sig !== sig2) return null;
    var payload = JSON.parse(payloadStr);
    if(Date.now() > payload.exp) return null;
    if(!Token_isEntryEnabled(payload.id)) return null;
    if(!Token_checkRate(payload.id)) return null;
    return payload;
  }catch(err){
    return null;
  }
}

function Token_isEntryEnabled(entryId){
  var sheet = SpreadsheetApp.getActive().getSheetByName('入口管理');
  if(!sheet) return false;
  var data = sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] == entryId){
      return data[i][6] === true || data[i][6] === 'TRUE'; // 是否啟用
    }
  }
  return false;
}

function Token_checkRate(entryId){
  var sheet = SpreadsheetApp.getActive().getSheetByName('入口管理');
  if(!sheet) return true;
  var data = sheet.getDataRange().getValues();
  var limit = 60; // default
  for(var i=1;i<data.length;i++){
    if(data[i][0] == entryId){
      limit = Number(data[i][7]) || limit;
      break;
    }
  }
  var cache = CacheService.getScriptCache();
  var key = 'rate:' + entryId;
  var count = Number(cache.get(key)) || 0;
  if(count > limit) return false;
  cache.put(key, String(count+1), 60); // 1 minute
  return true;
}

function Token_scopeText(scope){
  if(scope === 'upload') return '上傳入口';
  if(scope === 'query') return '查詢入口';
  if(scope === 'admin') return '管理者入口';
  return '未知入口';
}

function Token_rotate(entryId, bank, scope, validDays){
  return Token_generate(entryId, bank, scope, validDays);
}
