# bubbleChartJs

bubbleChartJs is a lightweight and customizable JavaScript library for creating stacked bubble charts, arranging bubbles by size with the largest at the top.

### ✨ Why Use a Stacked Bubble Chart?

Multi-Dimensional Data Representation – Visualizes multiple datasets at once.

Better Group Comparisons – Highlights relationships between different categories.

Enhanced Readability – Shows data trends with layered or clustered bubbles.

Customizable & Interactive – Allows tooltips.

### 🔧 Features

✔️ Supports stacked or grouped bubble layouts

✔️ Customizable bubble color

✔️ Fully compatible with JavaScript & Typescript

✔️ Interactive tooltips and hover effects

### 📌 Use Cases

Financial Analysis – Display investment risks vs. returns for multiple assets.

Social Media Metrics – Visualize engagement levels across platforms.

Scientific Research – Show relationships in grouped experimental data.

### 🎨 Example Output

Here’s an example of the bubble chart generated using this package:

![Stacked Bubble Chart Example](https://github.com/praga-dev/bubble-chart-js/blob/HEAD/assets/bubble-chart.png)

## Installation

You can install `bubbleChartJs` via npm:

```sh
npm install bubble-chart-js
```

## Usage

### Basic Example

```js
import BubbleChart from "bubblechartjs";

const tooltipOptions = {
  fontStyle: "italic",
  fontWeight: 800,
  textAlign: "center",
  textDecoration: "underline",
  textTransform: "uppercase",
  fontColor: "#FFF",
};

const data = [
  {
    label: "Rocket Fuel Orders",
    value: 207,
    bubbleColor: "#ff5733",
    fontColor: "#FFFFFF",
    fontWeight: 600,
  },
  {
    label: "Time Machine Repairs",
    value: 154,
    bubbleColor: "#c70039",
    fontColor: "#FFF",
    fontWeight: 600,
  },
  {
    label: "AI Overlord Complaints",
    value: 192,
    bubbleColor: "#900c3f",
    fontColor: "#000",
  },
  {
    label: "Quantum Internet Activation",
    value: 73,
    bubbleColor: "#ffc300",
    fontColor: "#000",
  },
  {
    label: "Zero-Gravity Plumbing Issues",
    value: 96,
    bubbleColor: "#4caf50",
    fontColor: "#000",
  },
  {
    label: "Hologram Tech Support",
    value: 119,
    bubbleColor: "#ff8c00",
    fontColor: "#000",
  },
  {
    label: "Teleportation Delay Reports",
    value: 87,
    bubbleColor: "#03875c",
    fontColor: "#000",
  },
  {
    label: "Neural Chip Upgrades",
    value: 163,
    bubbleColor: "#3f51b5",
    fontColor: "#000",
  },
  {
    label: "Intergalactic Toll Fees",
    value: 132,
    bubbleColor: "#795548",
    fontColor: "#000",
  },
];

const chartOptions = {
  canvasContainerId: "bubbleChart",
  data: data,
  fontSize: 10,
  onBubbleClick: (bubbleData, event) => {
    alert(`You clicked on: ${bubbleData.label}`);
  },
};

// Initialize chart
initializeChart(chartoptions);
```

## Configuration Options

The `BubbleChart` class accepts a configuration object with the following properties:

## Configuration Options

The `BubbleChart` class accepts a configuration object with the following properties:

| Property                                                                               | Type         | Required | Optional | Default     |
| -------------------------------------------------------------------------------------- | ------------ | -------- | -------- | ----------- |
| **`canvasContainerId`**<br/>ID of the container where the chart will be rendered       | `string`     | ✔️ Yes   | ❌ No    | `-`         |
| **`data`**<br/>Array of objects containing `label` and `value` for each bubble         | `DataItem[]` | ✔️ Yes   | ❌ No    | `-`         |
| **`defaultBubbleColor`**<br/>Default color used when bubble color is not provided      | `string`     | ❌ No    | ✔️ Yes   | `"#3498db"` |
| **`fontSize`**<br/>Font size for bubble labels                                         | `number`     | ❌ No    | ✔️ Yes   | `14`        |
| **`fontFamily`**<br/>Font family used for text rendering                               | `string`     | ❌ No    | ✔️ Yes   | `"Arial"`   |
| **`fontColor`**<br/>Text color inside bubbles                                          | `string`     | ❌ No    | ✔️ Yes   | `"#ffffff"` |
| **`minRadius`**<br/>Minimum radius of a bubble                                         | `number`     | ❌ No    | ✔️ Yes   | `10`        |
| **`maxLines`**<br/>Maximum number of lines allowed for text wrapping                   | `number`     | ❌ No    | ✔️ Yes   | `3`         |
| **`textWrap`**<br/>Enable or disable text wrapping inside bubbles                      | `boolean`    | ❌ No    | ✔️ Yes   | `true`      |
| **`isResizeCanvasOnWindowSizeChange`**<br/>Automatically resize chart on window resize | `boolean`    | ❌ No    | ✔️ Yes   | `true`      |
| **`showToolTip`**<br/>Toggle tooltip visibility                                        | `boolean`    | ❌ No    | ✔️ Yes   | `true`      |
| **`onBubbleClick`**<br/>Callback fired when a bubble is clicked                        | `method`     | ❌ No    | ✔️ Yes   | `-`         |

✔️ **Required**: These properties must be provided.
✔️ **Optional**: If not provided, the default value will be used.

## License

This project is licensed under the MIT License.

## Contributions

Contributions, issues, and feature requests are welcome!

---

Made with ❤️ by Pragadeesh
