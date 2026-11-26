export const PROJECT_DRILLS = [
  {
    id: "budget", title: "Budget a yard refresh",
    setup: "You have 90 game cash and want to keep 20 untouched. A planter costs 35, soil and plants cost 25, and an optional lamp costs 28.",
    question: "Which plan fits your goal and protects the reserve?",
    options: [
      ["Buy everything for 88", "You’d have 2 left. Separate the need from the nice-to-have and try again."],
      ["Spend 60 on the planter and supplies", "That leaves 30. You can do the job now and still have a buffer for surprises."],
      ["Buy only the lamp for 28", "You keep the reserve, but you haven’t funded the planter refresh yet."],
    ],
    correct: 1,
  },
  {
    id: "gig", title: "Price a small gig",
    setup: "A fictional job pays 80 game cash. Supplies cost 18, the platform takes 8, and you expect 3 hours including setup and messages.",
    question: "What would you keep per hour before taxes?",
    options: [
      ["About 26.67 per hour", "That divides gross pay by time. It doesn’t subtract the supplies and fee."],
      ["About 20.67 per hour", "That subtracts supplies but overlooks the platform fee."],
      ["18 per hour", "Right: 80 minus 18 minus 8 is 54, then divide by 3 hours. Estimate the time and fees before you quote."],
    ],
    correct: 2,
  },
  {
    id: "pilot", title: "Test a business idea",
    setup: "You and Aimmianna want to sell custom planter labels. You don’t know whether anyone wants them, and making a batch costs game cash.",
    question: "What would teach you the most before you commit money?",
    options: [
      ["Make one sample and ask potential buyers", "Right. Show a sample, ask what they would actually use, and use their feedback before pricing a batch."],
      ["Buy supplies for fifty labels", "A full batch commits money before you’ve learned what people want."],
      ["Promise delivery dates before testing", "Test how long one sample takes before setting a deadline you have to meet."],
    ],
    correct: 0,
  },
];

