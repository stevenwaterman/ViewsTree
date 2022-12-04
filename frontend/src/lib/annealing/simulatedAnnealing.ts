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
        this.candidateModels[model] = Math.random() * 10;
      } else {
        this.candidateModels[model] = 0;
      }
    }

    this.next(0, 1, 0);
  }

  /** Generate a new set of models to use as a candidate based on temperature */
  private pickCandidate() {
    this.candidateModels = { ...this.currentModels };

    const model =
      this.lruModels[Math.floor(Math.random() * this.lruModels.length * 0.5)];
    this.lruModels.splice(this.lruModels.indexOf(model), 1);
    this.lruModels.push(model);

    let factorPower = randNormal();
    if (factorPower > 0) factorPower += this.temperature / 10;
    else factorPower -= this.temperature / 10;
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

  private getAcceptChance(
    currentScore: number,
    candidateScore: number,
    skipped: number
  ) {
    const totalRounds = currentScore + candidateScore + skipped;
    const currentWinFrac = currentScore / totalRounds;
    const candidateWinFrac = candidateScore / totalRounds;
    const winFracDifference = currentWinFrac - candidateWinFrac;
    const acceptChance = Math.exp(-(20 * winFracDifference) / this.temperature);
    return acceptChance;
  }

  /** Potentially accept the candidate models based on temperature and preference */
  private maybeAccept(
    currentScore: number,
    candidateScore: number,
    skipped: number
  ) {
    if (candidateScore >= currentScore) {
      console.log("Better, accepting");
      return this.accept();
    }

    const acceptChance = this.getAcceptChance(
      currentScore,
      candidateScore,
      skipped
    );

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
      this.generationSettings.models = this.currentModels;
      this.generationSettings.seed = undefined;
      this.currentFetch = fetchTxtImgNode(
        saveStore.state,
        this.generationSettings,
        this.rootNode
      );
      const currentNode = await this.currentFetch;
      if (!this.generating) return;

      this.generationSettings.models = this.candidateModels;
      this.generationSettings.seed = currentNode.seed.actual;
      this.currentFetch = fetchTxtImgNode(
        saveStore.state,
        this.generationSettings,
        this.rootNode
      );
      const candidateNode = await this.currentFetch;
      if (!this.generating) return;
      this.sampleStoreInternal.update((samples) => [
        ...samples,
        { current: currentNode, candidate: candidateNode },
      ]);
    }
  }

  async next(currentScore: number, candidateScore: number, skipped: number) {
    if (this.iteration > this.steps) return;

    this.generating = false;
    this.sampleStoreInternal.set([]);

    await this.currentFetch;

    this.maybeAccept(currentScore, candidateScore, skipped);
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
    const totalRounds = candidateScore + currentScore + skipped;

    // If new models are winning by 3, we are confident they will win and therefore will be accepted
    if (totalRounds >= 5 && candidateScore - currentScore >= 3) return true;

    // Requirement is higher to stop when old model is winning, because the fraction of votes won is important
    if (currentScore - candidateScore >= 6) return true;

    // That's pretty conclusive now
    if (
      totalRounds >= 6 &&
      this.getAcceptChance(currentScore, candidateScore, skipped) < 0.05
    )
      return true;

    // Give up, they're equal
    const draw = 50 / this.temperature;
    if (totalRounds >= draw) return true;

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
