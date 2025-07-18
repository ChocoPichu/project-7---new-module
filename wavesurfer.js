/* wavesurfer.js v1.0.12 */
"use strict";
var WaveSurfer = {
    defaultParams: {
        height: 128,
        waveColor: "#999",
        progressColor: "#555",
        cursorColor: "#333",
        cursorWidth: 1,
        skipLength: 2,
        minPxPerSec: 20,
        pixelRatio: window.devicePixelRatio,
        fillParent: !0,
        scrollParent: !1,
        hideScrollbar: !1,
        normalize: !1,
        audioContext: null,
        container: null,
        dragSelection: !0,
        loopSelection: !0,
        audioRate: 1,
        interact: !0,
        renderer: "Canvas",
        backend: "WebAudio"
    },
    init: function(t) {
        if (this.params = WaveSurfer.util.extend({}, this.defaultParams, t), this.container = "string" == typeof t.container ? document.querySelector(this.params.container) : this.params.container, !this.container) throw new Error("Container element not found");
        this.savedVolume = 0, this.isMuted = !1, this.createDrawer(), this.createBackend()
    },
    createDrawer: function() {
        var t = this;
        this.drawer = Object.create(WaveSurfer.Drawer[this.params.renderer]), this.drawer.init(this.container, this.params), this.drawer.on("redraw", function() {
            t.drawBuffer(), t.drawer.progress(t.backend.getPlayedPercents())
        }), this.drawer.on("click", function(e, i) {
            setTimeout(function() {
                t.seekTo(i)
            }, 0)
        }), this.drawer.on("scroll", function(e) {
            t.fireEvent("scroll", e)
        })
    },
    createBackend: function() {
        var t = this;
        this.backend && this.backend.destroy(), this.backend = Object.create(WaveSurfer[this.params.backend]), this.backend.on("finish", function() {
            t.fireEvent("finish")
        }), this.backend.on("audioprocess", function(e) {
            t.fireEvent("audioprocess", e)
        });
        try {
            this.backend.init(this.params)
        } catch (e) {
            "Your browser doesn't support Web Audio" == e.message && (this.params.backend = "AudioElement", this.backend = null, this.createBackend())
        }
    },
    restartAnimationLoop: function() {
        var t = this,
            e = window.requestAnimationFrame || window.webkitRequestAnimationFrame,
            i = function() {
                t.backend.isPaused() || (t.drawer.progress(t.backend.getPlayedPercents()), e(i))
            };
        i()
    },
    getDuration: function() {
        return this.backend.getDuration()
    },
    getCurrentTime: function() {
        return this.backend.getCurrentTime()
    },
    play: function(t, e) {
        this.backend.play(t, e), this.restartAnimationLoop(), this.fireEvent("play")
    },
    pause: function() {
        this.backend.pause(), this.fireEvent("pause")
    },
    playPause: function() {
        this.backend.isPaused() ? this.play() : this.pause()
    },
    skipBackward: function(t) {
        this.skip(-t || -this.params.skipLength)
    },
    skipForward: function(t) {
        this.skip(t || this.params.skipLength)
    },
    skip: function(t) {
        var e = this.getCurrentTime() || 0,
            i = this.getDuration() || 1;
        e = Math.max(0, Math.min(i, e + (t || 0))), this.seekAndCenter(e / i)
    },
    seekAndCenter: function(t) {
        this.seekTo(t), this.drawer.recenter(t)
    },
    seekTo: function(t) {
        var e = this.backend.isPaused(),
            i = this.params.scrollParent;
        e && (this.params.scrollParent = !1), this.backend.seekTo(t * this.getDuration()), this.drawer.progress(this.backend.getPlayedPercents()), e || (this.backend.pause(), this.backend.play()), this.params.scrollParent = i, this.fireEvent("seek", t)
    },
    stop: function() {
        this.pause(), this.seekTo(0), this.drawer.progress(0)
    },
    setVolume: function(t) {
        this.backend.setVolume(t)
    },
    setPlaybackRate: function(t) {
        this.backend.setPlaybackRate(t)
    },
    toggleMute: function() {
        this.isMuted ? (this.backend.setVolume(this.savedVolume), this.isMuted = !1) : (this.savedVolume = this.backend.getVolume(), this.backend.setVolume(0), this.isMuted = !0)
    },
    toggleScroll: function() {
        this.params.scrollParent = !this.params.scrollParent, this.drawBuffer()
    },
    toggleInteraction: function() {
        this.params.interact = !this.params.interact
    },
    drawBuffer: function() {
        var t = Math.round(this.getDuration() * this.params.minPxPerSec * this.params.pixelRatio),
            e = this.drawer.getWidth(),
            i = t;
        this.params.fillParent && (!this.params.scrollParent || e > t) && (i = e);
        var r = this.backend.getPeaks(i);
        this.drawer.drawPeaks(r, i), this.fireEvent("redraw", r, i)
    },
    loadArrayBuffer: function(t) {
        var e = this;
        this.backend.decodeArrayBuffer(t, function(t) {
            e.loadDecodedBuffer(t)
        }, function() {
            e.fireEvent("error", "Error decoding audiobuffer")
        })
    },
    loadDecodedBuffer: function(t) {
        this.empty(), this.backend.load(t), this.drawBuffer(), this.fireEvent("ready")
    },
    loadBlob: function(t) {
        var e = this,
            i = new FileReader;
        i.addEventListener("progress", function(t) {
            e.onProgress(t)
        }), i.addEventListener("load", function(t) {
            e.empty(), e.loadArrayBuffer(t.target.result)
        }), i.addEventListener("error", function() {
            e.fireEvent("error", "Error reading file")
        }), i.readAsArrayBuffer(t)
    },
    load: function(t, e) {
        switch (this.params.backend) {
            case "WebAudio":
                return this.loadBuffer(t);
            case "AudioElement":
                return this.loadAudioElement(t, e)
        }
    },
    loadBuffer: function(t) {
        return this.empty(), this.downloadArrayBuffer(t, this.loadArrayBuffer.bind(this))
    },
    loadAudioElement: function(t, e) {
        this.empty(), this.backend.load(t, e, this.container), this.backend.once("canplay", function() {
            this.drawBuffer(), this.fireEvent("ready")
        }.bind(this)), this.backend.once("error", function(t) {
            this.fireEvent("error", t)
        }.bind(this))
    },
    downloadArrayBuffer: function(t, e) {
        var i = this,
            r = WaveSurfer.util.ajax({
                url: t,
                responseType: "arraybuffer"
            });
        return r.on("progress", function(t) {
            i.onProgress(t)
        }), r.on("success", e), r.on("error", function(t) {
            i.fireEvent("error", "XHR error: " + t.target.statusText)
        }), r
    },
    onProgress: function(t) {
        if (t.lengthComputable) var e = t.loaded / t.total;
        else e = t.loaded / (t.loaded + 1e6);
        this.fireEvent("loading", Math.round(100 * e), t.target)
    },
    exportPCM: function(t, e, i) {
        t = t || 1024, e = e || 1e4, i = i || !1;
        var r = this.backend.getPeaks(t, e),
            s = [].map.call(r, function(t) {
                return Math.round(t * e) / e
            }),
            a = JSON.stringify(s);
        return i || window.open("data:application/json;charset=utf-8," + encodeURIComponent(a)), a
    },
    empty: function() {
        this.backend.isPaused() || (this.stop(), this.backend.disconnectSource()), this.drawer.progress(0), this.drawer.setWidth(0), this.drawer.drawPeaks({
            length: this.drawer.getWidth()
        }, 0)
    },
    destroy: function() {
        this.fireEvent("destroy"), this.unAll(), this.backend.destroy(), this.drawer.destroy()
    }
};
WaveSurfer.Observer = {
    on: function(t, e) {
        this.handlers || (this.handlers = {});
        var i = this.handlers[t];
        i || (i = this.handlers[t] = []), i.push(e)
    },
    un: function(t, e) {
        if (this.handlers) {
            var i = this.handlers[t];
            if (i)
                if (e)
                    for (var r = i.length - 1; r >= 0; r--) i[r] == e && i.splice(r, 1);
                else i.length = 0
        }
    },
    unAll: function() {
        this.handlers = null
    },
    once: function(t, e) {
        var i = this,
            r = function() {
                e.apply(this, arguments), setTimeout(function() {
                    i.un(t, r)
                }, 0)
            };
        this.on(t, r)
    },
    fireEvent: function(t) {
        if (this.handlers) {
            var e = this.handlers[t],
                i = Array.prototype.slice.call(arguments, 1);
            e && e.forEach(function(t) {
                t.apply(null, i)
            })
        }
    }
}, WaveSurfer.util = {
    extend: function(t) {
        var e = Array.prototype.slice.call(arguments, 1);
        return e.forEach(function(e) {
            Object.keys(e).forEach(function(i) {
                t[i] = e[i]
            })
        }), t
    },
    getId: function() {
        return "wavesurfer_" + Math.random().toString(32).substring(2)
    },
    max: function(t, e) {
        for (var i = -1 / 0, r = 0, s = t.length; s > r; r++) {
            var a = t[r];
            null != e && (a = Math.abs(a - e)), a > i && (i = a)
        }
        return i
    },
    ajax: function(t) {
        var e = Object.create(WaveSurfer.Observer),
            i = new XMLHttpRequest,
            r = !1;
        return i.open(t.method || "GET", t.url, !0), i.responseType = t.responseType, i.addEventListener("progress", function(t) {
            e.fireEvent("progress", t), t.lengthComputable && t.loaded == t.total && (r = !0)
        }), i.addEventListener("load", function(t) {
            r || e.fireEvent("progress", t), e.fireEvent("load", t), 200 == i.status || 206 == i.status ? e.fireEvent("success", i.response, t) : e.fireEvent("error", t)
        }), i.addEventListener("error", function(t) {
            e.fireEvent("error", t)
        }), i.send(), e.xhr = i, e
    }
}, WaveSurfer.util.extend(WaveSurfer, WaveSurfer.Observer), WaveSurfer.WebAudio = {
    scriptBufferSize: 256,
    fftSize: 128,
    PLAYING_STATE: 0,
    PAUSED_STATE: 1,
    FINISHED_STATE: 2,
    getAudioContext: function() {
        if (!window.AudioContext && !window.webkitAudioContext) throw new Error("Your browser doesn't support Web Audio");
        return WaveSurfer.WebAudio.audioContext || (WaveSurfer.WebAudio.audioContext = new(window.AudioContext || window.webkitAudioContext)), WaveSurfer.WebAudio.audioContext
    },
    init: function(t) {
        this.params = t, this.ac = t.audioContext || this.getAudioContext(), this.lastPlay = this.ac.currentTime, this.startPosition = 0, this.states = [Object.create(WaveSurfer.WebAudio.state.playing), Object.create(WaveSurfer.WebAudio.state.paused), Object.create(WaveSurfer.WebAudio.state.finished)], this.setState(this.PAUSED_STATE), this.createVolumeNode(), this.createScriptNode(), this.createAnalyserNode(), this.setPlaybackRate(this.params.audioRate)
    },
    disconnectFilters: function() {
        this.filters && (this.filters.forEach(function(t) {
            t && t.disconnect()
        }), this.filters = null)
    },
    setState: function(t) {
        this.state !== this.states[t] && (this.state = this.states[t], this.state.init.call(this))
    },
    setFilter: function() {
        this.setFilters([].slice.call(arguments))
    },
    setFilters: function(t) {
        this.disconnectFilters(), t && t.length ? (this.filters = t, t.reduce(function(t, e) {
            return t.connect(e), e
        }, this.analyser).connect(this.gainNode)) : this.analyser.connect(this.gainNode)
    },
    createScriptNode: function() {
        var t = this,
            e = this.scriptBufferSize;
        this.scriptNode = this.ac.createScriptProcessor ? this.ac.createScriptProcessor(e) : this.ac.createJavaScriptNode(e), this.scriptNode.connect(this.ac.destination), this.scriptNode.onaudioprocess = function() {
            var e = t.getCurrentTime();
            t.state === t.states[t.PLAYING_STATE] && t.fireEvent("audioprocess", e), t.buffer && e > t.getDuration() && t.setState(t.FINISHED_STATE)
        }
    },
    createAnalyserNode: function() {
        this.analyser = this.ac.createAnalyser(), this.analyser.fftSize = this.fftSize, this.analyserData = new Uint8Array(this.analyser.frequencyBinCount), this.analyser.connect(this.gainNode)
    },
    createVolumeNode: function() {
        this.gainNode = this.ac.createGain ? this.ac.createGain() : this.ac.createGainNode(), this.gainNode.connect(this.ac.destination)
    },
    setVolume: function(t) {
        this.gainNode.gain.value = t
    },
    getVolume: function() {
        return this.gainNode.gain.value
    },
    decodeArrayBuffer: function(t, e, i) {
        var r = this;
        this.ac.decodeAudioData(t, function(t) {
            r.buffer = t, e(t)
        }, i)
    },
    getPeaks: function(t) {
        for (var e = this.buffer, i = e.length / t, r = ~~(i / 10) || 1, s = e.numberOfChannels, a = new Float32Array(t), n = 0; s > n; n++)
            for (var o = e.getChannelData(n), h = 0; t > h; h++) {
                for (var c = ~~(h * i), u = ~~(c + i), d = 0, l = c; u > l; l += r) {
                    var f = o[l];
                    f > d ? d = f : -f > d && (d = -f)
                }(0 == n || d > a[h]) && (a[h] = d)
            }
        return a
    },
    getPlayedPercents: function() {
        return this.state.getPlayedPercents.call(this)
    },
    disconnectSource: function() {
        this.source && this.source.disconnect()
    },
    waveform: function() {
        return this.analyser.getByteTimeDomainData(this.analyserData), this.analyserData
    },
    destroy: function() {
        this.isPaused() || this.pause(), this.unAll(), this.buffer = null, this.disconnectFilters(), this.disconnectSource(), this.gainNode.disconnect(), this.scriptNode.disconnect(), this.analyser.disconnect()
    },
    load: function(t) {
        this.startPosition = 0, this.lastPlay = this.ac.currentTime, this.buffer = t, this.createSource()
    },
    createSource: function() {
        this.disconnectSource(), this.source = this.ac.createBufferSource(), this.source.start = this.source.start || this.source.noteGrainOn, this.source.stop = this.source.stop || this.source.noteOff, this.source.playbackRate.value = this.playbackRate, this.source.buffer = this.buffer, this.source.connect(this.analyser)
    },
    isPaused: function() {
        return this.state !== this.states[this.PLAYING_STATE]
    },
    getDuration: function() {
        return void 0 === this.buffer ? 0 : this.buffer.duration
    },
    seekTo: function(t, e) {
        return null == t && (t = this.getCurrentTime(), t >= this.getDuration() && (t = 0)), null == e && (e = this.getDuration()), this.startPosition = t, this.lastPlay = this.ac.currentTime, this.state === this.states[this.FINISHED_STATE] && this.setState(this.PAUSED_STATE), {
            start: t,
            end: e
        }
    },
    getPlayedTime: function() {
        return (this.ac.currentTime - this.lastPlay) * this.playbackRate
    },
    play: function(t, e) {
        this.createSource();
        var i = this.seekTo(t, e);
        t = i.start, e = i.end, this.source.start(0, t, e - t), this.setState(this.PLAYING_STATE)
    },
    pause: function() {
        this.startPosition += this.getPlayedTime(), this.source && this.source.stop(0), this.setState(this.PAUSED_STATE)
    },
    getCurrentTime: function() {
        return this.state.getCurrentTime.call(this)
    },
    setPlaybackRate: function(t) {
        t = t || 1, this.isPaused() ? this.playbackRate = t : (this.pause(), this.playbackRate = t, this.play())
    }
}, WaveSurfer.WebAudio.state = {}, WaveSurfer.WebAudio.state.playing = {
    init: function() {},
    getPlayedPercents: function() {
        var t = this.getDuration();
        return this.getCurrentTime() / t || 0
    },
    getCurrentTime: function() {
        return this.startPosition + this.getPlayedTime()
    }
}, WaveSurfer.WebAudio.state.paused = {
    init: function() {},
    getPlayedPercents: function() {
        var t = this.getDuration();
        return this.getCurrentTime() / t || 0
    },
    getCurrentTime: function() {
        return this.startPosition
    }
}, WaveSurfer.WebAudio.state.finished = {
    init: function() {
        this.fireEvent("finish")
    },
    getPlayedPercents: function() {
        return 1
    },
    getCurrentTime: function() {
        return this.getDuration()
    }
}, WaveSurfer.util.extend(WaveSurfer.WebAudio, WaveSurfer.Observer), WaveSurfer.AudioElement = Object.create(WaveSurfer.WebAudio), WaveSurfer.util.extend(WaveSurfer.AudioElement, {
    init: function(t) {
        this.params = t, this.media = {
            currentTime: 0,
            duration: 0,
            paused: !0,
            playbackRate: 1,
            play: function() {},
            pause: function() {}
        }
    },
    load: function(t, e, i) {
        var r = this,
            s = document.createElement("audio");
        s.controls = !1, s.autoplay = !1, s.preload = "auto", s.src = t, s.addEventListener("error", function() {
            r.fireEvent("error", "Error loading media element")
        }), s.addEventListener("canplay", function() {
            r.fireEvent("canplay")
        }), s.addEventListener("ended", function() {
            r.fireEvent("finish")
        }), s.addEventListener("timeupdate", function() {
            r.fireEvent("audioprocess", r.getCurrentTime())
        });
        var a = i.querySelector("audio");
        a && i.removeChild(a), i.appendChild(s), this.media = s, this.peaks = e, this.setPlaybackRate(this.playbackRate)
    },
    isPaused: function() {
        return this.media.paused
    },
    getDuration: function() {
        var t = this.media.duration;
        return t >= 1 / 0 && (t = this.media.seekable.end()), t
    },
    getCurrentTime: function() {
        return this.media.currentTime
    },
    getPlayedPercents: function() {
        return this.getCurrentTime() / this.getDuration() || 0
    },
    setPlaybackRate: function(t) {
        this.playbackRate = t || 1, this.media.playbackRate = this.playbackRate
    },
    seekTo: function(t) {
        null != t && (this.media.currentTime = t)
    },
    play: function(t) {
        this.seekTo(t), this.media.play()
    },
    pause: function() {
        this.media.pause()
    },
    getPeaks: function() {
        return this.peaks || []
    },
    getVolume: function() {
        return this.media.volume
    },
    setVolume: function(t) {
        this.media.volume = t
    },
    destroy: function() {
        this.pause(), this.unAll(), this.media.parentNode && this.media.parentNode.removeChild(this.media), this.media = null
    }
}), WaveSurfer.Drawer = {
    init: function(t, e) {
        this.container = t, this.params = e, this.width = 0, this.height = e.height * this.params.pixelRatio, this.lastPos = 0, this.createWrapper(), this.createElements()
    },
    createWrapper: function() {
        this.wrapper = this.container.appendChild(document.createElement("wave")), this.style(this.wrapper, {
            display: "block",
            position: "relative",
            userSelect: "none",
            webkitUserSelect: "none",
            height: this.params.height + "px"
        }), (this.params.fillParent || this.params.scrollParent) && this.style(this.wrapper, {
            width: "100%",
            overflowX: this.params.hideScrollbar ? "hidden" : "auto",
            overflowY: "hidden"
        }), this.setupWrapperEvents()
    },
    handleEvent: function(t) {
        t.preventDefault();
        var e = this.wrapper.getBoundingClientRect();
        return (t.clientX - e.left + this.wrapper.scrollLeft) / this.wrapper.scrollWidth || 0
    },
    setupWrapperEvents: function() {
        var t = this;
        this.wrapper.addEventListener("click", function(e) {
            var i = t.wrapper.offsetHeight - t.wrapper.clientHeight;
            if (0 != i) {
                var r = t.wrapper.getBoundingClientRect();
                if (e.clientY >= r.bottom - i) return
            }
            t.params.interact && t.fireEvent("click", e, t.handleEvent(e))
        }), this.wrapper.addEventListener("scroll", function(e) {
            t.fireEvent("scroll", e)
        })
    },
    drawPeaks: function(t, e) {
        if (this.resetScroll(), this.setWidth(e), this.params.normalize) var i = WaveSurfer.util.max(t);
        else i = 1;
        this.drawWave(t, i)
    },
    style: function(t, e) {
        return Object.keys(e).forEach(function(i) {
            t.style[i] != e[i] && (t.style[i] = e[i])
        }), t
    },
    resetScroll: function() {
        null !== this.wrapper && (this.wrapper.scrollLeft = 0)
    },
    recenter: function(t) {
        var e = this.wrapper.scrollWidth * t;
        this.recenterOnPosition(e, !0)
    },
    recenterOnPosition: function(t, e) {
        var i = this.wrapper.scrollLeft,
            r = ~~(this.wrapper.clientWidth / 2),
            s = t - r,
            a = s - i,
            n = this.wrapper.scrollWidth - this.wrapper.clientWidth;
        if (0 != n) {
            if (!e && a >= -r && r > a) {
                var o = 5;
                a = Math.max(-o, Math.min(o, a)), s = i + a
            }
            s = Math.max(0, Math.min(n, s)), s != i && (this.wrapper.scrollLeft = s)
        }
    },
    getWidth: function() {
        return Math.round(this.container.clientWidth * this.params.pixelRatio)
    },
    setWidth: function(t) {
        t != this.width && (this.width = t, this.params.fillParent || this.params.scrollParent ? this.style(this.wrapper, {
            width: ""
        }) : this.style(this.wrapper, {
            width: ~~(this.width / this.params.pixelRatio) + "px"
        }), this.updateWidth())
    },
    progress: function(t) {
        var e = 1 / this.params.pixelRatio,
            i = Math.round(t * this.width) * e;
        if (i < this.lastPos || i - this.lastPos >= e) {
            if (this.lastPos = i, this.params.scrollParent) {
                var r = ~~(this.wrapper.scrollWidth * t);
                this.recenterOnPosition(r)
            }
            this.updateProgress(t)
        }
    },
    destroy: function() {
        this.unAll(), this.container.removeChild(this.wrapper), this.wrapper = null
    },
    createElements: function() {},
    updateWidth: function() {},
    drawWave: function() {},
    clearWave: function() {},
    updateProgress: function() {}
}, WaveSurfer.util.extend(WaveSurfer.Drawer, WaveSurfer.Observer), WaveSurfer.Drawer.Canvas = Object.create(WaveSurfer.Drawer), WaveSurfer.util.extend(WaveSurfer.Drawer.Canvas, {
    createElements: function() {
        var t = this.wrapper.appendChild(this.style(document.createElement("canvas"), {
            position: "absolute",
            zIndex: 1
        }));
        if (this.waveCc = t.getContext("2d"), this.progressWave = this.wrapper.appendChild(this.style(document.createElement("wave"), {
                position: "absolute",
                zIndex: 2,
                overflow: "hidden",
                width: "0",
                height: this.params.height + "px",
                borderRightStyle: "solid",
                borderRightWidth: this.params.cursorWidth + "px",
                borderRightColor: this.params.cursorColor
            })), this.params.waveColor != this.params.progressColor) {
            var e = this.progressWave.appendChild(document.createElement("canvas"));
            this.progressCc = e.getContext("2d")
        }
    },
    updateWidth: function() {
        var t = Math.round(this.width / this.params.pixelRatio);
        this.waveCc.canvas.width = this.width, this.waveCc.canvas.height = this.height, this.style(this.waveCc.canvas, {
            width: t + "px"
        }), this.progressCc && (this.progressCc.canvas.width = this.width, this.progressCc.canvas.height = this.height, this.style(this.progressCc.canvas, {
            width: t + "px"
        })), this.clearWave()
    },
    clearWave: function() {
        this.waveCc.clearRect(0, 0, this.width, this.height), this.progressCc && this.progressCc.clearRect(0, 0, this.width, this.height)
    },
    drawWave: function(t, e) {
        var i = .5 / this.params.pixelRatio;
        this.waveCc.fillStyle = this.params.waveColor, this.progressCc && (this.progressCc.fillStyle = this.params.progressColor);
        var r = this.height / 2,
            s = r / e,
            a = t.length,
            n = 1;
        this.params.fillParent && this.width != a && (n = this.width / t.length), this.waveCc.beginPath(), this.waveCc.moveTo(i, r), this.progressCc && (this.progressCc.beginPath(), this.progressCc.moveTo(i, r));
        for (var o = 0; a > o; o++) {
            var h = Math.round(t[o] * s);
            this.waveCc.lineTo(o * n + i, r + h), this.progressCc && this.progressCc.lineTo(o * n + i, r + h)
        }
        this.waveCc.lineTo(this.width + i, r), this.progressCc && this.progressCc.lineTo(this.width + i, r), this.waveCc.moveTo(i, r), this.progressCc && this.progressCc.moveTo(i, r);
        for (var o = 0; a > o; o++) {
            var h = Math.round(t[o] * s);
            this.waveCc.lineTo(o * n + i, r - h), this.progressCc && this.progressCc.lineTo(o * n + i, r - h)
        }
        this.waveCc.lineTo(this.width + i, r), this.waveCc.fill(), this.progressCc && (this.progressCc.lineTo(this.width + i, r), this.progressCc.fill()), this.waveCc.fillRect(0, r - i, this.width, i)
    },
    updateProgress: function(t) {
        var e = Math.round(this.width * t) / this.params.pixelRatio;
        this.style(this.progressWave, {
            width: e + "px"
        })
    }
});
//# sourceMappingURL=wavesurfer-js-map.json