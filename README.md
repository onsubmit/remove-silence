# onsubmit/remove-silence

Removes silence from a video using ffmpeg

# Getting Started

1. `yarn install`
1. Ensure [`ffmpeg`](https://ffmpeg.org/) is on your `PATH`.
1. `npx ts-node src\index.ts "<path_to_video>"`
1. Adjust noise detection tolerance if necessary, e.g. `npx ts-node src\index.ts "<path_to_video>" 0.001 0.5`
   - See [silencedetect](https://ffmpeg.org/ffmpeg-filters.html#silencedetect) options for `noise` and `duration`.
1. Adjust trimming buffers if necessary, e.g. `npx ts-node src\index.ts "<path_to_video>" 0.001 0.5 0.2 0.3`
   - This will add 0.2s to the beginning of each clip and 0.3s to the end of each clip.

# How this works

This tool runs `ffmpeg` several times to:

1. Gets the duration of the video.

   ```cmd
   ffmpeg -hide_banner -t 0.001 -i <path_to_video> -f null out.null
   ```

1. Detects silence in the video.

   ```cmd
   ffmpeg -hide_banner -dn -vn -ss 0.00 -i <path_to_video> -af silencedetect=n=0.02:d=0.75 -f null out.null
   ```

1. Splits the video into clips, keeping only the segments that are _not_ silent.

   ```cmd
   ffmpeg -hide_banner -y -loglevel warning -stats -dn -ss 43.621 -to 45.047 -i <path_to_video> -map_metadata -1 -map_chapters -1 -max_muxing_queue_size 99999 -c:a aac -c:v libx264 <path_to_clip>
   ```

1. Combines all the clips into a single video.
   ```cmd
   ffmpeg -hide_banner -y -loglevel warning -stats -f concat -safe 0 -i <path_to_clips_list> -c:a copy -c:v copy <path_to_output_video>
   ```

# See also

https://github.com/padvincenzo/silence-speedup
