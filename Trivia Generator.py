import requests
import html
import random

def get_arcade_trivia(amount=5, category_id=22):
    # Category 22 is Geography. You can change this ID for Sports, History, etc.
    url = f"https://opentdb.com/api.php?amount={amount}&category={category_id}&type=multiple"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Network error occurred: {e}")
        return []

    formatted_questions = []

    for item in data.get('results', []):
        # The API returns HTML entities like &quot; so we clean them up
        question = html.unescape(item['question']).replace('"', "'")
        correct_ans = html.unescape(item['correct_answer']).replace('"', "'")
        incorrect_ans = [html.unescape(ans).replace('"', "'") for ans in item['incorrect_answers']]

        # Combine the options and shuffle them so the answer isn't always last
        options = incorrect_ans + [correct_ans]
        random.shuffle(options)

        # Find where the correct answer ended up after the shuffle
        correct_index = options.index(correct_ans)

        # Build the exact string format for your TRIVIA_DB object
        js_object = f'{{ q:"{question}", o:{options}, a:{correct_index} }},'
        formatted_questions.append(js_object)

    return formatted_questions

# Let's fire it up and grab 5 Geography questions
print("Copy and paste this into your TRIVIA_DB:\\n")
new_trivia = get_arcade_trivia(amount=5, category_id=22)

for q in new_trivia:
    print(q)