module.exports = {
  /**
   * Extends an object
   *
   * @param  {object} target object to extend
   * @param  {object} source object to take properties from
   * @return {object}        extended object
   */
  extend: function(target, source) {
    target = target || {};
    for (var prop in source) {
      // Go recursively
      if (this.isObject(source[prop])) {
        target[prop] = this.extend(target[prop], source[prop])
      } else {
        target[prop] = source[prop]
      }
    }
    return target;
  }

  /**
   * Checks if an object is a DOM element
   *
   * @param  {object}  o HTML element or String
   * @return {Boolean}   returns true if object is a DOM element
   */
, isElement: function(o){
    return (
      typeof HTMLElement === "object" ? (o instanceof HTMLElement || o instanceof SVGElement || o instanceof SVGSVGElement) : //DOM2
      o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
    );
  }

  /**
   * Checks if an object is an Object
   *
   * @param  {object}  o Object
   * @return {Boolean}   returns true if object is an Object
   */
, isObject: function(o){
    return Object.prototype.toString.call(o) === '[object Object]';
  }

  /**
   * Checks if an object is a Function
   *
   * @param  {object}  f Function
   * @return {Boolean}   returns true if object is a Function
   */
, isFunction: function(f){
    return Object.prototype.toString.call(f) === '[object Function]';
  }

  /**
   * Search for an SVG element
   *
   * @param  {object|string} elementOrSelector DOM Element or selector String
   * @return {object|null}                   SVG or null
   */
, getSvg: function(elementOrSelector) {
    var element
      , svg;

    if (!this.isElement(elementOrSelector)) {
      // If selector provided
      if (typeof elementOrSelector == 'string' || elementOrSelector instanceof String) {
        // Try to find the element
        element = document.querySelector(elementOrSelector)

        if (!element) {
          throw new Error('Provided selector did not find any elements')
          return null
        }

      } else {
        throw new Error('Provided selector is not an HTML object nor String')
        return null
      }
    } else {
      element = elementOrSelector
    }

    if (element.tagName.toLowerCase() === 'svg') {
      svg = element;
    } else {
      if (element.tagName.toLowerCase() === 'object') {
        svg = element.contentDocument.documentElement;
      } else {
        if (element.tagName.toLowerCase() === 'embed') {
          svg = element.getSVGDocument().documentElement;
        } else {
          if (element.tagName.toLowerCase() === 'img') {
            throw new Error('Cannot script an SVG in an "img" element. Please use an "object" element or an in-line SVG.');
          } else {
            throw new Error('Cannot get SVG.');
          }
          return null
        }
      }
    }

    return svg
  }

  /**
   * Attach a given context to a function
   * @param  {Function} fn      Function
   * @param  {object}   context Context
   * @return {Function}           Function with certain context
   */
, proxy: function(fn, context) {
    return function() {
      fn.apply(context, arguments)
    }
  }

  /**
   * Returns object type
   * Uses toString that returns [object SVGPoint]
   * And than parses object type from string
   *
   * @param  {object} o Any object
   * @return {string}   Object type
   */
, getType: function(o) {
    return Object.prototype.toString.apply(o).replace(/^\[object\s/, '').replace(/\]$/, '')
  }

  /**
   * If it is a touch event than add clientX and clientY to event object
   *
   * @param  {object} evt Event object
   */
, mouseAndTouchNormalize: function(evt) {
    // If no cilentX and but touch objects are available
    if (evt.clientX === void 0 && evt.touches !== void 0 && evt.touches.length) {
      evt.clientX = evt.touches[0].clientX
    }
    if (evt.clientY === void 0 && evt.touches !== void 0 && evt.touches.length) {
      evt.clientY = evt.touches[0].clientY
    }
  }
}
