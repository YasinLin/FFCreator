'use strict';

/**
 * FFVideoAlbum - A Videos Album component that supports multiple switching animation effects
 *
 * ####Example:
 *
 *     const album = new FFVideoAlbum({
 *        list: [v01, v01, v01, v01],
 *        x: 100,
 *        y: 100,
 *        width: 500,
 *        height: 300
 *    });
 *
 *
 * @class
 */
const FS = require('../utils/fs');
const FFCreator = require('../creator');
const { FFVideo } = require('../');

class FFSlide extends FFVideo {
  constructor(conf = {}) {
    super({ type: 'slide', ...conf });

    this.creator = new FFCreator(conf);
    this.creator_destroy = this.creator.destroy;
    this.creator.destroy = ()=>{}
  }

  /**
   * Get the path to get the Image
   * @return {string} img path
   * @public
   */
  getPath() {
    return this.conf.path;
  }

  async gen_video() {
    this.creator.inCenter = true;
    this.creator.generateOutput();
    this.creator.start();
    return new Promise((resolve, reject) => {
      this.creator.on('start', () => {
        // console.log(`FFCreator start`);
      });
      this.creator.on('error', reject);
      this.creator.on('progress', () => {
        // this.emitProgress({ percent:e.percent });
        // console.log(colors.yellow(`FFCreator progress: ${(e.percent * 100) >> 0}%`));
      });
      this.creator.on('complete', e => {
        // console.log(
        //   colors.magenta(`FFCreator completed: \n USEAGE: ${e.useage} \n PATH: ${e.output} `),
        // );
        // console.log(colors.green(`\n --- You can press the s key or the w key to restart! --- \n`));
        this.conf.path = e.output;
        resolve(e.output);
      });
    });
  }

  /**
   * Material preprocessing
   * @return {Promise}
   * @public
   */
  async preProcessing() {
    const dir = this.rootConf('detailedCacheDir');
    FS.ensureDir(dir);

    await this.gen_video();
    await super.preProcessing();
  }

  destroy() {
    super.destroy();
    this.creator.destroy = this.creator_destroy;
    this.creator.destroy();
    this.creator = null;
    this.creator_destroy = null;
  }
}

module.exports = FFSlide;