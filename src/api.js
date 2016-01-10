var Utils = require('./utilities')
  , SvgUtils = require('./svg-utilities')

/**
 * Api attribute
 * Set it like this so it will not be accessible from outside
 *
 * @type {String}
 */
var apiAttr = ('__api' + Math.random()).slice(0, 10)

/**
 * Api constructor
 *
 * @param {Object<SvgPanZoom>} svgPanZoomInstance SvgPanZoom object instace
 * @param {String} pluginName         Plugin name
 */
function PluginApi(svgPanZoomInstance, pluginName) {
  this._name = pluginName

  // Lock reference to API
  Object.defineProperty(this, apiAttr, {
    enumerable: false
  , configurable: false
  , writable: false
  , value: svgPanZoomInstance
  })
}

// Events handling
// ===============

PluginApi.prototype.on = function(name, fn, ctx) {
  if (typeof ctx === 'undefined') ctx = this // Automatically inject plugin context
  this[apiAttr].on(name, fn, ctx, this._name)
  return this
}

PluginApi.prototype.off = function(name, fn, ctx) {
  this[apiAttr].off(name, fn, ctx, this._name)
  return this
}

PluginApi.prototype.trigger = function(name, data, originalEvent) {
  return this[apiAttr].trigger(name, data, this._name, originalEvent)
}

// Panning
// =======

PluginApi.prototype.pan = function(point) {
  this[apiAttr].pan(point, this._name)
  return this
}

PluginApi.prototype.panBy = function(point) {
  this[apiAttr].panBy(point, this._name)
  return this
}

// Not namespaced
PluginApi.prototype.getPan = function() {
  return this[apiAttr].getPan()
}

// Zooming
// =======

PluginApi.prototype.zoom = function(scale) {
  this[apiAttr].pluginZoom(scale, true, this._name)
  return this
}

PluginApi.prototype.zoomBy = function(scale) {
  this[apiAttr].pluginZoom(scale, false, this._name)
  return this
}

PluginApi.prototype.zoomAtPoint = function(scale, point) {
  this[apiAttr].pluginZoomAtPoint(scale, point, true, this._name)
  return this
}

PluginApi.prototype.zoomAtPointBy = function(scale, point) {
  this[apiAttr].pluginZoomAtPoint(scale, point, false, this._name)
  return this
}

// Not namespaced
PluginApi.prototype.getZooms = function() {
  return this[apiAttr].viewport.getRelativeZooms()
}

// Resetting
// =========

PluginApi.prototype.resetZoom = function() {
  this[apiAttr].resetZoom(this._name)
  return this
}

PluginApi.prototype.resetPan = function() {
  this[apiAttr].resetPan(this._name)
  return this
}

PluginApi.prototype.reset = function() {
  this[apiAttr].reset()
  return this
}

// Sizes and utils
// ===============

// Not namespaced
PluginApi.prototype.updateBBox = function() {
  this[apiAttr].updateBBox()
  return this
}

// Not namespaced
PluginApi.prototype.resize = function() {
  this[apiAttr].resize()
  return this
}

// Not namespaced
PluginApi.prototype.getSizes = function() {
  return {
    width: this[apiAttr].width
  , height: this[apiAttr].height
  , realZooms: this[apiAttr].viewport.getZooms()
  , viewBox: this[apiAttr].viewport.getViewBox()
  }
}

// Not namespaced
PluginApi.prototype.getSvg = function() {
  return this[apiAttr].svg
}

// Not namespaced
PluginApi.prototype.getUtils = function() {
  return Utils
}

// Not namespaced
PluginApi.prototype.getSvgUtils = function() {
  return SvgUtils
}

// Plugins
// =======

// Not namespaced
PluginApi.prototype.addPlugin = function(name) {
  this[apiAttr].addPlugin(name)
  return this
}

// Not namespaced
PluginApi.prototype.removePlugin = function(name) {
  this[apiAttr].removePlugin(name)
  return this
}

// Destroy
// =======

// Not namespaced
PluginApi.prototype.destroy = function() {
  this[apiAttr].destroy()
  return this
}

// Export
// ======

module.exports = {
  createApi: function(svgPanZoomInstance, pluginName) {
    return new PluginApi(svgPanZoomInstance, pluginName)
  }
}
