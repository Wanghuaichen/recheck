var request = require('sync-request');
var cheerio = require('cheerio');
var Promise = require('bluebird');

var fs = require('fs');
var parse = require('csv-parse');
var assert = require('assert');

var paidTxFile = './input/export-0x8668ef4534ec8716dede42807084a526ff4904e2-0910.csv';
var imtokenIcoFile = './input/imtoken_tx.csv'

var parseCsvFile = async function(fileName, lineParseFunc) {
  var data = fs.readFileSync(fileName, 'utf8');
  return await parse(data, {comment: '#'}, function(err, output){
    var res = {};
    for (var i = 0; i < output.length; i ++) {
      var item = lineParseFunc(output[i]);
      if (res[item[0]]) {
        res[item[0]] += item[1];
      } esle {
        res[item[0]] = item[1];
      }
    }
    return res;
  });
};

function parsePaidTx(lineArr) {
  try {
    if (lineArr[5].substring(0, 2) == '0x') {
      var paidAddress = lineArr[5].toLowerCase();
      var paidAmount = Number(lineArr[8]);

      return [paidAddress, paidAmount];
    }
  } catch (err) {
    console.log("parse error:", err);
  }
};

function parseImtokenTx(lineArr) {

}

async function main() {
  var [paidTxMap, imTokenICOMap] = await Promise.all([
    parseCsvFile(paidTxFile, parsePaidTx),
    parseCsvFile(imtokenIcoFile, )
  ]);
}

main();
