# Study With Si-eun

## Current State
New project. No existing application files.

## Requested Changes (Diff)

### Add
- Pomodoro timer (25 min focus / 5 min break, customizable)
- Character presence system with two visual states: focus and break
- Smart rule-based AI response engine (under 10 words, silence 30-50% of the time)
- Context-aware character dialogue: session start, quit early, multiple sessions, return after break, late night, morning
- Typing simulation: 'typing...' indicator, 1-3s delay, letter-by-letter text reveal
- Memory system via localStorage: total sessions, last visit, streak
- Time awareness: late night (2-5 AM) and morning detection
- Fake online presence indicator
- Dark minimal Korean study aesthetic UI
- Subtle character animations (breathing, small movements)
- Character image assets: focus.png and break.png (AI-generated originals)
- Optional ambient rain sound toggle
- PWA manifest for Add to Home Screen

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Generate character images: focus pose and break pose
2. Write backend (minimal - can store session count if needed, but primarily frontend app)
3. Build frontend:
   - PomodoroTimer component with start/pause/reset, customizable durations
   - CharacterDisplay component with conditional image and breathing animation
   - DialogueBox component with typing indicator and typewriter effect
   - Memory/stats hook using localStorage (sessions, streak, last visit)
   - ResponseEngine: context-aware rule-based responses with silence mechanism
   - TimeAwareness utility
   - Online presence header indicator
   - Ambient sound toggle
   - PWA manifest
