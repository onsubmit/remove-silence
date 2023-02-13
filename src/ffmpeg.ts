import { spawn } from "child_process";
import fs, { WriteStream } from "fs";
import path from "path";
import { SilenceDetectOptions } from "./SilenceDetectOptions";
import { TimeFrame } from "./TimeFrame";
import { isTimestampPosition, Timestamp } from "./Timestamp";

class FFmpeg {
  private static readonly silenceRegex = /silence_(?<position>start|end): (?<timestamp>-?\d+(.\d+)?)/gm;
  private static readonly durationRegex =
    /^\s*Duration\s*:\s*((?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+)\.(?<milliseconds>\d+))/gm;

  static async getVideoDurationInSeconds(inputVideoPath: string): Promise<number> {
    const args: string[] = FFmpeg.getVideoDurationOptions(inputVideoPath);

    let duration = 0;
    const stderrHandler = (stderr: string): void => {
      console.debug(stderr.toString().trim());
      const res = FFmpeg.durationRegex.exec(stderr);
      if (!res) {
        return;
      }

      if (!res.groups) {
        throw new Error(`Could not determine video duration from: ${stderr}`);
      }

      const { hours, minutes, seconds, milliseconds } = res.groups;
      duration = 3600 * parseInt(hours) + 60 * parseInt(minutes) + parseInt(seconds) + parseInt(milliseconds) / 100;
    };

    await FFmpeg.spawn(args, stderrHandler);
    return duration;
  }

  static async getSilenceTimestamps(
    inputVideoPath: string,
    noiseTolerance: number,
    minNoiseDurationInSeconds: number
  ): Promise<Timestamp[]> {
    const args: string[] = FFmpeg.getSilenceDetectionOptions(inputVideoPath, {
      noiseTolerance,
      durationInSeconds: minNoiseDurationInSeconds,
    });

    const silenceTimestamps: Timestamp[] = [];
    const stderrHandler = (stderr: string): void => {
      let res: RegExpExecArray | null = null;
      while ((res = FFmpeg.silenceRegex.exec(stderr))) {
        if (!res.groups) {
          continue;
        }

        console.debug(stderr.toString().trim());

        const position = res.groups.position;
        if (!isTimestampPosition(position)) {
          throw new Error(`Invalid position: ${position}`);
        }

        const value = parseFloat(res.groups.timestamp);
        silenceTimestamps.push({ position, value });
      }
    };

    await FFmpeg.spawn(args, stderrHandler);
    return silenceTimestamps;
  }

  static async writeTempClip(
    inputVideoPath: string,
    counter: number,
    start: number,
    end: number,
    clipListPathStream: WriteStream
  ): Promise<void> {
    if (end - start <= 0.002) {
      console.debug("Clip too short. Skipping.");
      return;
    }

    const clipDirectory = path.join(path.dirname(inputVideoPath), "clips");
    if (!fs.existsSync(clipDirectory)) {
      fs.mkdirSync(clipDirectory);
    }

    const outputClipPath = path.join(clipDirectory, `${counter}_${path.basename(inputVideoPath)}`);
    const args: string[] = FFmpeg.getWriteTempClipOptions(inputVideoPath, outputClipPath, { start, end });
    await FFmpeg.spawn(args);

    console.debug(outputClipPath);
    console.debug(`${start} - ${end}`);

    clipListPathStream.write(`file '${outputClipPath}'\n`);
  }

  static async combineTempClips(inputVideoPath: string, clipListPath: string): Promise<void> {
    const outputVideoPath = path.join(path.dirname(inputVideoPath), `out_${path.basename(inputVideoPath)}`);
    const args: string[] = FFmpeg.getCombineTempClipsOptions(clipListPath, outputVideoPath);
    await FFmpeg.spawn(args);
  }

  private static async spawn(
    args: string[],
    stderrHandler: (value: string) => void = (_): void => {
      /* ignore */
    }
  ): Promise<number> {
    console.log(`ffmpeg ${args.join(" ")}`);

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stdout.setEncoding("utf8");
    ffmpeg.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (data) => {
      console.log(`stderr: ${data}`);
    });

