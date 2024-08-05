export function visualizeAudio(audioContext, analyserNode) {
    console.log("visualizer called");

    if (window.audiomotionAnalyzer) {
        const AudioMotionAnalyzer = window.audiomotionAnalyzer;
        const canvas = document.getElementById('visualizerCanvas');

        if (canvas) {
            const analyzer = new AudioMotionAnalyzer({

                
                canvas: canvas,
                audioCtx: audioContext,
                source: analyserNode,
                connectSpeakers: false,
                colorMode: 'bar-index',
                radial: true,


                // alphaBars: true,
                fillAlpha: 0,


                // ansiBands: true,
                barSpace: 0.8, // does nothing??
                // bgAlpha: 0,
                showBgColor: false,
                overlay: true,
                // showPeaks: false,
                // fadePeaks: true,

                frequencyScale: 'bark',
                // gradient: 'prism',
                // gravity: ,
                mode: 6,

                // ledBars: true,
                linearBoost: 4,
                linearAmplitude: true,
                outlineBars: true,
                lineWidth: 10,
                channelLayout: 'dual-vertical',
                // loRes: true,
                maxFPS: 45,
                peakHoldTime: 600,
                // radialInvert: true,
                gravity: 0.1,
                showScaleX: false,

                // minDecibels: 5,
                // maxDecibels: 18000,
                // radius: 0.9,
                
                reflexAlpha: 0.6,
                reflexBright: 1,
                reflexRatio: 0.5,

                roundBars: true,
                smoothing: 0.2,
                weightingFilter: '468',


                minFreq: 10,
                maxFreq: 16000,



                // fullscreen mode
                lumiBars: true,
                fillAlpha: 1,
                mode: 2,
            });
            analyzer.start();
            analyzer.registerGradient('myGradient', {
                dir: 'h',

                colorStops: [
                // {color: '#23d2ff'},

                // {color: '#ffffff'},
                // {color: '#8550ff'},
                // {color: '#c63bf3'},
                // {color: '#fa5476'},
                // {color: '#e09738'},

                // {color: '#f5deb3'}, //main
                {color: 'rgba(206, 149, 111, 0.85)'}, // secondary
                ]
            });
            analyzer.gradient = 'myGradient';
            // analyzer.setSensitivity(5, 18000);

            const speedControl = document.getElementById("speedControl");
            analyzer.spinSpeed = 2;
            speedControl.addEventListener("input", () => {
                const speed = Math.pow(2, (speedControl.value/12)); // speed multiplier value
                if (speed > 1) {
                    analyzer.spinSpeed = Math.pow(speed, 4.5)+1;
                }
                else if (speed == 1) {
                    analyzer.spinSpeed = 2;
                }
                else {
                    analyzer.spinSpeed = 4*(speed-0.5) + 0.1
                    // (3.5 * (speed - 0.5)) + 0.25;
                        // linear interpolation (spin: min 0.25 -> max 2) as (speed: min 0.5x -> max 1x)
                }
                // console.log("spin speed: " + analyzer.spinSpeed);
            });

            const speedReset = document.getElementById("resetSpeed");
            speedReset.addEventListener("click", () => {
                analyzer.spinSpeed = 2;
                // console.log("spin speed - reset: " + analyzer.spinSpeed);
            });
        }
        
        else {
            console.error('canvas element not found');
        }
    }
    else {
        console.error('audiomotionAnalyzer not found');
    }



}