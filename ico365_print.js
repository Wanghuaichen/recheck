var fs = require('fs');
var utils = require('./utils.js');
var printUtils = require('./printutils.js');

function parseResFileLine(line) {
  var lineArr = line.split(',');
  var addr = lineArr[0].replace(/["]/g, "");
  var ethAmount = Number(lineArr[1].replace(/["]/g, ""));

  return [addr, ethAmount];
}

async function ico365Batch2() {
  var resFile = "./input/ico365/ico365_batch2_res.csv";
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
  printUtils.splitAndWriteToFile(resMap, 100, "./output/ico365_batch2_fixed_params.txt");
  utils.writeMapToCSVFile(resMap, "./output/ico365_batch2_fixed.csv");
}

async function ico365RefundNoMatchHandler() {
  var batch1ResFile = "";
  var batch2ResFile = "";

}

async function main() {

}

main();
