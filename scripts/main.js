var motionBtn = document.querySelector('.controls__button_motion-detect'),
    popupBtn = document.querySelector('.popup__button'),
    popup= document.querySelector('.popup'),
    videoInterface = document.querySelector('.video-interface'),
    fallBack = document.querySelector('.video-fallback');

var video = document.querySelector('video'),
    canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d');

var Motion = new MotionDetector.Core();

var svg = document.querySelector('#js-faces-targets');
var face = document.getElementById('face');


function init() {
    checkGetUserMedia();
    bindEvents();
}

function bindEvents() {
    motionBtn.addEventListener('click', function () {
        if (!this.classList.contains('started')) {
            this.classList.add('started')
            Motion.start();
            face.classList.remove('hidden');
        } else {
            this.classList.remove('started')
            Motion.stop();
            face.classList.add('hidden');
        }

    });

    video.addEventListener('canplay', _videoOnCanPlay);
    video.addEventListener('canplaythrough', _videOnLoad);

    popupBtn.addEventListener('click', _startCapture);

}

function createInterface() {
    var start = 0,
        limit = 7;

    generateStroke(start, limit, 13);

    setInterval(function () {
        var g = document.querySelector('#digits').querySelectorAll('g');

        document.querySelector('#js-faces-targets').classList.add('noise');

        start = start + 15;

        setTimeout(function () {
            document.querySelector('#js-faces-targets').classList.remove('noise');

            requestAnimationFrame(function () {
                document.querySelector('#digits').querySelectorAll('text').forEach(function (el) {
                    el.style.transform = 'translateY(-' + start + 'px)';
                })
            })

            generateStroke(limit + 1, limit + 1, parseInt(g[g.length -1].querySelector('text').getAttribute('y')) + 15);

            g = document.querySelector('#digits').querySelectorAll('g');

            g[g.length -1].querySelector('text').animate(
                [
                    { fill: 'red' },
                    { fill: '#000', offset: 0.333},
                    { fill: '#fff' }
                ], {
                    duration: 100,
                    iterations: 6
                }
            );

            limit++;
        }, 3000)
    }, 6000)
}

function generateStroke(start, limit, y) {
    for (let i = start; i <= limit; i++) {
        var digits = svg.querySelector('#digits');
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        var text = document.createElementNS("http://www.w3.org/2000/svg", "text");

        text.setAttribute('x', 0);

        text.setAttribute('y', y);

        text.textContent = i + ' - ' + makeRandomString();

        g.appendChild(text);

        digits.appendChild(g)

        y += 15;
    }
}

