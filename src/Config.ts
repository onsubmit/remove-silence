import fs from "fs";

export default class AppConfig {
  private _inputVideoPath: string;
  private _noiseTolerance: number;
  private _minNoiseDurationInSeconds: number;
  private _bufferBeforeInSeconds: number;
  private _bufferAfterInSeconds: number;

  constructor() {
    this._inputVideoPath = process.argv[2] || "";
    this._noiseTolerance = parseFloat(process.argv[3]) || 0.02;
    this._minNoiseDurationInSeconds = parseFloat(process.argv[4]) || 1;
    this._bufferBeforeInSeconds = parseFloat(process.argv[5]) || 0.1;
    this._bufferAfterInSeconds = parseFloat(process.argv[6]) || 0.25;
  }

  get inputVideoPath(): string {
    return this._inputVideoPath;
  }

  get noiseTolerance(): number {
    return this._noiseTolerance;
  }

  get minNoiseDurationInSeconds(): number {
    return this._minNoiseDurationInSeconds;
  }

  get bufferBeforeInSeconds(): number {
    return this._bufferBeforeInSeconds;
  }

  get bufferAfterInSeconds(): number {
    return this._bufferAfterInSeconds;
  }

  validate = (): this => {
    if (!this._inputVideoPath) {
      console.log("usage: index.js {inputVideoPath} {noiseTolerance} {durationInSeconds}");
      throw new Error("No filename");
    }

    if (!fs.existsSync(this._inputVideoPath)) {
      throw new Error(`No input file found at ${this._inputVideoPath}`);
    }

    if (this._noiseTolerance < 0) {
      throw new Error(`Invalid noise tolerance: ${this._noiseTolerance}`);
    }

    if (this._minNoiseDurationInSeconds < 0) {
      throw new Error(`Invalid minimum noise duration: ${this._minNoiseDurationInSeconds}`);
    }

    return this;
  };
}
