var lineReader = require('line-reader');
var Promise = require('bluebird');
var eachLine = Promise.promisify(lineReader.eachLine);
var fs = require('fs');
var parse = require('csv-parse');

/* parse csv, text file functions: */

var parseCsvFile = async function(fileName, lineParseFunc) {
  var data = fs.readFileSync(fileName, 'utf8');
  var res = [];

  await parse(data, {comment: '#'}, function(err, output){
    for (var i = 0; i < output.length; i ++) {
      var lineRes = lineParseFunc(output[i]);
      if (lineRes) {
        res.push(lineRes);
      }
    }
  });

  return res;
};

var parseFileByLine =  async function(fileName, lineParseFunc) {
  var res = [];

  await eachLine(fileName, function(line) {
    var lineRes = lineParseFunc(line);
    if (lineRes) {
      res.push(lineRes);
    }
  });

  return res;
};

/* write file functions */
function writeArrayToCSVFile0(arr, outFile, lineFunc) {
  var content = arr
      .map(line => lineFunc(line))
      .reduce((a, b) => a + b + "\n", "");
  fs.writeFileSync(outFile, content);
}

function writeArrayToCSVFile(arr, outFile) {
  var content = arr.map(lineArr => {
    var line = "";
    for (var i = 0; i < lineArr.length; i++) {
      if (i == 0) {
        line = '"' + lineArr[i] + '"';
      } else {
        line += ',"' + lineArr[i] + '"';
      }
    }
    return line;
  }).reduce((a, b) => a + b + "\n", "");

  fs.writeFileSync(outFile, content);
}

function writeMapToCSVFile(resMap, outFile) {
  var keys = [...resMap.keys()];
  var sortedKeys = keys.sort();
  var content = "";
  sortedKeys.forEach((key) => {
    var value = resMap.get(key);
    content += '"' + key + '","' + value + '"\n';
  });
  fs.writeFileSync(outFile, content);
}

function writeObjToCSVFile(obj, outFile) {
  var keys = [...resMap.keys()];
  var sortedKeys = keys.sort();
  var content = "";
  sortedKeys.forEach((key) => {
    var value = resMap[key];
    content += '"' + key + '","' + value + '"\n';
  });
  fs.writeFileSync(outFile, content);
}

function writeObjToJsonFile(obj, outFile) {
  var json = JSON.stringify(obj);
  fs.writeFileSync(outFile, json);
}

/* collection convert functions */

function amountArrToMap(arr, keyInd, valInd) {
  var resMap = new Map();
  for (let item of arr) {
    var key = item[keyInd];
    var amount = Number(item[valInd]);

    if (resMap.has(key)) {
      var total = resMap.get(key);
      total += amount;
      resMap.set(key, total);
    } else {
      resMap.set(key, amount);
    }
  }

  return resMap;
}

/* exports */

exports.parseCsvFile = parseCsvFile;
exports.parseFileByLine = parseFileByLine;

exports.writeArrayToCSVFile0 = writeArrayToCSVFile0;
exports.writeArrayToCSVFile = writeArrayToCSVFile;
exports.writeMapToCSVFile = writeMapToCSVFile;
exports.writeObjToCSVFile = writeObjToCSVFile;
exports.writeObjToJsonFile = writeObjToJsonFile;

exports.amountArrToMap = amountArrToMap;
