var fs = require('fs');
var utils = require('./utils.js');
var printUtils = require('./printutils.js');
var lrcAmountArr = require('./input/json/ico365UserLrc.json');
var userPriceArr = require('./input/json/ico365UserPrice.json');

function parseRefundFileLine(line) {
  var lineArr = line.split(',');
  var email = lineArr[1].trim();
  var addr = lineArr[4].trim().toLowerCase();
  var addr2 = lineArr[3].trim().toLowerCase();
  var lrcAmount = Number(lineArr[5]) || 0;
  var lrcAmount2 = Number(lineArr[4]) || 0;

  //console.log("addr:", addr);
  if (email) {
    if (addr.substring(0,2) == '0x') {
      return [email, addr, lrcAmount];
    } else {
      if (addr2.substring(0,2) == '0x') {
        //console.log([email, addr2, lrcAmount2]);
        return [email, addr2, lrcAmount2];
      } else {
        console.log("invalid line:", line);
      }
    }
  } else {
    console.log("invalid line:", line);
  }
}

function parseTokenFileLine(line) {
  var lineArr = line.split(',');
  var addr = lineArr[4].replace(/["]/g, "");
  var lrcAmount = Number(lineArr[6].replace(/["]/g, ""));

  return [addr, lrcAmount];
}

function caculateItemEthPrice(refundItem, priceMap, lrcAmountCapMap, addrLrcMap) {
  var ethAmount = 0;
  // check addr in etherscan transfer(addr=>lrc) map:

  var email = refundItem[0];
  var addr = refundItem[1];
  if (addrLrcMap.has(addr)) {
    var lrcAmount = Number(addrLrcMap.get(addr));
    //console.log("lrcAmount:", lrcAmount);
    var lrcCap = Number(lrcAmountCapMap.get(email)) || 0;
    var userPrice = Number(priceMap.get(email)) || 6000;

    if (lrcAmount <= lrcCap) {
      ethAmount = lrcAmount/userPrice;
    } else {
      ethAmount = lrcCap/userPrice + (lrcAmount - lrcCap)/6000;
    }
  } else {
    //console.log("refund record not found in etherscan. item:", refundItem);
  }

  ethAmount = Math.floor(ethAmount*100)/100;
  return ethAmount;
}

async function getAllRefundRecordMap() {
  var refundTokenFile = "./input/ico365/export-token-0xef68e7c694f40c8202821edf525de3782458639f.csv";
  var refundTokenArr = await utils.parseFileByLine(refundTokenFile, parseTokenFileLine);

  var addrLrcMap = utils.amountArrToMap(refundTokenArr, 0, 1);
  return addrLrcMap;
}

function getDuplicatedAddrSet(refundDataArr) {
  var addrOccurrencesMap = new Map();
  refundDataArr.forEach(item => {
    var addr = item[1];
    if (addrOccurrencesMap.has(addr)) {
      var occurrence = addrOccurrencesMap.get(addr);
      addrOccurrencesMap.set(addr, ++occurrence);
    } else {
      addrOccurrencesMap.set(addr, 1);
    }
  });

  var duplicatedAddrArr = [...addrOccurrencesMap].filter(item => item[1] > 1);
  //console.log(duplicatedAddrArr);

  var duplicatedAddrs = duplicatedAddrArr.map(item => item[0]);
  var duplicatedAddrSet = new Set(duplicatedAddrs);

  //0x69ea6b31ef305d6b99bb2d4c9d99456fa108b02a
  var bterAddr = "0x69ea6b31ef305d6b99bb2d4c9d99456fa108b02a";
  duplicatedAddrSet.add(bterAddr);
  return duplicatedAddrSet;
}

async function refundbatch2() {
  var refundBatchFile = "./input/ico365/refund-batch2.csv";
  var refundDataArr = await utils.parseFileByLine(refundBatchFile, parseRefundFileLine);
  var lrcAmountMap = new Map(lrcAmountArr);
  var priceMap = new Map(userPriceArr);

  var addrLrcMap = await getAllRefundRecordMap();
  var duplicatedAddrSet = getDuplicatedAddrSet(refundDataArr);

  var res = refundDataArr.map(item => {
    var ethAmount = caculateItemEthPrice(item, priceMap, lrcAmountMap, addrLrcMap);
    var email = item[0];

    var addr = item[1];
    if (duplicatedAddrSet.has(addr)) {
      ethAmount = 0;
    }
    return [addr, ethAmount, email];
  }).filter(item => item[1] > 0).sort((a, b) => {
    if (a[0] >= b[0]) {
      return 1;
    } else {
      return -1;
    }
  });

  var resMap = new Map();
  res.forEach(item => resMap.set(item[0], item[1]));
  printUtils.splitAndWriteToFile(resMap, 100, "./output/ico365_batch2_params.txt");

  var handledItemSet = new Set();
  res.forEach(item => handledItemSet.add(item[2]));

  var unhandleItemSet = new Set();
  refundDataArr.forEach(item => {
    var email = item[2];
    if (!handledItemSet.has(email)) {
      unhandleItemSet.add(email);
    }
  });

  res = [["地址", "返还ETH数目", "邮箱"]].concat(res);
  utils.writeArrayToCSVFile(res, "./output/ico365_batch2_res.csv");
  utils.writeArrayToCSVFile0([...unhandleItemSet], "./output/ico365_batch2_not_handle.csv", item => item);
  // console.log("res:", res);
  // console.log("res length:", res.length);
}

async function binanceRefund() {
  var binanceAddr = "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be";
  var addrLrcMap = await getAllRefundRecordMap();
  var lrcAmount = addrLrcMap.get(binanceAddr);

  console.log(lrcAmount);

  // already returned 30000 lrc to binance.
  lrcAmount -= 30000;
  var ethAmount = lrcAmount/6000;
  console.log(binanceAddr, ethAmount);
}

async function bterRefund() {
  var bterAddrsFile = "./input/bter_accounts.txt";
  var allBterAddrs = await utils.parseFileByLine(bterAddrsFile, line=>line.toLowerCase());
  var addrLrcMap = await getAllRefundRecordMap();

  allBterAddrs.forEach(addr => {
    var lrcAmount = addrLrcMap.get(addr);
    console.log(addr, lrcAmount);
  });

}


async function noMatchTxRefund() {
  var parseRefundedFileLine = function(line) {
    var lineArr = line.split(',');
    var addr = lineArr[0].replace(/["]/g, "");
    return addr;
  }

  var refundedFile = "./input/ico365/ico365_refund_all.csv";
  var bterAddr = "0x69ea6b31ef305d6b99bb2d4c9d99456fa108b02a";
  var refundedAddrsAndBter = await utils.parseFileByLine(refundedFile, parseRefundedFileLine);
  console.log(refundedAddrsAndBter);
  refundedAddrsAndBter.push(bterAddr);

  var excludeAddrSet = new Set(refundedAddrsAndBter);
  excludeAddrSet.add(bterAddr);

  var addrLrcMap = await getAllRefundRecordMap();

  var resMap = new Map();
  [...addrLrcMap.keys()].forEach(addr => {
    if (!excludeAddrSet.has(addr)) {
      var lrcAmount = addrLrcMap.get(addr);
      if (lrcAmount) {
        var ethAmount = lrcAmount/6000;
        ethAmount = Math.floor(ethAmount * 100)/100;
        resMap.set(addr, ethAmount);
      }
    }
  });

  console.log(resMap);
  printUtils.splitAndWriteToFile(resMap, 100, "./output/ico365_others_params.txt");
}

async function main() {
  // await refundbatch2();
  // await binanceRefund();
  // await bterRefund();
  await noMatchTxRefund();
}

main();
