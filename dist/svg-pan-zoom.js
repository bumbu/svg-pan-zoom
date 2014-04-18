var svgPanZoom = {
  /// CONFIGURATION
  /// ====>

  panEnabled: true, // true or false: enable or disable panning (default enabled)
  zoomEnabled: true, // true or false: enable or disable zooming (default enabled)
  controlIconsEnabled: false, // true or false: insert icons to give user an option in addition to mouse events to control pan/zoom (default disabled)
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
    this.selector = selector;

    // if these arguments are specified, use them. Otherwise, use the defaults.
    this.panEnabled = args.panEnabled || this.panEnabled;
    this.controlIconsEnabled = args.controlIconsEnabled || this.controlIconsEnabled;
    this.zoomEnabled = args.zoomEnabled || this.zoomEnabled;
    this.dragEnabled = args.dragEnabled || this.dragEnabled;
    this.zoomScaleSensitivity = args.zoomScaleSensitivity || this.zoomScaleSensitivity;
    this.minZoom = args.minZoom || this.minZoom;
    this.maxZoom = args.maxZoom || this.maxZoom;

    this.getSvg(selector, function(err, svg, svgPanZoomInstance) {
      svg.__svgPanZoom = {};
      svg.__svgPanZoom.state = 'none';
      var svgDimensions = svgPanZoomInstance.getSvgDimensions(svg);
      var svgWidth = svgDimensions.width;
      var svgHeight = svgDimensions.height;
      viewport = svgPanZoomInstance.getViewport(svg);
      var svgViewBox = svg.getAttribute('viewBox');
      if (svgViewBox) {
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
        newCTM.a = newScale * oldCTM.a; //x-scale
        newCTM.d = newScale * oldCTM.d; //y-scale
        newCTM.e = oldCTM.e * newScale; //x-transform
        newCTM.f = oldCTM.f * newScale; //y-transform
        svgPanZoomInstance.setCTM(svg.__viewportElement, newCTM);
        svgPanZoomInstance.initialCTM = newCTM;
      }
      else {
        svgPanZoomInstance.initialCTM = viewport.getCTM();
      }
      svgPanZoomInstance.svg = svg;
      svgPanZoomInstance.svgWidth = svgWidth;
      svgPanZoomInstance.svgHeight = svgHeight;
      svgPanZoomInstance.viewport = viewport;
      
      if (svgPanZoomInstance.zoomEnabled && svgPanZoomInstance.controlIconsEnabled) {
        svgPanZoomInstance.enableZoom();
      }

      if (args.hasOwnProperty('onZoom')) {
        svgPanZoomInstance.onZoom = args.onZoom;
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
    if (this.controlIconsEnabled) {
      this.controlIcons.add(this, '[ zoom ]');
    }
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
    var svgWidth, svgHeight;
    var svgClientRects = svg.getClientRects();
    if (typeof svgClientRects !== 'undefined' && svgClientRects.length > 0) {
      var svgClientRect = svgClientRects[0];
      var svgWidth = parseFloat(svgClientRect.width);
      var svgHeight = parseFloat(svgClientRect.height);
    }
    else {
      var svgBoundingClientRect = svg.getBoundingClientRect();
      if (!!svgBoundingClientRect) {
        var svgWidth = parseFloat(svgBoundingClientRect.width);
        var svgHeight = parseFloat(svgBoundingClientRect.height);
      }
      else {
        throw new Error('Cannot determine SVG width and height.');
      }
    }
    var result = {};
    result.width = svgWidth;
    result.height = svgHeight;
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
    }
    else {
      var candidateObjectElements = document.querySelectorAll('object');
      if (candidateObjectElements.length > 0) {
        i = 0;
        do {
          i += 1;
          this.getSvg('object:nth-of-type(' + i + ')', function(err, candidateSvg) { // linter says "Don't make functions within a loop." Can this be done better?
            if (!!candidateSvg) {
              foundSvg = candidateSvg;
            }
          });
        } while (i < candidateObjectElements.length && !foundSvg);
      }
      else {
        var candidateEmbedElements = document.querySelectorAll('embed');
        i = 0;
        do {
          i += 1;
          this.getSvg('embed:nth-of-type(' + i + ')', function(err, candidateSvg) {
            if (!!candidateSvg) {
              foundSvg = candidateSvg;
            }
          });
        } while (i < candidateEmbedElements.length && !foundSvg);
      }
    }
    callback(foundSvg);

    // TODO add a timeout
  },

  getSvg: function (selector, callback) {
    var target, err;
    var svgPanZoomInstance = this;
    if (!selector) {
      if(typeof console !== "undefined") {
        console.warn('No selector specified for getSvg(). Using first svg element found.');
      }
      target = this.findFirstSvg(function(svg) {
        if (!svg) {
          err = new Error('No SVG found in this document.');
        }
        if (!!callback) {
          callback(err, svg, svgPanZoomInstance);
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
        callback(err, svg, svgPanZoomInstance);
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

svgPanZoom.controlIcons = {
  add: function(svgPanZoomInstance, controls) {
    var svgWidth = svgPanZoomInstance.svgWidth,
      svgHeight = svgPanZoomInstance.svgHeight,
      svg = svgPanZoomInstance.svg,
      viewport = svgPanZoomInstance.viewport,
      selector = svgPanZoomInstance.selector;

      if (!controls) {
        throw new Error('Add least one control must be specified.');
      }
      else {
        if (!controls[0]) {
          throw new Error('Add least one control must be specified.');
        }
      }

      var defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.appendChild(defs);
      }

      var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.setAttribute('type', "text/css");
      style.textContent = '.svg-pan-zoom-control { cursor: pointer; fill: black; fill-opacity: 0.333; } .svg-pan-zoom-control:hover { fill-opacity: 0.8; } .svg-pan-zoom-control-background { fill: white; fill-opacity: 0.5; } .svg-pan-zoom-control-background { fill-opacity: 0.8; }';
      defs.appendChild(style);

      if (controls.indexOf('zoom') > -1) {
        var zoomControlsSelection = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        zoomControlsSelection.setAttribute('id', 'svg-pan-zoom-controls');
        zoomControlsSelection.setAttribute('transform', 'translate(' + ( svgWidth - 70 ) + ' ' + ( svgHeight - 76 ) + ') scale(0.75)');
        zoomControlsSelection.setAttribute('class', 'svg-pan-zoom-control');

        // zoom in
        var zoomInControl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        zoomInControl.setAttribute('id', 'svg-pan-zoom-zoom-in');
        zoomInControl.setAttribute('transform', 'translate(30.5 5) scale(0.015)');
        zoomInControl.setAttribute('class', 'svg-pan-zoom-control');
        zoomInControl.addEventListener("click", function(evt) {
          svgPanZoomInstance.zoomIn(selector);
        }, false);
        zoomControlsSelection.appendChild(zoomInControl);

        var zoomInControlBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); // TODO change these background space fillers to rounded rectangles so they look prettier
        zoomInControlBackground.setAttribute('x', '0');
        zoomInControlBackground.setAttribute('y', '0');
        zoomInControlBackground.setAttribute('width', '1500'); // larger than expected because the whole group is transformed to scale down
        zoomInControlBackground.setAttribute('height', '1400');
        zoomInControlBackground.setAttribute('class', 'svg-pan-zoom-control-background');
        zoomInControl.appendChild(zoomInControlBackground);

        var zoomInControlShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        zoomInControlShape.setAttribute('d', 'M1280 576v128q0 26 -19 45t-45 19h-320v320q0 26 -19 45t-45 19h-128q-26 0 -45 -19t-19 -45v-320h-320q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h320v-320q0 -26 19 -45t45 -19h128q26 0 45 19t19 45v320h320q26 0 45 19t19 45zM1536 1120v-960 q0 -119 -84.5 -203.5t-203.5 -84.5h-960q-119 0 -203.5 84.5t-84.5 203.5v960q0 119 84.5 203.5t203.5 84.5h960q119 0 203.5 -84.5t84.5 -203.5z');
        zoomInControlShape.setAttribute('class', 'svg-pan-zoom-control-element');
        zoomInControl.appendChild(zoomInControlShape);


        // reset
        var resetPanZoomControl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        resetPanZoomControl.setAttribute('id', 'svg-pan-zoom-reset-pan-zoom');
        resetPanZoomControl.setAttribute('transform', 'translate(5 35) scale(0.4)');
        resetPanZoomControl.setAttribute('class', 'svg-pan-zoom-control');
        resetPanZoomControl.addEventListener("click", function(evt) {
          svgPanZoomInstance.resetZoom(selector);
        }, false);
        zoomControlsSelection.appendChild(resetPanZoomControl);

        var resetPanZoomControlBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); // TODO change these background space fillers to rounded rectangles so they look prettier
        resetPanZoomControlBackground.setAttribute('x', '2');
        resetPanZoomControlBackground.setAttribute('y', '2');
        resetPanZoomControlBackground.setAttribute('width', '182'); // larger than expected because the whole group is transformed to scale down
        resetPanZoomControlBackground.setAttribute('height', '58');
        resetPanZoomControlBackground.setAttribute('class', 'svg-pan-zoom-control-background');
        resetPanZoomControl.appendChild(resetPanZoomControlBackground);

        var resetPanZoomControlShape1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        resetPanZoomControlShape1.setAttribute('d', 'M33.051,20.632c-0.742-0.406-1.854-0.609-3.338-0.609h-7.969v9.281h7.769c1.543,0,2.701-0.188,3.473-0.562c1.365-0.656,2.048-1.953,2.048-3.891C35.032,22.757,34.372,21.351,33.051,20.632z');
        resetPanZoomControlShape1.setAttribute('class', 'svg-pan-zoom-control-element');
        resetPanZoomControl.appendChild(resetPanZoomControlShape1);

        var resetPanZoomControlShape2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        resetPanZoomControlShape2.setAttribute('d', 'M170.231,0.5H15.847C7.102,0.5,0.5,5.708,0.5,11.84v38.861C0.5,56.833,7.102,61.5,15.847,61.5h154.384c8.745,0,15.269-4.667,15.269-10.798V11.84C185.5,5.708,178.976,0.5,170.231,0.5z M42.837,48.569h-7.969c-0.219-0.766-0.375-1.383-0.469-1.852c-0.188-0.969-0.289-1.961-0.305-2.977l-0.047-3.211c-0.03-2.203-0.41-3.672-1.142-4.406c-0.732-0.734-2.103-1.102-4.113-1.102h-7.05v13.547h-7.055V14.022h16.524c2.361,0.047,4.178,0.344,5.45,0.891c1.272,0.547,2.351,1.352,3.234,2.414c0.731,0.875,1.31,1.844,1.737,2.906s0.64,2.273,0.64,3.633c0,1.641-0.414,3.254-1.242,4.84s-2.195,2.707-4.102,3.363c1.594,0.641,2.723,1.551,3.387,2.73s0.996,2.98,0.996,5.402v2.32c0,1.578,0.063,2.648,0.19,3.211c0.19,0.891,0.635,1.547,1.333,1.969V48.569z M75.579,48.569h-26.18V14.022h25.336v6.117H56.454v7.336h16.781v6H56.454v8.883h19.125V48.569z M104.497,46.331c-2.44,2.086-5.887,3.129-10.34,3.129c-4.548,0-8.125-1.027-10.731-3.082s-3.909-4.879-3.909-8.473h6.891c0.224,1.578,0.662,2.758,1.316,3.539c1.196,1.422,3.246,2.133,6.15,2.133c1.739,0,3.151-0.188,4.236-0.562c2.058-0.719,3.087-2.055,3.087-4.008c0-1.141-0.504-2.023-1.512-2.648c-1.008-0.609-2.607-1.148-4.796-1.617l-3.74-0.82c-3.676-0.812-6.201-1.695-7.576-2.648c-2.328-1.594-3.492-4.086-3.492-7.477c0-3.094,1.139-5.664,3.417-7.711s5.623-3.07,10.036-3.07c3.685,0,6.829,0.965,9.431,2.895c2.602,1.93,3.966,4.73,4.093,8.402h-6.938c-0.128-2.078-1.057-3.555-2.787-4.43c-1.154-0.578-2.587-0.867-4.301-0.867c-1.907,0-3.428,0.375-4.565,1.125c-1.138,0.75-1.706,1.797-1.706,3.141c0,1.234,0.561,2.156,1.682,2.766c0.721,0.406,2.25,0.883,4.589,1.43l6.063,1.43c2.657,0.625,4.648,1.461,5.975,2.508c2.059,1.625,3.089,3.977,3.089,7.055C108.157,41.624,106.937,44.245,104.497,46.331z M139.61,48.569h-26.18V14.022h25.336v6.117h-18.281v7.336h16.781v6h-16.781v8.883h19.125V48.569z M170.337,20.14h-10.336v28.43h-7.266V20.14h-10.383v-6.117h27.984V20.14z');
        resetPanZoomControlShape2.setAttribute('class', 'svg-pan-zoom-control-element');
        resetPanZoomControl.appendChild(resetPanZoomControlShape2);

        // zoom out
        var zoomOutControl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        zoomOutControl.setAttribute('id', 'svg-pan-zoom-zoom-out');
        zoomOutControl.setAttribute('transform', 'translate(30.5 70) scale(0.015)');
        zoomOutControl.setAttribute('class', 'svg-pan-zoom-control');
        zoomOutControl.addEventListener("click", function(evt) {
          svgPanZoomInstance.zoomOut(selector);
        }, false);
        zoomControlsSelection.appendChild(zoomOutControl);

        var zoomOutControlBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); // TODO change these background space fillers to rounded rectangles so they look prettier
        zoomOutControlBackground.setAttribute('x', '0');
        zoomOutControlBackground.setAttribute('y', '0');
        zoomOutControlBackground.setAttribute('width', '1500'); // larger than expected because the whole group is transformed to scale down
        zoomOutControlBackground.setAttribute('height', '1400');
        zoomOutControlBackground.setAttribute('class', 'svg-pan-zoom-control-background');
        zoomOutControl.appendChild(zoomOutControlBackground);

        var zoomOutControlShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        zoomOutControlShape.setAttribute('d', 'M1280 576v128q0 26 -19 45t-45 19h-896q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h896q26 0 45 19t19 45zM1536 1120v-960q0 -119 -84.5 -203.5t-203.5 -84.5h-960q-119 0 -203.5 84.5t-84.5 203.5v960q0 119 84.5 203.5t203.5 84.5h960q119 0 203.5 -84.5 t84.5 -203.5z');
        zoomOutControlShape.setAttribute('class', 'svg-pan-zoom-control-element');
        zoomOutControl.appendChild(zoomOutControlShape);

        svg.appendChild(zoomControlsSelection);
      }

      /*
      //TODO get large screen view working
      var fullscreen = d3.select('#full-screen-control')
      .on("click", function(d,i){
        var pvjs = document.getElementById("pathvisiojs-dev").innerHTML;
        var newwin = window.open('','','width=800,height=600');
        var doc = newwin.document;
        doc.open();
        doc.write(pvjs);
        doc.close();	
      });
      //*/
  }

};
