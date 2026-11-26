export const STORIES = {
  rain: {
    title: "The Rain Between Tracks", genre: "Short story · Goth / emo",
    hook: "A laundromat, a borrowed cassette, and one last song for a friendship that changed.",
    pages: {
      start: { title: "Side A", next: "sideb", text: [
        "The laundromat was the only place on the block still glowing. I went in to dry my black jeans and found a cassette balanced on the machine that always ate quarters. Its label read SIDE A: THE WAY HOME. In the corner was the little spider Jo used to draw on every note she passed me.",
        "We used to make tapes for walking home after shows. The rule was one track for the person you were, one for the person you wanted to be, and one you were embarrassed to admit you liked. Jo always put her embarrassing track first. She said it saved time.",
      ] },
      sideb: { title: "Side B", text: [
        "The tape player behind the counter clicked three times before anything came through. I recognized the hiss of our old recordings. Then Jo said, 'I’m not good at endings. Want to try an update instead?' A bus sighed outside. I let it go.",
        "Her number was still the same. I typed, 'Machine six still eats quarters.' The reply came before the dryer stopped: 'You still use machine six?' I didn’t know if we’d ever be who we were. For the first time, that wasn’t the question I wanted answered. I sent her a song.",
      ] },
    },
  },
  cathedral: {
    title: "The Cathedral Under the Floodlights", genre: "Choose your path · Dark urban fantasy",
    hook: "A midnight skate spot hides a cathedral that charges a strange toll.",
    pages: {
      start: { title: "The fourth bell", text: [
        "The city drained the skate bowl for repairs three weeks ago. Tonight the floodlights flicker, and a stone stair spirals down through the concrete. Your board rolls to the edge on its own. A bell rings four times beneath the park, and on the last note you recognize a friend’s laugh.",
      ], choices: [["Follow the bell downstairs", "stairs"], ["Listen to the bowl before you move", "listen"]] },
      stairs: { title: "The keeper", text: [
        "A keeper in a patched denim vest sits beneath a stained-glass window that shows the park as it might look in a hundred years. 'The bell borrows a sound,' they say. 'It’ll give the laugh back for a sound you can live without.' Your skateboard taps the floor twice, as if impatient.",
      ], choices: [["Offer the sound of wheels on concrete", "wheels"], ["Ask what sound the keeper misses", "choir"]] },
      listen: { title: "The echo line", text: [
        "The first three notes echo in the bowl. Only the last one travels sideways, toward an old drain painted with a crooked star. Wedged under the grate is a little brass key, warm despite the rain. Across the bowl, the empty floodlight pole hums the last note back.",
      ], choices: [["Use the key on the drain gate", "drain"], ["Bring the key down to the keeper", "choir"]] },
      wheels: { title: "Ending: The quiet line", text: ["The bell releases the laugh. Aboveground your board rolls without a sound. The first run feels wrong; then you hear the friends on the deck calling your name. You roll back up to meet them."] },
      choir: { title: "Ending: A bell with a choir", text: ["What the keeper misses is the sound of people singing badly together. You start with the only chorus you can remember. From above, someone joins in. The bell gives back the laugh without asking for anything else."] },
      drain: { title: "Ending: Open channel", text: ["The grate lifts. The laugh travels through the city pipes and out in a dozen places at once. By morning, skaters are making maps of the echoes. Nobody can quite agree which one leads back to the cathedral."] },
    },
  },
  concrete: {
    title: "Last Run at Static Park", genre: "Choose your path · Skate / grunge",
    hook: "One evening to decide what survives when the neighborhood spot closes.",
    pages: {
      start: { title: "No extension", text: [
        "The notice on Static Park’s gate says the locks change at six tomorrow morning. You have one fresh camera battery, a chipped deck, and an hour before the rain. Rook wants one last filmed run. Jules wants every person who skated here to leave a mark in the zine.",
      ], choices: [["Film the crew’s last run", "film"], ["Help Jules finish the zine", "zine"]] },
      film: { title: "The rough cut", text: [
        "Rook lands the trick on the fourth try. The camera catches it, but it also catches the kid who lent Rook a wrench cheering from behind a post. Rook wants a clean cut with the trick alone. You’re the one holding the camera.",
      ], choices: [["Give Rook the clean clip", "clip"], ["Pitch a crew cut and ask everyone first", "crew"]] },
      zine: { title: "The back page", text: [
        "You have room for one more page. Jules proposes a map to a new legal spot across town. Under the lid of the old donation box you find a stack of notes from kids who learned to skate here.",
      ], choices: [["Print the map and plan a meetup", "map"], ["Make space for the notes, with permission", "notes"]] },
      clip: { title: "Ending: One clean line", text: ["You send Rook the clip and put the camera away. The crew gets the rest of the hour with nobody filming. Your final run is a mess, and for once that doesn’t matter."] },
      crew: { title: "Ending: All the noise", text: ["Everyone who wants in adds a clip. The kid with the wrench gets the first frame. When the cut screens at the record store, the speakers can’t compete with the room."] },
      map: { title: "Ending: Meet at noon", text: ["A week later, the zine’s penciled map is already torn at the folds. It still gets everyone across town. You’re not sure if this place will feel like Static. You’re sure you don’t have to find out alone."] },
      notes: { title: "Ending: Small print", text: ["The kids pick which words to share. Someone writes a new note on the back page: 'I kept coming back because somebody always said hi.' You take the rest of the copies to the shop that gave you your first board."] },
    },
  },
  nightline: {
    title: "Nightline to the Hollow City", genre: "Choose your path · Goth fantasy / emo",
    hook: "A subway line that isn’t on the map offers to return every message you never sent.",
    pages: {
      start: { title: "The empty carriage", text: [
        "Your late train arrives with no driver and no route number. On its door, in handwriting you know is yours, someone has chalked: ALL DRAFTS RETURNED. Inside, the seat opposite is full of paper folded into tiny black boats.",
      ], choices: [["Unfold a boat with your name on it", "draft"], ["Talk to the rider at the far end", "rider"]] },
      draft: { title: "No address", text: [
        "The note says, 'I wish I’d asked you to stay until the rain stopped.' You remember writing it. You don’t remember the final line: 'I can still ask someone to stay today.' Beyond the glass, the next platform looks familiar.",
      ], choices: [["Keep the note, get off, and call a friend", "call"], ["Fold it again and leave it for the train", "release"]] },
      rider: { title: "The unclaimed carriage", text: [
        "The rider has been sorting the boats by destination, but most are addressed to people who have moved on. They hand you an unused ticket and ask you to name one place you’d like to go next.",
      ], choices: [["Name the all-night record store", "records"], ["Name a place you’ve never been", "new"]] },
      call: { title: "Ending: A live connection", text: ["A friend picks up on the third ring. Nothing about the call is profound. You talk about the rain, the train, and what’s left in the fridge. You stay on the line until you’re home."] },
      release: { title: "Ending: Paper tide", text: ["You set the boat back on its seat and watch the train leave. Without its windows lit, the station is ordinary. For the first time tonight, ordinary feels like enough."] },
      records: { title: "Ending: Needle drop", text: ["The shopkeeper is closing but turns the lock back for one last song. You put a whole side on instead. They find two chairs."] },
      new: { title: "Ending: End of the line", text: ["The train stops aboveground beside a field of streetlamps. Nothing here knows the story you’ve been telling about yourself. You walk toward the light and leave room for a new one."] },
    },
  },
};

export function restoreStoryProgress(value) {
  const result = {};
  for (const [id, story] of Object.entries(STORIES)) {
    const progress = value?.[id];
    if (!progress || !Object.hasOwn(story.pages, progress.page)) continue;
    const endings = Array.isArray(progress.endings) ? [...new Set(progress.endings.filter((key) =>
      Object.hasOwn(story.pages, key) && !story.pages[key].next && !story.pages[key].choices
    ))] : [];
    result[id] = { page: progress.page, endings };
  }
  return result;
}
