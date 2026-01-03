"""
Prompt generation for Groq LLM to generate NBA game prediction insights.
"""

from typing import List, Dict, Any


def get_system_message() -> str:
    """Get the system message for Groq LLM."""
    return (
        "You are an NBA game analysis assistant. Turn provided numbers into short, clear insights. "
        "Do NOT calculate, invent, or contradict numbers. Only explain what the numbers say. "
        "Stay neutral if unclear. No hype, no opinions. "
        "Return only valid JSON arrays in format: [{\"title\": \"...\", \"description\": \"...\"}]. "
        "No markdown, no explanations outside JSON."
    )


def build_insight_prompt(
    home_team_name: str,
    away_team_name: str,
    home_win_prob_pct: float,
    away_win_prob_pct: float,
    predicted_home_score: float,
    predicted_away_score: float,
    net_rating_diff_str: str = "",
) -> str:
    """
    Build the user prompt for generating AI insights.
    
    Args:
        home_team_name: Home team name
        away_team_name: Away team name
        home_win_prob_pct: Home team win probability as percentage
        away_win_prob_pct: Away team win probability as percentage
        predicted_home_score: Predicted home team score
        predicted_away_score: Predicted away team score
        net_rating_diff_str: Optional net rating difference string
        
    Returns:
        str: Formatted prompt for Groq LLM
    """
    # Calculate which team is favored (for clarity in prompt)
    score_diff = abs(predicted_home_score - predicted_away_score)
    prob_diff = abs(home_win_prob_pct - away_win_prob_pct)
    home_favored = home_win_prob_pct > away_win_prob_pct
    
    # Determine which team is actually favored and winning
    favored_team = home_team_name if home_favored else away_team_name
    underdog_team = away_team_name if home_favored else home_team_name
    favored_prob = home_win_prob_pct if home_favored else away_win_prob_pct
    underdog_prob = away_win_prob_pct if home_favored else home_win_prob_pct
    winning_team_by_score = home_team_name if predicted_home_score > predicted_away_score else away_team_name
    
    # Build efficiency edge example (only if net rating is available)
    efficiency_example = ""
    if net_rating_diff_str:
        # Determine which team has better net rating
        if "(" in net_rating_diff_str:
            # Extract team name from net_rating_diff_str format: "+6.2 (Houston Rockets)"
            team_with_better_rating = net_rating_diff_str.split("(")[1].split(")")[0].strip()
            efficiency_example = f"- \"Efficiency Edge\" | \"Net rating data favors {team_with_better_rating} in overall team performance.\""
        else:
            efficiency_example = f"- \"Efficiency Edge\" | \"Net rating data favors the favored team in overall team performance.\""
    
    prompt = f"""You are an NBA game analysis assistant.

Your job is to TURN PROVIDED NUMBERS into short, clear, human-readable insights.

Rules (non-negotiable):
- You MUST NOT calculate probabilities, scores, or stats.
- You MUST NOT invent numbers or change provided values.
- You MUST NOT contradict the inputs.
- You MUST NOT label teams as underdogs/favorites unless the probabilities clearly support it.
- You ONLY explain what the numbers already say.
- If information is unclear, stay neutral.
- No hype, no opinions, no predictions beyond the data.

NBA context:
- Home teams usually have a small advantage.
- Large probability gaps (>15%) indicate a clear favorite.
- Small gaps (<10%) indicate a competitive game.
- Score differences of 5–8 points = moderate margin.
- Do not restate numbers unless explaining them.

PROVIDED DATA:
Home Team: {home_team_name}
Away Team: {away_team_name}

Home Win Probability: {home_win_prob_pct:.1f}%
Away Win Probability: {away_win_prob_pct:.1f}%

Predicted Score:
{home_team_name} {predicted_home_score:.0f}
{away_team_name} {predicted_away_score:.0f}{net_rating_diff_str}

CRITICAL - VERIFY BEFORE WRITING:
- Favored team: {favored_team} ({favored_prob:.1f}% win probability)
- Underdog team: {underdog_team} ({underdog_prob:.1f}% win probability)
- Predicted winner by score: {winning_team_by_score} ({max(predicted_home_score, predicted_away_score):.0f} points)
- Score difference: {score_diff:.0f} points
- Probability difference: {prob_diff:.1f} percentage points

CONSISTENCY REQUIREMENTS:
- ALL insights must agree: {favored_team} is favored (if prob_diff >= 5%).
- NEVER say {underdog_team} is favored when {favored_team} has higher probability.
- NEVER contradict the win probabilities or predicted scores.
- If probability gap is <5%, stay neutral about favorites.

OUTPUT FORMAT:
Return JSON array: [{{"title": "Short title", "description": "1-2 line explanation"}}]

Example format:
- "Clear Win Probability" | "{favored_team} holds a strong advantage based on win probability."
- "Moderate Margin Expected" | "The predicted score suggests a steady but competitive win."
{efficiency_example if efficiency_example else ""}

Generate 2-3 insights. INTERPRET the data, don't repeat numbers."""
    
    return prompt


