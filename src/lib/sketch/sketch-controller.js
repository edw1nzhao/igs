/*
This class holds variables that control program flow and are dynamically updated by user
It also holds various mapping methods that map data values from different classes across the program
*/

import ConfigStore from '../../stores/configStore';
import TimelineStore from '../../stores/timelineStore';

let timeline;
let isPathColorMode;

TimelineStore.subscribe((data) => {
	timeline = data;
});

ConfigStore.subscribe((data) => {
	isPathColorMode = data.isPathColorMode;
});

export class SketchController {
	constructor(sketch) {
		this.sk = sketch;
	}

	updateAnimation() {
		if (timeline.getCurrTime() < timeline.getEndTime()) this.continueAnimation();
		else this.endAnimation();
	}

	continueAnimation() {
		let timeToSet = 0;
		const animationRate = 0.05; // TODO: this would get a value from the animation slider in the interface
		if (this.sk.videoController.isLoadedAndIsPlaying()) timeToSet = this.sk.videoController.getVideoPlayerCurTime();
		else timeToSet = timeline.getCurrTime() + animationRate;
		TimelineStore.update((timeline) => {
			timeline.setCurrTime(timeToSet);
			return timeline;
		});
	}

	endAnimation() {
		TimelineStore.update((timeline) => {
			timeline.setIsAnimating(false);
			return timeline;
		});
	}

	getIsAnimate() {
		return timeline.getIsAnimating();
	}

	mapToSelectTimeThenPixelTime(value) {
		return this.mapSelectTimeToPixelTime(timeline.mapPixelTimeToSelectTime(value));
	}

	mapSelectTimeToPixelTime(value) {
		const spaceTimeCubeBottom = this.sk.height / 10;
		const spaceTimeCubeTop = this.sk.height / 1.6;
		if (this.sk.handle3D.getIs3DMode())
			return this.sk.map(value, timeline.getTimelineLeftMarkerXPos(), timeline.getTimelineRightMarkerXPos(), spaceTimeCubeBottom, spaceTimeCubeTop);
		else return timeline.mapSelectTimeToPixelTime2D(value);
	}
}
