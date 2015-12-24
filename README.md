d3-plugins
==========

## What is this?

**d3-plugins** are JavaScript plug-ins for the awesomeness that is d3.js.

Each library is documented, and none are minified. If you want a minified version, please feel free to run the code through a minifier - I happen to like YUI Compressor. It is my intention to only commit un-minified versions to this repo so that all of the comments are intact and other engineers can easily see what I'm doing, how I'm doing it, and *most importantly*, why I'm doing it.

## Plug-ins in the collection

### *earth*
Adds a marked map data visualization.

#### Syntax:
*object* d3.geo.earth(*string* container[, *number* width[, *string* style[, *string|HTMLElement* descriptor]]])

- ***string* *object*.getBorderColor()**: Returns the hexadecimal value used when drawing borders.
- ***void* *object*.setBorderColor(*string* color)**: Sets the hexadecimal value used when drawing borders. The parameter <em>color</em> is the hexadecimal color to use - #663399, for example.
- ***HTMLElement* *object*.getElement()**: Returns the element that contains the SVG.
- ***void* *object*.setElement(*HTMLElement|string* element)**: Sets the element that will contain the SVG. The parameter <em>element</em> is the element to contain the SVG, which is the 'body' element by default. An HTMLElement or a string representing the id of the element may be passed.
- ***string* *object*.getMarkerColor()**: Returns the hexadecimal value used when drawing the markers.
- ***void* *object*.setMarkerColor(*string* color)**: Sets the hexadecimal value used when draing the markers. The parameter <em>color</em> is The hexadecimal color to use - #663399, for example.
- ***object* *object*.getMarkerFile()**: Returns the URI and type used when retrieving the marker file.
- ***void* *object*.setMarkerFile(*string|object* uri, string type)**: Sets the URI used when retrieving the marker file. The parameter <em>uri</em> is the URI can be either a string, or an object containing both the 'name' and 'type' property. The parameter <em>type</em> is a string containing either 'csv', for comma-separated value files, or 'json', a file in JSON format. A sample can be found at <a href="http://products.cathmhaol.com/prototypes/earth/cities.js" target="_new">http://products.cathmhaol.com/prototypes/earth/cities.js</a>. The properties 'lat' - latitude - and 'lon' - longitude - are required, while 'description', 'size', and 'color' are optional.
- ***int* *object*.getMarkerSize()**: Returns the size of the marker in pixels.
- ***void* *object*.setMarkerSize(*int* size)**: Sets the default size. The parameter <em>size</em> is An integer representing the size of the marker in pixels.
- ***string[] getPalette()**: Gets the colors used when drawing the countries.
- ***void* *object*.setPalette(string[]|object color)**: Sets the colors used. The parameter <em>color</em> is if a string array is passed, the colors used to draw the countries are set to the array. If an object is used, the border color, marker color, and color array used to generate the countries can be set by passing 'border', 'marker', and 'colors', respectively. For example, <span class="code">{ border:'#333333', marker:'#663399' }</span> will set the border color and marker colors while using the default country colors, whereas <span class="code">{ border:'#333333', colors:['#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc', '#ffffff'] }</span> will set the border color as well as the colors used to draw countries.
- ***string* *object*.getTopoFile()**: Returns the URI of the topoJSON file used to draw the map.
- ***void* *object*.setTopoFile(*string* uri)**: Sets the URI of the topoJSON file used to draw the map. The parameter <em>uri</em> is an absolute or relative URI for a topoJSON file. An example can be found at <a href="http://products.cathmhaol.com/prototypes/earth/world-110m.js" target="_new">http://products.cathmhaol.com/prototypes/earth/world-110m.js</a>.
- ***void* *object*.addOnCountryClick(*function* handler)**: Adds a click handler to the countries. The parameter <em>handler</em> is the handler is a JavaScript function executed when a country on the map is clicked. The 'this' keyword in the handler function will refer to the country clicked. The properties 'id', which is the id from the topoJSON file, 'iso', which is the ISO 3166 Alpha-2 code for the country, and 'name', which is the name of the country in English are among the properties available through the 'this' object.
- ***boolean* *object*.rotatable()**: Returns whether or not the map is rotatable, i.e. a globe.
- ***boolean* *object*.rotating()**: Returns whether or not the map is currently rotating.
- ***void* *object*.rotationDecrease()**: Decreases the rotational speed of the map.
- ***void* *object*.rotationIncrease()**: Increases the rotational speed of the map.
- ***void* *object*.rotationPause()**: Stops the rotation.
- ***void* *object*.rotationResume()**: Resumes the rotation.
- ***void* *object*.render(*string* style)**: Draws the map. The parameter <em>style</em> is a string representing the style of map to draw. At this time, '2D' is the only acceptable style, and will draw a Spherical Mercator (traditional) map. Any other value passed, including null, will render a globe.


#### Requires:
- d3 --- http://d3js.org/d3.v3.min.js
- d3 geo projections --- http://d3js.org/d3.geo.projection.v0.min.js
- d3 topojson --- http://d3js.org/topojson.v1.min.js
- a topoJSON data file


### *jquery*
Adds jQuery traversal methods to D3 selections.

#### Syntax:
- ***selection* *selection*.children([*string* selector])**: Get the children of each element in the set of matched elements, optionally filtered by a selector.
- ***selection* *selection*.closest([*string* selector])**: For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
- ***selection* *selection*.contents([*string* selector])**: Get the children of each element in the set of matched elements, including text and comment nodes.
- ***selection* *selection*.find([*string* selector])**: Get the descendants of each element in the current set of matched elements, filtered by a selector.
- ***selection* *selection*.first()**: Returns the first element in the selection
- ***number* *selection*.height()**: Returns the height, in pixels, of the item
- ***selection* *selection*.last()**: Returns the last element in the selection
- ***selection* *selection*.next([*string* selector])**: Get the immediately following sibling of each element in the set of matched elements. If a selector is provided, it retrieves the next sibling only if it matches that selector.
- ***selection* *selection*.nextAll([*string* selector])**: Get all following siblings of each element in the set of matched elements, optionally filtered by a selector.
- ***selection* *selection*.nextUntil([*string* selector[, *string* filter]])**: Get all following siblings of each element up to but not including the element matched by the selector.
- ***selection* *selection*.not([*string* selector])**: Remove elements from the set of matched elements.
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
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active');
- var sel = d3.select('p').first();
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active').next();
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active').prevUntil('#image-3');
- var sel = d3.select('.control.clicked').closest('.filmstrip').children().not('active');

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