def build_live_game_insight_prompt(
    home_team: str,
    away_team: str,
    home_score: int,
    away_score: int,
    period: int,
    clock: str,
    last_3_plays: List[str],
    top_performer: str = "",
    trigger_type: str = "score_change",
) -> str:
    """
    Build the user prompt for generating live game insights.
    
    Args:
        home_team: Home team name
        away_team: Away team name
        home_score: Home team score
        away_score: Away team score
        period: Current period (1-4, or 5+ for OT)
        clock: Time remaining in period
        last_3_plays: List of last 3 play descriptions
        top_performer: Optional top performer stat line
        trigger_type: Type of trigger (score_change, period_change, timeout, momentum, end_of_quarter, overtime)
        
    Returns:
        str: Formatted prompt for Groq LLM
    """
    score_diff = abs(home_score - away_score)
    leading_team = home_team if home_score > away_score else away_team
    trailing_team = away_team if home_score > away_score else home_team
    
    # Determine game state context
    is_close = score_diff < 6
    has_control = score_diff >= 10
    is_late_game = period >= 4 or (period == 3 and clock and "2:00" in clock)
    is_overtime = period >= 5
    
    plays_text = "\n".join([f"{i+1}. {play}" for i, play in enumerate(last_3_plays)]) if last_3_plays else "No recent plays available."
    
    top_performer_text = f"\n\nTop Performer:\n{top_performer}" if top_performer else ""
    
    # Context based on trigger type
    trigger_context = {
        "score_change": "A score change has occurred.",
        "period_change": "The period has changed.",
        "timeout": "A timeout has occurred.",
        "momentum": "Multiple consecutive scoring plays by one team indicate momentum.",
        "end_of_quarter": "The quarter has ended.",
        "overtime": "The game has entered overtime.",
    }.get(trigger_type, "A game event has occurred.")
    
    prompt = f"""You are an NBA live-game interpreter.

Your ONLY job is to convert live game data into short, accurate, human-readable insights.

CRITICAL RULES:
- You MUST use ONLY the data provided.
- You MUST NOT calculate, predict, or estimate anything.
- You MUST NOT invent stats, trends, or momentum.
- You MUST NOT contradict the score, clock, or play-by-play.
- You MUST NOT speculate about outcomes.
- If information is unclear or neutral, say nothing meaningful rather than guessing.

STYLE RULES:
- 1–2 sentences max
- Neutral, factual, calm
- No hype, no emojis, no opinionated language
- ESPN broadcast tone, not Twitter

GAME STATE SNAPSHOT:

Home Team: {home_team}
Away Team: {away_team}

Score:
{home_team}: {home_score}
{away_team}: {away_score}

Period: {period}
Time Remaining: {clock}

Last 3 Plays:
{plays_text}{top_performer_text}

TRIGGER: {trigger_context}

KNOWN CONTEXT:
- Lead < 6 points = close game
- Lead >= 10 points = control
- Late game (4th quarter or final 2 minutes) = increased importance
- Repeated scoring plays by same team = momentum
- Fouls, turnovers, timeouts = momentum shifts

CURRENT STATE:
- Score difference: {score_diff} points
- Leading team: {leading_team}
- Game type: {"Close" if is_close else "Control" if has_control else "Competitive"}
- Time context: {"Late game" if is_late_game else "Early/Mid game"}
- Period type: {"Overtime" if is_overtime else f"Period {period}"}

TASK:
Generate ONE short insight that explains what is happening RIGHT NOW based on the trigger and current game state.

OUTPUT FORMAT (JSON ONLY):
{{"insight": "single clear sentence explaining the current game state"}}

Examples:
{{"insight":"Philadelphia has opened a small lead late in the second quarter, keeping control heading into halftime."}}
{{"insight":"Dallas has trimmed the deficit with back-to-back scoring plays, making this a one-possession game."}}
{{"insight":"The game has slowed down as both teams trade half-court possessions in a tight contest."}}
{{"insight":"The teams remain evenly matched as play continues without a clear momentum shift."}}

Generate ONE insight. Be factual, neutral, and explain what the data shows RIGHT NOW."""
    
    return prompt


