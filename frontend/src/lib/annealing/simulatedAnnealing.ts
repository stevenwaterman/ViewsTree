import { writable, type Readable, type Writable } from "svelte/store";
import { queueTxtImg } from "../generator/generator";
import { saveStore } from "../persistence/saves";
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
import { MutationInterest } from "./mutationInterest";

export class SimulatedAnnealing {
  private static instance: SimulatedAnnealing | undefined = undefined;

  public static async create(
    generationSettings: GenerationSettings,
    startTemperature: number,
    endTemperature: number,
    stepsPerModel: number
  ): Promise<SimulatedAnnealing> {
    if (this.instance === undefined) {
      this.instance = new SimulatedAnnealing(
        generationSettings,
        startTemperature,
        endTemperature,
        stepsPerModel
      );

      await fetch(`http://localhost:5001/prior`, {
        method: "PUT",
        body: JSON.stringify({ models: this.instance.modelsList }),
      });

      this.instance.next(0, 1);
    }

    return this.instance;
  }

  public static get(): SimulatedAnnealing {
    return this.instance!;
  }

  private currentTrackerNode: TxtImgNode = rootNodeStore.state as any;
  private candidateTrackerNode: TxtImgNode;
  private readonly trackerSeed: number;

  private readonly mutationInterest: MutationInterest;
  private mutation: { model: string; weight: number };

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
    this.trackerSeed =
      this.generationSettings.seed ?? Math.random() * Number.MAX_SAFE_INTEGER;

    this.modelsList = Object.entries(this.generationSettings.models)
      .filter((entry) => entry[1] > 0)
      .map((entry) => entry[0]);

    this.steps = stepsPerModel * this.modelsList.length;
    this.temperature = startTemperature;

    const totalTemperatureChange = startTemperature / endTemperature;
    this.temperatureFactor = Math.pow(totalTemperatureChange, 1 / this.steps);

    this.candidateModels = { ...this.generationSettings.models };
    const maxWeight = Math.max(...Object.values(this.candidateModels));
    const scaleFactor = 100 / maxWeight;
    for (const model in this.candidateModels) {
      this.candidateModels[model] *= scaleFactor;
    }

