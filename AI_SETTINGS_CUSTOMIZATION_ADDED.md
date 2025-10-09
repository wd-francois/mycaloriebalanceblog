# AI Settings Customization Feature Added ✅

## Overview
Added comprehensive AI customization options to the settings page, allowing users to personalize their AI assistant experience for meal nutrition queries.

## 🎯 New Features Added

### 1. AI Service Selection
- **ChatGPT** (default)
- **Claude AI**
- **Google Gemini**
- **Custom URL** (for custom AI services)

### 2. Request Format Options
- **Detailed** - Full comprehensive prompt with all nutritional details
- **Simple** - Basic request format
- **Custom Template** - User-defined prompt template

### 3. Language Support
- English (default)
- Spanish
- French
- German
- Portuguese

### 4. Advanced Customization
- **Include Current Values** - Toggle to include/exclude existing nutritional values in prompts
- **Custom Prompt Template** - Full text editor for customizing AI prompts
- **Custom AI Service URL** - Support for custom AI endpoints
- **Live Prompt Preview** - Real-time preview of how prompts will look

## 🔧 Technical Implementation

### Settings Context Updates
- Added AI-related settings to `SettingsContext.jsx`
- Implemented `generateAIPrompt()` function for dynamic prompt generation
- Added `getAIServiceUrl()` function for service-specific URL generation
- Support for placeholder replacement: `{mealName}`, `{amount}`, `{calories}`, `{protein}`, `{carbs}`, `{fats}`

### Settings Page Enhancements
- New "AI Assistant" section in settings
- Custom prompt template editor with syntax highlighting
- Conditional UI elements based on selected options
- Real-time prompt preview with sample data

### Component Integration
- Updated `GroupedEntries.jsx` to use settings context
- Updated `LibraryManager.jsx` to use settings context
- Wrapped pages with `SettingsProvider` for context access

## 📋 User Interface

### Settings Page Structure
```
Settings
├── Weight & Measurements
├── Date & Time
└── AI Assistant
    ├── AI Service (dropdown)
    ├── Request Format (dropdown)
    ├── Language (dropdown)
    └── Include Current Values (toggle)

Custom AI Settings
├── Custom URL Input (when "Custom" selected)
├── Custom Prompt Template Editor (when "Custom Template" selected)
└── Prompt Preview (always visible)
```

### Custom Prompt Template
Users can create custom prompts using placeholders:
- `{mealName}` - Name of the meal
- `{amount}` - Serving amount
- `{calories}` - Current calorie value
- `{protein}` - Current protein value
- `{carbs}` - Current carb value
- `{fats}` - Current fat value

## 🚀 User Workflow

### Basic Usage
1. Go to Settings page
2. Navigate to "AI Assistant" section
3. Select preferred AI service
4. Choose request format
5. Settings auto-save

### Advanced Customization
1. Select "Custom Template" for request format
2. Edit prompt template in text editor
3. Use placeholders for dynamic content
4. Preview changes in real-time
5. Test with AI button on meal entries

### Custom AI Service
1. Select "Custom URL" for AI service
2. Enter base URL for your AI service
3. Prompt will be appended as query parameter
4. Example: `https://your-ai-service.com/?q={prompt}`

## 📝 Example Custom Prompts

### Simple Prompt
```
What are the nutritional values for {mealName} ({amount})?
```

### Detailed Prompt
```
I'm tracking my nutrition and need accurate information for {mealName}.

Serving size: {amount}
Current values:
- Calories: {calories}
- Protein: {protein}g
- Carbs: {carbs}g
- Fats: {fats}g

Please provide accurate nutritional information and suggest improvements.
```

### Language-Specific Prompt
```
Necesito información nutricional precisa para {mealName} ({amount}).
Por favor proporciona calorías, proteínas, carbohidratos y grasas.
```

## 🔄 Integration with Existing Features

### AI Button Functionality
- AI buttons now use custom settings automatically
- No changes needed to existing meal entries
- Works in both main food logger and library views
- Respects all user preferences

### Settings Persistence
- All AI settings saved to localStorage
- Automatically loaded on app startup
- Syncs across all components
- No data loss on page refresh

## 🎨 UI/UX Improvements

### Visual Design
- Consistent with existing settings design
- Clear section organization
- Intuitive dropdowns and toggles
- Helpful descriptions and tooltips

### User Experience
- Real-time preview of changes
- Conditional UI elements
- Auto-save functionality
- Responsive design for mobile/desktop

## 📁 Files Modified

### Core Files
- `src/contexts/SettingsContext.jsx` - Added AI settings and functions
- `src/components/Settings.jsx` - Added AI settings UI
- `src/components/GroupedEntries.jsx` - Updated to use settings context
- `src/components/LibraryManager.jsx` - Updated to use settings context

### Page Files
- `src/pages/food-logger.astro` - Wrapped with SettingsProvider
- `src/pages/library.astro` - Wrapped with SettingsProvider

## ✅ Benefits

### For Users
- **Personalization** - Customize AI experience to their preferences
- **Flexibility** - Choose from multiple AI services
- **Control** - Full control over prompt content and format
- **Efficiency** - Optimized prompts for their specific needs

### For Developers
- **Extensibility** - Easy to add new AI services
- **Maintainability** - Centralized AI logic in settings context
- **Scalability** - Support for custom AI endpoints
- **Consistency** - Unified AI experience across the app

## 🔮 Future Enhancements

### Potential Additions
- AI response parsing and auto-fill
- Multiple prompt templates
- AI service API key management
- Response format customization
- Batch AI processing for multiple meals

The AI settings customization feature provides users with complete control over their AI assistant experience while maintaining the simplicity and ease of use that makes the app effective for daily nutrition tracking.

