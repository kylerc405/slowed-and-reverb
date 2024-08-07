import { visualizeAudio } from "./visualizer.js";
// import { downloader } from "./downloader.js";

    document.addEventListener('DOMContentLoaded', async function () {

    const audioElement = document.getElementById('audioPlayer');
    audioElement.muted = true;
    // audioElement.volume = 0.0001;
    const playPauseButton = document.getElementById('playpause');
    // const source = document.getElementById('audioSource');
    let isPlaying = false;

    
    // create AudioContext and MediaElementSourceNode
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    // const source = audioContext.createMediaElementSource(audioElement); // input source
    // window.audioSource = source
    // let sourceNode;


    let sourceNode;
    async function fetchAudioBuffer(url, audioContext) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            console.log("Audio buffer fetched and decoded successfully.");
            return audioBuffer;
        }
        catch (error) {
            console.error("Error fetching or decoding audio data:", error);
            throw error;
        }

    }
    let mainAudioBuffer = null;
    async function loadAudioBuffer() {
        try {
            mainAudioBuffer = await fetchAudioBuffer(audioElement.src, audioContext);
            console.log("mainAudioBuffer is loaded");
        } catch (error) {
            console.error("Error loading audio buffer:", error);
        }
    }

    function setupSourceNode() {
        // const audioBuffer = await fetchAudioBuffer(audioElement.src, audioContext);
        if (sourceNode) {
            sourceNode.disconnect();
            console.log("Previous source node disconnected.");
        }
        sourceNode = audioContext.createBufferSource();
        if (mainAudioBuffer) {
            sourceNode.buffer = mainAudioBuffer;
            console.log("Source node buffer set to mainAudioBuffer.");
        }
        else {
            console.error("audio buffer not loaded");
            return;
        }

        // sourceNode.playbackRate.value = audioElement.playbackRate;
        sourceNode.connect(gainNode);
        // console.log("Source node connected to gain node.");
        // sourceNode.onended = () => {
        //     isPlaying = false;
        // };
        // sourceNode.connect(wetGainNode);
        // sourceNode.connect(dryGainNode);
        // sourceNode.connect(analyserNode);
        // sourceNode.start(0, audioElement.currentTime); //play from currentTime 
    }


    async function playAudio() {
        // if (isPlaying) return;
        if (!mainAudioBuffer) {
            console.log("Loading audio buffer...");
            await loadAudioBuffer();
        }
        setupSourceNode();
        if (mainAudioBuffer) {
            const factor = shift_factor(speedControl.value);

            sourceNode.playbackRate.value = factor;
            audioElement.playbackRate = factor;
            sourceNode.start(0, audioElement.currentTime); //play from currentTime 
            console.log("Source node started at current time:", audioElement.currentTime);
        } else {
            console.error("Cannot start source node as mainAudioBuffer is not loaded.");
        }
        // isPlaying = true;
    }
    loadAudioBuffer();
    setupSourceNode();










    // song title - removed path & extension
    const songTitle = document.getElementById('songTitle');
    const file = songTitle.getAttribute('data-song-name');
    if (file != " ") {
        songTitle.textContent = "[ " + file + " ]";
    }



    



    // timeline adjustment
    const curTime = document.getElementById("curtime");
    const endTime = document.getElementById("endtime");

    function updateRemainingTime() {
        const duration = audioElement.duration;
        const currentTime = audioElement.currentTime;
        // const playbackRate = audioElement.playbackRate;
        const playbackRate = sourceNode ? sourceNode.playbackRate.value : 1;

        if (duration) {
            const newCur = currentTime / playbackRate;
            let secCur = Math.floor(newCur % 60);
            let minCur = Math.floor(newCur / 60);

            if (secCur > 59) {
                secCur = 0;
                minCur += 1;
            }


            const minStrCur = minCur.toString().padStart(2, '0'); 
            const secStrCur = secCur.toString().padStart(2, '0'); 
            const inMinSecCur = `${minStrCur}:${secStrCur}`;
            curTime.textContent = inMinSecCur;

            const newDuration = duration / playbackRate;
            let secDuration = Math.floor(newDuration % 60);
            let minDuration = Math.floor(newDuration / 60);

            if (secDuration > 59) {
                secDuration = 0;
                minDuration += 1;
            }
            
            const minStrDuration = minDuration.toString().padStart(2, '0'); 
            const secStrDuration = secDuration.toString().padStart(2, '0'); 
            const inMinSecDuration = `${minStrDuration}:${secStrDuration}`;
            endTime.textContent = inMinSecDuration;
        }
    }

    audioElement.addEventListener('timeupdate', updateRemainingTime);
    audioElement.onloadedmetadata = function() {
        updateRemainingTime();
    };
    // updateRemainingTime();




    // gain
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1;





    // reverb from scratch:
    const reverseReverb = document.getElementById("reverseReverb");
    let reverse = false;

    // a. creating the buffer 
    function impulseResponse(duration, decay, reverse) {
        const totalSamples = audioContext.sampleRate*duration; // total samples for the reverb tail (duration)
        const buffer = audioContext.createBuffer(2, totalSamples, audioContext.sampleRate); // buffer holds reverb impulse's audio data, length totalSamples
        const left = buffer.getChannelData(0); // EMPTY array for audio data for L channel
        const right = buffer.getChannelData(1); // EMPTY array for audio data for R channel
        for (let i=0; i<totalSamples; i++)  { // populates L/R arrays with decaying random noise
            // const valueLeft = (2*Math.random()-1) * Math.pow(1-i/totalSamples, decay);
            // const valueRight = (2*Math.random()-1) * Math.pow(1-i/totalSamples, decay);
            
            const decayFactor = Math.pow(1-i/totalSamples, decay); // exponential decay function
            const randomizer = (2 * Math.random() - 1) * decayFactor; // (random num -1...1) * decay
                // combining these basically creates random noise that decays based on decayFactor
                // randomizer between -1 and 1 bc thats the wave amplitude thresholds for digital audio 

            left[i] = randomizer;
            right[i] = (2 * Math.random() - 1) * decayFactor;
        }

        if (reverse) {
            left.reverse();
            right.reverse();
        }

        return buffer; // holds IR data simulating a "snapshot"/recording of a reverb effect -- used by ConvolverNode
    }

    
    // b. creating the ConvolverNode
    const impulse = impulseResponse(2.2,3.5, reverse);
    const convolverNode = new ConvolverNode(audioContext, {buffer:impulse});
        // audio passed through convolverNode is mixed w/ reverb IR in the buffer

    // c. reverse reverb
    function updateConvolver() {
        const impulse = impulseResponse(2.2, 3.5, reverse);
        convolverNode.buffer = impulse;
    }

    // convolverNode.normalize = false;


    // // METHOD 2: IR Wav File Method
    // const convolverNode2 = audioContext.createConvolver();
    // try {
    //     const response = await fetch(
    //       "static/IR/MF - Close middle XY.wav",
    //     );
    //     const arrayBuffer = await response.arrayBuffer();
    //     const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
    //     // convolverNode.normalize=false;
    //     convolverNode2.buffer = decodedAudio;
    // } catch (error) {
    //     console.error(
    //       `Unable to fetch the audio file: ${name} Error: ${err.message}`,
    //     );
    // }

    const wetGainNode = audioContext.createGain();
    const dryGainNode = audioContext.createGain();
    wetGainNode.gain.value = 0;
    dryGainNode.gain.value = 1;

    // create analyser for visualization
    const analyserNode = audioContext.createAnalyser();
    const mixedGainNode = audioContext.createGain();

    // create source node
    // const respose = fetch(audioElement.src);
    // const arrayBuffer = response.arrayBuffer();
    // const audioBuffer = audioContext.decodeAudioData(arrayBuffer);
    // const sourceNode = audioContext.createBufferSource();
    // sourceNode.buffer = audioBuffer;










    // connections - dry
    // source -> gain -> dry -> (mixed/analyser) -> destination
    // source.connect(gainNode);
    // source.connect(gainNode);
    gainNode.connect(dryGainNode);
    dryGainNode.connect(audioContext.destination)

    // connections - wet
    // source -> gain -> wet -> convolver -> (mixed/analyser) -> destination
    // source.connect(gainNode);
    gainNode.connect(wetGainNode);
    // convolverNode.connect(convolverNode2);
    wetGainNode.connect(convolverNode);
    // wetGainNode.connect(convolverNode2);
    convolverNode.connect(audioContext.destination);
    // convolverNode2.connect(audioContext.destination);

    // connections for visualizer 
    mixedGainNode.gain.value = 1;
    dryGainNode.connect(mixedGainNode);
    convolverNode.connect(mixedGainNode);
    mixedGainNode.connect(analyserNode);
    // analyserNode.connect(audioContext.destination);
    // export const finalAnalyserNode = analyserNode;
    visualizeAudio(audioContext, analyserNode);





    // // initialize source
    // if (!source) {
    //     source = audioContext.createMediaElementSource(audioElement); // input source
    //     // source.connect(audioContext.destination); // destination
    //     window.audioSource = source;
    // }


    // play/pause button

    let prevPause = false;

    playPauseButton.addEventListener('click', function() {
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }
        if (isPlaying) {
            audioElement.pause();
            if (sourceNode) {
                sourceNode.stop();
                sourceNode.disconnect();
                console.log("stopped and disconnected")
            }
            playPauseButton.setAttribute('data-playing', 'false');
            // playPauseButton.textContent = "▶"

            console.log("paused at " + audioElement.currentTime)
            prevPause = true;
        }
        else {
            audioElement.play();
            if (!mainAudioBuffer) {
                loadAudioBuffer();
            }
            if (sourceNode==true && prevPause == true) {
                sourceNode.stop();
                sourceNode.disconnect();
            }

            // sourceNode.start(0, audioElement.currentTime);

            // setupSourceNode();

            playAudio();
            // sourceNode.start(0, audioElement.currentTime);
            // counter++;
            // console.log("initial counter 0 start, counter now == " + counter)
            playPauseButton.setAttribute('data-playing', 'true');
            // playPauseButton.textContent = "❚❚"

            console.log("played")
        }
        isPlaying = !isPlaying;
    })


    // song progress bar
    // const audioPlayer = document.getElementById("audioPlayer");
    const slider = document.getElementById("timeline-slider");

    audioElement.addEventListener("timeupdate", () => {
        const percentage = (audioElement.currentTime / audioElement.duration) * 100;
        slider.value = percentage;

        // played duration change color
        slider.style.background = `linear-gradient(to right, rgba(206, 149, 111, 0.822) ${slider.value}%, rgb(46, 46, 46) ${slider.value}%)`;

    })

    slider.addEventListener("input", () => {
        const changeToTime = slider.value / 100 * audioElement.duration;
        audioElement.currentTime = changeToTime;
        if (sourceNode) {
            sourceNode.stop();
            sourceNode.disconnect();

        }
        if (isPlaying) {
            playAudio();
        }

    })


    // play/pause with space
    document.addEventListener("keydown", function(event) {
        if (event.key === " ") {
            event.preventDefault();
            isPlaying = !isPlaying;

            if (!audioElement.paused) {
                audioElement.pause();
                playPauseButton.checked = false;
                playPauseButton.setAttribute('data-playing', 'false');
                prevPause = true;

                if (sourceNode) {
                    sourceNode.stop();
                    sourceNode.disconnect();
                    console.log("stopped and disconnected")
                }

            }
            else {
                playAudio();
                audioElement.play();
                playPauseButton.checked = true;

                if (!mainAudioBuffer) {
                    loadAudioBuffer();
                }
                if (sourceNode==true && prevPause == true) {
                    sourceNode.stop();
                    sourceNode.disconnect();
                }
    
                // sourceNode.start(0, audioElement.currentTime);
    
                // setupSourceNode();


                playPauseButton.setAttribute('data-playing', 'true');
    
                console.log("played")
            }

        }
    })


    // function updateSliderBackground(value) {
    //     slider.style.background = `linear-gradient(to right, #4CAF50 ${value}%, #ccc ${value}%)`;
    // }









    // remove scrubbing sound - idk i kinda like it maybe 
    // let isPlayingBeforeScrub = false;
    // slider.addEventListener("mousedown", () => {
    //     if (!audioElement.paused) {
    //         audioElement.pause();
    //         isPlayingBeforeScrub = true;
    //         isPlaying = false;
    //         playPauseButton.setAttribute('data-playing', 'false');
    //     }    
    //     else {
    //         isPlayingBeforeScrub = false;
    //     }
           
    // })
    // slider.addEventListener("mouseup", () => {
    //     if (isPlayingBeforeScrub) {
    //         audioElement.play();
    //         isPlaying = true;
    //         playPauseButton.setAttribute('data-playing', 'true');
    //     }
    // })





    // move back to start after ending
    audioElement.addEventListener( "ended", () => {
            if (isPlaying = true) {
                isPlaying = !isPlaying;
                slider.value = 0;
                audioPlayer.currentTime = 0;
                // playPauseButton.textContent = "▶";
                playPauseButton.checked = false;
                playPauseButton.setAttribute('data-playing', 'false');
                audioElement.pause();

                if (sourceNode){
                    sourceNode.stop();
                    sourceNode.disconnect();
                }
                
            }
            else {
                slider.value = 0;
                audioPlayer.currentTime = 0;
                // playPauseButton.textContent = "▶";
                playPauseButton.checked = false;

                if (sourceNode){
                    sourceNode.stop();
                    sourceNode.disconnect();
                }
            }
        },
        false,
    ); 


    // pitch shift control
    const speedControl = document.getElementById("speedControl"); // slider - pitches
    const speedValue = document.getElementById("speedValue");
    const transposeValue = document.getElementById("transposeValue");
    // source.connect(pitchNode)

    // audioElement.preservesPitch = false;
    // audioElement.mozPreservesPitch = false;
    // audioElement.webkitPreservesPitch = false;
    // audioElement.playbackRate = 1;

    function shift_factor(semitones) {
        return Math.pow(2, semitones/12);
    }

    speedControl.addEventListener("input", () => {
        const factor = shift_factor(speedControl.value);
        // audioElement.playbackRate = factor;

        if (sourceNode) {
            sourceNode.playbackRate.value = factor;
            audioElement.playbackRate = factor;
        }

        // sourceNode.playbackRate.value = factor;
        speedValue.textContent = factor.toFixed(2);
        if (speedControl.value > 0) {
            transposeValue.textContent = "+" + speedControl.value;
        }
        else {
            transposeValue.textContent = speedControl.value;
        }
        updateRemainingTime();
    },
    false);
    // pitch reset button
    const speedReset = document.getElementById("resetSpeed");
    speedReset.addEventListener("click", () => {
        // audioElement.playbackRate = 1.0;

        if (sourceNode) {
            sourceNode.playbackRate.value = 1.0;
            audioElement.playbackRate = 1.0;
        }


        speedValue.textContent = parseFloat(1.0).toFixed(2);
        speedControl.value = 0.0;
        transposeValue.textContent = 0;
        updateRemainingTime();
    })
    // //adjust timeline when pitch/speed changes
    // speedControl.addEventListener("input", () => {
    //     updateRemainingTime();
    // });






    // gain control
    const gainControl = document.querySelector("#gainControl");
    //   const gainValue = document.querySelector("#gainValue");
    gainControl.addEventListener(
      "input", 
        () => {
            gainNode.gain.value = gainControl.value;
            let roundedValue = parseFloat(gainControl.value);
            roundedValue = roundedValue.toFixed(2);
            gainValue.textContent = roundedValue;
        },
        false,
    );
    // gain reset button
    const gainReset = document.getElementById("resetGain");
    gainReset.addEventListener("click", () => {
        gainNode.gain.value = 1;
        gainValue.textContent = parseFloat(1.00).toFixed(2);
        gainControl.value = 1;
    })




    // reverb control
    const reverbControl = document.getElementById("reverbControl");
    const reverbValue = document.getElementById("reverbValue");

    reverbControl.addEventListener("input", () => {
        const wetness = parseFloat(reverbControl.value);
        wetGainNode.gain.value = wetness;
        dryGainNode.gain.value = 1-wetness;
        reverbValue.textContent = (parseFloat(reverbControl.value).toFixed(2)*100).toFixed(0);
    });
    // reverb reset button
    const reverbReset = document.getElementById("resetReverb");
    reverbReset.addEventListener("click", () => {
        wetGainNode.gain.value = 0;
        dryGainNode.gain.value = 1;
        reverbValue.textContent = parseFloat(0).toFixed(2)*100;
        reverbControl.value = 0;
        reverbControl.style.background = 'linear-gradient(to right, #f5deb3 100%, rgba(206, 149, 111, 0.822) 100%)';
    })

    //reverse reverb control
    updateConvolver();
    reverseReverb.addEventListener('click', function() {

        if (reverse == true) {
            reverseReverb.textContent = "TYPE: NORMAL";
            reverseReverb.style.backgroundColor = "rgba(52, 131, 70, 0.705)";
        }     
        else {
            reverseReverb.textContent = "TYPE: REVERSED"
            reverseReverb.style.backgroundColor = "rgba(128, 56, 56, 0.651)";
        }
        reverse = !reverse;
        updateConvolver();
    })

    // async function fetchAudioBuffer(url, audioContext) {
    //     const response = await fetch(url);
    //     const arrayBuffer = await response.arrayBuffer();
    //     return await audioContext.decodeAudioData(arrayBuffer);
    // }

    


    // visual stuff
    reverbControl.addEventListener("input", () => {
        reverbControl.style.background = `linear-gradient(to right, rgba(206, 149, 111, 0.822) ${reverbControl.value*100}%, #f5deb3 ${reverbControl.value*100}%)`;

    })


    // stop mobile landscape slider weirdness 
    //reverb
    // reverbControl.addEventListener('touchstart', () => {
    //     document.body.style.overflow = 'hidden'; // Disable scrolling
    // });

    // reverbControl.addEventListener('touchend', () => {
    //     document.body.style.overflow = 'scroll'; // Enable scrolling
    // });
    // reverbControl.addEventListener('touchmove', (event) => {
    //     // Allow slider to be moved by touch without scrolling the page
    //     if (event.target === reverbControl) {
    //         event.stopPropagation();
    //     }
    // }, { passive: false });


    // //gain
    // gainControl.addEventListener('touchstart', () => {
    //     document.body.style.overflow = 'hidden'; // Disable scrolling
    // });

    // gainControl.addEventListener('touchend', () => {
    //     document.body.style.overflow = 'scroll'; // Enable scrolling
    // });
    // gainControl.addEventListener('touchmove', (event) => {
    //     // Allow slider to be moved by touch without scrolling the page
    //     if (event.target === gainControl) {
    //         event.stopPropagation();
    //     }
    // }, { passive: false });
    // //pitch
    // speedControl.addEventListener('touchstart', () => {
    //     document.body.style.overflow = 'hidden'; // Disable scrolling
    // });

    // speedControl.addEventListener('touchend', () => {
    //     document.body.style.overflow = 'scroll'; // Enable scrolling
    // });
    // speedControl.addEventListener('touchmove', (event) => {
    //     // Allow slider to be moved by touch without scrolling the page
    //     if (event.target === speedControl) {
    //         event.stopPropagation();
    //     }
    // }, { passive: false });