def get_live_game_system_message() -> str:
    """Get the system message for live game insights."""
    return (
        "You are an NBA live-game interpreter. Convert game data into short, factual insights. "
        "Use ONLY provided data. Do NOT calculate, predict, or invent anything. "
        "Return only valid JSON in format: {\"insight\": \"...\"}. "
        "No markdown, no explanations outside JSON."
    )


def get_batched_insights_system_message() -> str:
    """Get the system message for batched live game insights."""
    return (
        "You are an NBA live-game analyst. Explain changes, not outcomes. "
        "Only explain what the numbers already show. "
        "If nothing meaningful changed, return type = \"none\". "
        "Return only valid JSON. No markdown, no explanations outside JSON."
    )


def build_batched_prediction_insights_prompt(predictions: List[Dict[str, Any]]) -> str:
    """
    Build prompt for batched prediction insights across all games for a date.
    
    Args:
        predictions: List of prediction dictionaries with:
            - game_id
            - home_team_name
            - away_team_name
            - home_win_prob (0-1)
            - away_win_prob (0-1)
            - predicted_home_score
            - predicted_away_score
            - home_win_pct (optional, for context)
            - away_win_pct (optional, for context)
            - net_rating_diff_str (optional)
        
    Returns:
        str: Formatted prompt for Groq LLM
    """
    import json
    
    # Format predictions for prompt
    predictions_snapshot = []
    for pred in predictions:
        home_win_prob_pct = pred.get("home_win_prob", 0.5) * 100
        away_win_prob_pct = pred.get("away_win_prob", 0.5) * 100
        net_rating_str = pred.get("net_rating_diff_str", "")
        
        predictions_snapshot.append({
            "game_id": pred.get("game_id", ""),
            "home_team": pred.get("home_team_name", ""),
            "away_team": pred.get("away_team_name", ""),
            "home_win_prob_pct": round(home_win_prob_pct, 1),
            "away_win_prob_pct": round(away_win_prob_pct, 1),
            "predicted_home_score": round(pred.get("predicted_home_score", 0)),
            "predicted_away_score": round(pred.get("predicted_away_score", 0)),
            "net_rating_diff": net_rating_str
        })
    
    predictions_json = json.dumps(predictions_snapshot, indent=2)
    
    prompt = f"""Generate prediction insights for the following NBA games.

GAMES:
{predictions_json}

RULES (non-negotiable):
- You MUST NOT calculate probabilities, scores, or stats.
- You MUST NOT invent numbers or change provided values.
- You MUST NOT contradict the inputs.
- You MUST NOT label teams as underdogs/favorites unless the probabilities clearly support it.
- You ONLY explain what the numbers already say.
- If information is unclear, stay neutral.
- No hype, no opinions, no predictions beyond the data.

NBA context:
- Home teams usually have a small advantage.
- Large probability gaps (>15%) indicate a clear favorite.
- Small gaps (<10%) indicate a competitive game.
- Score differences of 5–8 points = moderate margin.
- Do not restate numbers unless explaining them.

OUTPUT FORMAT (STRICT JSON):
{{
  "insights": [
    {{
      "game_id": "string",
      "insights": [
        {{"title": "Short title", "description": "1-2 line explanation"}},
        {{"title": "Short title", "description": "1-2 line explanation"}}
      ]
    }}
  ]
}}

IMPORTANT: 
- Return 2-3 insights per game.
- Each insight should have a title and description.
- Insights must agree with the provided probabilities and scores.
- If probability gap is <5%, stay neutral about favorites.
- Generate insights for ALL games provided."""
    
    return prompt


