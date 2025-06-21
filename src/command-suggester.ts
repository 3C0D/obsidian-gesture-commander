import { AbstractInputSuggest, App } from 'obsidian';

export interface Command {
  id: string;
  name?: string;
}

export class CommandSuggest extends AbstractInputSuggest<Command> {
  textInputEl: HTMLInputElement;
  private commands: Command[] = [];

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.textInputEl = inputEl;
    this.loadCommands();
  }

  private loadCommands(): void {
    // Get all available commands from Obsidian
    const commandsMap = (this.app as any).commands.commands;
    this.commands = Object.values(commandsMap).map((cmd: any) => ({
      id: cmd.id,
      name: cmd.name || cmd.id
    }));

    // Sort commands by name for better UX
    this.commands.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
  }

  protected getSuggestions(query: string): Command[] {
    if (!query || query.trim() === '') {
      // Return all commands when no query (when user clicks in empty field)
      return this.commands.slice(0, 100); // Show more commands
    }

    const lowerQuery = query.toLowerCase();
    const result: Command[] = [];

    for (const command of this.commands) {
      const name = (command.name || command.id).toLowerCase();
      const id = command.id.toLowerCase();

      // Exact matches first
      if (name === lowerQuery || id === lowerQuery) {
        result.unshift(command);
        continue;
      }

      // Starts with matches
      if (name.startsWith(lowerQuery) || id.startsWith(lowerQuery)) {
        result.push(command);
        continue;
      }

      // Contains matches
      if (name.includes(lowerQuery) || id.includes(lowerQuery)) {
        result.push(command);
        continue;
      }

      // Fuzzy matching
      if (this.fuzzyMatch(name, lowerQuery) || this.fuzzyMatch(id, lowerQuery)) {
        result.push(command);
      }
    }

    return result.slice(0, 50); // Show more results
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    let patternIndex = 0;
    for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
      if (text[i] === pattern[patternIndex]) {
        patternIndex++;
      }
    }
    return patternIndex === pattern.length;
  }

  renderSuggestion(command: Command, el: HTMLElement): void {
    const container = el.createDiv('command-suggestion');

    const nameEl = container.createDiv('command-suggestion-name');
    nameEl.textContent = command.name || command.id;

    if (command.name && command.name !== command.id) {
      const idEl = container.createDiv('command-suggestion-id');
      idEl.textContent = command.id;
    }
  }

  selectSuggestion(command: Command): void {
    this.textInputEl.value = command.name || command.id;
    this.textInputEl.setAttribute('data-command-id', command.id);
    this.textInputEl.trigger('input');
    this.close();
  }

  getSelectedCommand(): Command | null {
    const commandId = this.textInputEl.getAttribute('data-command-id');
    if (commandId) {
      return this.commands.find(cmd => cmd.id === commandId) || null;
    }

    // Fallback: try to find by display name
    const displayName = this.textInputEl.value;
    return this.commands.find(cmd => (cmd.name || cmd.id) === displayName) || null;
  }
}
