import normal from "@stdlib/stats-base-dists-normal-pdf";
import beta from "@stdlib/stats-base-dists-beta-pdf";

export class MutationInterest {
  private readonly modelInterest: Record<string, number> = {};
  private readonly mutationInterest: Record<string, number[]> = {};

  constructor(modelWeights: Record<string, number>, temperature: number) {
    for (const model in modelWeights) {
      if (modelWeights[model] <= 0) continue;

      this.modelInterest[model] = 1;
      this.mutationInterest[model] = new Array(101).fill(1);
      this.adjustMutationInterest(
        model,
        modelWeights[model],
        modelWeights[model],
        0.5,
        false,
        temperature
      );
      this.normaliseMutationInterest(model);
    }
  }

  getInterest(): Record<string, number[]> {
    const interest: Record<string, number[]> = {};
    for (const model in this.modelInterest) {
      const scaleFactor = this.modelInterest[model];
      const weightInterest = this.mutationInterest[model];
      interest[model] = weightInterest.map((x) => x * scaleFactor);
    }
    return interest;
  }

  random(): { model: string; weight: number } {
    const modelWeights = Object.entries(this.modelInterest);
    const modelIdx: number = weightedRandom(modelWeights, (model) => model[1]);
    const model: string = modelWeights[modelIdx][0];

    const mutationWeights: number[] = this.mutationInterest[model];
    const weight: number = weightedRandom(mutationWeights);
    return { model, weight };
  }

  adjust(
    model: string,
    currentWeight: number,
    candidateWeight: number,
    score: number,
    accepted: boolean,
    temperature: number
  ) {
    this.adjustModelInterest(model);

    if (accepted) {
      for (const model in this.mutationInterest) {
        this.decayMutationInterest(model);
        this.normaliseMutationInterest(model);
      }
    }

    this.adjustMutationInterest(
      model,
      currentWeight,
      candidateWeight,
      score,
      accepted,
      temperature
    );
    this.normaliseMutationInterest(model);
  }

  private adjustModelInterest(recentModel: string) {
    for (const model in this.modelInterest) {
      if (model === recentModel) this.modelInterest[model] = 1;
      else this.modelInterest[model] *= 1.5;
    }
  }

  private adjustMutationInterest(
    model: string,
    currentWeight: number,
    candidateWeight: number,
    score: number,
    accepted: boolean,
    temperature: number
  ) {
    const weightDelta = candidateWeight - currentWeight;
    const newWeight = accepted ? candidateWeight : currentWeight;

    const draw = beta(score, 10, 10) / beta(0.5, 10, 10);
    const win = score >= 1 ? 1 : beta(score, 3, 1) / 3;
    const lose = score <= 1 ? 0 : beta(score, 1, 3) / 3;

    const drawFactor = Math.pow(/* 2 */ 1, draw); // Disabled, replaced with NN on backend
    const drawRelevancePeak = (currentWeight + candidateWeight) / 2;
    const drawVariance = temperature * 2.5;
    const drawImpactCalc = new PartialImpactCalculator(
      drawFactor,
      drawRelevancePeak,
      drawVariance
    );

    const winFactor = Math.pow(/* 3 */ 1, win); // Disabled, replaced with NN on backend
    const winRelevancePeak = candidateWeight + weightDelta;
    const winVariance = temperature * 5;
    const winImpactCalc = new PartialImpactCalculator(
      winFactor,
      winRelevancePeak,
      winVariance
    );

    const loseFactor = Math.pow(/* 3 */ 1, lose); // Disabled, replaced with NN on backend
    const loseRelevancePeak = currentWeight - weightDelta;
    const loseVariance = temperature * 5;
    const loseImpactCalc = new PartialImpactCalculator(
      loseFactor,
      loseRelevancePeak,
      loseVariance
    );

    const nearCandidateFactor = 0.01;
    const nearCandidateRelevancePeak = candidateWeight;
    const nearCandidateVariance = temperature * 2;
    const nearCandidateImpactCalc = new PartialImpactCalculator(
      nearCandidateFactor,
      nearCandidateRelevancePeak,
      nearCandidateVariance
    );

    const nearNewFactor = 0.7;
    const nearNewRelevancePeak = newWeight;
    const nearNewVariance = temperature * 2;
    const nearNewImpactCalc = new PartialImpactCalculator(
      nearNewFactor,
      nearNewRelevancePeak,
      nearNewVariance
    );

    const farFactor = 0.1;
    const farRelevancePeak = newWeight;
    const farVariance = temperature * 15;
    const farImpactCalc = new PartialImpactCalculator(
      farFactor,
      farRelevancePeak,
      farVariance,
      "invertRelevance"
    );

    this.mutationInterest[model] = this.mutationInterest[model].map(
      (interest, weight) => {
        const drawImpact = drawImpactCalc.on(weight);
        const winImpact = winImpactCalc.on(weight);
        const loseImpact = loseImpactCalc.on(weight);
        const nearCandidateImpact = nearCandidateImpactCalc.on(weight);
        const nearNewImpact = nearNewImpactCalc.on(weight);
        const farImpact = farImpactCalc.on(weight);

        return (
          interest *
          drawImpact *
          winImpact *
          loseImpact *
          nearCandidateImpact *
          nearNewImpact *
          farImpact
        );
      }
    );
  }

  private normaliseMutationInterest(model: string) {
    const interest = this.mutationInterest[model];

    const target = interest.length;
    const actual = interest.reduce((a, b) => a + b, 0);
    const scale = target / actual;

    this.mutationInterest[model] = interest.map((value) => value * scale);
  }

  private decayMutationInterest(model: string) {
    this.mutationInterest[model] = this.mutationInterest[model].map((value) =>
      Math.pow(value, 0.9)
    );
  }
}

function weightedRandom<T>(list: T[], weight: (elem: T) => number): number;
function weightedRandom(list: number[]): number;
function weightedRandom<T>(list: T[], weight?: (elem: T) => number): number {
  const totalWeight = list.reduce((a, b) => {
    const bWeight = weight ? weight(b) : (b as number);
    return a + bWeight;
  }, 0);
  const rand = Math.random() * totalWeight;

  let cumWeight = 0;
  for (let i = 0; i < list.length; i++) {
    const elemWeight = weight ? weight(list[i]) : (list[i] as number);
    cumWeight += elemWeight;
    if (cumWeight >= rand) return i;
  }

  return list.length - 1;
}

class PartialImpactCalculator {
  private readonly peakRelevance: number;
  private readonly invertRelevance: boolean;

  constructor(
    private readonly factor: number,
    private readonly mean: number,
    private readonly variance: number,
    invert?: "invertRelevance"
  ) {
    this.peakRelevance = normal(this.mean, this.mean, this.variance);
    this.invertRelevance = invert !== undefined;
  }

  on(weight: number): number {
    const relevance = normal(weight, this.mean, this.variance);
    const adjustedRelevance = relevance / this.peakRelevance;
    const invertedRelevance = this.invertRelevance
      ? 1 - adjustedRelevance
      : adjustedRelevance;
    const impact = Math.pow(this.factor, invertedRelevance);
    return impact;
  }
}