// ---------------- download stuff ----------------------------------




    // allows wav audio to clip/distort (cool effect, as it does on the real-time site audio), 
    // instead of just cutting out >1.0 threshold audio, as wav seems to do by default
    function limitBuffer(buffer, threshold) { 
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                if (channelData[i] > threshold) {
                    channelData[i] = threshold;
                } else if (channelData[i] < -threshold) {
                    channelData[i] = -threshold;
                }
                if (i < 200) {
                    console.log("limited value: " + channelData[i])
                }
                }
        }
        return buffer;
    }
   
    function getWavBytes(buffer, options) {
        const type = options.isFloat ? Float32Array : Uint16Array
        const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT;
    
        const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }))
        const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);
    
        //prepend header then add pcmBytes
        wavBytes.set(headerBytes, 0);
        wavBytes.set(new Uint8Array(buffer), headerBytes.length)
    
        return wavBytes
    };
    
    function getWavHeader(options) {
        const numFrames = options.numFrames
        const numChannels = options.numChannels || 2
        const sr = options.sampleRate || 44100
        const bytesPerSample = options.isFloat ? 4 : 2
        const format = options.isFloat ? 3 : 1
    
        const blockAlign = numChannels * bytesPerSample
        const byteRate = sr * blockAlign
        const dataSize = numFrames * blockAlign
        
        const buffer = new ArrayBuffer(44)
        const dv = new DataView(buffer)
    
        let p=0
    
        function writeString(s) {
            for (let i = 0; i < s.length; i++) {
                dv.setUint8(p + i, s.charCodeAt(i));
            }
            p += s.length
        }
    
        function writeUint32(d) {
            dv.setUint32(p, d, true);
            p += 4
        }
        function writeUint16(d) {
            dv.setUint16(p, d, true);
            p += 2
        }
    
        writeString('RIFF')              // ChunkID
        writeUint32(dataSize + 36)       // ChunkSize
        writeString('WAVE')              // Format
        writeString('fmt ')              // Subchunk1ID
        writeUint32(16)                  // Subchunk1Size
        writeUint16(format)              // AudioFormat
        writeUint16(numChannels)         // NumChannels
        writeUint32(sr)                  // SampleRate
        writeUint32(byteRate)            // ByteRate
        writeUint16(blockAlign)          // BlockAlign
        writeUint16(bytesPerSample * 8)  // BitsPerSample
        writeString('data')              // Subchunk2ID
        writeUint32(dataSize)            // Subchunk2Size
    
        return new Uint8Array(buffer);
    }
    
    // resampling for convolution node
    async function resampleBuffer(audioContext, buffer, targetSampleRate) {
        const offlineContext = new OfflineAudioContext(
            buffer.numberOfChannels,
            buffer.length * targetSampleRate / buffer.sampleRate,
            targetSampleRate
        );
        const bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = buffer;
        bufferSource.connect(offlineContext.destination);
        bufferSource.start();
        const resampledBuffer = await offlineContext.startRendering();
        return resampledBuffer;
    }
    
    
    const downloadBtn = document.getElementById("downloadBtn");
    
    downloadBtn.addEventListener("click", async () => {
        const url = audioElement.src;
        const buffer = await fetchAudioBuffer(url, audioContext);

        const newBufferLength = buffer.length / audioElement.playbackRate;
        const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, newBufferLength, buffer.sampleRate);
        const offlineSourceNode = offlineContext.createBufferSource();
        offlineSourceNode.buffer = buffer;


        offlineSourceNode.playbackRate.value = audioElement.playbackRate;


        // resample convolver buffer to match sample rate of OfflineContext
        const resampledConvolverBuffer = await resampleBuffer(audioContext, convolverNode.buffer, offlineContext.sampleRate);



        //create offline nodes
        const offlineGainNode = offlineContext.createGain();
        offlineGainNode.gain.value = gainNode.gain.value;
        const offlineWetGainNode = offlineContext.createGain();
        offlineWetGainNode.gain.value = wetGainNode.gain.value;
        const offlineDryGainNode = offlineContext.createGain();
        offlineDryGainNode.gain.value = dryGainNode.gain.value;
        const offlineConvolverNode = offlineContext.createConvolver();
        offlineConvolverNode.buffer = resampledConvolverBuffer;
        // offlineConvolverNode.normalize = false;
 

        // const offlineAnalyser = offlineContext.createAnalyser();

        // offlineGainNode.gain.value =200;

        //dry connections
        offlineSourceNode.connect(offlineGainNode);
        offlineGainNode.connect(offlineDryGainNode);
        offlineDryGainNode.connect(offlineContext.destination);

        //wet connections
        // offlineSourceNode.connect(offlineWetGainNode);
        offlineGainNode.connect(offlineWetGainNode);
        offlineWetGainNode.connect(offlineConvolverNode);
        offlineConvolverNode.connect(offlineContext.destination);
        

        offlineSourceNode.start();


        let _newBuffer;
        await offlineContext.startRendering().then(response => {
            _newBuffer = response;
        });

        const newBuffer = limitBuffer(_newBuffer, 1.0);

        

        // buffer to wav conversion
        const [left, right] = [newBuffer.getChannelData(0), newBuffer.getChannelData(1)];
        const interleaved = new Float32Array(left.length + right.length);
        for (let src = 0, dst = 0; src < left.length; src++, dst += 2) {
            interleaved[dst] = left[src];
            interleaved[dst + 1] = right[src];
        }

        // get wav file bytes and audio params from source node
        const wavBytes = getWavBytes(interleaved.buffer, {
            isFloat: true,
            numChannels: 2,
            sampleRate: buffer.sampleRate,
        })
        const blob = new Blob([wavBytes], {type: 'audio/wav'});
    
        // //link creation
        // const songTitle = document.getElementById('songTitle');
        // const file = songTitle.getAttribute('data-song-name');
        const fileTitleArray= file.split('.');
        const fileTitle = fileTitleArray[fileTitleArray.length-2];
        

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileTitle + "-Slowed+Reverb.wav";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});

