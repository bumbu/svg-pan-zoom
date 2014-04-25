var Mousewheel = require('./mousewheel')  // Keep it here so that mousewheel is initialised
  , ControlIcons = require('./control-icons')

;(function(window, document){
  'use strict';

  var SvgPanZoom = function(svg, options) {
    this.init(svg, options)
  }

  var optionsDefaults = {
    panEnabled: true // enable or disable panning (default enabled)
  , zoomEnabled: true // enable or disable zooming (default enabled)
  , controlIconsEnabled: false // insert icons to give user an option in addition to mouse events to control pan/zoom (default disabled)
  , dragEnabled: false // enable or disable dragging (default disabled)
  , zoomScaleSensitivity: 0.2 // Zoom sensitivity
  , minZoom: 0.5 // Minimum Zoom level
  , maxZoom: 10 // Maximum Zoom level
  , onZoom: function(){}
  }

  SvgPanZoom.prototype.init = function(svg, options) {
    this.svg = svg

    // Set options
    this.options = extend(extend({}, optionsDefaults), options)

    // Set default state
    this.state = 'none'

    // Get dimensions
    var dimensions = getSvgDimensions(svg)
    this.width = dimensions.width
    this.height = dimensions.height

    // Get viewport
    this.viewport = getOrCreateViewport(svg)

    // Sets initialCTM
    this.processCTM()

    /*
    if (svgPanZoomInstance.zoomEnabled && svgPanZoomInstance.controlIconsEnabled) {
      svgPanZoomInstance.enableZoom();
    }
    */

    this.setupSvgAttributes()
    this.setupHandlers()

    // TODO what for do we need this?
    // It is replacing window.svgPanZoom constructor with this instance
    //
    // if (this.svg.ownerDocument.documentElement.tagName.toLowerCase() !== 'svg') {
    //   this.svg.ownerDocument.defaultView.svgPanZoom = this
    // }
  }

  /**
   * Extends an object
   *
   * @param  {object} target object to extend
   * @param  {object} source object to take properties from
   * @return {object}        extended object
   */
  function extend (target, source) {
    target = target || {};
    for (var prop in source) {
      if (typeof source[prop] === 'object') {
        target[prop] = extend(target[prop], source[prop])
      } else {
        target[prop] = source[prop]
      }
    }
    return target;
  }

  /**
   * Get svg dimensions: width and height
   *
   * @param  {object} svg
   * @return {object}     {width: 0, height: 0}
   */
  function getSvgDimensions(svg) {
    var width = 0
      , height = 0
      , svgClientRects = svg.getClientRects()

    if (typeof svgClientRects !== 'undefined' && svgClientRects.length > 0) {
      var svgClientRect = svgClientRects[0];

      width = parseFloat(svgClientRect.width);
      height = parseFloat(svgClientRect.height);
    } else {
      var svgBoundingClientRect = svg.getBoundingClientRect();

      if (!!svgBoundingClientRect) {
        width = parseFloat(svgBoundingClientRect.width);
        height = parseFloat(svgBoundingClientRect.height);
      } else {
        throw new Error('Cannot determine SVG width and height.');
      }
    }

    return {
      width: width
    , height: height
    }
  }

  /**
   * Gets g.viewport element or creates it if it doesn't exist
   * @param  {object} svg
   * @return {object}     g element
   */
  function getOrCreateViewport(svg) {
    var viewport = svg.querySelector('g.viewport')

    // If no g container with id 'viewport' exists, create one
    if (!viewport) {
      var viewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      viewport.setAttribute('class', 'viewport');

      var svgChildren = svg.childNodes || svg.children;
      do {
        viewport.appendChild(svgChildren[0]);
      } while (svgChildren.length > 0);
      svg.appendChild(viewport);
    }

    return viewport
  }

  /**
   * Get CTM and save it into initialCTM attribute
   * Parse viewBox and if any update initialCTM based on this values
   */
  SvgPanZoom.prototype.processCTM = function() {
    var svgViewBox = this.svg.getAttribute('viewBox')

    if (svgViewBox) {
      var boundingClientRect = this.svg.getBoundingClientRect()
        , viewBoxValues = svgViewBox.split(' ').map(parseFloat)
        , viewBoxWidth = viewBoxValues[2]
        , viewBoxHeight = viewBoxValues[3]

      this.svg.removeAttribute('viewBox');

      var newCTM = this.viewport.getCTM()
        , newScale = Math.min(this.width/viewBoxWidth, this.height/viewBoxHeight);

      newCTM.a = newCTM.a * newScale; //x-scale
      newCTM.d = newCTM.d * newScale; //y-scale
      newCTM.e = newCTM.e * newScale; //x-transform
      newCTM.f = newCTM.f * newScale; //y-transform
      this.initialCTM = newCTM;

      // Update viewport CTM
      setCTM(this.viewport, this.initialCTM);
    }
    else {
      this.initialCTM = this.viewport.getCTM();
    }
  }

  /**
   * Sets the current transform matrix of an element
   * @param {object} element SVG Element
   * @param {object} matrix  CTM
   */
  function setCTM(element, matrix) {
    var s = 'matrix(' + matrix.a + ',' + matrix.b + ',' + matrix.c + ',' + matrix.d + ',' + matrix.e + ',' + matrix.f + ')';
    element.setAttribute('transform', s);
  }

  SvgPanZoom.prototype.setupSvgAttributes = function() {
    // Setting default attributes
    this.svg.setAttribute('xmlns', 'http://www.w3.org/1999/xlink');
    this.svg.setAttributeNS('xmlns', 'xlink', 'http://www.w3.org/1999/xlink');
    this.svg.setAttributeNS('xmlns', 'ev', 'http://www.w3.org/2001/xml-events');

    //Needed for Internet Explorer, otherwise the viewport overflows.
    if (this.svg.parentNode !== null) {
      var style = this.svg.getAttribute('style') || '';
      if (style.toLowerCase().indexOf('overflow') === -1) {
        this.svg.setAttribute('style', 'overflow: hidden; ' + style);
      }
    }
  }

  /**
   * Register event handlers
   */
  SvgPanZoom.prototype.setupHandlers = function() {
    var that = this

    // Mouse down group
    this.svg.addEventListener("mousedown", function(evt) {
      return that.handleMouseDown(evt);
    }, false);
    this.svg.addEventListener("touchstart", function(evt) {
      return that.handleMouseDown(evt);
    }, false);

    // Mouse up group
    this.svg.addEventListener("mouseup", function(evt) {
      return that.handleMouseUp(evt);
    }, false);
    this.svg.addEventListener("touchend", function(evt) {
      return that.handleMouseUp(evt);
    }, false);

    // Mouse move group
    this.svg.addEventListener("mousemove", function(evt) {
      return that.handleMouseMove(evt);
    }, false);
    this.svg.addEventListener("touchmove", function(evt) {
      return that.handleMouseMove(evt);
    }, false);

    // Mouse leave group
    this.svg.addEventListener("mouseleave", function(evt) {
      return that.handleMouseUp(evt);
    }, false);
    this.svg.addEventListener("touchleave", function(evt) {
      return that.handleMouseUp(evt);
    }, false);
    this.svg.addEventListener("touchcancel", function(evt) {
      return that.handleMouseUp(evt);
    }, false);

    // Mouse wheel listener
    window.addWheelListener(this.svg, function(evt) {
      return that.handleMouseWheel(evt);
    })
  }

  /**
   * Handle mouse wheel event
   *
   * @param  {object} evt Event object
   */
  SvgPanZoom.prototype.handleMouseWheel = function(evt) {
    if (!this.options.zoomEnabled) {
      return;
    }

    if (evt.preventDefault) {
      evt.preventDefault();
    } else {
      evt.returnValue = false;
    }

    var delta = 0

    if ('deltaMode' in evt && evt.deltaMode === 0) {
      // Make empirical adjustments for browsers that give deltaY in pixels (deltaMode=0)

      if (evt.wheelDelta) {
        // Normalizer for Chrome
        delta = evt.deltaY / Math.abs(evt.wheelDelta/3)
      } else {
        // Others. Possibly tablets? Use a value just in case
        delta = evt.deltaY / 120
      }
    } else if ('mozPressure' in evt) {
      // Normalizer for newer Firefox
      // NOTE: May need to change detection at some point if mozPressure disappears.
      delta = evt.deltaY / 3;
    } else {
      // Others should be reasonably normalized by the mousewheel code at the end of the file.
      delta = evt.deltaY;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement
      , relativeMousePoint = getRelativeMousePoint(svg, evt)
      , zoom = Math.pow(1 + this.options.zoomScaleSensitivity, (-1) * delta); // multiplying by neg. 1 so as to make zoom in/out behavior match Google maps behavior

    this.zoomAtPoint(svg, relativeMousePoint, zoom)
  }

  /**
   * Time-based cache for svg.getScreenCTM().
   * Needed because getScreenCTM() is very slow on Firefox (FF 28 at time of writing).
   * The cache expires every 300ms... this is a pretty safe time because it's only called
   * when we're zooming, when the screenCTM is unlikely/impossible to change.
   *
   * @param {object} svg SVG Element
   * @return {[type]} [description]
   */
  var getScreenCTMCached = (function() {
    var svgs = {};
    return function(svg) {
      var cur = Date.now();
      if (svgs.hasOwnProperty(svg)) {
        var cached = svgs[svg];
        if (cur - cached.time > 300) {
          // Cache expired
          cached.time = cur;
          cached.ctm = svg.getScreenCTM();
        }
        return cached.ctm;
      } else {
        var ctm = svg.getScreenCTM();
        svgs[svg] = {time: cur, ctm: ctm};
        return ctm;
      }
    };
  })()

  /**
   * Get an SVGPoint of the mouse co-ordinates of the event, relative to the SVG element
   *
   * @param  {object} svg SVG Element
   * @param  {object} evt Event
   * @return {object}     point
   */
  function getRelativeMousePoint(svg, evt) {
    var point = svg.createSVGPoint()

    point.x = evt.clientX
    point.y = evt.clientY

    return point.matrixTransform(getScreenCTMCached(svg).inverse())
  }

  /**
   * Instantiate an SVGPoint object with given event coordinates
   *
   * @param {object} evt Event
   */
  function getEventPoint(evt) {
    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement
      , point = svg.createSVGPoint()

    point.x = evt.clientX
    point.y = evt.clientY

    return point
  }

  /**
   * Zoom in at an SVG point
   *
   * @param  {object} svg          SVG Element
   * @param  {object} point        SVG Point
   * @param  {float} zoomScale    Number representing how much to zoom
   * @param  {bool} zoomAbsolute [description]
   * @return {[type]}              Default false. If true, zoomScale is treated as an absolute value.
   *                               Otherwise, zoomScale is treated as a multiplied (e.g. 1.10 would zoom in 10%)
   */
  SvgPanZoom.prototype.zoomAtPoint = function(svg, point, zoomScale, zoomAbsolute) {
    var viewportCTM = this.viewport.getCTM()

    point = point.matrixTransform(viewportCTM.inverse())

    var k = svg.createSVGMatrix().translate(point.x, point.y).scale(zoomScale).translate(-point.x, -point.y)
      , wasZoom = viewportCTM
      , setZoom = viewportCTM.multiply(k)

    if (zoomAbsolute) {
      setZoom.a = setZoom.d = zoomScale
    }

    if (setZoom.a < this.options.minZoom * this.initialCTM.a) {setZoom.a = setZoom.d = wasZoom.a}
    if (setZoom.a > this.options.maxZoom * this.initialCTM.a) {setZoom.a = setZoom.d = wasZoom.a}
    if (setZoom.a !== wasZoom.a) {setCTM(this.viewport, setZoom)}

    if (!this.stateTf) {
      this.stateTf = setZoom.inverse()
    }

    this.stateTf = this.stateTf.multiply(k.inverse())

    if (this.options.onZoom) {
      this.options.onZoom(setZoom.a)
    }
  }

  /**
   * Handle mouse move event
   *
   * @param  {object} evt Event
   */
  SvgPanZoom.prototype.handleMouseMove = function(evt) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement

    var point;
    if (this.state === 'pan' && this.options.panEnabled) {
      // Pan mode
      point = getEventPoint(evt).matrixTransform(this.stateTf)

      setCTM(this.viewport, this.stateTf.inverse().translate(point.x - this.stateOrigin.x, point.y - this.stateOrigin.y))
    } else if (this.state === 'drag' && this.options.dragEnabled) {
      // Drag mode
      point = getEventPoint(evt).matrixTransform(this.viewport.getCTM().inverse())

      setCTM(this.stateTarget, svg.createSVGMatrix().translate(point.x - this.stateOrigin.x, point.y - this.stateOrigin.y).multiply(this.viewport.getCTM().inverse()).multiply(this.stateTarget.getCTM()))

      this.stateOrigin = point;
    }
  }

  /**
   * Handle double click event
   * See handleMouseDown() for alternate detection method
   *
   * @param {object} evt Event
   */
  SvgPanZoom.prototype.handleDblClick = function (evt) {
    var target = evt.target
      , svg = (target.tagName === 'svg' || target.tagName === 'SVG') ? target : target.ownerSVGElement || target.correspondingElement.ownerSVGElement

    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    // Check if target was a control button
    if (this.options.controlIconsEnabled) {
      var targetClass = target.getAttribute('class') || ''
      if (targetClass.indexOf('svg-pan-zoom-control') > -1) {
        return false
      }
    }

    var zoomFactor

    if (evt.shiftKey) {
      zoomFactor = 1/((1 + this.options.zoomScaleSensitivity) * 2) // zoom out when shift key pressed
    }
    else {
      zoomFactor = (1 + this.zoomScaleSensitivity) * 2
    }

    var point = getRelativeMousePoint(svg, evt)
    this.zoomAtPoint(svg, point, zoomFactor)
  }

  /**
   * Handle click event
   *
   * @param {object} evt Event
   */
  SvgPanZoom.prototype.handleMouseDown = function (evt) {
    // Double click detection; more consistent than ondblclick
    if (evt.detail === 2){
      this.handleDblClick(evt)
    }

    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement

    if (evt.target.tagName === 'svg' || !this.options.dragEnabled) { // Pan anyway when drag is disabled and the user clicked on an element
      // Pan mode
      this.state = 'pan'
      this.stateTf = this.viewport.getCTM().inverse()
      this.stateOrigin = getEventPoint(evt).matrixTransform(this.stateTf)
    } else {
      // Drag mode
      this.state = 'drag'
      this.stateTarget = evt.target
      this.stateTf = this.viewport.getCTM().inverse()
      this.stateOrigin = getEventPoint(evt).matrixTransform(this.stateTf)
    }
  }

  /**
   * Handle mouse button release event
   *
   * @param {object} evt Event
   */
  SvgPanZoom.prototype.handleMouseUp = function (evt) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement

    if (this.state === 'pan' || this.state === 'drag') {
      // Quit pan mode
      this.state = 'none'
    }
  }


  /**
   * Get SVG center point
   *
   * @param  {object} svg SVG Element
   * @return {object}     SVG Point
   */
  function getSvgCenterPoint(svg) {
    var boundingClientRect = svg.getBoundingClientRect()
      , width = boundingClientRect.width
      , height = boundingClientRect.height
      , point = svg.createSVGPoint()

    point.x = width / 2
    point.y = height / 2

    return point
  }

  ///////////////////////////////////////////
  // Functions used for plugin entry point //
  ///////////////////////////////////////////

  /**
   * Checks if an object is a DOM element
   *
   * @param  {object}  o HTML element or String
   * @return {Boolean}   returns true if object is a DOM element
   */
  function isElement(o){
    return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
      o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
    );
  }

  /**
   * Search for an SVG element
   *
   * @param  {object|string} elementOrSelector DOM Element or selector String
   * @return {object|null}                   SVG or null
   */
  function getSvg(elementOrSelector) {
    var element
      , svg;

    if (!isElement(elementOrSelector)) {
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
  function proxy(fn, context) {
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
  function getType(o) {
    return Object.prototype.toString.apply(o).replace(/^\[object\s/, '').replace(/\]$/, '')
  }

  SvgPanZoom.prototype.getPublicInstance = function() {
    var that = this

    // Create cache
    if (!this.publicInstance) {
      this.publicInstance = {
        // Pan
        enablePan: function() {that.options.panEnabled = true}
      , disablePan: function() {that.options.panEnabled = false}
      , isPanEnabled: function() {return !!that.options.panEnabled}
        // Drag
      , enableDrag: function() {that.options.dragEnabled = true}
      , disableDrag: function() {that.options.dragEnabled = false}
      , isDragEnabled: function() {return !!that.options.dragEnabled}
        // Zoom and Control Icons
      , enableZoom: function() {that.options.zoomEnabled = true} // TODO enable control icons
      , disableZoom: function() {that.options.zoomEnabled = false} // TODO
      , isZoomEnabled: function() {return !!that.options.zoomEnabled}
      , enableControlIcons: function() {that.options.controlIconsEnabled = true} // TODO
      , disableControlIcons: function() {that.options.controlIconsEnabled = false} // TODO
      , isControlIconsEnabled: function() {return !!that.options.controlIconsEnabled}
        // Zoom scale and bounds
      , setZoomScaleSensitivity: function(scale) {that.options.zoomScaleSensitivity = scale}
      , setMinZoom: function(zoom) {that.options.minZoom = zoom}
      , setMaxZoom: function(zoom) {that.options.maxZoom = zoom}
        // Zoom event
      , setOnZoom: function(fn) {that.options.onZoom = proxy(fn, that.publicInstance)}
        // Zooming
      , zoom: function(scale, absolute) {
          that.zoomAtPoint(that.svg, getSvgCenterPoint(that.svg), scale, absolute)
        }
      , zoomAtPoint: function(scale, point, absolute) {
          // If not a SVGPoint but has x and y than create new point
          if (getType(point) !== 'SVGPoint' && 'x' in point && 'y' in point) {
            var _point = that.svg.createSVGPoint()
            _point.x = point.x
            _point.y = point.y
            point = _point
          } else {
            throw new Error('Given point is invalid')
            return
          }

          that.zoomAtPoint(that.svg, point, scale, absolute)
        }
      , zoomIn: function() {
          this.zoom(1 + that.options.zoomScaleSensitivity)
        }
      , zoomOut: function() {
          this.zoom(1 / (1 + that.options.zoomScaleSensitivity))
        }
      , resetZoom: function() {
          setCTM(that.viewport, that.initialCTM)
          // Trigger onZoom
          that.options.onZoom(that.initialCTM.a)
        }
      }
    }

    return this.publicInstance
  }

  /**
   * Stores pairs of instances of SvgPanZoom and SVG
   * Each pair is represented by an object {svg: SVG, instance: SvgPanZoom}
   *
   * @type {Array}
   */
  var instancesStore = []

  window.svgPanZoom = function(elementOrSelector, options){
    var svg = getSvg(elementOrSelector)

    if (svg === null) {
      return null
    } else {
      // Look for existent instance
      for(var i = instancesStore.length - 1; i >= 0; i--) {
        if (instancesStore[i].svg === svg) {
          return instancesStore[i].instance.getPublicInstance()
        }
      }

      // If instance not found - create one
      instancesStore.push({
        svg: svg
      , instance: new SvgPanZoom(svg, options)
      })

      return instancesStore[instancesStore.length - 1].instance.getPublicInstance()
    }
  }
})(window, document)
