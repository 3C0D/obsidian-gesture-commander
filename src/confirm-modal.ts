import { App, Modal, Setting } from 'obsidian';

type ConfirmCallback = (confirmed: boolean) => void;

class ConfirmModal extends Modal {
	private confirm(confirmed: boolean): void {
		this.callback(confirmed);
		this.close();
	}

	constructor(
		app: App,
		public message: string,
		public callback: ConfirmCallback
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('p').setText(this.message);

		new Setting(this.contentEl)
			.addButton((b) => {
				b.setIcon('checkmark')
					.setCta()
					.onClick((): void => this.confirm(true));
			})
			.addExtraButton((b) =>
				b.setIcon('cross').onClick((): void => this.confirm(false))
			);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export async function confirmation(app: App, message: string): Promise<boolean> {
	return await new Promise((resolve) => {
		new ConfirmModal(app, message, (confirmed: boolean): void => {
			resolve(confirmed);
		}).open();
	});
}
