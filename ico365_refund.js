var lineReader = require('line-reader');
var Promise = require('bluebird');
var eachLine = Promise.promisify(lineReader.eachLine);
var request = require('sync-request');
var cheerio = require('cheerio');

var fs = require('fs');
var parse = require('csv-parse');
var assert = require('assert');

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
