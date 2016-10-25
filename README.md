d3-plugins
==========

## What is this?

**d3-plugins** are JavaScript plug-ins for the awesomeness that is d3.js.

Each library is documented, and none are minified. If you want a minified version, please feel free to run the code through a minifier - I happen to like YUI Compressor. It is my intention to only commit un-minified versions to this repo so that all of the comments are intact and other engineers can easily see what I'm doing, how I'm doing it, and *most importantly*, why I'm doing it.

## Plug-ins in the collection

### *earth*
Adds a marked map data visualization. The visualization has two clickable objects: `country` and `marker`, both of which can be referenced as `this` within the click handler. Each `country` has the properties `id` (the id from the topoJSON file), `iso` (the ISO 3166 Alpha-2 code for the country), and `name` (the name of the country in English). Each `marker` placed has a `longitude`, `latitude`, and `size` (in pixels).

#### Syntax
*object* d3.geo.earth([*string* container[, *number* width[, *string* style[, *string|HTMLElement* descriptor]]]])

#### Events
- ***accelerated***: Fired when the speed at which a globe is rotating increases.
- ***paused***: Fired when a rotating globe is stopped.
- ***rendered***: Fired when a project is rendered.
- ***resumed***: Fired when a stopped globe resumes rotation.
- ***slowed***: Fired when the speed at which a globe is rotating decreases.

#### Properties