export const PROJECT_TYPES = { diy: "DIY project", gig: "Paid gig", business: "Small business idea" };
export const CREATOR_STEPS = [
  {
    id: "model", title: "Model your own goth planter",
    start: "Draw a pot on paper or in your phone’s notes. Label how wide and tall you want it to be. That’s enough for the first step.",
    do: "In a 3D editor you already have, add one cylinder, a shape like a can. Make it wider or taller to match your sketch. Save it. Later, try adding a wider ring for the rim and choosing a dark color. If your editor can export GLB, try exporting and reopening it.",
    words: "GLB is a file that can package the 3D shape and its colors together. Your editable project is the version you keep working on. The Blender guide is optional if you use a different editor.",
    result: "A source file, a GLB, and one screenshot of your own design.",
    source: ["Blender’s GLB export guide", "https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html"],
    prompt: "Coach me through modeling a simple goth planter as my first prop. Ask me what editor and device I am using, then give me only the first action to try myself. Help me check the result before we move on.",
  },
  {
    id: "animation", title: "Code your first animation",
    start: "Press Run animation. Change 45 to 90 and run it again. What changed?",
    do: "Try 0 to stop the motion, or -45 to reverse it. This line is JavaScript. It names a value, speed, that the demo uses to work out how far the deck should turn each second.",
    words: "A variable gives a value a name. A degree measures part of a turn. 360 degrees is one full turn. This practice box reads just the speed line; it doesn’t run arbitrary code.",
    result: "A preview you made faster, slower, or reversed, and one sentence explaining what the number does.",
    prompt: "Teach me beginner JavaScript animation with a tiny example. I changed a speed number and saw a prop turn. Ask me what changed before explaining variables or how animation frames work. Give me one small thing to try myself.",
  },
  {
    id: "skit", title: "Make a tiny animated skit",
    start: "Start with one joke or one small surprise. Write three short lines: what starts it, what happens, and how it ends.",
    do: "Play all three beats, then make the action beat faster or give the ending a pause. Keep your first video to one location and one simple action. To make it into a video yourself, recreate the three shots in the animation or video editor you prefer and put them in this order. Add captions before worrying about music or effects.",
    words: "A beat is a small moment in a story. A storyboard is your plan for the shots. A cut is where a video switches from one shot to the next.",
    result: "A short rehearsal you can watch, revise, and use as a shot list in an editor. The rehearsal isn’t a video export.",
    prompt: "Coach me through making my first three-shot animated skit or video. Ask what tools I already have and what I want the viewer to feel, then tell me one action I can do myself. Don’t create or publish it for me.",
  },
  {
    id: "ar", title: "Try a real-scale AR preview",
    start: "Open the guide and try its sample. Look for “View in your space.” You don’t need to use your own model yet.",
    do: "If your phone offers that option, aim at a clear floor or tabletop and follow the prompts to place the sample. Check what changes when you walk around it. If it only spins on your screen, you’re using the 3D view. That’s a useful test result too.",
    words: "AR means augmented reality: seeing a virtual object through your phone camera as if it were in the room. Normal 3D viewing doesn’t use your camera.",
    result: "A test note on scale, placement, and what your device actually supported. No upload is done from Apartment Life.",
    source: ["Google’s Scene Viewer guide", "https://developers.google.com/ar/develop/scene-viewer?hl=en"],
    prompt: "Coach me through testing an AR placement demo, one step at a time. First ask me which phone and viewer I have. Show me a 3D-only fallback and do not assume my phone supports AR.",
  },
  {
    id: "app", title: "Build a tiny Android app",
    start: "Draw a phone-shaped rectangle. Write “My Planter” at the top and “Change color” on a button. That’s your first app sketch.",
    do: "When you’re ready to build on a computer, follow the first Android lesson. Get the sample to run before changing it. Start by changing only its title. Later, make one button switch the text between two color names.",
    words: "A prototype is a rough first version you can test. It doesn’t need accounts, real AR, or a published app listing.",
    result: "One working screen and one test note: what you tapped and what happened.",
    source: ["Android Developers: Your first Android app", "https://developer.android.com/courses/android-basics-compose/unit-1"],
    prompt: "Coach me through building a one-screen Android prototype for my 3D prop. Ask what tools I have and let me write it myself, one small step at a time. Explain how I can test each step.",
  },
  {
    id: "portfolio", title: "Turn the demo into a portfolio or gig idea",
    start: "Pick one thing you actually made. Take one clear screenshot, then write one sentence about what it does.",
    do: "If you want to try earning from it, write exactly what someone would get: for example, one simple custom prop and one chance to request a change. Estimate your time and costs in the planner. Ask for feedback before paying for tools or promising a deadline.",
    words: "A deliverable is what you hand over. A revision is a round of changes. A portfolio is a small collection that shows what you can do.",
    result: "A one-paragraph sample offer or portfolio description. No posting or applications happen here.",
    prompt: "Help me turn my first 3D prop or app prototype into one small portfolio piece and a possible paid offer. Ask what I actually built before suggesting scope, revisions, time, costs, or pricing assumptions. Do not post or apply.",
  },
];
const KEYS = ["cap", "materials", "other", "reserve", "payment"];
export function newProject() {
  return { id: "", type: "diy", name: "", scope: "", next: "", lesson: "", minutes: 0, cap: 0, materials: 0, other: 0, reserve: 0, payment: 0 };
}
const clipped = (s, n) => typeof s === "string" ? s.trim().slice(0, n) : "";
export function cleanProject(raw) {
  const plan = newProject();
  if (!raw || typeof raw !== "object") return plan;
  for (const [key, n] of Object.entries({ id: 45, name: 70, scope: 220, next: 220, lesson: 220 })) plan[key] = clipped(raw[key], n);
  if (Object.hasOwn(PROJECT_TYPES, raw.type)) plan.type = raw.type;
  for (const key of [...KEYS, "minutes"]) {
    const cap = key === "minutes" ? 60000 : 99999999;
    if (Number.isSafeInteger(raw[key]) && raw[key] >= 0 && raw[key] <= cap) plan[key] = raw[key];
  }
  if (plan.type === "diy") plan.payment = 0;
  return plan;
}
export function projectAmount(value) {
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(value.trim());
  return !value.trim() ? 0 : match ? Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0")) : null;
}
export function projectMath(plan) {
  const spending = plan.materials + plan.other;
  const net = plan.payment - spending;
  return {
    spending, withReserve: spending + plan.reserve, budgetRoom: plan.cap - spending - plan.reserve, net,
    perHour: plan.minutes > 0 ? Math.round(net * 60 / plan.minutes) : null,
  };
}
export function parseAnimationSpeed(line) {
  const m = /^const\s+speed\s*=\s*(-?\d{1,3})(?:\s*;)?$/.exec(line.trim());
  const speed = m ? Number(m[1]) : NaN;
  return Number.isInteger(speed) && Math.abs(speed) <= 360 ? speed : null;
}
export const SKIT_BEATS = [
  { label: "Setup", actor: "Aimmianna", line: "I found the perfect spot for this planter.", seconds: 3 },
  { label: "Action", actor: "Your avatar", line: "The skateboard had other plans.", seconds: 2 },
  { label: "Payoff", actor: "Aimmianna", line: "Fine. It’s a mobile garden now.", seconds: 4 },
];
export function cleanSkit(data) {
  return SKIT_BEATS.map(({ line, seconds }, i) => {
    const input = Array.isArray(data) ? data[i] : null;
    return {
      line: typeof input?.line === "string" ? input.line.trim().slice(0, 100) : line,
      seconds: Number.isInteger(input?.seconds) && input.seconds >= 1 && input.seconds <= 8 ? input.seconds : seconds,
    };
  });
}
