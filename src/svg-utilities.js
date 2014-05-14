module.exports = {
  /**
   * Get svg dimensions: width and height
   *
   * @param  {object} svg
   * @return {object}     {width: 0, height: 0}
   */
  getSvgDimensions: function(svg) {
    var width = 0
      , height = 0
      , svgClientRects = svg.getClientRects()

    // thanks to http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
    var isFirefox = typeof InstallTrigger !== 'undefined';

    // Firefox has no nice way of detecting SVG size, so we'll check for
    // width/height attributes, specified in pixels,
    // and if they don't exist, we'll use the parent dimensions.
    if (isFirefox) {
      var svgComputedStyle = window.getComputedStyle(svg, null);
      width = parseFloat(svgComputedStyle.width) - (parseFloat(svgComputedStyle.borderLeftWidth) + parseFloat(svgComputedStyle.paddingLeft) + parseFloat(svgComputedStyle.borderRightWidth) + parseFloat(svgComputedStyle.paddingRight));
      height = parseFloat(svgComputedStyle.height) - (parseFloat(svgComputedStyle.borderTopWidth) + parseFloat(svgComputedStyle.paddingTop) + parseFloat(svgComputedStyle.borderBottomWidth) + parseFloat(svgComputedStyle.paddingBottom));
      if (!width || !height) {
        var parentStyle = window.getComputedStyle(svg.parentElement, null);
        var parentDimensions = svg.parentElement.getBoundingClientRect();
        width = parentDimensions.width - (parseFloat(parentStyle.borderLeftWidth) + parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.borderRightWidth) + parseFloat(parentStyle.paddingRight));
        height = parentDimensions.height - (parseFloat(parentStyle.borderTopWidth) + parseFloat(parentStyle.paddingTop) + parseFloat(parentStyle.borderBottomWidth) + parseFloat(parentStyle.paddingBottom));
      }
    } else {
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
, getOrCreateViewport: function(svg) {
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

, setupSvgAttributes: function(svg) {
    // Setting default attributes
    svg.setAttribute('xmlns', 'http://www.w3.org/1999/xlink');
    svg.setAttributeNS('xmlns', 'xlink', 'http://www.w3.org/1999/xlink');
    svg.setAttributeNS('xmlns', 'ev', 'http://www.w3.org/2001/xml-events');

    // Needed for Internet Explorer, otherwise the viewport overflows
    if (svg.parentNode !== null) {
      var style = svg.getAttribute('style') || '';
      if (style.toLowerCase().indexOf('overflow') === -1) {
        svg.setAttribute('style', 'overflow: hidden; ' + style);
      }
    }
  }

  /**
   * Sets the current transform matrix of an element
   * @param {object} element SVG Element
   * @param {object} matrix  CTM
   */
, setCTM: function(element, matrix) {
    var s = 'matrix(' + matrix.a + ',' + matrix.b + ',' + matrix.c + ',' + matrix.d + ',' + matrix.e + ',' + matrix.f + ')';
    element.setAttribute('transform', s);
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
, getScreenCTMCached: (function() {
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
, getRelativeMousePoint: function(svg, evt) {
    var point = svg.createSVGPoint()

    point.x = evt.clientX
    point.y = evt.clientY

    return point.matrixTransform(this.getScreenCTMCached(svg).inverse())
  }

  /**
   * Instantiate an SVGPoint object with given event coordinates
   *
   * @param {object} evt Event
   */
, getEventPoint: function(evt) {
    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement
      , point = svg.createSVGPoint()

    point.x = evt.clientX
    point.y = evt.clientY

    return point
  }

  /**
   * Get SVG center point
   *
   * @param  {object} svg SVG Element
   * @return {object}     SVG Point
   */
, getSvgCenterPoint: function(svg) {
    var boundingClientRect = svg.getBoundingClientRect()
      , width = boundingClientRect.width
      , height = boundingClientRect.height
      , point = svg.createSVGPoint()

    point.x = width / 2
    point.y = height / 2

    return point
  }
}
