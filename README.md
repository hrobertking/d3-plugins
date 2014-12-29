d3-plugins
==========

## What is this?

**d3-plugins** are JavaScript plug-ins for the awesomeness that is d3.js.

Each library is documented, and none are minified. If you want a minified version, please feel free to run the code through a minifier - I happen to like YUI Compressor. It is my intention to only commit un-minified versions to this repo so that all of the comments are intact and other engineers can easily see what I'm doing, how I'm doing it, and *most importantly*, why I'm doing it.

## Plug-ins in the collection

### *jquery*
Adds jQuery traversal methods to D3 selections.

#### Syntax:
- ***selection* *selection*.children([*string* selector])**: Get the children of each element in the set of matched elements, optionally filtered by a selector.
- ***selection* *selection*.closest([*string* selector])**: For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
- ***selection* *selection*.find([*string* selector])**: Get the descendants of each element in the current set of matched elements, filtered by a selector.
- ***selection* *selection*.first()**: Returns the first element in the selection
- ***number* *selection*.height()**: Returns the height, in pixels, of the item
- ***selection* *selection*.last()**: Returns the last element in the selection
- ***selection* *selection*.next([*string* selector])**: Get the immediately following sibling of each element in the set of matched elements. If a selector is provided, it retrieves the next sibling only if it matches that selector.
- ***selection* *selection*.nextAll([*string* selector])**: Get all following siblings of each element in the set of matched elements, optionally filtered by a selector.
- ***selection* *selection*.nextUntil([*string* selector[, *string* filter]])**: Get all following siblings of each element up to but not including the element matched by the selector.
- ***selection* *selection*.offsetParent([*string* selector])**: Get the closest ancestor element that is positioned.
- ***selection* *selection*.parent([*string* selector])**: Get the parent of each element in the current set of matched elements, optionally filtered by a selector.
- ***selection* *selection*.parents([*string* selector])**: Get the ancestors of each element in the current set of matched elements, optionally filtered by a selector
- ***selection* *selection*.parentsUntil([*string* selector[, *string* filter]])**: Get the ancestors of each element in the current set of matched elements, up to but not including the element matched by the selector.
- ***selection* *selection*.prev([*string* selector])**: Get the immediately preceding sibling of each element in the set of matched elements, optionally filtered by a selector.
- ***selection* *selection*.prevAll([*string* selector])**: Get all preceding siblings of each element in the set of matched elements, optionally filtered by a selector.
- ***selection* *selection*.prevUntil([*string* selector[, *string* filter]])**: Get all preceding siblings of each element up to but not including the element matched by the selector.
- ***selection* *selection*.siblings([*string* selector])**: Get the siblings of each element in the set of matched elements, optionally filtered by a selector.
- ***number* *selection*.width()**: Returns the width, in pixels, of the item

Examples:
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active')
- var sel = d3.select('p').first()
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active').next()
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active').prevUntil('#image-3')

#### Requires:
- d3 --- http://d3js.org/d3.v3.min.js

#### Demo:
- 

### *table*
Reads data from an HTML table. An optional configuration object containing: the index of the row or column containing property names - as 'row' or 'column', the row or column index where data starts - as 'start', the row or column index where data ends - as 'end', and a callback function - as 'callback', may be specified as the second argument. If 'row' or 'column' are not specified, the property names are taken from the first row of either the thead - if it exists - or the table. If a callback is specified, the callback will be invoked when the data is loaded or an error occurs; the callback is invoked with two arguments: the error, if any, and the data as an array of JavaScript objects. The data is undefined if an error occurs. If no callback is specified, the data is returned as an array.

#### Syntax:
*object[]* d3.table(*HTMLElement|string* table[, *object* config[, *function* callback]]);

Examples:
- var data = d3.table('#visitor-by-os');
- var data = d3.table('#visitor-by-os', {row:0, start:1});
- d3.table('#visitor-by-os', {column:0, start:1, end:8, callback:function(error, data) { if (data) {for (var i in data) { console.log(JSON.stringify(data [i])); }} } });
- d3.table('#visitor-by-os', function(error, data) { if (data) {for (var i in data) { console.log(JSON.stringify(data [i])); }} });

#### Requires:
- d3 --- http://d3js.org/d3.v3.min.js

#### Demo:
- [The Cathmhaol](http://products.cathmhaol.com/prototypes/d3-table/)
