/**
 * 区域kml转wkt，存为excel；
 */
var fs = require('fs')
var tj = require('@mapbox/togeojson') // kml转geojson
var DOMParser = require('xmldom').DOMParser;
var wkt = require('terraformer-wkt-parser');// geojson与wkt互转
var xlsx = require('node-xlsx');

var path = require("path");
var dirs = [];
var pathName = "./data"
// var pathName = "./data/polygon"
// var pathName = "./data/line"

// 遍历目录下文件进行转化
fs.readdir(pathName, function (err, files) {
  (function iterator(i) {
    if (i == files.length) {
      dirs.forEach(item => {
        if (item.indexOf('.kml') !== -1) {
          const fileNameArr = item.split('.kml')
          // console.log(fileNameArr[0])
          tranformKmlToXlsx(fileNameArr[0])
        }
      })
      return;
    }
    fs.stat(path.join(pathName, files[i]), function (err, data) {
      if (data.isFile()) {
        dirs.push(files[i]);
      }
      iterator(i + 1);
    });
  })(0);
});

/* kml转xlcx主函数 */
function tranformKmlToXlsx(fileName) {
  // kml转geojson
  var geojson = kmlToGeoJson(fileName)
  console.log('geojson', geojson)
  // geojson转wkt数组
  var wktList = geoJsonToWktList(geojson)
  console.log('wktList', wktList)
  var sheetData = [
    {
      name: 'sheet1',
      data: wktList
    }
  ]
  // 写入xlsx文件
  saveXlsxFile(sheetData, fileName)
}

/* kml转geojson */
function kmlToGeoJson(fileName) {
  var kml = new DOMParser().parseFromString(fs.readFileSync(`${pathName}/${fileName}.kml`, 'utf8'));
  return tj.kml(kml);
}
/* geojson转wkt数组 */
function geoJsonToWktList(geojson) {
  const wktList = [['type', 'name', 'wkt']];
  geojson.features.forEach((item) => {
    if (item.geometry && item.geometry.type === 'GeometryCollection') {
      if (item.geometry.geometries[0].type === 'Polygon') {
        formatPolygon(wktList, item)
      }
      if (item.geometry.geometries[0].type === 'LineString') {
        formatLine(wktList, item)
      }

    } else {
      const reg = /( Z| 0)/g
      let wktstr = wkt.convert(item.geometry).replace(reg, '');
      wktList.push([
        item.geometry && item.geometry.type,
        item.properties && item.properties.name,
        wktstr,
      ]);
    }
  });
  return wktList
}
// 写入xlsx文件
function saveXlsxFile(sheetData, fileName) {
  var buffer = xlsx.build(sheetData);
  fs.writeFile(`./output/${fileName}.xlsx`, buffer, function (err) {
    if (err) {
      console.log("Write failed: " + err);
      return;
    }
    console.log("Write completed.");
  });
}
/* 多个Polygon处理 */
function formatPolygon(wktList, item) {
  let multiStr = 'MULTIPOLYGON(';
  const reg_word = /[A-Z]+\s?/gi;
  const geometries = item.geometry.geometries;
  geometries.forEach((j, index) => {
    let wktstr = wkt.convert(j).replace(reg_word, '');
    multiStr += `${wktstr}${index === geometries.length - 1 ? '' : ','}`;
  });
  multiStr += ')';
  multiStr = multiStr.replace(/( Z| 0)/g, '');
  wktList.push([
    'MultiPolygon',
    item.properties && item.properties.name,
    multiStr,
  ]);
}
/* 多个LineString处理 */
function formatLine(wktList, item) {
  let multiStr = 'MULTILINESTRING(';
  const reg_word = /[A-Z]+\s?/gi;
  const geometries = item.geometry.geometries;
  geometries.forEach((j, index) => {
    let wktstr = wkt.convert(j).replace(reg_word, '');
    multiStr += `${wktstr}${index === geometries.length - 1 ? '' : ','}`;
  });
  multiStr += ')';
  wktList.push([
    'MultiLineString',
    item.properties && item.properties.name,
    multiStr,
  ]);
}
