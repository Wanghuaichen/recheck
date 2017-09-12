var lineReader = require('line-reader');
var Promise = require('bluebird');
var eachLine = Promise.promisify(lineReader.eachLine);
var request = require('sync-request');
var cheerio = require('cheerio');

var fs = require('fs');
var parse = require('csv-parse');
var assert = require('assert');

var ethDepositFile = "./input/ico365/deposit_eth.csv";
var lrcWithdrawFile = "./input/ico365/withdraw_lrc.csv";
var lrcBalanceFile = "./input/ico365/balance_lrc.csv";

var refundFile = "";

var userEthTotal = [];
var userLrcBalance = [];
var userLrcWithdrawl = [];
// var addrPhoneMap = {};
// var phoneAddrMap = {};
// var userPhones = [];

// var userAddrMap = {};
var userAccounts = [];
var userEthMap = {};

var parseCsvFile = async function(fileName, lineParseFunc) {
  await eachLine(fileName, function(line) {
    if (line.trim().substring(0,1) == '#') {
      return;
    }

    var lineArr = line.split(",");
    if (lineArr.length > 1) {
      lineParseFunc(lineArr);
    }
  });
};

function parseDepositEthLine(lineArr) {
  var account = lineArr[0].trim();
  var amount = Number(lineArr[7]);

  if (userAccounts.indexOf(account) < 0) {
    userAccounts.push(account);
  }

  if (amount) {
    userEthTotal.push([account, amount]);
  }
}

function parseWithdrawLrcLine(lineArr) {
  var account = lineArr[5].trim();
  var amount = Number(lineArr[3]);

  if (amount) {
    userLrcWithdrawl.push([account, amount]);
  }
}

function parseBalanceLrcLine(lineArr) {
  var account = lineArr[0].trim();
  var amount = Number(lineArr[7]);
  if (amount) {
    userLrcBalance.push([account, amount]);
  }
}

function parseRefundLine(lineArr) {
  var account = lineArr[0].trim();
  var addr = lineArr[1].trim().toLowerCase();

  refundArr.push([account, addr]);
}

var userEthTotalMap = {};
var userLrcWithdrawMap = {};
var userLrcBalanceMap = {};

function doSettle() {
  for (var i = 0; i < userEthTotal.length; i++) {
    var ethItem = userEthTotal[i];
    if (ethItem[1]) {
      if (userEthTotalMap[ethItem[0]]) {
        userEthTotalMap[ethItem[0]] += ethItem[1];
      } else {
        userEthTotalMap[ethItem[0]] = ethItem[1];
      }
    }
  }

  for (var i = 0; i < userLrcWithdrawl.length; i++) {
    var item = userLrcWithdrawl[i];
    if (item[1]) {
      if (userLrcWithdrawMap[item[0]]) {
        userLrcWithdrawMap[item[0]] += Number(item[1]);
      } else {
        userLrcWithdrawMap[item[0]] = Number(item[1]);
      }
    }
  }

  console.log("userLrcBalance len:", userLrcBalance.length);
  for (var i = 0; i < userLrcBalance.length; i++) {
    var item = userLrcBalance[i];
    //console.log("balance:", item);
    if(item[1]) {
      if (userLrcBalanceMap[item[0]]) {
        userLrcBalanceMap[item[0]] += item[1];
      } else {
        userLrcBalanceMap[item[0]] = item[1];
      }
    }
  }

  var toIco365Total = 0;
  var toUsersTotal = 0;
  var resArr = [["手机号", "平均价格", "ICO365", "个人"]];
  for (var i = 0; i < userAccounts.length; i++) {
    var p = userAccounts[i];
    var ethToIco365 = 0;
    var ethToUser = 0;

    if(userLrcBalanceMap[p]) {
      var price = 0;
      if (userLrcWithdrawMap[p]) {
        price = userEthTotalMap[p]/(userLrcWithdrawMap[p] + userLrcBalanceMap[p]);
      } else {
        price = userEthTotalMap[p]/userLrcBalanceMap[p];
      }
      //console.log("avg price:", price);
      ethToIco365 = userLrcBalanceMap[p] * price;
      if (userLrcWithdrawMap[p]) {
        ethToUser = userLrcWithdrawMap[p] * price;
      }
    } else {
      if (userEthTotalMap[p]) {
        ethToUser = userEthTotalMap[p];
      }
    }

    var LrcAmountPerEth = Math.round(1/price);

    ethToIco365 = floor2AndDropDust(ethToIco365);
    ethToUser = floor2AndDropDust(ethToUser);

    //console.log(p, ethToIco365, ethToUser);
    resArr.push([p, LrcAmountPerEth, ethToIco365, ethToUser]);
    toIco365Total += ethToIco365;
    toUsersTotal += ethToUser;
  }

  console.log(floor2(toIco365Total), floor2(toUsersTotal));
  resArr.push(["总计", floor2(toIco365Total), floor2(toUsersTotal)]);
  writeResToFile("./output/ico365Res-0911.csv", resArr);
}

function floor2(amount) {
  return Math.floor(amount*100)/100;
}

function floor2AndDropDust(amount) {
  var res = floor2(amount);
  if (res < 0.01) {
    res = 0;
  }

  return res;
}

function writeResToFile(resFile, resArr) {
  for (var i = 0; i < resArr.length; i++) {
    var line = arrToCsvLine(resArr[i]);
    fs.appendFileSync(resFile, line + "\n");
  }
}

function arrToCsvLine(lineArr){
  var line = "";
  for (var i = 0; i < lineArr.length; i++) {
    if (i == 0) {
      line = lineArr[i];
    } else {
      line = line + "," + lineArr[i];
    }
  }
  return line;
}

async function main() {
  await Promise.all([
    parseCsvFile(ethDepositFile, parseDepositEthLine),
    parseCsvFile(lrcWithdrawFile, parseWithdrawLrcLine),
    parseCsvFile(lrcBalanceFile, parseBalanceLrcLine),
  ]);

  doSettle();
}

main();
