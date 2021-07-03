/*
CREDITS/LICENSE INFORMATION: 
This software is written in JavaScript and p5.js and uses YouTube and Kaltura Video Player APIs and the PapaParse library by Matt Holt for CSV file processing. 
This software is licensed under the GNU General Public License Version 2.0. 
See the GNU General Public License included with this software for more details. 
Classroom discussion example data is used with special permission from Mathematics Teaching and Learning to Teach (MTLT), 
University of Michigan. (2010). Sean Numbers-Ofala. Classroom science lesson data is made possible by the researchers 
and teachers who created The Third International Mathematics and Science Study (TIMSS) 1999 Video Study. 
IGS software was originally developed by Ben Rydal Shapiro at Vanderbilt University 
as part of his dissertation titled Interaction Geography & the Learning Sciences. 
Copyright (C) 2018 Ben Rydal Shapiro, and contributors. 
To reference or read more about this work please see: 
https://etd.library.vanderbilt.edu/available/etd-03212018-140140/unrestricted/Shapiro_Dissertation.pdf
*/

/**
 * Classes/modules treated as singletons with respective .js file/module
 */
let core;
let setData;
let controller;
let processData;
let testData;
let keys;
let handlers;
let videoPlayer; // abstract class for different play classes instantiated/updated in processVideo method (see video-player.js)

/**
 * Constants
 */
const CSVHEADERS_MOVEMENT = ['time', 'x', 'y']; // String array indicating movement movement file headers, data in each column should be of type number or it won't process
const CSVHEADERS_CONVERSATION = ['time', 'speaker', 'talk']; // String array indicating conversation file headers, data in time column shout be of type number, speaker column should be of type String, talk column should be not null or undefined
const COLOR_LIST = ['#6a3d9a', '#ff7f00', '#33a02c', '#1f78b4', '#e31a1c', '#ffff99', '#b15928', '#cab2d6', '#fdbf6f', '#b2df8a', '#a6cee3', '#fb9a99']; // 12 Class Paired: (Dark) purple, orange, green, blue, red, yellow, brown, (Light) lPurple, lOrange, lGreen, lBlue, lRed
const BUTTON_NAMES = ["Animate", "Align Talk", "All Talk", "Video", "How to Use"];
let font_Lato;


function preload() {
    font_Lato = loadFont("data/fonts/Lato-Light.ttf");
}

function setup() {
    canvas = createCanvas(window.innerWidth, window.innerHeight, P2D);
    core = new Core();
    keys = new Keys();
    controller = new Controller();
    processData = new ProcessData();
    testData = new TestData();
    handlers = new Handlers();
}

/**
 * Organizes draw loop depending on data that has been loaded and animation state
 */
function draw() {
    background(255);
    if (testData.dataIsLoaded(core.floorPlan)) image(core.floorPlan, 0, 0, keys.displayFloorPlanWidth, keys.displayFloorPlanHeight);
    if (testData.dataIsLoaded(core.paths) && testData.dataIsLoaded(core.speakerList)) setMovementAndConversationData();
    else if (testData.dataIsLoaded(core.paths)) setMovementData();
    if (testData.dataIsLoaded(videoPlayer) && core.isModeVideoShowing) setVideoPosition();
    keys.drawKeys(); // draw keys last
    if (core.isModeAnimate) loop();
    else noLoop();
}

/**
 * Organizes drawing methods for movement and conversation including slicer line and conversation bubble
 */
function setMovementAndConversationData() {
    let drawConversationData = new DrawDataConversation();
    let drawMovementData = new DrawDataMovement();
    for (let i = 0; i < core.paths.length; i++) {
        if (core.paths[i].show) {
            drawConversationData.setData(core.paths[i]);
            drawMovementData.setData(core.paths[i]); // draw after conversation so bug displays on top
        }
    }
    if (handlers.overRect(keys.timelineStart, 0, keys.timelineLength, keys.timelineHeight)) keys.drawSlicer(); // draw slicer line after calculating all movement
    drawConversationData.setConversationBubble(); // draw conversation text last so it displays on top
    if (core.isModeAnimate) this.setUpAnimation();
}

