;(function(){
  // States
  var IDLE = 0
    , PANNING = 1

  function PluginPointerEvents(api) {
    this.api = api
    this.lastPoint = {
      clientX: 0
    , clientY: 0
    }
    this.state = IDLE

    this.initHooks();
  }

  PluginPointerEvents.prototype.initHooks = function() {
    var svg = this.api.getSvg()

    this.start = this.api.getUtils().bind(this._start, this)
    this.move = this.api.getUtils().bind(this._move, this)
    this.end = this.api.getUtils().bind(this._end, this)

    // TODO allow setting an element to be listened for events

    for (var event in this.events) {
      svg.addEventListener(event, this[this.events[event]], false)
    }
  }

  PluginPointerEvents.prototype.events = {
    'mousedown': 'start'
  , 'touchstart': 'start'
  , 'mousemove': 'move'
  , 'touchmove': 'move'
  , 'mouseup': 'end'
  , 'touchend': 'end'
  , 'mouseleave': 'end'
  , 'touchleave': 'end'
  , 'touchcancel': 'end'
  }

  PluginPointerEvents.prototype._start = function(ev) {
    this.api.getUtils().mouseAndTouchNormalize(ev, this.api.getSvg())

    // Cache
    this.lastPoint.clientX = ev.clientX
    this.lastPoint.clientY = ev.clientY

    console.log(ev, this.lastPoint)

    if (this.api.trigger('pointer:start', this.lastPoint, ev)) {
      this.state = PANNING
    }
  }

  PluginPointerEvents.prototype._move = function(ev) {
    this.api.getUtils().mouseAndTouchNormalize(ev, this.api.getSvg())

    var point = {
      clientX: ev.clientX
    , clientY: ev.clientY
    }

    if (this.api.trigger('pointer:move', point, ev)) {
      if (this.state === PANNING) {
        this.api.panBy({
          x: point.clientX - this.lastPoint.clientX
        , y: point.clientY - this.lastPoint.clientY
        })
      }

      // Update cache
      this.lastPoint.clientX = point.clientX
      this.lastPoint.clientY = point.clientY
    }
  }

  PluginPointerEvents.prototype._end = function(ev) {
    var point = {
      clientX: ev.clientX
    , clientY: ev.clientY
    }

    if (this.api.trigger('pointer:end', point, ev)) {
      this.state = IDLE

      // Update cache
      this.lastPoint.clientX = point.clientX
      this.lastPoint.clientY = point.clientY
    }
  }

  // Plugin entry point
  // ==================

  function pluginPointerEvents(api) {
    return new PluginPointerEvents(api)
  }

  svgPanZoom.register('browser-events', pluginPointerEvents)
})();
