import requests
import html
import random
import json

def get_arcade_trivia(amount=5, category_id=22):
    """
    Fetch trivia questions from Open Trivia DB and format them
    for direct pasting into the TRIVIA_DB object in app.js.

    Common category IDs:
      9  = General Knowledge
      21 = Sports
      22 = Geography
      23 = History
      24 = Politics
      12 = Music
    """
    url = f"https://opentdb.com/api.php?amount={amount}&category={category_id}&type=multiple"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        return []

    # FIX: Check for API-level errors (e.g. response_code 5 = rate limited)
    if data.get("response_code") != 0:
        print(f"API error — response_code: {data.get('response_code')}")
        return []

    formatted_questions = []

    for item in data.get("results", []):
        # Clean HTML entities and normalise quotes
        question   = html.unescape(item["question"]).replace('"', "'")
        correct    = html.unescape(item["correct_answer"]).replace('"', "'")
        incorrect  = [html.unescape(a).replace('"', "'") for a in item["incorrect_answers"]]

        options = incorrect + [correct]
        random.shuffle(options)
        correct_index = options.index(correct)

        # FIX: use json.dumps to produce a proper JS-compatible array with double quotes
        opts_js = json.dumps(options)          # e.g. ["Opt A", "Opt B", ...]
        js_object = f'  {{ q:"{question}", o:{opts_js}, a:{correct_index} }},'
        formatted_questions.append(js_object)

    return formatted_questions


if __name__ == "__main__":
    # FIX: use \n (single backslash) so a real newline prints, not the literal text '\n'
    print("Copy and paste this into your TRIVIA_DB:\n")
    new_trivia = get_arcade_trivia(amount=5, category_id=9)  # General Knowledge

    if new_trivia:
        for q in new_trivia:
            print(q)
    else:
        print("No questions returned — check your network connection or try again.")