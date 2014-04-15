var svgPanZoom = {
  /// CONFIGURATION
  /// ====>

  panEnabled: true, // true or false: enable or disable panning (default enabled)
  zoomEnabled: true, // true or false: enable or disable zooming (default enabled)
  controlIconsEnabled: true, // true or false: insert icons to give user an option in addition to mouse events to control pan/zoom (default enabled)
  dragEnabled: false, // true or false: enable or disable dragging (default disabled)
  zoomScaleSensitivity: 0.2, // Zoom sensitivity
  minZoom: 0.5, // Minimum Zoom
  maxZoom: 10, // Maximum Zoom

  /// <====
  /// END OF CONFIGURATION

  /**
   * Enable svgPanZoom
   */
  init: function(args) {
    args = args || {};
    var selector = args.selector;
    this.getSvg(selector, function(err, svg, svgPanZoomInstance) {
      svg.__svgPanZoom = {};
      svg.__svgPanZoom.state = 'none';
      var svgDimensions = svgPanZoomInstance.getSvgDimensions(svg);
      var svgWidth = svgDimensions.width;
      var svgHeight = svgDimensions.height;
      viewport = svgPanZoomInstance.getViewport(svg);
      var svgViewBox = svg.getAttribute('viewBox');
      if (svgViewBox) {
        var bBox = svg.getBBox();
        var boundingClientRect = svg.getBoundingClientRect();
        var viewBoxValues = svgViewBox.split(' ').map(function(viewBoxValue) {
          return parseFloat(viewBoxValue);
        });
        var viewBoxWidth = viewBoxValues[2];
        var viewBoxHeight = viewBoxValues[3];
        //svg.__viewportElement.setAttribute('viewBox', svgViewBox); // does this do anything? It didn't appear to, at least in Chrome.

        svg.removeAttribute('viewBox');
        var oldCTM, newCTM;
        oldCTM = newCTM = svg.__viewportElement.getCTM();
        var newScale = Math.min(svgWidth/viewBoxWidth, svgHeight/viewBoxHeight);
        //var newScale = Math.min(boundingClientRect.width/bBox.width, boundingClientRect.height/bBox.height);
        newCTM.a = newScale * oldCTM.a; //x-scale
        newCTM.d = newScale * oldCTM.d; //y-scale
        newCTM.e = oldCTM.e * newScale; //x-transform
        newCTM.f = oldCTM.f * newScale; //y-transform
        svgPanZoomInstance.setCTM(svg.__viewportElement, newCTM);
        svgPanZoomInstance.initialCTM = newCTM;
      }
      

      if (args.hasOwnProperty('panEnabled')) {
        svgPanZoomInstance.panEnabled = args.panEnabled;
      }
      if (args.hasOwnProperty('zoomEnabled')) {
        svgPanZoomInstance.zoomEnabled = args.zoomEnabled;
        if (svgPanZoomInstance.zoomEnabled && args.hasOwnProperty('controlIconsEnabled')) {
          svgPanZoomInstance.controlIconsEnabled = args.controlIconsEnabled;
        }
      }
      if (svgPanZoomInstance.zoomEnabled && svgPanZoomInstance.controlIconsEnabled) {
        args.svg = svg;
        args.svgWidth = svgWidth;
        args.svgHeight = svgHeight;
        args.viewport = viewport;
        args.svgPanZoomInstance = svgPanZoomInstance;
        svgPanZoomInstance.controlIcons.add(args);
      }

      if (args.hasOwnProperty('dragEnabled')) {
        svgPanZoomInstance.dragEnabled = args.dragEnabled;
      }
      if (args.hasOwnProperty('zoomScaleSensitivity')) {
        svgPanZoomInstance.zoomScaleSensitivity = args.zoomScaleSensitivity;
      }
      if (args.hasOwnProperty('onZoom')) {
        svgPanZoomInstance.onZoom = args.onZoom;
      }
      if (args.hasOwnProperty('minZoom')) {
        svgPanZoomInstance.minZoom = args.minZoom;
      }
      if (args.hasOwnProperty('maxZoom')) {
        svgPanZoomInstance.maxZoom = args.maxZoom;
      }
      svgPanZoomInstance.setupHandlers(svg);
      if (svg.ownerDocument.documentElement.tagName.toLowerCase() !== 'svg') {
        svg.ownerDocument.defaultView.svgPanZoom = svgPanZoom;
      }
    });
  },

  /**
   * Change settings
   */
  setZoomScaleSensitivity: function (newZoomScaleSensitivity) {
    this.zoomScaleSensitivity = newZoomScaleSensitivity;
  },

  enablePan: function () {
    this.panEnabled = true;
  },

  disablePan: function () {
    this.panEnabled = false;
  },

  enableZoom: function () {
    this.zoomEnabled = true;
  },

  disableZoom: function () {
    this.zoomEnabled = false;
  },

  enableDrag: function () {
    this.dragEnabled = true;
  },

  disableDrag: function () {
    this.dragEnabled = false;
  },

  /**
   * Register handlers
   */
  setupHandlers: function (svg){
    var svgPanZoomInstance = this;
    svg.addEventListener("mousedown", function(evt) {
      return svgPanZoomInstance.handleMouseDown(evt);
    }, false);
    svg.addEventListener("touchstart", function(evt) {
      return svgPanZoomInstance.handleMouseDown(evt);
    }, false);

    svg.addEventListener("mouseup", function(evt) {
      return svgPanZoomInstance.handleMouseUp(evt);
    }, false);
    svg.addEventListener("touchend", function(evt) {
      return svgPanZoomInstance.handleMouseUp(evt);
    }, false);

    svg.addEventListener("mousemove", function(evt) {
      return svgPanZoomInstance.handleMouseMove(evt);
    }, false);
    svg.addEventListener("touchmove", function(evt) {
      return svgPanZoomInstance.handleMouseMove(evt);
    }, false);

    svg.addEventListener("mouseleave", function(evt) {
      return svgPanZoomInstance.handleMouseUp(evt);
    }, false);
    svg.addEventListener("touchleave", function(evt) {
      return svgPanZoomInstance.handleMouseUp(evt);
    }, false);
    svg.addEventListener("touchcancel", function(evt) {
      return svgPanZoomInstance.handleMouseUp(evt);
    }, false);

    svg.setAttribute('xmlns', 'http://www.w3.org/1999/xlink');
    svg.setAttributeNS('xmlns', 'xlink', 'http://www.w3.org/1999/xlink');
    svg.setAttributeNS('xmlns', 'ev', 'http://www.w3.org/2001/xml-events');

    //Needed for Internet Explorer, otherwise the viewport overflows.
    if (svg.parentNode !== null) {
      var style = svg.getAttribute('style') || '';
      if (style.toLowerCase().indexOf('overflow') === -1) {
        svg.setAttribute('style', 'overflow: hidden; ' + style);
      }
    }

    window.addWheelListener(svg, function(evt) {
      return svgPanZoomInstance.handleMouseWheel(evt);
    });
  },

  /**
   * Retrieves the "g" element to be used as container for view manipulation.
   */
  getViewport: function (svg) {
    if (!svg.__viewportElement) {
      svg.__viewportElement = svg.getElementById('viewport');
      if (!svg.__viewportElement) { // If no g container with id 'viewport' exists, as last resort, use first g element.
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'viewport');

        var svgChildren = svg.childNodes || svg.children;
        do {
          g.appendChild(svgChildren[0]);
        } while (svgChildren.length > 0);
        svg.appendChild(g);
        svg.__viewportElement = g;

        if(typeof console !== "undefined") {
          console.warn('No g element with id "viewport" in SVG document. Adding one as container element for SVG pan/zoom manipulation.');
        }
      }
    }

    return svg.__viewportElement;
  },

  getSvgDimensions: function(svg) {
    var svgBoundingClientRect = svg.getBoundingClientRect();
    var boundingClientWidth = parseFloat(svgBoundingClientRect.width);
    var boundingClientHeight = parseFloat(svgBoundingClientRect.height);
    var styleWidth, styleHeight;

    if (!!parseFloat(svg.clip)) {
      styleWidth = svg.clip.width;
      styleHeight = svg.clip.height;
    }
    else if (!!parseFloat(svg.style.pixelWidth)) {
      styleWidth = svg.style.pixelWidth;
      styleHeight = svg.style.pixelWidth;
    }
    else if (!!parseFloat(svg.style.width)) {
      styleWidth = svg.style.width;
      styleHeight = svg.style.height;
    }
    else {
      styleWidth = svg.getAttribute('width');
      styleHeight = svg.getAttribute('height');
    }

    styleWidth = styleWidth || 0;
    styleHeight = styleHeight || 0;
    if (styleWidth.toString().indexOf('%') === -1) {
      styleWidth = parseFloat(styleWidth);
    }
    else {
      styleWidth = 0;
    }
    if (styleHeight.toString().indexOf('%') === -1) {
      styleHeight = parseFloat(styleHeight);
    }
    else {
      styleHeight = 0;
    }
    var result = {
      width: Math.max(boundingClientWidth, styleWidth),
      height: Math.max(boundingClientHeight, styleHeight)
    };
    return result;
  },

  /**
   * Time-based cache for svg.getScreenCTM().
   * Needed because getScreenCTM() is very slow on Firefox (FF 28 at time of writing).
   * The cache expires every 300ms... this is a pretty safe time because it's only called
   * when we're zooming, when the screenCTM is unlikely/impossible to change.
   */
  getScreenCTMCached: (function() {
    var svgs = {};
    return function(svg) {
      var cur = Date.now();
      if (svgs.hasOwnProperty(svg)) {
        var cached = svgs[svg];
        if (cur - cached.time > 300) {
          //Cache expired
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
  })(),

  /**
   * Get an SVGPoint of the mouse co-ordinates of the event, relative to the SVG element.
   */
  getRelativeMousePoint: function (svg, evt) {
    var point = svg.createSVGPoint();
    point.x = evt.clientX;
    point.y = evt.clientY;
    point = point.matrixTransform(this.getScreenCTMCached(svg).inverse());
    return point;
  },

  getSvgCenterPoint: function (svg) {
    var bBox = svg.getBBox();
    var boundingClientRect = svg.getBoundingClientRect();

    var width = boundingClientRect.width;
    var height = boundingClientRect.height;
    var point = svg.createSVGPoint();
    point.x = width/2;
    point.y = height/2;
    return point;
  },

  /**
   * Instance an SVGPoint object with given event coordinates.
   */

  getEventPoint: function (evt) {
    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;

    var p = svg.createSVGPoint();

    p.x = evt.clientX;
    p.y = evt.clientY;

    return p;
  },

  /**
   * Sets the current transform matrix of an element.
   */
  setCTM: function (element, matrix) {
    var s = 'matrix(' + matrix.a + ',' + matrix.b + ',' + matrix.c + ',' + matrix.d + ',' + matrix.e + ',' + matrix.f + ')';
    element.setAttribute('transform', s);
  },

  /**
   * Dumps a matrix to a string (useful for debug).
   */
  dumpMatrix: function (matrix) {
    var s = '[ ' + matrix.a + ', ' + matrix.c + ', ' + matrix.e + '\n  ' + matrix.b + ', ' + matrix.d + ', ' + matrix.f + '\n  0, 0, 1 ]';
    return s;
  },

  /**
   * Sets attributes of an element.
   */
  setAttributes: function (element, attributes){
    for (var i in attributes)
      element.setAttributeNS(null, i, attributes[i]);
  },

  findFirstSvg: function (callback) {
    var i, candidateSvg, foundSvg;
    candidateSvg = document.querySelector('svg');
    if (!!candidateSvg) {
      foundSvg = candidateSvg;
      callback(foundSvg);
    }

    var candidateObjectElements = document.querySelectorAll('object');
    i = 0;
    do {
      i += 1;
      this.getSvg('object:nth-of-type(' + i + ')', function(err, candidateSvg) { // linter says "Don't make functions within a loop." Can this be done better?
        if (!!candidateSvg) {
          foundSvg = candidateSvg;
          callback(foundSvg);
        }
      });
    } while (i < candidateObjectElements.length);

    var candidateEmbedElements = document.querySelectorAll('embed');
    i = 0;
    do {
      i += 1;
      this.getSvg('embed:nth-of-type(' + i + ')', function(err, candidateSvg) {
        if (!!candidateSvg) {
          foundSvg = candidateSvg;
          callback(foundSvg);
        }
      });
    } while (i < candidateEmbedElements.length);

    // TODO add a timeout
  },

  getSvg: function (selector, callback) {
    var target, err;
    if (!selector) {
      if(typeof console !== "undefined") {
        console.warn('No selector specified for getSvg(). Using first svg element found.');
      }
      target = this.findFirstSvg(function(svg) {
        if (!svg) {
          err = new Error('No SVG found in this document.');
        }
        if (!!callback) {
          callback(err, svg, this);
        }
        else {
          if (!svg) {
            throw err;
          }
          return svg;
        }
      });
    }
    else {
      target = document.querySelector(selector);
      if (!!target) {
        if (target.tagName.toLowerCase() === 'svg') {
          svg = target;
        }
        else {
          if (target.tagName.toLowerCase() === 'object') {
            svg = target.contentDocument.documentElement;
          }
          else {
            if (target.tagName.toLowerCase() === 'embed') {
              svg = target.getSVGDocument().documentElement;
            }
            else {
              if (target.tagName.toLowerCase() === 'img') {
                throw new Error('Cannot script an SVG in an "img" element. Please use an "object" element or an in-line SVG.');
              }
              else {
                throw new Error('Cannot get SVG.');
              }
            }
          }
        }
      }
      if (!svg) {
        err = new Error('No SVG found in this document.');
      }

      if (!!callback) {
        callback(err, svg, this);
      }
      else {
        if (!svg) {
          throw err;
        }
        return svg;
      }
    }
  },

  pan: function (selector, direction) {
    if (!direction) {
      throw new Error('No direction specified for direction of panning. Please enter a string value of up, right, down or left.');
    }
    var tx, ty;
    var panIncrement = 0.1;
    var directionToXYMapping = {
      'top':{
        'x': 0,
        'y': -1
      },
      't':{
        'x': 0,
        'y': -1
      },
      'up':{
        'x': 0,
        'y': -1
      },
      'u':{
        'x': 0,
        'y': -1
      },
      'right':{
        'x': 1,
        'y': 0
      },
      'r':{
        'x': 1,
        'y': 0
      },
      'bottom':{
        'x': 0,
        'y': 1
      },
      'b':{
        'x': 0,
        'y': 1
      },
      'down':{
        'x': 0,
        'y': 1
      },
      'd':{
        'x': 0,
        'y': 1
      },
      'left':{
        'x': -1,
        'y': 0
      },
      'l':{
        'x': -1,
        'y': 0
      }
    };

    var directionXY = directionToXYMapping[direction];

    if (!directionXY) {
      throw new Error('Direction specified was not understood. Please enter a string value of up, right, down or left.');
    }

    this.getSvg(selector, function(err, svg, svgPanZoomInstance) {
      var viewport = svgPanZoomInstance.getViewport(svg);
      tx = svg.getBBox().width * panIncrement * directionXY.x;
      ty = svg.getBBox().height * panIncrement * directionXY.y;
      var viewportCTM = viewport.getCTM();
      viewportCTM.e += tx;
      viewportCTM.f += ty;
      svgPanZoomInstance.setCTM(viewport, viewportCTM);
    });
  },

  zoom: function (args) {
    if (!args.scale) {
      throw new Error('No scale specified for zoom. Please enter a number.');
    }
    this.getSvg(args.selector, function(err, svg, svgPanZoomInstance) {
      var p = svgPanZoomInstance.getSvgCenterPoint(svg);
      svgPanZoomInstance.zoomAtPoint(svg, p, args.scale, true);
    });
  },

  zoomIn: function (selector) {
    this.getSvg(selector, function(err, svg, svgPanZoomInstance) {
      var p = svgPanZoomInstance.getSvgCenterPoint(svg);
      svgPanZoomInstance.zoomAtPoint(svg, p, 1 + svgPanZoomInstance.zoomScaleSensitivity);
    });
  },

  zoomOut: function (selector) {
    this.getSvg(selector, function(err, svg, svgPanZoomInstance) {
      var p = svgPanZoomInstance.getSvgCenterPoint(svg);
      svgPanZoomInstance.zoomAtPoint(svg, p, 1/(1 + svgPanZoomInstance.zoomScaleSensitivity));
    });
  },

  resetZoom: function (selector) {
    var oldCTM, newCTM;
    this.getSvg(selector, function(err, svg, svgPanZoomInstance) {
      var viewport = svgPanZoomInstance.getViewport(svg);
      svgPanZoomInstance.setCTM(viewport, svgPanZoomInstance.initialCTM);
      if (svgPanZoomInstance.onZoom) { svgPanZoomInstance.onZoom(svgPanZoomInstance.initialCTM.a); }
    });
  },

  /**
   * Handle mouse wheel event.
   */
  handleMouseWheel: function(evt) {
    if (!this.zoomEnabled) {
      return;
    }

    if(evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;

    var delta;

    if ('deltaMode' in evt && evt.deltaMode === 0) {
      //Make empirical adjustments for browsers that give deltaY in 
      //pixels (deltaMode=0).

      if (evt.wheelDelta) {
        //Normalizer for Chrome
        delta = evt.deltaY / Math.abs(evt.wheelDelta/3);
      } else {
        //Others. Possibly tablets? Use a value just in case
        delta = evt.deltaY / 120;
      }
    } else if ('mozPressure' in evt) {
      //Normalizer for newer Firefox
      //NOTE: May need to change detection at some point if mozPressure disappears.
      delta = evt.deltaY / 3;
    }
    else {
      //Others should be reasonably normalized by the mousewheel code at the end of the file.
      delta = evt.deltaY;
    }

    var p = this.getRelativeMousePoint(svg, evt);
    var zoom = Math.pow(1 + this.zoomScaleSensitivity, (-1) * delta); // multiplying by neg. 1 so as to make zoom in/out behavior match Google maps behavior
    this.zoomAtPoint(svg, p, zoom);
  },

  /**
   * Zoom in at an SVG point.
   * @param svg The SVG element
   * @param point The SVG point at which the zoom should happen (where 0,0 is top left corner)
   * @param zoomScale Number representing how much to zoom.
   * @param zoomAbsolute Default false. If true, zoomScale is treated as an absolute value.
   * Otherwise, zoomScale is treated as a multiplied (e.g. 1.10 would zoom in 10%)
   */
  zoomAtPoint: function(svg, point, zoomScale, zoomAbsolute) {
    var viewport = this.getViewport(svg);
    var viewportCTM = viewport.getCTM();
    point = point.matrixTransform(viewportCTM.inverse());

    var k = svg.createSVGMatrix().translate(point.x, point.y).scale(zoomScale).translate(-point.x, -point.y);
    var wasZoom = viewportCTM;
    var setZoom = viewportCTM.multiply(k);

    if (zoomAbsolute) {
      setZoom.a = setZoom.d = zoomScale;
    }

    if ( setZoom.a < this.minZoom * this.initialCTM.a ) { setZoom.a = setZoom.d = wasZoom.a; }
    if ( setZoom.a > this.maxZoom * this.initialCTM.a ) { setZoom.a = setZoom.d = wasZoom.a; }
    if ( setZoom.a !== wasZoom.a ) { this.setCTM(viewport, setZoom); }

    if (!this.stateTf) {
      this.stateTf = setZoom.inverse();
    }

    this.stateTf = this.stateTf.multiply(k.inverse());

    if (!!this.onZoom) { this.onZoom(setZoom.a); }
  },
  
  /**
   * Handle mouse move event.
   */
  handleMouseMove: function(evt) {
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;
    var g = this.getViewport(svg);
    var state = svg.__svgPanZoom.state;

    var p;
    if (state === 'pan' && this.panEnabled) {
      // Pan mode
      p = this.getEventPoint(evt).matrixTransform(this.stateTf);

      this.setCTM(g, this.stateTf.inverse().translate(p.x - this.stateOrigin.x, p.y - this.stateOrigin.y));
    } 
    else if (state === 'drag' && this.dragEnabled) {
      // Drag mode
      p = this.getEventPoint(evt).matrixTransform(g.getCTM().inverse());

      this.setCTM(this.stateTarget, svg.createSVGMatrix().translate(p.x - this.stateOrigin.x, p.y - this.stateOrigin.y).multiply(g.getCTM().inverse()).multiply(this.stateTarget.getCTM()));

      this.stateOrigin = p;
    }
  },

  /**
   * Handle double click event.
   * See handleMouseDown() for alternate detection method.
   */
  handleDblClick: function (evt) {
    var target = evt.target;
    
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (target.tagName === 'svg' || target.tagName === 'SVG') ? target : target.ownerSVGElement || target.correspondingElement.ownerSVGElement;
    if (this.controlIconsEnabled) {
      var targetClass = target.getAttribute('class') || '';
      if (targetClass.indexOf('svg-pan-zoom-control') > -1) {
        return false;
      }
    }

    var zoomFactor;
    if(evt.shiftKey){
      zoomFactor = 1/((1 + this.zoomScaleSensitivity) * 2); // zoom out when shift key pressed
    }
    else {
      zoomFactor = (1 + this.zoomScaleSensitivity) * 2;
    }

    var p = this.getRelativeMousePoint(svg, evt);
    this.zoomAtPoint(svg, p, zoomFactor );
  },

  /**
   * Handle click event.
   */
  handleMouseDown: function (evt) {
    // Double click detection; more consistent than ondblclick
    if (evt.detail === 2){
      this.handleDblClick(evt);
    }

    if (evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;
    var g = this.getViewport(svg);

    if (evt.target.tagName === 'svg' || !this.dragEnabled) // Pan anyway when drag is disabled and the user clicked on an element
    {
      // Pan mode
      svg.__svgPanZoom.state = 'pan';

      this.stateTf = g.getCTM().inverse();

      this.stateOrigin = this.getEventPoint(evt).matrixTransform(this.stateTf);
    }
    else {
      // Drag mode
      svg.__svgPanZoom.state = 'drag';

      this.stateTarget = evt.target;

      this.stateTf = g.getCTM().inverse();

      this.stateOrigin = this.getEventPoint(evt).matrixTransform(this.stateTf);
    }
  },

  /**
   * Handle mouse button release event.
   */
  handleMouseUp: function (evt) {
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;
    var state = svg.__svgPanZoom.state;

    if (state === 'pan' || state === 'drag') {
      // Quit pan mode
      svg.__svgPanZoom.state = 'none';
    }
  }
};

//Cross-browser wheel event, from: https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel
if (!window.hasOwnProperty('addWheelListener')) {
	// creates a global "addWheelListener" method
	// example: addWheelListener( elem, function( e ) { console.log( e.deltaY ); e.preventDefault(); } );
	(function(window,document) {

		var prefix = "", _addEventListener, onwheel, support;

		// detect event model
		if ( window.addEventListener ) {
			_addEventListener = "addEventListener";
		} else {
			_addEventListener = "attachEvent";
			prefix = "on";
		}

		// detect available wheel event
		support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
      document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
      "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

        window.addWheelListener = function( elem, callback, useCapture ) {
			_addWheelListener( elem, support, callback, useCapture );

			// handle MozMousePixelScroll in older Firefox
			if( support == "DOMMouseScroll" ) {
				_addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
			}
		};

		function _addWheelListener( elem, eventName, callback, useCapture ) {
			elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
				!originalEvent && ( originalEvent = window.event );

				// create a normalized event object
				var event = {
					// keep a ref to the original event object
					originalEvent: originalEvent,
					// NOTE: clientX and clientY are not in Mozilla example, but are needed for svg-pan-zoom
					clientX: originalEvent.clientX,
					clientY: originalEvent.clientY,
					target: originalEvent.target || originalEvent.srcElement,
					type: "wheel",
					deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
					deltaX: 0,
					deltaZ: 0,
					preventDefault: function() {
						originalEvent.preventDefault ?
							originalEvent.preventDefault() :
							originalEvent.returnValue = false;
					}
				};

				// calculate deltaY (and deltaX) according to the event
				if ( support == "mousewheel" ) {
					event.deltaY = - 1/40 * originalEvent.wheelDelta;
					// Webkit also support wheelDeltaX
					originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
				} else {
					event.deltaY = originalEvent.detail;
				}

				// it's time to fire the callback
				return callback(event);

			}, useCapture || false );
		}

	})(window,document);
}
