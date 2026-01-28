import { sorted, stateful, type Stateful } from "../../utils";
import { type Writable, type Readable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  sortChildren,
  type BaseNode,
  type BranchNode,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";
import type { GenerationRequest } from "../../generator/generator";

export type MaskRequest = {
  image: string;
  width: number;
  height: number;
};

export type MaskResult = {
  id: string;
  width: number;
  height: number;
};

export type MaskNode = MaskResult & BaseNode<"Mask">;

function createMaskNode(result: MaskResult, parent: BranchNode): MaskNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    sorted(writable([]), sortChildren)
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: MaskNode = {
    ...result,
    ...getNodeIsTypes("Mask"),
    parent,
    children,
    pendingRequests: stateful(writable({ requests: [], running: false })),
    childLeafCount,
    leafCount,
    lastSelectedId: stateful(writable(undefined)),
    serialise: () => ({
      ...result,
      id: node.id,
      type: node.type,
      children: children.state.map((child) => child.serialise()),
    }),
  };

  return node;
}

export async function fetchMaskNode(
  saveName: string,
  request: MaskRequest,
  parent: BranchNode
): Promise<MaskNode> {
  return await fetch(`http://localhost:5001/${saveName}/upload`, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      crop: {
        top: 0,
        right: request.width,
        bottom: request.height,
        left: 0,
      },
    }),
  })
    .then((response) => {
      if (response.status === 429) throw "Server busy";
      else return response;
    })
    .then((response) => response.json())
    .then((data) => {
      const result: MaskResult = {
        id: data["run_id"],
        width: data["width"],
        height: data["height"],
      };
      return createMaskNode(result, parent);
    });
}

export function loadMaskNode(
  data: Serialised<"Mask">,
  parent: BranchNode
): MaskNode {
  const node = createMaskNode(data, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}
