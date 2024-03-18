declare namespace FFCreatorSpace {
  interface FFExectorConf extends FFCreatorConf {
  }
  /**
   * FFVideoAlbum - A Videos Album component that supports multiple switching animation effects
   *
   * @example
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
   */
	class FFExector extends FFEventer {
		constructor(conf: FFExectorConf);

		sync (json: any): any;


		setFFmpegPath (ffmpeg_path: string): void;

		setFFprobePath (ffprobe_path: string): void;
  }
}
