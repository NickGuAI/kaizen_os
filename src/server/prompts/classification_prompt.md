# Event Classification Prompt

You are classifying calendar events to action cards in a personal productivity system.

## Classification Rules
These are user-defined rules that should take priority:
{{RULES}}

## Previous Classifications (Past 2 Weeks)
Learn from these past decisions:
{{PREVIOUS_CLASSIFICATIONS}}

## Action Cards
Available actions (each has a numeric ID):
{{ACTIONS}}

## Unclassified Events
Events that need classification:
{{EVENTS}}

## Instructions
For each unclassified event, suggest the TWO most relevant action cards based on:
1. Matching classification rules (highest priority)
2. Similarity to previously classified events
3. Semantic relevance to action card titles

Output the numeric ID of each action card — do not include the card title.

Output format (XML):
```xml
<classifications>
  <task name="Event Title Here">
    <action>1</action>
    <action>3</action>
  </task>
</classifications>
```

Only output the XML block, nothing else.
