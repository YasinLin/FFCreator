'use strict';

/**
 * TimelineUpdate - Simple timeline management tool
 *
 * ####Example:
 *
 *     TimelineUpdate.addFrameCallback(this.drawing);
 *
 * @class
 */
const forEach = require('lodash/forEach');
const TWEEN = require('@tweenjs/tween.js');

TWEEN.now = () => new Date().getTime();

const TimelineUpdate = {
  updates:{},

  cur_update(id){
    if (!(id in this.updates)) {
      this.updates[id] = { delta: 0, time: 0, cbs: [] };
    }
    return this.updates[id];
  },

  /**
   * TimelineUpdate update function
   * @param {number} fps - Frame rate
   * @public
   */
  update(id, fps = 60) {
    const delta = (1000 / fps) >> 0;
    const cur = this.cur_update(id);
    if (!cur.time) {
      cur.time = TWEEN.now();
      TWEEN.now = () => cur.time;
    } else {
      cur.time += delta;
    }

    TWEEN.update(cur.time);
    forEach(cur.cbs, cb => cb(cur.time, delta));
    cur.delta = delta;
  },

  /**
   * Add callback hook
   * @param {function} callback - callback function
   * @public
   */
  addFrameCallback(id, callback) {
    const cur = this.cur_update(id);
    if (!callback) return;
    cur.cbs.push(callback);
  },

  /**
   * Remove callback hook
   * @param {function} callback - callback function
   * @public
   */
  removeFrameCallback(id, callback) {
    const cur = this.cur_update(id);
    if (!callback) return;

    const index = cur.cbs.indexOf(callback);
    if (index > -1) cur.cbs.splice(index, 1);
  },
};

module.exports = TimelineUpdate;
