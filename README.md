d3-plugins
==========

## What is this?

**d3-plugins** are JavaScript plug-ins for the awesomeness that is d3.js.

Each library is documented, and none are minified. If you want a minified version, please feel free to run the code through a minifier - I happen to like YUI Compressor. It is my intention to only commit un-minified versions to this repo so that all of the comments are intact and other engineers can easily see what I'm doing, how I'm doing it, and *most importantly*, why I'm doing it.

## Plug-ins in the collection

### *table*
A handy little plug-in for quickly reading data from an HTML table.

#### Syntax:
*object[]* d3.table(*HTMLElement|string* table[, *object* label[, *object* body]]);

Examples:
* var data = d3.table('#visitor-by-os', {row:0}, {start:1});
* var data = d3.table('#visitor-by-os', {column:0}, {start:1, end:8});

#### Requires:
* d3 --- http://d3js.org/d3.v3.min.js

#### Demo:
* [The Cathmhaol](http://products.cathmhaol.com/prototypes/d3-table/)