import { ComfyApi } from "@saintno/comfyui-sdk";

let client: ComfyApi | undefined;

export function getComfyClient(): ComfyApi {
  if (!client) {
    const host = "http://localhost:8188";
    client = new ComfyApi(host);
    client.init();
  }
  return client;
}
