// pessimistic pals - constants and default state
// pessimistic pals — shared app state, routing, and page controllers

const APP_VERSION = '0.5.0';
const STORAGE_KEY = 'ppals_state';
const TASK_REWARD = 5;
const CHECKIN_REWARD = 3;
const MIN_TASK_TITLE_LENGTH = 3;
const TASK_CREATION_COOLDOWN_MS = 5000;
const TASK_CREATION_HOURLY_LIMIT = 20;
const TASK_REWARD_LIMIT_PER_DAY = 1;
const CALENDAR_REWARD_LIMIT_PER_DAY = 1;
const PAL_ACQUISITION_COST = 10;
const TRUST_GAIN_PER_CARE_DAY = 2;
const TRUST_LOSS_NEAR_DEATH = 18;
const TRUST_LOSS_PAL_DIES = 40;
const TRUST_CLONE_MINIMUM = 35;
const CARE_ACTION_SPAM_WINDOW_MS = 2000;
const CARE_ACTION_SPAM_THRESHOLD = 3;
const CARE_ACTIONS_TRUST_CAP_PER_DAY = 3;
const ABSENCE_THRESHOLD_DAYS = 3;
const RETURN_TRUST_BONUS = 4;
const TRUST_CONSISTENCY_TIERS = {
  establishing: { minDays: 1, maxDays: 3, gain: 1 },
  building: { minDays: 4, maxDays: 7, gain: 2 },
  steady: { minDays: 8, maxDays: 999, gain: 3 },
};
const TRUST_VULNERABLE_MIN = 90;
const TRUST_LOSS_MULTIPLIER_VULNERABLE = 1.5;
const TRUST_DIALOGUE_TIERS = {
  cold: { min: 0, max: 29 },
  warming: { min: 30, max: 54 },
  open: { min: 55, max: 79 },
  bonded: { min: 80, max: 89 },
  vulnerable: { min: 90, max: 100 },
};
const RELATIONSHIP_THRESHOLDS = {
  observing: { min: 0, max: 19 },
  present: { min: 20, max: 44 },
  invested: { min: 45, max: 69 },
  bonded: { min: 70, max: 100 },
};
const RELATIONSHIP_SCORE = {
  goodSession: 2,
  consistentSession: 1,
  needViolation: -8,
  nearDeathPenalty: -15,
  recoveryGesture: 10,
};
const WITHDRAWN_VIOLATION_THRESHOLD = 3;
const COMPATIBILITY_GAIN_PER_DAY = 1;
const COMPATIBILITY_MINIMUM_TO_CLONE = 7;
const COMPATIBILITY_HIGH_THRESHOLD = 21;
const TASK_INTERFERENCE_CHANCE = 0.08;
const STREAK_REWARD_INTERVAL = 3;
const CARE_REFRESH_INTERVAL = 1000;
const PLAGUE_THRESHOLD = 100;
const PLAGUE_STAGE_1 = 45;
const PLAGUE_STAGE_2 = 75;
const PLAGUE_STAGE_3 = 100;

const PLAGUE_CURE_STAGE_1_GLOOM = 8;
const PLAGUE_CURE_STAGE_2_GLOOM = 12;
const PLAGUE_CURE_STAGE_2_LUCKDUST = 2;
const PLAGUE_CURE_STAGE_3_GLOOM = 20;
const PLAGUE_CURE_STAGE_3_LUCKDUST = 5;
const PLAGUE_CURE_STAGE_3_TRUST_MIN = 40;
const PLAGUE_CONTAGION_MULTIPLIER = 1.5;
const GHOST_THRESHOLD_MOOD = 5;
const GHOST_THRESHOLD_HUNGER = 95;
const GHOST_CURE_GLOOM = 15;
const GHOST_CURE_LUCKDUST = 3;
const GHOST_CARE_COST_MULTIPLIER = 2;
const LAB_REFRESH_INTERVAL = 1000;
const CLONE_CYCLE_BASE_MS = 45000;
const CLONE_CYCLE_STEP_MS = 5000;
const MAX_RELUCTANT_MOOD = 78;
const DAILY_DISAPPOINTMENT_LOG_LIMIT = 14;
const ITEM_LOG_LIMIT = 36;
const TROPHY_LOG_LIMIT = 24;

const NEED_DECAY_PER_HOUR = {
  hunger: 2.2,
  boredom: 1.4,
  mood: 0.8,
  plague: 1.1,
};

