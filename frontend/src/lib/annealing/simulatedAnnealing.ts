import { writable, type Readable, type Writable } from "svelte/store";
import { saveStore } from "../persistence/saves";
import type { AnyNode } from "../state/nodeTypes/nodes";
import {
  createRootNode,
  rootNodeStore,
  type RootNode,
} from "../state/nodeTypes/rootNodes";
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
  private trackerNode: RootNode = rootNodeStore.state;
  private readonly trackerSeed: number =
    Math.random() * Number.MAX_SAFE_INTEGER;

  private readonly generationSettings: GenerationSettings;
  private readonly modelsList: string[];
  private readonly temperatureFactor: number;
  public readonly steps: number;

  private accepted: boolean = true;

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
    const maxWeight = Math.max(...Object.values(this.candidateModels));
    const scaleFactor = 10 / maxWeight;
    for (const model in this.candidateModels) {
      this.candidateModels[model] *= scaleFactor;
    }

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
    const rand = Math.abs(randNormal());
    const mutation = Math.abs(
      2.5 * rand * (Math.exp(this.temperature / 5) - 1)
    );

    const addWeight = oldWeight + mutation;
    const subWeight = oldWeight - mutation;

    const canAdd = addWeight <= 10;
    const canSub = subWeight >= 0;

    if (Math.random() >= 0.5) {
      // add
      if (canAdd) {
        this.candidateModels[model] = addWeight;
      } else if (canSub) {
        const excess = addWeight - 10;
        const chance = excess / mutation;
        if (Math.random() <= chance) {
          // sub instead
          this.candidateModels[model] = subWeight;
        } else {
          this.candidateModels[model] = 10;
        }
      } else if (oldWeight >= 0.5) {
        this.candidateModels[model] = 0;
      } else {
        this.candidateModels[model] = 10;
      }
    } else {
      // sub
      if (canSub) {
        this.candidateModels[model] = subWeight;
      } else if (canSub) {
        const excess = Math.abs(subWeight);
        const chance = excess / mutation;
        if (Math.random() <= chance) {
          // add instead
          this.candidateModels[model] = addWeight;
        } else {
          this.candidateModels[model] = 0;
        }
      } else if (oldWeight >= 0.5) {
        this.candidateModels[model] = 0;
      } else {
        this.candidateModels[model] = 10;
      }
    }
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
    this.generationSettings.seed = this.trackerSeed;
    this.currentFetch = fetchTxtImgNode(
      saveStore.state,
      this.generationSettings,
      this.trackerNode
    );
    const newTrackerNode = await this.currentFetch;
    this.trackerNode.children.update((children) => [
      ...children,
      newTrackerNode,
    ]);
    if (this.accepted) {
      this.trackerNode = newTrackerNode as any;
    }

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

    this.accepted = this.maybeAccept(currentScore, candidateScore);
    this.pickCandidate();
    console.log({
      current: this.currentModels,
      candidate: this.candidateModels,
    });

    const currentSamples: TxtImgNode[] = remainingSamples.map((sample) =>
      this.accepted ? sample.candidate : sample.current
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
