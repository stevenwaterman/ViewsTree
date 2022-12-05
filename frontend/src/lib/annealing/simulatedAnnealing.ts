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
import { stateful, type Stateful } from "../utils";

export class SimulatedAnnealing {
  private readonly generationSettings: GenerationSettings;
  private readonly modelsList: string[];
  private readonly temperatureFactor: number;
  public readonly steps: number;

  private readonly sampleStoreInternal: Stateful<
    Writable<{ current: TxtImgNode; candidate: TxtImgNode }[]>
  > = stateful(writable([]));

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

    this.steps = stepsPerModel * this.modelsList.length;
    this.temperature = startTemperature;

    const totalTemperatureChange = startTemperature / endTemperature;
    this.temperatureFactor = Math.pow(totalTemperatureChange, 1 / this.steps);

    this.candidateModels = { ...this.generationSettings.models };

    this.next(0, 1);
  }

  /** Generate a new set of models to use as a candidate based on temperature */
  private pickCandidate() {
    this.candidateModels = { ...this.currentModels };

    const activeModels = Object.entries(this.candidateModels)
      .filter((model) => model[1] > 0)
      .map((model) => model[0]);
    const forbiddenModels = activeModels.length === 1 ? activeModels : [];
    const allowedModels = this.modelsList.filter(
      (model) => !forbiddenModels.includes(model)
    );

    const model =
      allowedModels[Math.floor(Math.random() * allowedModels.length)];

    const oldWeight = this.candidateModels[model];
    const mutation = Math.abs(
      2.5 * randNormal() * (Math.exp(this.temperature / 5) - 1)
    );

    let newWeight: number = oldWeight;
    const maxAddition = 10 - oldWeight;
    const maxSubtraction = oldWeight;

    if (Math.random() >= 0.5) {
      // Add
      if (mutation <= maxAddition) {
        newWeight += mutation;
      } else if (mutation <= maxSubtraction) {
        newWeight -= mutation;
      } else {
        newWeight = 10;
      }
    } else {
      // Subtract
      if (mutation <= maxSubtraction) {
        newWeight -= mutation;
      } else if (mutation >= maxAddition) {
        newWeight += mutation;
      } else {
        newWeight = 0;
      }
    }

    this.candidateModels[model] = newWeight;
    console.log("Mutation: ", model, this.candidateModels[model] - oldWeight);
  }

  private getAcceptChance(currentScore: number, candidateScore: number) {
    const totalRounds = currentScore + candidateScore;
    const currentWinFrac = currentScore / totalRounds;
    const candidateWinFrac = candidateScore / totalRounds;
    const winFracDifference = currentWinFrac - candidateWinFrac;
    const acceptChance = Math.exp(-(20 * winFracDifference) / this.temperature);
    return acceptChance;
  }

  /** Potentially accept the candidate models based on temperature and preference */
  private maybeAccept(currentScore: number, candidateScore: number): boolean {
    if (candidateScore >= currentScore) {
      console.log("Better, accepting");
      this.accept();
      return true;
    }

    const acceptChance = this.getAcceptChance(currentScore, candidateScore);

    console.log(
      "Score",
      currentScore,
      candidateScore,
      (acceptChance * 100).toFixed(0),
      "%"
    );

    const accept = Math.random() <= acceptChance;
    console.log("Accepted: ", accept);
    if (accept) this.accept();
    return accept;
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
  private async generateSamples(currentSamples: TxtImgNode[]) {
    this.generating = true;

    let pendingCurrent: TxtImgNode[] = [...currentSamples];

    // Fire one current generation to make sure we don't overwrite the current models on the backend
    this.generationSettings.models = this.currentModels;
    this.generationSettings.seed = undefined;
    this.currentFetch = fetchTxtImgNode(
      saveStore.state,
      this.generationSettings,
      this.rootNode
    );
    pendingCurrent.push(await this.currentFetch);
    if (!this.generating) return;

    for (const currentNode of pendingCurrent) {
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

    // Used all premade nodes, start generating new ones
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

  async next(currentScore: number, candidateScore: number) {
    if (this.iteration > this.steps) return;

    this.generating = false;

    const totalRounds = currentScore + candidateScore;
    const remainingSamples = this.sampleStoreInternal.state.slice(totalRounds);
    this.sampleStoreInternal.set([]);

    await this.currentFetch;

    const accepted = this.maybeAccept(currentScore, candidateScore);
    this.pickCandidate();
    console.log({
      current: this.currentModels,
      candidate: this.candidateModels,
    });

    const currentSamples: TxtImgNode[] = remainingSamples.map((sample) =>
      accepted ? sample.candidate : sample.current
    );
    this.generateSamples(currentSamples);

    this.iteration++;
    this.temperature /= this.temperatureFactor;
  }

  shouldStop(currentScore: number, candidateScore: number) {
    const maxRounds = 20 * Math.exp(-this.temperature / 2);
    const totalRounds = currentScore + candidateScore;
    const remainingRounds = maxRounds - totalRounds;

    // All rounds complete
    if (remainingRounds <= 0) return true;

    // Even if the candidate loses every remaining round, they'd win
    const worstCaseAcceptChance = this.getAcceptChance(
      currentScore + remainingRounds,
      candidateScore
    );
    if (worstCaseAcceptChance >= 1) {
      console.log("Candidate won early");
      return true;
    }

    // Even fi the candidate wins every remaining round, there's less than a 1% chance of acceptance
    const bestCaseAcceptChance = this.getAcceptChance(
      currentScore,
      candidateScore + remainingRounds
    );
    if (bestCaseAcceptChance <= 0.01) {
      console.log("Current won early");
      return true;
    }

    return false;
  }

  stop() {
    this.generating = false;
  }
}

function randNormal() {
  let u = 1 - Math.random();
  let v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