function createAudio(mediaStream) {
    var audioCanvas = document.getElementById('audio'),
        audioCanvasContext = audioCanvas.getContext('2d');

    var WIDTH = audioCanvas.width,
        HEIGHT = audioCanvas.height;

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var ctxAudio = new AudioContext();
    var source = ctxAudio.createMediaStreamSource(mediaStream);
    var analyser = ctxAudio.createAnalyser();
    var processor = ctxAudio.createScriptProcessor(2048, 1, 1);

    source.connect(analyser);
    source.connect(processor);
    processor.connect(ctxAudio.destination);
    analyser.fftSize = 128;


    var bufferLength = analyser.frequencyBinCount;
    var data = new Uint8Array(bufferLength);

    processor.onaudioprocess = function (){
        analyser.getByteFrequencyData(data);

        var maxValue = Math.max(...data),
        pieceCount = 24,
            delimiterCount = pieceCount - 1,
            delimiterWidth = 5,
            pieceWidth = (WIDTH - (delimiterCount * delimiterWidth)) / pieceCount;

        var matrix = [
            {
                max: 3,
                from: 0,
                to: 12,
                name: 'quiet',
                color: {
                    r: 0,
                    g: 71,
                    b: 13
                }
            },
            {
                max: 7,
                from: 12,
                to: 20,
                name: 'medium',
                color: {
                    r: 230,
                    g: 96,
                    b: 14
                }
            },
            {
                max: 10,
                from: 20,
                to: 100,
                name: 'loud',
                color: {
                    r: 255,
                    g: 0,
                    b: 0
                }
            }
        ];

        var maxPiece = maxValue / pieceWidth,
            wholePieces = Math.floor(maxPiece),
            remainderPiece = maxValue % pieceWidth;

        requestAnimationFrame(function () {
            audioCanvasContext.clearRect(0, 0, WIDTH, HEIGHT);

            var barHeight;
            var x = 0;

            for (var i = 0; i < bufferLength; i++) {
                barHeight = data[i];

                audioCanvasContext.fillStyle = 'rgb(' + (barHeight +  100) + ', 50, 50)';
                audioCanvasContext.fillRect(x,HEIGHT - 25 - barHeight / 2,pieceWidth,barHeight / 2);

                x += pieceWidth + 5;
            }

            for (let i = 0; i < wholePieces; i++) {

                let fillColor = 'yellow';

                matrix.forEach(function (interval) {
                    if (wholePieces >= interval.from && wholePieces <= interval.to) {
                        fillColor = 'rgb(' + interval.color.r + ',' + interval.color.g + ',' + interval.color.b + ')';
                    }
                })

                audioCanvasContext.fillStyle = fillColor;

                audioCanvasContext.fillRect(i * (pieceWidth + delimiterWidth), HEIGHT - 20, pieceWidth, 20);
            }


        });
    }
}

function _videoOnCanPlay() {
    video.classList.remove('hidden');
}

function _videOnLoad() {
    video.play();
    draw(video, context);

    popup.classList.add('hidden');

    var timerId = setTimeout(function tick() {
        toImage();
        timerId = setTimeout(tick, 10000);
    }, 10000);
}

function _startCapture() {
    if (navigator.getUserMedia) {
        navigator.mediaDevices.getUserMedia({audio: true, video: true})
            .then(function(mediaStream) {
                video.srcObject = mediaStream;
                videoInterface.classList.remove('hidden');

                createInterface();

                video.onloadedmetadata = function(e) {
                    video.play();
                    video.muted = true;
                };

                createAudio(mediaStream);

            })
            .catch(function(err) {
                console.log(err.name + ": " + err.message);
                fallBack.classList.remove('hidden')
            });
    } else {
        console.log("getUserMedia not supported");
    }
}

function draw(video) {
    context.drawImage(video, 0, 0, 720, 540);

    requestAnimationFrame(function () {
        draw(video);
    });

    return canvas;

}

function toImage() {
    var noiseCanvas = document.getElementById('noise'),
        noiseContext = noiseCanvas.getContext('2d'),
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    var drawImageData = function(imageData) {
        noiseContext.putImageData(imageData, 0, 0);
    };

    noiseCanvas.classList.remove('hidden');

    var glitchInterval = 0;

    var interval_id = setInterval(function() {
        var parameters = { amount: 1, seed: Math.round(Math.random()*1000), iterations: 5, quality: 30 };

        if (glitchInterval < 10) {
            glitch(imageData, parameters, drawImageData);
            glitchInterval++;
        } else {
            noiseCanvas.classList.add('hidden');
            clearInterval(interval_id);
            context.drawImage(video, 0, 0, 720, 540);
        }
    },  40);
}

function checkGetUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia;
}

function makeRandomString() {
    var text = "",
        textArr = [],
        possible = "0123456789",
        parts = [5, 5, 5],
        begin = 0;

    for (var i = 0; i < 16; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    for (i in parts) {
        var part = parts[i];

        var subStr = text.substring(begin, part + begin);
        begin = part;
        var last = subStr.lastIndexOf(";");
        if (last < 0) last = subStr.lastIndexOf(" ");

        textArr.push(subStr);

    }

    return textArr.join(' ');
}

var ca = 0;


init();