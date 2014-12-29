(function() {
  /**
   * Get the children of each element in the set of matched elements, optionally filtered by a selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.children = d3.selection.prototype.children = function(selector) {
    var child
      , collection = [ ]
      , htmlelement = this.node()
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      // only get HTMLElement types in childNodes, no 'text' types
      for (child in htmlelement.childNodes) {
        if (htmlelement.childNodes[child].nodeType === 1) {
          collection.push(htmlelement.childNodes[child]);
        }
      }

      // convert the array to a d3 selection
      collection = d3.select(collection);

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // filter if a selector is specified
      if (selector) {
        collection = collection.filter(selector);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.closest = d3.selection.prototype.closest = function(selector) {
    var collection = [ ]
      , htmlelement
    ;

    // drill down to the actual element
    function drillDown(obj) {
      while (obj instanceof Array) {
        obj = obj.shift();
      }
      return obj;
    }

    // validate the selector
    selector = (typeof selector === 'string') ? selector : null;

    // start with the parent of the current selection
    htmlelement = drillDown(this.node()).parentNode;
    collection = d3.select(htmlelement);
    if (selector) {
      collection = collection.filter(selector);

      // loop while a parent exists and there is not a match found
      while (!collection.length && htmlelement) {
        collection = d3.select(htmlelement.parentNode).filter(selector);
        htmlelement = htmlelement.parentNode;
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get the descendants of each element in the current set of matched elements, filtered by a selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.find = d3.selection.prototype.find = function(selector) {
    var collection = this;

    // validate the selector
    selector = (typeof selector === 'string') ? selector : null;

    // select if a selector is specified
    if (selector) {
      collection = collection.selectAll(selector);
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Returns the first element in the selection
   * @return  {object}
   */
  d3.selection.enter.prototype.first = d3.selection.prototype.first = function() {
    return this.node();
  };

  /**
   * Returns the height, in pixels, of the item
   * @return  {number}
   */
  d3.selection.enter.prototype.height = d3.selection.prototype.height = function() {
    var num = this.style('height').replace(/px/, '');
    return num;
  };

  /**
   * Returns the last element in the selection
   * @return  {object}
   */
  d3.selection.enter.prototype.last = d3.selection.prototype.last = function() {
    var htmlelement = this;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.pop();
    }

    return d3.select(htmlelement);
  };

  /**
   * Get the immediately following sibling of each element in the set of matched elements. If a selector is provided, it retrieves the next sibling only if it matches that selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.next = d3.selection.prototype.next = function(selector) {
    var collection = [ ]
      , htmlelement = this.node()
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      collection = d3.select(htmlelement.nextElementSibling);

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // select if a selector is specified
      if (selector) {
        collection = collection.filter(selector);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get all following siblings of each element in the set of matched elements, optionally filtered by a selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.nextAll = d3.selection.prototype.nextAll = function(selector) {
    var collection = [ ]
      , htmlelement = this.node()
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      htmlelement = htmlelement.nextElementSibling;

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // get all the siblings and turn the array of nodes into a selection
      while (htmlelement) {
        collection.push(htmlelement);
        htmlelement = htmlelement.nextElementSibling
      }
      collection = d3.select(collection);

      // select if a selector is specified
      if (selector) {
        collection = collection.filter(selector);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get all following siblings of each element up to but not including the element matched by the selector.
   * @return  {selection}
   * @param   {string} selector
   * @param   {string} filter
   */
  d3.selection.enter.prototype.nextUntil = d3.selection.prototype.nextUntil = function(selector, filter) {
    var collection = [ ]
      , htmlelement = this.node()
      , candidate
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      htmlelement = htmlelement.nextElementSibling;

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // get all the siblings and turn the array of nodes into a selection
      while (htmlelement) {
        candidate = d3.select(htmlelement).filter(selector);
        if (selector && candidate.size()) {
          break;
        } else {
          collection.push(htmlelement);
        }
        htmlelement = htmlelement.nextElementSibling
      }
      collection = d3.select(collection);

      // filter if a filter is specified
      if (filter) {
        collection = collection.filter(filter);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get the closest ancestor element that is positioned.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.offsetParent = d3.selection.prototype.offsetParent = function(selector) {
    var collection = [ ]
      , htmlelement = this.node()
      , positioned = /relative|absolute|fixed/i
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      while (!collection.length && htmlelement) {
        htmlelement = htmlelement.parentNode;
        if (positioned.test(d3.select(htmlelement).style('position'))) {
          collection = d3.select(htmlelement);
        }
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get the parent of each element in the current set of matched elements, optionally filtered by a selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.parent = d3.selection.prototype.parent = function(selector) {
    var collection = [ ]
      , htmlelement = this.node()
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      collection = d3.select(htmlelement.parentNode);

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // select if a selector is specified
      if (selector) {
        collection = collection.filter(selector);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get the ancestors of each element in the current set of matched elements, optionally filtered by a selector
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.parents = d3.selection.prototype.parents = function(selector) {
    var collection = [ ]
      , htmlelement = this.node()
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      htmlelement = htmlelement.parentNode;

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // get all the parents and turn the array of nodes into a selection
      while (htmlelement) {
        collection.push(htmlelement);
        htmlelement = htmlelement.parentNode;
      }
      collection = d3.selectAll(collection);

      // select if a selector is specified
      if (selector) {
        collection = collection.filter(selector);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get the ancestors of each element in the current set of matched elements, up to but not including the element matched by the selector.
   * @return  {selection}
   * @param   {string} selector
   * @param   {string} filter
   */
  d3.selection.enter.prototype.parentsUntil = d3.selection.prototype.parentsUntil = function(selector, filter) {
    var collection = [ ]
      , htmlelement = this.node()
      , candidate
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      htmlelement = htmlelement.parentNode;

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // get all the siblings and turn the array of nodes into a selection
      while (htmlelement) {
        candidate = d3.select(htmlelement).filter(selector);
        if (selector && candidate.size()) {
          break;
        } else {
          collection.push(htmlelement);
        }
        htmlelement = htmlelement.parentNode
      }
      collection = d3.select(collection);

      // filter if a filter is specified
      if (filter) {
        collection = collection.filter(filter);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get the immediately preceding sibling of each element in the set of matched elements, optionally filtered by a selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.prev = d3.selection.prototype.prev = function(selector) {
    var collection = [ ]
      , htmlelement = this.node()
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      collection = d3.select(htmlelement.previousElementSibling);

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // select if a selector is specified
      if (selector) {
        collection = collection.filter(selector);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get all preceding siblings of each element in the set of matched elements, optionally filtered by a selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.prevAll = d3.selection.prototype.prevAll = function(selector) {
    var collection = [ ]
      , htmlelement = this.node()
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      htmlelement = htmlelement.previousElementSibling;

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // get all the siblings and turn the array of nodes into a selection
      while (htmlelement) {
        collection.push(htmlelement);
        htmlelement = htmlelement.previousElementSibling
      }
      collection = d3.select(collection);

      // select if a selector is specified
      if (selector) {
        collection = collection.filter(selector);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get all preceding siblings of each element up to but not including the element matched by the selector.
   * @return  {selection}
   * @param   {string} selector
   * @param   {string} filter
   */
  d3.selection.enter.prototype.prevUntil = d3.selection.prototype.prevUntil = function(selector, filter) {
    var collection = [ ]
      , htmlelement = this.node()
      , candidate
    ;

    // drill down to the actual element
    while (htmlelement instanceof Array) {
      htmlelement = htmlelement.shift();
    }
    if (htmlelement.nodeType === 1) {
      htmlelement = htmlelement.previousElementSibling;

      // validate the selector
      selector = (typeof selector === 'string') ? selector : null;

      // get all the siblings and turn the array of nodes into a selection
      while (htmlelement) {
        candidate = d3.select(htmlelement).filter(selector);
        if (selector && candidate.size()) {
          break;
        } else {
          collection.push(htmlelement);
        }
        htmlelement = htmlelement.previousElementSibling
      }
      collection = d3.select(collection);

      // filter if a filter is specified
      if (filter) {
        collection = collection.filter(filter);
      }
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Get the siblings of each element in the set of matched elements, optionally filtered by a selector.
   * @return  {selection}
   * @param   {string} selector
   */
  d3.selection.enter.prototype.siblings = d3.selection.prototype.siblings = function(selector) {
    var collection = [ ]
      , htmlelement
    ;

    // validate the selector
    selector = (typeof selector === 'string') ? selector : null;

    // get all the siblings and turn the array of nodes into a selection
    htmlelement = this.node().previousElementSibling
    while (htmlelement) {
      collection.push(htmlelement);
      htmlelement = htmlelement.previousElementSibling
    }
    htmlelement = this.node().nextElementSibling
    while (htmlelement) {
      collection.push(htmlelement);
      htmlelement = htmlelement.nextElementSibling
    }
    collection = d3.select(collection);

    // select if a selector is specified
    if (selector) {
      collection = collection.filter(selector);
    }

    // return any elements that match the selector
    return collection;
  };

  /**
   * Returns the width, in pixels, of the item
   * @return  {number}
   */
  d3.selection.enter.prototype.width = d3.selection.prototype.width = function() {
    var num = this.style('width').replace(/px/, '');
    return num;
  };
})();
