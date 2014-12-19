d3-plugins
==========

## What is this?

**d3-plugins** are JavaScript plug-ins for the awesomeness that is d3.js.

Each library is documented, and none are minified. If you want a minified version, please feel free to run the code through a minifier - I happen to like YUI Compressor. It is my intention to only commit un-minified versions to this repo so that all of the comments are intact and other engineers can easily see what I'm doing, how I'm doing it, and *most importantly*, why I'm doing it.

## Plug-ins in the collection

### *table*
Reads data from an HTML table. An optional configuration object containing: the index of the row or column containing property names - as 'row' or 'column', the row or column index where data starts - as 'start', the row or column index where data ends - as 'end', and a callback function - as 'callback', may be specified as the second argument. If 'row' or 'column' are not specified, the property names are taken from the first row of either the thead - if it exists - or the table. If a callback is specified, the callback will be invoked when the data is loaded or an error occurs; the callback is invoked with two arguments: the error, if any, and the data as an array of JavaScript objects. The data is undefined if an error occurs. If no callback is specified, the data is returned as an array.

#### Syntax:
*object[]* d3.table(*HTMLElement|string* table[, *object* config[, *function* callback]]);

Examples:
* var data = d3.table('#visitor-by-os');
* var data = d3.table('#visitor-by-os', {row:0, start:1});
* d3.table('#visitor-by-os', {column:0, start:1, end:8, callback:function(error, data) { if (data) {for (var i in data) { console.log(JSON.stringify(data [i])); }} } });
* d3.table('#visitor-by-os', function(error, data) { if (data) {for (var i in data) { console.log(JSON.stringify(data [i])); }} });

#### Requires:
* d3 --- http://d3js.org/d3.v3.min.js

#### Demo:
* [The Cathmhaol](http://products.cathmhaol.com/prototypes/d3-table/)