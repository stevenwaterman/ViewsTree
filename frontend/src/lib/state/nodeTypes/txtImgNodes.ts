import { stateful, type Stateful } from "../../utils";
import { type Writable, type Readable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  type NodeIsTypes,
  type SecondaryBranchNode,
} from "./nodes";
import { rootNode, type RootNode } from "./rootNodes";
import type { GenerationRequest } from "src/lib/generator/generator";

export type TxtImgRequest = {
  prompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  seed?: number;
};

export type TxtImgResult = {
  id: string;
  prompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  seed: {
    random: boolean;
    actual: number;
  };
};

export type TxtImgNode = TxtImgResult &
  NodeIsTypes<"TxtImg"> & {
    parent: RootNode;
    children: Stateful<Writable<SecondaryBranchNode[]>>;
    pendingRequests: Stateful<Writable<GenerationRequest[]>>;
    childLeafCount: Readable<number[]>;
    leafCount: Readable<number>;
    lastSelectedId: Stateful<Writable<string | undefined>>;
  };

function createTxtImgNode(result: TxtImgResult): TxtImgNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    writable([])
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: TxtImgNode = {
    ...result,
    ...getNodeIsTypes("TxtImg"),
    parent: rootNode,
    children,
    pendingRequests: stateful(writable([])),
    childLeafCount,
    leafCount,
    lastSelectedId: stateful(writable(undefined)),
  };

  return node;
}

export async function fetchTxtImgNode(
  saveName: string,
  request: TxtImgRequest
): Promise<TxtImgNode> {
  return await fetch(`http://localhost:5001/${saveName}/txtimg`, {
    method: "POST",
    body: JSON.stringify(request),
  })
    .then((response) => {
      if (response.status === 429) throw "Server busy";
      else return response;
    })
    .then((response) => response.json())
    .then(
      (data) =>
        ({
          type: "root",
          id: data["run_id"],
          prompt: data["prompt"],
          width: data["width"],
          height: data["height"],
          steps: data["steps"],
          scale: data["scale"],
          seed: {
            random: data["seed"] === null,
            actual: data["actual_seed"],
          },
        } as TxtImgResult)
    )
    .then((result) => createTxtImgNode(result));
}
