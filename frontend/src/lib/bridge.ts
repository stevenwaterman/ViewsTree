type RootRequest = {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  scale?: number;
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

type BranchRequest = {
  init_run_id: string;
  prompt: string;
  steps?: number;
  scale?: number;
  eta?: number;
  seed?: number
  strength?: number;
}

export type BranchConfig = {
  type: "branch";
  id: string;
  parentId: string;
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

export type NodeConfig = RootConfig | BranchConfig;

export async function generateRoot(saveName: string, request: RootRequest): Promise<RootConfig> {
  return fetch(`http://localhost:5001/${saveName}/root`, {
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
      random: data["seed"] === undefined,
      actual: data["actual_seed"]
    }
  }));
}

export async function generateBranch(saveName: string, parent: NodeConfig, request: Omit<BranchRequest, "init_run_id">): Promise<BranchConfig> {
  return fetch(`http://localhost:5001/${saveName}/branch`, {
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
    parentId: data["init_run_id"],
    prompt: data["prompt"],
    steps: data["steps"],
    scale: data["scale"],
    eta: data["eta"],
    seed: {
      random: data["seed"] === undefined,
      actual: data["actual_seed"]
    },
    strength: data["strength"]
  }));
}

export function imageUrl(saveName: string, node: NodeConfig): string {
  return `http://localhost:5001/${saveName}/image/${node.id}`;
}

export function thumbnailUrl(saveName: string, node: NodeConfig): string {
  return `http://localhost:5001/${saveName}/thumb/${node.id}`;
}