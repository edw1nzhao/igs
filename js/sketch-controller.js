class SketchController {

    constructor(sketch) {
        this.sk = sketch;
        this.mode = {
            isAnimate: false,
            isAlignTalk: false,
            isAllTalk: true,
            isIntro: true,
            isVideoPlay: false,
            isVideoShow: false
        }
        this.animationCounter = 0; // counter to synchronize animation across all data
        this.bugTimeForVideoScrub = null; // Set in draw movement data and used to display correct video frame when scrubbing video
    }

    updateLoop() {
        if (this.mode.isAnimate || this.mode.isVideoPlay) this.sk.loop();
        else this.sk.noLoop();
    }

    startLoop() {
        this.sk.loop();
    }

    handleMousePressed() {
        if (this.testVideoToPlay() && this.sk.keys.overSpaceTimeView(this.sk.mouseX, this.sk.mouseY)) this.playPauseMovie();
        this.sk.keys.handleKeys(this.sk.core.paths, this.sk.core.speakerList);
    }

    handleMouseDragged() {
        if (!this.mode.isAnimate && ((this.sk.keys.timeline.isLockedLeft || this.sk.keys.timeline.isLockedRight) || this.sk.keys.overTimelineAxisRegion())) this.sk.keys.handleTimeline();
    }

    handleMouseReleased() {
        this.sk.keys.timeline.isLockedLeft = false;
        this.sk.keys.timeline.isLockedRight = false;
    }

    updateAnimationCounter() {
        if (this.mode.isAnimate) this.animationCounter = this.mapFromPixelToTotalTime(this.sk.keys.timeline.selectEnd);
        else this.animationCounter = this.mapFromPixelToTotalTime(this.sk.keys.timeline.selectStart);
        this.setIsAnimate(!this.mode.isAnimate);
    }

    updateAnimation() {
        if (this.mode.isAnimate) {
            const animationIncrementRateDivisor = 1000; // this divisor seems to work best
            const curTimeIntervalInSeconds = this.mapFromPixelToTotalTime(this.sk.keys.timeline.selectEnd) - this.mapFromPixelToTotalTime(this.sk.keys.timeline.selectStart); // Get amount of time in seconds currently displayed
            const animationIncrementValue = curTimeIntervalInSeconds / animationIncrementRateDivisor; // set increment value based on that value/divisor to keep constant sketchController.mode.isAnimate speed regardless of time interval selected
            if (this.animationCounter < this.mapFromPixelToTotalTime(this.sk.keys.timeline.selectEnd)) this.animationCounter += animationIncrementValue;
            else this.setIsAnimate(false);
        }
    }

    updateVideoDisplay() {
        if (this.mode.isVideoShow) {
            this.sk.core.videoPlayer.updatePos(this.sk.mouseX, this.sk.mouseY, 100);
            if (!this.mode.isVideoPlay) this.setVideoScrubbing();
        }
    }

    setVideoScrubbing() {
        if (this.mode.isAnimate) {
            const vPos = Math.floor(this.sk.map(this.bugTimeForVideoScrub, this.sk.keys.timeline.start, this.sk.keys.timeline.end, this.mapFromPixelToVideoTime(this.sk.keys.timeline.selectStart), this.mapFromPixelToVideoTime(this.sk.keys.timeline.selectEnd)));
            this.sk.core.videoPlayer.seekTo(vPos);
        } else if (this.sk.keys.overSpaceTimeView(this.sk.mouseX, this.sk.mouseY)) {
            const vPos = Math.floor(this.mapFromPixelToVideoTime(this.mapFromPixelToSelectedTime(this.sk.mouseX)));
            this.sk.core.videoPlayer.seekTo(vPos);
            this.sk.core.videoPlayer.pause(); // Add to prevent accidental video playing that seems to occur
        }
    }

    toggleVideoShowHide() {
        if (this.mode.isVideoShow) {
            this.sk.core.videoPlayer.pause();
            this.sk.core.videoPlayer.hide();
            this.setVideoPlay(false);
            this.setVideoShow(false);
        } else {
            this.sk.core.videoPlayer.show();
            this.setVideoShow(true);
        }
    }

    playPauseMovie() {
        if (this.mode.isVideoPlay) {
            this.sk.core.videoPlayer.pause();
            this.setVideoPlay(false);
        } else {
            const tPos = this.mapFromPixelToVideoTime(this.mapFromPixelToSelectedTime(this.sk.mouseX));
            this.sk.core.videoPlayer.play();
            this.sk.core.videoPlayer.seekTo(tPos);
            this.setVideoPlay(true);
        }
    }

    getScaledPointValues(point, view) {
        const pixelTime = this.sk.map(point.time, 0, this.sk.core.totalTimeInSeconds, this.sk.keys.timeline.start, this.sk.keys.timeline.end);
        const scaledTime = this.sk.map(pixelTime, this.sk.keys.timeline.selectStart, this.sk.keys.timeline.selectEnd, this.sk.keys.timeline.start, this.sk.keys.timeline.end);
        const scaledXPos = point.xPos * this.sk.keys.floorPlan.width / this.sk.core.floorPlan.inputPixelWidth;
        const scaledYPos = point.yPos * this.sk.keys.floorPlan.height / this.sk.core.floorPlan.inputPixelHeight;
        let scaledSpaceTimeXPos;
        if (view === this.sk.PLAN) scaledSpaceTimeXPos = scaledXPos;
        else if (view === this.sk.SPACETIME) scaledSpaceTimeXPos = scaledTime;
        else scaledSpaceTimeXPos = this.sk.NO_DATA;
        return {
            pixelTime,
            scaledTime,
            scaledXPos,
            scaledYPos,
            scaledSpaceTimeXPos
        };
    }

    testMovementPointToDraw(curPoint) {
        return this.sk.keys.overTimelineAxis(curPoint.pixelTime) && this.sk.keys.overFloorPlan(curPoint.scaledXPos, curPoint.scaledYPos) && this.testAnimation(curPoint.pixelTime);
    }
    /**
     * Test if point is in user view
     * @param  {ConversationPoint} curPoint
     */
    testConversationPointToDraw(curPoint) {
        return this.sk.keys.overTimelineAxis(curPoint.pixelTime) && this.sk.keys.overFloorPlan(curPoint.scaledXPos, curPoint.scaledYPos) && this.testAnimation(curPoint.pixelTime) && this.sk.keys.overFloorPlanAndCursor(curPoint.scaledXPos, curPoint.scaledYPos);
    }

    /**
     * @param  {Number/Float} timeValue
     */
    testAnimation(value) {
        if (this.mode.isAnimate) return this.animationCounter > this.mapFromPixelToTotalTime(value);
        else return true;
    }

    testVideoToPlay() {
        return this.sk.testData.dataIsLoaded(this.sk.core.videoPlayer) && this.mode.isVideoShow && !this.mode.isAnimate && this.sk.keys.overSpaceTimeView(this.sk.mouseX, this.sk.mouseY);
    }

    // map to inverse, values constrained between 10 and 1 (pixels)
    mapConversationRectRange() {
        return this.sk.map(this.sk.core.totalTimeInSeconds, 0, 3600, 10, 1, true)
    }

    mapFromPixelToTotalTime(value) {
        return this.sk.map(value, this.sk.keys.timeline.start, this.sk.keys.timeline.end, 0, this.sk.core.totalTimeInSeconds);
    }

    mapFromTotalToPixelTime(value) {
        return this.sk.map(value, 0, this.sk.core.totalTimeInSeconds, this.sk.keys.timeline.start, this.sk.keys.timeline.end);
    }

    mapFromPixelToVideoTime(value) {
        return Math.floor(this.sk.map(value, this.sk.keys.timeline.start, this.sk.keys.timeline.end, 0, Math.floor(this.sk.core.videoPlayer.getVideoDuration()))); // must floor vPos to prevent double finite error
    }

    mapFromPixelToSelectedTime(value) {
        return this.sk.map(value, this.sk.keys.timeline.start, this.sk.keys.timeline.end, this.sk.keys.timeline.selectStart, this.sk.keys.timeline.selectEnd);
    }

    mapFromVideoToSelectedTime() {
        const timelinePos = this.sk.map(this.sk.core.videoPlayer.getCurrentTime(), 0, this.sk.core.totalTimeInSeconds, this.sk.keys.timeline.start, this.sk.keys.timeline.end);
        return this.sk.map(timelinePos, this.sk.keys.timeline.selectStart, this.sk.keys.timeline.selectEnd, this.sk.keys.timeline.start, this.sk.keys.timeline.end);
    }

    setSpeakerShow(speaker) {
        speaker.isShowing = !speaker.isShowing;
    }

    setPathShow(path) {
        path.isShowing = !path.isShowing;
    }

    setIsAnimate(value) {
        this.mode.isAnimate = value;
    }

    setAlignTalk(value) {
        this.mode.isAlignTalk = value;
    }

    setAllTalk(value) {
        this.mode.isAllTalk = value;
    }

    setIntro(value) {
        this.mode.isIntro = value;
    }

    setVideoPlay(value) {
        this.mode.isVideoPlay = value;
    }

    setVideoShow(value) {
        this.mode.isVideoShow = value;
    }
}