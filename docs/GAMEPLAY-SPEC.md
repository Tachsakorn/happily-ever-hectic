# GAMEPLAY SPECIFICATION
# Goji & Tanya: Wedding Dash

IMPORTANT:
This document defines the CORE GAMEPLAY identity of the project.
Treat these mechanics as authoritative when implementing the game.
Do not simplify the core loop into a generic restaurant/time-management game.
The game should feel like a wedding-focused real-time time-management game inspired by the gameplay structure of classic Wedding Dash (2007), while using completely original characters, art, story, UI, names, and implementation.

==================================================
1. CORE GAME CONCEPT
==================================================

The player is responsible for managing a wedding reception in real time.

The player must simultaneously:

- Seat incoming wedding guests
- Consider guest preferences
- Keep guests happy
- Deliver gifts
- Serve food and drinks
- Handle special requests
- Resolve wedding disasters
- Protect the Bride and Groom from stress
- Prioritize multiple problems happening at the same time
- Maintain action chains/combo bonuses
- Finish the wedding before the Bride/Groom become overwhelmed

The main gameplay fantasy is:

"Everything is going wrong at once, and the player must quickly decide what matters most."

The game should NOT feel like a simple clicker.
The player should constantly make short-term decisions about priority, movement, timing, and efficiency.

==================================================
2. CORE GAME LOOP
==================================================

Each wedding level follows this general structure:

PREPARATION
    ↓
WEDDING RECEPTION START
    ↓
Guests arrive
    ↓
Seat guests according to preferences
    ↓
Guests request/receive gifts
    ↓
Food service begins
    ↓
Guests eat
    ↓
More guests / requests / problems appear
    ↓
Player manages multiple simultaneous tasks
    ↓
Disasters may occur
    ↓
Player resolves disasters
    ↓
Guests finish eating
    ↓
Cake / final reception activities
    ↓
Dance / wedding completion
    ↓
Calculate score
    ↓
Determine level result
    ↓
Unlock progression / next wedding

The loop should continuously create pressure.

==================================================
3. PRE-WEDDING / PLANNING PHASE
==================================================

Before the reception begins, the player can have a planning phase.

The player may choose wedding details such as:

- Food
- Cake
- Flowers
- Decorations
- Music
- Other wedding details

The choices can affect:

- Guest happiness
- Couple happiness
- Score
- Difficulty
- Guest preferences
- Potential special events

Planning should not replace the main gameplay.
It should prepare the player for the reception.

The player should be able to understand the consequences of choices.

Example:

Food A:
+ Some guests love it
- Some guests dislike it

Food B:
+ Higher average happiness
- More expensive / different score modifier

==================================================
4. BRIDE AND GROOM
==================================================

The Bride and Groom are the central characters of the wedding.

They have a stress/happiness state.

The player must protect them from:

- Unresolved disasters
- Extremely unhappy guests
- Major mistakes
- Excessive waiting
- Certain special events

The Bride/Groom should not simply be another guest.

They represent the overall health of the wedding.

Possible states:

HAPPY
NORMAL
STRESSED
VERY STRESSED
BRIDEZILLA / FAILURE

The exact names can be customized for the original game.

If the wedding becomes too chaotic for too long, the couple's stress increases.

If the player successfully manages the wedding, their stress decreases or remains stable.

==================================================
5. GUEST ARRIVAL SYSTEM
==================================================

Guests arrive progressively rather than all at once.

Guests may arrive in waves.

Each guest should have:

- Unique ID
- Name
- Personality
- Patience
- Happiness
- Food preferences
- Seating preferences
- Eating speed
- Movement speed
- Current state
- Current target
- Special request probability
- Stress contribution
- Relationship/preferences toward other guests

Guests should feel different from each other.

==================================================
6. GUEST PERSONALITIES
==================================================

Guests should have different behavioral characteristics.

Examples:

PATIENT:
- Waits longer
- Loses happiness slowly

IMPATIENT:
- Loses happiness quickly
- Creates more pressure

FAST EATER:
- Finishes meals quickly

SLOW EATER:
- Takes longer

FOOD LOVER:
- Gets a large happiness bonus from preferred food

PICKY:
- Strong reaction to disliked food

SOCIAL:
- Prefers sitting near certain guests

ANTI-SOCIAL:
- Prefers specific seating positions

