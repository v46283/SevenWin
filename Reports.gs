// Reports.gs - 報表與匯出

function Reports_build(info, start, end){
  var ss = SpreadsheetApp.getActive();
  var banks = info.scope === 'admin' && info.bank === 'ALL' ? Init_BANKS() : [info.bank];
  var result = {banks:banks, start:start, end:end, total:[]};
  banks.forEach(function(b){
    var sheet = ss.getSheetByName(b + '_明細(標準化)');
    if(!sheet) return;
    var data = sheet.getDataRange().getValues();
    var sumW=0,sumJ=0,sumAmt=0;
    var rows=[];
    for(var i=1;i<data.length;i++){
      var d=data[i];
      var dt=d[0];
      if(start && dt<start) continue;
      if(end && dt>end) continue;
      sumW+=Number(d[3]); sumJ+=Number(d[4]); sumAmt+=Number(d[6]);
      rows.push(d);
    }
    result.total.push({bank:b,weight:sumW,qty:sumJ,amount:sumAmt,rows:rows});
  });
  return result;
}

function Reports_csv(data){
  var lines=['日期,行口,品名,重量,數量,單價,金額,門市,批次'];
  data.total.forEach(function(t){
    t.rows.forEach(function(r){
      lines.push([r[0],t.bank,r[2],r[3],r[4],r[5],r[6],r[7],r[8]].join(','));
    });
  });
  return lines.join('\n');
}

function Reports_lineLink(token,start,end){
  var url = ScriptApp.getService().getUrl();
  return 'https://line.me/R/msg/text/?' + encodeURIComponent(url + '?token='+token+'&action=report&start='+start+'&end='+end);
}
