import type { BranchRequest, RootRequest } from "../generator/generator";
import { writable, type Writable } from "svelte/store";
import type { NodeState } from "./tree";

export const saveNameStore: Writable<string> = writable("test");

export type GenerationConfig = 
  ({ type: "root" } & RootRequest) |
  ({ type: "branch", parent: NodeState } & BranchRequest);

export function randomSeed() {
  return Math.random() * Number.MAX_SAFE_INTEGER;
}

const defaultPrompt = "";
const defaultWidth = 512;
const defaultHeight = 512;

const defaultSteps = {
  root: 50,
  branch: 50
};

const defaultScale = {
  root: 8,
  branch: 10
};

const defaultStrength = 0.4;
const defaultEta = 0;

function getDefaultRootGenerationConfig(): GenerationConfig {
  return {
    type: "root",
    prompt: defaultPrompt,
    width: defaultWidth,
    height: defaultHeight,
    steps: defaultSteps.root,
    scale: defaultScale.root
  }
}

function getChildGenerationConfig(node: NodeState): GenerationConfig {
  const strength = node.type === "root" ? defaultStrength : node.strength;
  const eta = node.type === "root" ? defaultEta : node.eta;

  return {
    type: "branch",
    parent: node,
    prompt: node.prompt,
    strength,
    eta,
    steps: defaultSteps[node.type],
    scale: defaultScale[node.type],
    seed: node.seed.random ? undefined : node.seed.actual
  }
}

function getSiblingGenerationConfig(sibling: NodeState): GenerationConfig {
  if (sibling.type === "root") {
    return {
      type: "root",
      prompt: sibling.prompt,
      width: sibling.width,
      height: sibling.height,
      steps: sibling.steps,
      scale: sibling.scale,
      seed: sibling.seed.random ? undefined : sibling.seed.actual
    }
  } else {
    return {
      type: "branch",
      parent: sibling.parent,
      prompt: sibling.prompt,
      strength: sibling.strength,
      eta: sibling.eta,
      steps: sibling.steps,
      scale: sibling.scale,
      seed: sibling.seed.random ? undefined : sibling.seed.actual
    }
  }
}

const generationConfigStoreInternal: Writable<GenerationConfig> = writable(getDefaultRootGenerationConfig());

export const generationConfigStore = {
  ...generationConfigStoreInternal,
  childOf: (node: NodeState) => {
    generationConfigStoreInternal.set(getChildGenerationConfig(node))
  },
  siblingof: (node: NodeState) => {
    generationConfigStoreInternal.set(getSiblingGenerationConfig(node))
  },
  defaultRoot: () => {
    generationConfigStoreInternal.set(getDefaultRootGenerationConfig())
  }
}
