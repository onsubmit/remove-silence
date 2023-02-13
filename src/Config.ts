import fs from "fs";

export default class AppConfig {
  private _inputVideoPath: string;

  constructor() {
    this._inputVideoPath = process.argv[2] || "";
  }

  get inputVideoPath(): string {
    return this._inputVideoPath;
  }
  validate = (): this => {
    if (!this._inputVideoPath) {
      console.log("usage: index.js {inputVideoPath}");
      throw "No filename";
    }

    if (!fs.existsSync(this._inputVideoPath)) {
      throw `No input file found at ${this._inputVideoPath}`;
    }

    return this;
  };
}