#### Methods
- ***void* *instance*.addOnCountryClick(*function* handler)**: Adds a click handler to the <em>countries</em>. The parameter <em>handler</em> is the handler is a JavaScript function executed when a country on the map is clicked. The 'this' keyword in the handler function will refer to the country clicked. The properties 'id', which is the id from the topoJSON file, 'iso', which is the ISO 3166 Alpha-2 code for the country, and 'name', which is the name of the country in English are among the properties available through the 'this' object.
- ***void* *instance*.addOnMarkerClick(*function* handler)**: Adds a click handler to the <em>markers</em>. The parameter <em>handler</em> is the handler is a JavaScript function executed when a marker on the map is clicked. The 'this' keyword in the handler function will refer to the marker clicked.
- ***string* *instance*.borderColor([*string* color])**: Sets (if `color` is passed) and returns the hexadecimal value used when drawing borders. Default is '#ff0000'.
- ***HTMLElement* *instance*.element()**: Returns the element that contains the SVG.
- ***string[]* *instance*.events()**: Returns an array containing event names.
- ***string* *instance*.id()**: Returns the id attribute of the SVG used to display the map.
- ***string* *instance*.markerAnimation([*string* type])**: Sets (if `type` is passed) and returns the animation type. Valid values are one of 'pulse', 'ping', or 'none'. Default is 'pulse'.
- ***number* *instance*.markerAnimationDuration([*number* ms])**: Sets (if `ms` is passed) and returns the animation duration, in milliseconds. Valid values are greater than 100. Default is 1500.
- ***string* *instance*.markerColor([*string* color])**: Sets (if `color` is passed) and returns the color of the marker, in hexadecimal format. Default is '#ff0000'.
- ***string[]* *instance*.markerDescriptionData(*string[]* headers)**: Sets (if `headers` is passed) and returns the column headers of the marker description table. Note: column headers must match the data returned in the marker file.
- ***object* *instance*.markerFile([*string*|*object* file[, *string* type]])**: Sets the URI and type of the marker data. Data passed in may either be a string URI, e.g., '/airports/sorties.csv', or an object, e.g., { name:'/airports/sorties.csv', type:'csv' }
- ***object* *instance*.markerOpacity([*float* opacity])**: Sets (if `opacity` is passed) and returns the opacity of the marker. Valid values are between 0.0 (transparent) and 1.0 (opaque).
- ***integer* *instance*.markerSize([*integer* px])**: Sets (if `px` is passed) and returns the size of the marker in pixels. Default is 3.
- ***void* *instance*.on(*string* event, *function* handler)**: Sets an event handler for a named event.
- ***object* *instance*.palette([*object* palette])**: Sets (if `palette` is passed) and returns the palette used in drawing the map. The palette should contain values for `border`, `countries`, `marker`, and `ocean`. For example, <span class="code">{ border:'#333333', marker:'#663399' }</span> will set the border color and marker colors while using the default country colors, whereas <span class="code">{ border:'#333333', countries:['#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc', '#ffffff'] }</span> will set the border color as well as the colors used to draw countries.
- ***void* *instance*.parseMarkerData(*string*|*HTMLElement* table)**: Uses marker data presented in the table element specified in `table`. Data passed into the method may either be the value of the element id attribute or the table element.
- ***void* *instance*.refreshMarkerData(*string*|*number* interval)**: Sets the interval (in seconds) at which the marker data is refreshed using the `markerFile` information.
- ***void* *instance*.render([*string* style])**: Renders the map using the specified style.
- ***boolean* *instance*.rendered()**: Returns true if the SVG map is rendered, false if not.
- ***boolean* *instance*.rotatable()**: Returns true if the map is rotatable, i.e., if it is a globe.
- ***boolean* *instance*.rotating()**: Returns true if the map is rotating, i.e., if it is `rotatable` and the animation is set to run.
- ***void* *instance*.rotationDecrease()**: Decreases the rotational speed of the map.
- ***void* *instance*.rotationIncrease()**: Increases the rotational speed of the map.
- ***void* *instance*.rotationPause()**: Stops the rotation.
- ***void* *instance*.rotationResume()**: Resumes the rotation.
- ***void* *instance*.rotationStop()**: Stops the rotation. Rotation that is 'stopped' is waiting for an explicit restart using `rotationResume`.
- ***string* *instance*.style([*string* style])**: Sets (if `style` is passed) and returns the style used when rendering the map.
- ***string[]* *instance*.supportedTypes()**: Returns an array of all supported styles.
- ***string* *instance*.topoFile([*string* URI])**: Sets (if `URI` is passed) and returns the URI of the topoJSON file used.
- ***object* *instance*.topoJSON([*object* topoJSON])**: Sets (if `topoJSON` is passed) and returns the topoJSON object used.
- ***void* *instance*.transition(*string* style[, *integer* duration])**: Animates the transition from the current map style to the map style provided. Animation runs for the specified duration (in milliseconds). Default duration is 750ms.
- ***void* *instance*.travel(*string*|*object*|*object[]* data, *object* marker, *number* duration, *boolean* loop, *boolean* combined)**: Animates travel along routes defined in the specified data - identified by a resource object (i.e., a URL string or an object with 'name' and type' properties) or an array of objects with 'origin' and 'destination' properties - using the specified marker. The animation runs for the specified duration (in milliseconds) or 1000ms.

#### Examples

#### Requires
- d3 --- http://d3js.org/d3.v3.min.js
- d3 geo projections --- http://d3js.org/d3.geo.projection.v0.min.js
- d3 topojson --- http://d3js.org/topojson.v1.min.js
- a topoJSON data file

#### Demo
- [The Cathmhaol](http://prototypes.cathmhaol.com/earth/)


### *jquery*
Adds jQuery traversal methods to D3 selections.

#### Syntax

#### Events

#### Properties

#### Methods
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

#### Examples
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active');
- var sel = d3.select('p').first();
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active').next();
- var sel = d3.select('.control.clicked').closest('.filmstrip').find('.viewer .active').prevUntil('#image-3');
- var sel = d3.select('.control.clicked').closest('.filmstrip').children().not('active');

#### Requires
- d3 --- http://d3js.org/d3.v3.min.js

#### Demo
- 

### *table*
Reads data from an HTML table. An optional configuration object containing: the index of the row or column containing property names - as 'row' or 'column', the row or column index where data starts - as 'start', the row or column index where data ends - as 'end', and a callback function - as 'callback', may be specified as the second argument. If 'row' or 'column' are not specified, the property names are taken from the first row of either the thead - if it exists - or the table. If a callback is specified, the callback will be invoked when the data is loaded or an error occurs; the callback is invoked with two arguments: the error, if any, and the data as an array of JavaScript objects. The data is undefined if an error occurs. If no callback is specified, the data is returned as an array.

#### Syntax
*object[]* d3.table(*HTMLElement|string* table[, *object* config[, *function* callback]]);

#### Events

#### Properties

#### Methods

#### Examples
- var data = d3.table('#visitor-by-os');
- var data = d3.table('#visitor-by-os', {row:0, start:1});
- d3.table('#visitor-by-os', {column:0, start:1, end:8, callback:function(error, data) { if (data) {for (var i in data) { console.log(JSON.stringify(data [i])); }} } });
- d3.table('#visitor-by-os', function(error, data) { if (data) {for (var i in data) { console.log(JSON.stringify(data [i])); }} });

#### Requires
- d3 --- http://d3js.org/d3.v3.min.js

#### Demo
- [The Cathmhaol](http://prototypes.cathmhaol.com/d3-table/)
