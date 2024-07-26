import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js"
import { Synthetizer } from "./spessasynth_lib/synthetizer/synthetizer.js"
import { Sequencer } from "./spessasynth_lib/sequencer/sequencer.js"
import {MIDI} from "./spessasynth_lib/midi_parser/midi_loader.js";

const channel = document.getElementById("channel");
const chord = document.getElementById("start_chord");
const patch = document.getElementById("patch");
const midi = document.getElementById("midi");
const start = document.getElementById("go");
const title = document.getElementById("title");

start.onclick = async () => {
    /**
     * @type {File}
     */
    const midiFile = midi.files[0];

    console.log({
        input_midi: midiFile,
        input_channel: parseInt(channel.value),
        input_patch: parseInt(patch.value),
        input_start_chord: parseInt(chord.value),
    });

    title.innerText = "Sending request to hugging face...";
    start.disabled = true;
    // request the new file
    const client = await Client.connect("asigalov61/MIDI-Melody");
    const result = await client.predict("/AddMelody", {
        input_midi: midiFile,
        input_channel: parseInt(channel.value),
        input_patch: parseInt(patch.value),
        input_start_chord: parseInt(chord.value),
    });

    // load the midi as array buffer
    const newMidi = result.data[2];
    const mid = await (await fetch(newMidi.url)).arrayBuffer();
    console.log(mid, newMidi.url);

    // create spessasynth
    title.innerText = "starting synthesizer...";
    // load soundfont
    const sfont = await (await fetch("../SGM.sf3")).arrayBuffer();

    // create synthesizer
    const ctx = new AudioContext();
    await ctx.audioWorklet.addModule( "src/spessasynth_lib/synthetizer/worklet_system/worklet_processor.js");
    const synth = new Synthetizer(ctx.destination, sfont);

    // create sequencer and play
    const seq = new Sequencer([new MIDI(mid)], synth);
    seq.play();
    title.innerText = "Playing"
}
