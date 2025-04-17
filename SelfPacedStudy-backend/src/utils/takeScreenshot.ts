import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg'
import { promisify } from 'util';


const screenshot = promisify((stream: any, time: string, outputPath: string, callback: any) => {
    ffmpeg(stream)
        .on('end', function()
        {
            callback(null, 'Screenshot taken');
        })
        .on('error', function(err)
        {
            callback(err);
        })
        .outputOptions(['-f image2', '-vframes 1', '-vcodec png', '-f rawvideo', '-ss ' + time])
        .output(outputPath)
        .run();
});

function millisecondsToTimeFormat(milliseconds: number): string {
    const pad = (num: number, size: number) => ('000' + num).slice(size * -1);
    const timeInSeconds = milliseconds / 1000;
    const time = parseFloat(timeInSeconds.toFixed(3));
    const hours = Math.floor(time / 60 / 60);
    const minutes = Math.floor(time / 60) % 60;
    const secs = Math.floor(time - minutes * 60);

    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(secs, 2);
}

async function getVideoDuration(url: string): Promise<number> {
    const info = await ytdl.getInfo(url);
    const duration = parseInt(info.videoDetails.lengthSeconds);
    return duration;
}

async function takeScreenshot(videoUrl: string, timestampInMilliseconds: number, outputPath: string): Promise<any> {
        const durationInSeconds = await getVideoDuration(videoUrl);
        const timestampInSeconds = timestampInMilliseconds / 1000;

        console.log("Duration in seconds: ", durationInSeconds);
        console.log("Timestamp in seconds: ", timestampInSeconds);
        
        if (timestampInSeconds > durationInSeconds) {
            throw new Error('Requested timestamp is beyond the video duration.');
        }

        const timeFormat = millisecondsToTimeFormat(timestampInMilliseconds);
        console.log("Time format: ", timeFormat);
        const videoStream = ytdl(videoUrl, { quality: 'highest' });
        await screenshot(videoStream, timeFormat, outputPath);
}

export default takeScreenshot;