DRAMA-PRONE:
- More likely to trigger or react strongly to certain events

These are examples.
The system should be data-driven so new personality types can be added without rewriting the core guest system.

==================================================
7. SEATING SYSTEM
==================================================

Seating is one of the most important gameplay systems.

When guests arrive, the player must decide where to seat them.

The player should consider:

- Guest preferences
- Preferred neighbors
- Guests they dislike
- Table capacity
- Available seats
- Distance
- Current table situation
- Future incoming guests

Incorrect seating should cause negative effects such as:

- Lower happiness
- Faster patience loss
- Complaints
- Additional stress
- Lower score

Correct seating should provide:

- Happiness bonuses
- Better table synergy
- Combo bonuses
- Higher score

The seating system should make the player think before placing guests.

==================================================
8. GUEST STATES
==================================================

Guests should use a clear state machine.

Example states:

ARRIVING
WAITING_FOR_SEAT
BEING_SEATED
SEATED
WAITING_FOR_GIFT
RECEIVING_GIFT
WAITING_FOR_FOOD
EATING_APPETIZER
WAITING_FOR_MAIN
EATING_MAIN
WAITING_FOR_CAKE
EATING_CAKE
REQUESTING
UPSET
IN_DISASTER
FINISHED
LEAVING

Do not implement guest behavior as one giant script.

Use a state-driven architecture so additional states can be added later.

==================================================
9. GIFT SYSTEM
==================================================

After guests are seated, they may interact with the gift system.

The player may need to:

- Collect gifts
- Deliver/place gifts
- Process gifts
- Handle gift-related interactions

Correct and fast gift handling can provide:

- Score
- Combo
- Happiness

Slow gift handling can cause:

- Patience loss
- Happiness loss
- Couple stress

The exact implementation can be adapted to the original game's flow while keeping the system modular.

==================================================
10. FOOD SERVICE
==================================================

Food service is a major part of the reception.

A typical meal progression can be:

APPETIZER
    ↓
MAIN COURSE
    ↓
CAKE
    ↓
DANCE / FINAL RECEPTION

Guests should not instantly complete their meal.

They must progress through the stages.

Each stage can generate:

- Waiting
- Serving actions
- Happiness changes
- Special requests
- Potential disasters

Food preferences should affect happiness.

==================================================
11. GUEST PATIENCE
==================================================

Every guest should have a patience meter.

Patience decreases when:

- Waiting for a seat
- Waiting for food
- Waiting for a request
- Waiting during a disaster
- Waiting for service

Patience should not always decrease at the same speed.

Guest personality modifies the rate.

When patience becomes low:

- Guest becomes unhappy
- Guest may complain
- Couple stress can increase
- Score can decrease

If patience reaches zero:

The guest may leave or enter a severe negative state.

The exact penalty should be configurable.

==================================================
12. GUEST HAPPINESS
==================================================

Guests have a happiness value.

Happiness can be affected by:

POSITIVE:
- Correct seating
- Preferred neighbors
- Fast service
- Favorite food
- Completing requests
- Successful disaster handling
- Combo chains

NEGATIVE:
- Long waiting
- Wrong seating
- Disliked food
- Ignored requests
- Nearby disasters
- Poor service

Happiness should influence final score.

==================================================
13. SPECIAL REQUESTS
==================================================

Guests can generate special requests during the reception.

Examples:

- Drinks
- Wine / punch
- Music requests
- Wedding favors
- Other wedding-specific requests

Requests should appear dynamically.

The player must decide whether to:

- Handle immediately
- Finish another task first
- Ignore temporarily

This creates prioritization gameplay.

Requests should have:

- Request type
- Requesting guest
- Time limit / patience impact
- Reward
- Failure consequence

Requests must be data-driven.

==================================================
14. DISASTER SYSTEM
==================================================

Disasters are one of the most important parts of the game.

Disasters should create sudden problems that interrupt the normal reception flow.

Examples:

- Dog causing chaos
- Bridesmaids fighting
- Crying relative
- Drunk guest
- Cake problem
- Bees/insects
- Kitchen smoke
- Kitchen fire
- Music equipment problem
- Guest argument
- Food-related accident

These are examples.
Create original variations for this project.

Disasters should NOT simply be random animations.

They should create actual gameplay decisions.

