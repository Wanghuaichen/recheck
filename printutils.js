var fs = require("fs");

function ethAmountToWei(amount) {
  var amount100 = Math.floor(amount * 100);
  return amount100 + "0000000000000000";
}

function genAddrsParam(addrArr) {
  var res = addrArr.reduce((a, b) => a + '"' + b + '",', "[");
  res = res.substring(0, res.length - 1);
  res += "]";
  return res;
}

function genAmountParam(amountAddr) {
  var res = amountAddr
      .map(a => ethAmountToWei(a))
      .reduce((a, b) => a + b + ",", "[");
  res = res.substring(0, res.length - 1);
  res += "]";
  return res;
}

function splitAndWriteToFile(dataMap, batchSize, outFile) {
  var keys = [...dataMap.keys()];
  var sortedKeys = keys.sort();

  fs.writeFileSync(outFile, "");
  var batchCount = Math.ceil(dataMap.size/batchSize);
  for (var i = 0; i < batchCount; i++) {
    var startIndex = i * batchSize;
    var endIndex = (i + 1) * batchSize;
    if (endIndex > dataMap.size) {
      endIndex = dataMap.size;
    }

    var keySlice = sortedKeys.slice(startIndex, endIndex);
    var keyParamStr = genAddrsParam(keySlice);
    var amountSlice = keySlice.map(addr => dataMap.get(addr));
    var amountParamStr = genAmountParam(amountSlice);
    var batchTotal = amountSlice.reduce((a, b) => a + b, 0);

    fs.appendFileSync(outFile, keyParamStr + "\n");
    fs.appendFileSync(outFile, amountParamStr + "\n");
    fs.appendFileSync(outFile, "batch total:" + batchTotal + "ETH \n\n");
  }

  amountTotal = [...dataMap.values()].reduce((a, b) => a + b, 0);
  fs.appendFileSync(outFile, "Total:" + amountTotal + "ETH \n\n");
}

exports.splitAndWriteToFile = splitAndWriteToFile;
