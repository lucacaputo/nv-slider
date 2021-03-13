const { styler, spring } = popmotion;

class Slider {
    constructor(domNode, options={
        margin: 10,
        slidesToShow: 5,
        slideWidth: 'auto',
        arrows: true,
        inactiveScaling: .7,
    }) {
        this.domNode = domNode;
        this.options = options;
        this.track = document.createElement("div");
        this.sTrack = styler(this.track);
        this.track.className = "_nv_track";
        this.arrows = null;
        this.isTransitioning = false;
        this.state = {
            slides: [...domNode.querySelectorAll('._nv_slide')],
            styledSlides: [...domNode.querySelectorAll('._nv_slide')].map(styler),
            activeSlide: 0,
        }

        this._init();
    }

    clamp = (num, hi, lo) => {
        if (num > hi) return hi;
        if (num < lo) return lo;
        return num;
    }

    _calculateSlideWidth() {
        const { slideWidth, margin, slidesToShow, inactiveScaling } = this.options;
        const cw = this.domNode.clientWidth;
        const contWidth = (cw / inactiveScaling) - (cw/slidesToShow - (cw/slidesToShow*inactiveScaling)) - (margin * slidesToShow);
        if (this.options.slideWidth === 'auto') {
            return (contWidth/slidesToShow) - (margin*2);
        }
        if (typeof slideWidth === 'string') {
            if (/px/g.test(slideWidth)) {
                return parseInt(slideWidth);
            }
            if (/%/g.test(slideWidth)) {
                return (contWidth / parseInt(slideWidth)) - (margin * 2);
            }
            throw new Error("measuring unit not supported");
        } else if (typeof slideWidth === 'number') {
            return slideWidth - (margin * 2);
        } else {
            throw new Error("width type not valid");
        }
    }

    _createArrows() {
        const [leftArr, rightArr] = [document.createElement("div"), document.createElement("div")];
        leftArr.className = "_nv_arr _nv_left_arr";
        rightArr.className = "_nv_arr _nv_right_arr";
        leftArr.innerHTML = "&lt;";
        rightArr.innerHTML = "&gt;";
        this.domNode.appendChild(leftArr);
        this.domNode.appendChild(rightArr);
        this.arrows = { leftArr, rightArr };
    }

    _setHeight() {
        this.domNode.style.height = `${this.state.slides[0].clientHeight}px`;
    }

    _getOffsets(slideWidth) {
        const { activeSlide } = this.state;
        const { margin, inactiveScaling } = this.options;
        const scaledSlide = slideWidth * inactiveScaling;
        return this.state.slides.map((_, i) => {
            let offset = 0;
            if (i === activeSlide) {
                offset = scaledSlide * i + margin;
            } else if (i > activeSlide) {
                offset = (scaledSlide * i) + (slideWidth - scaledSlide) / 2 + margin;
            } else if (i === 0) {
                offset = -(slideWidth - scaledSlide) / 2 + margin;
            } else if (i < activeSlide) {
                offset = (scaledSlide * i) - (slideWidth - scaledSlide) / 2 + margin;
            } else {
                offset = (scaledSlide * i)
            }
            return offset + margin * i;
        })
    }

    _setOffsets() {
        const slideWidth = this._calculateSlideWidth();
        const leftOffset = this._getOffsets(slideWidth);
        const { styledSlides, activeSlide } = this.state;
        const { inactiveScaling } = this.options;
        styledSlides.forEach((s, i) => {
            spring({
                from: { x: s.get('x'), opacity: s.get('opacity'), scale: s.get('scale') },
                to: { x: leftOffset[i], opacity: 1, scale: i === activeSlide ? 1 : inactiveScaling },
            }).start(s.set);
        });
    }

    _setTrackLength(slideWidth) {
        const trackLength = slideWidth * this.state.slides.length;
        this.track.style.width = `${trackLength}px`;
    }

    _moveTrack(direction) {
        const slideWidth = this._calculateSlideWidth();
        const { inactiveScaling, margin } = this.options;
        const { activeSlide, slides } = this.state;
        const trackX = this.track.getBoundingClientRect().x;
        const slx = slides[activeSlide].getBoundingClientRect().x;
        let offset = direction === 'right' ? 
            (trackX - slx) + (slideWidth * inactiveScaling) / 2 - margin : 
            trackX - slx + margin
        spring({
            from: { x: this.sTrack.get('x') },
            to: { x: Math.floor(offset) }
        }).start(this.sTrack.set);
    }

    _setSlideWidth(slideWidth) {
        this.state.slides.forEach(s => s.style.width = `${slideWidth}px`);
    }

    _init() {
        const { arrows } = this.options;
        const slideWidth = this._calculateSlideWidth();
        this._setSlideWidth(slideWidth);
        this.state.slides.forEach(slide => this.track.appendChild(slide));
        this.domNode.appendChild(this.track);
        this._setTrackLength(slideWidth);
        this._setOffsets();
        if (arrows) {
            this._createArrows();
        }
        window.addEventListener("load", this._setHeight.bind(this));
        this.arrows.leftArr.addEventListener("click", () => {
            this.isTransitioning = true;
            this._setState(s => {
                return {
                    activeSlide: this.clamp(s.activeSlide - 1, s.slides.length - 1, 0),
                }
            });
        });
        this.arrows.rightArr.addEventListener("click", () => {
            this.isTransitioning = true;
            this._setState(s => {
                return {
                    activeSlide: this.clamp(s.activeSlide + 1, s.slides.length - 1, 0),
                }
            });
        });
        window.addEventListener('resize', () => {
            const w = this._calculateSlideWidth();
            this._setSlideWidth(w);
            this._setTrackLength(w);
            this._setHeight();
            this._setOffsets();
        });
    }

    _setState(newState) {
        let updatedState;
        if (typeof newState === 'function') {
            updatedState = {
                ...this.state,
                ...newState(this.state),
            }
        } else {
            updatedState = {
                ...this.state,
                ...newState,
            }
        }
        let prevState = { ...this.state };
        this.state = updatedState;
        this._mapState(prevState, this.state);
    }

    _mapState(prev, curr) {
        if (curr.activeSlide > prev.activeSlide) {
            this._moveTrack("right");
        } else {
            this._moveTrack("left");
        }
        this._setOffsets();
        this.isTransitioning = false;
    }

}