==================================================
15. DISASTER PRIORITIZATION
==================================================

Multiple disasters may happen at the same time.

Example:

A guest needs food
+
Another guest has a special request
+
The cake is in danger
+
Two guests are arguing
+
The Bride is becoming stressed

The player cannot necessarily solve everything simultaneously.

The player must decide:

"What is the most important thing to fix right now?"

This prioritization is one of the central gameplay mechanics.

Different disasters should have different:

- Severity
- Duration
- Stress contribution
- Time limit
- Reward
- Consequences

==================================================
16. BRIDE/GROOM STRESS FROM DISASTERS
==================================================

Unresolved disasters can affect the couple.

Example:

Minor problem:
+ small stress

Major problem:
+ medium stress

Critical disaster:
+ large stress

Some disasters should directly threaten the couple.

The player must prevent the stress meter from reaching the failure threshold.

==================================================
17. BRIDEZILLA / FAILURE STATE
==================================================

The wedding should have a clear failure condition.

If the couple's stress becomes too high:

BRIDEZILLA / WEDDING FAILURE

The level ends.

The player should understand why they failed.

Example failure summary:

- 8 guests became unhappy
- 3 requests were missed
- 2 disasters were ignored
- Couple stress reached maximum

Do not make failure feel random.

==================================================
18. COMBO / CHAIN SYSTEM
==================================================

Fast consecutive successful actions should create chains.

Examples:

Seat Guest A
→ Seat Guest B
→ Seat Guest C
→ Seat Guest D

OR

Serve Guest A
→ Serve Guest B
→ Serve Guest C

OR

Complete multiple requests quickly.

Chains can provide:

- Score multiplier
- Bonus points
- Happiness bonuses
- Visual feedback
- Special effects

The chain system should reward efficiency without making it mandatory.

==================================================
19. PLAYER ACTION SYSTEM
==================================================

Player actions should be clear and responsive.

Possible actions:

- Move
- Pick up
- Carry
- Seat guest
- Serve food
- Deliver item
- Collect item
- Resolve disaster
- Complete request
- Interact with object
- Assist guest

Actions should have:

- Start
- Active
- Completion
- Cancel/fail states where appropriate

Avoid instant teleportation-style interactions.

Movement and action timing should matter.

==================================================
20. PRIORITY GAMEPLAY
==================================================

The central skill being tested is PRIORITIZATION.

At any moment the player should potentially be asking:

1. Is the Bride/Groom in danger?
2. Is a disaster about to become critical?
3. Is a guest about to lose patience?
4. Can I create a combo?
5. Can I complete multiple actions efficiently?
6. Which action should I do first?
7. Can I safely delay another task?

Difficulty should increase primarily by increasing the number and complexity of simultaneous decisions.

==================================================
21. SCORING SYSTEM
==================================================

Final score should consider multiple categories.

Possible score components:

- Guests successfully served
- Guest happiness
- Correct seating
- Gifts handled
- Food service
- Special requests completed
- Disaster response
- Bride/Groom happiness
- Combo chains
- Speed
- Efficiency
- Guests leaving unhappy
- Failed requests
- Unresolved disasters

Avoid making score depend only on raw completion time.

A player who manages the wedding efficiently should be rewarded.

==================================================
22. LEVEL GOALS
==================================================

Each level should have clear objectives.

Examples:

PRIMARY GOAL:
Complete the wedding.

SECONDARY GOALS:
- Keep couple stress below X
- Finish with X happiness
- Complete X requests
- Resolve X disasters
- Achieve X combo
- Do not lose more than X guests

Possible rating structure:

Bronze / Silver / Gold

OR

Normal / Great / Perfect

The exact naming can be original.

==================================================
23. DIFFICULTY PROGRESSION
==================================================

Difficulty should not simply mean:

"Guests have more HP."

Instead increase complexity.

Early levels:

- Few guests
- Few requests
- Few disasters
- Simple seating

Mid levels:

- More guests
- More preferences
- Multiple requests
- Faster patience loss
- More simultaneous events

Late levels:

- Complex seating
- Multiple simultaneous disasters
- Conflicting priorities
- Faster service requirements
- High couple stress
- More difficult guest combinations

The player should feel that they are becoming better at multitasking.

==================================================
24. LEVEL STRUCTURE
==================================================