const ORACLE_SEGMENTS = [
  { id: 'gloom_6', label: '+6 Gloom', type: 'gloom', amount: 6 },
  { id: 'gloom_4', label: '+4 Gloom', type: 'gloom', amount: 4 },
  { id: 'gloom_2', label: '+2 Gloom', type: 'gloom', amount: 2 },
  { id: 'luckdust_1', label: '+1 Luckdust', type: 'luckdust', amount: 1 },
  { id: 'luckdust_2', label: '+2 Luckdust', type: 'luckdust', amount: 2 },
  { id: 'nothing_1', label: 'Nothing', type: 'nothing', amount: 0 },
  { id: 'nothing_2', label: 'Nothing', type: 'nothing', amount: 0 },
  { id: 'plague', label: 'Plague', type: 'plague', amount: 0 },
];

const DAILY_DISAPPOINTMENT_REWARDS = [
  {
    id: 'gloom_coins',
    rewardType: 'gloom_coins',
    label: 'Gloom Coins',
    weight: 3.2,
    minAmount: 2,
    maxAmount: 6,
  },
  {
    id: 'xp',
    rewardType: 'xp',
    label: 'XP',
    weight: 2.2,
    minAmount: 4,
    maxAmount: 9,
  },
  {
    id: 'cosmetic_item',
    rewardType: 'cosmetic_item',
    label: 'Cosmetic Item',
    weight: 1.1,
  },
  {
    id: 'nothing',
    rewardType: 'nothing',
    label: 'Literally Nothing',
    weight: 4.5,
  },
];

const ITEM_RARITY_ORDER = {
  common: 1,
  uncommon: 2,
  rare: 3,
  cursed: 4,
};

const CALENDAR_WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const CALENDAR_CATEGORY_META = {
  focus: { label: 'Focus', reactionType: 'created' },
  appointment: { label: 'Appointment', reactionType: 'created' },
  social: { label: 'Social', reactionType: 'social' },
  maintenance: { label: 'Maintenance', reactionType: 'maintenance' },
  celebration: { label: 'Celebration', reactionType: 'celebration' },
  recovery: { label: 'Recovery', reactionType: 'created' },
};

