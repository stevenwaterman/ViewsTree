import type { Instrument } from "../../constants";
import type { NotesPlayer } from "./NotesPlayer";
import type { NoteSynth } from "./NoteSynth";
import type { ProcessedNotes, ProcessedActiveNotes } from "../../bridge/postProcessor";
import type { CompleteNote, IncompleteNote } from "../../bridge/decoder";

export abstract class InstrumentSynth<I extends Instrument> implements NotesPlayer, NoteSynth {
  protected abstract instrument: I;

  public async schedule(ctx: BaseAudioContext, destination: AudioNode, notes: ProcessedNotes, activeAtEnd: ProcessedActiveNotes) {
    await this.setup(ctx, destination);
    notes[this.instrument].forEach(note => this.loadNote(note, ctx, destination));
    Object.values(activeAtEnd[this.instrument]).forEach(note => this.loadIncompleteNote(note, ctx, destination));
  }

  abstract loadNote(note: CompleteNote, ctx: BaseAudioContext, destination: AudioNode): Promise<void>;
  abstract loadIncompleteNote(note: IncompleteNote, ctx: BaseAudioContext, destination: AudioNode): Promise<void>;
  abstract setup(ctx: BaseAudioContext, destination: AudioNode): Promise<void>;
}
