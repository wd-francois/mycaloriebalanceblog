# AI Button Feature Added

## Overview
Added an AI icon/button next to the Information, Edit, Delete buttons for meal entries. When clicked, it opens ChatGPT with a pre-filled prompt containing the meal's nutritional information.

## Changes Made

### 1. GroupedEntries.jsx
- Added `handleAIClick` function that creates a detailed prompt with meal information
- Added AI button (lightbulb icon) that appears only for meal entries
- Button is positioned between Information and Edit buttons
- Uses purple hover color to distinguish from other buttons

### 2. LibraryManager.jsx  
- Added identical `handleAIClick` function for meal library entries
- Added AI button for meal entries in the library view
- Same styling and positioning as in GroupedEntries

## Functionality
- **Button Icon**: Lightbulb SVG icon (represents AI/assistance)
- **Hover Color**: Purple (#9333ea) to distinguish from other action buttons
- **Tooltip**: "Get AI nutrition info"
- **Action**: Opens ChatGPT in new tab with pre-filled prompt

## ChatGPT Prompt Structure
The AI button creates a comprehensive prompt that includes:
- Meal name and amount
- Current nutritional values (calories, protein, carbs, fats)
- Request for accurate nutritional information
- Clear formatting request for easy meal entry updates

## Example Prompt
```
I have a meal entry for "Chicken Breast" with amount: 200g. 

Current nutritional values:
- Calories: not specified
- Protein: not specified  
- Carbs: not specified
- Fats: not specified

Please provide accurate nutritional information for this meal. Include:
1. Calories per serving
2. Protein content in grams
3. Carbohydrates content in grams
4. Fats content in grams
5. Any additional nutritional insights

Please format your response clearly so I can easily update my meal entry.
```

## User Workflow
1. User sees meal entry with Information, AI, Edit, Delete buttons
2. User clicks AI button (lightbulb icon)
3. ChatGPT opens in new tab with pre-filled nutritional query
4. User gets AI response with nutritional information
5. User can copy/paste values back into meal entry form

## Technical Details
- Uses `window.open()` to open ChatGPT in new tab
- URL encodes the prompt for proper transmission
- Only appears for meal entries (not exercises, sleep, or measurements)
- Maintains existing button styling and responsive design
- No breaking changes to existing functionality

## Files Modified
- `src/components/GroupedEntries.jsx`
- `src/components/LibraryManager.jsx`

## Testing
- No linting errors introduced
- Feature works in both main food logger and library views
- Responsive design maintained
- Existing functionality preserved

