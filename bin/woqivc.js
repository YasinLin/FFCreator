const { Command } = require('commander');

const { FFExecter } = require('../lib');
const colors = require('colors');
const fs = require('fs');


const program = new Command();

program.name('woqi-ffcreator').description('CLI to some JavaScript video tools').version('0.0.0');

program
  .command('sync')
  .description('视频合成')
  .argument('<path>', 'json路径')
  .option('--cacheDir', '缓存路径')
  .option('--outputDir', '输出路径')
  .action((str, options) => {
    const vs = new FFExecter({ ...options });
      const file = fs.readFileSync(options.path);
      vs.sync(JSON.parse(file));
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

program.parse();
