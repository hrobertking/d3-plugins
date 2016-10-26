(function (root, factory) {
  'use strict';

  if (typeof define === 'function' && define.amd) {
    define(['d3', 'topojson'], function(d3, topojson) {
      return (root.Cathmhaol = factory(d3, topojson, root));
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(require('d3'), require('topojson'));
  } else {
    root.Cathmhaol = factory(root.d3, root.topojson, root);
  }
}(this, function(d3, topojson, window) {
  'use strict';

  /**
   * Creates a world map. Map can be rendered as 2D (Equirectangular) or as a globe (Orthographic), which is the default
   *
   * @param     {string|HTMLElement} CONTAINER   The unique ID of the HTML element to contain the object
   * @param     {number} WIDTH                   The diameter of the globe or the width of the map in pixels
   * @param     {string} STYLE                   The style to use
   * @param     {string|HTMLElement} DESCRIPTOR  The element (or unique id identifying it) to contain the descriptor table
   *
   * @requires  d3            (http://d3js.org/d3.v3.min.js)
   * @requires  d3.geo        (http://d3js.org/d3.geo.projection.v0.min.js)
   * @requires  topoJSON      (http://d3js.org/topojson.v1.min.js)
   * @requires  topoJSONdata  (e.g. world-110m.json)
   *
   * @author    Robert King (hrobertking@cathmhaol.com)
   *
   * @version   3.2
   */
  d3.geo.earth = function(CONTAINER, WIDTH, STYLE, DESCRIPTOR) {
    /**
     * Adds click event listener for a country
     * @type     {string}
     * @return   {void}
     * @param    {function} handler
     */
    this.addOnCountryClick = function(handler) {
      if (typeof handler === 'function') {
        COUNTRY_HANDLERS.push(handler);
      }
      return SELF;
    };

    /**
     * Adds click event listener for a country
     * @type     {string}
     * @return   {void}
     * @param    {function} handler
     */
    this.addOnMarkerClick = function(handler) {
      if (typeof handler === 'function') {
        MARKER_HANDLERS.push(handler);
      }
      return SELF;
    };

    /**
     * Border color in hexadecimal format, e.g. #ff0000
     * @type     {string}
     * @default  "#ff0000"
     */
    this.borderColor = function(value) {
      /**
       * validate that we have a hexadecimal color that is exactly 6 bytes
       */
      if ((/^\#[A-F0-9]{6}/i).test(value)) {
        PALETTE.border = value;
      }
      return PALETTE.border;
    };

    /**
     * Sets the allow toggle flag for the descriptor table
     * @type     {boolean}
     * @default  true
     */
    this.descriptor = function(value) {
      POPUP_DESCRIPTOR = value ? true : false;
      return POPUP_DESCRIPTOR;
    };

    /**
     * The HTML element that is the parent for the map
     * @type     {HTMLElement}
     */
    this.element = function(value) {
      var is_table = false
        , caption
        , closer
      ;

      /**
       * if a string is passed, try to get an element with that id
       */
      value = getElement(value);

      if (value) {
        /**
         * Set the object ID if we need to
         */
        CONTAINER.setAttribute('id', (CONTAINER.id || 'viz-' + ID + '-container'));

        /**
         * If the element is a table, use the table as marker data and
         * create a container for the visualization
         */
        if (CONTAINER.nodeName.toLowerCase() === 'table') {
          is_table = true;

          /**
           * Set the table descriptor
           */
          DESCRIPTOR = CONTAINER;
          ID = CONTAINER.id || ID;

          /**
           * Set the visualization container
           */
          CONTAINER = document.createElement('div');
          CONTAINER.id = (!isNaN(ID) ? 'viz-' : '') + ID + '-container';

          /**
           * Hide the table descriptor
           */
          DESCRIPTOR.style.backgroundColor = '#fff';
          DESCRIPTOR.style.cursor = 'default';
          DESCRIPTOR.style.position = 'absolute';
          DESCRIPTOR.style.zIndex = 1000;
          DESCRIPTOR.style.clip = 'rect(0, 0, 0, 0)';

          /**
           * Add a dynamic close button
           */
          closer = document.createElement('button');
          closer.innerHTML = '&times;';
          closer.style = 'float:right; font-size:0.8em; height:1.5em; margin:0; padding:0; width:1.5em;';

          caption = DESCRIPTOR.createCaption();
          caption.style.overflow = 'auto';
          caption.appendChild(closer);

          /**
           * Toggle the descriptor table and pause/resume rotation
           */
          function descriptorToggle() {
            var isClipped = !(/auto/).test(DESCRIPTOR.style.clip);

            if (POPUP_DESCRIPTOR) {
              DESCRIPTOR.style.clip = isClipped ? 'auto' : 'rect(0, 0, 0, 0)';
              if (isClipped) {
                rotationPause();
              } else {
                rotationStart();
              }
            }
          }

          /**
           * Add click handlers for the descriptor table
           */
          if (CONTAINER.attachEvent) {
            CONTAINER.attachEvent('onclick', descriptorToggle);
            closer.attachEvent('onclick', descriptorToggle);
          } else {
            CONTAINER.addEventListener('click', descriptorToggle);
            closer.addEventListener('click', descriptorToggle);
          }

          /**
           * Add the visualization to the document
           */
          DESCRIPTOR.parentNode.insertBefore(CONTAINER, DESCRIPTOR.nextSibling);
        } else {
          CONTAINER = value;
        }

        /**
         * Set the vizualization ID
         */
        ID = CONTAINER.getAttribute('id');

        /**
         * set the width to the new container
         */
        WIDTH = (WIDTH || (CONTAINER && CONTAINER.nodeType === 1) ? CONTAINER.clientWidth : 160);

        /**
         * parse the element if it's marker data
         */
        if (is_table) {
          ID = ID.replace(/\-container$/, '');
          SELF.parseMarkerData(DESCRIPTOR);
        }
      }
      return CONTAINER;
    };

    /**
     * Returns a string array containing event names
     * @type     {string[]}
     */
    this.events = function(value) {
      /**
       * READ-ONLY
       */
      return EVENTS;
    };

    /**
     * The ID of the visualization
     * @type     {string}
     */
    this.id = function(value) {
      /**
       * READ-ONLY
       */
      return SELF.markerDataId() + '-earth-viz';
    };

    /**
     * Marker animation, e.g., 'pulse' or 'ping'. An enum of pulse, ping, and none
     * @type     {string}
     * @default  "pulse"
     */
    this.markerAnimation = function(value) {
      if ((/^(pulse|ping|none)$/).test(value)) {
        MARKER_ANIMATION = value;
      }
      return MARKER_ANIMATION;
    };

    /**
     * Marker animation duration, in milliseconds. The value must be greater than 100ms.
     * @type     {number}
     * @default  1500
     */
    this.markerAnimationDuration = function(value) {
      if (!isNaN(value) && value > 100) {
        MARKER_ANIMATION_DURATION = Math.floor(value);
      }
      return MARKER_ANIMATION_DURATION;
    };

    /**
     * Marker color in hexadecimal format, e.g. #ff0000
     * @type     {string}
     * @default  "#ff0000"
     */
    this.markerColor = function(value) {
      /**
       * validate that we have a hexadecimal color that is exactly 6 bytes
       */
      if ((/^\#[A-F0-9]{6}/i).test(value)) {
        PALETTE.marker = value;
      }
      return PALETTE.marker;
    };

    /**
     * The ID attribute of the marker data table
     * @type     {string}
     */
    this.markerDataId = function(value) {
      var old = MARKER_ID;

      if (typeof value === 'string' && !(/^[0-9]/).test(value)) {
        MARKER_ID = isNaN(value) ? value : 'viz-' + ID;
      }

      /**
       * if the marker id has changed, fix the window reference
       */
      if (old !== MARKER_ID) {
        delete window[old + '-earth-viz'];
        window[SELF.id()] = SELF;
      }

      return MARKER_ID;
    };

    /**
     * The column headers of the marker description table. Note: column headers must match the data returned in the marker file
     * @type     {string[]}
     */
    this.markerDescriptionData = function(value) {
      if (value === null || value === undefined || value instanceof Array) {
        MARKER_DESCRIPTION = value;
      }
      return MARKER_DESCRIPTION;
    };

    /**
     * URI of the marker file, e.g., '/popmap/cities.csv', and the type, e.g. csv or json
     * @type     {object}
     */
    this.markerFile = function(uri, type) {
      uri = (typeof uri === 'string') ? { name:uri, type:type } : uri;
      uri = (uri.name && uri.type) ? {name:uri.name, type:uri.type} : null;
      if (uri && uri.name) {
        MARKER_FILE.name = uri.name;
        MARKER_FILE.type = (/csv|json/i).test(uri.type) ? uri.type : 'csv';
      }
      return MARKER_FILE;
    };

    /**
     * The opacity of the marker
     * @type     {float}
     * @default  1
     */
    this.markerOpacity = function(value) {
      /**
       * make sure the value is between 0.0 (transparent) and 1.0 (opaque)
       */
      if (!isNaN(value)) {
        value = Math.floor(value * 10);
        if (value > -1 && value < 11) {
          PALETTE.markerOpacity = (value / 10).toString();
        }
      }
      return PALETTE.markerOpacity;
    };

    /**
     * Default marker size in pixels
     * @type     {integer}
     * @default  3
     */
    this.markerSize = function(value) {
      var reg = /\%/
        , pc = reg.test(value)
      ;

      if (pc) {
        value = value.replace(reg, '');
      }
      if (!isNaN(value) && value > 1) {
        MARKER_SIZE = Math.floor(value);
        MARKER_RELATIVE_SIZE = pc;
      }
      return MARKER_SIZE;
    };

    /**
     * Adds an event handler
     * @return   {void}
     * @param    {string} eventname
     * @param    {function} handler
     */
    this.on = function(eventname, handler) {
      var evt
        , i
        , handlers
      ;

      if (typeof eventname === 'string' && typeof handler === 'function') {
        eventname = (eventname || '').toLowerCase();
        for (i = 0; i < EVENTS.length; i += 1) {
          evt = (EVENTS[i] || '').toLowerCase();
          /**
           * check to make sure it's an event that is published
           */
          if (eventname === evt) {
            handlers = EVENT_HANDLERS[eventname] || [ ];
            handlers.push(handler);
            EVENT_HANDLERS[eventname] = handlers;
            break;
          }
        }
      }
      return SELF;
    };

    /**
     * Object specifying color palette, containing 'border', 'countries', 'marker', 'ocean'
     * @type     {object}
     */
    this.palette = function(value) {
      /**
       * Convert a specification to an array and validate the elements
       * @return   {string[]}
       * @param    {string[]|string} colors
       */
      function validate(colors) {
        var i
          , reg = /(\#[A-Z0-9]{6})[^A-Z0-9]?/i
        ;

        /**
         * if we get a string, convert it to an array
         */
        if (typeof colors === 'string') {
          colors = colors.split(reg);
        }

        if (colors instanceof Array) {
          /**
           * loop through the colors and if they're not valid, remove them
           */
          for (i = 0; i < colors.length; i += 1) {
            if (!reg.test(colors[i])) {
              colors.splice(i, 1);
            }
          }
        } else {
          colors = [ ];
        }
        return colors;
      }

      var border = value.border
        , countries = value.colors || value.countries
        , marker = value.marker
        , ocean = value.ocean || value.oceans
      ;

      if (border || countries || marker || ocean) {
        PALETTE.border = validate(border).shift() || PALETTE.border;
        PALETTE.countries = validate(countries) || PALETTE.countries;
        PALETTE.marker = validate(marker).shift() || PALETTE.marker;
        PALETTE.ocean = validate(ocean).shift() || PALETTE.ocean;
      } else if (value instanceof Array) {
        PALETTE.countries = validate(value) || PALETTE.countries;
      }
      return PALETTE;
    };

    /**
     * Parses a data table to load marker data
     * @return   {void}
     * @param    {string|HTMLElement} table
     */
    this.parseMarkerData = function(table) {
      var hdrs = [ ]
        , index
        , tbody
        , tcells
        , thead
      ;

      /**
       * Convert a table row to an object given a specified order of properties
       * @return   {object}
       * @param    {string[]} spec
       * @param    {HTMLElement} trow
       */
      function DataElement(spec, trow) {
        var ndx, obj = { };
        if (spec && trow) {
          for (ndx = 0; ndx < spec.length; ndx += 1) {
            obj[spec[ndx]] = trow.cells[ndx].innerHTML;
          }
        }
        return obj;
      }

      try {
        /**
         * make sure the marker table flag is reset, in case the table is null
         */
        MARKER_TABLE = false;

        /**
         * normalize the parameter to an HTMLElement
         */
        table = getElement(table);
        if (table && table.nodeName.toLowerCase() === 'table') {
          /**
           * set the marker table id
           */
          SELF.markerDataId(table.id);

          DESCRIPTOR = DESCRIPTOR || table.parentNode;
          MARKER_DATA = [ ];

          /**
           * parse the table
           */
          thead = table.getElementsByTagName('thead').item(0);
          tbody = table.getElementsByTagName('tbody').item(0);
          if (thead && tbody) {
            /**
             * get the column headers
             */
            tcells = thead.rows[0].cells;
            for (index = 0; index < tcells.length; index += 1) {
              hdrs.push(tcells[index].innerHTML);
            }

            /**
             * get the data
             */
            tcells = tbody.rows;
            for (index = 0; index < tcells.length; index += 1) {
              MARKER_DATA.push(new DataElement(hdrs, tcells[index]));
            }

            /**
             * set the flag so we don't generate the data table again
             */
            MARKER_TABLE = true;

            /**
             * fire the event to show we have the data
             */
            fire('marker-data');
          }
        }
      } catch (ignore) {
      }
      return SELF;
    };

    /**
     * Retrieves the marker data and fires an event when the marker data is retrieved. If an interval (in seconds) is specified, it is used to automatically refresh the marker data. The interval value must be greater than 59 seconds.
     * @return   {void}
     * @param    {string|number} interval
     */
    this.refreshMarkerData = function(interval) {
      /**
       * get marker data
       */
      getMarkerData();

      /**
       * if an interval is provided, set it to get the marker data
       */
      interval = Math.floor(interval || 0);
      if (interval && interval > 59) {
        setInterval(getMarkerData, (interval * 1000));
      }
      return SELF;
    };

    /**
     * Renders the map.
     * @return   {void}
     * @param    {string} style
     * @example  var earth = new d3.earth('flatmap'); earth.render('2D');
     * @example  var earth = new d3.earth('flatmap'); earth.render();
     */
    this.render = function(style) {
      /**
       * Handlers for drag events listening to dragable regions
       * @return   {void}
       */
      function dragended() {
        DRAGGING = false;
        THEN = Date.now();
        ROTATE_3D = rotates();
      }
      function dragged(d, i) {
        /**
         * the map can only display 180 degrees of longitude and 90 degrees
         * of latitude at one time, so we convert the delta in position to
         * those ranges before we rotate the projection and update the path
         * elements
         */
        var lambda = d3.scale.linear().domain([0, WIDTH]).range([0, 180])
          , phi = d3.scale.linear().domain([0, WIDTH]).range([0, -90])
        ;

        LOCATION = coordinateNormalize([ LOCATION[0]+lambda(d3.event.dx)
                                       , LOCATION[1]+phi(d3.event.dy)
                                       , LOCATION[2] || 0 ]);

        projection.rotate(LOCATION);
        d3.select('#viz-' + ID + '-svg').selectAll('path')
                           .attr('d', PROJECTION_PATH.projection(projection));
      }
      function dragstarted() {
        DRAGGING = true;
        rotationPause();
      }

      /**
       * Handlers for zoom events listening to zoomable regions
       * @return   {void}
       */
      function zoomed(evt) {
        var container = d3.select(this);
        if (d3.event.scale === 1) {
          container.attr('transform', null);
        } else {
          container.attr('transform', 'translate('+d3.event.translate+')' +
                         'scale('+d3.event.scale+')');
        }
      }

      /**
       * Maps a topo id to the ISO 3166 Alpha-2 code and name (English)
       * @return   {object}
       * @param    {number} id
       */
      function topoMap(id) {
        var data = [
            { topo:-1, iso:"CY", name:"Northern Cyprus" },
            { topo:-2, iso:"RS", name:"Kosovo" },
            { topo:-3, iso:"SO", name:"Somaliland" },
            { topo:4, iso:"AF", name:"Afghanistan" },
            { topo:8, iso:"AL", name:"Albania" },
            { topo:10, iso:"AQ", name:"Antarctica" },
            { topo:12, iso:"DZ", name:"Algeria" },
            { topo:16, iso:"AS", name:"American Samoa" },
            { topo:20, iso:"AD", name:"Andorra" },
            { topo:24, iso:"AO", name:"Angola" },
            { topo:28, iso:"AG", name:"Antigua and Barbuda" },
            { topo:31, iso:"AZ", name:"Azerbaijan" },
            { topo:32, iso:"AR", name:"Argentina" },
            { topo:36, iso:"AU", name:"Australia" },
            { topo:40, iso:"AT", name:"Austria" },
            { topo:44, iso:"BS", name:"Bahamas" },
            { topo:48, iso:"BH", name:"Bahrain" },
            { topo:50, iso:"BD", name:"Bangladesh" },
            { topo:51, iso:"AM", name:"Armenia" },
            { topo:52, iso:"BB", name:"Barbados" },
            { topo:56, iso:"BE", name:"Belgium" },
            { topo:60, iso:"BM", name:"Bermuda" },
            { topo:64, iso:"BT", name:"Bhutan" },
            { topo:68, iso:"BO", name:"Bolivia, Plurinational State of" },
            { topo:70, iso:"BA", name:"Bosnia and Herzegovina" },
            { topo:72, iso:"BW", name:"Botswana" },
            { topo:74, iso:"BV", name:"Bouvet Island" },
            { topo:76, iso:"BR", name:"Brazil" },
            { topo:84, iso:"BZ", name:"Belize" },
            { topo:86, iso:"IO", name:"British Indian Ocean Territory" },
            { topo:90, iso:"SB", name:"Solomon Islands" },
            { topo:92, iso:"VG", name:"Virgin Islands, British" },
            { topo:96, iso:"BN", name:"Brunei Darussalam" },
            { topo:100, iso:"BG", name:"Bulgaria" },
            { topo:104, iso:"MM", name:"Myanmar" },
            { topo:108, iso:"BI", name:"Burundi" },
            { topo:112, iso:"BY", name:"Belarus" },
            { topo:116, iso:"KH", name:"Cambodia" },
            { topo:120, iso:"CM", name:"Cameroon" },
            { topo:124, iso:"CA", name:"Canada" },
            { topo:132, iso:"CV", name:"Cape Verde" },
            { topo:136, iso:"KY", name:"Cayman Islands" },
            { topo:140, iso:"CF", name:"Central African Republic" },
            { topo:144, iso:"LK", name:"Sri Lanka" },
            { topo:148, iso:"TD", name:"Chad" },
            { topo:152, iso:"CL", name:"Chile" },
            { topo:156, iso:"CN", name:"China" },
            { topo:158, iso:"TW", name:"Taiwan, Province of China" },
            { topo:162, iso:"CX", name:"Christmas Island" },
            { topo:166, iso:"CC", name:"Cocos (Keeling) Islands" },
            { topo:170, iso:"CO", name:"Colombia" },
            { topo:174, iso:"KM", name:"Comoros" },
            { topo:175, iso:"YT", name:"Mayotte" },
            { topo:178, iso:"CG", name:"Congo" },
            { topo:180, iso:"CD", name:"Congo, the Democratic Republic of the" },
            { topo:184, iso:"CK", name:"Cook Islands" },
            { topo:188, iso:"CR", name:"Costa Rica" },
            { topo:191, iso:"HR", name:"Croatia" },
            { topo:192, iso:"CU", name:"Cuba" },
            { topo:196, iso:"CY", name:"Cyprus" },
            { topo:203, iso:"CZ", name:"Czech Republic" },
            { topo:204, iso:"BJ", name:"Benin" },
            { topo:208, iso:"DK", name:"Denmark" },
            { topo:212, iso:"DM", name:"Dominica" },
            { topo:214, iso:"DO", name:"Dominican Republic" },
            { topo:218, iso:"EC", name:"Ecuador" },
            { topo:222, iso:"SV", name:"El Salvador" },
            { topo:226, iso:"GQ", name:"Equatorial Guinea" },
            { topo:231, iso:"ET", name:"Ethiopia" },
            { topo:232, iso:"ER", name:"Eritrea" },
            { topo:233, iso:"EE", name:"Estonia" },
            { topo:234, iso:"FO", name:"Faroe Islands" },
            { topo:238, iso:"FK", name:"Falkland Islands (Malvinas)" },
            { topo:239, iso:"GS", name:"South Georgia and the South Sandwich Islands" },
            { topo:242, iso:"FJ", name:"Fiji" },
            { topo:246, iso:"FI", name:"Finland" },
            { topo:248, iso:"AX", name:"�land Islands" },
            { topo:250, iso:"FR", name:"France" },
            { topo:254, iso:"GF", name:"French Guiana" },
            { topo:258, iso:"PF", name:"French Polynesia" },
            { topo:260, iso:"TF", name:"French Southern Territories" },
            { topo:262, iso:"DJ", name:"Djibouti" },
            { topo:266, iso:"GA", name:"Gabon" },
            { topo:268, iso:"GE", name:"Georgia" },
            { topo:270, iso:"GM", name:"Gambia" },
            { topo:275, iso:"PS", name:"Palestine, State of" },
            { topo:276, iso:"DE", name:"Germany" },
            { topo:288, iso:"GH", name:"Ghana" },
            { topo:292, iso:"GI", name:"Gibraltar" },
            { topo:296, iso:"KI", name:"Kiribati" },
            { topo:300, iso:"GR", name:"Greece" },
            { topo:304, iso:"GL", name:"Greenland" },
            { topo:308, iso:"GD", name:"Grenada" },
            { topo:312, iso:"GP", name:"Guadeloupe" },
            { topo:316, iso:"GU", name:"Guam" },
            { topo:320, iso:"GT", name:"Guatemala" },
            { topo:324, iso:"GN", name:"Guinea" },
            { topo:328, iso:"GY", name:"Guyana" },
            { topo:332, iso:"HT", name:"Haiti" },
            { topo:334, iso:"HM", name:"Heard Island and McDonald Islands" },
            { topo:336, iso:"VA", name:"Holy See (Vatican City State)" },
            { topo:340, iso:"HN", name:"Honduras" },
            { topo:344, iso:"HK", name:"Hong Kong" },
            { topo:348, iso:"HU", name:"Hungary" },
            { topo:352, iso:"IS", name:"Iceland" },
            { topo:356, iso:"IN", name:"India" },
            { topo:360, iso:"ID", name:"Indonesia" },
            { topo:364, iso:"IR", name:"Iran, Islamic Republic of" },
            { topo:368, iso:"IQ", name:"Iraq" },
            { topo:372, iso:"IE", name:"Ireland" },
            { topo:376, iso:"IL", name:"Israel" },
            { topo:380, iso:"IT", name:"Italy" },
            { topo:384, iso:"CI", name:"C�te d'Ivoire" },
            { topo:388, iso:"JM", name:"Jamaica" },
            { topo:392, iso:"JP", name:"Japan" },
            { topo:398, iso:"KZ", name:"Kazakhstan" },
            { topo:400, iso:"JO", name:"Jordan" },
            { topo:404, iso:"KE", name:"Kenya" },
            { topo:408, iso:"KP", name:"Korea, Democratic People's Republic of" },
            { topo:410, iso:"KR", name:"Korea, Republic of" },
            { topo:414, iso:"KW", name:"Kuwait" },
            { topo:417, iso:"KG", name:"Kyrgyzstan" },
            { topo:418, iso:"LA", name:"Lao People's Democratic Republic" },
            { topo:422, iso:"LB", name:"Lebanon" },
            { topo:426, iso:"LS", name:"Lesotho" },
            { topo:428, iso:"LV", name:"Latvia" },
            { topo:430, iso:"LR", name:"Liberia" },
            { topo:434, iso:"LY", name:"Libya" },
            { topo:438, iso:"LI", name:"Liechtenstein" },
            { topo:440, iso:"LT", name:"Lithuania" },
            { topo:442, iso:"LU", name:"Luxembourg" },
            { topo:446, iso:"MO", name:"Macao" },
            { topo:450, iso:"MG", name:"Madagascar" },
            { topo:454, iso:"MW", name:"Malawi" },
            { topo:458, iso:"MY", name:"Malaysia" },
            { topo:462, iso:"MV", name:"Maldives" },
            { topo:466, iso:"ML", name:"Mali" },
            { topo:470, iso:"MT", name:"Malta" },
            { topo:474, iso:"MQ", name:"Martinique" },
            { topo:478, iso:"MR", name:"Mauritania" },
            { topo:480, iso:"MU", name:"Mauritius" },
            { topo:484, iso:"MX", name:"Mexico" },
            { topo:492, iso:"MC", name:"Monaco" },
            { topo:496, iso:"MN", name:"Mongolia" },
            { topo:498, iso:"MD", name:"Moldova, Republic of" },
            { topo:499, iso:"ME", name:"Montenegro" },
            { topo:500, iso:"MS", name:"Montserrat" },
            { topo:504, iso:"MA", name:"Morocco" },
            { topo:508, iso:"MZ", name:"Mozambique" },
            { topo:512, iso:"OM", name:"Oman" },
            { topo:516, iso:"NA", name:"Namibia" },
            { topo:520, iso:"NR", name:"Nauru" },
            { topo:524, iso:"NP", name:"Nepal" },
            { topo:528, iso:"NL", name:"Netherlands" },
            { topo:531, iso:"CW", name:"Cura�ao" },
            { topo:533, iso:"AW", name:"Aruba" },
            { topo:534, iso:"SX", name:"Sint Maarten (Dutch part)" },
            { topo:535, iso:"BQ", name:"Bonaire, Sint Eustatius and Saba" },
            { topo:540, iso:"NC", name:"New Caledonia" },
            { topo:548, iso:"VU", name:"Vanuatu" },
            { topo:554, iso:"NZ", name:"New Zealand" },
            { topo:558, iso:"NI", name:"Nicaragua" },
            { topo:562, iso:"NE", name:"Niger" },
            { topo:566, iso:"NG", name:"Nigeria" },
            { topo:570, iso:"NU", name:"Niue" },
            { topo:574, iso:"NF", name:"Norfolk Island" },
            { topo:578, iso:"NO", name:"Norway" },
            { topo:580, iso:"MP", name:"Northern Mariana Islands" },
            { topo:581, iso:"UM", name:"United States Minor Outlying Islands" },
            { topo:583, iso:"FM", name:"Micronesia, Federated States of" },
            { topo:584, iso:"MH", name:"Marshall Islands" },
            { topo:585, iso:"PW", name:"Palau" },
            { topo:586, iso:"PK", name:"Pakistan" },
            { topo:591, iso:"PA", name:"Panama" },
            { topo:598, iso:"PG", name:"Papua New Guinea" },
            { topo:600, iso:"PY", name:"Paraguay" },
            { topo:604, iso:"PE", name:"Peru" },
            { topo:608, iso:"PH", name:"Philippines" },
            { topo:612, iso:"PN", name:"Pitcairn" },
            { topo:616, iso:"PL", name:"Poland" },
            { topo:620, iso:"PT", name:"Portugal" },
            { topo:624, iso:"GW", name:"Guinea-Bissau" },
            { topo:626, iso:"TL", name:"Timor-Leste" },
            { topo:630, iso:"PR", name:"Puerto Rico" },
            { topo:634, iso:"QA", name:"Qatar" },
            { topo:638, iso:"RE", name:"R�union" },
            { topo:642, iso:"RO", name:"Romania" },
            { topo:643, iso:"RU", name:"Russian Federation" },
            { topo:646, iso:"RW", name:"Rwanda" },
            { topo:652, iso:"BL", name:"Saint Barth�lemy" },
            { topo:654, iso:"SH", name:"Saint Helena, Ascension and Tristan da Cunha" },
            { topo:659, iso:"KN", name:"Saint Kitts and Nevis" },
            { topo:660, iso:"AI", name:"Anguilla" },
            { topo:662, iso:"LC", name:"Saint Lucia" },
            { topo:663, iso:"MF", name:"Saint Martin (French part)" },
            { topo:666, iso:"PM", name:"Saint Pierre and Miquelon" },
            { topo:670, iso:"VC", name:"Saint Vincent and the Grenadines" },
            { topo:674, iso:"SM", name:"San Marino" },
            { topo:678, iso:"ST", name:"Sao Tome and Principe" },
            { topo:682, iso:"SA", name:"Saudi Arabia" },
            { topo:686, iso:"SN", name:"Senegal" },
            { topo:688, iso:"RS", name:"Serbia" },
            { topo:690, iso:"SC", name:"Seychelles" },
            { topo:694, iso:"SL", name:"Sierra Leone" },
            { topo:702, iso:"SG", name:"Singapore" },
            { topo:703, iso:"SK", name:"Slovakia" },
            { topo:704, iso:"VN", name:"Viet Nam" },
            { topo:705, iso:"SI", name:"Slovenia" },
            { topo:706, iso:"SO", name:"Somalia" },
            { topo:710, iso:"ZA", name:"South Africa" },
            { topo:716, iso:"ZW", name:"Zimbabwe" },
            { topo:724, iso:"ES", name:"Spain" },
            { topo:728, iso:"SS", name:"South Sudan" },
            { topo:729, iso:"SD", name:"Sudan" },
            { topo:732, iso:"EH", name:"Western Sahara" },
            { topo:740, iso:"SR", name:"Suriname" },
            { topo:744, iso:"SJ", name:"Svalbard and Jan Mayen" },
            { topo:748, iso:"SZ", name:"Swaziland" },
            { topo:752, iso:"SE", name:"Sweden" },
            { topo:756, iso:"CH", name:"Switzerland" },
            { topo:760, iso:"SY", name:"Syrian Arab Republic" },
            { topo:762, iso:"TJ", name:"Tajikistan" },
            { topo:764, iso:"TH", name:"Thailand" },
            { topo:768, iso:"TG", name:"Togo" },
            { topo:772, iso:"TK", name:"Tokelau" },
            { topo:776, iso:"TO", name:"Tonga" },
            { topo:780, iso:"TT", name:"Trinidad and Tobago" },
            { topo:784, iso:"AE", name:"United Arab Emirates" },
            { topo:788, iso:"TN", name:"Tunisia" },
            { topo:792, iso:"TR", name:"Turkey" },
            { topo:795, iso:"TM", name:"Turkmenistan" },
            { topo:796, iso:"TC", name:"Turks and Caicos Islands" },
            { topo:798, iso:"TV", name:"Tuvalu" },
            { topo:800, iso:"UG", name:"Uganda" },
            { topo:804, iso:"UA", name:"Ukraine" },
            { topo:807, iso:"MK", name:"Macedonia, the former Yugoslav Republic of" },
            { topo:818, iso:"EG", name:"Egypt" },
            { topo:826, iso:"GB", name:"United Kingdom" },
            { topo:831, iso:"GG", name:"Guernsey" },
            { topo:832, iso:"JE", name:"Jersey" },
            { topo:833, iso:"IM", name:"Isle of Man" },
            { topo:834, iso:"TZ", name:"Tanzania, United Republic of" },
            { topo:840, iso:"US", name:"United States" },
            { topo:850, iso:"VI", name:"Virgin Islands, U.S." },
            { topo:854, iso:"BF", name:"Burkina Faso" },
            { topo:858, iso:"UY", name:"Uruguay" },
            { topo:860, iso:"UZ", name:"Uzbekistan" },
            { topo:862, iso:"VE", name:"Venezuela, Bolivarian Republic of" },
            { topo:876, iso:"WF", name:"Wallis and Futuna" },
            { topo:882, iso:"WS", name:"Samoa" },
            { topo:887, iso:"YE", name:"Yemen" },
            { topo:894, iso:"ZM", name:"Zambia" }
          ]
            , i = data.length
        ;
        while (i -= 1 > -1) {
          if (data[i].topo === id) {
            return data[i];
          }
        }
        return { topo:id, iso:null, name:null };
      }

      /**
       * set the style if it's passed in
       */
      if (style) {
        STYLE = PROJECTIONS.map(style);
      }

      /**
       * we only start rendering if we have a containing element
       */
      if (CONTAINER) {
        /**
         * scaleExtent sets the amount of minimum and maximum zoom
         * in this case, it's 1x to 10x
         */
         var projection
          , zoom = d3.behavior.zoom().scaleExtent([1, 10]).on('zoom', zoomed)
        ;

        /**
         * set global variables
         */
        rotationTimerEnd();
        projection = (STYLE || { }).projection;

        if (projection) {
          /**
           * create the SVG and initialize the mouse/touch handlers
           */
          if (!document.getElementById('viz-' + ID + '-svg')) {
            /**
             * create an svg element that is a square - rectangular
             * maps will display with bottom and top margin, but globes
             * will take up all available real estate
             */
            d3.select(CONTAINER).append('svg')
                .attr('aria-hidden', 'true')
                .attr('height', WIDTH)
                .attr('id', 'viz-' + ID + '-svg')
                .attr('width', WIDTH)
              ;

            /**
             * add the map container
             */
            d3.select('#viz-' + ID + '-svg').append('g').attr('id', 'viz-' + ID + '-svg-map');
          }

          /**
           * load the topography and draw the detail in the callback
           */
          var cnt = topojson.feature(d3.geo.earth.topoJSONdata, d3.geo.earth.topoJSONdata.objects.countries).features
            , color = d3.scale.ordinal().range(PALETTE.countries)
            , nexto = topojson.neighbors(d3.geo.earth.topoJSONdata.objects.countries.geometries)
          ;

          /**
           * we have the geo data so now we can set up everything
           */
          switch (STYLE.shape) {
            case 'sphere':
              projection.scale(WIDTH/2);
              break;
            default:
              projection.scale(getScale());
              break;
          }
          /**
           * center the projection
           */
          projection.translate(center());
          if (STYLE.parallels) {
            projection.parallels(STYLE.parallels);
          }
          PROJECTION_PATH = d3.geo.path().projection(projection);

          /**
           * delete existing oceans, land, and markers
           */
          d3.select('#viz-' + ID + '-svg-oceans').remove();
          d3.select('#viz-' + ID + '-svg-countries').remove();
          d3.select('#viz-' + ID + '-svg-markers').remove();

          /**
           * draw the oceans
           */
          d3.select('#viz-' + ID + '-svg-map').append('g').attr('id', 'viz-' + ID + '-svg-oceans')
              .append('path')
                .datum({type:'Sphere'})
                .attr('id', 'viz-' + ID + '-svg-oceans-path')
                .attr('d', PROJECTION_PATH)
                .style('fill', PALETTE.ocean)
                .style('stroke', '#333')
                .style('stroke-width', '1.5px')
            ;

          /**
           * draw the countries
           */
          d3.select('#viz-' + ID + '-svg-map').append('g').attr('id', 'viz-' + ID + '-svg-countries')
            .selectAll('path').data(cnt).enter().append('path')
              .attr('class', function(d, i) {
                 return 'country '+topoMap(d.id).iso;
               })
              .attr('d', PROJECTION_PATH)
              .style('fill', function(d, i) {
                 d.iso = topoMap(d.id).iso;
                 d.name = topoMap(d.id).name;
                 return color(d.color = d3.max(nexto[i], function(n) {
                   return cnt[n].color;
                 }) + 1 | 0);
               })
              .style('stroke', PALETTE.border)
              .style('stroke-width', '0.5px')
            ;

          /**
           * assign the click handlers if defined
           */
          d3.select('#viz-' + ID + '-svg-countries').selectAll('path.country')
            .on('click', function country_onClick(country) {
               var i;
               if (!DRAGGING) {
                 for (i = 0; i < COUNTRY_HANDLERS.length; i += 1) {
                   COUNTRY_HANDLERS[i].call(country);
                 }
               }
             });

          /**
           * get marker data
           */
          getMarkerData();

          /**
           * add the map interaction handlers
           */
          d3.select('#viz-' + ID + '-svg-map')
              .call(zoom)
              .call( d3.behavior.drag()
                       .on('drag', dragged)
                       .on('dragend', dragended)
                       .on('dragstart', dragstarted)
               )
            ;

          /**
           * we're done processing, so start the rotation
           */
          rotationStart();
          fire('rendered', [projection]);
        }
      }
      return SELF;
    };

    /**
     * Returns true if the map has been rendered
     * @type     {boolean}
     */
    this.rendered = function(value) {
      return is_rendered();
    };

    /**
     * Map is rotatable, i.e., a globe
     * @type     {boolean}
     */
    this.rotatable = function(value) {
      /**
       * READ-ONLY
       */
      return rotates();
    };

    /**
     * Map is rotating, i.e., rotable and the animation is set to run
     * @type     {boolean}
     */
    this.rotating = function(value) {
      /**
       * READ-ONLY
       */
      return ( rotates() && ROTATE_3D && !ROTATE_STOPPED );
    };

    /**
     * Reduce the rotation velocity
     * @return   {void}
     * @param    {number} rate
     */
    this.rotationDecrease = function(rate) {
      if (VELOCITY > 0.01) {
        rate = rate || '';
        if (typeof rate === 'string' && rate.indexOf('%') > -1) {
          rate = rate.replace(/\%/g, '') / 100;
          rate = (( rate || 0 ) * VELOCITY);
        }
        rate = ((isNaN(rate) ? 0.005 : rate) || 0.005);
        VELOCITY -= rate;
        fire('slowed');
      }
      return SELF;
    };

    /**
     * Reduce the rotation velocity
     * @return   {void}
     * @param    {number} rate
     */
    this.rotationIncrease = function(rate) {
      if (VELOCITY > 0.01) {
        rate = rate || '';
        if (typeof rate === 'string' && rate.indexOf('%') > -1) {
          rate = rate.replace(/\%/g, '') / 100;
          rate = (( rate || 0 ) * VELOCITY);
        }
        rate = ((isNaN(rate) ? 0.005 : rate) || 0.005);
        VELOCITY += rate;
        fire('accelerated');
      }
      return SELF;
    };

    /**
     * Pause the rotation. Rotation that is 'paused' is waiting for a implicit triggering event, such as a 'mouse up' or 'drag end'.
     * @return   {void}
     */
    this.rotationPause = function(value) {
      /**
       * this is a single-purpose function
       */
      rotationPause();
      return SELF;
    };

    /**
     * Restart the rotation
     * @return   {void}
     */
    this.rotationResume = function(value) {
      /**
       * this is a single-purpose function
       */
      rotationStart();
      fire('resumed');
      return SELF;
    };

    /**
     * Stop the rotation. Rotation that is 'stopped' is waiting for an explicity restart.
     * @return   {void}
     */
    this.rotationStop = function(value) {
      /**
       * this is a single-purpose function
       */
      ROTATE_STOPPED = true;
      return SELF;
    };

    /**
     * The style of the map to generate
     * @type     {string}
     */
    this.style = function(value) {
      value = PROJECTIONS.map(value);
      if (value) {
        STYLE = value;
      }
      return STYLE.name;
    };

    /**
     * An array of supported map styles
     * @type     {string[]}
     */
    this.supportedTypes = function(value) {
      /**
       * READ-ONLY
       */
      var supported = [ ]
        , prop
        , proj = PROJECTIONS
      ;
      for (prop in proj) {
        if (proj.hasOwnProperty(prop)) {
          if (typeof proj[prop] !== 'function' && proj[prop].name) {
            supported.push(proj[prop].name);
          }
        }
      }
      return supported;
    };

    /**
     * URI of the topojson file, e.g., '/world-110m.json'
     * @type     {string}
     */
    this.topoFile = function(value) {
      if (typeof value === 'string' && value !== '') {
        d3.json(TOPO, function(error, data) {
            d3.geo.earth.topoJSONdata = data;
          });
      }
      return value;
    };

    /**
     * The topoJSON data object
     * @type     {object}
     */
    this.topoJSON = function(value) {
      if (typeof value === 'string' && value !== '') {
        this.topoFile(value);
      } else if (typeof value === 'object') {
        d3.geo.earth.topoJSONdata = value;
      }
      return d3.geo.earth.topoJSONdata;
    };

    /**
     * Animates the transition from the current map style to the map style provided. Animation runs for the specified duration (in milliseconds) or 750ms. Because of the overhead involved in transitions, it is recommended to limit the number of transitions, also, be aware that there may be some difficulties in transitioning between two different projections and it may be better to render the new style rather than animate the transition.
     * @return   {void}
     * @param    {string} style
     * @param    {number} duration
     */
    this.transition = function(style, duration) {
      /**
       * Clean up function to run at the end of the transition
       * @return   {void}
       */
      function finalize() {
        /**
         * set the projection
         */
        PROJECTION_PATH = path;
        STYLE = style;
        markerDraw();
        rotationStart();
      }
      /**
       * Calculate the in-between state for two projections
       * @return   {void}
       * @param    {projection} beginning
       * @param    {projection} ending
       */
      function projectionTween(beginning, ending) {
        return function(d) {
          var t = 0
            , projection = d3.geo.projection(project).scale(1).translate(center())
            , path = d3.geo.path().projection(projection)
          ;

          function project(lambda, phi) {
            lambda *= 180 / Math.PI;
            phi *= 180 / Math.PI;
            var p0 = beginning([lambda, phi]), p1 = ending([lambda, phi]);
            return [(1 - t) * p0[0] + t * p1[0], (1 - t) * -p0[1] + t * -p1[1]];
          }

          return function(_) {
            t = _;
            return path(d);
          };
        };
      }

      var path
        , paths = d3.select('#viz-' + ID + '-svg-map').selectAll('path')
        , projection = STYLE.projection
        , size = paths.size()
      ;

      style = PROJECTIONS.map(style);
      if (style && style.projection) {
        /**
         * make sure any duration passed is valid
         */
        duration = isNaN(duration) ? 0 : Math.floor(duration);
        path = d3.geo.path().projection(style.projection.translate(center()));

        /**
         * prepare the destination projection
         */
        switch (style.name) {
          case 'Globe':
          case 'Orthographic':
            style.projection.scale(WIDTH/2);
            break;
          default:
            style.projection.scale(getScale());
        }
        if (style.parallels) {
          style.projection.parallels(style.parallels);
        }

        /**
         * stop any rotation
         */
        rotationTimerEnd();

        /**
         * remove any markers
         */
        markerDelete();

        /**
         * rotate to 0, 0
         */
        rotateToLocation([0, 0, 0]);

        /**
         * set up the tween
         */
        paths.transition()
            .duration(duration || 750)
            .attrTween('d', projectionTween(projection, projection = style.projection))
            .each('end', function() {
               size -= 1;
               if (size < 1) {
                 finalize();
               }
             })
          ;
      }
      return SELF;
    };

    /**
     * Animates travel along routes defined in the specified data - identified by a resource object (i.e., a URL string or an object with 'name' and type' properties) or an array of objects with 'origin' and 'destination' properties - using the specified marker. The animation runs for the specified duration (in milliseconds) or 1000ms.
     * @return   {void}
     * @param    {string|object|object[]} data
     * @param    {object} marker
     * @param    {number} duration
     * @param    {boolean} loop
     * @param    {boolean} combined
     */
    this.travel = function(data, marker, duration, loop, combined) {
      /**
       * if the map is rendered, execute the subroutine that draws routes
       * otherwise, register the subroutine as a callback on the render event
       */
      if (this.rendered()) {
        route(data, marker, duration, loop, combined);
      } else {
        this.on('rendered', function() {
               route(data, marker, duration, loop, combined);
             });
      }
      return SELF;
    };

    /**
     * Returns the x and y coordinates of the center of the svg
     * @return   {object}
     */
    function center() {
      var svg = document.getElementById('viz-' + ID + '-svg')
        , pos = [0, 0]
      ;
      if (svg) {
        pos[0] = Math.floor(svg.clientWidth/2);
        pos[1] = Math.floor(svg.clientHeight/2);
      }
      return pos;
    }

    /**
     * Normalize a location (longitude, latitude, and roll) between +/-180 longitude and +/-90 latitude
     * @return   {number[]}
     * @param    {number[]} coord
     */
    function coordinateNormalize(coord) {
      /**
       * longitude; range is �180�
       */
      coord[0] = (Math.abs(coord[0]) > 180 ? -1 : 1) * (coord[0] % 180);
      /**
       * latitude; range is �90�
       */
      coord[1] = (Math.abs(coord[1]) >  90 ? -1 : 1) * (coord[1] % 90);
      /**
       * axial tilt is between -90� and 270� so we handle it in steps
       */
      coord[2] = (coord[2] || 0);
      coord[2] = (coord[2] > 270) ? coord[2]-360 : coord[2];
      coord[2] = (coord[2] < -90) ? coord[2]+360 : coord[2];
      return coord;
    }

    /**
     * Fires an event
     * @return   {void}
     * @param    {string} eventname
     * @param    {array} params
     */
    function fire(eventname, params) {
      var i
        , handlers = EVENT_HANDLERS[eventname] || [];
      ;
      for (i = 0; i < handlers.length; i += 1) {
        handlers[i].apply(this, params);
      }
    }

    /**
     * Returns an HTMLElement
     * @return   {HTMLElement}
     * @param    {string|HTMLElement} value
     */
    function getElement(value) {
      if (typeof value === 'string') {
        value = document.getElementById(value);
      }
      if (!value || value.nodeType !== 1) {
        value = null;
      }
      return value;
    }

    /**
     * Gets the marker data from the URI
     * @return   {void}
     */
    function getMarkerData() {
      /**
       * make sure we have everything we need before beginning
       */
      if (d3.csv && d3.json && MARKER_FILE.name && MARKER_FILE.type && is_rendered()) {
        if ((/csv/i).test(MARKER_FILE.type)) {
          /**
           * draw the markers
           */
          d3.csv(MARKER_FILE.name, function(error, markers) {
            if (markers) {
              MARKER_DATA = markers;
              fire('marker-data');
            }
          });
        } else {
          d3.json(MARKER_FILE.name, function(error, markers) {
            if (markers) {
              MARKER_DATA = markers;
              fire('marker-data');
            }
          });
        }
      } else if (MARKER_DATA.length && is_rendered()) {
        fire('marker-data');
      }
    }

    /**
     * Gets the scale for a projection
     * @return   {number}
     */
    function getScale() {
      /**
       * D3 projections are based on an svg that is 960x500. Since determining
       * the scale is complicated and not well-documented, and it seems rather
       * arbitrary, it's easier to just just adjust the scale based on the
       * width of the svg used for the map. This approach will work with nearly
       * all of the projections available in d3.geo - but some have buggy
       * implementations in this area, so we'll drop those.
       */
      var DEFAULT_WIDTH = 960
        , DEFAULT_SCALE = 150
        , modifier = WIDTH/DEFAULT_WIDTH
      ;

      return Math.floor(DEFAULT_SCALE * modifier);
    }

    /**
     * Delete all the existing markers
     * @return   {void}
     */
    function markerDelete() {
      d3.select('#viz-' + ID + '-svg-markers-table').remove();
      d3.select('#viz-' + ID + '-svg-markers').remove();
    }

    /**
     * Draws the location markers based on the marker data
     * @return   {void}
     */
    function markerDraw() {
      var columns = MARKER_DESCRIPTION                  /* column/object property   */
        , container = DESCRIPTOR || CONTAINER           /* contains the table       */
        , data = MARKER_DATA                            /* array containing data    */
        , default_sort                                  /* column to default sort   */
        , id_style = 'cjl-STable-style'                 /* id for the style element */
        , id_table                                      /* id for the marker table  */
        , ndx                                           /* loop index               */
        , rules = [ ]                                   /* stylesheet rules         */
        , style = document.getElementById(id_style)     /* style element            */
        , style_exists = false                          /* style exists             */
        , table                                         /* the table                */
        , tbody                                         /* the body of the table    */
        , tcells                                        /* cells in the table       */
        , tfoot                                         /* the table footer         */
        , thead                                         /* the header of the table  */
        , trows                                         /* rows in the table        */
        , marker_lg                                     /* the largest marker size  */
      ;

      /**
       * Animation transitions. Larger size markers have a longer duration (i.e., they're slower)
       * @return   {void}
       */
      function ping() {
        d3.selectAll('path.marker')
            .transition()
              .duration(function(d) {
                 /**
                  * set the actual animation to 90% of the time
                  * before setting the size-relative duration
                  * and setting the duration to the minimum value
                  */
                 var max_ms = Math.floor(MARKER_ANIMATION_DURATION * 0.9)
                   , rel_ms = Math.floor(d.marker.rel_size * max_ms)
                   , ms = Math.min(rel_ms, max_ms)
                 ;
                 return ms;
               })
              .style('stroke-width', function(d, i) {
                 var sz = d.marker.size;
                 sz *= (sz < 1) ? MARKER_SIZE : 1;
                 return sz;
               })
            .transition()
              .duration(0)
              .style('stroke-width', 0)
        ;
      }
      function pulse() {
        d3.selectAll('path.marker')
            .transition()
              .duration(function(d) {
                 /**
                  * set the actual animation to .3 of 90% of the time
                  * before setting the size-relative duration
                  * and setting the duration to the minimum value
                  */
                 var max_ms = Math.floor((MARKER_ANIMATION_DURATION * 0.9)/3)
                   , rel_ms = Math.floor(d.marker.rel_size * max_ms)
                   , ms = Math.min(rel_ms, max_ms)
                 ;
                 return ms;
               })
              .style('stroke-width', function(d, i) {
                 var sz = d.marker.size;
                 sz *= (sz < 1) ? MARKER_SIZE : 1;
                 return sz;
               })
            .transition()
              .duration(function(d, i) {
                 /**
                  * set the actual animation to .6 of 90% of the time
                  * before setting the size-relative duration
                  * and setting the duration to the minimum value
                  */
                 var max_ms = Math.floor((MARKER_ANIMATION_DURATION * 0.9)/3)*2
                   , rel_ms = Math.floor(d.marker.rel_size * max_ms)
                   , ms = Math.min(rel_ms, max_ms)
                 ;
                 return ms;
               })
              .style('stroke-width', 0)
        ;
      }

      id_table = SELF.markerDataId(SELF.markerDataId() || 'viz-' + ID);

      marker_lg = d3.max(data, function(d) { return d.size || d.Size; });

      /**
       * if the largest size isn't set, set it to the marker size
       */
      marker_lg = marker_lg || MARKER_SIZE;

      /**
       * if the map has not been rendered yet then call the render method,
       * otherwise, go ahead and draw the markers
       */
      if (!is_rendered()) {
        SELF.render();
      } else {
        /**
         * delete all the existing markers
         */
        markerDelete();

        /**
         * add the markers using the data provided
         */
        d3.select('#viz-' + ID + '-svg-map').append('g').attr('id', 'viz-' + ID + '-svg-markers')
           .selectAll('path').data(data).enter().append('path')
             .datum(function(d) {
                var m = (MARKER_RELATIVE_SIZE ? (1/WIDTH) : 1)
                  , c = parseFloat(d.size || d.Size || MARKER_SIZE)
                  , size = c * m
                  , lg = marker_lg * m
                  , lat = (d.latitude || d.Latitude || d.lat || d.Lat)
                  , lon = (d.longitude || d.Longitude || d.lon || d.Lon)
                ;
                d.size = size;
                d.rel_size = size / (lg || 1);
                return { type:'Point',
                         coordinates:[ lon, lat ],
                         marker:d };
              })
             .attr('class', function(d) {
                var country = (d.country || d.Country || '');
                return ['marker', country].join(' ');
              })
             .attr('d', PROJECTION_PATH.pointRadius(1))
             .attr('data-description', function(d) {
                return (d.description || d.Description);
              })
             .style('fill', function(d) {
                return (d.color || d.Color || PALETTE.marker);
              })
             .style('stroke', function(d) {
                return (d.color || d.Color || PALETTE.marker);
              })
             .style('stroke-width', 0)
             .style('stroke-opacity', (PALETTE.markerOpacity || 1))
          ;

        /**
         * add some visual interest to the markers via animation
         */
        switch (MARKER_ANIMATION) {
          case 'ping':
            setInterval(ping, MARKER_ANIMATION_DURATION);
            break;
          case 'pulse':
            setInterval(pulse, MARKER_ANIMATION_DURATION);
            break;
          case 'none':
            /**
             * markers are set at 1px when created, this sets them to the
             * maximum radius because they never grow using animation
             */
            d3.selectAll('path.marker').style('stroke-width', function(d, i) {
                return d.size || d.Size || MARKER_SIZE;
              });
            break;
        }

        /**
         * assign the click handlers if defined
         */
        d3.select('#viz-' + ID + '-svg-markers').selectAll('path.marker')
          .on('click', function marker_onClick(marker) {
             var i;
             if (!DRAGGING) {
               for (i = 0; i < MARKER_HANDLERS.length; i += 1) {
                 MARKER_HANDLERS[i].call(marker);
               }
             }
           });

        /**
         * add a data table if one does not exist and columns have been
         * specified, using the same logic as cjl-scrollabletable
         */
        if (!MARKER_TABLE && columns && columns.length) {
          /**
           * build the stylesheet
           */
          if (!style) {
            style = document.createElement('style');
            style.setAttribute('id', id_style);
            style.setAttribute('type', 'text/css');

            /**
             * write the sortable styles so we get the adjusted widths when we
             * write the scrollable styles
             */
            if (style) {
              /**
               * style for a sortable table
               */
              rules = [];
              rules.push('#'+id_table+' .sortable { cursor:pointer; padding:inherit 0.1em; }');
              rules.push('#'+id_table+' .sortable:after { border-bottom:0.3em solid #000; border-left:0.3em solid transparent; border-right:0.3em solid transparent; bottom:0.75em; content:""; height:0; margin-left:0.1em; position:relative; width:0; }');
              rules.push('#'+id_table+' .sortable.desc:after { border-bottom:none; border-top:0.3em solid #000; top:0.75em; }');
              rules.push('#'+id_table+' .sortable.sorted { color:#ff0000; }');

              style.innerHTML += rules.join('\n');

              if (!style.parentNode) {
                document.body.appendChild(style);
              }
            }
          } else {
            style_exists = true;
          }

          /**
           * create the table
           */
          table = d3.select(container).append('table')
                      .attr('class', 'scrollable marker-description')
                      .attr('id', id_table)
            ;
          thead = table.append('thead');
          tfoot = table.append('tfoot');
          tbody = table.append('tbody');

          /**
           * append the header row
           */
          thead.append('tr')
               .selectAll('th')
               .data(columns)
               .enter()
               .append('th')
                 .attr('class', function(d, i) {
                    var issort = (d.sortable === false) ? false : true;
                    return (d.name || d)+(issort ? ' sortable' : '');
                  })
                 .text(function(d, i) {
                    var name = d.name || d;
                    return name.replace(/\b\w+/g, function(s) {
                      return s.charAt(0).toUpperCase() +
                             s.substr(1).toLowerCase();
                    });
                  })
            ;

          /**
           * attach the click handler
           */
          thead.selectAll('th.sortable')
                 .on('click', function (d, i) {
                    var clicked = d3.select(this)
                      , sorted = d3.select(clicked.node().parentNode)
                                   .selectAll('.sortable.sorted')
                      , desc = clicked.classed('desc')
                    ;

                    /**
                     * normalize the data
                     */
                    d = d.name || d;

                    /**
                     * reset the 'sorted' class on siblings
                     */
                    sorted.classed('sorted', false);

                    if (desc) {
                      clicked.classed({'desc': false, 'sorted': true});
                      tbody.selectAll('tr').sort(function ascending(a, b) {
                          var ret = 0;
                          a = a[d];  /* select the property to compare */
                          b = b[d];  /* select the property to compare */
                          if (a !== null && a !== undefined) {
                            if (a.localeCompare && (isNaN(a) || isNaN(b))) {
                              ret = a.localeCompare(b);
                            } else {
                              ret = a-b;
                            }
                          }
                          return ret;
                        });
                    } else {
                      clicked.classed({'desc': true, 'sorted': true});
                      tbody.selectAll('tr').sort(function descending(a, b) {
                          var ret = 0;
                          a = a[d];  /* select the property to compare */
                          b = b[d];  /* select the property to compare */
                          if (b !== null && b !== undefined) {
                            if (b.localeCompare && (isNaN(a) || isNaN(b))) {
                              ret = b.localeCompare(a);
                            } else {
                              ret = b-a;
                            }
                          }
                          return ret;
                        });
                    }
                  })
            ;

          /**
           * create the footer
           */
          tfoot.append('tr')
               .selectAll('td')
               .data(columns)
               .enter()
               .append('td')
                 .attr('class', function(d, i) {
                    return (d.name || d);
                  })
                 .html('&nbsp;')
            ;

          /**
           * create a row for each object in the markers
           */
          trows = tbody.selectAll('tr')
                       .data(data)
                       .enter()
                       .append('tr')
            ;

          /**
           * create a cell in each row for each column
           */
          tcells = trows.selectAll('td')
                        .data(function(row) {
                           return columns.map(function(column) {
                             var col = (column.name || column);
                             return {column:col, value:row[col]};
                           });
                         })
                        .enter()
                        .append('td')
                          .attr('class', function(d) { return d.column; })
                          .html(function(d) { return d.value; })
            ;

          /**
           * build the stylesheet
           */
          if (!style_exists && style) {
            /**
             * style for a scrollable table
             */
            rules.push('#'+id_table+'.scrollable { display:inline-block; padding:0 0.5em 1.5em 0; }');
            rules.push('#'+id_table+'.scrollable tbody { height:12em; overflow-y:scroll; }');
            rules.push('#'+id_table+'.scrollable tbody > tr { height:1.2em; margin:0; padding:0; }');
            rules.push('#'+id_table+'.scrollable tbody > tr > td { line-height:1.2em; margin:0; padding-bottom:0; padding-top:0; }');
            rules.push('#'+id_table+'.scrollable tfoot { bottom:0; position:absolute; }');
            rules.push('#'+id_table+'.scrollable thead, #'+id_table+' tfoot, #'+id_table+' tbody { cursor:default; display:block; margin:0.5em 0; }');
            rules.push('tbody.banded tr:nth-child(odd) { background-color:rgba(187, 187, 187, 0.8); }');

            tcells = document.getElementById(id_table).getElementsByTagName('tr').item(0).childNodes;
            for (ndx = 0; ndx < tcells.length; ndx += 1) {
              /**
               * add 15 pixels to accommodate sort markers
               */
              rules.push('#'+id_table+' th:nth-of-type('+(ndx+1)+'), #'+id_table+' td:nth-of-type('+(ndx+1)+') { width:'+(tcells.item(ndx).offsetWidth+15)+'px; }');
            }

            style.innerHTML = rules.join('\n');

            if (style.parentNode) {
              style.parentNode.removeChild(style);
            }
            document.body.appendChild(style);
          }

          /**
           * sort the table on the first sortable column by default
           */
          ndx = columns.length;
          while (ndx -= 1 > -1) {
            if (columns[ndx].sortable !== false && columns[ndx].sort) {
              break;
            }
          }
          ndx = Math.max(0, ndx);
          default_sort = d3.select('th.sortable.'+(columns[ndx].name || columns[ndx])).node() || d3.select('th.sortable').node();
          if (default_sort) {
            default_sort.click();
          }
        }
      }
    }

    /**
     * Returns true if the countries have been rendered
     * @return   {boolean}
     */
    function is_rendered() {
      /**
       * READ-ONLY
       */
      var node = document.getElementById('viz-' + ID + '-svg-countries');
      return node ? true : false;
    }

    /**
     * Returns true if the map style selected can rotate (i.e. globe or orthographic)
     * @return   {boolean}
     */
    function rotates() {
      /**
       * the map can rotate - i.e. it's a globe
       */
      return STYLE.rotates === true;
    }

    /**
     * Rotates to the location
     * @return   {void}
     * @param    {number[]} coordinates
     */
    function rotateToLocation(coordinates) {
      coordinates = coordinates || LOCATION;
      if (STYLE && STYLE.projection) {
        STYLE.projection.rotate(coordinates);
        d3.select('#viz-' + ID + '-svg')
          .selectAll('path')
          .attr('d', PROJECTION_PATH.projection(STYLE.projection));
      }
    }

    /**
     * Pauses the rotation
     * @return   {void}
     */
    function rotationPause() {
      ROTATE_3D = false;
      fire('paused');
    }

    /**
     * Starts the rotation
     * @return   {void}
     */
    function rotationStart() {
      /**
       * update the ticker to reduce janky-ness and
       * reset the stopped and paused flags
       */
      THEN = Date.now();
      ROTATE_3D = true;
      ROTATE_STOPPED = false;
    }

    /**
     * Ends the rotation
     * @return   {void}
     */
    function rotationTimerEnd() {
      /**
       * a D3 timer cannot be cleared once started
       */
      ROTATE_STOPPED = true;
      ROTATE_3D = false;
    }

    /**
     * Starts the rotation
     * @return   {void}
     * @param    {projection} projection
     */
    function rotationTimerStart(projection) {
      if (projection) {
        /**
         * start the rotation timer
         */
        d3.timer(function spin() {
            /**
             * if the map can rotate and has not been stopped and is not paused
             */
            if (rotates() && !ROTATE_STOPPED && ROTATE_3D) {
              var tick = (Date.now()-THEN)
                , angle = VELOCITY * tick
              ;

              LOCATION[0] += angle;
              rotateToLocation();
            }
            THEN = Date.now();
          });
      }
    }

    /**
     * Animates travel along routes defined in the specified data - identified by a resource object (i.e., a URL string or an object with 'name' and type' properties) or an array of objects with 'origin' and 'destination' properties - using the specified marker. The animation runs for the specified duration (in milliseconds) or 1000ms.
     * @return   {void}
     * @param    {string|object|object[]} data
     * @param    {object} marker
     * @param    {number} duration
     * @param    {boolean} loop
     * @param    {boolean} combined
     */
    function route(data, marker, duration, loop, combined) {
      var routes;

      /**
       * normalize the animation parameters
       */
      marker = marker && marker.d ? marker : null;
      duration = isNaN(duration) ? 1000 : Math.floor(duration);
      loop = (loop === true);

      /**
       * subscribe the handler to the creation event
       */
      EVENT_HANDLERS['routes-created'] = [function() {
        d3.select('#viz-' + ID + '-svg-map').selectAll('g.route')
                   .each(function() {
                      routeAnimate(this, duration, loop, marker, combined);
                    });
      }];

      /**
       * determine what sort of 'data' was passed in
       */
      if (typeof data === 'object' && data.name) {
        /**
         * if 'data' is an object with 'name' - i.e., a resource
         */
        if (data.type && (/csv/i).test(data.type)) {
          d3.csv(data.name, routeCreate);
        } else {
          d3.json(data.name, routeCreate);
        }
      } else if (data instanceof Array) {
        /**
         * data is an array so pass the data directly into the subroutine
         */
        routeCreate(null, data);
      } else if (typeof data === 'string' || typeof data === 'number') {
        /**
         * this will convert the string into a valid URL
         * if the string passed in is not a valid URI, e.g., [-73,88]
         * the string will be appended to the current (DOM) location,
         * e.g., http://js.cathmhaol.com/[-73,88]
         */
        resource = document.createElement('a');
        resource.href = data;

        /**
         * check to see if the resource being requested is on the
         * same domain and if so, just use the pathname in the request
         * if it's not, then use the full href
         */
        if (resource.hostname === document.location.hostname) {
          resource = resource.pathname;
        } else {
          resource = resource.href;
        }

        d3.json(resource, routeCreate);
      }
    }

    /**
     * Animates a group of paths that comprise a route
     * @return   {void}
     * @param    {string|HTMLElement} group
     * @param    {number} duration
     * @param    {boolean} loop
     * @param    {object} marker
     * @param    {boolean} combined
     */
    function routeAnimate(group, duration, loop, marker, combined) {
      function travel(node, orient, icon) {
        var l = node.getTotalLength()
        ;
        return function(i) {
          return function(t) {
            var a = node.getPointAtLength(Math.min(t + 0.05, 1) * l)
              , p = node.getPointAtLength(t * l)
              , o = icon.getBBox()
              , x = a.x - p.x
              , y = a.y - p.y
              , adj_x = p.x - (3 * (x < 0 ? 1 : -1))
              , adj_y = p.y - (((o.height/2) + 6) * (marker.scale || 1) * (x < 0 ? -1 : 1))
              , r = null
            ;

            if (orient === true) {
              r = 90 - Math.atan2(-y, x) * 180 / Math.PI;
            }
            return 'translate(' + adj_x + ',' + adj_y + ')' +
                   (marker.scale ? 'scale(' + marker.scale + ')' : '') +
                   (r !== null ? ' rotate(' + r + ')' : '')
              ;
          }
        }
      }

      var routes
        , count
      ;

      group = d3.select(typeof group === 'string' ? group : group);

      /**
       * make sure we have a group element
       */
      if (group && group.node().nodeType === 1 && group.node().nodeName.toLowerCase() === 'g') {
        routes = group.selectAll('path');
        count = routes.size();
        duration = duration / (count || 1);
        if (loop && marker && marker.d) {
          setInterval( function() {
            routes.each(function(d, i) {
                     var route = d3.select(this)
                       , g = d3.select(route.node().parentNode)
                       , len = route.node().getTotalLength()
                       , icon
                     ;

                     if (combined) {
                       route.attr('stroke-dasharray', len + ' ' + len)
                            .attr('stroke-dashoffset', len)
                         ;
                     }
                     route.transition()
                            .delay(duration * i)
                            .duration(duration)
                            .each('start', function() {
                               icon = g.append('path')
                                       .attr('d', marker.d);
                               icon.transition()
                                     .duration(duration)
                                     .attrTween('transform',
                                         travel( route.node(),
                                                 marker.orient,
                                                 icon.node() )
                                      )
                                     .remove()
                                 ;
                             })
                            .ease('linear')
                            .attr((combined ? 'stroke-dashoffset' : 'data-d'),
                                  (combined ? '0' : '0'))
                       ;
                   })
              ;
          }, (duration * count) + 20);
        } else if (loop) {
          setInterval( function() {
            routes.each(function(d, i) {
                      var route = d3.select(this)
                        , len = route.node().getTotalLength()
                      ;

                      route.attr('stroke-dasharray', len + ' ' + len)
                           .attr('stroke-dashoffset', len)
                           .transition()
                             .delay(duration * i)
                             .duration(duration)
                             .ease('linear')
                             .attr('stroke-dashoffset', 0)
                        ;
                   })
             ;
          }, (duration * count * 2) + 20);
        } else if (marker && marker.d) {
          routes.each(function(d, i) {
                   var route = d3.select(this)
                     , g = d3.select(route.node().parentNode)
                     , len = route.node().getTotalLength()
                     , icon
                   ;

                   if (combined) {
                     route.attr('stroke-dasharray', len + ' ' + len)
                          .attr('stroke-dashoffset', len)
                       ;
                   }
                   route.transition()
                          .delay(duration * i)
                          .duration(duration)
                          .each('start', function() {
                             icon = g.append('path')
                                     .attr('d', marker.d);
                             icon.transition()
                                   .duration(duration)
                                   .attrTween('transform',
                                       travel( route.node(),
                                               marker.orient,
                                               icon.node() )
                                    )
                                   .remove()
                               ;
                           })
                          .ease('linear')
                          .attr((combined ? 'stroke-dashoffset' : 'data-d'),
                                (combined ? '0' : '0'))
                     ;
                 })
            ;
        } else {
          routes.each(function(d, i) {
                   var route = d3.select(this)
                     , len = route.node().getTotalLength()
                   ;

                   route.attr('stroke-dasharray', len + ' ' + len)
                        .attr('stroke-dashoffset', len)
                        .transition()
                          .delay(duration * i)
                          .duration(duration)
                          .ease('linear')
                          .attr('stroke-dashoffset', 0)
                     ;
                 })
           ;
        }
      }
    }

    /**
     * Parses the data and creates the routes
     * @return   {void}
     * @param    {object} error
     * @param    {object[]} data
     */
    function routeCreate(error, data) {
      var counter
        , destinations
        , group
        , map = d3.select('#viz-' + ID + '-svg-map')
        , origin
        , projection = (STYLE || { }).projection
        , routes
        , waypoint
      ;

      if (error) {
        return;
      } else if (data && projection) {
        /**
         * for each route in the data
         */
        for (counter = 0; counter < data.length; counter += 1) {
          origin = data[counter].origin;
          destinations = data[counter].destination;

          /**
           * normalize the origin
           */
          if (origin && origin.length !== 2) {
            origin = null;
          }

          /**
           * normalize the destination property as an array
           * of waypoints
           */
          if (destinations && !(destinations[0] instanceof Array)) {
            destinations = [destinations];
          }
          if (destinations && destinations[0].length !== 2) {
            destinations = null;
          }

          /**
           * if we have an origin and at least one waypoint
           */
          if (origin && destinations) {
            routes = routes || map.append('g').attr('id', 'viz-' + ID + '-svg-routes');
            /* create the route group */
            group = routes.append('g')
                   .attr('class', 'route')
              ;
            /* add the paths to the route */
            origin = projection(origin).join(' ')
            for (n = 0; n < destinations.length; n += 1) {
              waypoint = projection(destinations[n]).join(' ')
              group.append('path')
                     .attr('class', 'travel-route')
                     .attr('d', 'M ' + origin + ' L ' + waypoint)
                ;
              origin = waypoint;
            }
          }
        }
        fire('routes-created');
      }
    }

    /**
     * CONSTRUCTOR
     */
    var COUNTRY_HANDLERS = [ ]
      , D3COLORS
      , DRAGGING = false
      , EVENT_HANDLERS = { }
      , EVENTS = [ 'accelerated'
                 , 'paused'
                 , 'rendered'
                 , 'resumed'
                 , 'slowed'
                 ]
      , ID = parseFloat((new Date()).getTime()/100).toFixed(20).replace(/\./g, '')
      , LOCATION = [0, 0, 0]
      , MARKER_ANIMATION = 'pulse'
      , MARKER_ANIMATION_DURATION = 1500
      , MARKER_DATA = []
      , MARKER_DESCRIPTION
      , MARKER_FILE = {}
      , MARKER_HANDLERS = [ ]
      , MARKER_ID
      , MARKER_RELATIVE_SIZE = false
      , MARKER_SIZE = 3
      , MARKER_TABLE = false
      , PALETTE = {
          border: '#766951',
          countries: [ ],
          marker: '#000000',
          markerOpacity: '0.7',
          ocean: '#d8ffff'
        }
      , POPUP_DESCRIPTOR = true
      , PROJECTION_PATH
      , PROJECTIONS = {
          /**
           * map to property
           */
          map: function(name) {
            var prop;
            /**
             * added '2D' handling for backward compatibility
             */
            name = (name === '2D') ? 'equirectangular' : (name || '');
            /**
             * normalize the name
             */
            name = name.replace(/\([^\)]+\)/g, '');
            name = name.replace(/[^\w]/g, '').toLowerCase();
            /**
             * search for the requested projection
             */
            for (prop in this) {
              if (this.hasOwnProperty(prop)) {
                if (prop === name) {
                  return this[prop];
                }
              }
            }
          }
        }
      , ROTATE_3D = false
      , ROTATE_STOPPED = false
      , THEN
      , VELOCITY = 0.05
      , SELF = this
    ;

    /**
     * make sure the polyfill for the Date.now method is present
     */
    if (!Date.now) {
      Date.prototype.now = function now() {
        return (new Date()).getTime();
      };
    }

    try {
      /**
       * initialize the D3js projection-related variables
       */
      D3COLORS = d3.scale.category10();
      PALETTE.countries = [ D3COLORS(1), D3COLORS(2)
                          , D3COLORS(3), D3COLORS(4)
                          , D3COLORS(5), D3COLORS(6)
                          , D3COLORS(7), D3COLORS(8)
                          , D3COLORS(9), D3COLORS(10)
                          ];

      /**
       * add projections that are supported in d3.geo
       */
      if (d3.geo.aitoff) {
        PROJECTIONS.aitoff = {
              name:'Aitoff',
              projection:d3.geo.aitoff()
            };
      }
      if (d3.geo.albers) {
        PROJECTIONS.albers = {
              name:'Albers',
              projection:d3.geo.albers(),
              parallels:[20, 50]
            };
      }
      if (d3.geo.baker) {
        PROJECTIONS.baker = {
              name:'Baker',
              projection:d3.geo.baker()
            };
      }
      if (d3.geo.boggs) {
        PROJECTIONS.boggs = {
              name:'Boggs',
              projection:d3.geo.boggs()
            };
      }
      if (d3.geo.bonne) {
        PROJECTIONS.bonne = {
              name:'Bonne',
              projection:d3.geo.bonne()
            };
      }
      if (d3.geo.bromley) {
        PROJECTIONS.bromley = {
              name:'Bromley',
              projection:d3.geo.bromley()
            };
      }
      if (d3.geo.craster) {
        PROJECTIONS.crasterparabolic = {
              name:'Craster Parabolic',
              projection:d3.geo.craster()
            };
      }
      if (d3.geo.eckert1) {
        PROJECTIONS.eckerti = {
              name:'Eckert I',
              projection:d3.geo.eckert1()
            };
      }
      if (d3.geo.eckert2) {
        PROJECTIONS.eckertii = {
              name:'Eckert II',
              projection:d3.geo.eckert2()
            };
      }
      if (d3.geo.eckert3) {
        PROJECTIONS.eckertiii = {
              name:'Eckert III',
              projection:d3.geo.eckert3()
            };
      }
      if (d3.geo.eckert4) {
        PROJECTIONS.eckertiv = {
              name:'Eckert IV',
              projection:d3.geo.eckert4()
            };
      }
      if (d3.geo.eckert5) {
        PROJECTIONS.eckertv = {
              name:'Eckert V',
              projection:d3.geo.eckert5()
            };
      }
      if (d3.geo.eckert6) {
        PROJECTIONS.eckertvi = {
              name:'Eckert VI',
              projection:d3.geo.eckert6()
            };
      }
      if (d3.geo.equirectangular) {
        PROJECTIONS.equirectangular = {
              name:'Equirectangular (Plate Carree)',
              projection:d3.geo.equirectangular()
            };
      }
      if (d3.geo.hammer) {
        PROJECTIONS.hammer = {
              name:'Hammer',
              projection:d3.geo.hammer()
            };
      }
      if (d3.geo.hill) {
        PROJECTIONS.hill = {
              name:'Hill',
              projection:d3.geo.hill()
            };
      }
      if (d3.geo.orthographic) {
        PROJECTIONS.globe = {
              name:'Globe',
              projection:d3.geo.orthographic().clipAngle(90),
              rotates:true,
              shape:'sphere'
            };
      }
      if (d3.geo.homolosine) {
        PROJECTIONS.goodehomolosine = {
              name:'Goode Homolosine',
              projection:d3.geo.homolosine()
            };
      }
      if (d3.geo.kavrayskiy7) {
        PROJECTIONS.kavrayskiyvii = {
              name:'Kavrayskiy VII',
              projection:d3.geo.kavrayskiy7()
            };
      }
      if (d3.geo.cylindricalEqualArea) {
        PROJECTIONS.lambertcylindricalequalarea = {
              name:'Lambert cylindrical equal-area',
              projection:d3.geo.cylindricalEqualArea()
            };
      }
      if (d3.geo.lagrange) {
        PROJECTIONS.lagrange = {
              name:'Lagrange',
              projection:d3.geo.lagrange()
            };
      }
      if (d3.geo.larrivee) {
        PROJECTIONS.larrivee = {
              name:'Larrivee',
              projection:d3.geo.larrivee()
            };
      }
      if (d3.geo.laskowski) {
        PROJECTIONS.laskowski = {
              name:'Laskowski',
              projection:d3.geo.laskowski()
            };
      }
      if (d3.geo.loximuthal) {
        PROJECTIONS.loximuthal = {
              name:'Loximuthal',
              projection:d3.geo.loximuthal()
            };
      }
      if (d3.geo.miller) {
        PROJECTIONS.miller = {
              name:'Miller',
              projection:d3.geo.miller()
            };
      }
      if (d3.geo.mtFlatPolarParabolic) {
        PROJECTIONS.mcbrydethomasflatpolarparabolic = {
              name:'McBryde-Thomas Flat-Polar Parabolic',
              projection:d3.geo.mtFlatPolarParabolic()
            };
      }
      if (d3.geo.mtFlatPolarQuartic) {
        PROJECTIONS.mcbrydethomasflatpolarquartic = {
              name:'McBryde-Thomas Flat-Polar Quartic',
              projection:d3.geo.mtFlatPolarQuartic()
            };
      }
      if (d3.geo.mtFlatPolarSinusoidal) {
        PROJECTIONS.mcbrydethomasflatpolarsinusoidal = {
              name:'McBryde-Thomas Flat-Polar Sinusoidal',
              projection:d3.geo.mtFlatPolarSinusoidal()
            };
      }
      if (d3.geo.mollweide) {
        PROJECTIONS.mollweide = {
              name:'Mollweide',
              projection:d3.geo.mollweide()
            };
      }
      if (d3.geo.naturalEarth) {
        PROJECTIONS.naturalearth = {
              name:'Natural Earth',
              projection:d3.geo.naturalEarth()
            };
      }
      if (d3.geo.nellHammer) {
        PROJECTIONS.nellhammer = {
              name:'Nell-Hammer',
              projection:d3.geo.nellHammer()
            };
      }
      if (d3.geo.orthographic) {
        PROJECTIONS.orthographic = {
              name:'Orthographic',
              projection:d3.geo.orthographic().clipAngle(90),
              rotates:true,
              shape:'sphere'
            };
      }
      if (d3.geo.polyconic) {
        PROJECTIONS.polyconic = {
              name:'Polyconic',
              projection:d3.geo.polyconic()
            };
      }
      if (d3.geo.robinson) {
        PROJECTIONS.robinson = {
              name:'Robinson',
              projection:d3.geo.robinson()
            };
      }
      if (d3.geo.sinusoidal) {
        PROJECTIONS.sinusoidal = {
              name:'Sinusoidal',
              projection:d3.geo.sinusoidal()
            };
      }
      if (d3.geo.vanDerGrinten) {
        PROJECTIONS.vandergrinten = {
              name:'van der Grinten',
              projection:d3.geo.vanDerGrinten()
            };
      }
      if (d3.geo.vanDerGrinten4) {
        PROJECTIONS.vandergrinteniv = {
              name:'van der Grinten IV',
              projection:d3.geo.vanDerGrinten4()
            };
      }
      if (d3.geo.wagner4) {
        PROJECTIONS.wagneriv = {
              name:'Wagner IV',
              projection:d3.geo.wagner4()
            };
      }
      if (d3.geo.wagner6) {
        PROJECTIONS.wagnervi = {
              name:'Wagner VI',
              projection:d3.geo.wagner6()
            };
      }
      if (d3.geo.wagner7) {
        PROJECTIONS.wagnervii = {
              name:'Wagner VII',
              projection:d3.geo.wagner7()
            };
      }
      if (d3.geo.winkel3) {
        PROJECTIONS.winkeltripel = {
              name:'Winkel Tripel',
              projection:d3.geo.winkel3()
            };
      }

      /**
       * subscribe the handlers to the primary events
       */
      EVENT_HANDLERS['marker-data'] = [markerDraw];
      EVENT_HANDLERS['rendered'] = [rotationTimerStart];

      /**
       * handle a config object passed in as the first parameter
       */
      if ( typeof CONTAINER === 'object' &&
           CONTAINER !== null &&
           CONTAINER.nodeType !== 1 ) {
        DESCRIPTOR = CONTAINER.data;
        STYLE = CONTAINER.style;
        WIDTH = CONTAINER.width;
        CONTAINER = CONTAINER.element;
      }

      /**
       * set the map style
       */
      STYLE = PROJECTIONS.map(STYLE || 'globe');

      /**
       * check to make sure we have at least one projection available,
       * otherwise we can't do anything
       */
      if (STYLE.projection) {
        /**
         * add a 'size' method for d3 selections
         */
        d3.selection.prototype.size = function() {
            var n = 0;
            this.each(function() { n += 1; });
            return n;
          };

        /**
         * set the container element
         */
        this.element(CONTAINER || document.body);

        /**
         * set the table descriptor element
         */
        if (typeof DESCRIPTOR === 'string') {
          DESCRIPTOR = document.getElementById(DESCRIPTOR);
        }
        if (DESCRIPTOR && DESCRIPTOR.nodeType !== 1) {
          DESCRIPTOR = null;
        }

        window[SELF.id()] = this;

        return this;
      } else {
        return null;
      }
    } catch(error) {
      return null;
    }
  };

  /**
   * Topology data for all countries on earth
   */
  d3.geo.earth.topoJSONdata = {"type":"Topology","objects":{"land":{"type":"MultiPolygon","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7,8,9]],[[10,11,12,13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21,22]],[[23,-23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32,33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45,46]],[[47]],[[48]],[[49]],[[50,51,52,53]],[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]],[[63]],[[64]],[[65,66]],[[67]],[[68]],[[69]],[[70]],[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78]],[[79,80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92]],[[93,94]],[[95]],[[96]],[[97,98,99,100,101,102]],[[103]],[[104]],[[105]],[[106]],[[107]],[[108]],[[109]],[[110,111]],[[112]],[[113,114]],[[115,-115]],[[116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158]],[[159,160]],[[161]],[[162]],[[163]],[[164]],[[165]],[[166]],[[167,168,169,170]],[[171]],[[172]],[[173]],[[174]],[[175]],[[176]],[[177]],[[178]],[[179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,-112],[292,293,294,295,296,297]],[[298]],[[299]],[[300]],[[301]],[[302]],[[303]],[[304]],[[305]],[[306]],[[307]],[[308]],[[309]],[[310]],[[311]]]},"countries":{"type":"GeometryCollection","geometries":[{"type":"Polygon","id":4,"arcs":[[312,313,314,315,316,317]]},{"type":"MultiPolygon","id":24,"arcs":[[[318,319,222,320]],[[224,321,322]]]},{"type":"Polygon","id":8,"arcs":[[323,263,324,325,326]]},{"type":"Polygon","id":784,"arcs":[[327,206,328,329,204]]},{"type":"MultiPolygon","id":32,"arcs":[[[330,13]],[[331,332,333,141,334,335]]]},{"type":"Polygon","id":51,"arcs":[[336,337,338,339,340]]},{"type":"MultiPolygon","id":10,"arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[341,342,9]]]},{"type":"Polygon","id":260,"arcs":[[15]]},{"type":"MultiPolygon","id":36,"arcs":[[[16]],[[27]]]},{"type":"Polygon","id":40,"arcs":[[343,344,345,346,347,348,349]]},{"type":"MultiPolygon","id":31,"arcs":[[[350,-338]],[[297,351,-341,352,353]]]},{"type":"Polygon","id":108,"arcs":[[354,355,356]]},{"type":"Polygon","id":56,"arcs":[[357,358,359,273,360]]},{"type":"Polygon","id":204,"arcs":[[361,362,363,230,364]]},{"type":"Polygon","id":854,"arcs":[[365,366,-362,367,368,369]]},{"type":"Polygon","id":50,"arcs":[[193,370,371]]},{"type":"Polygon","id":100,"arcs":[[260,372,373,374,375,376]]},{"type":"MultiPolygon","id":44,"arcs":[[[74]],[[76]],[[77]]]},{"type":"Polygon","id":70,"arcs":[[377,378,379]]},{"type":"Polygon","id":112,"arcs":[[380,381,382,383,384]]},{"type":"Polygon","id":84,"arcs":[[128,385,386]]},{"type":"Polygon","id":68,"arcs":[[387,388,389,390,-336]]},{"type":"Polygon","id":76,"arcs":[[391,-390,392,393,394,395,396,397,139,398,-333]]},{"type":"Polygon","id":96,"arcs":[[399,51]]},{"type":"Polygon","id":64,"arcs":[[400,401]]},{"type":"Polygon","id":72,"arcs":[[402,403,404,405]]},{"type":"Polygon","id":140,"arcs":[[406,407,408,409,410,411,412]]},{"type":"MultiPolygon","id":124,"arcs":[[[87]],[[88]],[[89]],[[90]],[[91]],[[104]],[[105]],[[107]],[[109]],[[112]],[[413,117,414,156,415,158]],[[159,416]],[[161]],[[162]],[[163]],[[164]],[[166]],[[167,417,169,418]],[[172]],[[174]],[[175]],[[177]],[[178]],[[298]],[[299]],[[301]],[[302]],[[303]],[[309]],[[310]]]},{"type":"Polygon","id":756,"arcs":[[419,420,421,-346]]},{"type":"MultiPolygon","id":152,"arcs":[[[10,422,12,-331]],[[-335,142,423,-388]]]},{"type":"MultiPolygon","id":156,"arcs":[[[67]],[[424,185,425,426,427,428,429,-401,430,431,432,433,-315,434,435,436,437,438,439]]]},{"type":"Polygon","id":384,"arcs":[[440,441,442,-370,443,233]]},{"type":"Polygon","id":120,"arcs":[[444,228,445,446,447,-412,448,449]]},{"type":"Polygon","id":180,"arcs":[[450,-357,451,452,-321,223,-323,453,-410,454,455]]},{"type":"Polygon","id":178,"arcs":[[225,456,-449,-411,-454,-322]]},{"type":"Polygon","id":170,"arcs":[[145,457,134,458,-394,459,460]]},{"type":"Polygon","id":188,"arcs":[[461,132,462,147]]},{"type":"Polygon","id":192,"arcs":[[73]]},{"type":"Polygon","id":-99,"arcs":[[463,80]]},{"type":"Polygon","id":196,"arcs":[[-464,79]]},{"type":"Polygon","id":203,"arcs":[[464,465,466,-348]]},{"type":"Polygon","id":276,"arcs":[[-465,-347,-422,467,468,-358,469,275,470,277,471]]},{"type":"Polygon","id":262,"arcs":[[472,473,474,214]]},{"type":"MultiPolygon","id":208,"arcs":[[[95]],[[-471,276]]]},{"type":"Polygon","id":214,"arcs":[[475,65]]},{"type":"Polygon","id":12,"arcs":[[476,477,478,479,246,480,481,482]]},{"type":"Polygon","id":218,"arcs":[[-461,483,144]]},{"type":"Polygon","id":818,"arcs":[[484,485,249,486,211]]},{"type":"Polygon","id":232,"arcs":[[487,213,-475,488]]},{"type":"Polygon","id":724,"arcs":[[489,269,490,271]]},{"type":"Polygon","id":233,"arcs":[[491,492,282]]},{"type":"Polygon","id":231,"arcs":[[-474,493,494,495,496,497,498,-489]]},{"type":"Polygon","id":246,"arcs":[[284,499,500,501]]},{"type":"MultiPolygon","id":242,"arcs":[[[20]],[[21,22]],[[23,-23]]]},{"type":"Polygon","id":238,"arcs":[[14]]},{"type":"MultiPolygon","id":250,"arcs":[[[502,503,504,138,-398]],[[85]],[[505,-468,-421,506,268,-490,272,-360]]]},{"type":"Polygon","id":266,"arcs":[[507,-450,-457,226]]},{"type":"MultiPolygon","id":826,"arcs":[[[508,93]],[[102,509,98,510,100,511]]]},{"type":"Polygon","id":268,"arcs":[[512,-353,-340,513,254]]},{"type":"Polygon","id":288,"arcs":[[-444,-369,514,232]]},{"type":"Polygon","id":324,"arcs":[[515,236,516,517,518,-442,519]]},{"type":"Polygon","id":270,"arcs":[[239,520]]},{"type":"Polygon","id":624,"arcs":[[521,-517,237]]},{"type":"Polygon","id":226,"arcs":[[-445,-508,227]]},{"type":"MultiPolygon","id":300,"arcs":[[[81]],[[262,-324,522,-374,523]]]},{"type":"Polygon","id":304,"arcs":[[311]]},{"type":"Polygon","id":320,"arcs":[[524,-386,129,525,526,151]]},{"type":"Polygon","id":328,"arcs":[[527,-396,528,136]]},{"type":"Polygon","id":340,"arcs":[[529,-526,130,530,149]]},{"type":"Polygon","id":191,"arcs":[[-379,531,265,532,533,534]]},{"type":"Polygon","id":332,"arcs":[[-476,66]]},{"type":"Polygon","id":348,"arcs":[[535,536,537,538,-534,539,-350]]},{"type":"MultiPolygon","id":360,"arcs":[[[29]],[[540,33]],[[34]],[[35]],[[38]],[[39]],[[42]],[[43]],[[541,46]],[[47]],[[48]],[[542,53]],[[49]]]},{"type":"Polygon","id":356,"arcs":[[543,-431,-402,-430,544,-371,194,545,196,546,-433]]},{"type":"Polygon","id":372,"arcs":[[-509,94]]},{"type":"Polygon","id":364,"arcs":[[-317,547,198,548,549,-351,-337,-352,292,550]]},{"type":"Polygon","id":368,"arcs":[[199,551,552,553,554,555,-549]]},{"type":"Polygon","id":352,"arcs":[[108]]},{"type":"Polygon","id":376,"arcs":[[556,-487,250,557,558,559,560]]},{"type":"MultiPolygon","id":380,"arcs":[[[82]],[[83]],[[561,267,-507,-420,-345]]]},{"type":"Polygon","id":388,"arcs":[[64]]},{"type":"Polygon","id":400,"arcs":[[-554,562,210,-557,563,-560,564]]},{"type":"MultiPolygon","id":392,"arcs":[[[78]],[[84]],[[86]]]},{"type":"Polygon","id":398,"arcs":[[565,566,295,567,568,569,-437,570,571]]},{"type":"Polygon","id":404,"arcs":[[217,572,573,574,-496,575]]},{"type":"Polygon","id":417,"arcs":[[-436,576,577,-571]]},{"type":"Polygon","id":116,"arcs":[[578,579,580,188]]},{"type":"Polygon","id":410,"arcs":[[581,183]]},{"type":"Polygon","id":-99,"arcs":[[-326,582,583,584]]},{"type":"Polygon","id":414,"arcs":[[585,-552,200]]},{"type":"Polygon","id":418,"arcs":[[586,-428,587,-580,588]]},{"type":"Polygon","id":422,"arcs":[[251,589,-558]]},{"type":"Polygon","id":430,"arcs":[[590,-520,-441,234]]},{"type":"Polygon","id":434,"arcs":[[-482,591,248,-486,592,593,594]]},{"type":"Polygon","id":144,"arcs":[[55]]},{"type":"Polygon","id":426,"arcs":[[595]]},{"type":"Polygon","id":440,"arcs":[[280,596,-385,597,598]]},{"type":"Polygon","id":442,"arcs":[[-506,-359,-469]]},{"type":"Polygon","id":428,"arcs":[[-493,599,-381,-597,281]]},{"type":"Polygon","id":504,"arcs":[[-480,600,243,601,245]]},{"type":"Polygon","id":498,"arcs":[[602,603]]},{"type":"Polygon","id":450,"arcs":[[26]]},{"type":"Polygon","id":484,"arcs":[[127,-387,-525,152,604,125,605]]},{"type":"Polygon","id":807,"arcs":[[606,-375,-523,-327,-585]]},{"type":"Polygon","id":466,"arcs":[[-477,607,-366,-443,-519,608,609]]},{"type":"Polygon","id":104,"arcs":[[192,-372,-545,-429,-587,610]]},{"type":"Polygon","id":499,"arcs":[[264,-532,-378,611,-583,-325]]},{"type":"Polygon","id":496,"arcs":[[-439,612]]},{"type":"Polygon","id":508,"arcs":[[219,613,614,615,616,617,618,619]]},{"type":"Polygon","id":478,"arcs":[[241,620,-478,-610,621]]},{"type":"Polygon","id":454,"arcs":[[622,623,-619]]},{"type":"MultiPolygon","id":458,"arcs":[[[190,624]],[[-543,50,-400,52]]]},{"type":"Polygon","id":516,"arcs":[[-320,625,-404,626,221]]},{"type":"Polygon","id":540,"arcs":[[19]]},{"type":"Polygon","id":562,"arcs":[[-608,-483,-595,627,-447,628,-363,-367]]},{"type":"Polygon","id":566,"arcs":[[-364,-629,-446,229]]},{"type":"Polygon","id":558,"arcs":[[-531,131,-462,148]]},{"type":"Polygon","id":528,"arcs":[[-470,-361,274]]},{"type":"MultiPolygon","id":578,"arcs":[[[629,-501,630,286]],[[300]],[[305]],[[306]]]},{"type":"Polygon","id":524,"arcs":[[-432,-544]]},{"type":"MultiPolygon","id":554,"arcs":[[[17]],[[18]]]},{"type":"MultiPolygon","id":512,"arcs":[[[631,632,-329,207]],[[-328,205]]]},{"type":"Polygon","id":586,"arcs":[[-547,197,-548,-316,-434]]},{"type":"Polygon","id":591,"arcs":[[133,-458,146,-463]]},{"type":"Polygon","id":604,"arcs":[[143,-484,-460,-393,-389,-424]]},{"type":"MultiPolygon","id":608,"arcs":[[[54]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]]]},{"type":"MultiPolygon","id":598,"arcs":[[[40]],[[41]],[[-542,45]],[[44]]]},{"type":"Polygon","id":616,"arcs":[[633,-598,-384,634,635,-466,-472,278]]},{"type":"Polygon","id":630,"arcs":[[63]]},{"type":"Polygon","id":408,"arcs":[[-582,184,-425,636,182]]},{"type":"Polygon","id":620,"arcs":[[270,-491]]},{"type":"Polygon","id":600,"arcs":[[-392,-332,-391]]},{"type":"Polygon","id":275,"arcs":[[-561,-564]]},{"type":"Polygon","id":634,"arcs":[[637,202]]},{"type":"Polygon","id":642,"arcs":[[-603,638,259,-377,639,-538,640]]},{"type":"MultiPolygon","id":643,"arcs":[[[92]],[[279,-599,-634]],[[110,111]],[[113,114]],[[115,-115]],[[165]],[[171]],[[173]],[[176]],[[179,641,181,-637,-440,-613,-438,-570,642,-568,296,-354,-513,255,643,-382,-600,-492,283,-502,-630,287,644,289,645,291,-112]],[[304]],[[307]],[[308]]]},{"type":"Polygon","id":646,"arcs":[[-355,-451,646,647]]},{"type":"Polygon","id":732,"arcs":[[-479,-621,242,-601]]},{"type":"Polygon","id":682,"arcs":[[-563,-553,-586,201,-638,203,-330,-633,648,209]]},{"type":"Polygon","id":729,"arcs":[[649,-593,-485,212,-488,-499,650,651,652,-407]]},{"type":"Polygon","id":728,"arcs":[[-575,653,-455,-409,654,-652,655,-497]]},{"type":"Polygon","id":686,"arcs":[[-622,-609,-518,-522,238,-521,240]]},{"type":"MultiPolygon","id":90,"arcs":[[[28]],[[30]],[[31]],[[36]],[[37]]]},{"type":"Polygon","id":694,"arcs":[[-516,-591,235]]},{"type":"Polygon","id":222,"arcs":[[-527,-530,150]]},{"type":"Polygon","id":-99,"arcs":[[-494,-473,215,656]]},{"type":"Polygon","id":706,"arcs":[[-576,-495,-657,216]]},{"type":"Polygon","id":688,"arcs":[[-376,-607,-584,-612,-380,-535,-539,-640]]},{"type":"Polygon","id":740,"arcs":[[-505,657,-503,-397,-528,137]]},{"type":"Polygon","id":703,"arcs":[[658,-536,-349,-467,-636]]},{"type":"Polygon","id":705,"arcs":[[-540,-533,266,-562,-344]]},{"type":"Polygon","id":752,"arcs":[[-631,-500,285]]},{"type":"Polygon","id":748,"arcs":[[-615,659]]},{"type":"Polygon","id":760,"arcs":[[-559,-590,252,660,-555,-565]]},{"type":"Polygon","id":148,"arcs":[[-594,-650,-413,-448,-628]]},{"type":"Polygon","id":768,"arcs":[[-368,-365,231,-515]]},{"type":"Polygon","id":764,"arcs":[[-625,191,-611,-589,-579,189]]},{"type":"Polygon","id":762,"arcs":[[-435,-314,661,-577]]},{"type":"Polygon","id":795,"arcs":[[293,-566,662,-318,-551]]},{"type":"Polygon","id":626,"arcs":[[-541,32]]},{"type":"Polygon","id":780,"arcs":[[56]]},{"type":"Polygon","id":788,"arcs":[[247,-592,-481]]},{"type":"MultiPolygon","id":792,"arcs":[[[-514,-339,-550,-556,-661,253]],[[-524,-373,261]]]},{"type":"Polygon","id":158,"arcs":[[75]]},{"type":"Polygon","id":834,"arcs":[[218,-620,-624,663,-452,-356,-648,664,-573]]},{"type":"Polygon","id":800,"arcs":[[-647,-456,-654,-574,-665]]},{"type":"Polygon","id":804,"arcs":[[256,665,258,-639,-604,-641,-537,-659,-635,-383,-644]]},{"type":"Polygon","id":858,"arcs":[[140,-334,-399]]},{"type":"MultiPolygon","id":840,"arcs":[[[68]],[[69]],[[70]],[[71]],[[72]],[[118,666,120,667,122,668,124,-605,153,669,155,-415]],[[96]],[[103]],[[106]],[[-416,157]]]},{"type":"Polygon","id":860,"arcs":[[-572,-578,-662,-313,-663]]},{"type":"Polygon","id":862,"arcs":[[-529,-395,-459,135]]},{"type":"Polygon","id":704,"arcs":[[-581,-588,-427,670,187]]},{"type":"MultiPolygon","id":548,"arcs":[[[24]],[[25]]]},{"type":"Polygon","id":887,"arcs":[[-649,-632,208]]},{"type":"Polygon","id":710,"arcs":[[-627,-403,671,-616,-660,-614,220],[-596]]},{"type":"Polygon","id":894,"arcs":[[-618,672,-405,-626,-319,-453,-664,-623]]},{"type":"Polygon","id":716,"arcs":[[-406,-673,-617,-672]]}]}},"arcs":[[[3329,518],[-59,8],[-62,-3],[-34,19],[0,2],[-16,17],[63,-2],[60,-6],[20,24],[15,20],[29,-24],[-8,-29],[-8,-26]],[[524,597],[-36,20],[-17,20],[-1,4],[-18,16],[17,21],[52,-9],[28,-18],[21,-20],[7,-26],[-53,-8]],[[3597,517],[-66,3],[-36,19],[5,24],[59,16],[24,19],[18,25],[12,21],[17,21],[18,23],[14,0],[41,13],[42,-13],[35,-25],[12,-35],[3,-24],[1,-30],[-43,-18],[-45,-14],[-53,-14],[-58,-11]],[[1660,916],[-39,5],[-27,20],[6,19],[33,-10],[36,-9],[33,10],[-16,-20],[-26,-15]],[[1554,929],[-16,2],[-36,6],[-38,15],[20,13],[28,-14],[42,-22]],[[2327,1006],[-21,5],[-34,-2],[-34,2],[-38,-3],[-28,11],[-15,24],[18,10],[35,-8],[40,-5],[31,-8],[30,7],[16,-33]],[[3025,1007],[-36,2],[13,22],[-32,-8],[-31,-8],[-21,17],[-2,24],[30,23],[19,6],[33,-2],[8,29],[1,22],[0,46],[16,27],[25,9],[15,-21],[6,-22],[12,-26],[10,-25],[7,-25],[4,-26],[-5,-23],[-8,-21],[-33,-8],[-31,-12]],[[79,321],[8,5],[9,6],[9,5],[4,3]],[[109,340],[4,0],[3,-1]],[[116,339],[40,-24],[35,24],[6,3],[82,10],[26,-13],[14,-7],[41,-19],[79,-15],[63,-18],[107,-14],[80,16],[118,-11],[67,-18],[73,17],[78,15],[6,28],[-110,2],[-89,13],[-24,23],[-74,12],[5,26],[10,24],[10,21],[-5,24],[-47,16],[-21,20],[-43,18],[68,-3],[64,9],[40,-19],[50,17],[45,21],[23,19],[-10,24],[-36,16],[-41,17],[-57,3],[-50,8],[-54,6],[-18,21],[-36,18],[-21,20],[-9,66],[13,-6],[25,-18],[46,6],[44,8],[23,-25],[44,6],[37,12],[35,16],[32,19],[41,6],[-1,21],[-9,22],[8,20],[36,10],[16,-19],[42,11],[32,15],[40,1],[38,6],[37,13],[30,12],[34,13],[22,-4],[19,-4],[41,8],[37,-10],[38,1],[37,8],[37,-6],[41,-6],[39,3],[40,-1],[42,-2],[38,3],[28,17],[34,9],[35,-13],[33,10],[30,21],[18,-18],[9,-21],[18,-19],[29,17],[33,-21],[38,-7],[32,-16],[39,3],[36,11],[41,-3],[38,-8],[38,-10],[15,25],[-18,19],[-14,21],[-36,4],[-15,22],[-6,21],[-10,43],[21,-8],[36,-3],[36,3],[33,-9],[28,-17],[12,-20],[38,-4],[36,8],[38,12],[34,6],[28,-13],[37,4],[24,44],[22,-26],[33,-10],[34,6],[23,-23],[37,-2],[33,-7],[34,-12],[21,21],[11,21],[28,-23],[38,6],[28,-13],[19,-19],[37,6],[29,12],[29,15],[33,8],[39,6],[36,8],[27,13],[16,18],[7,25],[-3,23],[-9,23],[-10,22],[-9,23],[-7,20],[-1,23],[2,22],[13,22],[11,24],[5,22],[-6,25],[-3,23],[14,25],[15,17],[18,22],[19,18],[22,17],[11,25],[15,15],[18,15],[26,3],[18,19],[19,11],[23,7],[20,14],[16,18],[22,7],[16,-15],[-10,-19],[-29,-17],[-12,-12],[-20,9],[-23,-6],[-19,-13],[-20,-15],[-14,-17],[-4,-22],[2,-22],[13,-19],[-19,-14],[-26,-4],[-15,-19],[-17,-18],[-17,-25],[-4,-22],[9,-23],[15,-18],[23,-14],[21,-18],[12,-23],[6,-21],[8,-23],[13,-19],[8,-21],[4,-53],[8,-22],[2,-22],[9,-23],[-4,-30],[-15,-24],[-17,-19],[-37,-8],[-12,-20],[-17,-19],[-42,-22],[-37,-9],[-35,-12],[-37,-13],[-22,-23],[-45,-3],[-49,3],[-44,-5],[-47,0],[9,-22],[42,-11],[31,-15],[18,-21],[-31,-18],[-48,6],[-40,-15],[-2,-24],[-1,-22],[33,-19],[6,-22],[35,-21],[59,-9],[50,-16],[40,-18],[50,-18],[70,-9],[68,-16],[47,-17],[51,-19],[28,-27],[13,-22],[34,21],[46,17],[48,18],[58,14],[49,16],[69,1],[68,-8],[56,-13],[18,25],[39,17],[70,1],[55,12],[52,13],[58,7],[62,11],[43,14],[-20,21],[-12,20],[0,21],[-54,-2],[-57,-9],[-54,0],[-8,22],[4,42],[12,13],[40,13],[47,14],[34,17],[33,17],[25,22],[38,10],[38,8],[19,5],[43,2],[41,8],[34,11],[34,14],[30,13],[39,18],[24,20],[26,17],[8,22],[-29,14],[10,23],[18,18],[29,12],[31,13],[28,18],[22,23],[13,27],[20,16],[34,-4],[13,-19],[33,-2],[2,21],[14,23],[30,-6],[7,-21],[33,-3],[36,10],[35,6],[31,-3],[12,-24],[31,20],[28,10],[31,8],[31,7],[29,14],[31,9],[24,12],[17,21],[20,-15],[29,8],[20,-27],[16,-20],[31,11],[13,22],[28,16],[37,-3],[11,-22],[22,22],[30,7],[33,2],[29,-1],[31,-7],[30,-3],[13,-20],[18,-17],[31,11],[32,2],[32,0],[31,1],[28,8],[29,7],[25,15],[26,11],[28,5],[21,16],[15,32],[16,19],[29,-9],[11,-21],[24,-13],[29,4],[19,-20],[21,-15],[28,14],[10,25],[25,10],[29,19],[27,8],[33,11],[21,13],[23,13],[22,13],[26,-7],[25,20],[18,16],[26,-1],[23,13],[6,21],[23,16],[23,11],[28,9],[25,4],[25,-3],[26,-6],[22,-15],[3,-25],[24,-19],[17,-16],[33,-7],[19,-16],[23,-16],[26,-3],[23,11],[23,24],[27,-12],[27,-7],[26,-7],[27,-4],[28,0],[23,-60],[-1,-15],[-4,-26],[-26,-15],[-22,-21],[4,-23],[31,2],[-4,-23],[-14,-21],[-13,-24],[21,-18],[32,-6],[32,10],[15,23],[10,21],[15,18],[17,17],[7,21],[15,28],[17,5],[32,3],[28,6],[28,10],[14,22],[8,22],[19,21],[27,15],[23,11],[16,19],[15,10],[21,9],[27,-5],[25,5],[28,7],[30,-3],[20,15],[14,39],[11,-16],[13,-27],[23,-11],[27,-5],[26,7],[29,-5],[26,-1],[17,6],[24,-3],[21,-13],[25,8],[30,0],[25,8],[29,-8],[19,19],[14,19],[19,16],[35,43],[18,-8],[21,-16],[18,-20],[36,-35],[27,-1],[25,0],[30,7],[30,8],[23,15],[19,17],[31,3],[21,12],[22,-11],[14,-18],[19,-18],[31,2],[19,-15],[33,-14],[35,-6],[29,4],[21,18],[19,19],[25,4],[25,-8],[29,-6],[26,10],[25,0],[24,-6],[26,-6],[25,10],[30,9],[28,3],[32,0],[25,5],[25,5],[8,28],[1,24],[17,-16],[5,-26],[10,-24],[11,-19],[23,-10],[32,3],[36,1],[25,4],[37,0],[26,1],[36,-2],[31,-5],[20,-18],[-5,-21],[18,-17],[29,-14],[31,-14],[36,-11],[38,-9],[28,-9],[32,-1],[18,19],[24,-15],[21,-18],[25,-14],[34,-6],[32,-6],[13,-23],[32,-14],[21,-20],[31,-9],[32,1],[30,-3],[33,1],[33,-4],[31,-8],[29,-14],[29,-11],[20,-17],[-4,-23],[-14,-20],[-13,-26],[-10,-20],[-13,-24],[-36,-9],[-16,-20],[-36,-13],[-13,-22],[-19,-22],[-20,-18],[-11,-23],[-7,-22],[-3,-26],[0,-21],[16,-23],[6,-21],[13,-21],[52,-7],[11,-25],[-50,-9],[-43,-13],[-52,-2],[-24,-33],[-5,-27],[-12,-21],[-14,-22],[37,-19],[14,-24],[24,-21],[33,-19],[39,-18],[42,-18],[64,-18],[14,-29],[80,-12],[5,-4],[21,-17],[76,14],[64,-18],[-9951,-14],[1,0],[25,33],[50,-18],[3,2]],[[3140,2021],[-10,-23],[-23,-18]],[[3107,1980],[-30,7]],[[3077,1987],[-21,17],[-29,8],[-35,32],[-28,31],[-38,65],[23,-12],[39,-39],[36,-20],[15,26],[9,40],[25,23],[20,-6]],[[3093,2152],[11,-27],[14,-43],[36,-35],[39,-14],[-13,-29],[-26,-3],[-14,20]],[[3314,2171],[-14,26],[33,34],[24,-14],[16,23],[22,-26],[-8,-20],[-37,-17],[-13,20],[-23,-26]],[[6909,2316],[-1,31],[4,24],[2,11],[18,-18],[26,-7],[1,-11],[-8,-26],[-42,-4]],[[9079,2670],[-6,3],[-17,2],[-17,49],[-4,38],[-16,50],[1,27],[18,-6],[27,-19],[15,7],[21,12],[17,-4],[2,-69],[-9,-20],[-3,-46],[-10,16],[-19,-40]],[[9703,2497],[-26,1],[-18,19],[-30,4],[-5,21],[15,43],[35,57],[18,10],[20,22],[24,31],[16,29],[13,43],[10,15],[4,32],[20,27],[6,-25],[6,-24],[20,24],[8,-25],[0,-24],[-10,-26],[-18,-43],[-14,-23],[10,-28],[-22,-1],[-23,-21],[-8,-38],[-16,-58],[-21,-26],[-14,-16]],[[9867,2782],[-5,15],[-12,8],[16,48],[-9,31],[-30,23],[1,21],[20,20],[5,45],[-1,37],[-12,39],[1,10],[-13,23],[-22,51],[-12,41],[11,5],[15,-32],[21,-15],[8,-52],[20,-60],[1,39],[13,-16],[4,-43],[22,-19],[19,-4],[16,21],[14,-6],[-7,-51],[-8,-34],[-22,1],[-7,-17],[3,-25],[-5,-11],[-10,-31],[-14,-39],[-21,-23]],[[9631,3893],[-16,15],[-19,26],[-18,31],[-19,40],[-4,20],[12,-1],[16,-20],[12,-19],[9,-16],[23,-36],[14,-27],[-10,-13]],[[9942,4129],[-16,7],[-2,26],[10,20],[13,-8],[7,10],[9,-17],[-4,-30],[-17,-8]],[[0,4229],[9981,-14],[-17,-12],[-4,21],[14,12],[9,3],[-9983,18]],[[0,4257],[0,-28]],[[0,4257],[6,3],[-4,-28],[-2,-3]],[[9652,4227],[-9,25],[1,15],[17,-33],[-9,-7]],[[9645,4276],[-7,7],[-6,-3],[-4,16],[0,44],[13,-17],[4,-47]],[[6261,3708],[-16,15],[-22,21],[-8,30],[-2,51],[-10,46],[-2,41],[5,42],[13,10],[0,19],[13,44],[2,36],[-6,28],[-5,36],[-2,53],[9,32],[4,37],[14,2],[15,12],[11,10],[12,1],[16,33],[22,35],[9,29],[-4,25],[12,-7],[15,40],[1,34],[9,26],[10,-25],[7,-24],[7,-38],[4,-69],[7,-27],[-2,-28],[-5,-17],[-10,34],[-5,-17],[5,-43],[-2,-24],[-8,-14],[-1,-48],[-11,-67],[-14,-80],[-17,-109],[-11,-80],[-12,-67],[-23,-13],[-24,-25]],[[9063,2935],[-23,25],[-17,10],[5,30],[-15,-11],[-25,-41],[-24,15],[-16,9],[-15,5],[-27,16],[-18,36],[-5,43],[-7,29],[-13,24],[-27,7],[9,28],[-7,42],[-13,-39],[-25,-11],[14,32],[5,33],[10,28],[-2,43],[-22,-49],[-18,-20],[-10,-46],[-22,24],[1,31],[-18,41],[-14,22],[5,13],[-36,35],[-19,2],[-27,28],[-50,-6],[-36,-20],[-31,-19],[-27,3],[-29,-29],[-24,-13],[-6,-31],[-10,-23],[-23,-1],[-18,-6],[-24,11],[-20,-6],[-20,-3],[-16,-31],[-8,3],[-14,-16],[-13,-19],[-21,3],[-18,0],[-30,36],[-15,11],[1,33],[14,8],[4,13],[-1,21],[4,40],[-3,34],[-15,58],[-5,33],[2,33],[-11,37],[-1,17],[-12,23],[-4,45],[-16,46],[-4,25],[13,-25],[-10,53],[14,-17],[8,-22],[0,30],[-14,45],[-3,18],[-6,17],[3,34],[6,14],[3,29],[-3,33],[12,42],[2,-44],[12,39],[22,20],[14,24],[21,21],[13,5],[7,-7],[22,21],[17,7],[4,12],[8,5],[15,-1],[29,17],[15,26],[7,30],[17,30],[1,23],[1,31],[19,49],[12,-50],[12,12],[-10,27],[8,28],[13,-13],[3,44],[15,28],[7,23],[14,10],[0,16],[13,-7],[0,15],[12,8],[14,8],[20,-27],[16,-34],[17,0],[18,-6],[-6,32],[13,46],[13,15],[-5,15],[12,32],[17,21],[14,-7],[24,11],[-1,29],[-20,19],[15,9],[18,-15],[15,-23],[23,-15],[8,6],[17,-18],[17,17],[10,-5],[7,11],[12,-29],[-7,-31],[-11,-23],[-9,-2],[3,-23],[-8,-29],[-10,-28],[2,-16],[22,-32],[21,-18],[15,-20],[20,-34],[8,0],[14,-15],[4,-18],[27,-19],[18,19],[6,31],[5,26],[4,31],[8,46],[-4,28],[2,17],[-3,33],[4,43],[5,12],[-4,19],[6,30],[6,32],[0,17],[11,21],[8,-28],[2,-36],[6,-7],[2,-24],[10,-30],[2,-32],[-1,-21],[10,-45],[18,21],[9,-24],[13,-22],[-3,-26],[6,-49],[4,-29],[7,-7],[8,-49],[-3,-30],[9,-39],[30,-30],[20,-28],[19,-25],[-4,-14],[16,-36],[11,-62],[11,13],[11,-25],[7,8],[5,-61],[19,-35],[13,-22],[22,-47],[8,-46],[1,-33],[-2,-35],[13,-49],[-2,-51],[-5,-27],[-7,-51],[0,-33],[-5,-42],[-12,-52],[-21,-28],[-10,-45],[-9,-28],[-8,-50],[-11,-29],[-7,-43],[-4,-39],[2,-19],[-16,-20],[-31,-2],[-26,-23],[-13,-23],[-17,-24]],[[9510,4559],[-19,0],[-11,36],[17,-14],[5,-2],[8,-20]],[[8341,4592],[-37,40],[26,11],[14,-17],[10,-18],[-2,-15],[-11,-1]],[[9456,4613],[-17,5],[-6,9],[2,23],[19,-9],[9,-12],[4,-15],[-11,-1]],[[9486,4619],[-21,50],[-5,34],[9,0],[10,-46],[11,-27],[-4,-11]],[[8470,4670],[4,14],[24,13],[19,2],[9,7],[10,-7],[-10,-16],[-29,-25],[-23,-17]],[[8474,4641],[-18,-43],[-24,-12],[-3,7],[2,19],[12,35],[27,23]],[[8257,4662],[-15,0],[9,33],[16,1],[7,20],[10,-15],[17,5],[7,-25],[-32,-11],[-19,-8]],[[8367,4668],[-37,7],[0,21],[22,12],[18,-17],[18,4],[25,21],[-4,-32],[-42,-16]],[[9441,4691],[-22,24],[-15,21],[-10,19],[4,6],[13,-14],[22,-26],[7,-19],[1,-11]],[[9370,4756],[-13,13],[-11,24],[1,9],[17,-24],[11,-19],[-5,-3]],[[8181,4678],[-30,24],[-25,-2],[-29,4],[-26,11],[-32,22],[-21,5],[-11,-7],[-51,24],[-5,25],[-25,4],[19,55],[34,-4],[22,-22],[12,-4],[3,-21],[54,-6],[6,24],[51,-28],[10,-37],[42,-10],[34,-35],[-32,-22]],[[8727,4785],[-3,44],[5,20],[6,20],[7,-17],[-1,-27],[-14,-40]],[[9321,4784],[-12,22],[-12,37],[-6,43],[4,6],[3,-17],[8,-13],[14,-37],[13,-19],[-4,-16],[-8,-6]],[[9158,4819],[-23,16],[-16,16],[2,18],[25,-8],[15,4],[5,28],[4,1],[2,-30],[16,4],[8,20],[15,20],[-3,34],[17,2],[6,-10],[-1,-32],[-9,-35],[-15,-5],[-4,-16],[-15,-14],[-15,-13],[-14,0]],[[8523,4964],[-19,11],[-5,24],[28,3],[7,-19],[-11,-19]],[[8633,4960],[-23,24],[-23,5],[-16,-4],[-19,2],[6,32],[35,2],[30,-17],[10,-44]],[[9244,4908],[-5,34],[-6,22],[-13,19],[-16,25],[-20,17],[8,13],[15,-16],[9,-12],[12,-14],[11,-24],[11,-19],[3,-30],[-9,-15]],[[8916,5033],[48,-40],[51,-33],[19,-29],[16,-29],[4,-34],[46,-36],[7,-30],[-25,-7],[6,-38],[24,-38],[19,-61],[15,2],[-1,-25],[22,-10],[-9,-11],[30,-24],[-3,-17],[-19,-4],[-6,15],[-24,6],[-28,9],[-22,37],[-16,31],[-14,51],[-36,25],[-24,-16],[-17,-19],[4,-43],[-22,-20],[-16,10],[-28,2]],[[8917,4657],[-25,48],[-28,11],[-7,-16],[-35,-2],[12,47],[17,16],[-7,62],[-14,49],[-53,49],[-23,4],[-42,54],[-8,-28],[-11,-5],[-6,21],[0,25],[-22,28],[30,21],[20,-1],[-2,15],[-41,0],[-11,34],[-25,11],[-11,28],[37,14],[14,19],[45,-23],[4,-22],[8,-93],[29,-35],[23,62],[32,34],[25,0],[23,-20],[21,-20],[30,-11]],[[8327,4856],[-12,17],[8,53],[-4,55],[-12,1],[-9,39],[12,38],[4,46],[14,86],[5,24],[24,43],[22,-17],[35,-8],[32,2],[27,42],[5,-13],[-22,-57],[-21,-11],[-27,11],[-46,-3],[-24,-8],[-4,-43],[24,-52],[15,26],[52,20],[-2,-27],[-12,9],[-12,-34],[-25,-22],[27,-74],[-5,-20],[25,-66],[-1,-38],[-15,-17],[-10,20],[13,47],[-27,-22],[-7,16],[3,22],[-20,34],[2,56],[-18,-17],[2,-68],[1,-82],[-17,-8]],[[8557,5131],[-11,36],[-8,74],[6,46],[9,21],[2,-32],[16,-5],[3,-23],[-2,-51],[-14,6],[-4,-35],[11,-30],[-8,-7]],[[7908,4844],[-24,48],[-35,47],[-12,35],[-21,47],[-14,43],[-21,81],[-24,48],[-9,49],[-10,45],[-25,37],[-14,49],[-21,32],[-29,64],[-3,29],[18,-2],[43,-11],[25,-57],[21,-39],[16,-24],[26,-62],[28,-1],[23,-39],[16,-48],[22,-27],[-12,-47],[16,-20],[10,-1],[5,-40],[10,-32],[20,-5],[14,-37],[-7,-72],[-2,-89],[-30,-1]],[[8045,5298],[21,-20],[21,11],[6,49],[12,11],[33,12],[20,46],[13,36]],[[8171,5443],[11,22],[24,31]],[[8206,5496],[21,40],[14,45],[12,0],[14,-29],[1,-25],[19,-16],[23,-17],[-2,-23],[-19,-3],[5,-28],[-20,-19]],[[8274,5421],[-16,-52],[20,-55],[-5,-26],[32,-54],[-33,-6],[-10,-40],[2,-52],[-27,-39],[-1,-58],[-11,-88],[-4,21],[-31,-26],[-11,35],[-20,3],[-14,19],[-33,-21],[-10,28],[-18,-3],[-23,6],[-4,78],[-14,16],[-14,49],[-3,50],[3,54],[16,38]],[[8482,5504],[-32,33],[-8,42],[8,27],[-17,27],[-9,-23],[-13,2],[-21,-32],[-4,17],[11,48],[17,16],[15,22],[10,-26],[21,16],[5,25],[19,2],[-1,44],[22,-27],[3,-29],[2,-21],[2,-38],[2,-33],[-9,-52],[-11,58],[-13,-29],[9,-42],[-8,-27]],[[7231,5526],[-13,46],[-5,83],[13,93],[19,-32],[13,-40],[13,-60],[-4,-60],[-12,-17],[-24,-13]],[[3284,5758],[-5,5],[8,16],[-1,23],[16,7],[6,-2],[-1,-42],[-23,-7]],[[8416,5702],[-17,40],[5,15],[7,16],[3,36],[16,3],[-5,-38],[21,55],[-3,-55],[-10,-19],[-9,-36],[-8,-17]],[[8254,5664],[14,40],[20,36],[16,40],[15,57],[5,-47],[-19,-32],[-14,-39],[-37,-55]],[[8388,5784],[-1,26],[2,30],[-4,27],[16,-18],[18,0],[0,-24],[-13,-24],[-18,-17]],[[8466,5766],[-1,40],[-9,3],[-4,35],[16,-4],[0,22],[-17,44],[27,-2],[7,-21],[8,-65],[-21,16],[0,-20],[7,-35],[-13,-13]],[[8368,5885],[-12,29],[-15,44],[24,-2],[10,-21],[-7,-50]],[[8446,5904],[-22,29],[-10,30],[-7,-21],[-18,34],[-25,-8],[-14,12],[1,24],[9,15],[-8,13],[-4,-21],[-14,33],[-4,26],[-1,55],[11,-19],[3,90],[9,52],[17,0],[17,-16],[9,15],[2,-15],[-4,-24],[9,-41],[-7,-48],[-16,-19],[-5,-47],[6,-46],[15,-6],[12,7],[35,-32],[-2,-31],[9,-14],[-3,-27]],[[3133,6216],[-1,24],[4,9],[22,0],[15,-6],[5,-11],[-7,-14],[-21,0],[-17,-2]],[[2855,6202],[-15,9],[-16,21],[3,13],[12,4],[6,-2],[19,-5],[14,-14],[5,-16],[-20,-1],[-8,-9]],[[3008,6318],[3,9],[22,0],[16,-15],[8,2],[5,-21],[15,2],[-1,-18],[12,-2],[14,-21],[-10,-23],[-14,12],[-12,-2],[-9,3],[-5,-11],[-11,-3],[-4,14],[-10,-9],[-11,-39],[-7,9],[-1,17]],[[3008,6222],[-19,9],[-13,-4],[-17,4],[-13,-10],[-15,18],[3,18],[25,-8],[21,-4],[10,12],[-12,25],[0,22],[-18,9],[7,16],[17,-2],[24,-9]],[[8040,6230],[-23,18],[0,50],[13,26],[31,16],[16,-1],[6,-22],[-12,-26],[-7,-33],[-24,-28]],[[675,6272],[-7,8],[1,16],[-4,21],[1,6],[5,10],[-2,11],[1,5],[3,-1],[10,-9],[5,-5],[5,-8],[7,-20],[-1,-3],[-11,-13],[-9,-9],[-4,-9]],[[655,6367],[-5,12],[-3,5],[0,3],[3,5],[9,-5],[8,-9],[-3,-7],[-9,-4]],[[645,6396],[-15,1],[2,7],[13,-2],[0,-6]],[[619,6407],[-2,1],[-10,2],[-3,13],[-1,2],[7,8],[3,-4],[8,-19],[-2,-3]],[[570,6443],[-9,10],[1,4],[5,6],[6,-1],[1,-14],[-4,-5]],[[2840,6326],[18,32],[-11,15],[-18,4],[-9,16],[-7,33],[-16,-2],[-26,15],[-8,12],[-36,9],[-10,12],[11,14],[-28,3],[-20,-30],[-11,-1],[-4,-14],[-14,-6],[-12,5],[15,18],[6,21],[12,13],[15,11],[21,5],[6,7],[24,-4],[22,-1],[26,-20],[11,-21],[26,7],[10,-14],[24,-35],[17,-26],[9,0],[17,-11],[-2,-17],[20,-2],[21,-24],[-3,-13],[-19,-7],[-18,-3],[-19,4],[-40,-5]],[[2839,6548],[-7,33],[-10,17],[6,36],[8,-2],[10,-48],[0,-33],[-7,-3]],[[8353,6448],[-14,48],[-4,43],[17,56],[22,44],[13,-17],[-5,-35],[-17,-92],[-12,-47]],[[2808,6704],[-2,21],[13,5],[18,-2],[1,-15],[-30,-9]],[[2856,6673],[-5,7],[0,30],[-12,23],[0,6],[22,-25],[-5,-41]],[[8694,7066],[-18,16],[0,27],[15,35],[16,-7],[12,24],[20,-12],[4,-20],[-16,-35],[-11,19],[-15,-14],[-7,-33]],[[5943,7201],[1,-4],[-29,-24],[-13,8],[-7,23],[14,2]],[[5909,7206],[2,0],[4,14],[20,-1],[25,17],[-19,-24],[2,-11]],[[5686,7193],[0,10],[-33,11],[5,24],[15,-19],[21,3],[21,-4],[-1,-10],[16,7],[-4,-17],[-40,-5]],[[5419,7291],[-21,22],[-14,6],[-39,29],[4,30],[32,-5],[28,6],[22,5],[-10,-45],[4,-18],[-6,-30]],[[5244,7423],[-10,15],[-2,70],[-6,32],[15,-2],[14,17],[17,-40],[-4,-77],[-13,4],[-11,-19]],[[8629,6969],[-13,23],[7,51],[-18,17],[-11,40],[26,17],[15,37],[28,29],[20,40],[55,17],[30,-12],[29,103],[19,-28],[40,58],[16,22],[17,70],[-4,65],[11,37],[30,10],[15,-80],[-1,-46],[-25,-58],[0,-60],[-10,-46],[4,-29],[-14,-40],[-35,-27],[-49,-4],[-40,-66],[-19,23],[-1,43],[-48,-13],[-33,-27],[-32,-1],[28,-43],[-19,-98],[-18,-24]],[[5256,7565],[-13,12],[-6,39],[5,21],[18,22],[5,-49],[-9,-45]],[[8887,7576],[-4,57],[14,45],[29,3],[8,80],[9,44],[32,-59],[22,-20],[19,-12],[20,24],[6,-64],[-41,-16],[-25,-57],[-43,39],[-15,-63],[-31,-1]],[[3253,7829],[-35,25],[-7,19],[10,18],[10,-28],[20,-8],[26,2],[-14,-24],[-10,-4]],[[3269,8009],[-36,18],[-26,27],[10,5],[37,-14],[28,-24],[1,-11],[-14,-1]],[[1555,7968],[-46,26],[-8,20],[-25,20],[-5,17],[-28,10],[-11,32],[2,13],[29,-13],[17,-8],[27,-6],[9,-20],[14,-28],[27,-23],[12,-32],[-14,-8]],[[3513,7867],[-18,11],[6,47],[-8,7],[-32,-50],[-17,2],[20,27],[-27,14],[-30,-3],[-54,2],[-4,17],[17,20],[-12,15],[24,35],[28,92],[17,33],[25,20],[12,-3],[-5,-16],[-15,-36],[-18,-50],[18,19],[19,-12],[-10,-20],[25,-16],[12,14],[28,-18],[-8,-42],[19,10],[3,-31],[9,-35],[-12,-51],[-12,-2]],[[1356,8187],[-11,0],[-17,27],[-10,26],[-14,18],[-5,25],[1,19],[13,-8],[27,5],[-8,-66],[24,-46]],[[8946,7829],[-5,49],[3,56],[-3,62],[6,43],[1,77],[-16,57],[3,79],[25,26],[-11,27],[13,8],[7,-38],[9,-56],[0,-56],[11,-58],[28,-102],[-41,19],[-17,-84],[27,-59],[-1,-40],[-21,35],[-18,-45]],[[4789,8357],[23,2],[30,-35],[-15,-40]],[[4827,8284],[5,-41],[-21,-51],[-49,-34],[-40,8],[23,61],[-15,58],[38,45],[21,27]],[[5335,8338],[-29,32],[-4,24],[41,19],[9,-28],[-17,-47]],[[722,8449],[-14,15],[-5,27],[26,21],[15,8],[18,-3],[12,-18],[-24,-28],[-28,-22]],[[4905,8144],[-44,9]],[[4861,8153],[-8,23],[29,18],[-15,31],[5,38],[42,-5],[4,33]],[[4918,8291],[-19,36]],[[4899,8327],[-34,10],[-7,16],[10,26],[-9,16],[-15,-28],[-1,56],[-14,29],[10,60],[21,47],[22,-5],[34,5],[-30,-62],[29,7],[30,0],[-7,-47],[-25,-51],[29,-4]],[[4942,8402],[26,-74]],[[4968,8328],[19,-9],[18,-66],[8,-23],[33,-11],[-3,-37],[-14,-16],[11,-30],[-25,-30],[-37,0],[-48,-16],[-13,12],[-18,-27],[-26,6],[-19,-22],[-15,12],[41,60],[25,13]],[[383,8623],[-18,11],[-17,16],[28,10],[22,-6],[2,-22],[-17,-9]],[[2787,8731],[-12,5],[-8,18],[2,4],[10,17],[12,-1],[7,-12],[-11,-31]],[[2692,8762],[-19,1],[-6,16],[20,26],[38,0],[0,-11],[-33,-32]],[[291,8809],[-21,12],[-11,11],[-24,-4],[-7,6],[2,21],[17,-11],[17,6],[22,-15],[28,-8],[-2,-6],[-21,-12]],[[2624,8813],[-10,34],[-37,-6],[24,29],[4,45],[9,53],[20,-5],[5,-25],[14,9],[17,-15],[30,-20],[32,-18],[2,-27],[21,4],[20,-19],[-25,-18],[-43,14],[-16,26],[-27,-31],[-40,-30]],[[4481,8839],[-36,8],[-78,18],[28,26],[-61,28],[49,11],[-1,17],[-58,13],[19,38],[42,8],[43,-39],[42,32],[35,-17],[45,31],[46,-4],[-6,-37],[31,-39],[-36,-44],[-80,-40],[-24,-10]],[[2861,9046],[-7,28],[12,33],[25,8],[22,-16],[0,-25],[-3,-8],[-18,-17],[-31,-3]],[[0,9154],[68,-44],[73,-58],[-3,-35],[19,-15],[-6,42],[75,-9],[54,-53],[-27,-26],[-46,-6],[0,-56],[-11,-12],[-26,2],[-22,20],[-37,17],[-6,25],[-28,9],[-32,-7],[-15,20],[6,21],[-33,-13],[13,-27],[-16,-25]],[[0,8924],[0,230]],[[2326,9142],[-38,17],[-23,-6],[-37,26],[24,18],[19,24],[30,-16],[17,-10],[8,-11],[17,-22],[-17,-20]],[[0,9261],[9969,-3],[-5,18],[-9964,24]],[[0,9300],[0,-39]],[[0,9300],[3,3],[24,0],[40,-17],[-2,-8],[-29,-13],[-36,-4]],[[3245,7816],[46,9],[28,64]],[[3319,7889],[2,-42],[17,-20],[-34,-38],[-61,-34],[-28,-24],[-31,-41],[-21,4],[-1,49],[48,47],[-44,-1],[-31,-7]],[[3135,7782],[5,-19],[-30,-28],[-29,-20],[-29,-17]],[[3052,7698],[-16,-38],[-3,-9]],[[3033,7651],[-1,-31],[9,-30],[12,-2],[-3,21],[8,-13],[-2,-16],[-19,-9],[-13,1],[-20,-10],[-13,-3],[-16,-3],[-23,-17],[41,11],[8,-11],[-39,-17],[-17,0],[0,7],[-8,-16],[8,-3],[-6,-41],[-20,-44],[-2,14],[-6,3],[-9,15],[5,-31],[7,-10],[1,-22],[-9,-23],[-16,-46],[-2,3],[8,39],[-14,22],[-3,48],[-6,-25],[6,-37]],[[2879,7375],[-17,9],[18,-18]],[[2880,7366],[1,-55],[8,-4],[3,-20],[4,-57],[-18,-43],[-28,-17],[-19,-34],[-13,-4],[-14,-21],[-4,-19],[-31,-38],[-16,-27],[-13,-34],[-4,-41],[5,-40],[9,-49],[13,-41],[0,-25],[13,-67],[-1,-39],[-1,-22],[-7,-35],[-8,-7],[-14,7],[-4,25],[-11,13],[-15,50],[-13,44],[-4,22],[6,38],[-8,32],[-22,48],[-10,9],[-28,-26],[-5,3],[-14,27],[-17,14],[-32,-7],[-24,6],[-22,-4]],[[2522,6928],[-11,-8],[5,-16]],[[2516,6904],[0,-24],[5,-11],[-5,-8],[-10,9],[-11,-11],[-20,2],[-21,30],[-24,-7],[-20,13],[-17,-4],[-24,-13],[-25,-43],[-27,-25],[-16,-27],[-6,-26],[0,-40],[1,-27],[5,-20]],[[2301,6672],[-10,-50],[-5,-42],[-2,-77],[-3,-28],[5,-32],[8,-28],[6,-44],[18,-43],[7,-33],[11,-28],[29,-16],[12,-24],[24,16],[21,6]],[[2422,6249],[21,11],[18,9]],[[2461,6269],[17,24],[7,33],[2,49],[5,17],[19,15],[29,13],[25,-2],[17,5],[6,-12],[-1,-28],[-15,-34],[-6,-35],[5,-10],[-4,-25],[-7,-45],[-7,15],[-6,-1]],[[2547,6248],[0,-9],[5,0],[0,-16],[-5,-25],[3,-8],[-3,-21],[2,-6],[-4,-29],[-5,-15],[-5,-2],[-6,-20]],[[2529,6097],[9,-10],[3,8],[8,-7]],[[2549,6088],[3,-2],[6,10],[8,1],[2,-5],[5,3],[13,-5],[13,1],[8,7],[4,6],[9,-3],[6,-4],[7,2],[6,5],[13,-8],[4,-2],[9,-11],[8,-12],[10,-9],[7,-16]],[[2690,6046],[-2,-6],[-2,-12],[3,-22],[-6,-19],[-3,-23],[-1,-26],[1,-15],[1,-25],[-4,-6],[-3,-25],[2,-15],[-6,-15],[2,-15],[4,-10]],[[2676,5812],[7,-31],[11,-23],[13,-25]],[[2707,5733],[10,-20],[-1,-13],[11,-2],[3,4],[7,-14],[14,4],[12,15],[17,12],[9,17],[16,-4],[-1,-5],[15,-2],[12,-10],[10,-17],[10,-16]],[[2851,5682],[14,-2],[21,40],[12,6],[0,19],[5,49],[16,27],[17,1],[3,12],[21,-5],[22,29],[11,13],[14,28],[9,-4],[8,-15],[-6,-19]],[[3018,5861],[-1,-14],[-16,-7],[9,-26],[0,-30],[-12,-34],[10,-45],[12,4],[6,41],[-8,20],[-2,44],[35,23],[-4,28],[10,18],[10,-41],[19,-1],[18,-32],[1,-19],[25,0],[30,6],[16,-26],[21,-7],[16,18],[0,14],[34,4],[34,0],[-24,-17],[10,-27],[22,-4],[21,-28],[4,-47],[15,2],[11,-14]],[[3340,5664],[18,-21],[17,-38],[1,-29],[10,-2],[15,-28],[11,-20]],[[3412,5526],[33,-11],[3,10],[23,4],[30,-15]],[[3501,5514],[9,-6],[21,-14],[29,-49],[5,-23]],[[3565,5422],[9,3],[7,-32],[16,-101],[14,-10],[1,-39],[-21,-48],[9,-17],[49,-9],[1,-58],[21,38],[35,-21],[46,-35],[14,-34],[-5,-32],[32,18],[55,-30],[41,2],[41,-48],[36,-64],[21,-17],[24,-2],[10,-18],[9,-74],[5,-34],[-11,-96],[-14,-37],[-40,-80],[-17,-65],[-21,-50],[-7,-1],[-7,-43],[1,-108],[-7,-88],[-3,-38],[-9,-23],[-5,-77],[-28,-75],[-5,-60],[-22,-25],[-7,-34],[-30,0],[-44,-22],[-19,-26],[-31,-17],[-33,-46],[-24,-57],[-4,-43],[5,-31],[-5,-59],[-6,-28],[-20,-31],[-31,-102],[-24,-45],[-19,-27],[-13,-55],[-18,-33]],[[3517,3238],[-12,-36],[-31,-32],[-21,11],[-15,-6],[-26,25],[-18,-2],[-17,32]],[[3377,3230],[-2,-30],[35,-50],[-4,-39],[18,-25],[-2,-28],[-27,-74],[-41,-31],[-55,-12],[-31,6],[6,-35],[-6,-43],[5,-29],[-16,-20],[-29,-8],[-26,21],[-11,-15],[4,-57],[18,-18],[16,18],[8,-29],[-26,-18],[-22,-36],[-4,-58],[-7,-31],[-26,0],[-22,-30],[-8,-43],[28,-42],[26,-12],[-9,-51],[-33,-33],[-18,-67],[-25,-23],[-12,-27],[9,-60],[19,-33],[-12,3]],[[3095,2171],[-25,0],[-13,-14],[-25,-21],[-5,-53],[-11,-2],[-32,19],[-32,40],[-34,33],[-9,36],[8,34],[-14,38],[-4,99],[12,55],[30,44],[-43,17],[27,51],[9,96],[31,-20],[15,119],[-19,15],[-9,-72],[-17,8],[9,83],[9,106],[13,40],[-8,56],[-2,65],[11,2],[17,93],[20,92],[11,86],[-6,86],[8,47],[-3,71],[16,71],[5,111],[9,120],[9,129],[-2,94],[-6,81]],[[3045,4126],[-28,33],[-2,24],[-55,57],[-50,63],[-22,36],[-11,47],[4,17],[-23,76],[-28,106],[-26,114],[-11,27],[-9,42],[-21,38],[-20,23],[9,26],[-14,55],[9,40],[22,36]],[[2769,4986],[15,43],[-6,26],[-11,-27],[-16,25],[5,16],[-4,53],[9,8],[5,36],[11,37],[-2,24],[15,12],[19,23]],[[2809,5262],[-4,18],[11,4],[-1,29],[6,21],[14,4],[12,36],[10,30],[-10,14],[5,33],[-6,53],[6,15],[-4,49],[-12,30]],[[2836,5598],[-9,17],[-6,31],[7,15],[-7,4],[-5,19],[-14,16],[-12,-3],[-6,-20],[-11,-15],[-6,-2],[-3,-12],[13,-31],[-7,-7],[-4,-9],[-13,-3],[-5,35],[-4,-10],[-9,3],[-5,23],[-12,4],[-7,7],[-12,0],[-1,-13],[-3,9]],[[2695,5656],[-15,13],[-6,12],[4,10],[-1,13],[-8,13],[-11,12],[-10,7],[-1,17],[-8,10],[2,-17],[-6,-13],[-6,16],[-9,5],[-4,12],[1,18],[3,18],[-8,8],[7,11]],[[2619,5821],[-10,18],[-13,23],[-6,20],[-12,18],[-14,26],[4,9],[4,-9],[2,4]],[[2574,5930],[-5,18],[-8,5]],[[2561,5953],[-3,-13],[-16,0],[-10,6],[-12,11],[-15,4],[-8,12]],[[2497,5973],[-14,10],[-18,1],[-12,12],[-15,24]],[[2438,6020],[-32,62],[-14,18],[-23,15],[-15,-4],[-22,-22],[-14,-5],[-20,15],[-21,11],[-26,26],[-21,8],[-31,27],[-23,28],[-7,15],[-16,4],[-28,18],[-12,26],[-30,33],[-14,36],[-6,28],[9,6],[-3,16],[7,15],[0,20],[-10,26],[-2,23],[-9,29],[-25,57],[-28,45],[-13,36],[-24,23],[-5,14],[4,36],[-14,13],[-17,28],[-7,41],[-15,4],[-16,31],[-13,28],[-1,18],[-15,43],[-10,44],[1,22],[-20,23],[-10,-2],[-15,16],[-5,-24],[5,-28],[2,-43],[10,-23],[21,-40],[4,-14],[4,-4],[4,-20],[5,1],[6,-37],[8,-15],[6,-20],[17,-29],[10,-54],[8,-25],[8,-27],[1,-30],[13,-2],[12,-26],[10,-26],[-1,-10],[-12,-22],[-5,1],[-7,35],[-18,33],[-20,27],[-14,15],[1,42],[-5,31],[-13,18],[-19,26],[-4,-8],[-7,15],[-17,14],[-16,34],[2,4],[11,-3],[11,21],[1,26],[-22,41],[-16,16],[-10,36],[-11,38],[-12,46],[-12,52]],[[1746,7056],[-4,29],[-18,33],[-13,7],[-3,17],[-16,3],[-10,15],[-26,6],[-7,9],[-3,32],[-27,58],[-23,80],[1,13],[-13,19],[-21,48],[-4,47],[-15,32],[6,48],[-1,49],[-8,44],[10,54]],[[1551,7699],[7,105]],[[1558,7804],[-5,77],[-9,49],[-8,27],[4,11],[40,-19],[15,-55],[6,16],[-4,47],[-9,47]],[[1588,8004],[-4,0],[-54,57],[-20,25],[-50,23],[-16,51],[4,36],[-35,24],[-5,47],[-34,41],[0,30]],[[1374,8338],[-15,22],[-25,18],[-8,50],[-36,47],[-15,54],[-26,4],[-44,1],[-33,17],[-57,60],[-27,11],[-49,20],[-38,-5],[-55,27],[-33,24],[-30,-12],[5,-40],[-15,-4],[-32,-12],[-25,-19],[-30,-12],[-4,34],[12,56],[30,18],[-8,14],[-35,-32],[-19,-38],[-40,-41],[20,-28],[-26,-41],[-30,-24],[-28,-18],[-7,-25],[-43,-30],[-9,-27],[-33,-25],[-19,5],[-26,-17],[-28,-19],[-23,-19],[-47,-17],[-5,10],[31,27],[27,18],[29,31],[35,7],[13,23],[39,35],[6,11],[21,20],[4,44],[15,34],[-32,-17],[-9,10],[-15,-21],[-19,29],[-7,-21],[-10,29],[-28,-23],[-17,0],[-3,34],[5,21],[-17,21],[-37,-11],[-23,27],[-19,14],[0,32],[-22,25],[11,33],[23,32],[10,30],[22,4],[19,-9],[23,27],[20,-5],[21,18],[-5,27],[-16,10],[21,22],[-17,-1],[-30,-12],[-8,-13],[-22,13],[-39,-7],[-41,14],[-12,23],[-35,34],[39,24],[62,28],[23,0],[-4,-29],[59,3],[-23,35],[-34,22],[-20,29],[-26,24],[-38,19],[15,30],[49,2],[35,26],[7,28],[28,27],[27,7],[53,26],[26,-4],[42,30],[42,-12],[21,-26],[12,11],[47,-3],[-2,-13],[43,-10],[28,6],[59,-18],[53,-6],[21,-7],[37,9],[42,-17],[31,-8]],[[1084,9197],[51,-14],[44,-28],[29,-5],[24,24],[34,18],[41,-7],[42,25],[45,14],[19,-24],[21,14],[6,27],[20,-6],[47,-52],[37,39],[3,-43],[34,9],[11,17],[34,-3],[42,-25],[65,-21],[38,-10],[27,4],[38,-29],[-39,-29],[50,-12],[75,7],[24,10],[29,-35],[31,30],[-29,24],[18,20],[34,2],[22,6],[23,-14],[28,-31],[31,5],[49,-26],[43,9],[40,-2],[-3,36],[25,10],[43,-19],[0,-55],[17,46],[23,-1],[12,58],[-30,35],[-32,23],[2,64],[33,42],[37,-9],[28,-26],[37,-65],[-24,-28],[51,-12],[0,-59],[37,46],[34,-38],[-9,-42],[27,-39],[29,42],[21,49],[1,63],[40,-4],[41,-8],[37,-29],[2,-29],[-21,-30],[19,-31],[-3,-28],[-54,-40],[-39,-9],[-29,17],[-8,-29],[-27,-48],[-8,-26],[-32,-39],[-40,-3],[-22,-25],[-2,-37],[-32,-7],[-34,-47],[-30,-65],[-11,-45],[-1,-67],[40,-10],[13,-54],[13,-43],[39,11],[51,-25],[28,-22],[20,-27],[35,-16],[29,-24],[46,-3],[30,-6],[-4,-50],[8,-58],[21,-64],[41,-55],[21,19],[15,59],[-14,91],[-20,30],[45,27],[31,41],[16,40],[-3,38],[-19,49],[-33,44],[32,60],[-12,52],[-9,90],[19,13],[48,-15],[29,-6],[23,15],[25,-19],[35,-34],[8,-22],[50,-4],[-1,-49],[9,-73],[25,-9],[21,-34],[40,32],[26,64],[19,27],[21,-52],[36,-73],[31,-69],[-11,-36],[37,-33],[25,-33],[44,-15],[18,-18],[11,-49],[22,-7],[11,-22],[2,-65],[-20,-21],[-20,-21],[-46,-20],[-35,-47],[-47,-10],[-59,12],[-42,1],[-29,-4],[-23,-42],[-35,-25],[-40,-76],[-32,-53],[23,9],[45,76],[58,48],[42,5],[24,-28],[-26,-39],[9,-62],[9,-43],[36,-29]],[[1852,9129],[-15,27],[-38,16],[-24,-7],[-35,46],[19,6],[43,10],[39,-3],[36,10],[-54,14],[-59,-5],[-39,1],[-15,22],[64,23],[-42,-1],[-49,15],[23,43],[20,23],[74,35],[28,-11],[-13,-27],[61,17],[39,-29],[31,30],[26,-19],[23,-57],[14,24],[-20,59],[24,9],[28,-10],[31,-23],[17,-56],[9,-41],[47,-28],[50,-27],[-3,-26],[-46,-4],[18,-22],[-10,-22],[-50,9],[-48,16],[-32,-4],[-52,-19]],[[1972,9143],[-82,-10],[-38,-4]],[[2073,9372],[-44,40],[10,9],[37,2],[21,-13],[-24,-38]],[[2792,9371],[-8,4],[-31,30],[1,21],[14,4],[63,-6],[48,-32],[3,-16],[-30,2],[-30,1],[-30,-8]],[[3162,8749],[-76,23],[-59,33],[-34,28],[10,16],[-42,30],[-40,28],[0,-17],[-80,-9],[-23,20],[18,42],[52,1],[57,7],[-9,21],[10,29],[36,56],[-8,25],[-11,20],[-42,28],[-57,20],[18,14],[-29,36],[-25,3],[-22,20],[-14,-17],[-51,-8],[-101,13],[-59,17],[-45,9],[-23,20],[29,26],[-39,1],[-9,58],[21,51],[29,24],[72,15],[-21,-37],[22,-36],[26,47],[70,23],[48,-59],[-4,-38],[55,17],[26,23],[62,-30],[38,-27],[3,-25],[52,13],[29,-37],[67,-23],[24,-23],[26,-54],[-51,-26],[66,-38],[44,-13],[40,-53],[44,-4],[-9,-40],[-49,-67],[-34,25],[-44,55],[-36,-7],[-3,-33],[29,-33],[38,-27],[11,-15],[18,-57],[-9,-42],[-35,16],[-70,46],[39,-49],[29,-35],[5,-20]],[[2267,9287],[-26,4],[-19,22],[-69,45],[0,18],[57,-7],[-31,38],[33,28],[33,-13],[50,8],[7,-17],[-26,-28],[42,-24],[-5,-52],[-46,-22]],[[8946,9398],[-57,6],[-5,3],[26,23],[35,5],[40,-22],[3,-15],[-42,0]],[[2381,9330],[-32,2],[-17,51],[1,28],[14,25],[28,15],[57,-2],[54,-14],[-42,-51],[-33,-11],[-30,-43]],[[1581,9265],[-15,25],[-64,31]],[[1502,9321],[9,19],[22,47]],[[1533,9387],[24,38],[-27,35],[94,9],[39,-12],[71,-3],[27,-16],[30,-25],[-35,-14],[-68,-41],[-34,-40]],[[1654,9318],[0,-24],[-73,-29]],[[9154,9483],[-45,5],[-51,23],[7,19],[51,-9],[70,-15],[-32,-23]],[[2384,9478],[-40,4],[-34,15],[15,26],[40,15],[24,-20],[10,-18],[-15,-22]],[[8859,9479],[-55,37],[15,40],[37,11],[73,-3],[100,-30],[-22,-43],[-102,1],[-46,-13]],[[2227,9495],[-30,9],[1,34],[-46,-4],[-1,44],[30,-2],[41,20],[39,-3],[3,7],[21,-26],[1,-30],[-13,-43],[-46,-6]],[[1840,9466],[-3,19],[57,26],[-125,-7],[-39,10],[38,56],[26,16],[78,-19],[50,-34],[48,-5],[-40,55],[26,21],[29,-6],[9,-28],[11,-20],[25,9],[29,-2],[5,-28],[-17,-28],[-94,-8],[-71,-25],[-42,-2]],[[6581,9250],[-91,7],[-7,26],[-50,15],[-4,31],[28,13],[-1,31],[55,49],[-25,7],[66,51],[-7,26],[62,30],[91,37],[93,11],[47,21],[54,8],[20,-23],[-19,-18],[-98,-28],[-85,-28],[-86,-55],[-42,-56],[-43,-55],[5,-48],[54,-47],[-17,-5]],[[2551,9466],[-45,7],[-74,19],[-9,31],[-4,29],[-27,25],[-58,7],[-32,18],[10,24],[58,-4],[30,-19],[55,1],[24,-19],[-6,-22],[32,-13],[17,-14],[38,-2],[40,-5],[44,12],[57,5],[45,-4],[30,-21],[6,-24],[-17,-16],[-42,-12],[-35,7],[-80,-9],[-57,-1]],[[1625,9553],[-38,12],[47,44],[57,37],[43,-1],[38,8],[-4,-44],[-21,-20],[-26,-3],[-52,-24],[-44,-9]],[[0,8924],[9963,-26],[-36,5],[25,-31],[17,-47],[13,-16],[3,-24],[-7,-15],[-52,13],[-78,-44],[-25,-6],[-42,-41],[-40,-35],[-11,-26],[-39,39],[-73,-45],[-12,22],[-27,-25],[-37,8],[-9,-38],[-34,-56],[1,-23],[32,-13],[-4,-84],[-25,-2],[-12,-48],[11,-25],[-48,-29],[-10,-66],[-41,-14],[-9,-59],[-40,-53],[-10,39],[-12,84],[-15,128],[13,80],[23,35],[2,27],[43,12],[50,73],[47,59],[50,46],[23,81],[-34,-5],[-17,-47],[-70,-63],[-23,71],[-72,-20]],[[9352,8720],[-69,-96],[23,-36]],[[9306,8588],[-62,-15],[-43,-6],[2,42],[-43,9],[-35,-29],[-85,10],[-91,-17],[-90,-112],[-106,-136],[43,-7],[14,-36],[27,-13],[18,29],[30,-4],[40,-64],[1,-49],[-22,-57],[-2,-69],[-12,-92],[-42,-83],[-9,-40],[-38,-67],[-38,-67],[-18,-34],[-37,-33],[-17,-1],[-17,28],[-38,-42],[-4,-19]],[[8632,7614],[-11,3],[-12,-19],[-8,-20],[1,-41],[-14,-13],[-5,-10],[-11,-17],[-18,-10],[-12,-15],[-1,-25],[-3,-7],[11,-9],[15,-25]],[[8564,7406],[24,-68],[7,-37],[0,-67],[-10,-31],[-25,-11],[-22,-24],[-25,-5],[-3,31],[5,43],[-13,60],[21,10],[-19,49]],[[8504,7356],[-14,11],[-3,-11],[-8,-4],[-1,10],[-7,6],[-8,9],[8,25],[7,7],[-3,10],[7,32],[-2,9],[-16,6],[-13,16]],[[8451,7482],[-39,-17],[-20,-27],[-30,-16],[15,27],[-6,22],[22,39],[-15,30],[-24,-20],[-32,-40],[-17,-37],[-27,-3],[-14,-27],[15,-39],[22,-9],[1,-26],[22,-17],[31,41],[25,-22],[18,-2],[4,-30],[-39,-16],[-13,-31],[-27,-29],[-14,-40],[30,-32],[11,-57],[17,-52],[18,-45],[0,-42],[-17,-16],[6,-31],[17,-18],[-5,-47],[-7,-45],[-15,-5],[-21,-63],[-22,-75],[-26,-69],[-38,-53],[-39,-49],[-31,-6],[-17,-26],[-10,19],[-15,-29],[-39,-29],[-30,-8],[-9,-61],[-15,-4],[-8,42],[7,22],[-37,19]],[[8014,6433],[-13,-9],[-38,-50]],[[7963,6374],[-23,-54],[-6,-40],[21,-61],[26,-75],[26,-36],[16,-46],[13,-106],[-4,-102],[-23,-38],[-32,-37],[-22,-48],[-35,-53],[-10,37],[8,39],[-21,32]],[[7897,5786],[-23,9],[-11,30],[-14,59]],[[7849,5884],[-25,27],[-24,-1],[4,45],[-24,-1],[-3,-63],[-14,-84],[-10,-51],[2,-42],[18,-1],[12,-53],[5,-50],[15,-33],[17,-6],[14,-30]],[[7836,5541],[7,-6],[16,-34],[12,-39],[1,-39],[-3,-26],[3,-20],[2,-34],[10,-16],[11,-51],[-1,-19],[-19,-4],[-27,43],[-32,45],[-4,30],[-16,38],[-4,48],[-10,31],[3,42],[-6,25]],[[7779,5555],[-11,22],[-4,28],[-15,33],[-14,27],[-4,-34],[-5,32],[3,36],[8,55]],[[7737,5754],[-3,43],[9,44],[-10,34],[3,63],[-12,30],[-9,69],[-5,73],[-12,47],[-18,-29],[-32,-41],[-15,5],[-17,14],[9,71],[-6,54],[-21,67],[3,20],[-16,8],[-20,47]],[[7565,6373],[-8,30],[-2,29],[-5,28],[-11,33],[-26,3],[3,-24],[-9,-32],[-12,12],[-4,-11],[-8,6],[-11,5]],[[7472,6452],[-4,-21],[-19,1],[-34,-12],[2,-43],[-15,-34],[-40,-39],[-31,-68],[-21,-36],[-28,-38],[0,-26],[-14,-14],[-25,-21],[-13,-3],[-8,-44],[6,-75],[1,-48],[-11,-54],[0,-98],[-15,-3],[-13,-44],[9,-19],[-25,-16],[-10,-39],[-11,-17],[-26,54],[-13,80],[-11,59],[-9,27],[-15,55],[-7,72],[-5,36],[-25,79],[-12,112]],[[7030,6215],[-8,74],[0,69]],[[7022,6358],[-5,54],[-41,-34],[-19,7],[-37,69],[14,21],[-8,23],[-33,49]],[[6893,6547],[-20,14],[-9,42],[-21,44],[-51,-11],[-45,-1],[-40,-8]],[[6707,6627],[-52,17],[-30,13],[-31,8],[-12,70],[-13,10],[-22,-10],[-28,-28],[-34,19],[-28,45],[-27,16],[-18,55],[-21,76],[-15,-9],[-17,19],[-11,-22]],[[6348,6906],[-16,2]],[[6332,6908],[6,-25],[-3,-13],[9,-44]],[[6344,6826],[11,-49],[14,-13],[5,-21],[18,-24],[2,-24],[-3,-19],[4,-19],[8,-16],[4,-19],[4,-14]],[[6411,6608],[-2,42],[7,30],[8,6],[8,-18],[1,-34],[-6,-33]],[[6427,6601],[5,-22]],[[6432,6579],[5,2],[1,-15],[22,9],[23,-2],[17,-2],[19,39],[20,37],[18,36]],[[6557,6683],[8,19],[3,-5],[-2,-23],[-4,-11]],[[6562,6663],[4,-45]],[[6566,6618],[12,-40],[16,-21],[20,-7],[17,-11],[12,-33],[8,-19],[10,-7],[0,-13],[-10,-34],[-5,-16],[-12,-19],[-10,-39],[-13,3],[-5,-14],[-5,-29],[4,-39],[-3,-7],[-13,1],[-17,-22],[-3,-28],[-6,-12],[-18,0],[-10,-14],[0,-24],[-14,-16],[-15,6],[-19,-20],[-12,-3]],[[6475,6141],[-21,-15],[-5,-26],[-1,-19],[-27,-25],[-45,-27],[-24,-40],[-13,-3],[-8,3],[-16,-24],[-18,-11],[-23,-3],[-7,-3],[-6,-15],[-8,-5],[-4,-14],[-14,1],[-9,-8],[-19,3],[-7,34],[1,31],[-5,17],[-5,43],[-8,23],[5,3],[-2,27],[3,11],[-1,25]],[[6188,6124],[-4,24],[-8,18],[-2,23],[-15,20],[-15,49],[-7,47],[-20,39],[-12,10],[-18,54],[-4,41],[2,34],[-16,64],[-13,22],[-15,12],[-10,33],[2,13],[-8,30],[-8,13],[-11,42],[-17,47],[-14,39],[-14,0],[5,32],[1,20],[3,23]],[[5970,6873],[-1,8]],[[5969,6881],[-7,-23],[-6,-43],[-8,-30],[-6,-11],[-10,19],[-12,26],[-20,82],[-3,-5],[12,-61],[17,-58],[21,-89],[10,-31],[9,-33],[25,-64],[-6,-10],[1,-37],[33,-52],[4,-12]],[[6023,6449],[9,-56],[-6,-11],[4,-59],[11,-69],[10,-14],[15,-21]],[[6066,6219],[16,-67],[8,-53],[15,-28],[38,-54],[16,-33],[15,-33],[8,-20],[14,-17]],[[6196,5914],[7,-18],[-1,-24],[-16,-14],[12,-16]],[[6198,5842],[9,-10],[5,-24],[13,-24],[14,0],[26,14],[30,7],[24,18],[14,4],[10,10],[16,2]],[[6359,5839],[9,2],[13,8],[14,6],[14,20],[10,0],[1,-16],[-3,-34],[0,-30],[-6,-21],[-7,-62],[-14,-64],[-17,-74],[-24,-84],[-24,-65],[-32,-78],[-28,-47],[-42,-57],[-25,-44],[-31,-70],[-6,-30],[-7,-14]],[[6154,5085],[-19,-22],[-7,-25],[-10,-4],[-4,-40],[-9,-24],[-6,-38],[-11,-19]],[[6088,4913],[-13,-71],[2,-32],[18,-21],[1,-15],[-8,-35],[2,-18],[-2,-27],[10,-36],[11,-57],[10,-13]],[[6119,4588],[5,-26],[-1,-57],[3,-50],[1,-90],[5,-29],[-8,-41],[-11,-40],[-18,-35],[-25,-22],[-31,-28],[-32,-62],[-11,-11],[-19,-40],[-11,-14],[-3,-41],[13,-43],[6,-34],[0,-17],[5,2],[-1,-56],[-4,-27],[6,-10],[-4,-24],[-11,-20],[-23,-20],[-34,-31],[-12,-21],[3,-24],[7,-4],[-3,-31]],[[5911,3642],[-7,-41],[-3,-48],[-7,-26],[-19,-29],[-6,-9],[-11,-29],[-8,-30],[-16,-41],[-31,-59],[-20,-35],[-21,-26],[-29,-22],[-14,-3],[-4,-16],[-16,8],[-14,-11],[-30,11],[-17,-7],[-12,3],[-28,-22],[-24,-9],[-17,-22],[-13,-2],[-11,21],[-10,1],[-12,26],[-1,-8],[-4,15],[0,34],[-9,39],[9,10],[0,44],[-19,54],[-14,49],[-20,75]],[[5453,3537],[-20,43],[-11,42],[-6,56],[-7,42],[-9,89],[-1,69],[-4,31],[-10,24],[-15,48],[-14,69],[-6,36],[-23,56],[-2,44]],[[5325,4186],[-2,36],[4,51],[9,53],[2,24],[9,52],[6,24],[16,38],[9,25],[3,43],[-1,32],[-9,21],[-7,35],[-7,35],[2,11],[8,23],[-8,56],[-6,39],[-14,36],[3,11]],[[5342,4831],[-4,18]],[[5338,4849],[-8,43]],[[5330,4892],[-22,61]],[[5308,4953],[-29,58],[-18,48],[-17,59],[1,20],[6,18],[7,42],[5,43]],[[5263,5241],[-5,8],[9,65]],[[5267,5314],[5,45],[-11,38],[-13,10],[-6,26],[-7,8],[1,16]],[[5236,5457],[-29,-20],[-11,3],[-10,-13],[-23,1],[-15,36],[-9,42],[-19,38],[-21,-1],[-25,0]],[[5074,5543],[-23,-7]],[[5051,5536],[-22,-12]],[[5029,5524],[-44,-34],[-15,-20],[-25,-16],[-25,16]],[[4920,5470],[-13,-1],[-19,12],[-18,-1],[-33,-10],[-19,-17],[-27,-21],[-6,2]],[[4785,5434],[-7,-1],[-29,28],[-25,44],[-24,31],[-18,37]],[[4682,5573],[-8,4],[-20,24],[-14,30],[-5,21],[-4,43]],[[4631,5695],[-12,34],[-10,23],[-8,7],[-7,12],[-3,25],[-4,13],[-8,9]],[[4579,5818],[-15,24],[-11,4],[-7,16],[0,9],[-8,12],[-2,13]],[[4536,5896],[-4,44]],[[4532,5940],[3,25]],[[4535,5965],[-11,45],[-14,21],[12,11],[14,40],[6,30]],[[4542,6112],[-2,31],[7,28],[4,54],[-3,57],[-3,29],[2,28],[-7,28],[-15,25]],[[4525,6392],[2,24]],[[4527,6416],[1,27],[11,15],[9,30],[-2,20],[9,41],[16,36],[9,9],[8,34],[0,31],[10,35],[19,21],[17,59]],[[4634,6774],[15,23]],[[4649,6797],[26,6],[22,40],[14,15],[23,48],[-7,72],[10,49],[4,31],[18,38],[28,27],[20,24],[19,59],[9,36],[20,-1],[17,-24],[26,4],[29,-13],[12,0]],[[4939,7208],[27,31],[30,10],[17,24],[27,17],[47,11],[46,4],[14,-8],[26,22],[30,1],[11,-14],[19,4]],[[5233,7310],[31,23],[19,-7],[-1,-29],[24,21],[2,-11],[-14,-28],[0,-27],[9,-14],[-3,-50],[-19,-29],[6,-31],[14,-1],[7,-27],[11,-9]],[[5319,7091],[32,-20],[12,5],[23,-10],[37,-26],[13,-51],[25,-11],[39,-24],[30,-29],[13,15],[13,27],[-6,44],[9,28],[20,27],[19,8],[37,-12],[10,-26],[10,0],[9,-10],[28,-7],[6,-19]],[[5698,7000],[37,1],[27,-15],[28,-17],[12,-9],[22,18],[11,17],[25,4],[20,-7],[7,-28],[7,18],[22,-13],[21,-3],[14,14]],[[5951,6980],[8,19],[-2,3],[8,27],[5,44],[4,14],[1,1]],[[5975,7088],[10,47],[14,40],[0,2]],[[5999,7177],[-2,44],[7,24]],[[6004,7245],[-11,26],[11,22],[-17,-5],[-23,13],[-19,-33],[-43,-6],[-22,31],[-30,1],[-6,-23],[-20,-7],[-27,30],[-30,-1],[-16,58],[-21,32],[14,44],[-18,28],[31,55],[43,2],[12,44],[53,-8],[33,38],[32,16],[46,1],[49,-40],[40,-23],[32,9],[24,-5],[33,30]],[[6154,7574],[4,25],[-7,39],[-16,21],[-16,7],[-10,18]],[[6109,7684],[-35,48],[-32,22],[-24,34],[20,9],[23,48],[-15,23],[41,23],[-1,13],[-25,-9]],[[6061,7895],[-22,-5],[-19,-19],[-26,-3],[-23,-21],[1,-36],[14,-14],[28,4],[-5,-21],[-31,-10],[-37,-33],[-16,12],[6,27],[-30,16]],[[5901,7792],[5,12],[26,19]],[[5932,7823],[-8,13],[-43,14],[-2,22],[-26,-7],[-10,-32],[-21,-43]],[[5822,7790],[0,-14],[-13,-13],[-9,6],[-7,-70]],[[5793,7699],[-15,-24],[-10,-41],[9,-33]],[[5777,7601],[3,-22],[25,-18],[-5,-14],[-33,-4],[-12,-17],[-23,-31],[-9,26],[0,12]],[[5723,7533],[-17,2],[-14,5],[-34,-15],[19,-32],[-14,-9],[-15,0],[-15,29],[-5,-12],[6,-35],[14,-27],[-11,-13],[16,-26],[14,-17],[0,-32],[-26,15],[9,-29],[-18,-6],[11,-51],[-19,-1],[-23,25],[-10,46],[-5,38],[-11,27],[-14,33],[-2,16]],[[5559,7464],[-5,4],[0,13],[-15,19],[-3,28],[2,39],[4,18],[-4,9]],[[5538,7594],[-6,4],[-8,19],[-12,12]],[[5512,7629],[-26,21],[-16,21],[-26,17],[-23,42],[6,4],[-13,25],[-1,19],[-17,9],[-9,-25],[-8,19],[0,20],[1,1]],[[5380,7802],[7,6]],[[5387,7808],[-23,8],[-22,-20],[1,-29],[-3,-16],[9,-30],[26,-29],[14,-47],[31,-47],[22,1],[7,-13],[-8,-11],[25,-21],[20,-18],[24,-30],[3,-11],[-5,-20],[-16,27],[-24,9],[-12,-37],[20,-21],[-3,-30],[-11,-4],[-15,-49],[-12,-5],[0,18],[6,31],[6,12],[-11,34],[-8,29],[-12,7],[-8,25],[-18,10],[-12,23],[-21,4],[-21,26],[-26,37],[-19,34],[-8,57],[-14,6],[-23,19],[-12,-8],[-16,-26],[-12,-5]],[[5206,7698],[-25,-32],[-55,16],[-40,-19],[-4,-35]],[[5082,7628],[2,-33],[-26,-39],[-36,-12],[-3,-19],[-17,-32],[-10,-47],[11,-33],[-17,-26],[-6,-37],[-21,-11],[-19,-45],[-35,-1],[-27,1],[-17,-20],[-11,-22],[-14,5],[-10,20],[-8,33],[-26,9]],[[4792,7319],[-11,-15],[-14,8],[-15,-7],[5,46],[-3,35],[-13,5],[-6,22],[2,38],[11,21],[2,23],[6,35],[-1,24],[-5,21],[-2,19]],[[4748,7594],[2,41],[-11,25],[39,42],[34,-11],[37,1],[30,-10],[23,3],[45,-2]],[[4947,7683],[14,34],[5,115],[-28,60],[-21,30],[-42,22],[-3,42],[36,12],[47,-15],[-9,66],[26,-25],[65,45],[8,47],[24,12]],[[5069,8128],[23,11]],[[5092,8139],[14,16],[24,85],[38,24],[23,-2]],[[5191,8262],[6,12],[23,3],[5,-12],[19,28],[-6,22],[-2,32]],[[5236,8347],[-11,32],[-1,59],[5,16],[8,17],[24,4],[10,15],[22,17],[-1,-30],[-8,-19],[4,-16],[15,-9],[-7,-21],[-8,6],[-20,-41],[7,-28]],[[5275,8349],[1,-23],[28,-13],[-1,-21],[29,11],[15,16],[32,-23],[13,-18]],[[5392,8278],[19,17],[43,26],[35,20],[28,-10],[2,-14],[27,-1]],[[5546,8316],[6,26],[38,18]],[[5590,8360],[-6,49]],[[5584,8409],[1,43],[14,36],[26,20],[22,-43],[22,1],[6,44]],[[5675,8510],[3,34],[-10,-7],[-18,21],[-2,33],[35,16],[35,8],[30,-9],[29,1]],[[5777,8607],[31,32],[-29,27]],[[5779,8666],[-50,-4],[-49,-21],[-45,-12],[-16,31],[-27,19],[6,57],[-14,52],[14,33],[25,36],[63,63],[19,12],[-3,24],[-39,27]],[[5663,8983],[-47,-16],[-27,-40],[4,-36],[-44,-46],[-54,-49],[-20,-81],[20,-41],[26,-32],[-25,-65],[-29,-13],[-11,-97],[-15,-54],[-34,6],[-16,-46],[-32,-3],[-9,55],[-23,65],[-21,82]],[[5306,8572],[-19,35],[-55,-67],[-37,-13],[-38,29],[-10,62],[-9,133],[26,37],[73,48],[55,60],[51,80],[66,111],[47,43],[76,73],[61,25],[46,-3],[42,48],[51,-3],[50,11],[87,-42],[-36,-15],[30,-36]],[[5863,9188],[29,20],[46,-35],[76,-14],[105,-65],[21,-27],[2,-39],[-31,-30],[-45,-15],[-124,44],[-21,-8],[45,-42]],[[5966,8977],[4,-85]],[[5970,8892],[36,-18],[21,-15],[4,28]],[[6031,8887],[-17,26],[18,21]],[[6032,8934],[67,-36],[24,14],[-19,42],[65,56],[25,-3],[26,-20],[16,39],[-23,35],[14,34],[-21,36],[78,-19],[16,-32],[-35,-7],[0,-32],[22,-20],[43,13],[7,37],[58,27],[96,49],[21,-2],[-27,-35],[35,-6],[19,19],[52,2],[42,24],[31,-35],[32,38],[-29,34],[14,19],[82,-18],[39,-18],[100,-66],[19,30],[-28,31],[-1,12],[-34,6],[10,27],[-15,45],[-1,18],[51,53],[18,52],[21,11],[74,-15],[5,-32],[-26,-47],[17,-18],[9,-40],[-6,-79],[31,-35],[-12,-39],[-55,-82],[32,-8],[11,21],[31,14],[7,29],[24,27],[-16,33],[13,38],[-31,5],[-6,32],[22,58],[-36,47],[50,38],[-7,41],[14,2],[15,-32],[-11,-56],[29,-10],[-12,41],[46,23],[58,3],[51,-33],[-25,48],[-2,61],[48,12],[67,-3],[60,8],[-23,30],[33,38],[31,1],[54,29],[74,8],[9,15],[73,6],[23,-13],[62,30],[51,0],[8,24],[26,25],[66,24],[47,-19],[-37,-14],[63,-9],[7,-29],[25,14],[82,0],[62,-28],[23,-22],[-7,-30],[-31,-17],[-73,-32],[-21,-17],[34,-8],[42,-15],[25,11],[14,-37],[12,15],[44,9],[89,-9],[7,-27],[116,-9],[2,44],[59,-10],[44,1],[45,-31],[13,-37],[-17,-24],[35,-45],[44,-23],[27,60],[44,-26],[48,16],[53,-18],[21,16],[45,-8],[-20,53],[37,25],[251,-37],[23,-34],[73,-44],[112,11],[56,-10],[23,-24],[-4,-42],[35,-16],[37,12],[49,1],[52,-11],[53,6],[48,-51],[35,18],[-23,37],[13,26],[88,-16],[58,3],[80,-27],[-9960,-25]],[[6357,7389],[9,-42],[26,-12],[20,-29],[39,-10],[43,15],[3,13]],[[6497,7324],[-5,41],[4,60],[-22,20],[7,39],[-18,4],[6,48],[26,-14],[25,19],[-20,34],[-8,33],[-23,-15],[-3,-42],[-8,37]],[[6458,7588],[-2,15],[7,23]],[[6463,7626],[-5,21],[-32,19],[-13,52],[-15,14],[-1,19],[27,-5],[1,42],[23,9],[25,-8],[5,56],[-5,35],[-28,-2],[-24,14],[-32,-26],[-26,-12]],[[6363,7854],[-12,-34],[-27,-9],[-28,-60],[25,-54],[-2,-39],[30,-68]],[[6349,7590],[15,-30],[14,-41],[13,-3],[8,-15],[-23,-5],[-5,-45],[-4,-20],[-11,-13],[1,-29]],[[2380,9645],[-52,3],[-7,16],[56,0],[19,-11],[-3,-7],[-13,-1]],[[1887,9640],[-41,18],[23,19],[40,6],[39,-9],[-9,-18],[-52,-16]],[[5624,9642],[-49,13],[19,15],[-17,19],[58,11],[11,-22],[40,-13],[-62,-23]],[[1874,9697],[0,9],[29,17],[14,-3],[37,-11],[-34,-12],[-46,0]],[[2297,9665],[-23,14],[-12,21],[-2,24],[36,-2],[16,-4],[33,-20],[-7,-21],[-41,-12]],[[2231,9669],[-45,6],[-46,19],[-62,2],[27,17],[-34,14],[-2,22],[55,-8],[75,-21],[21,-27],[11,-24]],[[7761,9669],[51,76],[23,6],[21,-3],[70,-33],[-8,-23],[-157,-23]],[[5441,9603],[-59,35],[25,21],[-42,16],[-54,49],[-21,45],[75,21],[16,-20],[39,0],[11,20],[40,2],[35,-20],[92,-43],[-70,-23],[-15,-42],[-25,-11],[-13,-48],[-34,-2]],[[5639,9755],[-82,9],[-5,16],[-40,1],[-30,26],[86,17],[40,-14],[28,17],[70,-14],[55,-21],[-42,-31],[-80,-6]],[[6321,9790],[-30,13],[16,18],[-62,2],[54,11],[43,0],[5,-15],[16,14],[26,9],[42,-13],[-11,-8],[-38,-8],[-24,-4],[-4,-10],[-33,-9]],[[7715,9717],[-78,17],[-46,22],[-21,41],[-38,12],[72,39],[60,13],[54,-29],[64,-56],[-7,-51],[-60,-8]],[[2477,9686],[-57,8],[-30,23],[0,21],[22,15],[-50,0],[-31,19],[-18,26],[20,26],[19,17],[28,4],[-12,14],[65,2],[35,-30],[47,-13],[46,-10],[21,-38],[34,-19],[-38,-17],[-52,-44],[-49,-4]],[[2762,9569],[-73,16],[-81,-9],[-42,7],[-52,3],[-4,28],[52,13],[-14,41],[17,4],[74,-25],[-38,37],[-45,11],[23,23],[49,13],[8,20],[-39,23],[-12,30],[76,-3],[22,-6],[43,21],[-62,6],[-98,-3],[-49,19],[-23,24],[-32,17],[-6,19],[41,11],[32,2],[55,9],[41,22],[34,-3],[30,-16],[21,31],[37,9],[50,6],[85,3],[14,-6],[81,9],[60,-3],[60,-4],[74,-5],[60,-7],[51,-16],[-2,-15],[-67,-25],[-68,-12],[-25,-12],[61,0],[-66,-35],[-45,-16],[-48,-47],[-57,-10],[-18,-12],[-84,-6],[39,-7],[-20,-10],[23,-29],[-26,-20],[-43,-16],[-13,-22],[-39,-18],[4,-13],[47,3],[1,-14],[-74,-35]],[[3755,8640],[-41,47],[-55,0],[-27,31],[-19,57],[-48,71],[-14,38],[-4,51],[-38,54],[10,42],[-19,20],[28,68],[42,21],[11,24],[5,45],[-31,-20],[-15,-9],[-25,-8],[-34,19],[-2,39],[11,31],[25,0],[57,-15],[-48,37],[-25,19],[-27,-8],[-23,14],[31,54],[-17,22],[-22,39],[-34,61],[-35,23],[0,24],[-74,34],[-59,4],[-74,-3],[-68,-4],[-32,19],[-49,36],[73,18],[56,3],[-119,15],[-62,23],[3,23],[106,28],[101,27],[11,21],[-75,21],[24,23],[97,40],[40,6],[-12,26],[66,15],[85,9],[86,1],[30,-18],[74,32],[66,-22],[39,-5],[58,-18],[-66,31],[4,24],[93,35],[97,-3],[36,21],[98,6],[222,-7],[174,-46],[-52,-22],[-106,-3],[-150,-5],[14,-10],[99,6],[83,-20],[54,18],[23,-21],[-30,-34],[71,22],[134,22],[84,-11],[15,-25],[-113,-41],[-16,-13],[-88,-10],[64,-2],[-33,-42],[-22,-38],[1,-64],[33,-38],[-43,-2],[-46,-18],[52,-31],[6,-49],[-30,-5],[36,-49],[-61,-5],[32,-23],[-9,-20],[-39,-9],[-39,0],[35,-39],[0,-26],[-55,24],[-14,-16],[37,-14],[37,-35],[10,-47],[-49,-11],[-22,23],[-34,33],[10,-39],[-33,-31],[73,-2],[39,-3],[-75,-50],[-75,-46],[-81,-20],[-31,0],[-29,-22],[-38,-61],[-60,-40],[-19,-3],[-37,-14],[-40,-13],[-24,-36],[-1,-40],[-14,-38],[-45,-46],[11,-45],[-12,-48],[-14,-56],[-40,-3]],[[6847,7334],[15,0],[21,-13]],[[6883,7321],[9,-7],[20,19],[9,-11],[9,26],[17,-1],[4,8],[3,24],[12,20],[15,-14],[-3,-17],[9,-3],[-3,-48],[11,-19],[10,12],[12,6],[17,26],[19,-5],[29,0]],[[7082,7337],[5,-16]],[[7087,7321],[-16,-7],[-14,-10],[-32,-7],[-30,-12],[-16,-25],[6,-25],[3,-28],[-13,-25],[1,-22],[-8,-20],[-26,1],[11,-38],[-18,-14],[-12,-35],[2,-35],[-11,-16],[-10,6],[-22,-8],[-3,-16],[-20,0],[-16,-33],[-1,-49],[-36,-24],[-19,6],[-6,-13],[-16,7],[-28,-8],[-47,29]],[[6690,6900],[25,52],[-2,37],[-21,10],[-2,37],[-9,46],[12,31],[-12,9],[7,42],[12,71]],[[6700,7235],[28,-22],[21,8],[6,26],[22,9],[15,17],[6,46],[23,12],[4,20],[14,-15],[8,-2]],[[5664,4553],[3,-18],[-4,-28],[5,-27],[-4,-21],[2,-20],[-57,1],[-2,-184],[19,-47],[18,-36]],[[5644,4173],[-51,-23],[-67,8],[-19,28],[-113,-3],[-4,-4],[-17,26],[-18,2],[-16,-10],[-14,-11]],[[5342,4831],[11,8],[8,-1],[10,7],[82,-1],[7,-43],[8,-34],[6,-19],[11,-30],[18,4],[9,9],[16,-9],[4,15],[7,33],[17,3],[1,10],[15,0],[-3,-21],[34,1],[0,-37],[6,-22],[-4,-35],[2,-35],[9,-21],[-1,-69],[7,5],[12,-1],[17,9],[13,-4]],[[5330,4892],[12,25],[8,10],[10,-20]],[[5360,4907],[-10,-12],[-4,-15],[-1,-25],[-7,-6]],[[5583,7534],[0,-15],[-9,-8],[-2,-19],[-13,-28]],[[5538,7594],[-2,18],[12,29],[1,-11],[8,5]],[[5557,7635],[6,-16],[6,-6],[2,-20]],[[5571,7593],[-3,-20],[4,-25],[11,-14]],[[6557,6683],[5,-20]],[[6566,6618],[-14,-1],[-3,-37],[5,-8],[-12,-11],[0,-24],[-8,-24],[-1,-23]],[[6533,6490],[-6,-12],[-83,29],[-11,58],[-1,14]],[[3140,2021],[-17,2],[-30,0],[0,129]],[[3258,3901],[51,-94],[23,-8],[34,-43],[29,-23],[4,-25],[-28,-87],[28,-16],[31,-9],[22,9],[26,44],[4,51]],[[3482,3700],[14,11],[14,-33],[-1,-46],[-23,-32],[-19,-23],[-31,-56],[-37,-79]],[[3399,3442],[-7,-46],[-8,-59],[1,-57],[-6,-13],[-2,-37]],[[3095,2171],[-26,9],[-67,8],[-11,33],[0,43],[-18,-3],[-10,20],[-3,61],[22,26],[8,36],[-3,29],[15,50],[10,76],[-3,34],[12,11],[-3,21],[-13,12],[10,24],[-13,22],[-6,66],[11,12],[-5,70],[7,59],[7,52],[17,20],[-9,57],[0,53],[21,37],[-1,48],[16,56],[0,53],[-7,11],[-13,99],[17,60],[-2,55],[10,53],[18,54],[20,35],[-9,23],[6,19],[-1,96],[30,28],[10,60],[-3,14]],[[3136,3873],[23,52],[36,-14],[16,-41],[11,46],[32,-2],[4,-13]],[[6291,7415],[-10,-2]],[[6281,7413],[-11,34],[0,8],[-12,0],[-9,16],[-5,-2]],[[6244,7469],[-11,17],[-21,14],[3,28],[-5,21]],[[6210,7549],[39,9]],[[6249,7558],[5,-15],[11,-10],[-6,-15],[15,-20],[-8,-18],[12,-16],[13,-9],[0,-40]],[[79,321],[30,19]],[[109,340],[3,-1],[4,0]],[[5450,7880],[-6,-9],[-24,-2],[-14,-13],[-23,5]],[[5383,7861],[-40,14],[-6,20],[-27,-10],[-4,-11],[-16,9]],[[5290,7883],[-15,1],[-12,11],[4,14],[-1,10]],[[5266,7919],[8,3],[14,-16],[4,15],[25,-2],[20,10],[13,-2],[9,-11],[2,9],[-4,38],[10,7],[10,27]],[[5377,7997],[21,-19],[15,24],[10,4],[22,-17],[13,3],[13,-11]],[[5471,7981],[-3,-8],[3,-20]],[[5471,7953],[-2,-23],[-16,0],[6,-13],[-9,-37]],[[6281,7413],[-19,8],[-14,27],[-4,21]],[[6357,7389],[-7,-3],[-17,30],[10,29],[-9,17],[-10,-5],[-33,-42]],[[6249,7558],[6,9],[21,-17],[15,-3],[4,7],[-14,31],[7,8]],[[6288,7593],[8,-2],[19,-35],[13,-4],[4,15],[17,23]],[[5806,5019],[16,-5],[9,33],[15,-4]],[[5846,5043],[1,-22],[6,-13],[1,-19],[-7,-12],[-11,-30],[-10,-21],[-12,-3]],[[5814,4923],[-1,70],[-7,26]],[[5170,8108],[-3,-39]],[[5167,8069],[-7,-2],[-3,-33]],[[5157,8034],[-24,27],[-14,-5],[-20,27],[-13,23],[-13,1],[-4,21]],[[5092,8139],[20,-4],[26,11],[17,-25],[15,-13]],[[5024,5816],[10,6],[6,25],[13,6],[6,17]],[[5059,5870],[10,17],[10,0],[21,-33]],[[5100,5854],[-1,-19],[6,-34],[-6,-24],[3,-15],[-13,-36],[-9,-17],[-5,-37],[1,-36],[-2,-93]],[[5051,5536],[-7,40],[2,132],[-6,12],[-1,28],[-10,20],[-8,17],[3,31]],[[4849,5780],[-2,33],[8,24],[-1,20],[22,48],[5,39],[7,14],[14,-8],[11,12],[4,15],[22,26],[5,18],[26,24],[15,8],[7,-11],[18,0]],[[5010,6042],[-2,-28],[3,-26],[16,-38],[1,-28],[32,-13],[-1,-39]],[[5024,5816],[-24,1]],[[5000,5817],[-13,4],[-9,-9],[-12,4],[-48,-2],[-1,-33],[4,-43]],[[4921,5738],[-19,14],[-13,-2],[-10,-14],[-12,12],[-5,19],[-13,13]],[[7472,6452],[-4,48],[-10,43],[5,35],[-17,15],[6,21],[18,22],[-21,30],[10,39],[22,-25],[14,-2],[2,-40],[26,-8],[26,1],[16,-10],[-13,-49],[-12,-3],[-9,-33],[16,-30],[4,37],[8,0],[14,-91]],[[7573,6452],[0,-42],[-10,9],[2,-46]],[[5777,7601],[-24,8],[-28,-18]],[[5725,7591],[0,-29],[-26,-5],[-19,20],[-23,-16],[-20,2]],[[5637,7563],[-2,38],[-14,18]],[[5621,7619],[5,9],[-3,6],[4,19],[11,18],[-14,25],[-2,21],[7,13]],[[5629,7730],[8,-24],[10,4],[22,-9],[41,-3],[13,15],[33,13],[20,-21],[17,-6]],[[5533,7689],[-5,-6],[-9,-13],[-4,-32]],[[5515,7638],[-25,22],[-10,24],[-11,13],[-12,21],[-6,18],[-14,27],[6,24],[10,-13],[6,12],[13,1],[24,-10],[19,1],[12,-12]],[[5527,7766],[10,0],[-7,-26],[14,-22],[-4,-27],[-7,-2]],[[5735,8385],[17,10],[30,22]],[[5782,8417],[29,-15],[4,-14],[15,7],[27,-14],[3,-27],[-6,-15],[17,-38],[11,-11],[-1,-10],[18,-10],[8,-15],[-10,-13],[-23,2],[-5,-5],[6,-20],[7,-36]],[[5882,8183],[-24,-4],[-8,-12],[-2,-29],[-11,5],[-25,-3],[-7,14],[-11,-10],[-10,8],[-22,1],[-31,14],[-28,5],[-22,-2],[-15,-15],[-13,-3]],[[5653,8152],[-1,26],[-8,27],[16,12],[1,22],[-8,22],[-1,26]],[[5652,8287],[27,-1],[30,22],[6,33],[23,18],[-3,26]],[[2529,6097],[-8,0],[2,65],[0,46]],[[2523,6208],[0,8],[4,3],[5,-7],[10,35],[5,1]],[[3136,3873],[-20,-8],[-11,80],[-15,64],[8,56],[-14,24],[-4,42],[-13,39]],[[3067,4170],[17,62],[-12,49],[7,19],[-5,21],[10,29],[1,49],[1,41],[6,19],[-24,93]],[[3068,4552],[21,-5],[14,1],[6,18],[25,23],[14,22],[37,9],[-3,-43],[3,-22],[-2,-39],[30,-51],[31,-10],[11,-21],[19,-12],[11,-16],[18,0],[16,-17],[1,-33],[6,-17],[0,-25],[-8,-1],[11,-67],[53,-2],[-4,-33],[3,-23],[15,-16],[6,-36],[-5,-45],[-7,-26],[3,-33],[-9,-11]],[[3384,4021],[-1,17],[-26,30],[-25,1],[-49,-17],[-13,-51],[-1,-31],[-11,-69]],[[3482,3700],[6,33],[3,35],[0,31],[-10,11],[-10,-10],[-10,3],[-4,22],[-2,53],[-5,17],[-19,16],[-11,-12],[-30,11],[2,79],[-8,32]],[[3068,4552],[-15,-10],[-13,6],[2,88],[-23,-34],[-24,1],[-11,31],[-18,4],[5,24],[-15,35],[-12,52],[8,11],[0,24],[17,17],[-3,31],[7,20],[2,27],[32,39],[22,11],[4,9],[25,-3]],[[3058,4935],[13,158],[0,25],[-4,33],[-12,21],[0,42],[15,9],[6,-6],[1,22],[-16,6],[-1,36],[54,-1],[10,20],[7,-19],[6,-33],[5,7]],[[3142,5255],[15,-31],[22,4],[5,18],[21,13],[11,9],[4,25],[19,16],[-1,12],[-24,5],[-3,36],[1,39],[-13,15],[5,5],[21,-7],[22,-14],[8,13],[20,9],[31,22],[10,22],[-3,16]],[[3313,5482],[14,2],[6,-13],[-3,-25],[9,-9],[7,-27],[-8,-20],[-4,-49],[7,-29],[2,-27],[17,-27],[13,-3],[4,12],[8,2],[13,10],[9,16],[15,-5],[7,2]],[[3429,5292],[15,-5],[3,12],[-5,11],[3,17],[11,-5],[13,6],[16,-12]],[[3485,5316],[12,-12],[9,15],[6,-2],[4,-16],[13,4],[11,22],[8,42],[17,53]],[[3517,3238],[-8,33],[13,27],[-17,39],[-21,32],[-29,37],[-10,-2],[-28,45],[-18,-7]],[[8206,5496],[-1,-28],[-2,-37],[-13,2],[-6,-20],[-13,30]],[[7466,6754],[19,43],[15,15],[20,-14],[14,-1],[12,-15]],[[7546,6782],[12,-19],[-2,-35],[-23,-2],[-23,4],[-18,-9],[-25,22],[-1,11]],[[5817,3910],[-39,-42],[-25,-43],[-10,-38],[-8,-22],[-15,-5],[-5,-27],[-3,-18],[-18,-14],[-22,3],[-13,16],[-12,7],[-14,-13],[-6,-28],[-14,-17],[-13,-26],[-20,-5],[-7,20],[3,35],[-16,55],[-8,8]],[[5552,3756],[0,168],[27,2],[1,205],[21,2],[43,20],[10,-23],[18,22],[8,0],[16,13]],[[5696,4165],[5,-4]],[[5701,4161],[11,-46],[5,-10],[9,-34],[32,-63],[11,-6],[1,-20],[8,-37],[21,-9],[18,-26]],[[5634,5824],[4,-25],[16,-36],[0,-23],[-5,-24],[2,-18],[10,-17]],[[5661,5681],[21,-25]],[[5682,5656],[15,-23],[0,-19],[19,-30],[11,-25],[8,-34],[20,-23],[5,-18]],[[5760,5484],[-9,-6],[-18,1],[-21,6],[-10,-5],[-5,-14],[-9,-2],[-11,13],[-31,-29],[-12,6],[-4,-5],[-8,-35],[-21,12],[-20,5],[-18,22],[-23,19],[-15,-18],[-10,-30],[-3,-40]],[[5512,5384],[-18,3],[-19,10],[-16,-30],[-15,-54]],[[5444,5313],[-3,17],[-1,26],[-13,19],[-10,29],[-2,21],[-13,30],[2,17],[-3,24],[2,45],[7,10],[14,59]],[[5424,5610],[23,4],[5,15],[5,-1],[7,-13],[34,22],[12,22],[15,20],[-3,21],[8,5],[27,-4],[26,27],[20,63],[14,23],[17,10]],[[3245,7816],[46,8],[28,65]],[[3135,7782],[-18,32],[0,79],[-13,16],[-18,-10],[-10,16],[-21,-44],[-8,-45],[-10,-26],[-12,-9],[-9,-3],[-3,-14],[-51,0],[-42,0],[-13,-11],[-29,-41],[-3,-5],[-9,-22],[-26,0],[-27,0],[-13,-10],[5,-11],[2,-17],[0,-6],[-36,-29],[-29,-9],[-32,-31],[-7,0],[-10,9],[-3,9],[1,6],[6,20],[13,31],[8,34],[-5,50],[-6,53],[-29,27],[3,10],[-4,7],[-8,0],[-5,9],[-2,14],[-5,-6],[-7,2],[1,5],[-6,6],[-3,15],[-22,18],[-22,20],[-27,22],[-26,21],[-25,-16],[-9,-1],[-34,15],[-23,-8],[-27,18],[-28,9],[-20,4],[-8,10],[-5,31],[-10,0],[0,-22],[-57,0],[-95,0],[-94,0],[-84,0],[-83,0],[-82,0],[-85,0],[-27,0],[-83,0],[-78,0]],[[1374,8338],[15,28],[-1,36],[-47,37],[-28,66],[-18,41],[-25,26],[-19,23],[-14,30],[-28,-18],[-27,-33],[-25,38],[-19,25],[-27,16],[-28,2],[0,328],[1,214]],[[1972,9143],[-70,-9],[-50,-5]],[[1502,9321],[12,24],[19,42]],[[1654,9318],[0,-25],[-73,-28]],[[5290,7883],[-3,-24],[-12,-10],[-20,8],[-6,-24],[-14,-2],[-5,10],[-15,-20],[-14,-3],[-11,13]],[[5190,7831],[-10,25],[-13,-9],[0,26],[20,32],[0,15],[12,-5],[8,10]],[[5207,7925],[23,-1],[6,13],[30,-18]],[[3107,1980],[-14,2],[-16,5]],[[3045,4126],[14,15],[8,29]],[[8628,7624],[-18,34],[-11,-33],[-43,-24],[4,-31],[-24,2],[-13,18],[-19,-40],[-30,-31],[-23,-37]],[[8014,6433],[-13,-10]],[[8001,6423],[-28,15],[-14,24],[5,33],[-26,11],[-13,21],[-24,-31],[-27,-6],[-22,0],[-15,-14]],[[7837,6476],[-14,-8],[4,-66],[-15,1],[-2,14]],[[7810,6417],[-1,24],[-21,-17],[-11,10],[-21,22],[8,48],[-18,11],[-6,53],[-30,-9],[4,68],[26,48],[1,47],[-1,44],[-12,14],[-9,34],[-16,-4]],[[7703,6810],[-30,8],[9,25],[-13,35],[-20,-24],[-23,14],[-32,-36],[-25,-43],[-23,-7]],[[7466,6754],[-2,46],[-17,-12]],[[7447,6788],[-32,5],[-32,13],[-22,26],[-22,11],[-9,28],[-16,8],[-28,38],[-22,17],[-12,-14]],[[7252,6920],[-38,41],[-28,36],[-7,64],[20,-8],[0,29],[-11,30],[3,47],[-30,67]],[[7161,7226],[-45,24],[-9,44],[-20,27]],[[7082,7337],[-4,33],[1,22],[-17,14],[-9,-6],[-7,53]],[[7046,7453],[8,13],[-4,14],[26,27],[20,11],[29,-8],[10,37],[36,7],[10,23],[44,31],[4,13]],[[7229,7621],[-3,33],[20,15],[-25,100],[55,23],[14,13],[20,103],[55,-19],[15,26],[2,58],[23,5],[21,38]],[[7426,8016],[11,5]],[[7437,8021],[7,-40],[23,-31],[40,-21],[19,-47],[-11,-67],[10,-25],[33,-10],[38,-8],[33,-36],[18,-6],[12,-53],[17,-34],[30,1],[58,-13],[36,8],[28,-8],[41,-35],[34,0],[12,-18],[32,31],[45,20],[42,2],[32,20],[20,31],[19,19],[-4,19],[-9,22],[15,37],[15,-5],[29,-11],[28,30],[42,22],[20,39],[20,16],[40,8],[22,-7],[3,21],[-25,40],[-22,18],[-22,-21],[-27,9],[-16,-7],[-7,23],[20,58],[13,43]],[[8240,8055],[34,-22],[39,37],[-1,25],[26,61],[15,19],[0,31],[-16,14],[23,29],[35,10],[37,2],[41,-17],[25,-22],[17,-58],[10,-24],[10,-36],[10,-56],[48,-19],[33,-41],[12,-54],[42,0],[24,23],[46,17],[-15,-52],[-11,-21],[-9,-63],[-19,-56],[-33,10],[-24,-20],[7,-49],[-4,-69],[-14,-1],[0,-29]],[[4785,5434],[2,47],[3,7],[-1,23],[-12,24],[-8,4],[-9,16],[7,25],[-3,28],[1,17]],[[4765,5625],[4,0],[2,25],[-2,11],[3,8],[10,7],[-7,46],[-6,24],[2,20],[5,4]],[[4776,5770],[4,5],[8,-8],[21,-1],[5,17],[5,-1],[8,6],[4,-24],[7,7],[11,9]],[[4921,5738],[7,-82],[-11,-49],[-8,-65],[12,-49],[-1,-23]],[[5313,5313],[-46,1]],[[5236,5457],[7,41],[13,56],[8,0],[17,34],[10,1],[16,-24],[19,19],[2,24],[7,24],[4,29],[15,23],[5,41],[6,13],[4,29],[7,37],[24,45],[1,19],[3,10],[-11,23]],[[5393,5901],[1,19],[8,3]],[[5402,5923],[11,-37],[2,-38],[-1,-38],[15,-53],[-15,1],[-8,-4],[-13,5],[-6,-27],[16,-33],[13,-10],[3,-24],[9,-40],[-4,-15]],[[5444,5313],[-2,-31],[-22,14],[-22,15],[-35,2]],[[5363,5313],[-4,3],[-16,-7],[-17,7],[-13,-3]],[[5821,5105],[-8,-16],[-1,-34],[-4,-5],[-2,-31]],[[5814,4923],[5,-53],[-2,-30],[5,-33],[16,-32],[15,-73]],[[5853,4702],[-11,6],[-37,-10],[-7,-7],[-8,-36],[6,-26],[-5,-68],[-4,-58],[8,-10],[19,-22],[8,10],[2,-62],[-21,1],[-11,31],[-11,25],[-21,8],[-6,30],[-17,-18],[-22,8],[-10,26],[-17,5],[-13,-1],[-2,18],[-9,1]],[[5360,4907],[8,-6],[9,22],[15,0],[2,-17],[11,-10],[16,36],[16,28],[7,19],[-1,47],[12,56],[13,30],[18,28],[3,18],[1,21],[5,20],[-2,33],[4,51],[5,36],[8,30],[2,35]],[[5760,5484],[17,-48],[12,-7],[7,10],[13,-4],[16,12],[6,-24],[25,-38]],[[5856,5385],[-2,-68],[11,-8],[-9,-20],[-10,-15],[-11,-30],[-6,-27],[-1,-46],[-7,-22],[0,-44]],[[5308,4953],[21,32],[-11,38],[10,15],[19,7],[2,25],[15,-27],[24,-3],[9,27],[3,39],[-3,45],[-13,34],[12,66],[-7,12],[-21,-5],[-7,30],[2,25]],[[2836,5598],[4,28],[9,-4],[5,17],[-6,34],[3,9]],[[3018,5861],[-18,-10],[-7,-29],[-10,-16],[-8,-22],[-4,-41],[-8,-34],[15,-3],[3,-27],[6,-13],[3,-23],[-4,-21],[1,-12],[7,-5],[7,-20],[35,6],[17,-8],[19,-49],[11,6],[20,-3],[16,6],[10,-10],[-5,-31],[-6,-19],[-2,-41],[5,-38],[8,-18],[1,-12],[-14,-29],[10,-13],[8,-20],[8,-57]],[[3058,4935],[-14,31],[-8,1],[18,58],[-21,27],[-17,-4],[-10,9],[-15,-15],[-21,7],[-16,61],[-13,15],[-9,27],[-19,27],[-7,-5]],[[2906,5174],[-12,13],[-14,19],[-7,-9],[-24,8],[-7,25],[-5,-1],[-28,33]],[[2619,5821],[4,7],[18,-15],[7,8],[8,-5],[5,-12],[8,-4],[7,12]],[[2707,5733],[-11,-5],[0,-23],[6,-9],[-4,-6],[1,-11],[-2,-12],[-2,-11]],[[5943,7201],[-3,2],[-5,-4],[-4,1],[-2,-2],[0,6],[-2,3],[-6,1],[-7,-5],[-5,3]],[[5377,7997],[-16,25],[-14,13],[-3,25],[-5,17],[21,12],[10,15],[20,11],[7,11],[7,-7],[13,6]],[[5417,8125],[13,-18],[21,-5],[-2,-16],[15,-12],[4,15],[19,-7],[3,-18],[20,-3],[13,-28]],[[5523,8033],[-8,-1],[-4,-10],[-7,-2],[-2,-14],[-5,-2],[-1,-6],[-9,-6],[-12,1],[-4,-12]],[[5207,7925],[3,41],[14,39],[-40,11],[-13,15]],[[5171,8031],[2,25],[-6,13]],[[5170,8108],[-4,60],[16,0],[8,22],[6,53],[-5,19]],[[5236,8347],[21,-7],[18,9]],[[5392,8278],[6,-29],[-8,-16],[10,-20],[7,-31],[-2,-20],[12,-37]],[[6198,5842],[-10,-30]],[[6188,5812],[-7,10],[-6,-4],[-16,1],[0,17],[-2,16],[9,27],[10,26]],[[6176,5905],[12,-5],[8,14]],[[3008,6222],[0,15],[-7,17],[7,10],[2,22],[-2,32]],[[5118,6285],[-31,-5],[0,36],[-13,10],[-17,16],[-7,27],[-94,126],[-93,126]],[[4863,6621],[-105,139]],[[4758,6760],[1,11],[0,4]],[[4759,6775],[0,68],[44,43],[28,8],[23,16],[10,29],[33,23],[1,42],[16,5],[13,21],[36,10],[5,23],[-7,12],[-10,61],[-1,35],[-11,37]],[[5233,7310],[-5,-30],[4,-55],[-6,-47],[-18,-32],[3,-44],[23,-34],[0,-14],[17,-23],[12,-103]],[[5263,6928],[9,-51],[1,-27],[-5,-47],[2,-26],[-3,-32],[2,-36],[-11,-24],[17,-42],[1,-25],[10,-32],[13,11],[22,-27],[12,-36]],[[5333,6534],[-95,-110],[-81,-113],[-39,-26]],[[2906,5174],[4,-44],[-9,-37],[-30,-61],[-33,-23],[-18,-50],[-5,-38],[-15,-24],[-12,29],[-11,6],[-12,-4],[-1,21],[8,13],[-3,24]],[[6023,6449],[-110,0],[-108,0],[-111,0]],[[5694,6449],[0,212],[0,205],[-9,46],[8,36],[-5,25],[10,27]],[[5951,6980],[18,-99]],[[6011,6013],[-3,23],[12,85],[3,38],[9,17],[20,10],[14,33]],[[6176,5905],[-10,18],[-11,34],[-12,19],[-8,19],[-24,23],[-19,1],[-7,12],[-16,-13],[-17,26],[-8,-43],[-33,12]],[[4947,7683],[11,-23],[51,-26],[10,13],[31,-26],[32,7]],[[4792,7319],[-2,19],[10,21],[4,16],[-9,17],[7,38],[-11,34],[12,5],[1,27],[5,9],[0,45],[13,15],[-8,29],[-16,2],[-5,-7],[-16,0],[-7,28],[-11,-8],[-11,-15]],[[5777,8607],[4,-10],[-20,-33],[8,-54],[-12,-18]],[[5757,8492],[-23,0],[-23,21],[-13,8],[-23,-11]],[[6188,5812],[-6,-21],[10,-32],[10,-27],[11,-21],[90,-68],[24,0]],[[6327,5643],[-79,-173],[-36,-2],[-25,-41],[-17,-1],[-8,-18]],[[6162,5408],[-19,0],[-11,20],[-26,-24],[-8,-24],[-18,4],[-6,7],[-7,-2],[-9,1],[-35,49],[-19,0],[-10,19],[0,32],[-14,10]],[[5980,5500],[-17,62],[-12,13],[-5,23],[-14,29],[-17,4],[9,32],[15,2],[4,17]],[[5943,5682],[0,52]],[[5943,5734],[8,60],[13,17],[3,23],[12,44],[17,29],[11,56],[4,50]],[[5663,8983],[-9,23],[-1,88],[-43,40],[-37,28]],[[5573,9162],[16,15],[31,-30],[37,2],[29,-14],[27,26],[14,42],[43,20],[35,-23],[-11,-41]],[[5794,9159],[-4,-40],[42,-38],[-26,-44],[33,-65],[-19,-50],[25,-42],[-11,-38],[41,-39],[-11,-30],[-25,-33],[-60,-74]],[[3485,5316],[7,24]],[[3492,5340],[2,26],[5,25]],[[3499,5391],[-11,34],[-2,39],[15,50]],[[5157,8034],[6,-5],[8,2]],[[5190,7831],[-2,-17],[9,-21],[-10,-18],[7,-44],[15,-8],[-3,-25]],[[5263,5241],[10,3],[40,-1],[0,70]],[[4827,8284],[-21,12],[-17,-1],[6,31],[-6,31]],[[4905,8144],[-1,0],[-43,9]],[[4918,8291],[-19,35],[0,1]],[[4942,8402],[2,-6],[24,-68]],[[6109,7684],[4,6],[23,-9],[41,-10],[38,-27],[5,-11],[16,9],[26,-12],[9,-24],[17,-13]],[[6210,7549],[-27,28],[-29,-3]],[[5000,5817],[-2,-18],[12,-30],[0,-42],[2,-45],[7,-21],[-6,-52],[2,-28],[8,-37],[6,-20]],[[4715,5666],[-7,-3],[0,21],[-5,15],[1,17],[-6,24],[-7,21],[-23,0],[-6,-11],[-8,-1],[-4,-13],[-4,-16],[-15,-25]],[[4579,5818],[13,28],[8,-1],[7,10],[6,0],[5,8],[-3,19],[3,6],[1,19]],[[4619,5907],[13,0],[20,-14],[6,1],[2,6],[16,-4],[4,3]],[[4680,5899],[1,-21],[5,0],[7,8],[4,-2],[8,-15],[12,-5],[8,13],[9,8],[6,8],[6,-2],[6,-13],[3,-15],[12,-25],[-6,-14],[-1,-19],[6,6],[3,-7],[-1,-17],[8,-17]],[[4765,5625],[-8,1],[-5,-23],[-8,1],[-6,12],[2,23],[-12,35],[-7,-6],[-6,-2]],[[4535,5965],[30,2],[7,14],[9,0],[10,-14],[9,0],[9,10],[6,-17],[-12,-13],[-12,1],[-12,12],[-10,-13],[-5,0],[-7,-9],[-25,2]],[[4536,5896],[15,9],[9,-2],[8,7],[51,-3]],[[5583,7534],[18,5],[11,13],[15,-1],[5,10],[5,2]],[[5725,7591],[13,-15],[-8,-36],[-7,-7]],[[2438,6020],[0,16],[4,14],[-4,11],[13,47],[36,0],[0,19],[-4,4],[-3,12],[-10,14],[-11,19],[13,0],[0,32],[26,1],[25,-1]],[[2549,6088],[-13,-22],[-13,-16],[-2,-11],[2,-11],[-5,-15]],[[2518,6013],[-7,-4],[2,-6],[-6,-7],[-9,-14],[-1,-9]],[[3412,5526],[-4,-51],[-17,-15],[1,-14],[-5,-30],[13,-42],[8,0],[4,-32],[17,-50]],[[3313,5482],[-19,44],[7,15],[0,27],[17,9],[7,11],[-10,21],[3,21],[22,34]],[[2561,5953],[2,23],[-4,6],[-6,5],[-12,-7],[-1,7],[-8,10],[-6,11],[-8,5]],[[2690,6046],[-9,1],[-4,-8],[-10,-7],[-7,0],[-6,-8],[-6,3],[-4,9],[-3,-2],[-4,-14],[-3,1],[0,-12],[-10,-16],[-5,-7],[-3,-7],[-8,12],[-6,-16],[-6,1],[-6,-2],[0,-28],[-4,0],[-3,-14],[-9,-2]],[[5515,7638],[-3,-9]],[[5380,7802],[20,-2],[5,10],[9,-9],[11,-1],[0,16],[10,6],[2,23],[23,15]],[[5460,7860],[8,-7],[21,-25],[23,-11],[10,9]],[[5522,7826],[7,-22],[9,-17],[-11,-21]],[[5471,7953],[14,-14],[10,-7],[24,8],[2,11],[11,2],[14,9],[3,-4],[13,7],[6,14],[9,3],[30,-17],[6,6]],[[5613,7971],[15,-16],[2,-15]],[[5630,7940],[-17,-13],[-13,-39],[-17,-39],[-22,-10]],[[5561,7839],[-17,2],[-22,-15]],[[5460,7860],[-6,20],[-4,0]],[[8470,4670],[3,-11],[1,-18]],[[8916,5033],[0,-188],[1,-188]],[[8045,5298],[5,-39],[19,-32],[18,12],[18,-4],[16,29],[13,5],[26,-16],[23,12],[14,80],[11,20],[10,65],[32,0],[24,-9]],[[7252,6920],[-17,-26],[-11,-54],[27,-21],[26,-29],[36,-32],[38,-7],[16,-30],[22,-5],[33,-14],[23,1],[4,23],[-4,37],[2,25]],[[7703,6810],[2,-22],[-10,-11],[2,-35],[-19,10],[-36,-39],[0,-33],[-15,-49],[-1,-28],[-13,-47],[-21,13],[-1,-60],[-7,-19],[3,-25],[-14,-13]],[[7030,6215],[-8,73],[0,70]],[[6893,6547],[19,38],[61,0],[-6,49],[-15,30],[-4,44],[-18,26],[31,60],[32,-4],[29,60],[18,59],[26,57],[0,41],[24,34],[-23,28],[-9,39],[-10,51],[13,24],[43,-14],[31,9],[26,48]],[[6690,6900],[14,-30],[11,-35],[27,-25],[0,-51],[14,-9],[2,-27],[-40,-30],[-11,-66]],[[6348,6906],[-15,30],[0,31],[-9,0],[4,41],[-14,44],[-34,32],[-19,54],[6,45],[14,20],[-2,34],[-18,17],[-18,69]],[[6243,7323],[-15,46],[5,18],[-8,66],[19,16]],[[6497,7324],[25,12],[19,33],[19,-2],[12,11],[20,-6],[31,-29],[22,-6],[31,-51],[21,-2],[3,-49]],[[6332,6908],[-19,5],[-20,-55]],[[6293,6858],[-52,5],[-78,115],[-41,41],[-34,15]],[[6088,7034],[-11,70]],[[6077,7104],[61,60],[11,70],[-3,42],[15,14],[15,36]],[[6176,7326],[12,9],[32,-7],[10,-15],[13,10]],[[5983,6996],[0,-23],[-14,-92]],[[5975,7088],[9,0],[3,10],[7,1]],[[5994,7099],[1,-24],[-4,-9],[1,0]],[[5992,7066],[-5,-18]],[[5987,7048],[-10,8],[-6,-39],[7,-6],[-7,-8],[-1,-15],[13,8]],[[5383,7861],[-3,-29],[7,-24]],[[6088,7034],[-5,-8],[-56,-29],[28,-58],[-9,-10],[-5,-19],[-21,-8],[-7,-21],[-12,-17],[-31,9]],[[5983,6996],[4,17],[0,35]],[[5992,7066],[31,-23],[54,61]],[[6554,7561],[-14,-3],[-20,45],[-18,17],[-32,-12],[-12,-20]],[[6458,7588],[-2,14],[7,24]],[[6363,7854],[-14,9],[3,30],[-18,39],[-20,-2],[-24,39],[16,44],[-8,11],[22,64],[29,-34],[3,42],[58,63],[43,2],[61,-40],[33,-24]],[[6547,8097],[29,25],[45,1]],[[6621,8123],[35,-30],[8,17],[39,-2],[7,27],[-45,39],[27,28],[-6,16],[27,15],[-20,40],[13,19],[104,20],[13,15],[70,21],[25,24],[50,-13],[8,-59],[29,14],[36,-20],[-2,-31],[26,3],[70,54],[-10,-18],[35,-44],[62,-147],[15,30],[39,-33],[39,15],[16,-10],[13,-34],[20,-11],[11,-24],[36,8],[15,-36]],[[7229,7621],[-17,9],[-14,20],[-42,6],[-46,2],[-10,-7],[-39,25],[-16,-12],[-4,-34],[-46,20],[-18,-9],[-7,-25]],[[6970,7616],[-16,-10],[-36,-41],[-12,-41],[-11,0],[-7,27],[-36,2],[-5,47],[-14,1],[2,57],[-33,42],[-48,-4],[-32,-8],[-27,51],[-22,22],[-43,41],[-6,5],[-71,-34],[1,-212]],[[6088,4913],[-40,58],[-1,33],[-101,117],[-5,7]],[[5941,5128],[0,61],[8,23],[13,38],[11,42],[-13,66],[-3,29],[-13,40]],[[5944,5427],[17,35],[19,38]],[[6162,5408],[-24,-65],[0,-210],[16,-48]],[[7046,7453],[-53,-9],[-34,19],[-30,-4],[2,33],[31,-10],[10,18]],[[6972,7500],[21,-6],[36,42],[-33,30],[-20,-14],[-21,21],[24,38],[-9,5]],[[7849,5884],[-7,70],[18,48],[36,11],[26,-9]],[[7922,6004],[23,-22],[12,39],[25,-21]],[[7982,6000],[6,-38],[-3,-69],[-47,-45],[13,-34],[-30,-5],[-24,-23]],[[8504,7356],[2,5],[12,-2],[11,26],[20,3],[11,4],[4,14]],[[5557,7635],[5,13]],[[5562,7648],[7,4],[4,19],[5,3],[3,-8],[6,-4],[3,-9],[5,-2],[5,-11],[4,0],[-3,-14],[-3,-7],[1,-4]],[[5599,7615],[-7,-2],[-16,-9],[-1,-12],[-4,1]],[[6344,6826],[-19,-1],[-7,27],[-25,6]],[[7780,6358],[6,21],[24,38]],[[7837,6476],[16,-45],[13,-53],[34,0],[11,-50],[-18,-16],[-8,-20],[33,-35],[24,-68],[17,-50],[21,-41],[7,-40],[-5,-58]],[[7922,6004],[9,26],[1,49],[-22,50],[-2,57],[-21,47],[-21,4],[-6,-20],[-16,-2],[-8,10],[-30,-34],[0,51],[7,61],[-19,3],[-2,34],[-12,18]],[[5999,7177],[13,-3],[4,-22],[-15,-22],[-7,-31]],[[4682,5573],[6,19],[2,16],[12,32],[13,26]],[[5263,6928],[13,13],[3,24],[-3,24],[19,22],[8,19],[14,16],[2,45]],[[5694,6449],[0,-115],[-32,0],[0,-24]],[[5662,6310],[-111,110],[-111,110],[-28,-31]],[[5412,6499],[-20,-21],[-15,31],[-44,25]],[[5770,3418],[-21,44],[15,36],[15,23],[13,12],[12,-18],[10,-17],[-9,-28],[-4,-19],[-16,-9],[-5,-19],[-10,-5]],[[5584,8409],[32,18],[47,-4],[27,6],[4,-12],[15,-4],[26,-28]],[[5652,8287],[-7,18],[-14,6]],[[5631,8311],[-2,14],[3,16],[-13,9],[-29,10]],[[5757,8492],[14,-13],[2,-28],[9,-34]],[[4759,6775],[-4,0],[0,-31],[-17,-2],[-9,-13],[-13,0],[-10,8],[-23,-7],[-9,-44],[-9,-5],[-13,-72],[-38,-62],[-10,-80],[-11,-26],[-3,-20],[-63,-5]],[[4634,6774],[1,1],[14,22]],[[5784,7802],[-5,26],[3,25],[-1,25],[-16,34],[-9,24],[-9,17],[-8,6]],[[5739,7959],[6,9],[19,5],[20,-18],[12,-2],[12,-15],[-2,-20],[10,-9],[4,-24],[10,-15],[-2,-9],[5,-5],[-7,-5],[-16,2],[-3,8],[-6,-5],[2,-10],[-8,-18],[-4,-20],[-7,-6]],[[1746,7056],[32,4],[35,7],[-3,-12],[42,-28],[64,-40],[55,0],[22,0],[0,24],[48,0],[10,-21],[15,-18],[16,-25],[9,-30],[7,-32],[15,-17],[23,-17],[17,45],[23,1],[19,-23],[14,-39],[10,-34],[16,-33],[6,-40],[8,-27],[22,-18],[20,-13],[10,2]],[[2422,6249],[21,10],[18,10]],[[5599,7615],[9,3],[13,1]],[[5118,6285],[0,-132],[-15,-39],[-2,-35],[-25,-9],[-38,-5],[-10,-21],[-18,-2]],[[4680,5899],[1,18],[-2,22],[-11,16],[-5,33],[-2,36]],[[4661,6024],[10,11],[4,34],[9,1],[20,-16],[15,11],[11,-4],[4,13],[112,1],[6,40],[-5,7],[-13,249],[-14,249],[43,1]],[[7780,6358],[-16,-13],[-16,-25],[-20,-3],[-12,-62],[-12,-10],[14,-51],[17,-42],[12,-38],[-11,-50],[-9,-11],[6,-29],[19,-45],[3,-33],[0,-26],[11,-53],[-16,-53],[-13,-60]],[[5533,7689],[8,-10],[4,-8],[9,-6],[10,-12],[-2,-5]],[[7437,8021],[29,10],[53,50],[42,27],[24,-18],[29,-1],[19,-27],[28,-2],[40,-14],[27,40],[-11,34],[28,59],[31,-23],[26,-7],[32,-15],[6,-43],[39,-24],[26,10],[35,8],[28,-8],[27,-27],[17,-30],[26,1],[35,-10],[26,15],[36,9],[41,41],[17,-6],[14,-20],[33,5]],[[5911,3642],[-21,1]],[[5890,3643],[-2,25],[-4,26]],[[5884,3694],[-3,21],[5,64],[-7,41],[-13,81]],[[5866,3901],[29,65],[7,42],[5,5],[3,34],[-5,17],[1,43],[6,40],[0,73],[-15,19],[-13,4],[-6,14],[-13,12],[-23,-1],[-2,21]],[[5840,4289],[-2,41],[84,48]],[[5922,4378],[16,-28],[8,6],[11,-15],[1,-23],[-6,-27],[2,-40],[19,-36],[8,40],[12,12],[-2,74],[-12,42],[-10,18],[-10,-1],[-7,75],[7,44]],[[5959,4519],[21,5],[34,-17],[7,8],[19,1],[10,17],[17,0],[30,22],[22,33]],[[4525,6392],[7,19],[108,0],[-5,83],[7,29],[26,5],[-1,148],[91,-3],[0,87]],[[4661,6024],[-18,40],[-17,42],[-18,15],[-13,17],[-16,0],[-14,-13],[-13,5],[-10,-18]],[[5922,4378],[-15,15],[9,53],[9,20],[-6,48],[6,47],[4,15],[-7,49],[-13,26]],[[5909,4651],[28,-11],[5,-16],[10,-27],[7,-78]],[[7779,5555],[5,10],[23,-25],[2,-30],[18,7],[9,24]],[[5644,4173],[23,13],[18,-3],[11,-13],[0,-5]],[[5552,3756],[0,-212],[-25,-30],[-15,-4],[-17,11],[-13,4],[-4,25],[-11,15],[-14,-28]],[[5412,6499],[7,-90],[10,-15],[1,-18],[11,-20],[-6,-24],[-11,-117],[-1,-75],[-35,-54],[-12,-76],[11,-22],[0,-37],[18,-1],[-3,-27]],[[5393,5901],[-5,-1],[-19,63],[-6,2],[-22,-32],[-21,17],[-15,3],[-8,-8],[-17,2],[-16,-25],[-14,-1],[-34,30],[-13,-14],[-14,1],[-11,21],[-27,22],[-30,-7],[-7,-12],[-4,-34],[-8,-23],[-2,-51]],[[5863,9188],[-47,-23],[-22,-6]],[[5573,9162],[-17,-3],[-4,-38],[-53,10],[-7,-32],[-27,0],[-18,-41],[-28,-64],[-43,-81],[10,-20],[-10,-22],[-27,1],[-18,-54],[2,-77],[17,-29],[-9,-68],[-23,-39],[-12,-33]],[[6475,6141],[-9,40],[-22,96]],[[6444,6277],[83,57],[19,115],[-13,41]],[[5546,8316],[34,-6],[51,1]],[[5653,8152],[14,-50],[-3,-16],[-14,-7],[-25,-48],[7,-25],[-6,3]],[[5626,8009],[-26,22],[-20,-8],[-14,6],[-16,-13],[-14,21],[-11,-8],[-2,4]],[[8628,7624],[4,-10]],[[6427,6601],[-8,-5],[-8,12]],[[5784,7802],[12,-11],[13,9],[13,-10]],[[5629,7730],[-5,10],[6,9],[-7,8],[-9,-13],[-16,16],[-2,24],[-17,14],[-3,18],[-15,23]],[[5630,7940],[12,12],[17,-6],[18,-1],[13,-14],[10,9],[20,6],[7,13],[12,0]],[[9352,8720],[-69,-97],[23,-35]],[[6621,8123],[-44,-1],[-30,-25]],[[6061,7895],[1,25],[14,16],[27,5],[5,19],[-7,32],[12,30],[-1,17],[-41,18],[-16,0],[-17,27],[-21,-9],[-36,20],[1,11],[-10,25],[-22,3],[-2,18],[7,11],[-18,33],[-29,-6],[-8,3],[-7,-13],[-11,3]],[[5966,8977],[2,-27],[2,-58]],[[6031,8887],[-17,25],[18,22]],[[5821,5105],[7,-6],[16,18]],[[5844,5117],[11,-32],[-1,-34],[-8,-8]],[[6444,6277],[-80,-23],[-26,-25],[-20,-61],[-13,-10],[-7,20],[-11,-3],[-27,6],[-5,5],[-32,-1],[-7,-5],[-12,15],[-7,-29],[3,-24],[-12,-18]],[[5634,5824],[1,14],[-10,17],[-1,33],[-6,23],[-9,-4],[2,21],[8,24],[-3,24],[9,18],[-6,13],[7,36],[13,42],[24,-4],[-1,229]],[[5943,5734],[0,-7]],[[5943,5727],[-4,2],[0,28],[-3,20],[-14,23],[-4,41],[4,43],[-13,4],[-2,-13],[-17,-3],[7,-17],[2,-35],[-15,-31],[-14,-42],[-14,-6],[-23,34],[-11,-12],[-3,-17],[-14,-11],[-1,-11],[-28,0],[-4,11],[-20,2],[-10,-9],[-7,4],[-14,34],[-5,16],[-20,-8],[-8,-27],[-7,-51],[-10,-11],[-8,-6]],[[5663,5679],[-2,2]],[[5944,5427],[-17,-26],[-20,0],[-22,-14],[-18,13],[-11,-15]],[[5682,5656],[-19,23]],[[5943,5727],[0,-45]],[[6359,5839],[0,-24],[0,-58],[0,-30],[-13,-36],[-19,-48]],[[3499,5391],[-4,-25],[-3,-26]],[[5626,8009],[-8,-15],[-5,-23]],[[5890,3643],[-5,-26],[-17,-6],[-16,31],[-1,20],[8,22],[3,17],[8,4],[14,-11]],[[6004,7245],[7,13],[7,12],[2,32],[9,-11],[31,16],[14,-11],[23,1],[32,21],[15,-1],[32,9]],[[6883,7321],[16,59],[-6,43],[-20,13],[7,26],[23,-3],[13,32],[9,37],[37,13],[-6,-27],[4,-16],[12,2]],[[6554,7561],[31,1],[-4,29],[24,20],[23,33],[37,-30],[3,-46],[11,-12],[30,3],[9,-11],[14,-59],[32,-40],[18,-27],[29,-28],[37,-25],[-1,-35]],[[5909,4651],[-15,17],[-18,10],[-11,9],[-12,15]],[[5844,5117],[10,7],[31,-1],[56,5]],[[5901,7792],[5,11],[26,20]],[[3052,7698],[-15,-34],[-4,-13]],[[2879,7375],[-18,9],[19,-18]],[[2522,6928],[-11,-9],[5,-15]],[[1551,7699],[4,53],[3,52]],[[8001,6423],[-38,-49]],[[5817,3910],[11,0],[14,-10],[9,7],[15,-6]],[[5840,4289],[-21,-7],[-16,-23],[-3,-20],[-10,-5],[-24,-47],[-15,-37],[-10,-2],[-9,7],[-31,6]]],"transform":{"scale":[0.036003600360036005,0.0173662496249625],"translate":[-180,-90]}}

  /**
   * Call the constructor for the map visualization
   */
  if (document.body.getElementsByClassName) {
    var list = document.body.getElementsByClassName('earth-viz')
      , index = list.length - 1
    ;

    while (index > -1) {
      new d3.geo.earth(list.item(index));
      index -= 1;
    }
  }

}));
