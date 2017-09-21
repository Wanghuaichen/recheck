var fs = require('fs');
var utils = require('./utils.js');
var printUtils = require('./printutils.js');

function parseResFileLine(line) {
  var lineArr = line.split(',');
  var addr = lineArr[0].replace(/["]/g, "");
  var lrcAmount = Number(lineArr[1].replace(/["]/g, ""));

  if (lrcAmount) {
    var ethAmount = lrcAmount/6000;
    ethAmount = Math.floor(ethAmount*100)/100;
    return [addr, ethAmount];
  }
}

async function main() {
  var resFile = "./input/lrcRefund-0914.csv";
  var resArray = await utils.parseFileByLine(resFile, parseResFileLine);

  var resMap = new Map();
  resArray.forEach(item => {
    var key = item[0];
    if (resMap.has(key)) {
      console.log("duplicated key found:", key);
    }
    resMap.set(key, item[1])
  });
  console.log(resMap.size)
  printUtils.splitAndWriteToFile(resMap, 100, "./output/lrcNotMatchedRefund-0915.txt");
  utils.writeMapToCSVFile(resMap, "./output/lrcNoMatchRefund.csv");
}

main();
