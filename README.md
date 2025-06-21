# Gesture Commander for Obsidian

Execute Obsidian commands by drawing mouse gestures while holding modifier keys.

## Features

- **Gesture Recognition**: Uses the $1 Unistroke Recognizer algorithm for accurate gesture recognition
- **Customizable Modifier Keys**: Configure which keys (Alt, Shift, Ctrl, Meta) must be held while drawing
- **Visual Feedback**: See your gesture as you draw it with real-time visual feedback
- **Command Integration**: Map gestures to any Obsidian command
- **Fuzzy Search**: Easy command selection with intelligent search
- **Gesture Previews**: Visual previews of your gestures in settings
- **Import/Export**: Share gesture configurations between vaults
- **Smart Targeting**: Works in editor areas while avoiding interference with UI elements

## Installation

### Manual Installation

1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/obsidian-gesture-commander/` folder
3. Reload Obsidian and enable the plugin in settings

## Usage

### Basic Setup

1. Open plugin settings (Settings → Community Plugins → Gesture Commander)
2. Configure your preferred modifier keys (default: Alt key)
3. Click "Add Gesture" to create your first gesture mapping

### Creating Gestures

1. Click "Add Gesture" in settings
2. Enter a name for your gesture (e.g., "circle", "arrow", "zigzag")
3. Search and select the command to execute
4. Draw your gesture on the canvas
5. Click "Create" to save

### Using Gestures

1. Hold your configured modifier key(s)
2. Click and drag in the editor to draw your gesture
3. Release the mouse button to complete the gesture
4. The mapped command will execute if the gesture is recognized

## Configuration

### Modifier Keys

- **Alt Key**: Require Alt to be pressed (default: enabled)
- **Shift Key**: Require Shift to be pressed (default: disabled)
- **Ctrl Key**: Require Ctrl to be pressed (default: disabled)
- **Meta Key**: Require Cmd/Win key to be pressed (default: disabled)

### Capture Settings

- **Minimum Stroke Length**: Minimum pixels for gesture recognition (default: 50px)
- **Maximum Stroke Time**: Maximum time to draw a gesture (default: 3000ms)
- **Visual Feedback**: Show gesture trail while drawing (default: enabled)

### Recognition Settings

- **Recognition Threshold**: Minimum confidence score (default: 0.7)
- **Use Protractor**: Enable faster recognition algorithm (experimental)

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/dd200/obsidian-gesture-commander.git

# Install dependencies
yarn install

# Build for development
yarn dev

# Build for production
yarn build

# Install to production vault
yarn real
```

## Tips

- **Simple Gestures Work Best**: Start with basic shapes like circles, lines, and triangles
- **Consistent Drawing**: Try to draw gestures the same way each time
- **Practice**: The more you use a gesture, the more natural it becomes
- **Avoid Complex Shapes**: Overly detailed gestures may be harder to recognize consistently

## Troubleshooting

### Gestures Not Recognized

- Check that modifier keys are configured correctly
- Ensure you're drawing in an editor area
- Try redrawing the gesture more clearly
- Lower the recognition threshold in settings

### Visual Feedback Not Showing

- Enable visual feedback in settings
- Check that you're holding the correct modifier keys
- Ensure the plugin is enabled

### Commands Not Executing

- Verify the command still exists in Obsidian
- Check that the gesture mapping is enabled
- Ensure recognition threshold is appropriate

## License

MIT License

## Acknowledgments

- Based on the [$1 Unistroke Recognizer](https://depts.washington.edu/acelab/proj/dollar/index.html) by Jacob O. Wobbrock, Andrew D. Wilson, and Yang Li
- Built for the amazing [Obsidian](https://obsidian.md) note-taking app
