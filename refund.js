var request = require('sync-request');
var cheerio = require('cheerio');
var Promise = require('bluebird');

var fs = require('fs');
var parse = require('csv-parse');
var assert = require('assert');

var icoFile = './input/ICO_Issue_events.csv';
var overPaidFile = './input/resFile0911-amend-more.txt';

var paidTxFile = './input/export-0x8668ef4534ec8716dede42807084a526ff4904e2.csv';
var refundFile = './input/export-token-0xEF68e7C694F40c8202821eDF525dE3782458639f-0909.csv'

var paidTxFile0910 = './input/export-0x8668ef4534ec8716dede42807084a526ff4904e2-0910.csv';
var refundFile0910 = './input/export-token-0xEF68e7C694F40c8202821eDF525dE3782458639f-0910.csv'

var paidTxFile0911 = './input/export-0x8668ef4534ec8716dede42807084a526ff4904e2-0911.csv';
var refundFile0911 = './input/export-token-0xEF68e7C694F40c8202821eDF525dE3782458639f-0911.csv'

var paidTxFile0912 = './input/0912/export-0x8668ef4534ec8716dede42807084a526ff4904e2.csv';
var refundFile0912 = './input/0912/export-token-0xEF68e7C694F40c8202821eDF525dE3782458639f-0912.csv'

var ethPaidAll = {};
var allIcoAddresses = [];
var icoDataAll = {};
var ethPayCapMap = {};
var refundAmountMap = {};
var refundAddresses = [];
var overPaidMap = new Map();

var parseCsvFile = async function(fileName, lineParseFunc) {
  var data = fs.readFileSync(fileName, 'utf8');
  //console.log("data:", data);
  await parse(data, {comment: '#'}, function(err, output){
    //console.log(fileName + " output len:", output.length);
    for (var i = 0; i < output.length; i ++) {
      lineParseFunc(output[i]);
    }
  });
};

var parsePaidTx = function(lineArr) {
  try {
    if (lineArr[5].substring(0, 2) == '0x') {
      var paidAddress = lineArr[5].toLowerCase();
      var paidAmount = Number(lineArr[8]);

      if (ethPaidAll[paidAddress]) {
        ethPaidAll[paidAddress] += paidAmount;
      } else {
        ethPaidAll[paidAddress] = paidAmount;
      }
    }
  } catch (err) {
    console.log("parse error:", err);
  }
};

var parseOverpaidFile = function(lineArr) {
  var amount = Number(lineArr[1]);
  if (amount) {
    overPaidMap.set(lineArr[0], amount);
  }
}

var parseICOFileLine = function(lineArr) {
  if(lineArr.length != 7) throw new Error("line lenght != 7 , line: " + lineArr);
  var userAddr = lineArr[1].toLowerCase();

  if (lineArr[6] && lineArr[6].trim().length > 0) {
    return;
  }

  if (userAddr.substring(0, 2) == '0x') {
    if (allIcoAddresses.indexOf(userAddr) < 0) {
      allIcoAddresses.push(userAddr);
    }

    var txInfo = {};
    txInfo.ethAmount = Number(lineArr[3]);
    txInfo.lrcAmount = Number(lineArr[4]);
    txInfo.price = Number(lineArr[5]);
    txInfo.channel = lineArr[6];

    //console.log(txInfo);
    if (icoDataAll[userAddr]) {
      ethPayCapMap[userAddr] += txInfo.ethAmount;
      icoDataAll[userAddr].push(txInfo);
    } else {
      icoDataAll[userAddr] = [txInfo];
      ethPayCapMap[userAddr] = txInfo.ethAmount;
    }
  }
}

function sortByPriceDesc(x, y) {
  var priceX = x['lrcAmount']/x['ethAmount'];
  var priceY = y['lrcAmount']/y['ethAmount'];

  if ( priceX > priceY) {
    return -1;
  } else {
    return 1;
  }
}

function sortIcoDataAll() {
  for (var i = 0; i < allIcoAddresses.length; i++) {
    var addr = allIcoAddresses[i];
    if (icoDataAll[addr]) {
      if (icoDataAll[addr].length > 1) {
        icoDataAll[addr] = icoDataAll[addr].concat().sort(sortByPriceDesc);
        //console.log(icoDataAll[addr]);
      }
    } else {
      console.log("address: " + addr + " not found in icoDataAll.");
    }
  }
}

var printTxForChannel = function(channel) {

}

var parseRefundLineArr = function(lineArr) {
  var from = lineArr[4].toLowerCase();
  var amount = Number(lineArr[6]);
  if (from.substring(0, 2) == '0x') {
    if (refundAmountMap[from]) {
      refundAmountMap[from] += amount;
    } else {
      refundAmountMap[from] = amount;
      refundAddresses.push(from);
    }
  }
}

