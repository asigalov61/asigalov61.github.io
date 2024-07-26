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

    // ===========================================================================================================

    const canvas = document.getElementById("canvas");                         // get canvas
    const drawingContext = canvas.getContext("2d");
    /**
     * create the AnalyserNodes for the channels
     */
    const analysers = [];
    for (let i = 0; i < 16; i++) {
        analysers.push(context.createAnalyser()); // create analyser
    }

    // connect them to the synthesizer
    synth.connectIndividualOutputs(analysers);

    // render analysers in a 4x4 grid
    function render()
    {
        // clear the rectangle
        drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        analysers.forEach((analyser, channelIndex) => {
            // calculate positions
            const width = canvas.width / 4;
            const height = canvas.height / 4;
            const step = width / analyser.frequencyBinCount;
            const x = width * (channelIndex % 4); // channelIndex % 4 gives us 0 to 2 range
            const y = height * Math.floor(channelIndex / 4) + height / 2;

            // draw the waveform
            const waveData = new Float32Array(analyser.frequencyBinCount);
            // get the data from analyser
            analyser.getFloatTimeDomainData(waveData);
            drawingContext.beginPath();
            drawingContext.moveTo(x, y);
            for (let i = 0; i < waveData.length; i++)
            {
                drawingContext.lineTo(x + step * i, y + waveData[i] * height);
            }
            drawingContext.stroke();
        });

        // draw again
        requestAnimationFrame(render);
    }
    render();

    // create a keyboard
    const keyboard = document.getElementById("keyboard");
    // create an array of 128 keys
    const keys = [];
    for (let i = 0; i < 128; i++)
    {
        const key = document.createElement("td");
        key.style.width = "5px";
        key.style.height = "50px";
        key.style.border = "solid black 1px";
        keyboard.appendChild(key);
        keys.push(key);
    }

    // add listeners to show keys being pressed

    // add note on listener
    synth.eventHandler.addEvent("noteon", "demo-keyboard-note-on", event => {
        keys[event.midiNote].style.background = "green"
    });

    // add note off listener
    synth.eventHandler.addEvent("noteoff", "demo-keyboard-note-off", event => {
        keys[event.midiNote].style.background = "white";
    })
    
}
