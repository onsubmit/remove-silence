import fs from "fs";

export default class AppConfig {
  private _inputVideoPath: string;
  private _noiseTolerance: number;
  private _minNoiseDurationInSeconds: number;

  constructor() {
    this._inputVideoPath = process.argv[2] || "";
    this._noiseTolerance = parseFloat(process.argv[3]) || 0.02;
    this._minNoiseDurationInSeconds = parseFloat(process.argv[4]) || 0.75;
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