    for await (const value of ffmpeg.stderr) {
      stderrHandler(value);
    }

    return new Promise<number>((resolve) => {
      ffmpeg.on("exit", () => {
        if (ffmpeg.exitCode === null) {
          throw new Error("Exit code is null. Has the process actually exited?");
        }

        resolve(ffmpeg.exitCode);
      });
    });
  }

  private static getSilenceDetectionOptions = (
    inputVideoPath: string,
    silenceDetectOptions: SilenceDetectOptions
  ): string[] => {
    return [
      // Suppress printing banner.
      "-hide_banner",

      // Blocks all data streams of a file from being filtered or being automatically selected or mapped for any output.
      "-dn",

      // Blocks all video streams of a file from being filtered or being automatically selected or mapped for any output.
      "-vn",

      // Seeks in this input file to position.
      "-ss",
      "0.00",

      // Input file.
      "-i",
      inputVideoPath,

      // Create the filtergraph and used to filter the stream.
      "-af",
      `silencedetect=n=${silenceDetectOptions.noiseTolerance}:d=${silenceDetectOptions.durationInSeconds}`,

      // Use a null muxer so no output is generated.
      // https://ffmpeg.org/ffmpeg-formats.html#null
      "-f",
      "null",
      "out.null",
    ];
  };

  private static getVideoDurationOptions = (inputVideoPath: string): string[] => {
    return [
      // Suppress printing banner.
      "-hide_banner",

      // Limit the duration of data read from the input file.
      // Prevents this from taking too long.
      "-t",
      "0.001",

      // Input file.
      "-i",
      inputVideoPath,

      // Use a null muxer so no output is generated.
      // https://ffmpeg.org/ffmpeg-formats.html#null
      "-f",
      "null",
      "out.null",
    ];
  };

  private static getWriteTempClipOptions = (
    inputVideoPath: string,
    outputClipPath: string,
    timeFrame: TimeFrame,
    audioEncoder = "aac",
    videoEncoder = "libx264"
  ): string[] => {
    return [
      // Suppress printing banner.
      "-hide_banner",

      // Overwrite output files without asking.
      "-y",

      // Set logging level and flags used by the library.
      "-loglevel",
      "warning",

      // Print encoding progress/statistics.
      "-stats",

      // Blocks all data streams of a file from being filtered or being automatically selected or mapped for any output.
      "-dn",

      // Seeks in this input file to position.
      "-ss",
      timeFrame.start.toFixed(3),

      // Stop writing the output or reading the input at position.
      "-to",
      timeFrame.end.toFixed(3),

      // Input file.
      "-i",
      inputVideoPath,

      // Set metadata information of the next output file from infile.
      // Discard metadata.
      "-map_metadata",
      "-1",

      // Copy chapters from input file with index input_file_index to the next output file.
      // Discard chapters.
      "-map_chapters",
      "-1",

      // When transcoding audio and/or video streams, ffmpeg will not begin writing into the output until it has one packet for each such stream.
      // While waiting for that to happen, packets for other streams are buffered.
      // This option sets the size of this buffer, in packets, for the matching output stream.
      "-max_muxing_queue_size",
      "99999",

      // Select an audio encoder.
      "-c:a",
      audioEncoder,

      // Select a video encoder.
      "-c:v",
      videoEncoder,

      // Output file:
      outputClipPath,
    ];
  };

  private static getCombineTempClipsOptions = (clipListPath: string, outputVideoPath: string): string[] => {
    return [
      // Suppress printing banner.
      "-hide_banner",

      // Overwrite output files without asking.
      "-y",

      // Set logging level and flags used by the library.
      "-loglevel",
      "warning",

      // Print encoding progress/statistics.
      "-stats",

      // Concatenate clips.
      "-f",
      "concat",

      // https://stackoverflow.com/a/56029574
      "-safe",
      "0",

      // Input file.
      "-i",
      clipListPath,

      // Copy audio codec without reencoding
      "-c:a",
      "copy",

      // Copy video codec without reencoding
      "-c:v",
      "copy",

      // Output file:
      outputVideoPath,
    ];
  };
}

export default FFmpeg;
