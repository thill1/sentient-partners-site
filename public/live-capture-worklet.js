/* global AudioWorkletProcessor, sampleRate, registerProcessor */
// Collects microphone audio off the main thread and hands it over in ~40 ms pieces.
class LiveCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = Math.max(1024, Math.round(sampleRate * 0.04));
    this.buffer = new Float32Array(this.size);
    this.filled = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    let offset = 0;
    while (offset < channel.length) {
      const take = Math.min(channel.length - offset, this.size - this.filled);
      this.buffer.set(channel.subarray(offset, offset + take), this.filled);
      this.filled += take;
      offset += take;
      if (this.filled === this.size) {
        this.port.postMessage(this.buffer.slice(0));
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor("live-capture", LiveCaptureProcessor);
