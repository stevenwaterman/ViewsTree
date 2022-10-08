import type { GenerationSettings } from "../state/settings";
import { createBranchState, createRootState, pendingRootsStore, type BranchState, type NodeConfig, type NodeState, type RootState } from "../state/tree";

export type RootRequest = {
  prompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  seed?: number;
}

export type RootConfig = {
  type: "root";
  id: string;
  prompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  seed: {
    random: boolean;
    actual: number;
  }
}

export type BranchRequest = {
  prompt: string;
  steps: number;
  scale: number;
  eta: number;
  strength: number;
  seed?: number;
}

export type BranchConfig = {
  type: "branch";
  id: string;
  prompt: string;
  steps: number;
  scale: number;
  eta: number;
  seed: {
    random: boolean;
    actual: number;
  }
  strength: number;
}

let lastGeneration: Promise<any> = Promise.resolve();

export async function generate(saveName: string, request: GenerationSettings, parent: NodeState | undefined): Promise<void> {
  if (parent) {
    parent.pendingChildren.update(count => count + 1);
    lastGeneration = lastGeneration.finally(() => generateBranch(saveName, parent, request));
  } else {
    pendingRootsStore.update(count => count + 1);
    lastGeneration = lastGeneration.finally(() => generateRoot(saveName, request));
  }
  await lastGeneration;
}

async function generateRoot(saveName: string, request: RootRequest): Promise<RootState> {
  return await fetch(`http://localhost:5001/${saveName}/root`, {
    method: "POST",
    body: JSON.stringify(request)
  })
  .then(response => {
    if (response.status === 429) throw "Server busy";
    else return response;
  })
  .then(response => response.json())
  .then(data => ({
    type: "root",
    id: data["run_id"],
    prompt: data["prompt"],
    width: data["width"],
    height: data["height"],
    steps: data["steps"],
    scale: data["scale"],
    seed: {
      random: data["seed"] === null,
      actual: data["actual_seed"]
    }
  } as RootConfig))
  .then(config => createRootState(config));
}

async function generateBranch(saveName: string, parent: NodeState, request: BranchRequest): Promise<BranchState> {
  return await fetch(`http://localhost:5001/${saveName}/branch/${parent.id}`, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      init_run_id: parent.id
    })
  })
  .then(response => {
    if (response.status === 429) throw "Server busy";
    else return response;
  })
  .then(response => response.json())
  .then(data => ({
    type: "branch",
    id: data["run_id"],
    prompt: data["prompt"],
    steps: data["steps"],
    scale: data["scale"],
    eta: data["eta"],
    seed: {
      random: data["seed"] === null,
      actual: data["actual_seed"]
    },
    strength: data["strength"]
  }) as BranchConfig)
  .then(config => createBranchState(config, parent));
}

export function imageUrl(saveName: string, node: NodeConfig): string {
  return `http://localhost:5001/${saveName}/image/${node.id}`;
}

export function thumbnailUrl(saveName: string, node: NodeConfig): string {
  return `http://localhost:5001/${saveName}/thumb/${node.id}`;
}