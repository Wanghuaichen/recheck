var lineReader = require('line-reader');
var Promise = require('bluebird');
var eachLine = Promise.promisify(lineReader.eachLine);
var request = require('sync-request');
var cheerio = require('cheerio');

var fs = require('fs');
var parse = require('csv-parse');
var assert = require('assert');

var badResFile = "./input/resFile0911-bk.txt";
var goodResFile = "./input/compare0911.json";

async function parseCsvFile(fileName, lineParseFunc) {
  var res = [];

  await eachLine(fileName, function(line) {
    var item = lineParseFunc(line);
    res.push(item);
  });

  return res;
};

function parseResLine(line) {
  if (line && line.trim().length > 0) {
    try{
      var flds = line.split(":");
      if (flds.length != 2) throw "bad line, length not 2. line:" + line;
      var addr = flds[0];
      addr = addr.substring(1, addr.length - 1);
      return [addr, Number(flds[1])];
    } catch (err) {
      console.log("error:", err);
    }
  }
}

function arrToMap(arr) {
  var resMap = [];
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    var addr = item[0];
    var amount = item[1];

    try {
      if (resMap[addr]) {
        throw new Error("duplicate addr found in resArray." + item);
      }
      resMap[addr] = amount;
    } catch (err) {
      console.log("Error:", err);
    }
  }

  return resMap;
}

function getAddrs(arr) {
  var addrs = [];
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    if (item[0]) {
      addrs.push(item[0]);
    }
  }
  return addrs;
}

function getExtraElementsInArr1(arr1, arr2) {
  var extras = [];
  for (var i = 0; i < arr1.length; i++) {
    if (arr2.indexOf(arr1[i]) < 0) {
      extras.push(arr1[i]);
    }
  }
  return extras;
}

function getLackElementsInArr1(arr1, arr2) {
  return getExtraElementsInArr1(arr2, arr1);
}

function diffResMapLess(badResAddrs, badLackAddrs, badResMap, goodResMap) {
  var resLess = [];
  var sum = 0;
  for (var i = 0; i < badResAddrs.length; i++) {
    var addr = badResAddrs[i];
    var goodAmount = goodResMap[addr];
    var badAmount = badResMap[addr];
    if (goodAmount > badAmount) {
      var less = goodAmount - badAmount;
      //console.log(addr, less);
      resLess.push([addr, less]);

      sum += less;
    }
  }

  for (var i = 0; i < badLackAddrs.length; i++) {
    var addr = badLackAddrs[i];
    var amount = goodResMap[addr];
    resLess.push([addr, amount]);
    sum += amount;
  }

  //console.log("sum:", sum/1e18);
  return resLess;
}

function diffResMapMore(badResAddrs, badExtraAddrs, badResMap, goodResMap) {
  var resMore = [];
  for (var i = 0; i < badResAddrs.length; i++) {
    var addr = badResAddrs[i];
    var goodAmount = goodResMap[addr];
    var badAmount = badResMap[addr];
    if (goodAmount < badAmount) {
      var more = badAmount - goodAmount;
      resMore.push([addr, more]);
    }
  }

  for (var i = 0; i < badExtraAddrs.length; i++) {
    var addr = badExtraAddrs[i];
    if (badResMap[addr]) {
      resMore.push([addr, badResMap[addr]]);
    }
  }

  return resMore;
}

function sumRes(diffRes) {
  var sum = 0;
  for (var i = 0; i < diffRes.length; i++) {
    sum += diffRes[i][1];
  }
  return sum/1e18;
}

function arrayToCSVStr(arrData) {
  var CSV = '';

  for (var i = 0; i < arrData.length; i++) {
    var row = "";
    for (var index in arrData[i]) {
      row += arrData[i][index] + ',';
    }
    row = row.slice(0, -1);
    CSV += row + '\n';
  }

  return CSV;
}

function arrayToCompareStr(arrData) {
  var content = '';
  for (var i = 0; i < arrData.length; i++) {
    var row = "";
    row += '"' + arrData[i][0] + '":' + arrData[i][1];
    content += row + '\n';
  }
  return content;
}

function writeParamsFile(resArr) {
  var addressParams = "[";
  var amountParams = "[";
  for (var i = 0; i < resArr.length; i++) {
    addressParams += '"' + resArr[i][0] + '",';
    amountParams += resArr[i][1] + ",";
  }
  addressParams = addressParams.substring(0, addressParams.length - 1);
  amountParams = amountParams.substring(0, amountParams.length - 1);
  addressParams += "]";
  amountParams += "]";

  var paramsFile = "./output/paramsFile0911-amend.txt"
  fs.writeFileSync(paramsFile, "");
  fs.appendFileSync(paramsFile, addressParams + "\n\n");
  fs.appendFileSync(paramsFile, amountParams + "\n\n");
  var sum = sumRes(resArr);
  fs.appendFileSync(paramsFile, "total eth: " + sum + "ETH\n");
}

function weiToEth(resArr) {
  var newResArr = [];
  for (var i = 0; i < resArr.length; i++) {
    var amount = resArr[i][1];
    var toEth = amount/1e18;
    newResArr.push([resArr[i][0], toEth]);
  }
  return newResArr;
}

async function main() {
  var [goodRes, badRes] = await Promise.all([
    parseCsvFile(goodResFile, parseResLine),
    parseCsvFile(badResFile, parseResLine)
  ]);

  var goodResMap = arrToMap(goodRes);
  var badResMap = arrToMap(badRes);

  var goodResAddrs = getAddrs(goodRes);
  var badResAddrs = getAddrs(badRes);

  var badExtra = getExtraElementsInArr1(badResAddrs, goodResAddrs);
  var badLacks = getLackElementsInArr1(badResAddrs, goodResAddrs);

  var diffLess = diffResMapLess(badResAddrs, badLacks, badResMap, goodResMap);
  var diffMore = diffResMapMore(badResAddrs, badExtra, badResMap, goodResMap);

  var diffLessSorted = diffLess.sort();

  writeParamsFile(diffLessSorted);

  var csvLess = arrayToCSVStr(weiToEth(diffLess));
  var csvMore = arrayToCSVStr(weiToEth(diffMore));
  var compareLess = arrayToCompareStr(diffLess);

  var lessFile = "./output/resFile0911-amend-less.txt";
  var moreFile = "./output/resFile0911-amend-more.txt";
  var compareFile = "./output/resFile0911-less.txt";
  fs.writeFileSync(lessFile, csvLess + "\n");
  fs.writeFileSync(moreFile, csvMore + "\n");
  fs.writeFileSync(compareFile, compareLess + "\n");

  var sumLess = sumRes(diffLess);
  var sumMore = sumRes(diffMore);
  fs.appendFileSync(lessFile, "sum: " + sumLess + "ETH");
  fs.appendFileSync(moreFile, "sum: " + sumMore + "ETH");
}

main();
