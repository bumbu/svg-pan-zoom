svg-pan-zoom library
==========================

Simple pan/zoom solution for SVGs in HTML. It adds events listeners for mouse scroll, double-click and pan, plus it optionally offers:
* JavaScript API for control of pan and zoom behavior
* onPan and onZoom event handlers
* On-screen zoom controls

It works cross-browser and supports both inline SVGs and SVGs in HTML 'object' or 'embed' elements.

> If you're looking for version 2.3.x you can find it in [v2.3.x branch](https://github.com/ariutta/svg-pan-zoom/tree/v2.3.x)

Demos
-----
Pan and zoom the SVG tiger on github pages:
* [Single Inline SVG](http://ariutta.github.io/svg-pan-zoom/demo/inline.html)
* [Multiple Inline SVGs](http://ariutta.github.io/svg-pan-zoom/demo/multi-instance.html)
* [SVG Inserted with 'Embed' Element](http://ariutta.github.io/svg-pan-zoom/demo/embed.html)
* [SVG Inserted with 'Object' Element](http://ariutta.github.io/svg-pan-zoom/demo/object.html)
* [SVG Inserted with 'Img' Element](http://ariutta.github.io/svg-pan-zoom/demo/img.html) (These cannot be panned/zoomed.)
* [SVG With custom controls](http://ariutta.github.io/svg-pan-zoom/demo/custom-controls.html)
* [Resize SVG container on document resize](http://ariutta.github.io/svg-pan-zoom/demo/resize.html)
* [Two SVGs with sinchronized zooming and panning](http://ariutta.github.io/svg-pan-zoom/demo/sinchronized.html)
* [Custom events: Touch events support: pan, double tap, pinch](http://ariutta.github.io/svg-pan-zoom/demo/mobile.html)
* [Custom events: Enable zooming only on click, disable on mouse out](http://ariutta.github.io/svg-pan-zoom/demo/custom-event-handlers.html)
* [Limit pan](http://ariutta.github.io/svg-pan-zoom/demo/limit-pan.html)
* [Dynamic SVG load](http://ariutta.github.io/svg-pan-zoom/demo/dynamic-load.html)
* [Using Require.js](http://ariutta.github.io/svg-pan-zoom/demo/require.html)

Support
-------

If you found a bug or have a suggestion first check if there is a similar [open](https://github.com/ariutta/svg-pan-zoom/issues) or [closed](https://github.com/ariutta/svg-pan-zoom/issues?q=is%3Aissue+is%3Aclosed) issue. If there are none then create a new one.

If you solved a bug or implemented a feature that may be useful for others then you're welcome to create a pull request.

If you have any other type of questions, problems, your code is not working or you want to critique the library - you can use StackOverflow. Just tag you question with [`svgpanzoom`](http://stackoverflow.com/questions/tagged/svgpanzoom).

How To Use
----------

Reference the [svg-pan-zoom.js file](http://ariutta.github.io/svg-pan-zoom/dist/svg-pan-zoom.min.js) from your HTML document. Then call the init method:

```js
var panZoomTiger = svgPanZoom('#demo-tiger');
// or
var svgElement = document.querySelector('#demo-tiger')
var panZoomTiger = svgPanZoom(svgElement)
```

First argument to function should be a CSS selector of SVG element or a DOM Element.

If you want to override the defaults, you can optionally specify one or more arguments:

```js
svgPanZoom('#demo-tiger', {
  viewportSelector: '.svg-pan-zoom_viewport'
, panEnabled: true
, controlIconsEnabled: false
, zoomEnabled: true
, dblClickZoomEnabled: true
, zoomScaleSensitivity: 0.2
, minZoom: 0.5
, maxZoom: 10
, fit: true
, center: true
, refreshRate: 'auto'
, beforeZoom: function(){}
, onZoom: function(){}
, beforePan: function(){}
, onPan: function(){}
, customEventsHandler: {}
});
```

If any arguments are specified, they must have the following value types:
* 'viewportSelector' can be querySelector string or SVGElement.
* 'panEnabled' must be true or false. Default is true.
* 'controlIconsEnabled' must be true or false. Default is false.
* 'zoomEnabled' must be true or false. Default is true.
* 'dblClickZoomEnabled' must be true or false. Default is true.
* 'mouseWheelZoomEnabled' must be true or false. Default is true.
* 'zoomScaleSensitivity' must be a scalar. Default is 0.2.
* 'minZoom' must be a scalar. Default is 0.5.
* 'maxZoom' must be a scalar. Default is 10.
* 'fit' must be true or false. Default is true.
* 'center' must be true or false. Default is true.
* 'refreshRate' must be a number or 'auto'
* 'beforeZoom' must be a callback function to be called before zoom changes.
* 'onZoom' must be a callback function to be called when zoom changes.
* 'beforePan' must be a callback function to be called before pan changes.
* 'onPan' must be a callback function to be called when pan changes.
* 'customEventsHandler' must be a object with `init` and `destroy` arguments as functions.

`beforeZoom` will be called with 2 float attributes: oldZoom and newZoom.
If `beforeZoom` will return `false` then zooming will be halted.

`onZoom` callbacks will be called with one float attribute representing new zoom scale.

`beforePan` will be called with 2 attributes:
* `oldPan`
* `newPan`

Each of this objects has two attributes (x and y) representing current pan (on X and Y axes).

If `beforePan` will return `false` or an object `{x: true, y: true}` then panning will be halted.
If you want to prevent panning only on one axis then return a object of type `{x: true, y: false}`.
You can alter panning on X and Y axes by providing alternative values through return `{x: 10, y: 20}`.

> *Caution!* If you alter panning by returning custom values `{x: 10, y: 20}` it will update only current pan step. If panning is done by mouse/touch you have to take in account that next pan step (after the one that you altered) will be performed with values that do not consider altered values (as they even did not existed).

`onPan` callback will be called with one attribute: `newPan`.

> *Caution!* Calling zoom or pan API methods form inside of `beforeZoom`, `onZoom`, `beforePan` and `onPan` callbacks may lead to infinite loop.

`panEnabled` and `zoomEnabled` are related only to user interaction. If any of this options are disabled - you still can zoom and pan via API.

Using a custom viewport
-----------------------

You may want to use a custom viewport if you have more layers in your SVG but you want to _pan-zoom_ only one of them.

By default if:
  * There is just one top-level graphical element of type SVGGElement (`<g>`)
  * SVGGElement has no `transform` attribute
  * There is no other SVGGElement with class name `svg-pan-zoom_viewport`

then the top-level graphical element will be used as viewport.

To specify which layer (SVGGElement) should be _pan-zoomed_ set the `svg-pan-zoom_viewport` class name to that element:
`<g class="svg-pan-zoom_viewport"></g>`.

> Do not set any _transform_ attributes to that element. It will make the library misbehave.
> If you need _transform_ attribute for viewport better create a nested group element and set _transforms_ to that element:
```html
<g class="svg-pan-zoom_viewport">
  <g transform="matrix(1,0,0,1,0,0);"></g>
</g>
```

You can specify your own viewport selector by altering `viewportSelector` config value:
```js
svgPanZoom('#demo-tiger', {
  viewportSelector: '.svg-pan-zoom_viewport'
});
// or
var viewportGroupElement = document.getElemenById('demo-tiger').querySelector('.svg-pan-zoom_viewport');
svgPanZoom('#demo-tiger', {
  viewportSelector: viewportGroupElement
});
```

Use with browserify
-------------------

If you do use browserify in your project you may do it by:
* Add the package as node module `npm install --save ariutta/svg-pan-zoom`
* Require _svg-pan-zoom_ in your source file `svgPanZoom = require('svg-pan-zoom')`
* Use in the same way as you would do with global svgPanZoom: `instance = svgPanZoom('#demo-tiger')`

Use with Require.js (or other AMD libraries)
-------------------

An example of how to load library using Require.js is available in [demo/require.html](http://ariutta.github.io/svg-pan-zoom/demo/require.html)

Custom events support
---------------------

You may want to add custom events support (for example double tap or pinch).

It is possible by setting `customEventsHandler` configuration option.
`customEventsHandler` should be an object with following attributes:
* `haltEventListeners`: array of strings
* `init`: function
* `destroy`: function

`haltEventListeners` specifies which default event listeners should be disabled (in order to avoid conflicts as svg-pan-zoom supports by default panning using touch events).

`init` is a function that is called when svg-pan-zoom is initialized. A object is passed into this function.
Passed object has following attributes:
* `svgElement` - SVGSVGElement
* `instance` - svg-pan-zoom public API instance

`destroy` is a function called upon svg-pan-zoom destroy

An example of how to use it together with [Hammer.js](http://hammerjs.github.io):
```js
var options = {
  zoomEnabled: true
, controlIconsEnabled: true
, customEventsHandler: {
    // Halt all touch events
    haltEventListeners: ['touchstart', 'touchend', 'touchmove', 'touchleave', 'touchcancel']

    // Init custom events handler
  , init: function(options) {
      // Init Hammer
      this.hammer = Hammer(options.svgElement)

      // Handle double tap
      this.hammer.on('doubletap', function(ev){
        options.instance.zoomIn()
      })
    }

    // Destroy custom events handler
  , destroy: function(){
      this.hammer.destroy()
    }
  }
}

svgPanZoom('#mobile-svg', options);
```

You may find an example that adds support for Hammer.js pan, pinch and doubletap in demo/mobile.html

Keep content visible/Limit pan
------------------------------

You may want to keep SVG content visible by not allowing panning over SVG borders.

To do so you may prevent or alter panning from `beforePan` callback. For more details take a look at `demo/limit-pan.html` example.

Public API
----------

When you call `svgPanZoom` method it returns an object with following methods:
* enablePan
* disablePan
* isPanEnabled
* pan
* panBy
* getPan
* setBeforePan
* setOnPan
* enableZoom
* disableZoom
* isZoomEnabled
* enableControlIcons
* disableControlIcons
* isControlIconsEnabled
* enableDblClickZoom
* disableDblClickZoom
* isDblClickZoomEnabled
* enableMouseWheelZoom
* disableMouseWheelZoom
* isMouseWheelZoomEnabled
* setZoomScaleSensitivity
* setMinZoom
* setMaxZoom
* setBeforeZoom
* setOnZoom
* zoom
* zoomBy
* zoomAtPoint
* zoomAtPointBy
* zoomIn
* zoomOut
* getZoom
* resetZoom
* resetPan
* reset
* fit
* center
* updateBBox
* resize
* getSizes
* destroy

To programmatically pan, call the pan method with vector as first argument:

```js
// Get instance
var panZoomTiger = svgPanZoom('#demo-tiger');

// Pan to rendered point x = 50, y = 50
panZoomTiger.pan({x: 50, y: 50})

// Pan by x = 50, y = 50 of rendered pixels
panZoomTiger.panBy({x: 50, y: 50})
```

To programmatically zoom, you can use the zoom method to specify your desired scale value:

```js
// Get instance
var panZoomTiger = svgPanZoom('#demo-tiger');

// Set zoom level to 2
panZoomTiger.zoom(2)

// Zoom by 130%
panZoomTiger.zoomBy(1.3)

// Set zoom level to 2 at point
panZoomTiger.zoomAtPoint(2, {x: 50, y: 50})

// Zoom by 130% at given point
panZoomTiger.zoomAtPointBy(1.3, {x: 50, y: 50})
```

> Zoom is relative to initial SVG internal zoom level. If your SVG was fit at the begging (option fit: true) and thus zoomed in or out to fit available space - initial scale will be anyway 1.

Or you can use the zoomIn or zoomOut methods:

```js
// Get instance
var panZoomTiger = svgPanZoom('#demo-tiger');

panZoomTiger.zoomIn()
panZoomTiger.zoomOut()
panZoomTiger.resetZoom()
```

If you want faster or slower zooming, you can override the default zoom increment with the setZoomScaleSensitivity method.

To programmatically enable/disable pan or zoom:

```js
// Get instance
var panZoomTiger = svgPanZoom('#demo-tiger');

panZoomTiger.enablePan();
panZoomTiger.disablePan();

panZoomTiger.enableZoom();
panZoomTiger.disableZoom();
```

To fit and center:

```js
// Get instance
var panZoomTiger = svgPanZoom('#demo-tiger');

panZoomTiger.fit();
panZoomTiger.center();
```

If you want to fit and center your SVG after its container resize:

```js
// Get instance
var panZoomTiger = svgPanZoom('#demo-tiger');

panZoomTiger.resize(); // update SVG cached size and controls positions
panZoomTiger.fit();
panZoomTiger.center();
```

If you update SVG (viewport) contents so its border box (virtual box that contains all elements) changes you have to call `updateBBox`:

```js
var panZoomTiger = svgPanZoom('#demo-tiger');
panZoomTiger.fit();

// Update SVG rectangle width
document.getElementById('demo-tiger').querySelector('rect').setAttribute('width', 200)

// fit does not work right anymore as viewport bounding box changed
panZoomTiger.fit();

panZoomTiger.updateBBox(); // Update viewport bounding box
panZoomTiger.fit(); // fit works as expected
```

If you need more data about SVG you can call `getSizes`. It will return an object that will contain:
* `width` - SVG cached width
* `height` - SVG cached height
* `realZoom` - _a_ and _d_ attributes of transform matrix applied over viewport
* `viewBox` - an object containing cached sizes of viewport boxder box
  * `width`
  * `height`
  * `x` - x offset
  * `y` - y offset

Destroy SvgPanZoom instance:

```js
// Get instance
var panZoomTiger = svgPanZoom('#demo-tiger');

panZoomTiger.destroy();
delete panZoomTiger;
```

How to test
-----------

Before committing you should check your code style by running `gulp check`.

If you made a change then first build the library. Open `./tests/index.html` in your browser. All tests should pass.

If you have PhantomJS installed then you can run `gulp test`.

Supported Browsers
------------------
* Chrome
* Firefox
* Safari
* Opera
* Internet Explorer 9+ _(works badly if viewBox attribute is set)_

Related Work
------------
This library used the [SVGPan](https://code.google.com/p/svgpan/) library as a starting point. SVGPan is intended for use with the [SVG 'script' element](http://www.w3.org/TR/SVG/script.html), whereas svg-pan-zoom is intended for use with the [HTML 'script' element](http://www.w3.org/TR/html401/interact/scripts.html).

License
-------
The code from the SVGPan library is licensed under the following BSD license:

```
Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com>. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

  1. Redistributions of source code must retain the above copyright notice, this list of
     conditions and the following disclaimer.
  2. Redistributions in binary form must reproduce the above copyright notice, this list
     of conditions and the following disclaimer in the documentation and/or other materials
     provided with the distribution.

THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi "AS IS" AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

* The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of Andrea Leofreddi.
```

The code from the updates and changes to SVGPan are licensed under the same BSD license, with the copyright for the code from each change held by the author of that code.
