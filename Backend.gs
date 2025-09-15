// File: Backend.gs
/**
 * 主要後端邏輯：白名單、登入判定、寫入 API
 */

/** 取得目前使用者資訊 */
function getUserContext(){
  const email = Session.getActiveUser().getEmail();
  const sheet = SpreadsheetApp.getActive().getSheetByName(MASTER.WHITE);
  const data = sheet.getDataRange().getValues();
  let ctx = {email:email,bank:null,isAdmin:false,canSubmit:false};
  for(let i=1;i<data.length;i++){
    if(data[i][0]===email){
      ctx.bank = data[i][1];
      ctx.isAdmin = data[i][2]===true;
      ctx.canSubmit = data[i][3]!==false;
      break;
    }
  }
  return ctx;
}

/** 清洗輸入值 */
function cleanNumber(v){
  if(typeof v==='number') return v;
  if(!v) return 0;
  return Number(String(v).replace(/[台斤隻元\s]/g,'').trim())||0;
}
function cleanText(v){
  return String(v||'').replace(/[\s\u3000]/g,'').trim();
}

/** 計算 RowKey */
function buildRowKey(bank,date,product,price,g,j,batch){
  const raw = bank+date+product+price+g+j+batch;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1,raw);
  return digest.map(b=>("0"+((b+256)%256).toString(16)).slice(-2)).join('');
}

/** 寫入原始明細 */
function submitRaw(record){
  const ctx = getUserContext();
  if(!ctx.bank || (!ctx.isAdmin && ctx.bank!==record.bank)) throw new Error('非白名單或無權限');
  if(!ctx.canSubmit) throw new Error('此帳號不允許填報');
  record.bank = ctx.bank; // 強制鎖定行口
  // 鎖定檢查
  if(Rules.isLocked(record.bank,record.date)) throw new Error('日期已鎖定，不可新增');
  // 清洗
  record.g = cleanNumber(record.g);
  record.j = cleanNumber(record.j);
  record.price = cleanNumber(record.price);
  record.amount = record.price * (Rules.priceMode(record.product)==='重量'?record.g:record.j);
  record.product = cleanText(record.product);
  record.batch = cleanText(record.batch);
  record.date = Utilities.formatDate(new Date(record.date),'Asia/Taipei','yyyy-MM-dd');
  // RowKey
  const rowKey = buildRowKey(record.bank,record.date,record.product,record.price,record.g,record.j,record.batch);
  record.rowKey = rowKey;
  // 重複檢查
  const sh = SpreadsheetApp.getActive().getSheetByName(record.bank+RAW_SUFFIX);
  const rows = sh.getDataRange().getValues();
  for(let i=1;i<rows.length;i++){
    if(rows[i][13]===rowKey){
      if(rows[i][0]==record.date && rows[i][2]==record.product && rows[i][5]==record.price && rows[i][3]==record.g && rows[i][4]==record.j && rows[i][8]==record.batch){
        return {status:'DUPLICATE',message:'已存在相同資料，請勿重複送出'};
      }else{
        return {status:'CONFLICT',message:'同筆指紋資料不一致，請確認批次或數值'};
      }
    }
  }
  // 同日同品名同批次
  for(let i=1;i<rows.length;i++){
    if(rows[i][0]==record.date && rows[i][2]==record.product && rows[i][8]==record.batch){
      return {status:'CONFLICT',message:'同日同品名同批次僅能一筆'};
    }
  }
  // 規則檢核
  const rule = Rules.checkDaily(record.bank,record.date,record.product);
  if(!rule.pass) return {status:'FAIL',message:rule.message};
  // 寫入
  const now = new Date();
  sh.appendRow([
    record.date,record.bank,record.product,record.g,record.j,record.price,record.amount,record.store,record.batch,record.note,ctx.email,now,false,rowKey,'OK'
  ]);
  // 標準化
  Rules.standardize(record.bank,sh.getLastRow());
  // 稽核
  logAudit(ctx.email,record.bank,'新增',sh.getName()+"#"+sh.getLastRow(),'',JSON.stringify(record));
  return {status:'PASS'};
}

/** 讀取填報建議 */
function loadMeta(){
  const ss=SpreadsheetApp.getActive();
  const prod=ss.getSheetByName(MASTER.PRODUCT).getRange('A2:C').getValues().filter(r=>r[0]);
  const alias=ss.getSheetByName(MASTER.ALIAS).getDataRange().getValues().filter(r=>r[0]);
  return {products:prod,alias:alias};
}

/** 稽核日誌 */
function logAudit(user,bank,act,target,oldV,newV){
  const sh = SpreadsheetApp.getActive().getSheetByName(MASTER.AUDIT);
  sh.appendRow([new Date(),user,bank,act,target,oldV,newV,Session.getActiveUser().getEmail()]);
}
