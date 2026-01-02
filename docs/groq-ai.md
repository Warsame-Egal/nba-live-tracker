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

Insights are cached for 60 seconds. If you refresh the page within that window, you get the cached result instead of calling Groq again.

Lead change explanations are also cached per game. If someone already asked "why did the lead change?" for a game, the next person gets the cached answer.

## How It Works

1. Backend collects data for all live games
2. Sends everything to Groq in one request
3. Groq returns insights for games with meaningful changes
4. Frontend displays insights below each game row
5. User can click "Why?" on lead changes to get a deeper explanation

The prompts evolve over time. They're not fixed. We adjust them based on what works and what doesn't.

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
- Predictions page (AI explanations for game predictions)

All Groq calls go through the same rate limiter. If we hit a limit, we wait and retry.

