// pitch-processor.worklet.js
class PitchProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'fftSize', defaultValue: 4096 }];
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const inputData = input[0];
    const frequency = this.autoCorrelate(inputData, sampleRate);
    
    if (frequency > 0) {
      const result = this.frequencyToNote(frequency);
      this.port.postMessage(result);
    }
    
    return true;
  }

  autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;
    let foundGoodCorrelation = false;

    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let lastCorrelation = 1;
    for (let offset = 0; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;

      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs(buf[i] - buf[i + offset]);
      }
      correlation = 1 - (correlation / MAX_SAMPLES);
      if (correlation > 0.9 && correlation > lastCorrelation) {
        foundGoodCorrelation = true;
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      } else if (foundGoodCorrelation) {
        const shift = (bestCorrelation - correlation) / correlation;
        return sampleRate / (bestOffset + 8 * shift);
      }
      lastCorrelation = correlation;
    }
    if (bestCorrelation > 0.01) {
      return sampleRate / bestOffset;
    }
    return -1;
  }

  frequencyToNote(freq) {
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    if (freq <= 0) return { note: '', cents: 0, frequency: 0 };

    const halfSteps = Math.round(12 * Math.log2(freq / C0));
    const octave = Math.floor(halfSteps / 12);
    const noteIndex = halfSteps % 12;
    const note = noteNames[noteIndex] + octave;

    const expectedFreq = C0 * Math.pow(2, halfSteps / 12);
    const cents = Math.floor(1200 * Math.log2(freq / expectedFreq));

    return { note, cents, frequency: freq };
  }
}

registerProcessor('pitch-processor', PitchProcessor);