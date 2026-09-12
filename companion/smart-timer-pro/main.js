const {
	InstanceBase,
	Regex,
	runEntrypoint,
	InstanceStatus,
	combineRgb,
} = require('@companion-module/base');

class SmartTimerProInstance extends InstanceBase {
	async init(config) {
		this.config = config;
		this.updateStatus(InstanceStatus.Connecting);

		this.state = {
			time: '10:00',
			running: false,
			msg_active: false,
			raw_seconds: 600,
			over_time: '',
			mode: 'countdown',
			messages: [],
		};

		this.initActions();
		this.initVariables();
		this.initFeedbacks();
		this.initPresets();

		if (this.config.host) {
			this.startPolling();
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing IP Address');
		}
	}

	async destroy() {
		if (this.pollTimer) clearInterval(this.pollTimer);
	}

	async configUpdated(config) {
		this.config = config;
		if (this.config.host) this.startPolling();
	}

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Smart Timer Pro IP Address (e.g. 192.168.1.50)',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Port (default: 3000)',
				width: 4,
				default: '3000',
				regex: Regex.PORT,
			},
		];
	}

	startPolling() {
		if (this.pollTimer) clearInterval(this.pollTimer);
		const port = this.config.port || '3000';

		this.pollTimer = setInterval(async () => {
			try {
				const response = await fetch(
					`http://${this.config.host}:${port}/api/companion`,
				);
				if (response.ok) {
					this.updateStatus(InstanceStatus.Ok);
					const data = await response.json();
					this.state = data;

					const updates = {
						time: data.time,
						raw_seconds: data.raw_seconds,
						over_time: data.over_time,
						mode: data.mode,
					};

					for (let i = 0; i < 10; i++) {
						updates[`msg_${i + 1}`] =
							data.messages && data.messages[i]
								? data.messages[i]
								: '(Empty Slot)';
					}

					this.setVariableValues(updates);
					this.checkFeedbacks('timer_state', 'msg_state');
				}
			} catch (e) {
				this.updateStatus(
					InstanceStatus.ConnectionFailure,
					'Cannot connect to Smart Timer Pro',
				);
			}
		}, 300);
	}

	initVariables() {
		const vars = [
			{ name: 'Current Time (String)', variableId: 'time' },
			{ name: 'Raw Time in Seconds', variableId: 'raw_seconds' },
			{ name: 'Over Time (+MM:SS)', variableId: 'over_time' },
			{ name: 'Current Mode', variableId: 'mode' },
		];

		for (let i = 1; i <= 10; i++) {
			vars.push({
				name: `Custom Message Slot ${i}`,
				variableId: `msg_${i}`,
			});
		}

		this.setVariableDefinitions(vars);
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({
			timer_state: {
				name: 'Auto-Color Timer Button',
				type: 'advanced',
				label: 'Timer State Colors (green=running, orange=warning, red=expired)',
				options: [],
				callback: () => {
					if (this.state.mode !== 'countdown') return {};
					if (!this.state.running && this.state.raw_seconds > 0) return {};

					if (this.state.raw_seconds <= 0) {
						return {
							bgcolor: combineRgb(239, 68, 68),
							color: combineRgb(255, 255, 255),
						};
					}
					if (this.state.raw_seconds <= 120) {
						return {
							bgcolor: combineRgb(245, 158, 11),
							color: combineRgb(0, 0, 0),
						};
					}
					return {
						bgcolor: combineRgb(16, 185, 129),
						color: combineRgb(255, 255, 255),
					};
				},
			},
			msg_state: {
				name: 'Message Active Background',
				type: 'boolean',
				label: 'Message is active on screen',
				defaultStyle: {
					bgcolor: combineRgb(0, 163, 224),
					color: combineRgb(255, 255, 255),
				},
				options: [],
				callback: () => {
					return this.state.msg_active;
				},
			},
		});
	}

	initActions() {
		const port = this.config ? this.config.port || '3000' : '3000';

		const sendCmd = async (cmd) => {
			if (!this.config || !this.config.host) return;
			try {
				await fetch(`http://${this.config.host}:${port}/api/${cmd}`);
			} catch (e) {}
		};

		this.setActionDefinitions({
			toggle_playback: {
				name: 'Toggle Start / Pause',
				options: [],
				callback: async () => {
					await sendCmd('toggle_playback');
				},
			},
			start: {
				name: 'Start Timer',
				options: [],
				callback: async () => {
					await sendCmd('start');
				},
			},
			pause: {
				name: 'Pause Timer',
				options: [],
				callback: async () => {
					await sendCmd('pause');
				},
			},
			toggle_msg: {
				name: 'Toggle Message On/Off',
				options: [],
				callback: async () => {
					await sendCmd('message/toggle');
				},
			},
			hide_msg: {
				name: 'Hide Message',
				options: [],
				callback: async () => {
					await sendCmd('message/hide');
				},
			},
			trigger_msg: {
				name: 'Trigger Instant Message by Slot Number',
				options: [
					{
						type: 'number',
						label: 'Slot Number (1-5)',
						id: 'slot',
						default: 1,
						min: 1,
						max: 5,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`message/trigger?index=${action.options.slot - 1}`);
				},
			},
			reset: {
				name: 'Reset Timer',
				options: [
					{
						type: 'number',
						label: 'Seconds (e.g. 600 for 10m)',
						id: 'sec',
						default: 600,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`reset?sec=${action.options.sec}`);
				},
			},
			reset_last: {
				name: 'Reset to Last Set Time',
				options: [],
				callback: async () => {
					await sendCmd('reset');
				},
			},
			add: {
				name: 'Add/Subtract Time',
				options: [
					{
						type: 'number',
						label: 'Seconds to add (-60 to subtract 1 min)',
						id: 'sec',
						default: 60,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`add?sec=${action.options.sec}`);
				},
			},
			set_mode: {
				name: 'Set Display Mode',
				options: [
					{
						type: 'dropdown',
						label: 'Mode',
						id: 'mode',
						default: 'countdown',
						choices: [
							{ id: 'countdown', label: 'Countdown' },
							{ id: 'countup', label: 'Count-Up' },
							{ id: 'timeofday', label: 'Time of Day' },
							{ id: 'logo', label: 'Idle / Logo' },
						],
					},
				],
				callback: async (action) => {
					await sendCmd(`mode?set=${action.options.mode}`);
				},
			},
			set_indicator: {
				name: 'Loading Bar / Semáforo',
				options: [
					{
						type: 'dropdown',
						label: 'Type',
						id: 'type',
						default: 'bar',
						choices: [
							{ id: 'bar', label: 'Loading Bar' },
							{ id: 'semaforo', label: 'Semáforo' },
						],
					},
					{
						type: 'dropdown',
						label: 'Action',
						id: 'action',
						default: 'on',
						choices: [
							{ id: 'on', label: 'ON' },
							{ id: 'off', label: 'OFF' },
						],
					},
				],
				callback: async (action) => {
					await sendCmd(`indicator?type=${action.options.type}&action=${action.options.action}`);
				},
			},
		});
	}

	initPresets() {
		const presets = {};

		presets['smart_timer'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Smart Timer Button (toggle + time display)',
			style: {
				text: '▶ GO\\n$(smart-timer-pro:time)',
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
				show_topbar: false,
			},
			steps: [
				{ down: [{ actionId: 'toggle_playback', options: {} }], up: [] },
			],
			feedbacks: [{ feedbackId: 'timer_state', options: {} }],
		};

		presets['go_start'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'GO (Start)',
			style: {
				text: '▶\\nGO',
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(16, 185, 129),
				show_topbar: false,
			},
			steps: [
				{ down: [{ actionId: 'start', options: {} }], up: [] },
			],
			feedbacks: [],
		};

		presets['pause_stop'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Pause',
			style: {
				text: '⏸\\nPAUSE',
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(245, 158, 11),
				show_topbar: false,
			},
			steps: [
				{ down: [{ actionId: 'pause', options: {} }], up: [] },
			],
			feedbacks: [],
		};

		presets['smart_message'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Toggle Message',
			style: {
				text: '💬\\nMSG',
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
				show_topbar: false,
			},
			steps: [
				{ down: [{ actionId: 'toggle_msg', options: {} }], up: [] },
			],
			feedbacks: [{ feedbackId: 'msg_state', options: {} }],
		};

		presets['reset_last'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Reset Time',
			style: {
				text: '⟳\\nRESET Time',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(200, 50, 50),
				show_topbar: false,
			},
			steps: [
				{ down: [{ actionId: 'reset_last', options: {} }], up: [] },
			],
			feedbacks: [],
		};

		// Quick Messages Triggers (Slots 1-5)
		for (let i = 1; i <= 5; i++) {
			presets[`trigger_msg_${i}`] = {
				type: 'button',
				category: 'Quick Messages',
				name: `Trigger Quick Message ${i}`,
				style: {
					text: `[${i}]\\n$(smart-timer-pro:msg_${i})`,
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 100, 160),
					show_topbar: false,
				},
				steps: [
					{
						down: [
							{ actionId: 'trigger_msg', options: { slot: i } },
						],
						up: [],
					},
				],
				feedbacks: [],
			};
		}

		// Display Modes
		const modes = [
			{ id: 'countdown', label: 'Countdown', icon: '⏱', color: [16, 185, 129] },
			{ id: 'countup', label: 'Count-Up', icon: '⏫', color: [0, 163, 224] },
			{ id: 'timeofday', label: 'Time of Day', icon: '🕐', color: [139, 92, 246] },
			{ id: 'logo', label: 'Idle / Logo', icon: '🖼', color: [100, 116, 139] },
		];
		modes.forEach((mode) => {
			presets[`mode_${mode.id}`] = {
				type: 'button',
				category: 'Display Modes',
				name: `${mode.label} Mode`,
				style: {
					text: `${mode.icon}\\n${mode.label}`,
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(...mode.color),
					show_topbar: false,
				},
				steps: [
					{
						down: [
							{ actionId: 'set_mode', options: { mode: mode.id } },
						],
						up: [],
					},
				],
				feedbacks: [],
			};
		});

		// Quick Times
		const quickTimes = [
			{ label: '1m', sec: 60 },
			{ label: '5m', sec: 300 },
			{ label: '10m', sec: 600 },
			{ label: '15m', sec: 900 },
			{ label: '30m', sec: 1800 },
			{ label: '60m', sec: 3600 },
		];

		quickTimes.forEach((t) => {
			presets[`reset_${t.sec}`] = {
				type: 'button',
				category: 'Quick Times',
				name: `Reset to ${t.label}`,
				style: {
					text: `🔄\\n${t.label}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(13, 20, 45),
					show_topbar: false,
				},
				steps: [
					{
						down: [
							{ actionId: 'reset', options: { sec: t.sec } },
						],
						up: [],
					},
				],
				feedbacks: [],
			};
		});

		// Manual Adjustments
		presets['add_min'] = {
			type: 'button',
			category: 'Manual Adjustments',
			name: '+1 Minute',
			style: {
				text: '➕\\n+1m',
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(20, 40, 60),
				show_topbar: false,
			},
			steps: [
				{ down: [{ actionId: 'add', options: { sec: 60 } }], up: [] },
			],
			feedbacks: [],
		};

		presets['sub_min'] = {
			type: 'button',
			category: 'Manual Adjustments',
			name: '-1 Minute',
			style: {
				text: '➖\\n-1m',
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(20, 40, 60),
				show_topbar: false,
			},
			steps: [
				{ down: [{ actionId: 'add', options: { sec: -60 } }], up: [] },
			],
			feedbacks: [],
		};

		// Status Indicator Controls
		const indicators = [
			{ id: 'bar_on', label: 'Loading Bar ON', icon: '▮', type: 'bar', action: 'on', bg: [16, 185, 129] },
			{ id: 'bar_off', label: 'Loading Bar OFF', icon: '▯', type: 'bar', action: 'off', bg: [100, 116, 139] },
			{ id: 'semaforo_on', label: 'Semáforo ON', icon: '🚦', type: 'semaforo', action: 'on', bg: [16, 185, 129] },
			{ id: 'semaforo_off', label: 'Semáforo OFF', icon: '🚫', type: 'semaforo', action: 'off', bg: [100, 116, 139] },
		];

		indicators.forEach((ind) => {
			presets[ind.id] = {
				type: 'button',
				category: 'Status Indicator',
				name: ind.label,
				style: {
					text: `${ind.icon}\\n${ind.label}`,
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(...ind.bg),
					show_topbar: false,
				},
				steps: [
					{
						down: [{ actionId: 'set_indicator', options: { type: ind.type, action: ind.action } }],
						up: [],
					},
				],
				feedbacks: [],
			};
		});

		this.setPresetDefinitions(presets);
	}
}

runEntrypoint(SmartTimerProInstance, []);
