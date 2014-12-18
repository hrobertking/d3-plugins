(function() {
  /**
   * Returns a data collection drawn from an HTML table
   * @return  {object[]}
   * @param   {string|HTMLElement} table  The HTML data table. Can either be an HTMLElement or a CSS-style selector, e.g., #myid or .myclass
   * @param   {object} label              Contains either a row index (in the row property) or a column index (in the column property that specifies where labels are contained
   * @param	  {object} body               Contains a "start" property that is either a row or column index (corresponding to type specified in the label parameter) and may optionally contain and "end" property
   */
  d3.table = function(table, label, body) {
    var collection = [ ]
      , data = [ ]
      , props = [ ]
      , z
    ;

    try {
      table = d3.select(table);
      label = label || { };
      body = body || { };

      if (table) {
        // default format is data in rows
        if (!isNaN(label.row) || isNaN(label.column)) {
          // get the property names from either the specified
          // row or the first row of the thead or table
          if (!isNaN(label.row)) {
            table.selectAll('tr').each(function(d, i) {
              if (i === label.row) {
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
          // against any specified body or label
          if (props.length) {
            (table.selectAll('tbody') || table)
              .selectAll('tr').each(function(d, i) {
                var obj = { };
                if ((!isNaN(body.end) && i > body.end) ||
                    (!isNaN(body.start) && i < body.start) || 
                    (!isNaN(label.row) && i === label.row)) {
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
                   if (i === label.column) {
                     props.push(d3.select(this).text());
                   }
                 });
          });

          // get all the rows and check the row index
          // against any specified body or label
          if (props.length) {
            table.selectAll('tr').each(function(d, i) {
                var property = i;
                d3.select(this)
                    .selectAll('td, th').each(function(d, i) {
                       if ((!isNaN(body.end) && i > body.end) ||
                           (!isNaN(body.start) && i < body.start) || 
                           (!isNaN(label.column) && i === label.column)) {
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

      return data;
    } catch (ignore) {
    }
  };
})();