def build_enhanced_prediction_prompt(predictions: List[Dict[str, Any]]) -> str:
    """
    Build prompt for enhanced prediction analysis with confidence tiers, key drivers, risk factors, and matchup narrative.
    
    Args:
        predictions: List of prediction dictionaries with:
            - game_id
            - home_team_name
            - away_team_name
            - home_win_prob (0-1)
            - away_win_prob (0-1)
            - predicted_home_score
            - predicted_away_score
            - home_win_pct (optional)
            - away_win_pct (optional)
            - home_net_rating (optional)
            - away_net_rating (optional)
            - net_rating_diff_str (optional)
            - confidence (0-1, optional)
        
    Returns:
        str: Formatted prompt for Groq LLM to generate enhanced analysis
    """
    import json
    
    # Format predictions for prompt
    predictions_snapshot = []
    for pred in predictions:
        home_win_prob_pct = pred.get("home_win_prob", 0.5) * 100
        away_win_prob_pct = pred.get("away_win_prob", 0.5) * 100
        confidence_val = pred.get("confidence", 0.5)
        net_rating_str = pred.get("net_rating_diff_str", "")
        home_net = pred.get("home_net_rating")
        away_net = pred.get("away_net_rating")
        
        predictions_snapshot.append({
            "game_id": pred.get("game_id", ""),
            "home_team": pred.get("home_team_name", ""),
            "away_team": pred.get("away_team_name", ""),
            "home_win_prob_pct": round(home_win_prob_pct, 1),
            "away_win_prob_pct": round(away_win_prob_pct, 1),
            "predicted_home_score": round(pred.get("predicted_home_score", 0)),
            "predicted_away_score": round(pred.get("predicted_away_score", 0)),
            "confidence": round(confidence_val, 2),
            "home_win_pct": round(pred.get("home_win_pct", 0) * 100, 1) if pred.get("home_win_pct") else None,
            "away_win_pct": round(pred.get("away_win_pct", 0) * 100, 1) if pred.get("away_win_pct") else None,
            "home_net_rating": round(home_net, 1) if home_net is not None else None,
            "away_net_rating": round(away_net, 1) if away_net is not None else None,
            "net_rating_diff": net_rating_str
        })
    
    predictions_json = json.dumps(predictions_snapshot, indent=2)
    
    prompt = f"""Generate enhanced prediction analysis for the following NBA games.

GAMES:
{predictions_json}

RULES (non-negotiable):
- You MUST NOT calculate probabilities, scores, or stats. Use only provided values.
- You MUST NOT invent numbers or change provided values.
- You MUST NOT contradict the inputs.
- You ONLY explain what the numbers already say.
- Analytical tone: professional, data-driven, no hype.
- If information is unclear, stay neutral.

ANALYSIS REQUIREMENTS:

1. CONFIDENCE TIER: Determine "high", "medium", or "low" based on:
   - High: Clear favorite (>15% prob gap), strong stats alignment, high confidence value (>0.7)
   - Medium: Moderate favorite (10-15% gap), mixed signals, confidence 0.5-0.7
   - Low: Close game (<10% gap), conflicting stats, confidence <0.5, or significant uncertainty
   Provide a brief explanation (1 sentence) for the tier.

2. KEY DRIVERS: Identify top 2-3 factors driving the prediction:
   - Examples: "Home Court Advantage", "Net Rating Gap", "Win Percentage Difference", "Recent Form"
   - For each: factor name, impact description, magnitude ("High", "Moderate", or "Low")
   - Focus on factors that most strongly influence the prediction

3. RISK FACTORS: Identify 0-2 factors that create uncertainty or upset potential:
   - Only include if there are genuine risks (close games, inconsistent teams, etc.)
   - If prediction is very clear (high confidence, large gap), may have 0 risk factors
   - Each risk: factor name and explanation of why it creates uncertainty

4. MATCHUP NARRATIVE: Write 1 analytical paragraph (3-4 sentences) summarizing:
   - The statistical context of the matchup
   - Key factors influencing the prediction
   - Overall assessment of competitiveness
   - Professional, analytical tone (no hype, no predictions beyond data)

5. BASIC INSIGHTS: Generate 2-3 short insights (title + description) as before.

OUTPUT FORMAT (STRICT JSON):
{{
  "insights": [
    {{
      "game_id": "string",
      "confidence_tier": "high|medium|low",
      "confidence_explanation": "1 sentence explanation",
      "key_drivers": [
        {{"factor": "Factor name", "impact": "Impact description", "magnitude": "High|Moderate|Low"}},
        {{"factor": "Factor name", "impact": "Impact description", "magnitude": "High|Moderate|Low"}}
      ],
      "risk_factors": [
        {{"factor": "Risk name", "explanation": "Why this creates uncertainty"}}
      ],
      "matchup_narrative": "3-4 sentence analytical paragraph",
      "insights": [
        {{"title": "Short title", "description": "1-2 line explanation", "impact": "Impact on prediction"}}
      ]
    }}
  ]
}}

IMPORTANT:
- Generate analysis for ALL games provided.
- Confidence tier must match the data (don't inflate confidence).
- Key drivers should be the most influential factors (2-3 max).
- Risk factors only if uncertainty exists (0-2 per game).
- Matchup narrative must be analytical, not promotional.
- All insights must agree with provided probabilities and scores."""
    
    return prompt


