import { writable, type Readable, type Writable } from "svelte/store";
import { saveStore } from "../persistence/saves";
import { createRootNode, type RootNode } from "../state/nodeTypes/rootNodes";
import {
  fetchTxtImgNode,
  type TxtImgNode,
} from "../state/nodeTypes/txtImgNodes";
import {
  generationSettingsStore,
  type GenerationSettings,
} from "../state/settings";

const batchSize = 10;

export class SimulatedAnnealing {
  private readonly generationSettings: GenerationSettings;
  private readonly modelsList: string[];
  private readonly temperatureFactor: number;
  public readonly steps: number;

  private readonly sampleStoreInternal: Writable<
    { current: TxtImgNode; candidate: TxtImgNode }[]
  > = writable([]);

  public readonly sampleStore: Readable<
    { current: TxtImgNode; candidate: TxtImgNode }[]
  > = this.sampleStoreInternal;

  private _iteration: number = 0;
  public get iteration(): number {
    return this._iteration;
  }
  private set iteration(value: number) {
    this._iteration = value;
  }

  private _temperature: number;
  public get temperature(): number {
    return this._temperature;
  }
  private set temperature(value: number) {
    this._temperature = value;
  }

  private currentModels: Record<string, number> = {};
  private candidateModels: Record<string, number> = {};

  private rootNode: RootNode = createRootNode();

  constructor(
    generationSettings: GenerationSettings,
    startTemperature: number,
    endTemperature: number,
    steps: number
  ) {
    this.generationSettings = { ...generationSettings };
    this.modelsList = Object.entries(this.generationSettings.models)
      .filter((entry) => entry[1] > 0)
      .map((entry) => entry[0]);

    this.steps = steps;
    this.temperature = startTemperature;

    const totalTemperatureChange = startTemperature / endTemperature;
    this.temperatureFactor = Math.pow(totalTemperatureChange, 1 / steps);

    this.candidateModels = { ...this.generationSettings.models };
    for (const model in this.candidateModels) {
      if (this.modelsList.includes(model)) {
        this.candidateModels[model] = 1;
      } else {
        this.candidateModels[model] = 0;
      }
    }

    this.next(0, 1);
  }

  /** Generate a new set of models to use as a candidate based on temperature */
  private pickCandidate() {
    this.candidateModels = { ...this.currentModels };

    const model =
      this.modelsList[Math.floor(Math.random() * this.modelsList.length)];
    const modelFactor = Math.pow(1.2, randNormal() * this.temperature);
    this.candidateModels[model] *= modelFactor;
    console.log("Mutation: ", model, modelFactor);

    const maxWeight = Math.max(...Object.values(this.candidateModels));
    const scaleFactor = 10 / maxWeight;

    for (const model in this.candidateModels) {
      this.candidateModels[model] *= scaleFactor;
    }
  }

  /** Potentially accept the candidate models based on temperature and preference */
  private maybeAccept(currentScore: number, candidateScore: number) {
    if (candidateScore >= currentScore) {
      console.log("Better, accepting");
      return this.accept();
    }

    const preference = (30 * candidateScore) / (currentScore + candidateScore);
    const acceptChance = Math.exp(-preference / this.temperature);

    console.log(
      "Score",
      currentScore,
      candidateScore,
      (acceptChance * 100).toFixed(0),
      "%"
    );

    const accept = Math.random() >= acceptChance;
    console.log("Accepted: ", accept);
    if (accept) return this.accept();
  }

  private accept() {
    this.currentModels = this.candidateModels;
    generationSettingsStore.update((state) => ({
      ...state,
      models: this.currentModels,
    }));
  }

  private generating: boolean = false;
  private currentFetch: Promise<TxtImgNode> | undefined = undefined;

  /** Start generating sample images */
  private async generateSamples() {
    this.generating = true;

    while (true) {
      let currents: TxtImgNode[] = [];

      this.generationSettings.models = this.currentModels;
      this.generationSettings.seed = undefined;
      for (let i = 0; i < batchSize; i++) {
        this.currentFetch = fetchTxtImgNode(
          saveStore.state,
          this.generationSettings,
          this.rootNode
        );
        const node = await this.currentFetch;
        if (!this.generating) return;
        currents.push(node);
      }

      this.generationSettings.models = this.candidateModels;
      for (const current of currents) {
        this.generationSettings.seed = current.seed.actual;
        this.currentFetch = fetchTxtImgNode(
          saveStore.state,
          this.generationSettings,
          this.rootNode
        );
        const candidate = await this.currentFetch;
        if (!this.generating) return;
        this.sampleStoreInternal.update((samples) => [
          ...samples,
          { current: current, candidate: candidate },
        ]);
      }
    }
  }

  async next(currentScore: number, candidateScore: number) {
    this.generating = false;
    this.sampleStoreInternal.set([]);

    await this.currentFetch;

    this.maybeAccept(currentScore, candidateScore);
    this.pickCandidate();
    console.log({
      current: this.currentModels,
      candidate: this.candidateModels,
    });
    this.generateSamples();

    this.iteration++;
    this.temperature /= this.temperatureFactor;
  }

  shouldStop(currentScore: number, candidateScore: number, skipped: number) {
    const mercy = 5;
    const draw = 50 / Math.pow(this.temperature, 0.7);
    if (currentScore - candidateScore >= mercy) return true;
    if (candidateScore - currentScore >= mercy) return true;
    if (candidateScore + currentScore + skipped >= draw) return true;
    return false;
  }

  destroy() {
    this.generating = false;
  }
}

function randNormal() {
  let u = 1 - Math.random();
  let v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