/**
 * Organizes drawing methods for movement only
 */
function setMovementData() {
    let drawMovementData = new DrawDataMovement();
    for (let i = 0; i < core.paths.length; i++) {
        if (core.paths[i].show) drawMovementData.setData(core.paths[i]); // draw after conversation so bug displays on top
    }
    if (handlers.overRect(keys.timelineStart, 0, keys.timelineLength, keys.timelineHeight)) keys.drawSlicer(); // draw slicer line after calculating all movement
    if (core.isModeAnimate) this.setUpAnimation();
}

/**
 * Updates animation mode variable depending on animation state
 */
function setUpAnimation() {
    let animationIncrementRateDivisor = 1000; // this seems to work best
    // Get amount of time in seconds currently displayed
    let curTimeIntervalInSeconds = map(keys.curPixelTimeMax, keys.timelineStart, keys.timelineEnd, 0, core.totalTimeInSeconds) - map(keys.curPixelTimeMin, keys.timelineStart, keys.timelineEnd, 0, core.totalTimeInSeconds);
    // set increment value based on that value/divisor to keep constant core.isModeAnimate speed regardless of time interval selected
    let animationIncrementValue = curTimeIntervalInSeconds / animationIncrementRateDivisor;
    if (core.animationCounter < map(keys.curPixelTimeMax, keys.timelineStart, keys.timelineEnd, 0, core.totalTimeInSeconds)) core.animationCounter += animationIncrementValue; // updates core.isModeAnimate
    else core.isModeAnimate = false;
}
/**
 * Updates video position to curMousePosition and calls scrubbing method if not playing
 */
function setVideoPosition() {
    if (!core.isModeVideoPlaying) this.setVideoScrubbing();
    select('#moviePlayer').position(mouseX - videoPlayer.videoWidth, mouseY - videoPlayer.videoHeight);
}
/**
 * Updates time selected in video depending on mouse position or core.isModeAnimate over timeline
 */
function setVideoScrubbing() {
    if (core.isModeAnimate) {
        let startValue = map(keys.curPixelTimeMin, keys.timelineStart, keys.timelineEnd, 0, Math.floor(videoPlayer.getVideoDuration())); // remap starting point to seek for video
        let endValue = map(keys.curPixelTimeMax, keys.timelineStart, keys.timelineEnd, 0, Math.floor(videoPlayer.getVideoDuration())); // remap starting point to seek for video
        let vPos = Math.floor(map(core.bugTimePosForVideoScrubbing, keys.timelineStart, keys.timelineEnd, startValue, endValue));
        videoPlayer.seekTo(vPos);
    } else if (handlers.overRect(keys.timelineStart, 0, keys.timelineEnd, keys.timelineHeight)) {
        let mPos = map(mouseX, keys.timelineStart, keys.timelineEnd, keys.curPixelTimeMin, keys.curPixelTimeMax); // first map mouse to selected time values in GUI
        // must floor vPos to prevent double finite error
        let vPos = Math.floor(map(mPos, keys.timelineStart, keys.timelineEnd, 0, Math.floor(videoPlayer.getVideoDuration())));
        videoPlayer.seekTo(vPos);
        videoPlayer.pause(); // Add to prevent accidental video playing that seems to occur
    }
}

function mousePressed() {
    handlers.handleMousePressed();
    loop(); // Update all drawing if mouse pressed
}

function mouseDragged() {
    handlers.handleMouseDragged();
    loop(); // Update all drawing if mouse dragged
}

function mouseReleased() {
    handlers.handleMouseReleased();
    loop(); // Update all drawing if mouse released
}

function mouseMoved() {
    loop(); // Update all drawing if mouse moves
}