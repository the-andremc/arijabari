// Content for the site. Add a new object to the TOP of EPISODES each day.
// video + poster live in /media/videos/. `vertical: true` for phone-portrait clips.
window.EPISODES = [
  {
    day: 3,
    title: "Full Send Storytime",
    desc: "Ari takes the floor, uses his whole body to explain things, and absolutely nobody is ready.",
    video: "/media/videos/ep-3.mp4",
    poster: "/media/videos/ep-3.jpg",
    vertical: false,
  },
  {
    day: 2,
    title: "The Camera Did A Flip",
    desc: "A perfectly normal update until the camera decided it wanted to see the ceiling.",
    video: "/media/videos/ep-2.mp4",
    poster: "/media/videos/ep-2.jpg",
    vertical: true,
  },
  {
    day: 1,
    title: "Episode One (It Begins)",
    desc: "The very first story. Extreme close-ups. Questionable lighting. Legendary energy.",
    video: "/media/videos/ep-1.mp4",
    poster: "/media/videos/ep-1.jpg",
    vertical: true,
  },
];

// 40 faces in /media/faces/face-01.jpg … face-40.jpg
window.FACE_COUNT = 40;

window.MOODS = [
  "When the wifi drops mid-game",
  "When mum says “we have food at home”",
  "Seeing homework on a Friday",
  "When someone says ‘last round’ and it's not",
  "Trying to act normal in the school photo",
  "The dog ate it. The dog ate EVERYTHING.",
  "Five more minutes (it was two hours)",
  "When the teacher says ‘pop quiz’",
  "Hearing your own voice on video",
  "Plot twist incoming",
  "Absolutely zero thoughts. Just vibes.",
  "When the snack cupboard is empty",
  "Loading brain… 3%",
  "When your sibling touches your stuff",
  "Main character energy: ACTIVATED",
  "Pretending you know the answer",
];

window.BUBBLES = [
  "bro what", "nah 💀", "ok but listen", "HELLO??", "not the camera again",
  "sus", "I'm literally so serious", "wait wait wait", "no cap", "who said that",
  "lowkey hungry", "brb", "that's crazy", "stop 😭", "NPC behaviour",
];

window.TICKER = [
  "🚨 BREAKING: Ari has pulled ANOTHER face",
  "📈 Gibberish levels at all-time high",
  "🎬 New story drops daily",
  "🍕 Snack status: critical",
  "🔔 YouTube channel loading…",
  "🤪 Face count: 40 and rising",
  "🧠 Brain cells online: 2",
];

// Gibberish generator: start + subject + twist
window.GIB = {
  starts: [
    "So basically right,", "Okay don't laugh but", "No because listen,", "Storytime:",
    "I'm not even joking,", "Plot twist:", "True story,", "Lowkey,", "Breaking news:",
  ],
  subjects: [
    "the toaster", "a pigeon with a backpack", "my left sock", "the school bus driver",
    "a suspicious banana", "the TV remote", "my future self", "a very confident seagull",
    "the fridge light", "a goldfish named Kevin", "the wifi router", "my shadow",
  ],
  twists: [
    "looked at me funny.", "started a podcast.", "said it was my turn to cook.",
    "is now my manager.", "challenged me to a dance battle and won.", "knows what I did.",
    "got more subscribers than me.", "has been on holiday this whole time.",
    "turned out to be three raccoons in a trench coat.", "said ‘no cap’ unironically.",
    "stole my spot on the couch.", "ate the last nugget. Unforgivable.",
  ],
};