def build_batched_insights_prompt(games: List[Dict[str, Any]]) -> str:
    """
    Build prompt for batched insights across all live games.
    
    Args:
        games: List of game dictionaries with UI-visible data
        
    Returns:
        str: Formatted prompt for Groq LLM
    """
    import json
    from datetime import datetime
    
    # Format games for prompt
    games_snapshot = []
    for game in games:
        games_snapshot.append({
            "game_id": game.get("game_id", ""),
            "home_team": game.get("home_team", ""),
            "away_team": game.get("away_team", ""),
            "home_score": game.get("home_score", 0),
            "away_score": game.get("away_score", 0),
            "quarter": game.get("quarter", 1),
            "time_remaining": game.get("time_remaining", ""),
            "win_prob_home": game.get("win_prob_home", 0.5),
            "win_prob_away": game.get("win_prob_away", 0.5),
            "last_event": game.get("last_event", "")
        })
    
    games_json = json.dumps(games_snapshot, indent=2)
    
    prompt = f"""Generate live insights for the following NBA games.

Only return insights for games where something meaningful changed since the last update.

GAMES:
{games_json}

DATA PROVIDED:
- Scores (home_score, away_score)
- Quarter (1-4, or 5+ for OT)
- Time remaining in quarter
- Last event (game status text)
- Win probabilities (calculated from scores if available)

RULES:
- 1–2 sentences max per insight
- No speculation
- No player praise
- No stats beyond what is provided
- Focus on what changed (score changes, quarter changes, momentum shifts)
- If nothing meaningful changed, return type = "none"

OUTPUT FORMAT (STRICT JSON):
{{
  "timestamp": "ISO-8601",
  "insights": [
    {{
      "game_id": "string",
      "type": "momentum | lead_change | run | close_game | blowout | none",
      "text": "One sentence explanation of what changed"
    }}
  ]
}}

IMPORTANT: You MUST return at least one insight for each game provided, even if the change is minimal. 
Only use type="none" if the game is not live or has no data.
For live games with scores, always provide an insight describing the current game state."""
    
    return prompt


def get_lead_change_system_message() -> str:
    """Get the system message for lead change deep-dive."""
    return (
        "You explain game flow changes for NBA fans. "
        "You explain WHAT happened and WHY it mattered. "
        "Nothing else. Return only valid JSON. No markdown."
    )


