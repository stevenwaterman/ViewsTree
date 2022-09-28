type ColorKeys =
  | "bgLight"
  | "bgDark"
  | "text"
  | "textDark"
  | "textEmphasis"
  | "border"
  | "buttonBg"
  | "buttonBgDisabled"
  | "nodePlaying"
  | "nodeActive"
  | "nodeWarm"
  | "nodeInactive"
  | "edgePlaying"
  | "edgeActive"
  | "edgeWarm"
  | "edgeInactive"
  | "pendingLoadText"
  | "loadingBarBG"
  | "loadingBarFG"
  | "loadingBarText";
const colorLookup: Record<ColorKeys, string> = {
  bgLight: "#263238",
  bgDark: "#1f292e",
  text: "#c3cee3",
  textDark: "#82b6cc",
  textEmphasis: "#314549",
  border: "#37474f",
  buttonBg: "#314147",
  buttonBgDisabled: "#273339",
  nodePlaying: "#c3e88d",
  nodeActive: "#f07178",
  nodeWarm: "#f78c6c",
  nodeInactive: "#c3cee3",
  edgePlaying: "#c3e88d",
  edgeActive: "#f07178",
  edgeWarm: "#f78c6c",
  edgeInactive: "#c3cee3",
  pendingLoadText: "#c3e88d",
  loadingBarBG: "#c3cee3",
  loadingBarFG: "#c3e88d",
  loadingBarText: "#1f292e"
};

export const modalOptions = {
  styleWindow: {
    background: colorLookup.bgDark,
    border: "1px solid " + colorLookup.border,
    color: colorLookup.textDark
  }
};

export default colorLookup;