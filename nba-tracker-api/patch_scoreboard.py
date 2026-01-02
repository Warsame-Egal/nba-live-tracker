#!/usr/bin/env python3
"""
Patches nba_api/stats/endpoints/scoreboardv2.py to handle missing WinProbability field.
Replaces dict access with .get() to prevent KeyError.
"""
import sys
from pathlib import Path

def find_scoreboardv2_file():
    """Locate scoreboardv2.py in nba_api package."""
    import nba_api
    nba_api_path = Path(nba_api.__file__).parent
    scoreboard_file = nba_api_path / "stats" / "endpoints" / "scoreboardv2.py"
    
    if not scoreboard_file.exists():
        raise FileNotFoundError(f"Could not find scoreboardv2.py at {scoreboard_file}")
    
    return scoreboard_file

def patch_scoreboard(scoreboard_file: Path):
    """Replace dict access with .get() to handle missing WinProbability."""
    print(f"Patching {scoreboard_file}...")
    
    with open(scoreboard_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace hard-coded dict access with .get() to avoid KeyError
    old_line = 'self.win_probability = Endpoint.DataSet(data=data_sets["WinProbability"])'
    new_line = 'self.win_probability = Endpoint.DataSet(data=data_sets.get("WinProbability", []))'
    
    if old_line in content:
        content = content.replace(old_line, new_line)
        print("   Patched WinProbability access")
    elif new_line in content:
        print("   Already patched")
    else:
        print("   Failed: Could not find WinProbability line")
        return False
    
    # Write patched content
    with open(scoreboard_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Patch complete")
    return True

if __name__ == "__main__":
    try:
        scoreboard_file = find_scoreboardv2_file()
        patch_scoreboard(scoreboard_file)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)



