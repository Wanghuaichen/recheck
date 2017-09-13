var utils = require("./utils.js");

var paidTxFile = './input/0913/export-0x8668ef4534ec8716dede42807084a526ff4904e2.csv';
var outputHtmlFile = "./output/refund-all.html";

function parsePaidTx(lineArr) {
  var dateTime = lineArr[3];
  var address = lineArr[5];
  var txHash = lineArr[0];
  var ethAmount = lineArr[8];

  if (txHash.substring(0, 2) == "0x") {
    return [dateTime, address, txhash, ethAmount];
  } else {
    return null;
  }
}

function resArrToHtml(resArr) {
  var html = "";
  resArr.forEach((item) => {
    if (item) {

    }
  });
  return html;
}

async function main() {
  var allPaidData = await parseCsvFile(paidTxFile, parsePaidTx);

}

main();
