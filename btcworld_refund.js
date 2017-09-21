var fs = require('fs');
var utils = require('./utils.js');
var printUtils = require('./printutils.js');

function getEthCapMap() {
  var capMap = new Map();
  capMap
    .set("0x9f74e3fe402ffc5d9e5bf7496b217fcbdde019f3".toLowerCase(), 2.448)
    .set("0x69ea6b31ef305d6b99bb2d4c9d99456fa108b02a".toLowerCase(), 2.222)
    .set("0x4DA321294bd08db718D88384f8ce489f5e5E084A".toLowerCase(), 5.4372)
    .set("0x84E991F74dE5250d3871e71612392ff0D1940660".toLowerCase(), 2.25)
    .set("0x5225aea4a48a03c641decaccb61103f897695a0e".toLowerCase(), 5)
    .set("0x12d8Ab4DDA9fbEEA91886A51F87D4b80c3148066".toLowerCase(), 1);

  return capMap;
}

function getPriceMap() {
  var priceMap = new Map();
  priceMap
    .set("0x9f74e3fe402ffc5d9e5bf7496b217fcbdde019f3".toLowerCase(), 5500)
    .set("0x69ea6b31ef305d6b99bb2d4c9d99456fa108b02a".toLowerCase(), 5800)
    .set("0x4DA321294bd08db718D88384f8ce489f5e5E084A".toLowerCase(), 5600)
    .set("0x84E991F74dE5250d3871e71612392ff0D1940660".toLowerCase(), 5500)
    .set("0x5225aea4a48a03c641decaccb61103f897695a0e".toLowerCase(), 5500)
    .set("0x12d8Ab4DDA9fbEEA91886A51F87D4b80c3148066".toLowerCase(), 5500);

  return priceMap;
}

function parseTokenFileLine(line) {
  var lineArr = line.split(',');
  var addr = lineArr[4].replace(/["]/g, "");
  var lrcAmount = Number(lineArr[6].replace(/["]/g, ""));

  if (lrcAmount) {
    return [addr, lrcAmount];
  }
}

function caculateEthAmount(addr, lrcAmount, priceMap, ethCapMap) {
  var price = Number(priceMap.get(addr));
  var ethCap = Number(ethCapMap.get(addr));
  var lrcCap = ethCap * price;
  if (price) {
    if (lrcAmount > lrcCap) {
      return ethCap + (lrcAmount - lrcCap)/6000;
    } else {
      return lrcAmount/price;
    }
  } else {
    return lrcAmount/6000;
  }
}

async function refund() {
  var tokenFile = "./input/btcworld/export-token-0xef68e7c694f40c8202821edf525de3782458639f-btcworld-0915.csv";
  var allRefundArr = await utils.parseFileByLine(tokenFile, parseTokenFileLine);
  var allRefundMap = utils.amountArrToMap(allRefundArr, 0, 1);

  var ethCapMap = getEthCapMap();
  var priceMap = getPriceMap();
  var resArr = [...allRefundMap.keys()].map(addr => {
    var lrcAmount = allRefundMap.get(addr);
    var ethAmount = caculateEthAmount(addr, lrcAmount, priceMap, ethCapMap);
    console.log("ethAmount:", ethAmount);
    ethAmount = Math.floor(ethAmount * 100)/100;
    return [addr, ethAmount];
  });

  var resMap = new Map();
  resArr.forEach(item => resMap.set(item[0], item[1]));

  console.log(resMap);

  printUtils.splitAndWriteToFile(resMap, 100, "./output/btcworld_params.txt");
}

refund();
