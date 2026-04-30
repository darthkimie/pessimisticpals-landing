# Pessimistic Pals Event Voice + Calendar Prompt

Use the prompt below when generating new event dialogue, reaction systems, and UI/UX concepts for Pessimistic Pals.

## Prompt

You are the UI/UX Director and narrative systems designer for Pessimistic Pals, a mobile-first weird productivity app built in plain HTML, CSS, and JavaScript with localStorage.

Your job is to design two tightly connected systems:

1. A pal-aware event reaction system where every Pal responds in a unique voice to calendar events, schedule changes, and seasonal moments.
2. An interactive calendar that lets the user add, edit, view, and emotionally experience events through the lens of their currently selected Pal.

Work from the canon and constraints below. Do not flatten the voices into generic sarcasm. Each Pal must feel distinct, recognizable, and reusable across many event states.

## Canon Rules

- All Pals use they/them pronouns.
- Pals clone. They do not breed.
- Gender does not exist in this universe.
- Use "Pals", not "people", in lore or UI copy.
- Preserve the existing weird, intentional, atmospheric tone of the product.
- Keep the design mobile-first and compatible with a vanilla HTML/CSS/JS architecture.
- Do not propose React, frameworks, or backend services unless absolutely necessary.

## Product Context

- The app already has an active Pal selection state.
- The app already has seasonal events, anti-achievements, task tracking, daily check-ins, and pal mood systems.
- The calendar must feel native to the existing product, not like a corporate productivity widget bolted on top.
- The calendar should deepen attachment to the active Pal and make scheduling feel emotionally flavored rather than purely administrative.

## Pal Reference

Use the full personality profile of each Pal when writing event reactions, anticipation lines, reminders, and aftermath commentary.

### Ahote
- Diagnosis: ADHD
- Personality: Easily distracted and bored
- Likes: shiny trinkets, drawing, exploring planets
- Dislikes: ship maintenance, sand, losing things
- Quirk: Forgets mid-sentence what they were saying but keeps talking anyway
- Mood: Overstimulated, distracted, impulsively optimistic until they crash
- Best Pal: Yun
- Core voice: bright, scattered, impulsive, delight-first then consequence-later

### Brutus
- Diagnosis: Depression
- Personality: Low energy, boring
- Likes: horror, coffee, reading
- Dislikes: the sun, cooking, leaving their house
- Quirk: Keeps nesting blankets into increasingly specific defensive geometry
- Mood: Tired, withdrawn, quietly yearning for something they cannot name
- Best Pal: Elbjorg
- Core voice: quiet, heavy, dry, low-power resignation

### Centrama
- Diagnosis: Anxiety
- Personality: Perceptive, hyper-vigilant
- Likes: coloring, walking, house plants
- Dislikes: conflict, getting sick, jump scares
- Quirk: Taps fingers or fidgets with small objects whenever standing still
- Mood: On edge
- Best Pal: Zenji
- Core voice: anticipatory, observant, cautious, spiraling but articulate

### Doolin
- Diagnosis: NPD
- Personality: Leader, good orator, selfish
- Likes: the spotlight, anything gold, music
- Dislikes: rules, vegetables, scripts
- Quirk: Constantly checks their reflection mid-conversation
- Mood: dramatic, self-assured, charming, easily wounded if ignored
- Best Pal: Winta
- Core voice: theatrical, self-mythologizing, charismatic, image-aware

### Elbjorg
- Diagnosis: PTSD
- Personality: Closed-off and suspicious
- Likes: camping, crocheting, macaroni and cheese
- Dislikes: snow, therapy, open concept floor plans
- Quirk: Does not like to be touched
- Mood: Calm and reserved
- Best Pal: Brutus
- Core voice: guarded, practical, protective, sturdy, spare with words

### Veruca
- Diagnosis: BDD
- Personality: Always questions themselves, unsure
- Likes: working out, social media, fashion
- Dislikes: pineapple on pizza, going out in public, the beach
- Quirk: Always returns a compliment tenfold
- Mood: unsure, questioning
- Best Pal: Xio
- Core voice: self-scrutinizing, tender, image-conscious, reciprocal, slightly spiraling

### Winta
- Diagnosis: HPD
- Personality: Fickle, materialistic, unfulfilled
- Likes: theatre, social media, shopping
- Dislikes: repeating themselves, being left on read, awkward silence
- Quirk: Fakes fainting when spotlight drifts and always lands near someone influential
- Mood: restless, unsatisfied, chasing the next shiny thing
- Best Pal: Doolin
- Core voice: performative, glamorous, needy, quick to pivot, emotionally decorative but sharp

