import type { Results, Options, Pose as PoseType } from '@mediapipe/pose';

export class PoseEstimator {
  private pose: PoseType;
  // Guard: prevents queuing another processFrame before the current one finishes.
  // This is the main cause of "motion lines getting stuck" and pipeline delays.
  private isBusy = false;

  constructor(onResultsCallback: (results: Results) => void) {
    const mediapipePose = require('@mediapipe/pose');
    const Pose = mediapipePose.Pose || (typeof window !== 'undefined' && (window as any).Pose);

    if (!Pose) {
      throw new Error("MediaPipe Pose failed to load.");
    }

    this.pose = new Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    const options: Options = {
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    this.pose.setOptions(options);
    this.pose.onResults(onResultsCallback);
  }

  /**
   * Feed a video frame into MediaPipe, but SKIP if the previous frame
   * hasn't finished yet. This prevents a runaway async queue.
   */
  public async processFrame(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.isBusy) return false; // Skip if still processing previous frame
    this.isBusy = true;
    try {
      await this.pose.send({ image: videoElement });
      return true;
    } catch (error) {
      console.error("MediaPipe processing error:", error);
      return false;
    } finally {
      this.isBusy = false;
    }
  }

  public dispose() {
    this.pose.close();
  }
}