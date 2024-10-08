<script lang="ts">
	import P5, { type Sketch } from 'p5-svelte';
	import type p5 from 'p5';
	import MdHelpOutline from 'svelte-icons/md/MdHelpOutline.svelte';
	import MdCloudUpload from 'svelte-icons/md/MdCloudUpload.svelte';
	import MdCloudDownload from 'svelte-icons/md/MdCloudDownload.svelte';
	import MdRotateLeft from 'svelte-icons/md/MdRotateLeft.svelte';
	import MdRotateRight from 'svelte-icons/md/MdRotateRight.svelte';
	import Md3DRotation from 'svelte-icons/md/Md3DRotation.svelte';
	import MdVideocam from 'svelte-icons/md/MdVideocam.svelte';
	import MdVideocamOff from 'svelte-icons/md/MdVideocamOff.svelte';
	import MdCheck from 'svelte-icons/md/MdCheck.svelte';

	import type { User } from '../../models/user';

	import UserStore from '../../stores/userStore';
	import P5Store from '../../stores/p5Store';
	import VideoStore from '../../stores/videoStore';

	import { Core } from '$lib';
	import { igsSketch } from '$lib/p5/igsSketch';
	import { writable } from 'svelte/store';
	import IconButton from '$lib/components/IconButton.svelte';
	import IgsInfoModal from '$lib/components/IGSInfoModal.svelte';
	import TimelinePanel from '$lib/components/TimelinePanel.svelte';
	import DataPointTable from '$lib/components/DataPointTable.svelte';

	import CodeStore from '../../stores/codeStore';
	import ConfigStore from '../../stores/configStore';
	import type { ConfigStoreType } from '../../stores/configStore';

	const filterToggleOptions = ['movementToggle', 'stopsToggle'] as const;
	const selectToggleOptions = ['circleToggle', 'sliceToggle', 'highlightToggle'] as const;
	const conversationToggleOptions = ['alignToggle'] as const;

	let showDataPopup = false;
	let expandedUsers: { [key: string]: boolean } = {};
	function toggleUserExpansion(userName: string) {
		expandedUsers[userName] = !expandedUsers[userName];
	}

	let files: any = [];
	let users: User[] = [];
	let p5Instance: p5 | null = null;
	let core: Core;
	let isVideoShowing = false;
	let isVideoPlaying = false;
	let isPathColorMode = false;
	let maxStopLength = 0;

	ConfigStore.subscribe((value) => {
		isPathColorMode = value.isPathColorMode;
		maxStopLength = value.maxStopLength;
	});

	VideoStore.subscribe((value) => {
		isVideoShowing = value.isShowing;
		isVideoPlaying = value.isPlaying;
	});

	UserStore.subscribe((data) => {
		users = data;
	});

	P5Store.subscribe((value) => {
		p5Instance = value;

		if (p5Instance) {
			core = new Core(p5Instance);
		}
	});

	const sketch: Sketch = (p5: p5) => {
		igsSketch(p5);
	};

	let isModalOpen = writable(true);
	$: selectAllCodes = $CodeStore.every((code) => code.enabled);

	$: sortedCodes = [...$CodeStore].sort((a, b) => {
		if (a.code.toLowerCase() === 'no codes') return 1;
		if (b.code.toLowerCase() === 'no codes') return -1;
		return a.code.localeCompare(b.code);
	});

	$: formattedStopLength = $ConfigStore.stopSliderValue.toFixed(2);

	function toggleVideo() {
		if (p5Instance && p5Instance.videoController) {
			p5Instance.videoController.toggleShowVideo();
			VideoStore.update((value) => {
				value.isShowing = p5Instance.videoController.isShowing;
				value.isPlaying = p5Instance.videoController.isPlaying;
				return value;
			});
		}
	}

	function capitalizeEachWord(sentence: string) {
		return sentence
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	}

	// TODO: Sync this with the capitalizeEachWord function
	function capitalizeFirstLetter(string: string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	function handleStopLengthChange(e: Event) {
		const target = e.target as HTMLInputElement;
		ConfigStore.update((value) => ({
			...value,
			stopSliderValue: parseFloat(target.value)
		}));
	}

	function toggleSelection(selection: ToggleKey, toggleOptions: ToggleKey[]) {
		ConfigStore.update((store: ConfigStoreType) => {
			const updatedStore = { ...store };
			toggleOptions.forEach((key) => {
				if (key.endsWith('Toggle')) {
					updatedStore[key] = key === selection ? !updatedStore[key] : false;
				}
			});
			p5Instance?.loop();
			return updatedStore;
		});
		p5Instance?.loop();
	}

	function toggleSelectAllCodes() {
		const allEnabled = $CodeStore.every((code) => code.enabled);
		CodeStore.update((codes) => codes.map((code) => ({ ...code, enabled: !allEnabled })));
		p5Instance.loop();
	}

	function clearMovementData() {
		UserStore.update(() => []);
		p5Instance.loop();
	}

	function clearConversationData() {
		UserStore.update((users) =>
			users.map((user) => {
				user.dataTrail = user.dataTrail.map((dataPoint) => {
					dataPoint.speech = '';
					return dataPoint;
				});
				return user;
			})
		);
		p5Instance.loop();
	}

	function clearCodeData() {
		CodeStore.update(() => []);
		UserStore.update((users) =>
			users.map((user) => {
				user.dataTrail = user.dataTrail.map((dataPoint) => {
					dataPoint.codes = [];
					return dataPoint;
				});
				return user;
			})
		);

		ConfigStore.update((currentConfig) => ({
			...currentConfig,
			dataHasCodes: false
		}));

		p5Instance.loop();
	}

	function clearAllData() {
		UserStore.update(() => []);
		CodeStore.update(() => []);
		p5Instance.loop();
	}

	function clickOutside(node) {
		const handleClick = (event) => {
			if (!node.contains(event.target)) {
				node.removeAttribute('open');
			}
		};

		document.addEventListener('click', handleClick, true);

		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}
</script>

<div class="navbar min-h-16 bg-[#f6f5f3]">
	<div class="flex-1 px-2 lg:flex-none">
		<a class="text-lg font-bold text-black" href="/">IGS</a>
	</div>

	<div class="flex justify-end flex-1 px-2">
		<details class="dropdown" use:clickOutside>
			<summary
				class="btn btn-sm ml-4 tooltip tooltip-bottom flex items-center justify-center"
				data-tip="This changes the mouse to visualize different hovers over the data."
			>
				Filter
			</summary>
			<ul class="menu dropdown-content rounded-box z-[1] w-52 p-2 shadow bg-base-100">
				{#each filterToggleOptions as toggle}
					<li>
						<button on:click={() => toggleSelection(toggle, filterToggleOptions)} class="w-full text-left flex items-center">
							<div class="w-4 h-4 mr-2">
								{#if $ConfigStore[toggle]}
									<MdCheck />
								{/if}
							</div>
							{capitalizeFirstLetter(toggle.replace('Toggle', ''))}
						</button>
					</li>
				{/each}
				<li class="cursor-none">
					<p>Stop Length: {formattedStopLength}</p>
				</li>
				<li>
					<label for="stopLengthRange" class="sr-only">Adjust stop length</label>
					<input
						id="stopLengthRange"
						type="range"
						min="1"
						max={$ConfigStore.maxStopLength}
						value={$ConfigStore.stopSliderValue}
						class="range"
						on:input={handleStopLengthChange}
					/>
				</li>
			</ul>
		</details>

		<!-- Select Dropdown -->
		<details class="dropdown" use:clickOutside>
			<summary
				class="btn btn-sm ml-4 tooltip tooltip-bottom flex items-center justify-center"
				data-tip="This changes the mouse to visualize different hovers over the data."
			>
				Select
			</summary>
			<ul class="menu dropdown-content rounded-box z-[1] w-52 p-2 shadow bg-base-100">
				{#each selectToggleOptions as toggle}
					<li>
						<button on:click={() => toggleSelection(toggle, selectToggleOptions)} class="w-full text-left flex items-center">
							<div class="w-4 h-4 mr-2">
								{#if $ConfigStore[toggle]}
									<MdCheck />
								{/if}
							</div>
							{capitalizeFirstLetter(toggle.replace('Toggle', ''))}
						</button>
					</li>
				{/each}
			</ul>
		</details>

		<!-- Talk Dropdown -->
		<details class="dropdown" use:clickOutside>
			<summary
				class="btn btn-sm ml-4 tooltip tooltip-bottom flex items-center justify-center"
				data-tip="This changes the mouse to visualize different hovers over the data."
			>
				Talk
			</summary>
			<ul class="menu dropdown-content rounded-box z-[1] w-52 p-2 shadow bg-base-100">
				{#each conversationToggleOptions as toggle}
					<li>
						<button on:click={() => toggleSelection(toggle, conversationToggleOptions)} class="w-full text-left flex items-center">
							<div class="w-4 h-4 mr-2">
								{#if $ConfigStore[toggle]}
									<MdCheck />
								{/if}
							</div>
							{capitalizeFirstLetter(toggle.replace('Toggle', ''))}
						</button>
					</li>
				{/each}
			</ul>
		</details>

		<!-- Clear Data Dropdown -->
		<details class="dropdown" use:clickOutside>
			<summary class="btn btn-sm ml-4">Clear Data</summary>
			<ul class="menu dropdown-content rounded-box z-[1] w-52 p-2 shadow bg-base-100">
				<li><button on:click={clearMovementData}>Clear Movement Data</button></li>
				<li><button on:click={clearConversationData}>Clear Conversation Data</button></li>
				<li><button on:click={clearCodeData}>Clear Code Data</button></li>
				<li><button on:click={clearAllData}>Clear All Data</button></li>
			</ul>
		</details>

		<button class="btn btn-sm ml-4" on:click={() => (showDataPopup = true)}>Data Explorer</button>

		<div class="flex items-stretch">
			<IconButton
				id="btn-rotate-left"
				icon={MdRotateLeft}
				tooltip={'Rotate Left'}
				on:click={() => {
					p5Instance.floorPlan.setRotateLeft();
					p5Instance.loop();
				}}
			/>

			<IconButton
				id="btn-rotate-left"
				icon={MdRotateRight}
				tooltip={'Rotate Right'}
				on:click={() => {
					p5Instance.floorPlan.setRotateRight();
					p5Instance.loop();
				}}
			/>

			<IconButton icon={MdCloudDownload} tooltip={'Download your Data'} on:click={() => p5Instance.saveCodeFile()} />

			<!-- TODO: Need to move this logic into the IconButton component eventually -->
			<div
				data-tip="Upload"
				class="tooltip tooltip-bottom btn capitalize icon max-h-8 max-w-16 bg-[#f6f5f3] border-[#f6f5f3] flex items-center justify-center"
				role="button"
				tabindex="0"
				on:click
				on:keydown
			>
				<label for="file-input">
					<MdCloudUpload />
				</label>
			</div>

			<input
				class="hidden"
				id="file-input"
				multiple
				accept=".png, .jpg, .jpeg, .csv, .mp4"
				type="file"
				bind:files
				on:change={core.handleUserLoadedFiles}
			/>

			<IconButton icon={MdHelpOutline} tooltip={'Help'} on:click={() => ($isModalOpen = !$isModalOpen)} />

			<IconButton
				id="btn-toggle-3d"
				icon={Md3DRotation}
				tooltip={'Toggle 3D'}
				on:click={() => {
					p5Instance.handle3D.update();
				}}
			/>

			{#if isVideoShowing}
				<IconButton id="btn-toggle-video" icon={MdVideocam} tooltip={'Show/Hide Video'} on:click={toggleVideo} />
			{:else}
				<IconButton id="btn-toggle-video" icon={MdVideocamOff} tooltip={'Show/Hide Video'} on:click={toggleVideo} />
			{/if}
			<select id="select-data-dropdown" class="select select-bordered w-full max-w-xs bg-[#f6f5f3] text-black" on:change={core.handleExampleDropdown}>
				<option disabled selected>-- Select an Example --</option>
				<option value="example-1">Michael Jordan's Last Shot</option>
				<option value="example-2">Family Museum Gallery Visit</option>
				<option value="example-3">Classroom Science Lesson</option>
				<option value="example-4">Classroom Discussion</option>
			</select>
		</div>
	</div>
</div>

<div class="h-10">
	<P5 {sketch} />
</div>

{#if showDataPopup}
	<div
		class="modal modal-open"
		on:click|self={() => (showDataPopup = false)}
		on:keydown={(e) => {
			if (e.key === 'Escape') showDataPopup = false;
		}}
	>
		<div class="modal-box w-11/12 max-w-5xl">
			<div class="flex justify-between">
				<div class="flex flex-col">
					<h3 class="font-bold text-lg">Data Explorer</h3>
					<p>
						Here you will find information on the data that you have uploaded. This includes the codes that have been used, and the users that have
						been tracked. You can also enable or disable the movement and speech of each user, and change the color of their path.
					</p>
				</div>

				<button class="btn btn-circle btn-sm" on:click={() => (showDataPopup = false)}>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="overflow-x-auto">
				<div class="flex flex-col">
					<div class="flex-col my-4">
						<h4 class="font-bold my-2">Codes:</h4>
						<div class="grid grid-cols-5 gap-4">
							{#each $CodeStore as code}
								<div class="badge badge-neutral">{code.code}</div>
							{/each}
						</div>
					</div>

					<h4 class="font-bold">Users:</h4>
					{#each $UserStore as user}
						<div class="my-4">
							<div tabindex="0" class="text-primary-content bg-[#e6e4df] collapse" aria-controls="collapse-content-{user.name}" role="button">
								<input type="checkbox" class="peer" />
								<div class="collapse-title font-semibold">{capitalizeEachWord(user.name)}</div>

								<div class="collapse-content">
									<div class="flex flex-col">
										<div class="flex">
											<h2 class="font-medium">Color:</h2>
											<!-- TODO: Set badge colour to be user colour -->
											<div class="badge ml-2">{user.color}</div>
										</div>
										<div class="flex">
											<h2 class="font-medium">Enabled</h2>
											{#if user.enabled}
												<div class="badge badge-success ml-2">{user.enabled}</div>
											{:else}
												<div class="badge badge-error ml-2">{user.enabled}</div>
											{/if}
										</div>
									</div>
									<h2 class="font-medium">Data Points:</h2>
									<DataPointTable dataPoints={user.dataTrail} />
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div class="modal-action">
				<button class="btn" on:click={() => (showDataPopup = false)}>Close</button>
			</div>
		</div>
	</div>
{/if}

<div class="btm-nav flex justify-between min-h-20">
	<div class="flex flex-1 flex-row justify-start items-center bg-[#f6f5f3] items-start px-8">
		{#if $ConfigStore.dataHasCodes}
			<details class="dropdown dropdown-top" use:clickOutside>
				<summary class="btn">Codes</summary>
				<ul class="menu dropdown-content p-2 bg-base-100 rounded-box w-64 max-h-[75vh] overflow-y-auto flex-nowrap">
					<li>
						<div class="flex items-center">
							<input
								id="codeCheckbox-all"
								type="checkbox"
								class="checkbox"
								checked={$CodeStore.every((code) => code.enabled)}
								on:change={toggleSelectAllCodes}
							/>
							Enable All
						</div>
						<div class="flex items-center">
							<input id="codeCheckbox-all" type="checkbox" class="checkbox" bind:checked={$ConfigStore.isPathColorMode} />
							Color by Codes
						</div>
						<div class="divider" />
					</li>
					{#each sortedCodes as code, index}
						<li><h3 class="pointer-events-none">{code.code.toUpperCase()}</h3></li>
						<li>
							<div class="flex items-center">
								<input id="codeCheckbox-{code.code}" type="checkbox" class="checkbox" bind:checked={code.enabled} />
								Enabled
							</div>
						</li>
						<li>
							<div class="flex items-center">
								<input type="color" class="color-picker max-w-[24px] max-h-[28px]" bind:value={code.color} />
								Color
							</div>
						</li>
						{#if index !== sortedCodes.length - 1}
							<div class="divider" />
						{/if}
					{/each}
				</ul>
			</details>
		{/if}
		<!-- Users Dropdowns -->
		{#each $UserStore as user}
			<details class="dropdown dropdown-top" use:clickOutside>
				<summary class="btn">{user.name}</summary>
				<ul class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
					<li>
						<div class="flex items-center">
							<input id="userCheckbox-{user.name}" type="checkbox" class="checkbox" bind:checked={user.enabled} />
							Movement
						</div>
					</li>
					<li>
						<div class="flex items-center">
							<input id="userCheckbox-{user.name}" type="checkbox" class="checkbox" bind:checked={user.conversation_enabled} />
							Speech
						</div>
					</li>
					<li>
						<div class="flex items-center">
							<input type="color" class="color-picker max-w-[24px] max-h-[28px]" bind:value={user.color} />
							Color
						</div>
					</li>
					<!-- Add Transcripts section if needed -->
				</ul>
			</details>
		{/each}
	</div>

	<!-- Right Side: Timeline -->
	<div class="flex-1 bg-[#f6f5f3]">
		<TimelinePanel />
	</div>
</div>

<slot />

<IgsInfoModal {isModalOpen} />

<style>
	.color-picker {
		width: 30px;
		height: 30px;
		border: none;
		border-radius: 50%;
		cursor: pointer;
	}
</style>
