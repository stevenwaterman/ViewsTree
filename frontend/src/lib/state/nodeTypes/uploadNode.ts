import { sorted, stateful, type Stateful } from "../../utils";
import { type Writable, type Readable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  sortChildren,
  type BaseNode,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";
import type { GenerationRequest } from "../../generator/generator";
import type { RootNode } from "./rootNodes";

export type UploadRequest = {
  image: string;
  crop: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
};

export type UploadResult = {
  id: string;
  width: number;
  height: number;
};

export type UploadNode = UploadResult &
  BaseNode<"Upload"> & {
    parent: RootNode;
    children: Stateful<Writable<SecondaryBranchNode[]>>;
    pendingRequests: Stateful<Writable<GenerationRequest[]>>;
    childLeafCount: Readable<number[]>;
    leafCount: Readable<number>;
    lastSelectedId: Stateful<Writable<string | undefined>>;
  };

function createUploadNode(result: UploadResult, parent: RootNode): UploadNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    sorted(writable([]), sortChildren)
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: UploadNode = {
    ...result,
    ...getNodeIsTypes("Upload"),
    parent,
    children,
    pendingRequests: stateful(writable([])),
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

export async function fetchUploadNode(
  saveName: string,
  request: UploadRequest,
  parent: RootNode
): Promise<UploadNode> {
  return await fetch(`http://localhost:5001/${saveName}/upload`, {
    method: "POST",
    body: JSON.stringify(request),
  })
    .then((response) => {
      if (response.status === 429) throw "Server busy";
      else return response;
    })
    .then((response) => response.json())
    .then((data) => {
      const result: UploadResult = {
        id: data["run_id"],
        width: data["width"],
        height: data["height"],
      };
      return createUploadNode(result, parent);
    });
}

export function loadUploadNode(
  data: Serialised<"Upload">,
  parent: RootNode
): UploadNode {
  const node = createUploadNode(data, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}
