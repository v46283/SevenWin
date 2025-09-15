// File: Reports.gs
/**
 * 報表與匯出
 */

function showReport(start,end){
  const ctx=getUserContext();
  const html = HtmlService.createHtmlOutput(generateReportTable_(ctx,start,end));
  SpreadsheetApp.getUi().showModalDialog(html,'報表');
}

function generateReportTable_(ctx,start,end){
  const ss=SpreadsheetApp.getActive();
  let banks=ctx.isAdmin?BANKS:[ctx.bank];
  let rows=[];
  banks.forEach(b=>{
    const sh=ss.getSheetByName(b+STD_SUFFIX);
    const data=sh.getDataRange().getValues();
    for(let i=1;i<data.length;i++){
      const d=new Date(data[i][0]);
      if(!isNaN(d)&&d>=start&&d<=end) rows.push(data[i]);
    }
  });
  let totalW=0,totalJ=0,totalAmt=0;
  rows.forEach(r=>{ totalW+=r[3]; totalJ+=r[4]; totalAmt+=r[6]; });
  let html='<table border="1" cellspacing="0" cellpadding="5"><tr><th>日期</th><th>行口</th><th>品名</th><th>台斤</th><th>隻/籠</th><th>單價</th><th>金額</th><th>門市</th><th>批次</th></tr>';
  rows.forEach(r=>{html+=`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td><td>${r[8]}</td></tr>`;});
  html+=`<tr><th colspan="3">合計</th><th>${totalW}</th><th>${totalJ}</th><th></th><th>${totalAmt}</th><th></th><th></th></tr></table>`;
  return html;
}

/** 匯出 CSV */
function exportCsv(start,end){
  const ctx=getUserContext();
  let banks=ctx.isAdmin?BANKS:[ctx.bank];
  const ss=SpreadsheetApp.getActive();
  let csv=['日期,行口,品名,台斤,隻數,單價,金額,門市,批次'];
  banks.forEach(b=>{
    const sh=ss.getSheetByName(b+STD_SUFFIX);
    const data=sh.getDataRange().getValues();
    for(let i=1;i<data.length;i++){
      const d=new Date(data[i][0]);
      if(d>=start&&d<=end) csv.push(data[i].slice(0,9).join(','));
    }
  });
  const file=Utilities.newBlob(csv.join('\n'),'text/csv', 'report.csv');
  const url=DriveApp.createFile(file).getDownloadUrl();
  SpreadsheetApp.getUi().alert('下載連結：'+url);
}

