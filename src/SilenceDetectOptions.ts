/**
 * Detect silence in an audio stream.
 *
 * @link https://ffmpeg.org/ffmpeg-filters.html#silencedetect
 */
export type SilenceDetectOptions = {
  /**
   * Set noise tolerance. Can only be specified in amplitude ratio. Default is 0.001.
   *
   * @type {number}
   */
  noiseTolerance: number;
  /**
   * Set silence duration until notification (default is 2 seconds).
   *
   * @type {number}
   */
  durationInSections: number;
};
