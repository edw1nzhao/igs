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
        this.rotation = {
            curMode: 0,
            modeList: ["none", "mode_90", "mode_180", "mode_270"],
        }
        this.select = {
            curMode: 0
        }
        this.animationCounter = 0; // counter to synchronize animation across all data
        this.bugTimeForVideoScrub = null; // Set in draw movement data and used to display correct video frame when scrubbing video
    }

    // ****** P5 HANDLERS ****** //
    updateLoop() {
        if (this.mode.isAnimate || this.mode.isVideoPlay) this.sk.loop();
        else this.sk.noLoop();
    }

    startLoop() {
        this.sk.loop();
    }

    handleMousePressed() {
        if (this.testVideoToPlay() && this.sk.keys.overSpaceTimeView(this.sk.mouseX, this.sk.mouseY)) this.playPauseMovie();
        else this.sk.keys.handleKeys(this.sk.core.paths, this.sk.core.speakerList, this.select.curMode);
    }

    handleMouseDragged() {
        if (!this.mode.isAnimate) this.sk.keys.handleTimeline();
    }

    handleMouseReleased() {
        this.sk.keys.handleResetTimelineLock();
    }

    // ****** UPDATE METHODS ****** //
    updateAnimationCounter() {
        if (this.mode.isAnimate) this.animationCounter = this.mapFromPixelToTotalTime(this.sk.keys.getCurTimelineSelectEnd());
        else this.animationCounter = this.mapFromPixelToTotalTime(this.sk.keys.getCurTimelineSelectStart());
        this.setIsAnimate(!this.mode.isAnimate);
    }

    updateAnimation() {
        if (this.mode.isAnimate) {
            const animationIncrementRateDivisor = 1000; // this divisor seems to work best
            const curTimeIntervalInSeconds = this.mapFromPixelToTotalTime(this.sk.keys.getCurTimelineSelectEnd()) - this.mapFromPixelToTotalTime(this.sk.keys.getCurTimelineSelectStart()); // Get amount of time in seconds currently displayed
            const animationIncrementValue = curTimeIntervalInSeconds / animationIncrementRateDivisor; // set increment value based on that value/divisor to keep constant sketchController.mode.isAnimate speed regardless of time interval selected
            if (this.animationCounter < this.mapFromPixelToTotalTime(this.sk.keys.getCurTimelineSelectEnd())) this.animationCounter += animationIncrementValue;
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
            const vPos = Math.floor(this.sk.map(this.bugTimeForVideoScrub, this.sk.keys.getTimelineStart(), this.sk.keys.getTimelineEnd(), this.mapFromPixelToVideoTime(this.sk.keys.getCurTimelineSelectStart()), this.mapFromPixelToVideoTime(this.sk.keys.getCurTimelineSelectEnd())));
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

    // TODO:
    getSelectMode() {
        return this.select.curMode;
    }

    setSelectMode(value) {
        this.select.curMode = value;
    }
    /**
     * Sets drawing strokeWeights for movement data depending on current selection mode
     */
    // TODO: address use of numbers for comparison
    getWeightsFromSelectMode() {
        if (this.select.curMode === 3) return [1, 0];
        else if (this.select.curMode === 4) return [0, 10];
        else return [1, 10];
    }

    testSelectModeForRegion() {
        return this.select.curMode === 1;
    }


    // ****** ROTATION METHODS ****** //
    testNoRotation() {
        return this.getRotationMode() === this.rotation.modeList[0];
    }

    getRotationMode() {
        return this.rotation.modeList[this.rotation.curMode];
    }

    setRotateRight() {
        this.rotation.curMode++;
        if (this.rotation.curMode > 3) this.rotation.curMode = 0;
    }

    setRotateLeft() {
        this.rotation.curMode--;
        if (this.rotation.curMode < 0) this.rotation.curMode = 3;
    }

    // ****** DRAW HELPER METHODS ****** //
    /**
     * Returns properly scaled pixel values to GUI from data points
     * @param  {Movement Or Conversation Point} point
     * @param  {Integer} view
     */
    getScaledPointValues(point, view) {
        const pixelTime = this.mapFromTotalToPixelTime(point.time);
        const scaledTime = this.mapFromSelectPixelToTimeline(pixelTime);
        const [scaledXPos, scaledYPos] = this.getScaledXYPos(point.xPos, point.yPos);
        let scaledSpaceTimeXPos;
        if (view === this.sk.PLAN) scaledSpaceTimeXPos = scaledXPos;
        else if (view === this.sk.SPACETIME) scaledSpaceTimeXPos = scaledTime;
        else scaledSpaceTimeXPos = null;
        return {
            pixelTime,
            scaledTime,
            scaledXPos,
            scaledYPos,
            scaledSpaceTimeXPos
        };
    }

    /**
     * Converts x/y pixel positions from data point to floor plan and current floor plan rotation angle
     * @param  {Float} xPos
     * @param  {Float} yPos
     */
    getScaledXYPos(xPos, yPos) {
        let scaledXPos, scaledYPos;
        switch (this.getRotationMode()) {
            case this.rotation.modeList[0]:
                scaledXPos = xPos * this.sk.keys.floorPlanContainer.width / this.sk.core.inputFloorPlan.width;
                scaledYPos = yPos * this.sk.keys.floorPlanContainer.height / this.sk.core.inputFloorPlan.height;
                return [scaledXPos, scaledYPos];
            case this.rotation.modeList[1]:
                scaledXPos = this.sk.keys.floorPlanContainer.width - (yPos * this.sk.keys.floorPlanContainer.width / this.sk.core.inputFloorPlan.height);
                scaledYPos = xPos * this.sk.keys.floorPlanContainer.height / this.sk.core.inputFloorPlan.width;
                return [scaledXPos, scaledYPos];
            case this.rotation.modeList[2]:
                scaledXPos = this.sk.keys.floorPlanContainer.width - (xPos * this.sk.keys.floorPlanContainer.width / this.sk.core.inputFloorPlan.width);
                scaledYPos = this.sk.keys.floorPlanContainer.height - (yPos * this.sk.keys.floorPlanContainer.height / this.sk.core.inputFloorPlan.height);
                return [scaledXPos, scaledYPos];
            case this.rotation.modeList[3]:
                scaledXPos = yPos * this.sk.keys.floorPlanContainer.width / this.sk.core.inputFloorPlan.height;
                scaledYPos = this.sk.keys.floorPlanContainer.height - xPos * this.sk.keys.floorPlanContainer.height / this.sk.core.inputFloorPlan.width;
                return [scaledXPos, scaledYPos];
        }
    }

    /**
     * Test if point is in user view
     * @param  {MovementPoint} curPoint
     */
    testMovementPointToDraw(curPoint) {
        return this.sk.keys.overTimelineAxis(curPoint.pixelTime) && this.sk.keys.overFloorPlan(curPoint.scaledXPos, curPoint.scaledYPos) && this.testAnimation(curPoint.pixelTime);
    }
    /**
     * Test if point is in user view
     * @param  {ConversationPoint} curPoint
     */
    testConversationPointToDraw(curPoint) {
        return this.sk.keys.overTimelineAxis(curPoint.pixelTime) && this.sk.keys.overFloorPlan(curPoint.scaledXPos, curPoint.scaledYPos) && this.testAnimation(curPoint.pixelTime) && this.testSelectMode(curPoint.scaledXPos, curPoint.scaledYPos);
    }

    // TODO:
    testSelectMode(xPos, yPos) {
        if (this.testSelectModeForRegion()) return this.sk.keys.overCursor(xPos, yPos);
        else return true;
    }

    /**
     * @param  {Number/Float} value
     */
    testAnimation(value) {
        if (this.mode.isAnimate) return this.animationCounter > this.mapFromPixelToTotalTime(value);
        else return true;
    }

    testVideoToPlay() {
        return this.sk.testData.dataIsLoaded(this.sk.core.videoPlayer) && this.mode.isVideoShow && !this.mode.isAnimate && this.sk.keys.overSpaceTimeView(this.sk.mouseX, this.sk.mouseY);
    }

    // ****** MAP DATA METHODS ****** //
    /**
     * Sets conversation rectangle scaling range (size of rectangles as timeline is rescaled)
     */
    mapConversationRectRange() {
        return this.sk.map(this.sk.core.totalTimeInSeconds, 0, 3600, 10, 1, true); // map to inverse, values constrained between 10 and 1 (pixels)
    }

    // map to inverse of min/max to set rectWidth based on amount of pixel time selected
    mapRectInverse(rectMaxPixelWidth, rectMinPixelWidth) {
        return this.sk.map(this.sk.keys.getCurTimelineSelectEnd() - this.sk.keys.getCurTimelineSelectStart(), 0, this.sk.keys.getTimelineEnd() - this.sk.keys.getTimelineStart(), rectMaxPixelWidth, rectMinPixelWidth);
    }

    mapFromVideoToSelectedTime() {
        const timelinePos = this.mapFromTotalToPixelTime(this.sk.core.videoPlayer.getCurrentTime());
        return this.mapFromSelectPixelToTimeline(timelinePos);
    }

    mapFromPixelToTotalTime(value) {
        return this.sk.map(value, this.sk.keys.getTimelineStart(), this.sk.keys.getTimelineEnd(), 0, this.sk.core.totalTimeInSeconds);
    }

    mapFromSelectPixelToTimeline(value) {
        return this.sk.map(value, this.sk.keys.getCurTimelineSelectStart(), this.sk.keys.getCurTimelineSelectEnd(), this.sk.keys.getTimelineStart(), this.sk.keys.getTimelineEnd());
    }

    mapFromTotalToPixelTime(value) {
        return this.sk.map(value, 0, this.sk.core.totalTimeInSeconds, this.sk.keys.getTimelineStart(), this.sk.keys.getTimelineEnd());
    }

    mapFromPixelToVideoTime(value) {
        return Math.floor(this.sk.map(value, this.sk.keys.getTimelineStart(), this.sk.keys.getTimelineEnd(), 0, Math.floor(this.sk.core.videoPlayer.getVideoDuration()))); // must floor vPos to prevent double finite error
    }

    mapFromPixelToSelectedTime(value) {
        return this.sk.map(value, this.sk.keys.getTimelineStart(), this.sk.keys.getTimelineEnd(), this.sk.keys.getCurTimelineSelectStart(), this.sk.keys.getCurTimelineSelectEnd());
    }

    // ****** SETTERS ****** //

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