    this.mutationInterest = new MutationInterest(
      this.candidateModels,
      this.temperature
    );
  }

  private getAcceptChance(candidateWinFrac: number) {
    if (candidateWinFrac >= 0.5) return 1;

    const currentWinFrac = 1 - candidateWinFrac;
    const winFracDifference = currentWinFrac - candidateWinFrac;
    const acceptChance = Math.exp(-(20 * winFracDifference) / this.temperature);
    return acceptChance;
  }

  /** Potentially accept the candidate models based on temperature and preference */
  private shouldAccept(score: number): boolean {
    if (score >= 0.5) {
      console.log("Score", score, 100, "%");
      return true;
    }

    const acceptChance = this.getAcceptChance(score);
    console.log("Score", score, (acceptChance * 100).toFixed(0), "%");

    return Math.random() <= acceptChance;
  }

  private generating: boolean = false;
  private currentFetch: Promise<TxtImgNode> | undefined = undefined;

  /** Start generating sample images */
  private async generateSamples(currentSamples: TxtImgNode[]) {
    this.generating = true;

    const pendingCurrent: TxtImgNode[] = currentSamples.filter(
      (sample) => sample.seed.actual !== this.trackerSeed
    );

    if (this.accepted) {
      this.generationSettings.models = this.currentModels;
      this.generationSettings.seed = this.trackerSeed;
      this.currentFetch = fetchTxtImgNode(
        saveStore.state,
        this.generationSettings,
        this.rootNode
      );
      this.candidateTrackerNode = await this.currentFetch;
      this.currentTrackerNode.children.update((children) => [
        ...children,
        this.candidateTrackerNode as any,
      ]);
      pendingCurrent.push(this.candidateTrackerNode);
      saveStore.save();
      if (!this.generating) return;
    } else {
      // Fire one current generation to make sure we don't overwrite the current models on the backendw
      this.generationSettings.models = this.currentModels;
      this.generationSettings.seed = undefined;
      this.currentFetch = fetchTxtImgNode(
        saveStore.state,
        this.generationSettings,
        this.rootNode
      );
      pendingCurrent.push(await this.currentFetch);
      saveStore.save();
      if (!this.generating) return;

      this.generationSettings.models = this.candidateModels;
      this.generationSettings.seed = this.trackerSeed;
      this.currentFetch = fetchTxtImgNode(
        saveStore.state,
        this.generationSettings,
        this.currentTrackerNode as any
      );
      this.candidateTrackerNode = await this.currentFetch;
      this.currentTrackerNode.children.update((children) => [
        ...children,
        this.candidateTrackerNode as any,
      ]);
      saveStore.save();
      if (!this.generating) return;

      if ((this.currentTrackerNode.type as string) !== "Root") {
        this.sampleStoreInternal.update((samples) => [
          ...samples,
          {
            current: this.currentTrackerNode,
            candidate: this.candidateTrackerNode,
          },
        ]);
      }
    }

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
    // No point generating more than 2x the number of max rounds, they'll never get used
    const maxRounds = this.getMaxRounds();
    for (let i = 0; i < maxRounds * 2; i++) {
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

  private accepted: boolean = true;

  async next(currentScore: number, candidateScore: number) {
    this.generating = false;
    if (this.iteration > this.steps) return;

    const totalRounds = Math.ceil(currentScore + candidateScore);
    const remainingSamples = this.sampleStoreInternal.state.slice(totalRounds);
    this.sampleStoreInternal.set([]);

    const score = candidateScore / (currentScore + candidateScore);
    this.accepted = this.shouldAccept(score);

    if (this.mutation !== undefined) {
      const model = this.mutation.model;
      this.mutationInterest.adjust(
        model,
        this.currentModels[model],
        this.candidateModels[model],
        score,
        this.accepted,
        this.temperature
      );

      await fetch("http://localhost:5001/prior/train", {
        method: "POST",
        body: JSON.stringify({
          current: this.currentModels,
          mutation: this.mutation,
          score,
        }),
      });
    }

    if (this.accepted) {
      this.currentModels = { ...this.candidateModels };
      generationSettingsStore.update((state) => ({
        ...state,
        models: this.currentModels,
      }));
    } else {
      this.candidateModels = { ...this.currentModels };
    }

    const potentialMutations: Array<{ model: string; weight: number }> = [];
    for (let i = 0; i < 100; i++) {
      potentialMutations.push(this.mutationInterest.random());
    }
    this.mutation = await fetch("http://localhost:5001/prior/next", {
      method: "POST",
      body: JSON.stringify({
        current: this.currentModels,
        mutations: potentialMutations,
      }),
    }).then((res) => res.json());

    this.candidateModels[this.mutation.model] = this.mutation.weight;

    console.log(
      "Accepted:",
      this.accepted,
      "Next Mutation:",
      this.mutation.model,
      this.currentModels[this.mutation.model],
      "to",
      this.candidateModels[this.mutation.model]
    );

    const currentSamples: TxtImgNode[] = remainingSamples.map((sample) =>
      this.accepted ? sample.candidate : sample.current
    );
    if (this.accepted && this.candidateTrackerNode !== undefined) {
      this.currentTrackerNode = this.candidateTrackerNode;
    }

    this.iteration++;
    this.temperature /= this.temperatureFactor;

    await this.currentFetch;
    this.generateSamples(currentSamples);
  }

  private getMaxRounds(): number {
    return 20 * Math.exp(-this.temperature / 2);
  }

  shouldStop(currentScore: number, candidateScore: number) {
    const maxRounds = 20 * Math.exp(-this.temperature / 2);
    const totalRounds = currentScore + candidateScore;
    const remainingRounds = maxRounds - totalRounds;

    // All rounds complete
    if (remainingRounds <= 0) return true;

    // Even if the candidate loses every remaining round, they'd win
    const worstCaseAcceptChance = this.getAcceptChance(
      candidateScore / maxRounds
    );
    if (worstCaseAcceptChance >= 1) {
      console.log("Candidate won early");
      return true;
    }

    // Even if the candidate wins every remaining round, there's less than a 1% chance of acceptance
    const bestCaseAcceptChance = this.getAcceptChance(
      (candidateScore + remainingRounds) / maxRounds
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
