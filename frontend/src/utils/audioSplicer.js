// Audio Splicer Utility using standard Web Audio API (cross-browser compatible)

export const audioBufferToWav = (buffer) => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  const writeString = (str) => {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  };

  const setUint16 = (data) => {
    out.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data) => {
    out.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier
  writeString('RIFF');
  // file length minus RIFF identifier & length
  setUint32(length - 8);
  // RIFF type
  writeString('WAVE');
  // format chunk identifier
  writeString('fmt ');
  // format chunk length
  setUint32(16);
  // sample format (raw PCM)
  setUint16(1);
  // channel count
  setUint16(numOfChan);
  // sample rate
  setUint32(sampleRate);
  // byte rate (sample rate * block align)
  setUint32(sampleRate * 2 * numOfChan);
  // block align (channel count * bytes per sample)
  setUint16(numOfChan * 2);
  // bits per sample
  setUint16(16);
  // data chunk identifier
  writeString('data');
  // data chunk length
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
};

export const spliceAndMergeAudio = async (studentAudioUrl, audioCorrections = []) => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContextClass();

  try {
    // 1. Fetch and decode student audio
    const studentRes = await fetch(studentAudioUrl);
    const studentArrayBuffer = await studentRes.arrayBuffer();
    const studentAudioBuffer = await ctx.decodeAudioData(studentArrayBuffer);

    if (!audioCorrections || audioCorrections.length === 0) {
      return audioBufferToWav(studentAudioBuffer);
    }

    // Sort corrections by timestamp ascending
    const sorted = [...audioCorrections].sort((a, b) => a.timestamp - b.timestamp);

    // 2. Decode each teacher correction audio blob
    const decodedCorrections = [];
    for (const item of sorted) {
      if (item.audioBlob) {
        const arr = await item.audioBlob.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        decodedCorrections.push({
          timestamp: Math.min(item.timestamp, studentAudioBuffer.duration),
          buffer: buf
        });
      }
    }

    if (decodedCorrections.length === 0) {
      return audioBufferToWav(studentAudioBuffer);
    }

    // 3. Calculate total length for the merged buffer
    const sampleRate = studentAudioBuffer.sampleRate;
    const numChannels = studentAudioBuffer.numberOfChannels;

    let totalSamples = studentAudioBuffer.length;
    for (const c of decodedCorrections) {
      totalSamples += Math.round(c.buffer.duration * sampleRate);
    }

    const mergedBuffer = ctx.createBuffer(numChannels, totalSamples, sampleRate);

    // 4. Splice student chunks with teacher clips in between
    let currentStudentSample = 0;
    let writeOffset = 0;

    for (let i = 0; i < decodedCorrections.length; i++) {
      const correction = decodedCorrections[i];
      const targetStudentSample = Math.min(
        studentAudioBuffer.length,
        Math.round(correction.timestamp * sampleRate)
      );

      // Copy student segment from currentStudentSample up to targetStudentSample
      const segmentSamples = targetStudentSample - currentStudentSample;
      if (segmentSamples > 0) {
        for (let ch = 0; ch < numChannels; ch++) {
          const studentChannelData = studentAudioBuffer.getChannelData(Math.min(ch, studentAudioBuffer.numberOfChannels - 1));
          const mergedChannelData = mergedBuffer.getChannelData(ch);
          for (let s = 0; s < segmentSamples; s++) {
            mergedChannelData[writeOffset + s] = studentChannelData[currentStudentSample + s];
          }
        }
        writeOffset += segmentSamples;
        currentStudentSample = targetStudentSample;
      }

      // Copy teacher correction clip
      const teacherSamples = Math.round(correction.buffer.duration * sampleRate);
      for (let ch = 0; ch < numChannels; ch++) {
        const teacherChannelData = correction.buffer.getChannelData(Math.min(ch, correction.buffer.numberOfChannels - 1));
        const mergedChannelData = mergedBuffer.getChannelData(ch);
        for (let s = 0; s < Math.min(teacherSamples, correction.buffer.length); s++) {
          mergedChannelData[writeOffset + s] = teacherChannelData[s];
        }
      }
      writeOffset += teacherSamples;
    }

    // Copy remainder of student audio
    const remainingStudentSamples = studentAudioBuffer.length - currentStudentSample;
    if (remainingStudentSamples > 0) {
      for (let ch = 0; ch < numChannels; ch++) {
        const studentChannelData = studentAudioBuffer.getChannelData(Math.min(ch, studentAudioBuffer.numberOfChannels - 1));
        const mergedChannelData = mergedBuffer.getChannelData(ch);
        for (let s = 0; s < remainingStudentSamples; s++) {
          mergedChannelData[writeOffset + s] = studentChannelData[currentStudentSample + s];
        }
      }
    }

    // 5. Convert merged AudioBuffer to WAV Blob
    return audioBufferToWav(mergedBuffer);
  } finally {
    if (ctx.state !== 'closed') {
      ctx.close();
    }
  }
};