def build_lead_change_prompt(
    game_id: str,
    home_team: str,
    away_team: str,
    previous_home_score: int,
    previous_away_score: int,
    current_home_score: int,
    current_away_score: int,
    last_5_plays: List[Dict[str, Any]],
    quarter: int,
    time_remaining: str,
) -> str:
    """
    Build prompt for lead change deep-dive explanation.
    
    Args:
        game_id: Game ID
        home_team: Home team name
        away_team: Away team name
        previous_home_score: Previous home score
        previous_away_score: Previous away score
        current_home_score: Current home score
        current_away_score: Current away score
        last_5_plays: Last 5 play dictionaries
        quarter: Current quarter
        time_remaining: Time remaining in quarter
        
    Returns:
        str: Formatted prompt for Groq LLM
    """
    import json
    
    # Format plays
    plays_text = []
    for play in last_5_plays:
        action = play.get("action_type", "")
        description = play.get("description", "")
        team = play.get("team_tricode", "")
        if description:
            plays_text.append(f"{team}: {action} - {description}")
        elif action:
            plays_text.append(f"{team}: {action}")
    
    game_state = {
        "game_id": game_id,
        "home_team": home_team,
        "away_team": away_team,
        "previous_score": {
            "home": previous_home_score,
            "away": previous_away_score
        },
        "current_score": {
            "home": current_home_score,
            "away": current_away_score
        },
        "last_5_plays": plays_text,
        "quarter": quarter,
        "time_remaining": time_remaining
    }
    
    game_state_json = json.dumps(game_state, indent=2)
    
    prompt = f"""You are a real-time NBA game explainer.

Goal:
Explain WHY the lead changed using RECENT EVENTS ONLY.

RULES (NON-NEGOTIABLE):
- Do NOT speculate
- Do NOT predict
- Do NOT reference stats not provided
- Do NOT hype
- Do NOT assign blame

WHAT TO EXPLAIN:
Focus on:
- scoring runs
- turnovers
- fouls
- timeouts
- pace changes

STYLE:
- Calm
- Analytical
- Broadcast-quality
- One breath read

Here is the recent game state:
{game_state_json}

OUTPUT FORMAT (STRICT JSON):
{{
  "game_id": "string",
  "summary": "1–2 sentence explanation",
  "key_factors": [
    "short bullet",
    "short bullet"
  ]
}}

Explain WHY the lead changed based on the last 5 plays."""
    
    return prompt


def get_key_moment_system_message() -> str:
    """
    Get the system message for key moment context generation.
    
    This tells Groq how to behave when generating context for key moments. We want short,
    factual explanations that explain why the moment matters - like "This shot tied the game
    with 2 minutes remaining" or "The lead change gives momentum heading into the final quarter."
    """
    return (
        "You are an NBA game analyst. Explain why a key moment matters in one short sentence. "
        "Be factual and neutral. Return only valid JSON in format: {\"context\": \"...\"}. "
        "No markdown, no explanations outside JSON."
    )


def build_key_moment_context_prompt(moment: Dict[str, Any], game_info: Dict[str, Any]) -> str:
    """
    Build prompt for generating context for a key moment.
    
    We give Groq all the context it needs - what type of moment it is, what play happened,
    the current game state (scores, time remaining, period), and ask it to explain why
    this moment matters in one short sentence. The AI uses this to generate context like
    "This shot tied the game with 2 minutes remaining" or "The lead change gives momentum
    heading into the final quarter."
    
    Args:
        moment: Key moment dictionary with type and play
        game_info: Game information (home_team, away_team, scores, period, clock)
        
    Returns:
        str: Formatted prompt for Groq LLM
    """
    import json
    
    moment_type = moment.get("type", "")
    play = moment.get("play", {})
    
    play_description = play.get("description", "")
    action_type = play.get("action_type", "")
    team_tricode = play.get("team_tricode", "")
    player_name = play.get("player_name", "")
    
    home_team = game_info.get("home_team", "")
    away_team = game_info.get("away_team", "")
    home_score = game_info.get("home_score", 0)
    away_score = game_info.get("away_score", 0)
    period = game_info.get("period", 1)
    clock = game_info.get("clock", "")
    
    score_diff = abs(home_score - away_score)
    leading_team = home_team if home_score > away_score else away_team
    
    # Context based on moment type
    type_descriptions = {
        "game_tying_shot": "A shot that tied the game",
        "lead_change": "A play that changed which team is leading",
        "scoring_run": "A team scoring multiple times in quick succession",
        "clutch_play": "An important play in the final minutes of a close game",
        "big_shot": "A significant 3-pointer that changes the game situation",
    }
    
    moment_description = type_descriptions.get(moment_type, "An important game moment")
    
    prompt = f"""You are an NBA game analyst. Explain why this key moment matters.

MOMENT TYPE: {moment_description}

GAME STATE:
Home Team: {home_team} ({home_score})
Away Team: {away_team} ({away_score})
Period: {period}
Time: {clock}
Score Difference: {score_diff} points
Leading: {leading_team}

THE PLAY:
Team: {team_tricode}
Player: {player_name}
Action: {action_type}
Description: {play_description}

TASK:
Explain in ONE short sentence (max 15 words) why this moment matters in the context of the game.

STYLE:
- Factual and neutral
- No hype or exaggeration
- Focus on game impact
- ESPN broadcast tone

OUTPUT FORMAT (STRICT JSON):
{{"context": "one short sentence explaining why this moment matters"}}

Example:
{{"context": "This shot tied the game with 2 minutes remaining, setting up a tight finish."}}
{{"context": "The lead change gives the visiting team momentum heading into the final quarter."}}
{{"context": "The scoring run extends the lead to double digits, putting pressure on the opponent."}}

Generate the context."""

    return prompt


