# Groq AI Integration

This app uses Groq to generate short, real-time insights about live NBA games.

## Why Groq

Groq is fast. That matters for live data. When a game is happening, we need insights quickly, not after 5 seconds of waiting.

## What Groq Does

Groq turns live game data into short, readable insights. It looks at:

- Current scores
- Quarter and time remaining
- Recent plays
- Win probabilities

Then it writes 1-2 sentences explaining what's happening right now.

Examples:

- "The Lakers have opened a 10-point lead in the 4th quarter."
- "The game is tied with 2 minutes remaining."
- "The Warriors are on a 12-0 run."

## What Groq Does NOT Do

Groq does not calculate stats. All the math (win probabilities, net ratings, score predictions) happens in Python before Groq sees anything.

Groq does not replace game logic. It just explains what the numbers mean in plain English.

## Batching and Caching

Instead of calling Groq for each game separately, we batch all live games into one call. This is faster and cheaper.

Insights are cached for 60 seconds, limited to 50 entries. If you refresh the page within that window, you get the cached result instead of calling Groq again.

Lead change explanations are also cached per game (60 seconds TTL, limited to 20 entries). If someone already asked "why did the lead change?" for a game, the next person gets the cached answer.

## How It Works

1. Backend collects data for all live games
2. Sends everything to Groq in one request
3. Groq returns insights for games with meaningful changes
4. Frontend displays insights below each game row
5. User can click "Why?" on lead changes to get a deeper explanation

The prompts evolve over time. They're not fixed. We adjust them based on what works and what doesn't.

## Prompt System

**Location:** `app/services/groq_prompts.py`

The prompt system has multiple functions for different use cases:

**For Live Game Insights:**

- `get_batched_insights_system_message()` - System message for batched insights
- `build_batched_insights_prompt()` - Formats all live games into one prompt

**For Predictions:**

- `get_system_message()` - System message for prediction insights
- `build_insight_prompt()` - Single game prediction insights
- `build_batched_prediction_insights_prompt()` - All predictions for a date
- `build_enhanced_prediction_prompt()` - Enhanced predictions with more context

**For Lead Changes:**

- `get_lead_change_system_message()` - System message for lead changes
- `build_lead_change_prompt()` - Formats game data and last 5 plays

**For Key Moments:**

- `get_key_moment_system_message()` - System message for key moments
- `build_key_moment_context_prompt()` - Single key moment context
- `get_batched_moment_context_system_message()` - System message for batched moments
- `build_batched_moment_context_prompt()` - All key moments needing context

All prompts return JSON format for easy parsing. System messages enforce rules like "no calculations, no contradictions, only explain what numbers say."

## Key Moments

**Location:** `app/services/key_moments.py`

Key moments are automatically detected important plays in live games.

**Types of Key Moments:**

- **Game-tying shot** - Shot that ties the game
- **Lead change** - Play that changes which team is leading
- **Scoring run** - Team scores 6+ points in quick succession
- **Clutch play** - Important play in final 2 minutes with score within 5 points
- **Big shot** - 3-pointer that extends lead to 10+ or cuts deficit to 5 or less

**How It Works:**

1. Background task processes live games every few seconds
2. Analyzes play-by-play events for each game
3. Detects key moments based on game state
4. Batches all moments needing AI context into one Groq call
5. Caches context permanently (until server restart)
6. Sends moments via WebSocket (only last 30 seconds)

**Caching:**

- Key moments: 5 minutes per game (recent moments only)
- Key moments context: Limited to 1000 entries (oldest removed when full)

## Predictions

**Location:** `app/services/predictions.py`

Predictions calculate win probabilities and generate AI explanations.

**How It Works:**

1. User requests predictions for a date
2. Backend fetches games for that date
3. Calculates win probabilities using Python (not Groq)
4. Predicts scores using Python (not Groq)
5. Batches all predictions into one Groq call for explanations
6. Groq returns insights, key drivers, risk factors, matchup narrative
7. Returns predictions with AI explanations

**Prediction Model:**

- Based on team win percentages
- Net ratings provide additional context
- Home court advantage (3.5%)
- Simple statistical formula

**Caching:**

- Predictions: 30 minutes TTL by date+season, limited to 100 entries with LRU eviction
- Team statistics: 1 hour TTL by season, limited to last 3 seasons

## Rate Limiting

Groq has rate limits. We respect them.

**Groq Limits:**

- 28 requests per minute (RPM)
- 5800 tokens per minute (TPM)

**How We Handle It:**

- Track requests and tokens in rolling 60-second windows
- Wait before making calls if we're approaching limits
- Use batching to reduce total calls (one call for all games instead of one per game)
- Cache results so we don't call Groq again for the same data

**Where Rate Limiting Applies:**

- Batched insights (all live games in one call)
- Lead change explanations (on-demand)
- Predictions page (AI explanations for game predictions - batched for all games)
- Key moments context generation (batched for all moments needing context)

All Groq calls go through the same rate limiter. If we hit a limit, we wait and retry.

## Error Handling

If Groq is unavailable or fails:

- **Batched insights:** Returns empty insights list
- **Lead change explanations:** Returns error message
- **Predictions:** Falls back to simple insights without AI
- **Key moments:** Moments detected but no AI context (still shown to users)

All Groq calls have timeouts (10 seconds for batched calls) to prevent hanging.
