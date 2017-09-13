var Promise = require('bluebird');

var fs = require('fs');
var parse = require('csv-parse');

var paidTxFile = './input/0913/export-0x8668ef4534ec8716dede42807084a526ff4904e2.csv';
var imtokenIcoFile = './input/imtoken_tx.csv'
var icoFile = './input/ICO_Issue_events.csv';

var parseCsvFile = async function(fileName, lineParseFunc) {
  var data = fs.readFileSync(fileName, 'utf8');
  var res = [];

  await parse(data, {comment: '#'}, function(err, output){
    for (var i = 0; i < output.length; i ++) {
      var lineRes = lineParseFunc(output[i]);
      if (lineRes) {
        res.push(lineRes);
      }
    }
  });

  return res;
};

function parsePaidTx(lineArr) {
  try {
    if (lineArr[5].substring(0, 2) == '0x') {
      var txhash = lineArr[0].toLowerCase();
      var paidAddress = lineArr[5].toLowerCase();
      var paidAmount = Number(lineArr[8]);

      return [paidAddress, paidAmount];
    }
  } catch (err) {
    console.log("parse error:", err);
  }
};

function parseICOFileLine(lineArr) {
  if(lineArr.length != 7) throw new Error("line lenght != 7 , line: " + lineArr);
  var userAddr = lineArr[1].toLowerCase();
  var txHash = lineArr[2].toLowerCase();
  return [txHash, userAddr];
}

function parseImtokenTx(lineArr) {
  var txHash = lineArr[1];
  var ethAmount = Number(lineArr[3]);
  return [txHash, ethAmount];
}

function genPaidAddrEthMap(paidTxArr) {
  var resMap = new Map();
  for (var i = 0; i < paidTxArr.length; i++) {
    var addr = paidTxArr[i][0];
    var eth =  paidTxArr[i][1];
    if (resMap.has(addr)) {
      var total = resMap.get(addr);
      total += eth;
      resMap.set(addr, total);
    } else {
      resMap.set(addr, eth);
    }
  }

  return resMap;
}

function genIcoTxAddrMap(icoTxArr) {
  var resMap = new Map();
  for (var i = 0; i < icoTxArr.length; i++) {
    var hash = icoTxArr[i][0];
    var addr = icoTxArr[i][1];
    if (resMap.has(hash)) {
      throw new Error("duplicated txHash in icoTx file.");
    }
    resMap.set(hash, addr);
  }
  return resMap;
}

function getImtokenAddrEthMap(icoTxAddrMap, imtokenTxArr) {
  var resMap = new Map();
  var txhashSet = new Set();

  for (var i = 0; i < imtokenTxArr.length; i++) {
    var txHash = imtokenTxArr[i][0];
    var ethAmount = imtokenTxArr[i][1];

    if (txhashSet.has(txHash)) {
      throw new Error("duplicate txHash in imtoken tx file. exit.");
    }
    txhashSet.add(txHash);
    var addr = icoTxAddrMap.get(txHash);

    if (resMap.has(addr)) {
      var ethTotal = resMap.get(addr);
      ethTotal += ethAmount;
      resMap.set(addr, ethTotal);
    } else {
      resMap.set(addr, ethAmount);
    }
  }

  return resMap;
}

function getImtokenRefundMap(paidAddrEthMap, imtokenAddrEthMap) {
  var resMap = new Map();
  for (let addr of paidAddrEthMap.keys()) {
    // if ('0x6766a680e4ec0791b2652ad0ca44176c3c5f8794' === addr) {
    //   console.log("xxxxxxxxx");
    // }

    if (imtokenAddrEthMap.has(addr)) {
      // if ('0x6766a680e4ec0791b2652ad0ca44176c3c5f8794' === addr) {
      //   console.log("xxxxxxxxx2222222222");
      // }

      var paidEth = paidAddrEthMap.get(addr);
      var imtokenEth = imtokenAddrEthMap.get(addr);
      var ethVal = 0;
      if (paidEth >= imtokenEth) {
        ethVal = imtokenEth;
      } else {
        ethVal = paidEth;
      }

      resMap.set(addr, ethVal);
    }
  }
  return resMap;
}

function writeMapToCSVFile(resMap, resFile) {
  var keys = [...resMap.keys()];
  var sortedKeys = keys.sort();
  var content = "";
  sortedKeys.forEach((key) => {
    var value = resMap.get(key);
    content += '"' + key + '","' + value + '"\n';
  });
  fs.writeFileSync(resFile, content);
}

async function main() {
  var [paidTxArr, imtokenTxArr, icoTxArr] = await Promise.all([
    parseCsvFile(paidTxFile, parsePaidTx),
    parseCsvFile(imtokenIcoFile, parseImtokenTx),
    parseCsvFile(icoFile, parseICOFileLine)
  ]);

  //console.log(paidTxArr.length, imTokenTxArr.length, icoTxArr.length);

  var icoTxAddrMap = genIcoTxAddrMap(icoTxArr);
  var imtokenAddrEthMap = getImtokenAddrEthMap(icoTxAddrMap, imtokenTxArr);
  var paidAddrEthMap = genPaidAddrEthMap(paidTxArr);

  var imtokenRefundMap = getImtokenRefundMap(paidAddrEthMap, imtokenAddrEthMap);

  var paidTotal = [...paidAddrEthMap.values()].reduce((a, b) => a + b, 0);
  var imtokenTotal = [...imtokenAddrEthMap.values()].reduce((a, b) => a + b, 0);
  var imtokenRefundTotal = [...imtokenRefundMap.values()].reduce((a, b) => a + b, 0);

  console.log("paidTotal:", paidTotal);
  console.log("imtokenTotal", imtokenTotal);
  console.log("imtokenRefundTotal:", imtokenRefundTotal);

  writeMapToCSVFile(imtokenRefundMap, "./output/imtoken-refund-0912.csv");
}

main();
