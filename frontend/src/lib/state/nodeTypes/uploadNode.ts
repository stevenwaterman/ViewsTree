import { stateful, type Stateful } from "../../utils";
import { type Writable, type Readable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  type BranchNode,
  type NodeIsTypes,
  type SecondaryBranchNode,
} from "./nodes";
import type { GenerationRequest } from "../../generator/generator";
import { rootNode, type RootNode } from "./rootNodes";

export type UploadRequest = {
  image: string;
  crop: {top: number; right: number; bottom: number; left: number};
  width: number;
  height: number;
};

export type UploadResult = {
  id: string;
  width: number;
  height: number;
};

export type UploadNode = UploadResult &
  NodeIsTypes<"Upload"> & {
    parent: RootNode;
    children: Stateful<Writable<SecondaryBranchNode[]>>;
    pendingRequests: Stateful<Writable<GenerationRequest[]>>;
    childLeafCount: Readable<number[]>;
    leafCount: Readable<number>;
    lastSelectedId: Stateful<Writable<string | undefined>>;
  };

function createUploadNode(result: UploadResult): UploadNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    writable([])
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: UploadNode = {
    ...result,
    ...getNodeIsTypes("Upload"),
    parent: rootNode,
    children,
    pendingRequests: stateful(writable([])),
    childLeafCount,
    leafCount,
    lastSelectedId: stateful(writable(undefined)),
  };

  return node;
}

export async function fetchUploadNode(
  saveName: string,
  request: UploadRequest
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
    .then(
      (data) =>
        ({
          id: data["run_id"],
          width: data["width"],
          height: data["height"],
        } as UploadResult)
    )
    .then((result) => createUploadNode(result));
}
