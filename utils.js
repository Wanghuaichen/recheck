var fs = require('fs');
var parse = require('csv-parse');

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

/* exports */
exports.parseCsvFile = parseCsvFile;
exports.writeMapToCSVFile = writeMapToCSVFile;
exports.writeObjToCSVFile = writeObjToCSVFile;