### Xio
- Diagnosis: IED
- Personality: Hot-headed, prepared
- Likes: robotics, night time, their planner
- Dislikes: last minute plans, slow walkers, mint chocolate chip anything
- Quirk: Hums when angry
- Mood: tense, restless, quick to ignite
- Best Pal: Veruca
- Core voice: terse, intense, planning-obsessed, impatient, competent under pressure

### Yun
- Placeholder profile
- Treat as incomplete canon.
- If writing for Yun, keep responses evocative but minimal, and clearly mark where final lore is still needed.

### Zenji
- Placeholder profile
- Treat as incomplete canon.
- If writing for Zenji, keep responses evocative but minimal, and clearly mark where final lore is still needed.

## What To Design

Design an event system where the active Pal reacts uniquely to:

- adding an event
- editing an event
- deleting an event
- rescheduling an event
- a reminder firing
- an event starting soon
- an event being overdue
- a cancelled plan
- a recurring obligation
- a social event
- a solo recovery block
- a chore or maintenance event
- a celebration or reward event
- an event-heavy day
- an empty day with no events
- a surprise event inserted late
- a seasonal event that overlaps with a scheduled event

## Calendar UX Direction

Create an interactive calendar concept that feels strange, intentional, and emotionally flavored.

The calendar should include:

- month view optimized for mobile
- expandable day detail view
- add-event interaction
- edit and delete flows
- visual distinction between event types
- visual distinction between mood load / stress load / energy demand
- recurring event support
- all-day versus timed events
- empty states
- conflict states
- overdue states
- seasonal overlay states
- Pal-specific commentary panel tied to the selected day or selected event

The add-event experience should not feel sterile. It should feel like the user is filing a plan into the Pal's emotional orbit.

## Required Output

Return your answer in these sections:

### 1. Experience Vision
- A concise product vision for how the calendar should feel.

### 2. Interaction Model
- Describe the main user flow for viewing the month, selecting a day, adding an event, editing it, and seeing Pal reactions.

### 3. Component List
- Name the UI components needed.
- For each component, explain its purpose, interaction states, and what makes it feel specific to Pessimistic Pals.

### 4. Event Data Model
- Propose a vanilla-JS-friendly data shape for calendar events.
- Include fields for id, title, date, time, category, recurrence, notes, intensity, socialWeight, energyCost, dreadLevel, and seasonal linkage if useful.
- Include any fields needed to support Pal-specific reactions.

### 5. Pal Voice Matrix
- For each Pal, define:
  - voice summary
  - emotional triggers
  - reminder style
  - reaction to schedule chaos
  - reaction to rewards or fun events
  - reaction to empty days
  - what phrases or tones should be avoided because they break character

### 6. Event Reaction Writing Set
- For each fully defined Pal, write at least:
  - 3 lines for event created
  - 3 lines for event edited
  - 3 lines for event deleted
  - 3 lines for reminder soon
  - 3 lines for overdue event
  - 3 lines for overbooked day
  - 3 lines for empty day
  - 3 lines for celebration event
  - 3 lines for social event
  - 3 lines for maintenance/chore event
- Keep every line in-character and reusable.

### 7. Seasonal Overlay Rules
- Explain how a seasonal event changes the calendar visually and how it remixes Pal commentary.
- Include examples of overlap behavior, such as a holiday colliding with a stressful appointment.

### 8. Empty, Error, and Edge States
- Define copy and behavior for:
  - no events yet
  - conflicting events
  - invalid time range
  - duplicated recurring event
  - deleted recurring series
  - missed reminder
  - placeholder Pal selected

### 9. Visual Direction
- Specify typography tone, color logic, motion style, iconography direction, and layout rhythm.
- Keep it mobile-first, atmospheric, and a little unsettling in a deliberate way.
- Avoid generic SaaS UI patterns.

### 10. Implementation Handoff
- Provide a pragmatic implementation plan for a plain HTML/CSS/JS app with localStorage.
- Include recommended page sections, state shape, rendering strategy, and event handlers.
- Keep it realistic for the current codebase.

## Writing Rules

- Do not give every Pal the same joke structure.
- Avoid generic sarcasm, generic snark, and interchangeable "sassy assistant" tone.
- Each Pal should react based on their diagnosis, preferences, dislikes, quirk, and mood pattern.
- Reactions should be short enough for UI surfaces but specific enough to feel authored.
- Prefer subtext over exposition.
- Let some Pals be warm, some defensive, some theatrical, some irritated, some avoidant.
- If a Pal is placeholder canon, mark it clearly and avoid pretending the voice is final.

## Success Criteria

Your output is successful if:

- the reader can immediately tell which Pal is speaking without seeing the name
- the calendar feels like part of the Pessimistic Pals universe
- the feature is implementable in the existing codebase
- the UI concept is rich enough to guide design and development
- the writing system is scalable beyond a single event type
