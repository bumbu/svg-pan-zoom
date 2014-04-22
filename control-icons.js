window.svgPanZoom.controlIcons = {
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