var caculateEthAmountForRefundUser = function(addr, lrcAmount) {
  var _lrcAmount = lrcAmount;
  var buyTxArr = icoDataAll[addr];
  var ethAmountToPay = 0;

  if (buyTxArr) {
    //console.log("buyTxArr:", buyTxArr);
    for (var i = 0; i < buyTxArr.length; i++) {
      var txInfo = buyTxArr[i];

      if (_lrcAmount >= txInfo.lrcAmount) {
        ethAmountToPay += txInfo.ethAmount;
        _lrcAmount -= txInfo.lrcAmount;
      } else {
        var price = txInfo['lrcAmount']/txInfo['ethAmount'];
        var _eth = _lrcAmount/price;
        ethAmountToPay += _eth;
        break;
      }
    }
  } else {
    console.log("address not found in ico tx.", addr);
  }

  var ethCap = ethPayCapMap[addr];
  if (ethCap && (ethCap + 0.0001) < ethAmountToPay) {
    console.log("WARNING: ethAmountToPay > Gap, Gap:", ethCap, "; ethAmountToPay:", ethAmountToPay);
    ethAmountToPay = ethCap;
  }

  var ethAmountPaid = ethPaidAll[addr];
  if (ethAmountPaid && ethAmountPaid > 0) {
    ethAmountToPay -= ethAmountPaid;
  }

  var ethAmountOverPaid = overPaidMap[addr];
  if (ethAmountOverPaid) {
    console.log("XXXXXXXXXX: over paid account found: " + addr + ", amount over paid:" + ethAmountOverPaid);
    console.log("amount to pay: ", ethAmountToPay);
    ethAmountToPay -= ethAmountOverPaid;
  }

  if (ethAmountToPay <= 0.01) {
    ethAmountToPay = 0;
  }

  ethAmountToPay = Math.floor(ethAmountToPay*100)/100;

  return ethAmountToPay;
}

var getRefundEthAmountMap = function() {
  var res = new Map();
  for (var i = 0; i < refundAddresses.length; i++) {
    var addr = refundAddresses[i];
    var lrcAmount = refundAmountMap[addr];
    var ethWeiAmount = caculateEthAmountForRefundUser(addr, lrcAmount);

    if (ethWeiAmount) {
      res.set(addr, ethWeiAmount);
    }
  }

  console.log("res size: ", res.size);
  return res;
}

function printParamsToFile(resultMap) {
  var resFile = "./output/resFile0912.txt"
  fs.writeFileSync(resFile, "");

  var addressesSorted = [...resultMap.keys()].sort();

  var fileContent = "";
  for (var i = 0; i < addressesSorted.length; i++) {
    var addr = addressesSorted[i];
    var ethAmount = resultMap.get(addr);
    var line = '"' + addr + '":' + ethAmountToWei(ethAmount);
    fileContent += line + "\n";
  }
  fs.writeFileSync(resFile, fileContent);

  var batchEthAmount = 0;
  var batchSize = Math.ceil(addressesSorted.length/100);
  var paramsFile = "./output/paramsFile0912.txt";
  fs.writeFileSync(paramsFile, "");
  for (var i = 0; i < batchSize; i ++) {
    var end = 100*(i+1);
    if (i == batchSize - 1) {
      end = addressesSorted.length;
    }
    var addrs = addressesSorted.slice(100*i, end);
    var amounts = getAmountSlice(addrs, resultMap);

    var addrSliceStr = addrSliceToParamStr(addrs);
    var amountSliceStr = amountSliceToParamStr(amounts);
    fs.appendFileSync(paramsFile, addrSliceStr + "\n\n");
    fs.appendFileSync(paramsFile, amountSliceStr + "\n\n");

    var batchEthAmount = amounts.reduce((a, b) => a+b, 0);
    fs.appendFileSync(paramsFile, "batch ethAmount total:" + batchEthAmount + "ETH\n\n\n");
  }
}

function getAmountSlice(addrSlice, resultMap) {
  var res = [];
  for (let addr of addrSlice) {
    res.push(resultMap.get(addr));
  }
  return res;
}

function addrSliceToParamStr(addrSlice) {
  var res = "[";
  for (let addr of addrSlice) {
    res += '"' + addr + '",'
  }
  res = res.substring(0, res.length - 1);
  res += "]";
  return res;
}

function amountSliceToParamStr(amountSlice) {
  var res = "[";
  for(let amount of amountSlice) {
    res += ethAmountToWei(amount) + ","
  }
  res = res.substring(0, res.length - 1);
  res += "]";
  return res;
}

function ethAmountToWei(amount) {
  var amount100 = Math.floor(amount * 100);
  return amount100 + "0000000000000000";
}

async function main() {
  await Promise.all([
    parseCsvFile(paidTxFile0912, parsePaidTx),
    parseCsvFile(icoFile, parseICOFileLine),
    parseCsvFile(refundFile0912, parseRefundLineArr),
    //parseCsvFile(overPaidFile, parseOverpaidFile)
  ]);

  // let values = [...overPaidMap.values()];
  // var sum = values.reduce((x, y) => x + y, 0);
  // console.log('sum:', sum);

  sortIcoDataAll();

  var ethToPayMap = getRefundEthAmountMap();
  printParamsToFile(ethToPayMap);
}

main();
