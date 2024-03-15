const { FFExector } = require('../');
const path = require('path');
const colors = require('colors');
const outputDir = path.join(__dirname, './output/');
const cacheDir = path.join(__dirname, './cache/');

const vs = new FFExector({ outputDir, cacheDir });
// module.exports = (json) => vs(json);
const startAndListen = require('./listen');
const json = require('./assets/test.json');
module.exports = () => startAndListen(() => {
  vs.sync(json);
  vs.on('start', () => {
    console.log(`FFExecter start`);
  });

  vs.on('error', e => {
    console.log(colors.red(`FFExecter error: ${e.error}`));
  });

  vs.on('progress', e => {
    console.log(colors.yellow(`FFExecter progress: ${(e.percent * 100) >> 0}%`));
  });

  vs.on('complete', e => {
    console.log(
      colors.magenta(`FFExecter completed: \n USEAGE: ${e.useage} \n PATH: ${e.output} `),
    );

    console.log(colors.green(`\n --- You can press the s key or the w key to restart! --- \n`));
  });
});