def get_batched_moment_context_system_message() -> str:
    """
    Get the system message for batched key moment context generation.
    
    This is used when generating context for multiple moments at once. We batch all moments
    that need context into one Groq call for efficiency, similar to how AI insights work.
    """
    return (
        "You are an NBA game analyst. Generate context for multiple key moments. "
        "For each moment, explain why it matters in one short sentence. "
        "Be factual and neutral. Return only valid JSON. No markdown, no explanations outside JSON."
    )


def build_batched_moment_context_prompt(moments_with_game_info: List[Dict[str, Any]]) -> str:
    """
    Build prompt for generating context for multiple key moments in one Groq call.
    
    This batches all moments that need context into one API call, similar to how
    batched insights work. This is much more efficient than calling Groq per-moment.
    
    Args:
        moments_with_game_info: List of dicts with keys:
            - moment_id: Unique identifier for this moment
            - moment: Key moment dictionary with type and play
            - game_info: Game information (home_team, away_team, scores, period, clock)
        
    Returns:
        str: Formatted prompt for Groq LLM
    """
    import json
    
    moments_data = []
    for item in moments_with_game_info:
        moment = item["moment"]
        game_info = item["game_info"]
        moment_id = item["moment_id"]
        
        moment_type = moment.get("type", "")
        play = moment.get("play", {})
        
        play_description = play.get("description", "")
        action_type = play.get("action_type", "")
        team_tricode = play.get("team_tricode", "")
        player_name = play.get("player_name", "")
        
        home_team = game_info.get("home_team", "")
        away_team = game_info.get("away_team", "")
        home_score = game_info.get("home_score", 0)
        away_score = game_info.get("away_score", 0)
        period = game_info.get("period", 1)
        clock = game_info.get("clock", "")
        
        score_diff = abs(home_score - away_score)
        leading_team = home_team if home_score > away_score else away_team
        
        type_descriptions = {
            "game_tying_shot": "A shot that tied the game",
            "lead_change": "A play that changed which team is leading",
            "scoring_run": "A team scoring multiple times in quick succession",
            "clutch_play": "An important play in the final minutes of a close game",
            "big_shot": "A significant 3-pointer that changes the game situation",
        }
        
        moment_description = type_descriptions.get(moment_type, "An important game moment")
        
        moments_data.append({
            "moment_id": moment_id,
            "game": f"{home_team} vs {away_team}",
            "moment_type": moment_description,
            "game_state": {
                "home_score": home_score,
                "away_score": away_score,
                "period": period,
                "clock": clock,
                "score_diff": score_diff,
                "leading": leading_team,
            },
            "play": {
                "team": team_tricode,
                "player": player_name,
                "action": action_type,
                "description": play_description,
            }
        })
    
    moments_json = json.dumps(moments_data, indent=2)
    
    prompt = f"""You are an NBA game analyst. Generate context for multiple key moments.

MOMENTS:
{moments_json}

TASK:
For each moment, explain in ONE short sentence (max 15 words) why it matters in the context of the game.

STYLE:
- Factual and neutral
- No hype or exaggeration
- Focus on game impact
- ESPN broadcast tone

OUTPUT FORMAT (STRICT JSON):
{{
  "contexts": [
    {{"moment_id": "moment_1", "context": "one short sentence explaining why this moment matters"}},
    {{"moment_id": "moment_2", "context": "one short sentence explaining why this moment matters"}}
  ]
}}

EXAMPLES:
{{"moment_id": "moment_1", "context": "This shot tied the game with 2 minutes remaining, setting up a tight finish."}}
{{"moment_id": "moment_2", "context": "The lead change gives the visiting team momentum heading into the final quarter."}}

Generate contexts for all moments."""

    return prompt

