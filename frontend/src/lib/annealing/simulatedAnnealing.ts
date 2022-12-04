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
  private readonly lruModels: string[];
  private readonly temperatureFactor: number;
  public readonly steps: number;

  private readonly sampleStoreInternal: Writable<
    { current: TxtImgNode; candidate: TxtImgNode }[]
  > = writable([]);

  public readonly sampleStore: Readable<
    { current: TxtImgNode; candidate: TxtImgNode }[]
  > = this.sampleStoreInternal;

  private _iteration: number = 0;
  private _iterationStore: Writable<number> = writable(0);
  public get iteration(): number {
    return this._iteration;
  }
  private set iteration(value: number) {
    this._iteration = value;
    this._iterationStore.set(value);
  }
  public get iterationStore(): Readable<number> {
    return this._iterationStore;
  }

  private _temperature: number;
  private _temperatureStore: Writable<number> = writable(0);
  public get temperature(): number {
    return this._temperature;
  }
  private set temperature(value: number) {
    this._temperature = value;
    this._temperatureStore.set(value);
  }
  public get temperatureStore(): Readable<number> {
    return this._temperatureStore;
  }

  private currentModels: Record<string, number> = {};
  private candidateModels: Record<string, number> = {};

  private rootNode: RootNode = createRootNode();

  constructor(
    generationSettings: GenerationSettings,
    startTemperature: number,
    endTemperature: number,
    stepsPerModel: number
  ) {
    this.generationSettings = { ...generationSettings };

    this.modelsList = Object.entries(this.generationSettings.models)
      .filter((entry) => entry[1] > 0)
      .map((entry) => entry[0]);

    this.lruModels = [...this.modelsList]
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);

    this.steps = stepsPerModel * this.modelsList.length;
    this.temperature = startTemperature;

    const totalTemperatureChange = startTemperature / endTemperature;
    this.temperatureFactor = Math.pow(totalTemperatureChange, 1 / this.steps);

    this.candidateModels = { ...this.generationSettings.models };
    for (const model in this.candidateModels) {
      if (this.modelsList.includes(model)) {
        this.candidateModels[model] = Math.random();
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
      this.lruModels[Math.floor(Math.random() * this.lruModels.length * 0.5)];
    this.lruModels.splice(this.lruModels.indexOf(model), 1);
    this.lruModels.push(model);

    let factorPower = randNormal();
    if (factorPower > 0) factorPower += this.temperature / 0.1;
    else factorPower -= this.temperature / 0.1;
    factorPower *= this.temperature;
    const modelFactor = Math.pow(1.2, factorPower);

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

    const totalScore = currentScore + candidateScore;
    const currentWinFrac = currentScore / totalScore;
    const candidateWinFrac = candidateScore / totalScore;
    const winFracDifference = currentWinFrac - candidateWinFrac;
    const acceptChance = Math.exp(-(20 * winFracDifference) / this.temperature);

    console.log(
      "Score",
      currentScore,
      candidateScore,
      (acceptChance * 100).toFixed(0),
      "%"
    );

    const accept = Math.random() <= acceptChance;
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
    if (this.iteration > this.steps) return;

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
    // If new models are winning by 3, we are confident they will win and therefore will be accepted
    if (candidateScore - currentScore >= 3) return true;

    // Requirement is higher to stop when old model is winning, because the fraction of votes won is important
    if (currentScore - candidateScore >= 8) return true;
    const draw = 50 / Math.pow(this.temperature, 0.7);
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