A level should roughly follow:

1. Level briefing
2. Optional planning
3. Reception starts
4. Guests arrive
5. Seating
6. Gift/service phase
7. Food progression
8. Special requests
9. Disasters
10. Escalation
11. Final reception
12. Wedding completion
13. Score calculation
14. Rewards
15. Next level unlock

==================================================
25. PROGRESSION SYSTEM
==================================================

The game should contain a progression system.

Possible progression:

- New wedding venues
- New guest types
- New food types
- New disasters
- New requests
- New mechanics
- New decorations
- New characters
- New story scenes
- New difficulty modifiers

Unlocking content should happen progressively.

Do not introduce every mechanic in Level 1.

==================================================
26. VENUE PROGRESSION
==================================================

Each venue should introduce something mechanically interesting.

Example:

Venue 1:
Basic wedding reception

Venue 2:
More complex seating

Venue 3:
New disaster type

Venue 4:
Multiple service stations

Venue 5:
High-pressure wedding

Do not simply reskin the same level.

Each venue should teach or test something new.

==================================================
27. ENDLESS / CHALLENGE MODE
==================================================

A future optional mode can be:

ENDLESS RECEPTION

The player survives for as long as possible.

Difficulty continuously increases through:

- More guests
- Faster patience loss
- More requests
- More disasters
- Less recovery time
- Higher stress

The game ends when the couple's stress reaches the failure threshold.

This mode should be architecturally separate from Career/Story Mode.

==================================================
28. DATA-DRIVEN DESIGN
==================================================

All content that may change should be data-driven.

Examples:

Guest definitions
Food definitions
Request definitions
Disaster definitions
Level definitions
Venue definitions
Scoring values
Difficulty values
Dialogue
Rewards
Unlocks

Do NOT hard-code every guest or level into gameplay scripts.

Example conceptual structure:

GuestData
- id
- displayName
- personality
- patience
- movementSpeed
- eatingSpeed
- preferences
- dislikes
- specialBehavior

DisasterData
- id
- severity
- duration
- stressImpact
- requiredActions
- reward
- failurePenalty

LevelData
- id
- venue
- guestCount
- guestTypes
- availableFood
- disasterPool
- requestPool
- goals
- difficulty

==================================================
29. EVENT-DRIVEN ARCHITECTURE
==================================================

Systems should communicate through events where appropriate.

Examples:

GuestArrived
GuestSeated
GiftDelivered
FoodServed
GuestStartedEating
GuestFinishedEating
RequestCreated
RequestCompleted
RequestFailed
DisasterStarted
DisasterResolved
DisasterFailed
GuestBecameUnhappy
GuestLeft
CoupleStressChanged
ComboStarted
ComboBroken
LevelCompleted
LevelFailed

Avoid tightly coupling every system to every other system.

==================================================
30. GAME STATE
==================================================

The game should have explicit high-level states.

Example:

BOOT
MAIN_MENU
PLANNING
INTRO
RECEPTION
PAUSED
RESULTS
LEVEL_COMPLETE
GAME_OVER

Reception itself should have its own internal state.

Do not rely on scattered booleans such as:

isPlaying
isPaused
isFinished
isGameOver
isPlanning

when a proper state machine would be clearer.

==================================================
31. IPAD SAFARI / TOUCH
==================================================

The target platform is:

iPad Safari

Therefore:

- Touch input must be first-class
- Buttons must be large enough for fingers
- Avoid tiny UI
- Avoid hover-dependent mechanics
- Avoid keyboard-only interaction
- Avoid requiring a mouse
- Support common iPad aspect ratios
- Maintain responsive scaling
- Keep animations performant
- Avoid unnecessary particle effects
- Avoid excessive DOM usage
- Prefer Phaser rendering
- Avoid unnecessary memory allocation during gameplay

The game should still be playable with a mouse for development/testing.

==================================================
32. ORIGINAL CONTENT
==================================================

The gameplay structure may be inspired by classic Wedding Dash-style time-management gameplay.

However, create ORIGINAL:

- Characters
- Character designs
- Art
- Animations
- UI
- Music
- Sound effects
- Dialogue
- Story
- Names
- Venues
- Disasters
- Guest personalities
- Visual style

Do not copy copyrighted assets or source code.

The game is a private personal project centered around Goji and Tanya.

