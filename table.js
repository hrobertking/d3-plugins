(function() {
  'use strict';

  /**
   * Returns a data collection drawn from an HTML table
   * @return  {object[]}
   * @param   {string|HTMLElement} table  The HTML data table. Can either be an HTMLElement or a CSS-style selector, e.g., #myid or .myclass
   * @param   {object} config             Contains either a row index (in the row property) or a column index (in the column property that specifies where labels are contained. Also may contain a "start" property that is either a row or column index (corresponding to type specified in the label parameter) and may optionally contain and "end" property, or a callback function.
   * @param   {function} callback         Function to be called when data is ready
   */
  d3.table = function(table, config, callback) {
    var collection = [ ]
      , data = [ ]
      , props = [ ]
      , z
    ;

    try {
      table = d3.select(table);
      if (typeof config === 'function') {
        config = { callback:config };
      } else {
        config = config || { };
      }
      callback = callback || config.callback;

      if (table) {
        // default format is data in rows
        if (!isNaN(config.row) || isNaN(config.column)) {
          // get the property names from either the specified
          // row or the first row of the thead or table
          if (!isNaN(config.row)) {
            table.selectAll('tr').each(function(d, i) {
              if (i === config.row) {
                d3.select(this)
                    .selectAll('td, th').each(function() {
                       props.push(d3.select(this).text());
                     });
              }
            });
          } else {
            (table.select('thead') || table)
              .select('tr')
                .selectAll('td, th').each(function() {
                   props.push(d3.select(this).text());
                 });
          }

          // get all the rows and check the row index
          // against any specified config
          if (props.length) {
            (table.selectAll('tbody') || table)
              .selectAll('tr').each(function(d, i) {
                var obj = { };
                if ((!isNaN(config.end) && i > config.end) ||
                    (!isNaN(config.start) && i < config.start) || 
                    (!isNaN(config.row) && i === config.row)) {
                  return;
                }
                d3.select(this).selectAll('td').each(function(d, i) {
                    obj[props[i]] = d3.select(this).text();
                  });
                collection.push(obj);
              });
          }
        } else {
          // get the property names from the specified column
          table.selectAll('tr').each(function() {
            d3.select(this)
                .selectAll('td, th').each(function(d, i) {
                   if (i === config.column) {
                     props.push(d3.select(this).text());
                   }
                 });
          });

          // get all the rows and check the row index
          // against any specified config
          if (props.length) {
            table.selectAll('tr').each(function(d, i) {
                var property = i;
                d3.select(this)
                    .selectAll('td, th').each(function(d, i) {
                       if ((!isNaN(config.end) && i > config.end) ||
                           (!isNaN(config.start) && i < config.start) || 
                           (!isNaN(config.column) && i === config.column)) {
                         return;
                       }
                       collection[i] = collection[i] || { };
                       collection[i][props[property]] = d3.select(this).text();
                     });
              });
          }
        }
      }

      // normalize the array
      for (z in collection) {
        data.push(collection[z]);
      }

      if (callback) {
        callback.call(this, null, data);
      }

      return data;
    } catch (ignore) {
      if (callback) {
        callback.call(this, ignore);
      }
    }
  };
})();
