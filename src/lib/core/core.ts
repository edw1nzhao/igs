/**
 * This class holds core program data and associated parsing methods from processed CSV files.
 * Separate parsing classes for movement, conversation, and code CSV files test parsed data from PapaParse
 * results and generate different data structures
 * These data structures are integrated into a Path object which is the central data structure for the IGS
 * Original data from each CSV file is stored within each parsing class for re-processing as new data is loaded
 * Each time CSV file is successfully loaded and parsed, domController is called to update GUI elements
 *
 */
import type p5 from 'p5';
import Papa from 'papaparse';

import { CoreUtils } from './core-utils.js';

import { DataPoint } from '../../models/dataPoint.js';
import { User } from '../../models/user.js';
import { USER_COLORS } from '../constants/index.js';

import UserStore from '../../stores/userStore';
import CodeStore from '../../stores/codeStore.js';
import TimelineStore from '../../stores/timelineStore';
import ConfigStore from '../../stores/configStore.js';

let timeline, maxStopLength;

TimelineStore.subscribe((data) => {
	timeline = data;
});

ConfigStore.subscribe((data) => {
	maxStopLength = data.maxStopLength;
});

export class Core {
	sketch: p5;
	coreUtils: CoreUtils;

	constructor(sketch: p5) {
		this.sketch = sketch;
		this.coreUtils = new CoreUtils();
	}

	handleUserLoadedFiles = async (event: Event) => {
		this.clearExistingData();
		const input = event.target as HTMLInputElement;
		for (let i = 0; i < input.files.length; i++) {
			const file = input.files ? input.files[i] : null;
			this.testFileTypeForProcessing(file);
		}
	};

	testFileTypeForProcessing(file: File) {
		const fileName = file ? file.name.toLowerCase() : '';
		if (fileName.endsWith('.csv') || file.type === 'text/csv') this.loadCSVData(file);
		else if (
			fileName.endsWith('.png') ||
			fileName.endsWith('.jpg') ||
			fileName.endsWith('.jpeg') ||
			file.type === 'image/png' ||
			file.type === 'image/jpg' ||
			file.type === 'image/jpeg'
		)
			this.loadFloorplanImage(URL.createObjectURL(file));
		else if (fileName.endsWith('.mp4') || file.type === 'video/mp4') this.prepVideoFromFile(URL.createObjectURL(file));
		else alert('Error loading file. Please make sure your file is an accepted format'); // this should not be possible due to HTML5 accept for file inputs, but in case
	}

	async loadLocalExampleDataFile(folder: string, fileName: string) {
		try {
			const response = await fetch(folder + fileName);
			const buffer = await response.arrayBuffer();
			const file = new File([buffer], fileName, {
				type: 'text/csv'
			});
			this.loadCSVData(file);
		} catch (error) {
			alert('Error loading CSV file. Please make sure you have a good internet connection');
			console.log(error);
		}
	}

	/**
	 * @param  {MP4 File} input
	 */
	prepVideoFromFile(fileLocation) {
		this.sketch.videoController.createVideoPlayer('File', {
			fileName: fileLocation
		});
	}

	handleExampleDropdown = async (event: any) => {
		// TODO: Need to adjust p5 typescript defintion to expose
		// custom attributes & functions

		ConfigStore.update((store) => ({
			...store,
			maxStopLength: 0
		}));

		this.sketch.videoController.clear();
		this.clearExistingData();

		const selectedValue = event.target.value;
		await this.loadFloorplanImage(`/data/${selectedValue}/floorplan.png`);
		await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `conversation.csv`);