==================================================
33. GAME FEEL
==================================================

The desired emotional rhythm is:

CALM
→
Guests arrive
→
Small problems
→
More guests
→
Pressure increases
→
Multiple problems
→
CHAOS
→
Player successfully stabilizes wedding
→
RELIEF
→
Celebration
→
Score

The player should feel:

"I barely survived that, but I managed it."

This feeling is more important than simply making numbers increase.

==================================================
34. MOST IMPORTANT GAMEPLAY PRINCIPLE
==================================================

The game should constantly create meaningful prioritization decisions.

Example situation:

Guest A:
"Where should I sit?"

Guest B:
"Food please!"

Guest C:
"Where is my drink?"

Cake:
"ABOUT TO FALL!"

Bride:
"Stress increasing!"

The player must decide what to handle first.

That decision-making loop is the heart of the game.

==================================================
35. CORE GAMEPLAY DNA
==================================================

The final gameplay identity can be summarized as:

WEDDING
↓
PLANNING
↓
RECEPTION
↓
GUEST ARRIVALS
↓
SEATING
↓
GIFTS
↓
FOOD
↓
REQUESTS
↓
DISASTERS
↓
MULTIPLE SIMULTANEOUS PROBLEMS
↓
PRIORITIZATION
↓
GUEST HAPPINESS / PATIENCE
↓
BRIDE & GROOM STRESS
↓
COMBOS / SCORE
↓
WEDDING SUCCESS OR BRIDEZILLA
↓
PROGRESSION

Do not remove the core relationship between:

GUESTS
+
SERVICE
+
REQUESTS
+
DISASTERS
+
PRIORITIZATION
+
COUPLE STRESS

These systems are the foundation of the game.

==================================================
36. IMPLEMENTATION PRIORITY
==================================================

When implementing the game, build the gameplay in this order:

PHASE 1:
- Phaser project
- Player movement
- Basic interaction
- Basic reception scene

PHASE 2:
- Guest spawning
- Guest movement
- Seating
- Guest states

PHASE 3:
- Patience
- Happiness
- Food service
- Guest progression

PHASE 4:
- Requests
- Gifts
- Combo system
- Scoring

PHASE 5:
- Disaster framework
- Multiple disaster types
- Couple stress

PHASE 6:
- Level goals
- Progression
- Planning phase

PHASE 7:
- Content expansion
- More guests
- More venues
- More disasters
- More requests

PHASE 8:
- iPad Safari optimization
- Touch UX polish
- Save system
- Audio
- Visual polish

Do not attempt to build every system simultaneously.

Build one complete vertical slice first.

==================================================
37. VERTICAL SLICE REQUIREMENT
==================================================

Before building dozens of levels, create ONE fully playable wedding level containing:

- Player movement
- Guest arrival
- Seating
- At least 3 guest personalities
- Patience
- Happiness
- Food service
- At least 2 special requests
- At least 2 disasters
- Bride/Groom stress
- At least one combo system
- Score calculation
- Win condition
- Failure condition
- Results screen

The vertical slice must be fun and playable before expanding content.

==================================================
38. ARCHITECTURAL REQUIREMENT
==================================================

Do not create a giant GameScene containing the entire game.

Separate systems into logical modules such as:

Game State
Guest System
Guest AI
Seating System
Service System
Food System
Request System
Disaster System
Couple System
Combo System
Score System
Level System
Progression System
Save System
Audio System
UI System

Use clean boundaries.

Each system should have one clear responsibility.

==================================================
39. DEVELOPMENT RULE
==================================================

Before implementing a new mechanic:

1. Define its gameplay purpose.
2. Define its state.
3. Define its data.
4. Define its events.
5. Define how it interacts with existing systems.
6. Implement it.
7. Test it.
8. Only then expand it.

Do not create temporary hacks that become permanent architecture.

==================================================
40. FINAL DESIGN GOAL
==================================================

The finished game should feel like:

"A polished, original, personal wedding time-management game where the player manages Goji and Tanya's wedding while constantly juggling guests, food, requests, disasters, combos, and couple stress."

The goal is not to create a generic wedding simulator.

The goal is to create a FAST, CHAOTIC, STRATEGIC, FUN real-time wedding management game with strong Wedding Dash-inspired gameplay DNA and original personal content.