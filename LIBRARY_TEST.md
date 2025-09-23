# Library System Test Guide

## How to Test the Library System

### 1. **Access the Library**
- Go to `/food_logger` page
- Scroll down to the "Exercise & Meal Library" section
- You should see two tabs: "Exercises" and "Meals"

### 2. **Test Loading**
- The library should show sample data automatically
- Check browser console for debug messages:
  - "Loaded from IndexedDB: X exercises, Y meals" (if IndexedDB works)
  - "Loaded from localStorage: X exercises, Y meals" (if fallback works)

### 3. **Test Adding Items**

#### **Add Exercise:**
1. Click "Add to Library" button in Exercises tab
2. Fill in the form:
   - Name: "Test Exercise"
   - Description: "A test exercise"
   - Category: Select "Bodyweight"
   - Difficulty: Select "Beginner"
   - Muscle Groups: "Chest, Arms"
   - Default Sets: 3
   - Default Reps: 10
3. Click "Add Exercise"
4. Should see success message and new item in list

#### **Add Meal:**
1. Click "Add to Library" button in Meals tab
2. Fill in the form:
   - Name: "Test Meal"
   - Description: "A test meal"
   - Category: Select "Meal"
   - Amount: "1 serving"
   - Calories: 300
   - Protein: 25
   - Carbs: 30
   - Fats: 10
3. Click "Add Meal"
4. Should see success message and new item in list

### 4. **Test Editing Items**
1. Click the edit (pencil) icon on any item
2. Modify the information
3. Click "Update Exercise/Meal"
4. Should see updated information

### 5. **Test Deleting Items**
1. Click the delete (trash) icon on any item
2. Confirm deletion
3. Item should be removed from list

### 6. **Test Quick Add (for Meals)**
1. Click the "+" icon on a meal item
2. Fill in time and notes
3. Click "Add to Today"
4. Should add to today's entries

### 7. **Test Exercise Information (for Exercises)**
1. Click the "i" icon on an exercise item
2. Add/edit category, description, instructions, muscle groups, difficulty
3. Click "Save Information"
4. Should update the exercise details

## Expected Behavior

### **If IndexedDB Works:**
- Console shows: "Loaded from IndexedDB: X exercises, Y meals"
- All CRUD operations work smoothly
- Data persists between page refreshes

### **If IndexedDB Fails:**
- Console shows: "IndexedDB failed, falling back to localStorage"
- Console shows: "Loaded from localStorage: X exercises, Y meals"
- All CRUD operations still work
- Data persists between page refreshes

### **Sample Data:**
- **Exercises**: Push-ups, Squats, Bench Press (with full details)
- **Meals**: Breakfast, Lunch, Dinner (with nutrition data)

## Troubleshooting

### **If Library Shows Empty:**
1. Check browser console for errors
2. Try refreshing the page
3. Check if localStorage is enabled
4. Try adding a new item to test functionality

### **If Add/Edit/Delete Don't Work:**
1. Check browser console for errors
2. Ensure all required fields are filled
3. Try with different data

### **If Data Doesn't Persist:**
1. Check if browser allows localStorage
2. Try in incognito/private mode
3. Check browser storage settings

## Debug Information

The library system includes comprehensive logging:
- Database initialization status
- Data loading success/failure
- CRUD operation results
- Fallback mechanism activation

Check the browser console (F12) for detailed debug information.

