'use strict';

/**
 * FFPanel - A component set
 *
 * ####Example:
 *
 *     const panel = new FFPanel();
 *     extras.init = function(InkPaint){ ... }
 *     extras.update = function(InkPaint){ ... }
 *     extras.destroyed = function(InkPaint){ ... }
 *     scene.addChild(extras);
 *
 * @class
 */
const FFCon = require('./cons');
const forEach = require('lodash/forEach');

class FFPanel extends FFCon {
  constructor(conf = {}) {
    super({ type: 'panel', ...conf });
    const { x = 0, y = 0, scale = 1, rotate = 0, opacity = 1 } = this.conf;

    this.offsetX = 0;
    this.offsetY = 0;
    this.gl = null;

    this.setXY(x, y);
    this.setScale(scale);
    this.setRotate(rotate);
    this.setOpacity(opacity);
  }
  /**
   * Set display object x,y position
   * @param {number} x - x position
   * @param {number} y - y position
   * @public
   */
  setXY(x = 0, y = 0) {
    this.display.x = x + this.offsetX;
    this.display.y = y + this.offsetY;
  }

  /**
   * Set display object width and height
   * @param {number} width - object width
   * @param {number} height - object height
   * @public
   */
  setWH(width, height) {
    this.setSize(width, height);
  }

  /**
   * Set display object width and height
   * @param {number} width - object width
   * @param {number} height - object height
   * @public
   */
  setSize(width, height) {
    this.conf.width = width;
    this.conf.height = height;
  }

  // /**
  //  * Functions for setDisplaySize
  //  * @private
  //  */
  // setDisplaySize() {
  //   const { display } = this;
  //   const { width, height } = this.conf;
  //   if (width && height) {
  //     display.width = width;
  //     display.height = height;
  //     display.setScaleToInit();
  //   }
  // }

  /**
   * Set the duration of node in the scene
   * @param {number} duration
   * @public
   */
  setOffset(offsetX, offsetY) {
    const scale = this.display.scale.x;
    this.offsetX = offsetX * scale;
    this.offsetY = offsetY * scale;

    this.display.x += this.offsetX;
    this.display.y += this.offsetY;
  }

  /**
   * Set display object scale
   * @param {number} scale
   * @public
   */
  setScale(scale = 1) {
    this.display.scale.set(scale, scale);
    this.display.setScaleToInit();
  }

  /**
   * Set display object rotation
   * @param {number} rotation
   * @public
   */
  setRotate(rotation = 0) {
    // rotation = rotation * (3.1415927 / 180);
    this.display.rotation = rotation;
  }

  /**
   * set display object rotation by deg
   * @param deg
   */
  setRotateDeg(deg = 0) {
    deg = deg * (3.1415927 / 180);
    this.display.rotation = deg;
  }

  /**
   * Set display object opacity
   * @param {number} opacity
   * @public
   */
  setOpacity(opacity) {
    this.display.alpha = opacity;
  }

  /**
   * Material preprocessing
   * @return {Promise}
   * @public
   */
  preProcessing() {
    return new Promise(resolve => resolve());
  }

  /**
   * Start rendering
   * @public
   */
  start() {
    super.start();
    forEach(this.children, child => child.start());
  }
}

module.exports = FFPanel;