const CALENDAR_RECURRENCE_LABELS = {
  none: 'One Time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const DEFAULT_AUDIO_VOLUME = 0.34;

const PAL_SPRITE_DATA = {
  ahote: { idle: { frames: 6, fps: 10 } },
  brutus: { idle: { frames: 3, fps: 6 } },
  centrama: { idle: { frames: 6, fps: 10 } },
  doolin: { idle: { frames: 5, fps: 8 } },
  elbjorg: { idle: { frames: 4, fps: 7 } },
  veruca: { idle: { frames: 5, fps: 8 } },
  winta: { idle: { frames: 8, fps: 12 } },
  xio: { idle: { frames: 4, fps: 7 } },
  yun: { idle: { frames: 3, fps: 5 } },
  zenji: { idle: { frames: 5, fps: 8 } },
};

const AUDIO_TRACKS = [
  {
    id: 'stellar_wind',
    title: 'Stellar Wind',
    src: 'assets/audio/songs/Stellar Wind - Unicorn Heads.mp3',
    pages: ['home', 'care', 'habits', 'streak'],
  },
  {
    id: 'blue_mood',
    title: 'Blue Mood',
    src: 'assets/audio/songs/Blue Mood - Robert Munzinger.mp3',
    pages: ['home', 'care', 'streak', 'collection'],
  },
  {
    id: 'looping_ascent',
    title: 'Looping Ascent',
    src: 'assets/audio/songs/Looping Ascent - Joel Cummins.mp3',
    pages: ['calendar', 'collection', 'lab'],
  },
  {
    id: 'cued_for_liftoff',
    title: 'Cued For Liftoff',
    src: 'assets/audio/songs/Cued For Liftoff - Dan _Lebo_ Lebowitz, Tone Seeker.mp3',
    pages: ['choose-pal', 'collection', 'lab'],
  },
  {
    id: 'fog_mist',
    title: 'Fog Mist',
    src: 'assets/audio/songs/Fog Mist - TrackTribe.mp3',
    pages: ['care', 'database', 'calendar'],
  },
  {
    id: 'ship_database',
    title: 'Ship Database',
    src: 'assets/audio/ship-database.mp3',
    pages: ['database', 'lab', 'collection'],
  },
  {
    id: 'a_sitar_story_hanu_dixit',
    title: 'A Sitar Story - Hanu Dixit',
    src: 'assets/audio/songs/A Sitar Story - Hanu Dixit.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'argonne_zachariah_hickman',
    title: 'Argonne - Zachariah Hickman',
    src: 'assets/audio/songs/Argonne - Zachariah Hickman.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'average_patrick_patrikios',
    title: 'Average - Patrick Patrikios',
    src: 'assets/audio/songs/Average - Patrick Patrikios.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'beyond_tracktribe',
    title: 'Beyond - TrackTribe',
    src: 'assets/audio/songs/Beyond - TrackTribe.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'boomin_dan_lebo_lebowitz_tone_seeker',
    title: 'Boomin\' - Dan _Lebo_ Lebowitz, Tone Seeker',
    src: 'assets/audio/songs/Boomin\' - Dan _Lebo_ Lebowitz, Tone Seeker.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'broken_ladder_jeremy_black',
    title: 'Broken Ladder - Jeremy Black',
    src: 'assets/audio/songs/Broken Ladder - Jeremy Black.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'cicada_killer_coyote_hearing',
    title: 'Cicada KIller - Coyote Hearing',
    src: 'assets/audio/songs/Cicada KIller - Coyote Hearing.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'circle_dance_sefchol',
    title: 'Circle Dance - SefChol',
    src: 'assets/audio/songs/Circle Dance - SefChol.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'crazy_patrick_patrikios',
    title: 'Crazy - Patrick Patrikios',
    src: 'assets/audio/songs/Crazy - Patrick Patrikios.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'disco_climax_an_jone',
    title: 'Disco Climax - An Jone',
    src: 'assets/audio/songs/Disco Climax - An Jone.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'doctor_momentum_slynk',
    title: 'Doctor Momentum - Slynk',
    src: 'assets/audio/songs/Doctor Momentum - Slynk.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'early_avril_unicorn_heads',
    title: 'Early Avril - Unicorn Heads',
    src: 'assets/audio/songs/Early Avril - Unicorn Heads.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'enchantee_feat_mr_stabalina_slynk',
    title: 'Enchantée feat. Mr Stabalina - Slynk',
    src: 'assets/audio/songs/Enchantée feat. Mr Stabalina - Slynk.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'evergreen_geographer',
    title: 'Evergreen - Geographer',
    src: 'assets/audio/songs/Evergreen - Geographer.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'everywhere_you_know_jeremy_black',
    title: 'Everywhere You Know - Jeremy Black',
    src: 'assets/audio/songs/Everywhere You Know - Jeremy Black.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'fat_man_yung_logos',
    title: 'Fat Man - Yung Logos',
    src: 'assets/audio/songs/Fat Man - Yung Logos.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'fiesta_jarocha_jimena_contreras',
    title: 'Fiesta Jarocha - Jimena Contreras',
    src: 'assets/audio/songs/Fiesta Jarocha - Jimena Contreras.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'franklin_s_fight_dj_williams',
    title: 'Franklin\'s Fight - DJ Williams',
    src: 'assets/audio/songs/Franklin\'s Fight - DJ Williams.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'funky_carioca_quincas_moreira',
    title: 'Funky Carioca - Quincas Moreira',
    src: 'assets/audio/songs/Funky Carioca - Quincas Moreira.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'go_go_go_kwon',
    title: 'Go Go Go - Kwon',
    src: 'assets/audio/songs/Go Go Go - Kwon.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'greedy_patrick_patrikios',
    title: 'Greedy - Patrick Patrikios',
    src: 'assets/audio/songs/Greedy - Patrick Patrikios.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'groove_dyalla',
    title: 'Groove - Dyalla',
    src: 'assets/audio/songs/Groove - Dyalla.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'icing_geographer',
    title: 'Icing - Geographer',
    src: 'assets/audio/songs/Icing - Geographer.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'into_it_kwon',
    title: 'Into It - Kwon',
    src: 'assets/audio/songs/Into It - Kwon.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'jah_di_tao_casa_rosa_s_tulum_vibes',
    title: 'Jah Di Tao - Casa Rosa\'s Tulum Vibes',
    src: 'assets/audio/songs/Jah Di Tao - Casa Rosa\'s Tulum Vibes.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'lark_in_the_dark_dan_lebo_lebowitz_tone_seeker',
    title: 'Lark in the Dark - Dan _Lebo_ Lebowitz, Tone Seeker',
    src: 'assets/audio/songs/Lark in the Dark - Dan _Lebo_ Lebowitz, Tone Seeker.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'luge_geographer',
    title: 'Luge - Geographer',
    src: 'assets/audio/songs/Luge - Geographer.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'matterhorn_jeremy_black',
    title: 'Matterhorn - Jeremy Black',
    src: 'assets/audio/songs/Matterhorn - Jeremy Black.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'my_synth_bae_the_soundlings',
    title: 'My Synth Bae - The Soundlings',
    src: 'assets/audio/songs/My Synth Bae - The Soundlings.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'o_canto_do_galo_quincas_moreira',
    title: 'O Canto Do Galo - Quincas Moreira',
    src: 'assets/audio/songs/O Canto Do Galo - Quincas Moreira.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'once_was_kwon',
    title: 'Once Was - Kwon',
    src: 'assets/audio/songs/Once Was - Kwon.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'our_planet_jeremy_black',
    title: 'Our Planet - Jeremy Black',
    src: 'assets/audio/songs/Our Planet - Jeremy Black.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'pluckandplay_kwon',
    title: 'Pluckandplay - Kwon',
    src: 'assets/audio/songs/Pluckandplay - Kwon.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'saddle_up_and_dance_ryan_stasik_kanika_moore',
    title: 'Saddle Up & Dance - Ryan Stasik, Kanika Moore',
    src: 'assets/audio/songs/Saddle Up & Dance - Ryan Stasik, Kanika Moore.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'seagull_telecasted',
    title: 'Seagull - Telecasted',
    src: 'assets/audio/songs/Seagull - Telecasted.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'shadowstep_the_mini_vandals',
    title: 'Shadowstep - The Mini Vandals',
    src: 'assets/audio/songs/Shadowstep - The Mini Vandals.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'sneaky_spelunking_joel_cummins',
    title: 'Sneaky Spelunking - Joel Cummins',
    src: 'assets/audio/songs/Sneaky Spelunking - Joel Cummins.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'swimming_with_gurus_casa_rosa_s_tulum_vibes',
    title: 'Swimming with Gurus - Casa Rosa\'s Tulum Vibes',
    src: 'assets/audio/songs/Swimming with Gurus - Casa Rosa\'s Tulum Vibes.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'tempos_vari_freedom_trail_studio',
    title: 'Tempos Vari - Freedom Trail Studio',
    src: 'assets/audio/songs/Tempos Vari - Freedom Trail Studio.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'this_is_not_a_ballad_true_cuckoo',
    title: 'This is Not a Ballad - True Cuckoo',
    src: 'assets/audio/songs/This is Not a Ballad - True Cuckoo.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'this_is_not_idm_true_cuckoo',
    title: 'This is Not IDM - True Cuckoo',
    src: 'assets/audio/songs/This is Not IDM - True Cuckoo.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'time_parade_geographer',
    title: 'Time Parade - Geographer',
    src: 'assets/audio/songs/Time Parade - Geographer.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'valiant_density_and_time',
    title: 'Valiant - Density & Time',
    src: 'assets/audio/songs/Valiant - Density & Time.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'walk_with_me_tracktribe',
    title: 'Walk With Me - TrackTribe',
    src: 'assets/audio/songs/Walk With Me - TrackTribe.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
  {
    id: 'when_you_re_not_looking_nathan_moore',
    title: 'When You\'re Not Looking - Nathan Moore',
    src: 'assets/audio/songs/When You\'re Not Looking - Nathan Moore.mp3',
    pages: ['home', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'choose-pal', 'database'],
  },
];

const AUDIO_EFFECTS = {
  click: 'assets/audio/Technology Radio Button Clicking 07.mp3',
  confirm: 'assets/audio/Science Fiction Sci-Fi Electronic Computer Beep 01.mp3',
};

const AUDIO_DOCK_PAGES = ['home', 'choose-pal', 'care', 'habits', 'streak', 'calendar', 'lab', 'collection', 'database', 'settings'];

const STARTER_TASK_TITLES = [
  'Drink water despite the evidence.',
  'Finish one small task before doubt organizes itself.',
  'Stand near daylight for two full minutes.',
];

const CARE_ACTIONS = {
  feed: {
    label: 'Feed',
    cost: 3,
    needKey: 'hunger',
    amount: 28,
  },
  entertain: {
    label: 'Entertain',
    cost: 2,
    needKey: 'boredom',
    amount: 22,
  },
  comfort: {
    label: 'Comfort',
    cost: 0,
    needKey: 'mood',
    amount: 18,
  },
  sanitize: {
    label: 'Sanitize',
    cost: 4,
    needKey: 'plague',
    amount: -34,
  },
  cure: {
    label: 'Cure',
    cost: 5,
    needKey: 'plague',
    amount: 0,
  },
};

const DEFAULT_CARE_STATE = {
  lastNeedUpdate: null,
  reactionType: 'idle',
  dialogue: null,
  lastOracleResult: null,
  lockoutUntil: null,
  nextSpinGuaranteed: false,
  dialogueSilentUntil: null,
};

const DEFAULT_CLONE_STATE = {
  activeCycle: null,
  revealedVariant: null,
  history: [],
  dialogue: null,
  clonePair: {
    palA: null,
    palB: null,
  },
};

const DEFAULT_DAILY_DISAPPOINTMENT_STATE = {
  lastSpinDate: null,
  latestResult: null,
  rewardLog: [],
};

const DEFAULT_ANTI_ACHIEVEMENT_STATE = {
  unlockedIds: [],
  unlockLog: [],
};

const DEFAULT_SEASONAL_EVENT_STATE = {
  activeEventId: null,
  themeToken: 'default',
  lastCheckedDate: null,
};

const DEFAULT_META_STATE = {
  firstOpenDate: null,
  lastOpenDate: null,
  lastVisitTimestamp: null,
  lastProgressDate: null,
  longestStreak: 0,
  openCount: 0,
  openCountToday: 0,
  openDateHistory: [],
  onboardingSeen: false,
  firstHomeSeen: false,
  userTaskCreations: 0,
  lastStreakBreakDate: null,
  secondPalUnlockSeen: false,
  firstDivergenceDate: null,
  audioEnabled: true,
  audioVolume: DEFAULT_AUDIO_VOLUME,
  audioTrackId: 'ship_database',
  uiSoundsEnabled: true,
  uiVolume: 0.6,
  crtScanlines: true,
  crtCursor: true,
  reduceMotion: false,
  straightLayout: false,
  lastGiftDate: null,
  giftLog: [],
  lastTaskRewardDate: null,
  lastCalendarRewardDate: null,
  recentTaskCreations: [],
};

const DEFAULT_CALENDAR_STATE = {
  selectedDate: null,
  visibleMonth: null,
  draftEventId: null,
  events: [],
  completionLog: [],
  lastInteraction: null,
};

const HOME_COLLAPSED_DEFAULTS = {
  checkin: true,
  event: true,
  disappointment: true,
  emotion: true,
  calendar: true,
  tasks: false,
};

const DEFAULT_STATE = {
  activePal: null,
  gloom: 0,
  xp: 0,
  luckdust: 0,
  streak: 0,
  habitDays: [false, false, false, false, false, false, false],
  habitHistory: {},
  tasks: [],
  unlockedPals: [],
  ownedPals: [],
  inventory: [],
  palCompatibility: {},
  constellations: {},
  palMoodLedger: {},
  palOutfits: {},
  palWardrobeOwned: {},
  palPantry: {},
  palToybox: {},
  activityLog: [],
  spunToday: false,
  lastSpinDate: null,
  dailyDisappointment: { ...DEFAULT_DAILY_DISAPPOINTMENT_STATE },
  antiAchievements: { ...DEFAULT_ANTI_ACHIEVEMENT_STATE },
  seasonalEvent: { ...DEFAULT_SEASONAL_EVENT_STATE },
  meta: { ...DEFAULT_META_STATE },
  calendar: { ...DEFAULT_CALENDAR_STATE },
  homeCollapsed: {},
  dailyCheckIn: {
    date: null,
    mood: null,
    response: null,
  },
  needs: {
    hunger: 80,
    boredom: 80,
    mood: 60,
    plague: 10,
  },
  plagued: false,
  care: { ...DEFAULT_CARE_STATE },
  clone: { ...DEFAULT_CLONE_STATE },
  activeCloneId: null,
  deathRecord: [],
  version: APP_VERSION,
};