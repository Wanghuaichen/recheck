var fs = require('fs');
var utils = require('./utils.js');

var ethDepositFile = "./input/ico365/deposit_eth.csv";
var lrcWithdrawFile = "./input/ico365/withdraw_lrc.csv";
var lrcBalanceFile = "./input/ico365/balance_lrc.csv";

function parseDepositEthLine(line) {
  var lineArr = line.split(",");

  var account = lineArr[0].trim();
  var email = lineArr[4].trim();
  var amount = Number(lineArr[7]);

  if (amount) {
    return [account, email, amount];
  } else {
    console.log("invalid line in deposit file: " + line);
  }
}

function parseWithdrawLrcLine(line) {
  var lineArr = line.split(",");
  var account = lineArr[8].trim();
  var amount = Number(lineArr[3]);

  if (amount) {
    return [account, amount];
  } else {
    console.log("invalid line in withdrawl file: " + line);
  }
}

function parseBalanceLrcLine(line) {
  var lineArr = line.split(",");
  var email = lineArr[4].trim();
  var amount = Number(lineArr[7]);
  if (amount) {
    return [email, amount];
  } else {
    console.log("invalid line in balance file: " + line);
  }
}

function caculateUserPrice(userEthMap, userLrcMap, userLrcBalanceOn365Map) {
  var resMap = new Map();
  for (let key of userEthMap.keys()) {
    var ethAmount = userEthMap.get(key);
    var lrcWithdraw = userLrcMap.get(key) || 0;
    var lrcOn365 = userLrcBalanceOn365Map.get(key) || 0;

    var price = (lrcWithdraw + lrcOn365)/ethAmount;
    price = Math.ceil(price);
    resMap.set(key, price);
  }
  return resMap;
}

async function main() {
  var [userEthArr, userLrcWithdrawlArr, userLrcBalanceArr] = await Promise.all([
    utils.parseFileByLine(ethDepositFile, parseDepositEthLine),
    utils.parseFileByLine(lrcWithdrawFile, parseWithdrawLrcLine),
    utils.parseFileByLine(lrcBalanceFile, parseBalanceLrcLine),
  ]);

  var userEthMap = utils.amountArrToMap(userEthArr, 1, 2);
  var userLrcMap = utils.amountArrToMap(userLrcWithdrawlArr, 0, 1);
  var userLrcBalanceOn365Map = utils.amountArrToMap(userLrcBalanceArr, 0, 1);

  var priceMap = caculateUserPrice(userEthMap, userLrcMap, userLrcBalanceOn365Map);

  var header = ["邮箱", "LRC数量", "个人平均价格"];
  var data = [...userEthMap.keys()].map(key => {
    var lrcAmount = Math.floor(userLrcMap.get(key)||0);
    var price = priceMap.get(key);
    return [key, lrcAmount, price];
  });

  data = data.sort();
  data = [header].concat(data);

  utils.writeArrayToCSVFile(data, "./output/ico365_userinfo.csv");

  // console.log("userLrcMap len:", userLrcMap.size);
  utils.writeObjToJsonFile([...userLrcMap], "./input/json/ico365UserLrc.json");
  utils.writeObjToJsonFile([...priceMap], "./input/json/ico365UserPrice.json");
}

main();
