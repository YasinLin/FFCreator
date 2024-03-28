const { FFExector } = require('../lib');
const colors = require('colors');
const path = require("path");
const fs = require('fs');

const vs = new FFExector({
  render: 'gl',
  ffmpeg: '/Volumes/data/data/program/nodejs/woqivc/addon/ffmpeg',
  ffprobe: '/Volumes/data/data/program/nodejs/woqivc/addon/ffprobe',
});
const file = fs.readFileSync(path.resolve(__dirname, "./test.json"));
vs.sync(JSON.parse(file));
vs.on('start', () => {
  console.log(`FFExector start`);
});

vs.on('error', e => {
  console.error(colors.red(`FFExector error: ${e.error}`));
});

vs.on('progress', e => {
  console.log(colors.yellow(`FFExector progress: ${(e.percent * 100) >> 0}%`));
});

vs.on('complete', e => {
  console.log(
    colors.magenta(`FFExector completed: \n USEAGE: ${e.useage} \n PATH: ${e.output} `),
  );
});

