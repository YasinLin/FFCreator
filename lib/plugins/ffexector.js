const path = require('path');
// const colors = require('colors');
const axios = require('axios');
const FS = require('../utils/fs');

const fsExtra = require('fs-extra');
const Utils = require('../utils/utils');
const Perf = require('../utils/perf');
const DateUtil = require('../utils/date');
const FFEventer = require('../event/eventer');
const _ = require('lodash');
const fs = require('fs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
// const fabric = require('fabric').fabric;
const FFScene = require('../node/scene');
const FFImage = require('../node/image');
const FFCreator = require('../creator');
const FFSubtitle = require('../node/subtitle');
const FFText = require('../node/text');
const FFVideo = require('../node/video');
const FFmpegUtil = require('../utils/ffmpeg');

const transitions = [
  'Magnifier',
  'Colorful',
  'WaterWave',
  'Stretch',
  'BackOff',
  'HangAround',
  'Windows4',
  'Fat',
  'MoveLeft',
  'Oblique',
  'Shake',
  'Slice',
  'Tetrapod',
  'ZoomRight',
  'FastSwitch',
  'Fluidly',
  'Lens',
  'Radiation',
  'TricolorCircle',
  'WindowShades',
  'Bounce',
  'BowTieHorizontal',
  'BowTieVertical',
  'ButterflyWaveScrawler',
  'CircleCrop',
  'ColourDistance',
  'CrazyParametricFun',
  'CrossZoom',
  'Directional',
  'DoomScreenTransition',
  'Dreamy',
  'DreamyZoom',
  'FilmBurn',
  'GlitchDisplace',
  'GlitchMemories',
  'GridFlip',
  'InvertedPageCurl',
  'LinearBlur',
  'Mosaic',
  'PolkaDotsCurtain',
  'Radial',
  'SimpleZoom',
  'StereoViewer',
  'Swirl',
  'ZoomInCircles',
  'angular',
  'burn',
  'cannabisleaf',
  'circle',
  'circleopen',
  'colorphase',
  'crosshatch',
  'crosswarp',
  'cube',
  'directionalwarp',
  'directionalwipe',
  'displacement',
  'doorway',
  'fade',
  'fadecolor',
  'fadegrayscale',
  'flyeye',
  'heart',
  'hexagonalize',
  'kaleidoscope',
  'luma',
  'luminance_melt',
  'morph',
  'multiply_blend',
  'perlin',
  'pinwheel',
  'pixelize',
  'polar_function',
  'randomsquares',
  'ripple',
  'rotate_scale_fade',
  'squareswire',
  'squeeze',
  'swap',
  'undulatingBurnOut',
  'wind',
  'windowblinds',
  'windowslice',
  'wipeDown',
  'wipeLeft',
  'wipeRight',
  'wipeUp',
  'Sunflower',
];

/**
 * 字幕时间格式化
 * @param {*} totalSeconds
 * @returns
 */
function formatTime(totalMilliseconds) {
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = parseInt(totalMilliseconds % 1000);

  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)},${padZero(milliseconds, 3)}`;
}

/**
 * 补零
 * @param {*} num
 * @param {*} size
 * @returns
 */
function padZero(num, size = 2) {
  const s = '000' + num;
  return s.substr(s.length - size);
}

/**
 *
 * @returns 获取图片宽高
 */
async function getImageDimensions(p) {
  const image = await loadImage(p);

  const width = image.width;
  const height = image.height;
  return Promise.resolve({ width, height });
}

/**
 * base64转png
 * @param {*} url
 * @param {*} cache_dir
 * @returns
 */
async function get_image_by_base64(url, cache_dir) {
  const base64Data = url.replace('data:image/png;base64,', '');
  const dataurl = new Buffer.from(base64Data, 'base64');
  const out_path = path.resolve(cache_dir, `${Utils.genUuid()}.png`);
  fs.writeFileSync(out_path, dataurl);
  return Promise.resolve(out_path);
}
/**
 * 文件预处理
 * @param {*} url
 * @param {*} cache_dir 临时文件路径
 * @param {*} dataurl base64
 * @returns
 */
const preload_file = async (url, cache_dir, dataurl) => {
  if (dataurl) {
    return get_image_by_base64(dataurl, cache_dir);
  }
  // return Promise.resolve(url);
  if (url.indexOf('http') != 0) {
    return Promise.resolve(url);
  }
  const file_name = path.basename(url).split('?')[0];
  if (file_name.indexOf('%') != -1) {
    console.log(file_name);
  }
  const name = path.parse(file_name).name;
  const ext = path.extname(file_name);
  const dir = cache_dir;
  const file_path = path.resolve(dir, `${file_name}`);
  if (ext == '.webp') {
    const out_path = path.resolve(dir, `${name}.png`);
    if (fs.existsSync(out_path)) {
      return Promise.resolve(out_path);
    }
    return new Promise((resolve, reject) => {
      loadImage(url, { crossOrigin: 'anonymous' })
        .then(img => {
          // console.log('bbb', url);
          // 创建与图片尺寸相匹配的画布
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          canvas
            .encode('png')
            .then(pngData => {
              fs.writeFileSync(out_path, pngData);
              return resolve(out_path);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  } else {
    if (url.endsWith('.ttf') || url.endsWith('otf')) {
      return download_file(url, file_path);
    }
    return Promise.resolve(url);
  }
};

/**
 * 下载文件
 * @param {*} url
 * @param {*} file_path
 * @returns
 */
const download_file = async (url, file_path) => {
  if (fs.existsSync(file_path)) {
    return Promise.resolve(file_path);
  }
  const response = await axios({
    url: url,
    method: 'GET',
    responseType: 'stream', // 设置响应数据类型为流
  });
  const writer = fs.createWriteStream(file_path); // 创建可写流
  response.data.pipe(writer); // 将响应数据流写入文件
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(file_path));
    writer.on('error', reject);
  });
};

/**
 * 根据纵横比是否保持获取对象宽高
 * @param {*} width
 * @param {*} height
 * @param {*} wlv
 * @param {*} hlv
 * @param {*} cover
 * @returns
 */
function keep_wh_fun(width, height, wlv, hlv, cover) {
  let keep_width = width;
  let keep_height = height;
  if ((wlv <= hlv && !cover) || (wlv > hlv && cover)) {
    keep_height = wlv * height;
    keep_width = wlv * width;
  } else {
    keep_height = hlv * height;
    keep_width = hlv * width;
  }
  return { width: keep_width, height: keep_height };
}
/**
 * 通用解析坐标
 * @param {*} width
 * @param {*} height
 * @param {*} object
 * @returns
 */
const parse_x_y = (width, height, object) => {
  const left = object.left,
    top = object.top,
    w = object.width,
    h = object.height,
    is_center = object.originX == 'center' && object.originY == 'center';
  var x = 0,
    y = 0;
  if (is_center) {
    x = left * width;
    y = top * height;
  } else {
    x = (left + w / 2) * width;
    y = (top + h / 2) * height;
  }
  return [x, y];
};

class FFExector extends FFEventer {
  constructor(conf = {}) {
    super();
    this.conf = { ...conf };
    const {
      outputDir = './output',
      cacheDir = './cache',
      cloud = false,
      render = 'canvas',
      ffmpeg_path,
      ffprobe_path,
    } = this.conf;
    this.outputDir = outputDir;
    this.cacheDir = cacheDir;
    this.render = render;
    // this.tempid = 'sync_by_temp';
    // this.create_temp(this.tempid);
    if (ffmpeg_path) {
      this.setFFmpegPath(ffmpeg_path);
    }
    if (ffprobe_path) {
      this.setFFprobePath(ffprobe_path);
    }
    this.cloud = cloud;
    this.video = '';
    this.step = 0;
    this.cur_step = 0;
  }

  /**
   * 解析fabric层 - dataurl
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_fabric_dataurl(creator, m_width, m_height, scene, layer, time) {
    const cache_dir = creator.rootConf('detailedCacheDir');
    const width = m_width;
    const height = m_height;
    const object = layer.object;
    const dataurl = layer.dataurl;
    var x_y = parse_x_y(width, height, object);
    // 图片
    const w = object.width * width;
    const h = object.height * height;
    const imgpath = await preload_file(null, cache_dir, dataurl);
    const fimg = new FFImage({
      path: imgpath,
      x: x_y[0],
      y: x_y[1],
      width: w,
      height: h,
      resetXY: false,
    });
    // fimg.setScale(object.scaleX);
    return Promise.resolve({ obj: fimg, duration: 0 });
  }

  /**
   * 解析fabric层 - 图片
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_fabric_image(creator, m_width, m_height, scene, layer, time) {
    const cache_dir = creator.rootConf('detailedCacheDir');
    const width = m_width;
    const height = m_height;
    const object = layer.object;
    var x_y = parse_x_y(width, height, object);
    // 图片
    const w = object.width * width;
    const h = object.height * height;
    const imgpath = await preload_file(object.src, cache_dir);
    const fimg = new FFImage({
      path: imgpath,
      x: x_y[0],
      y: x_y[1],
      width: w,
      height: h,
      resetXY: false,
    });
    // TODO 需要细化的所有属性
    fimg.setScale(object.scaleX);
    return Promise.resolve({ obj: fimg, duration: 0 });
  }

  /**
   * 解析fabric层 - 文字
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_fabric_text(creator, m_width, m_height, scene, layer, time) {
    const cache_dir = creator.rootConf('detailedCacheDir');
    const width = m_width;
    const height = m_height;
    const object = layer.object;
    object.originX = 'center';
    object.originY = 'center';
    var x_y = parse_x_y(width, height, object);
    const x = x_y[0];
    const y = x_y[1];
    /// 文字
    const text = new FFText({ text: object.text, x, y });
    text.setColor(object.fill); // 文字颜色
    if (object.backgroundColor) {
      text.setBackgroundColor(object.backgroundColor); // 背景色
    }
    // TODO 需要细化文字的所有属性
    text.setScale(object.scaleX);

    if (object.angle) {
      text.setRotateDeg(object.angle);
    }

    // 其他样式处理
    let style = object;
    if (object.shadow) {
      const shadow = object.shadow;
      style = {
        ...style,
        dropShadow: true,
        dropShadowColor: shadow.color,
        dropShadowBlur: shadow.blur,
      };
    }
    const align = object.textAlign;
    const lineJoin = object.strokeLineJoin;
    const miterLimit = object.strokeMiterLimit;
    style = { ...style, align, lineJoin, miterLimit };
    text.setStyle(style); // 设置样式object

    // 字体处理
    let fontPath = layer.fontPath;
    if (fontPath && fontPath.length > 0) {
      try {
        const font_path = await preload_file(fontPath, cache_dir);
        text.setFont(font_path);
      } catch (err) {}
    }
    return Promise.resolve({ obj: text, duration: 0 });
  }

  /**
   * 解析fabric层
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_fabric(creator, m_width, m_height, scene, layer, time) {
    const object = layer.object;
    if (layer.dataurl) {
      return this.parse_fabric_dataurl(creator, m_width, m_height, scene, layer, time);
    } else if (object.type == 'image') {
      return this.parse_fabric_image(creator, m_width, m_height, scene, layer, time);
    } else if (object.type == 'textbox') {
      return this.parse_fabric_text(creator, m_width, m_height, scene, layer, time);
    }
    return Promise.reject('未支持该类型');
  }

  /**
   * 解析video层
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_video(creator, m_width, m_height, scene, layer, time) {
    const cache_dir = creator.rootConf('detailedCacheDir');
    let { cutFrom, cutTo, width, height, silent = false } = layer;
    const w = m_width * width;
    const h = m_height * height;
    var x_y = parse_x_y(m_width, m_height, layer);
    let file = layer.path;
    file = await preload_file(file, cache_dir, layer.dataurl);
    const ss = DateUtil.secondsToHms(cutFrom);
    const to = DateUtil.secondsToHms(cutTo);

    const fvideo = new FFVideo({
      path: file,
      width: w,
      height: h,
      x: x_y[0],
      y: x_y[1],
      audio: silent,
      ss,
      to,
      resetXY: false,
    });
    // this.on('panel_complete', () => {
    // 幻灯片播放完成后再执行
    fvideo.remove(cutTo, creator.id);
    // });
    return Promise.resolve({ obj: fvideo, duration: 0 });
  }

  /**
   * 解析数字人层
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_digital(creator, m_width, m_height, scene, layer, time) {
    if (this.cloud) {
      // 云剪辑，需要提交预处理
      return this.parse_video(creator, m_width, m_height, scene, layer, time);
    } else {
      return this.parse_image(creator, m_width, m_height, scene, layer, time);
    }
  }

  /**
   * 解析image层
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_image(creator, m_width, m_height, scene, layer, time) {
    const cache_dir = creator.rootConf('detailedCacheDir');
    let { resizeMode, zoomDirection, width, height, duration = 0.5 } = layer;
    let file = layer.path;
    file = await preload_file(file, cache_dir, layer.dataurl);
    if (width === undefined && height === undefined) {
      let dimensions = await getImageDimensions(file);
      width = dimensions.width;
      height = dimensions.height;
    }
    let wlv = m_width / width;
    let hlv = m_height / height;

    let keep_wh = { width, height };
    var fimg1;
    switch (resizeMode) {
      case 'contain':
        // 所有图像或者视频都将包含在幻灯片中（保留纵横比）
        keep_wh = keep_wh_fun(width, height, wlv, hlv, false);
        break;
      case 'contain-blur':
        // 类似于contain，但以高斯模糊来填充空白部分 （保留纵横比）
        keep_wh = keep_wh_fun(width, height, wlv, hlv, false);
        var keep_wh_cover = {
          width: keep_wh.width * (wlv <= hlv ? 1 : 1.5),
          height: keep_wh.height * (wlv > hlv ? 1 : 1.5),
        };
        fimg1 = new FFImage({
          path: file,
          x: m_width / 2,
          y: m_height / 2,
          opacity: 0.5,
          ...keep_wh_cover,
          resetXY: false,
        });
        fimg1.setBlur(25);
        break;
      case 'cover':
        //裁剪图片或者视频以覆盖整个幻灯片（保留纵横比）
        keep_wh = keep_wh_fun(width, height, wlv, hlv, true);
        break;
      case 'stretch':
        //视频将被拉伸以覆盖整个幻灯片（忽略纵横比）。
        keep_wh = { width: m_width, height: m_height };
        break;
      default:
        break;
    }
    const fimg = new FFImage({
      path: file,
      x: m_width / 2,
      y: m_height / 2,
      ...keep_wh,
      resetXY: false,
    });
    // 转场特效
    switch (zoomDirection) {
      case 'in':
        fimg.addEffect({ type: 'zoomIn', time: duration });
        fimg1 && fimg1.addEffect({ type: 'zoomIn', time: duration });
        break;
      case 'out':
        fimg.addEffect({ type: 'zoomOut', time: duration });
        fimg1 && fimg1.addEffect({ type: 'zoomOut', time: duration });
        break;
      case 'left':
        fimg.addEffect({ type: 'slideInLeft', time: duration });
        fimg1 && fimg1.addEffect({ type: 'slideInLeft', time: duration });
        break;
      case 'right':
        fimg.addEffect({ type: 'slideInRight', time: duration });
        fimg1 && fimg1.addEffect({ type: 'slideInRight', time: duration });
        break;
      default:
        break;
    }
    fimg1 && scene.addChild(fimg1);
    return Promise.resolve({ obj: fimg, duration: 0 });
  }

  /**
   * 解析layers
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} default_p_layer
   * @param {*} layers
   * @param {*} time 执行了多长时间
   */
  async parse_layers(creator, m_width, m_height, scene, default_p_layer, layers, p_time) {
    let layers_duration = p_time;
    for (const index in layers) {
      try {
        const layer = layers[index];
        const { obj: fflayer, duration } = await this.parse_layer(
          creator,
          m_width,
          m_height,
          scene,
          { ...default_p_layer, ...layer },
          layers_duration,
        );
        if (fflayer) {
          layers_duration += duration;
          // 设置动画效果
          const effect = layer.effect;
          if (effect) {
            const start = layer.start || 0;
            fflayer.addEffect(effect.type, effect.time, start);
            if (layer.end) {
              // this.on('panel_complete', () => {
              // 幻灯片播放完成后再执行
              fflayer.remove(layer.end, creator.id);
              // });
            }
          } else {
            if (layer.start) {
              fflayer.addEffect('fadeIn', 0.3, layer.start);
              if (layer.end) {
                fflayer.remove(layer.end, creator.id);
              }
            }
          }
          scene.addChild(fflayer);
        }
      } catch (err) {
        console.log(err);
        // return Promise.reject(err);
      }
    }
    return Promise.resolve(layers_duration);
  }

  /**
   * 解析slide_panel layer
   * @param {*} p_creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_slide_panel(p_creator, m_width, m_height, scene, layer, time) {
    this.step += 1;
    const FFSlide = require('./slide');
    const width = m_width * layer.width;
    const height = m_height * layer.height;
    const fps = p_creator.rootConf('fps');
    const parallel = p_creator.rootConf('parallel');
    let x_y = parse_x_y(m_width, m_height, layer);
    const outputDir = p_creator.rootConf('outputDir');
    const cacheDir = p_creator.rootConf('cacheDir');
    const render = p_creator.rootConf('render');
    const slide = new FFSlide({
      width,
      height,
      fps,
      parallel,
      render,
      outputDir,
      cacheDir,
      x: x_y[0],
      y: x_y[1],
      step: this.step,
    });
    await this.parse_clips(slide.creator, width, height, {}, layer.clips, 0);
    slide.on('start', () => {
      this.time = 0;
      // this.emit('start');
    });

    slide.on('error', e => {
      this.emit('error', e);
    });

    slide.on('progress', e => {
      const percent = e.percent || 0;
      e.percent = (slide.step - 1 + percent) / (this.step + 1);
      this.emit('progress', e);
    });

    slide.on('complete', e => {
      // this.emit('complete', e);
      const useage = Perf.getInfo();
      this.time += useage.time;
      // this.emit('panel_complete'); // 解决creator声明多次导致的时间轴更新错误 TimelineUpdate是全局的，注册事件后开始计时
    });
    return Promise.resolve({ obj: slide, duration: 0 });
  }

  /**
   * 解析layer层
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} layer
   * @param {*} time 执行了多长时间
   */
  async parse_layer(creator, m_width, m_height, scene, layer, time) {
    switch (layer.type) {
      case 'image':
        return this.parse_image(creator, m_width, m_height, scene, layer, time);
      // case 'audio':
      //   return this.parse_audio(creator, m_width, m_height, scene, layer, time);
      case 'digital':
        return this.parse_digital(creator, m_width, m_height, scene, layer, time);
      case 'video':
        return this.parse_video(creator, m_width, m_height, scene, layer, time);
      case 'fabric':
        return this.parse_fabric(creator, m_width, m_height, scene, layer, time);
      case 'slide-panel':
        if (layer.clips.length > 0) {
          return this.parse_slide_panel(creator, m_width, m_height, scene, layer, time);
        } else {
          return Promise.resolve({ obj: null, duration: 0 });
        }
      default:
        return Promise.reject(`未支持类型${layer.type}`);
    }
  }

  /**
   * 解析字幕
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} scene
   * @param {*} subtitle
   */
  async parse_subtitle(creator, m_width, m_height, scene, subtitle) {
    const cache_dir = creator.rootConf('detailedCacheDir');
    const width = m_width;
    const height = m_height;
    const { audio, texts, object, fontPath } = subtitle;
    let duration = subtitle.duration;
    // texts 转 srt格式
    let srtContent = '';
    texts.forEach((subtitle, index) => {
      const srtIndex = index + 1;
      const startTime = formatTime(subtitle.begin_time);
      const endTime = formatTime(subtitle.end_time);

      srtContent += `${srtIndex}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${subtitle.text}\n\n`;
    });
    // 字幕文件
    const srt = path.resolve(cache_dir, `${Utils.genUuid()}.srt`);
    fs.writeFileSync(srt, srtContent);
    // 设置字幕文件
    const ffsubtitle = new FFSubtitle({
      comma: true, // 是否逗号分割
      backgroundColor: object.backgroundColor,
      color: object.fill,
      fontSize: object.fontSize,
      x: object.left * width,
      y: object.top * height,
      // 1. srt方式
      path: srt,
      resetXY: false,
    });
    // TODO 需要细化下，暂时不区分
    let style = object;
    if (object.shadow) {
      const shadow = object.shadow;
      style = {
        ...style,
        dropShadow: true,
        dropShadowColor: shadow.color,
        dropShadowBlur: shadow.blur,
      };
    }
    const align = object.textAlign;
    const lineJoin = object.strokeLineJoin;
    const miterLimit = object.strokeMiterLimit;
    style = { ...style, align, lineJoin, miterLimit };
    ffsubtitle.setStyle(style); // 设置样式object
    ffsubtitle.setScale(object.scaleX);

    if (object.angle) {
      ffsubtitle.setRotateDeg(object.angle);
    }

    // 字体处理
    if (fontPath) {
      const font_path = await preload_file(fontPath, cache_dir);
      ffsubtitle.setFont(font_path);
    }
    ffsubtitle.frameBuffer = ffsubtitle.rootConf('fps'); // 缓存帧
    // 声音处理
    if (audio) {
      const tts = await preload_file(audio, cache_dir);
      ffsubtitle.setAudio(tts); // 设置语音配音-tts
      scene.addAudio({ path: tts, volume: 2, fadeIn: 0.5, fadeOut: 0.5 });
      if (!duration) {
        await ffsubtitle.preProcessing();
        duration = ffsubtitle.conf.duration;
      }
    }
    if (duration) {
      scene.setDuration(duration);
    }
    return Promise.resolve(ffsubtitle);
  }

  /**
   * 解析所有场景
   * @param {*} creator
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} default_p 默认参数
   * @param {*} clips
   * @param {*} time 经过了多长时间
   * @returns
   */
  async parse_clips(creator, m_width, m_height, default_p, clips, time) {
    var duration = 0;
    for (let index in clips) {
      let clip = _.merge({}, default_p, clips[index]);
      const scene = await this.parse_clip(creator, m_width, m_height, clip, time);
      duration += scene.getRealDuration(false);
      //  场景中的声音是混合在单独一个aduioTracks,所以这个参数可以控制场景中的aduioTracks和上面相对于音频轨道，的相对大小
      scene.audios.forEach(audio => {
        if (audio.volume == -1) {
          audio.volume = 1;
        }
        audio.volume = audio.volume * clip.mixVolume;
      });
      creator.addChild(scene);
    }
    return Promise.resolve(duration);
  }

  /**
   * 解析clip场景
   * @param {*} creator root
   * @param {*} m_width 主窗体width
   * @param {*} m_height 主窗体height
   * @param {*} clip
   * @param {*} time 经过了多长时间
   * @returns
   */
  async parse_clip(creator, m_width, m_height, clip, time) {
    const width = m_width;
    const height = m_height;
    let { duration, transition, subtitle, background, backgroundDataurl, layer } = clip;
    // 场景对象
    const scene = new FFScene();
    const cache_dir = creator.rootConf('detailedCacheDir');

    // 场景时间
    scene.setDuration(duration);

    // 转场特效
    let transition_name = transition.name;
    if (transition_name == 'random') {
      transition_name = transitions[Math.floor(Math.random() * transitions.length)];
    }
    scene.setTransition(transition_name, transition.duration || 0.5);

    // 背景
    if (background || backgroundDataurl) {
      if (background.indexOf('#') == 0) {
        scene.setBgColor(background);
      } else {
        const file = await preload_file(background, cache_dir, backgroundDataurl);
        // console.log(file);
        const fimg = new FFImage({
          path: file,
          x: width / 2,
          y: height / 2,
          width,
          height,
          resetXY: false,
        });
        scene.addChild(fimg);
      }
    }
    // 场景层
    let layers = clip.layers;
    let layer_duration = await this.parse_layers(
      creator,
      m_width,
      m_height,
      scene,
      layer || {},
      layers,
      time,
    );
    if (layer_duration && layer_duration > 0) {
      scene.setDuration(layer_duration);
    }

    // 字幕
    if (subtitle && subtitle.texts && subtitle.texts.length > 0) {
      const ffsubtitle = await this.parse_subtitle(creator, m_width, m_height, scene, subtitle);
      scene.addChild(ffsubtitle);
    }
    return Promise.resolve(scene);
  }

  async sync(json) {
    const {
      width,
      height,
      fps,
      loopAudio,
      clips,
      audioFilePath,
      threads = 8,
      backgroundAudioVolume = 100, // 背景音
      clipsAudioVolume = 100, // 场景中的声音是混合在单独一个aduioTracks,所以这个参数可以控制场景中的aduioTracks和上面相对于音频轨道，的相对大小
    } = json;
    const default_p = { mixVolume: clipsAudioVolume / 100, ...json.default }; // 场景中的默认参数
    const volume = backgroundAudioVolume / 100;
    const creator_conf = {
      width,
      height,
      fps,
      render: this.render,
      parallel: 8,
      threads,
      audioLoop: loopAudio,
      outputDir: this.outputDir,
      cacheDir: this.cacheDir,
    };

    if (audioFilePath) {
      creator_conf['audio'] = { path: audioFilePath, volume, fadeIn: 0.5, fadeOut: 0.5 };
    }

    // 实例化
    const creator = new FFCreator(creator_conf);

    //缓存目录检查
    const cache_dir = creator.rootConf('detailedCacheDir');
    fsExtra.ensureDirSync(cache_dir);

    // 添加 'SIGINT' 事件监听器来捕获中断事件
    process.on('SIGINT', e => {
      clear_env(true);
      creator.destroy();
    });

    creator.inCenter = true;
    creator.generateOutput();

    // 解析场景
    this.parse_clips(creator, width, height, default_p, clips, 0)
      .then(() => {
        // 开始合成
        creator.start();
      })
      .catch(e => {
        this.emit('error', e);
      });

    creator.on('start', () => {
      this.emit('start');
    });

    /**
     * 清理工作空间
     * @param {*} err 错误的话要清理视屏
     */
    const clear_env = err => {
      const cache_dir = creator.rootConf('detailedCacheDir');
      FS.rmDir(cache_dir);
      if (err) {
        if (this.video) {
          FS.rmDir(this.video);
        }
      }
    };

    creator.on('error', e => {
      clear_env(true);
      this.emit('error', e);
    });

    creator.on('progress', e => {
      const percent = e.percent || 0;
      e.percent = (this.step + percent) / (this.step + 1);
      this.emit('progress', e);
      if (creator.renderer.synthesis) {
        this.setVideo(creator.renderer.synthesis.getOutputPath('curr'));
      }
    });

    creator.on('complete', e => {
      this.time += Perf.t;
      clear_env();
      this.setVideo(e.output);
      this.emit('complete', e);
      this.destroy();
    });

    return this;
  }

  setFFmpegPath(ffmpeg_path) {}

  setFFprobePath(ffprobe_path) {
    FFmpegUtil.setFFprobePath(ffprobe_path);
  }

  setVideo(path) {
    this.video = path;
  }
}
module.exports = FFExector;