		switch (selectedValue) {
			case 'example-1':
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, 'jordan.csv');
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, 'possession.csv');
				this.sketch.videoController.createVideoPlayer('Youtube', { videoId: 'iiMjfVOj8po' });
				break;
			case 'example-2':
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `adhir.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `blake.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `jeans.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `lily.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `mae.csv`);
				this.sketch.videoController.createVideoPlayer('Youtube', { videoId: 'pWJ3xNk1Zpg' });
				break;
			case 'example-3':
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `teacher.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, 'lesson-graph.csv');
				this.sketch.videoController.createVideoPlayer('Youtube', { videoId: 'Iu0rxb-xkMk' });
				break;
			case 'example-4':
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `cassandra.csv`);
				await this.loadLocalExampleDataFile(`//data/${selectedValue}/`, `mei.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `nathan.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `sean.csv`);
				await this.loadLocalExampleDataFile(`/data/${selectedValue}/`, `teacher.csv`);
				this.sketch.videoController.createVideoPlayer('Youtube', { videoId: 'OJSZCK4GPQY' });
				break;
		}
	};

	loadCSVData = async (file: File) => {
		Papa.parse(file, {
			dynamicTyping: true,
			skipEmptyLines: 'greedy',
			header: true,
			transformHeader: (h) => {
				return h.trim().toLowerCase();
			},
			complete: (results: any, file: any) => {
				this.processResultsData(results, this.coreUtils.cleanFileName(file.name));
				this.sketch.loop();
			}
		});
	};

	loadFloorplanImage = (path: string) => {
		this.sketch.loadImage(path, (img) => {
			this.sketch.floorPlan.img = img;
			this.sketch.floorPlan.width = img.width;
			this.sketch.floorPlan.height = img.height;
			this.sketch.loop();
		});
	};

	// NOTE: multicode should be processed before single code file as headers of multicode have one additional column
	processResultsData = (results: any, fileName: string) => {
		const csvData = results.data;
		if (this.coreUtils.testMovement(results)) {
			this.updateUsersForMovement(csvData, fileName);
		} else if (this.coreUtils.testMulticode(results)) {
			ConfigStore.update((currentConfig) => {
				return {
					...currentConfig,
					dataHasCodes: true
				};
			});
			this.updateUsersForMultiCodes(csvData, fileName);
		} else if (this.coreUtils.testSingleCode(results)) {
			ConfigStore.update((currentConfig) => {
				return {
					...currentConfig,
					dataHasCodes: true
				};
			});
			this.updateUsersForSingleCodes(csvData, fileName);
		} else if (this.coreUtils.testConversation(results)) {
			this.updateUsersForConversation(csvData, fileName);
		} else {
			alert('Error loading CSV file. Please make sure your file is a CSV file formatted with correct column headers');
		}

		// Sort all the users' data trails by time
		UserStore.update((currentUsers) => {
			let users = [...currentUsers];
			users.forEach((user) => {
				user.dataTrail.sort((a, b) => (a.time > b.time ? 1 : -1));
			});
			return users;
		});
	};

	updateUsersForMovement = (csvData: any, userName: string) => {
		let endTime = 0;

		UserStore.update((currentUsers) => {
			let users = [...currentUsers];
			let user = users.find((user) => user.name === userName);
			if (!user) {
				user = this.createNewUser(users, userName);
				users.push(user);
			}
			// Assuming the first column is 'time' and it's sorted in ascending order
			//const startTime = csvData[0]?.time; // The time in the first row
			//const endTime = csvData[csvData.length - 1]?.time; // The time in the last row
			if (endTime < csvData[csvData.length - 1]?.time) endTime = csvData[csvData.length - 1]?.time;

			for (let i = 1; i < csvData.length; i++) {
				const row = csvData[i];
				const priorRow = csvData[i - 1];
				if (this.coreUtils.movementRowForType(row) && this.coreUtils.curTimeIsLarger(row, priorRow)) {
					user.dataTrail.push(new DataPoint('', row.time, row.x, row.y, false));
				}
			}
			this.updateStopValues(user.dataTrail);

			return users;
		});

		TimelineStore.update((timeline) => {
			timeline.setCurrTime(0);
			timeline.setStartTime(0);
			timeline.setEndTime(endTime);
			timeline.setLeftMarker(0);
			timeline.setRightMarker(endTime);
			return timeline;
		});
	};

	updateUsersForConversation = (csvData: any, fileName: string) => {
		UserStore.update((currentUsers) => {
			let users = [...currentUsers];
			csvData.forEach((row: any) => {
				let user = users.find((user) => user.name === row.speaker.toLowerCase());
				if (!user) {
					user = this.createNewUser(users, row.speaker.toLowerCase());
					users.push(user);
				}
				this.addDataPointClosestByTimeInSeconds(user.dataTrail, new DataPoint(row.talk, row.time));
			});
			return users;
		});
	};

	createNewUser(users: User[], userName: string) {
		const availableColors = USER_COLORS.filter((color) => !users.some((u) => u.color === color));
		const userColor = availableColors.length > 0 ? availableColors[0] : '#000000'; // Default to black if no more unique colors available
		return new User([], userColor, true, userName);
	}

	updateStopValues(data) {
		let curMaxStopLength = 0;

		for (let i = 0; i < data.length; i++) {
			let cumulativeTime = 0;
			let j = i;
			while (j < data.length && data[j].x === data[i].x && data[j].y === data[i].y) {
				cumulativeTime = data[j].time - data[i].time;
				j++;
			}

			if (cumulativeTime > curMaxStopLength) {
				curMaxStopLength = cumulativeTime;
			}

			for (let k = i + 1; k < j; k++) {
				data[k].stopLength = cumulativeTime;
			}
			i = j - 1;
		}

		ConfigStore.update((store) => ({
			...store,
			maxStopLength: Math.max(store.maxStopLength, curMaxStopLength)
		}));
	}

	updateUsersForMultiCodes = (csvData: any, fileName: string) => {
		UserStore.update((currentUsers) => {
			let users = [...currentUsers]; // clone the current users

			// Create a Set to store unique code names
			const uniqueCodes = [];

			// For each row in the Code CSV
			csvData.forEach((row: any) => {
				const code = row.code.toLowerCase();
				if (!uniqueCodes.includes(code)) uniqueCodes.push(code); // Add the code name to the Set
				const startTime = parseFloat(row.start);
				const endTime = parseFloat(row.end);

				//For each user in the users array
				users.forEach((user) => {
					// Find the first data point with time >= startTime
					const startIndex = user.dataTrail.findIndex((dataPoint) => dataPoint.time !== null && dataPoint.time >= startTime);

					// Find the last data point with time <= endTime
					const endIndex = user.dataTrail.findLastIndex((dataPoint) => dataPoint.time !== null && dataPoint.time <= endTime);
					if (startIndex === -1 || endIndex === -1) return; // TODO: can have/deal with good StartIndex but bad endIndex
					// Update datapoints FROM the start and TO the end time to include the code
					for (let i = startIndex; i <= endIndex; i++) {
						if (!user.dataTrail[i].codes.includes(code)) {
							user.dataTrail[i].codes.push(code);
						}
					}
				});
			});

			CodeStore.update((currentEntries) => {
				// Create an array of new entries with colors assigned
				const newEntries = uniqueCodes.map((code, index) => ({
					code: code,
					color: USER_COLORS[index % USER_COLORS.length], // Use modulo to cycle through colors
					enabled: true
				}));

				// Combine the current entries with the new entries and return the result
				return [...currentEntries, ...newEntries];
			});

			return users;
		});
	};

	clearExistingData() {
		console.log('Clearing existing data');
		UserStore.update(() => {
			return [];
		});

		CodeStore.update(() => {
			return [];
		});
	}

	// @Ben TODO: You will need to adjust this for the single code file name
	// and header names
	// updateUsersForSingleCodes = (csvData: any, fileName: string) => {
	// 	UserStore.update((currentUsers) => {
	// 		let users = [...currentUsers]; // clone the current users

	// 		// For each row in the Code CSV
	// 		csvData.forEach((row: any) => {
	// 			const code = row.code;
	// 			const time = parseFloat(row.time);

	// 			// For each user in the users array
	// 			users.forEach((user) => {
	// 				// Find the closest datapoint by time
	// 				const closestDataPoint = user.dataTrail.reduce((closest, current) => {
	// 					if (current.time === null) return closest;
	// 					return Math.abs(current.time - time) < Math.abs(closest.time - time) ? current : closest;
	// 				});

	// 				// Add the code to the closest datapoint
	// 				if (!closestDataPoint.codes.includes(code)) {
	// 					closestDataPoint.codes.push(code);
	// 				}
	// 			});
	// 		});

	// 		return users;
	// 	});
	// };

	addDataPointClosestByTimeInSeconds(dataPoints, newDataPoint) {
		if (dataPoints.length === 0) {
			dataPoints.push(newDataPoint);
			return;
		}
		// Find the index of the data point with the closest time in seconds
		const closestIndex = dataPoints.reduce((closest, current, index) => {
			return Math.abs(current.time - newDataPoint.time) < Math.abs(dataPoints[closest].time - newDataPoint.time) ? index : closest;
		}, 0);

		// Decide where to insert - before or after the closest time
		if (dataPoints[closestIndex].time < newDataPoint.time) {
			dataPoints.splice(closestIndex, 0, newDataPoint);
		} else {
			dataPoints.splice(closestIndex + 1, 0, newDataPoint);
		}
	}
}
